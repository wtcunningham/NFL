import { Router } from 'express'

const router = Router({ mergeParams: true })

const CACHE_MS = 15 * 60 * 1000
const cache = new Map()
const UA = 'GridironAI/1.0 (+local)'

// ---- tiny helpers ----
async function jfetch(url) {
  const r = await fetch(url, { headers: { 'user-agent': UA, 'accept': 'application/json' } })
  if (!r.ok) return null
  return r.json()
}
function clean(val, fallback = null) {
  if (val === undefined || val === null) return fallback
  if (typeof val === 'string') return val.trim()
  return val
}
function statusIsFiltered(s) {
  const v = (s || '').toLowerCase()
  return v === 'active' || v === 'probable'
}

/** Discover teams for game if IDs aren’t passed */
async function getTeamsForGame(gameId) {
  const board = await jfetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard')
  const ev = (board?.events || []).find(e => e.id === gameId)
  const comp = ev?.competitions?.[0]
  const home = comp?.competitors?.find(c => c.homeAway === 'home')?.team
  const away = comp?.competitors?.find(c => c.homeAway === 'away')?.team
  return { home, away }
}

/** Follow a $ref URL and return JSON (with simple memo per request) */
async function deref(url, memo) {
  if (!url) return null
  const href = typeof url === 'string' ? url : (url.$ref || url.href)
  if (!href) return null
  if (memo.has(href)) return memo.get(href)
  const data = await jfetch(href)
  memo.set(href, data)
  return data
}

/** Fetch normalized injuries for a team via Core v2 */
async function fetchTeamInjuriesCoreV2(teamId) {
  const memo = new Map()
  const listUrl = `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/teams/${teamId}/injuries?limit=200`
  const list = await jfetch(listUrl)
  if (!list || !Array.isArray(list?.items) || list.items.length === 0) return []

  const MAX_CONC = 8
  let idx = 0
  const items = list.items.map(i => i?.$ref || i?.href || i)
  const results = []

  async function worker() {
    while (idx < items.length) {
      const my = idx++
      const ref = items[my]
      try {
        const injury = await deref(ref, memo) // injury node
        if (!injury) continue

        // athlete and position deref
        const athlete = await deref(injury?.athlete, memo)
        if (!athlete) continue
        const posNode = athlete?.position ? await deref(athlete.position, memo) : null

        // headshot URL (Core v2 commonly uses .href or .$ref)
        const headshot =
          clean(athlete?.headshot?.href) ||
          clean(athlete?.headshot?.$ref) ||
          clean(athlete?.images?.[0]?.url) ||
          null

        const name =
          clean(athlete?.fullName) ||
          clean(athlete?.displayName) ||
          clean(athlete?.shortName) ||
          'Unknown'

        const status =
          clean(injury?.status) ||
          clean(injury?.status?.name) ||
          clean(injury?.type) ||
          clean(injury?.shortStatus) ||
          'Unknown'

        const detail =
          clean(injury?.shortComment) ||
          clean(injury?.comment) ||
          clean(injury?.description) ||
          clean(injury?.text) ||
          '—'

        const pos =
          clean(posNode?.abbreviation) ||
          clean(posNode?.displayName) ||
          clean(athlete?.position?.abbreviation) ||
          clean(athlete?.position?.displayName) ||
          null

        const player_id = String(athlete?.id ?? injury?.athleteId ?? Math.random().toString(36).slice(2))

        // server-side filter: exclude Active/Probable
        if (statusIsFiltered(status)) continue

        results.push({
          player_id,
          name,
          pos,
          status,
          detail,
          headshot, // <-- included for the UI
          last_updated_ts: new Date().toISOString(),
          sources: [{ name: 'ESPN Core v2', url: ref }]
        })
      } catch {
        // ignore individual item errors
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(MAX_CONC, items.length) }, () => worker()))
  return results
}

// ---------------- Route ----------------
router.get('/', async (req, res) => {
  const gameId = req.params.id
  const force = String(req.query.force || '') === '1'
  const debug = String(req.query.debug || '') === '1'

  let homeId = req.query.homeId?.toString()
  let awayId = req.query.awayId?.toString()
  let homeName = req.query.homeName?.toString()
  let awayName = req.query.awayName?.toString()

  const dbg = { gameId, homeId, awayId, tries: [] }

  try {
    const now = Date.now()
    const cached = cache.get(gameId)
    if (!force && cached && (now - cached.ts) < CACHE_MS) {
      return res.json(debug ? { ...cached.data, debug: { ...dbg, cache: 'hit' } } : cached.data)
    }

    if (!homeId || !awayId) {
      const { home, away } = await getTeamsForGame(gameId)
      homeId = homeId || home?.id
      awayId = awayId || away?.id
      homeName = homeName || home?.displayName
      awayName = awayName || away?.displayName
      dbg.resolved = { homeId, awayId, homeName, awayName }
    }

    const [homePlayers, awayPlayers] = await Promise.all([
      homeId ? fetchTeamInjuriesCoreV2(homeId) : Promise.resolve([]),
      awayId ? fetchTeamInjuriesCoreV2(awayId) : Promise.resolve([])
    ])
    dbg.tries.push({ step: 'coreV2', home: homePlayers.length, away: awayPlayers.length })

    for (const p of homePlayers) p.team = homeName || 'Home'
    for (const p of awayPlayers) p.team = awayName || 'Away'

    const data = { team_id: 'mixed', players: [...homePlayers, ...awayPlayers] }

    if (data.players.length) cache.set(gameId, { ts: Date.now(), data })
    return res.json(debug ? { ...data, debug: dbg } : data)
  } catch (e) {
    return res.status(200).json({ team_id: 'mixed', players: [], error: String(e), debug: dbg })
  }
})

export default router
