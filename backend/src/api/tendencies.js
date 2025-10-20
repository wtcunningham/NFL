// backend/src/api/tendencies.js
import { Router } from 'express'

const router = Router({ mergeParams: true })

const UA = 'GridironAI/1.0 (+gridironai)'
const CACHE_MS = 60 * 60 * 1000 // 60 minutes
const cache = new Map()

/* ------------------------ small utils ------------------------ */
async function jfetch(url) {
  const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json' } })
  if (!r.ok) return null
  return r.json()
}
const pct = (num, den) => (den > 0 ? (num / den) * 100 : 0)
const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)

function parsePair(txt) {
  if (!txt || typeof txt !== 'string') return { made: 0, att: 0, pct: 0 }
  const m = txt.match(/(\d+)\s*-\s*(\d+)/)
  const made = m ? parseInt(m[1], 10) : 0
  const att = m ? parseInt(m[2], 10) : 0
  return { made, att, pct: pct(made, att) }
}
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
// Normalize ESPN Pct fields that might be 0–1 or 0–100
const normPct = (v) => (v > 0 && v <= 1 ? v * 100 : v || 0)

/* ------------------------ ESPN helpers ------------------------ */
async function resolveTeamsForGame(gameId) {
  const board = await jfetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard')
  const ev = (board?.events || []).find((e) => e.id === gameId)
  const comp = ev?.competitions?.[0]
  const home = comp?.competitors?.find((c) => c.homeAway === 'home')?.team
  const away = comp?.competitors?.find((c) => c.homeAway === 'away')?.team
  return { home, away }
}
async function getTeamSchedule(teamId) {
  return jfetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${teamId}/schedule`)
}
async function getGameSummary(eventId) {
  return jfetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${eventId}`)
}

/* ------------------------ Core v2 season stats ------------------------ */
async function fetchCoreTeamStats(teamId, season, type, dbg) {
  const url = `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/${season}/types/${type}/teams/${teamId}/statistics`
  const root = await jfetch(url)
  if (!root) return null

  const out = {}
  const splits = root?.splits || root?.statistics || null
  const cats = Array.isArray(splits?.categories) ? splits.categories : []

  for (const cat of cats) {
    const stats = Array.isArray(cat?.stats) ? cat.stats : []
    for (const s of stats) {
      const key = String(s?.name || s?.shortDisplayName || s?.displayName || '').trim()
      if (!key) continue
      const raw = s?.value ?? s?.displayValue
      if (raw == null || raw === '') continue
      const num =
        typeof raw === 'string' && /^[\d.\-:]+$/.test(raw) && !raw.includes(':')
          ? Number(raw)
          : raw
      out[key] = num
    }
  }

  dbg?.push({ source: 'core', url, keys: Object.keys(out).slice(0, 60) })
  return out
}

function pickNum(map, names = [], regexes = []) {
  for (const n of names) if (map[n] != null) return Number(map[n]) || 0
  for (const r of regexes) {
    const hit = Object.keys(map).find((k) => r.test(k))
    if (hit) return Number(map[hit]) || 0
  }
  return 0
}

