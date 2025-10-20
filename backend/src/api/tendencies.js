// backend/src/api/tendencies.js
import { Router } from 'express'

const router = Router({ mergeParams: true })
const UA = 'GridironAI/1.0 (+local)'
const CACHE_MS = 60 * 60 * 1000
const cache = new Map()

const jfetch = async (url) => {
  const r = await fetch(url, { headers: { 'user-agent': UA, 'accept': 'application/json' } })
  if (!r.ok) return null
  return r.json()
}
const clean = (v, d = null) => (v === undefined || v === null ? d : v)
const pct = (num, den) => (den > 0 ? (num / den) * 100 : 0)
const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)

// "3-10" -> { made:3, att:10, pct:30 }
const parsePair = (txt) => {
  if (!txt || typeof txt !== 'string') return { made: 0, att: 0, pct: 0 }
  const m = txt.match(/(\d+)\s*-\s*(\d+)/)
  const made = m ? parseInt(m[1], 10) : 0
  const att = m ? parseInt(m[2], 10) : 0
  return { made, att, pct: pct(made, att) }
}

// "31:45" -> seconds
const parseTOSecs = (txt) => {
  if (!txt) return 0
  const m = txt.match(/(\d+):(\d+)/)
  if (!m) return 0
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10)
}
const secsToMMSS = (s) => {
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

async function resolveTeamsForGame(gameId) {
  const board = await jfetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard')
  const ev = (board?.events || []).find(e => e.id === gameId)
  const comp = ev?.competitions?.[0]
  const home = comp?.competitors?.find(c => c.homeAway === 'home')?.team
  const away = comp?.competitors?.find(c => c.homeAway === 'away')?.team
  return { home, away }
}

async function getTeamSchedule(teamId) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${teamId}/schedule`
  return jfetch(url)
}

async function getGameSummary(eventId) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${eventId}`
  return jfetch(url)
}

function pickTeamFromSummary(summary, teamId) {
  // summary.boxscore.teams: [{team:{id,name}, statistics:[{name,displayValue}]}]
  const teams = summary?.boxscore?.teams || []
  return teams.find(t => String(t?.team?.id) === String(teamId))
}

function statValue(statsArr, name) {
  const s = (statsArr || []).find(x => x?.name === name)
  // ESPN puts numbers in .value or displayValue; we want raw when possible
  return clean(s?.value, s?.displayValue)
}

function extractPerGame(teamBox) {
  // Pull safe values
  const stats = teamBox?.statistics || []
  const passAtt = Number(statValue(stats, 'passingAttempts') || 0)
  const rushAtt = Number(statValue(stats, 'rushingAttempts') || 0)
  const thirdDown = String(statValue(stats, 'thirdDownEff') || '0-0')
  const redZone = String(statValue(stats, 'redZoneEff') || '0-0')
  const toP = String(statValue(stats, 'timeOfPossession') || '0:00')

  const plays = passAtt + rushAtt // simple, consistent across summaries
  const third = parsePair(thirdDown)
  const rz = parsePair(redZone)
  const toSecs = parseTOSecs(toP)

  return {
    passAtt, rushAtt, plays,
    passRate: pct(passAtt, passAtt + rushAtt),
    thirdDownPct: third.pct,
    redZonePct: rz.pct,
    toSecs
  }
}

async function buildTendencies(teamId, games, label, maxGames = 3) {
  const recentGames = []
  for (const g of games) {
    const evId = g?.id || g?.eventId || g
    if (!evId) continue
    const sum = await getGameSummary(evId)
    if (!sum) continue
    const box = pickTeamFromSummary(sum, teamId)
    if (!box) continue
    recentGames.push(extractPerGame(box))
    if (recentGames.length >= maxGames) break
  }
  const passRates = recentGames.map(g => g.passRate)
  const thirdPcts = recentGames.map(g => g.thirdDownPct)
  const rzPcts = recentGames.map(g => g.redZonePct)
  const plays = recentGames.map(g => g.plays)
  const toSecs = recentGames.map(g => g.toSecs)

  return {
    label,
    sample_games: recentGames.length,
    pass_rate_pct: Math.round(avg(passRates)),
    rush_rate_pct: Math.round(100 - avg(passRates)),
    third_down_pct: Math.round(avg(thirdPcts)),
    red_zone_pct: Math.round(avg(rzPcts)),
    plays_pg: Math.round(avg(plays)),
    time_possession_avg: secsToMMSS(Math.round(avg(toSecs)))
  }
}

router.get('/', async (req, res) => {
  const gameId = req.params.id
  const force = String(req.query.force || '') === '1'
  const debug = String(req.query.debug || '') === '1'
  const maxGames = Number(req.query.n || 3)

  const now = Date.now()
  const key = `${gameId}|n=${maxGames}`
  if (!force) {
    const cached = cache.get(key)
    if (cached && now - cached.ts < CACHE_MS) {
      return res.json(debug ? { ...cached.data, debug: { cache: 'hit' } } : cached.data)
    }
  }

  try {
    const { home, away } = await resolveTeamsForGame(gameId)
    if (!home?.id || !away?.id) {
      return res.status(200).json({ error: 'Teams not found', home: null, away: null })
    }

    const [homeSch, awaySch] = await Promise.all([
      getTeamSchedule(home.id),
      getTeamSchedule(away.id)
    ])

    // ESPN schedule returns events in chronological order; take most recent finished games
    const pickRecent = (sched, teamId) => {
      const events = sched?.events || []
      // Filter completed, newest first
      const completed = events
        .filter(e => e?.competitions?.[0]?.status?.type?.completed)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
      // For each event, keep its id
      return completed.map(e => e.id)
    }

    const homeRecent = pickRecent(homeSch, home.id)
    const awayRecent = pickRecent(awaySch, away.id)

    const [homeRec, awayRec] = await Promise.all([
      buildTendencies(home.id, homeRecent, home.displayName || 'Home', maxGames),
      buildTendencies(away.id, awayRecent, away.displayName || 'Away', maxGames)
    ])

    const data = {
      sample_n: maxGames,
      home: { team_id: String(home.id), team: home.displayName, ...homeRec },
      away: { team_id: String(away.id), team: away.displayName, ...awayRec }
    }
    cache.set(key, { ts: now, data })

    return res.json(debug ? { ...data, debug: { home_recent_ids: homeRecent.slice(0, maxGames), away_recent_ids: awayRecent.slice(0, maxGames) } } : data)
  } catch (e) {
    return res.status(200).json({ error: String(e), home: null, away: null })
  }
})

export default router