function deriveSeasonTendenciesFromCore(statsMap, dbg) {
  if (!statsMap) return null

  // Attempts / Plays
  const passAtt = pickNum(statsMap, ['passingAttempts', 'passAttempts', 'teamPassingAttempts'], [/^pass.*attempt/i])
  const rushAtt = pickNum(statsMap, ['rushingAttempts', 'rushAttempts', 'teamRushingAttempts', 'carries'], [/^rush.*attempt/i, /carry/i])
  const plays =
    pickNum(statsMap, ['offensivePlays', 'teamOffensivePlays'], [/offen.*play/i]) ||
    (passAtt + rushAtt)

  // Third down
  const thirdMade = pickNum(statsMap, ['thirdDownConversions', 'thirdDownConverted'], [/third.*conv(ersion)?/i])
  const thirdAtt = pickNum(statsMap, ['thirdDownAttempts', 'thirdDownTotal'], [/third.*att/i])

  // Red zone direct % (prefer TD% as conversion rate)
  const rzTdPctCore = normPct(pickNum(statsMap, ['redzoneTouchdownPct'], [/red.?zone.*touchdown.*pct/i]))
  const rzScorePctCore = normPct(pickNum(statsMap, ['redzoneScoringPct'], [/red.?zone.*scor.*pct/i]))
  const rzEffPctCore = normPct(pickNum(statsMap, ['redzoneEfficiencyPct'], [/red.?zone.*eff.*pct/i]))

  // Attempts-based fallback
  const rzMade = pickNum(statsMap, ['redZoneScores', 'redZoneConverted', 'redZoneTouchdowns'], [/red.?zone.*(score|td|conv)/i])
  const rzAtt = pickNum(statsMap, ['redZoneAttempts', 'redZoneOpportunities', 'redZoneTrips'], [/red.?zone.*(att|opp|trip)/i])
  const rzPctFallback = pct(rzMade, rzAtt)

  const games =
    pickNum(statsMap, ['gamesPlayed', 'games'], [/games?played/i]) ||
    (pickNum(statsMap, ['wins'], [/wins?/i]) + pickNum(statsMap, ['losses'], [/loss(es)?/i])) ||
    0

  if (plays <= 0 || games <= 0) {
    dbg?.push({ core_usable: false, reason: `plays=${plays} games=${games}` })
    return null
  }

  const passRate = pct(passAtt, passAtt + rushAtt)
  const thirdPct = pct(thirdMade, thirdAtt)
  const redZonePctFinal = rzTdPctCore || rzScorePctCore || rzEffPctCore || rzPctFallback
  const playsPg = Math.round(plays / games)

  // TOP seconds or mm:ss
  let toSeconds = pickNum(statsMap, ['timeOfPossessionSeconds', 'possessionTimeSeconds'])
  if (!toSeconds) {
    const toStr = statsMap['timeOfPossession'] || statsMap['possessionTime'] || null
    if (typeof toStr === 'string') toSeconds = parseTOSecs(toStr)
  }

  const avgTOP = secsToMMSS(Math.round(toSeconds / (games || 1)))

  dbg?.push({
    core_usable: true,
    passAtt, rushAtt, plays, games,
    thirdMade, thirdAtt,
    redZonePctFinal: redZonePctFinal,
    toSeconds
  })

  return {
    sample_games: games,
    pass_rate_pct: Math.round(passRate),
    rush_rate_pct: Math.round(100 - passRate),
    third_down_pct: Math.round(thirdPct),
    red_zone_pct: Math.round(redZonePctFinal),
    plays_pg: playsPg,
    time_possession_avg: avgTOP
  }
}

/* ------------------------ Fallback: last-N games ------------------------ */
function statValue(statsArr, name) {
  const s = (statsArr || []).find((x) => x?.name === name)
  return s?.value ?? s?.displayValue ?? null
}
function sumPlayerAttempts(summary, teamId, categoryName, attemptKeys = []) {
  const blocks = summary?.boxscore?.players || []
  const teamBlock = blocks.find((t) => String(t?.team?.id) === String(teamId))
  if (!teamBlock) return 0
  let total = 0
  for (const grp of teamBlock?.statistics || []) {
    const gname = (grp?.name || grp?.displayName || '').toLowerCase()
    if (gname !== categoryName.toLowerCase()) continue
    for (const row of grp?.statistics || []) {
      const key = (row?.name || row?.displayName || '').toLowerCase()
      if (!attemptKeys.some((k) => key === k.toLowerCase())) continue
      const raw = row?.value ?? row?.displayValue
      const num = typeof raw === 'string' ? Number(raw.replace(/[^\d.-]/g, '')) : Number(raw)
      if (!Number.isNaN(num)) total += num
    }
  }
  return total
}
function extractPerGame(summary, teamId, dbg) {
  const teamBox = (summary?.boxscore?.teams || []).find((t) => String(t?.team?.id) === String(teamId))
  const stats = teamBox?.statistics || []

  const val = (names) => {
    for (const n of names) {
      const v = statValue(stats, n)
      if (v != null && v !== '') return Number(v) || 0
    }
    return 0
  }

  let passAtt = val(['passingAttempts', 'passAttempts'])
  let rushAtt = val(['rushingAttempts', 'rushAttempts'])
  let source = 'team'

  if (passAtt === 0) {
    const p = sumPlayerAttempts(summary, teamId, 'passing', ['attempts', 'att'])
    if (p > 0) { passAtt = p; source = 'players' }
  }
  if (rushAtt === 0) {
    let r = sumPlayerAttempts(summary, teamId, 'rushing', ['attempts', 'rushes', 'carries'])
    if (r === 0) r = sumPlayerAttempts(summary, teamId, 'rushing', ['rushingAttempts'])
    if (r > 0) { rushAtt = r; source = 'players' }
  }

  const thirdDown = String(statValue(stats, 'thirdDownEff') || '0-0')
  const redZone   = String(statValue(stats, 'redZoneEff')   || '0-0')
  const toP       = String(statValue(stats, 'timeOfPossession') || '0:00')

  const plays = passAtt + rushAtt
  if (plays <= 0) {
    dbg?.push({ teamId, used: 'skip', reason: 'no plays' })
    return null
  }

  const third = parsePair(thirdDown)
  const rz    = parsePair(redZone)
  const toSecs = parseTOSecs(toP)

  dbg?.push({ teamId, used: source, passAtt, rushAtt, thirdDown, redZone, toP })

  return {
    passAtt, rushAtt, plays,
    passRate: pct(passAtt, plays),
    thirdDownPct: third.pct,
    redZonePct: rz.pct,
    toSecs
  }
}
async function buildTendenciesFromLastN(teamId, gameIds, label, maxGames = 3, dbgArr) {
  const recent = []
  for (const evId of gameIds) {
    const summary = await getGameSummary(evId)
    if (!summary) continue
    const perGame = extractPerGame(summary, teamId, dbgArr)
    if (!perGame) continue
    recent.push(perGame)
    if (recent.length >= maxGames) break
  }

  const passRates = recent.map((g) => g.passRate)
  const thirdPcts = recent.map((g) => g.thirdDownPct)
  const rzPcts    = recent.map((g) => g.redZonePct)
  const plays     = recent.map((g) => g.plays)
  const toSecs    = recent.map((g) => g.toSecs)

  return {
    label,
    sample_games: recent.length,
    pass_rate_pct: Math.round(avg(passRates)),
    rush_rate_pct: Math.round(100 - avg(passRates)),
    third_down_pct: Math.round(avg(thirdPcts)),
    red_zone_pct: Math.round(avg(rzPcts)),
    plays_pg: Math.round(avg(plays)),
    time_possession_avg: secsToMMSS(Math.round(avg(toSecs))),
  }
}

/* ------------------------ route ------------------------ */
router.get('/', async (req, res) => {
  const gameId = req.params.id
  const force = String(req.query.force || '') === '1'
  const debug = String(req.query.debug || '') === '1'
  const maxGames = Number(req.query.n || 3)
  const season = Number(req.query.season) || new Date().getFullYear()
  const type = Number(req.query.type || 2) // 2 = Regular season

  const key = `${gameId}|n=${maxGames}|s=${season}|t=${type}`
  const now = Date.now()

  if (!force) {
    const cached = cache.get(key)
    if (cached && now - cached.ts < CACHE_MS) {
      return res.json(debug ? { ...cached.data, debug: cached.debug } : cached.data)
    }
  }

  try {
    const { home, away } = await resolveTeamsForGame(gameId)
    if (!home?.id || !away?.id) {
      return res.status(200).json({ error: 'Teams not found', home: null, away: null })
    }

    const dbg = { mode: 'core-preferred', season, type }

    // Try Core v2 first
    const [homeCore, awayCore] = await Promise.all([
      fetchCoreTeamStats(home.id, season, type, (dbg.home_core = [])),
      fetchCoreTeamStats(away.id, season, type, (dbg.away_core = [])),
    ])

    const homeFromCore = deriveSeasonTendenciesFromCore(homeCore, dbg.home_core)
    const awayFromCore = deriveSeasonTendenciesFromCore(awayCore, dbg.away_core)

    let homeFinal = homeFromCore
    let awayFinal = awayFromCore

    // Fallback to last-N completed games if either side missing
    if (!homeFromCore || !awayFromCore) {
      dbg.mode = 'core+fallback-lastN'
      const [homeSch, awaySch] = await Promise.all([
        getTeamSchedule(home.id),
        getTeamSchedule(away.id),
      ])

      const pickRecent = (sched) =>
        (sched?.events || [])
          .filter((e) => e?.competitions?.[0]?.status?.type?.completed)
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .map((e) => e.id)

      const homeIds = pickRecent(homeSch)
      const awayIds = pickRecent(awaySch)

      dbg.home_recent_ids = homeIds.slice(0, maxGames)
      dbg.away_recent_ids = awayIds.slice(0, maxGames)

      if (!homeFinal) {
        homeFinal = await buildTendenciesFromLastN(
          home.id,
          homeIds,
          home.displayName || 'Home',
          maxGames,
          (dbg.home_calc = [])
        )
      }
      if (!awayFinal) {
        awayFinal = await buildTendenciesFromLastN(
          away.id,
          awayIds,
          away.displayName || 'Away',
          maxGames,
          (dbg.away_calc = [])
        )
      }
    }

    const data = {
      sample_n: maxGames,
      season,
      type,
      home: { team_id: String(home.id), team: home.displayName, ...(homeFinal || {}) },
      away: { team_id: String(away.id), team: away.displayName, ...(awayFinal || {}) },
    }

    cache.set(key, { ts: now, data, debug: dbg })
    return res.json(debug ? { ...data, debug: dbg } : data)
  } catch (e) {
    return res.status(200).json({ error: String(e), home: null, away: null })
  }
})

export default router
