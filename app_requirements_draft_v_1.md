# NFL Game Analysis App — Requirements Draft v1.0

_Last updated: Oct 19, 2025_

## 1) Summary
Build a web application that allows a user to select any upcoming NFL game and receive structured, up‑to‑date analysis covering: (1) Injury Report, (2) Most Common Play‑Calling Strategy (recent tendencies for offense and defense), and (3) Key Players (projected standouts based on matchups and recent trends). The app prioritizes recency, source transparency, and clear, actionable insights.

---

## 2) Goals & Non‑Goals
**Goals**
- Provide a single, reliable screen per matchup summarizing injuries, tendencies, and likely impact players.
- Keep all data time‑stamped, sourced, and refreshed automatically.
- Offer explainability for each insight (e.g., “why this player,” “how this tendency was computed”).

**Non‑Goals**
- Full betting/odds product.
- Long‑term season projections; focus is the **next game** for each team.

---

## 3) Users & Use Cases
**Primary users:** fans, analysts, fantasy players, casual bettors.

**Key use cases**
1. Pick a game for Sunday and quickly see who’s out/questionable and why.
2. Compare teams’ recent offensive/defensive tendencies to anticipate game script.
3. Identify 3–6 players likely to overperform given matchup and form, with rationale.

---

## 4) Core Features & Requirements
### 4.1 Game Selector
- **FR‑GS‑1:** List all upcoming NFL games with kickoff date/time and venue.
- **FR‑GS‑2:** Search/filter by team; sort by kickoff time.
- **FR‑GS‑3:** Game card shows team logos, records, and quick links to team pages.

### 4.2 Injury Report
- **FR‑IR‑1:** Display current player availability status per team: `Out`, `Doubtful`, `Questionable`, `IR`, `PUP`, `Suspended`, `Probable` (if applicable), and `Active`.
- **FR‑IR‑2:** For each non‑active (or uncertain) player, show: name, position, designation, date/time last updated, and short note (e.g., injury type or reason).
- **FR‑IR‑3:** Include **latest news blurb** (≤ 240 chars) summarizing context (e.g., practice participation, coach quotes); link to primary source.
- **FR‑IR‑4:** Show a **Likely Impact** tag (Low/Med/High) based on position importance and snap share.
- **FR‑IR‑5:** Offer team‑level **Status Heatmap** (by position group) for a quick view.
- **FR‑IR‑6:** Time‑stamps and sources must be shown for each item.

**Acceptance criteria**
- Can identify and list all players with a non‑`Active` designation for the next game.
- Each listed player shows an updated reason with at least one cited source and timestamp.
- Position‑group heatmap renders without errors on desktop and mobile.

### 4.3 Most Common Play‑Calling Strategy
(Recent tendency windows are configurable; default last **4 games** or **200 plays**, whichever is larger. **Early season rule:** for Weeks 1–4 (or when sample size < 150 plays), use **last 30 days** window for all rolling metrics.)
- **FR‑PC‑1 (Offense):** Compute and display:
  - Early‑down run/pass rate, neutral situation pass rate (score within ±7, Q1–Q3), play‑action %, RPO %, shotgun vs under center %, average time to snap, motion usage %, deep‑target rate, screens %, pace (sec/play), and EPA/play, success rate.
- **FR‑PC‑2 (Defense):** Show:
  - Man vs zone rate, blitz rate, pressure rate, base/nickel/dime usage, stack box rate vs run, coverage shells (e.g., Cover‑1/3/4 families if available), explosive plays allowed rate, EPA/play allowed, success rate allowed.
- **FR‑PC‑3:** Present opponent‑specific matchup overlays (e.g., Team A offensive tendencies vs Team B defensive tendencies).
- **FR‑PC‑4:** Visuals:
  - Trend lines (last 4–6 games), bar charts for categorical rates, and side‑by‑side team comparisons.
- **FR‑PC‑5:** Each metric shows sample size (plays) and window used; tooltips explain definitions.

**Acceptance criteria**
- Metrics match computed values within ±0.5% of unit tests on a fixed dataset.
- Comparison view correctly aligns offense vs upcoming opponent’s defense and vice‑versa.

### 4.4 Key Players (Projected Standouts)
- **FR‑KP‑1:** For each team, surface 3–6 players tagged as **Spotlight** with:
  - Short rationale (≤ 280 chars), 
  - Supporting stats (last 3–5 games), 
  - Matchup notes (position vs opponent weakness), 
  - Confidence score (0–100) with components (form, role, matchup).
- **FR‑KP‑2:** Position‑specific heuristics (examples):
  - **QB:** neutral pass rate, pressure to sack %, opponent pressure rate, explosive pass allowed.
  - **RB:** snap share, rush share, targets per route, opponent light‑box rate, yards before contact allowed.
  - **WR/TE:** target share, aDOT, route participation, opponent coverage tendency, slot/outside matchup.
  - **EDGE/DL/LB/DB:** pass‑rush win rate, run‑stop %, opponent pressure allowed, opponent run rate.
- **FR‑KP‑3:** Provide an **Explain** panel expanding the evidence (charts/tables) behind each pick.
- **FR‑KP‑4:** Avoid recommending players ruled `Out` or `IR`; degrade confidence if `Questionable`.
- **FR‑KP‑5 (Weather):** Incorporate **predicted weather** at kickoff. Examples: downgrade QB/WR deep passing in rain/wind > 15 mph; modestly upgrade volume RBs in sustained rain; downgrade kickers in high wind. Weather adjustments are transparent in the Explain panel.

**Acceptance criteria**
- No spotlight player displays with a status of `Out`/`IR` for the selected game.
- Each spotlight shows at least one matchup stat and one recent‑form stat.
- Weather adjustments appear when forecast indicates precipitation or wind > 12–15 mph.

---

## 5) Data & Computation
### 5.1 Data Sources (examples)
- Official team injury reports / league feeds (public postings from team communications pages). 
- Practice participation logs and reputable beat reporter updates.
- Play‑by‑play and charting (e.g., run/pass, PA, RPO, coverage approximations) with timestamps.
- **Weather (free)**: National Weather Service (U.S., no key) or Open‑Meteo (free, no key) for hourly forecasts.

> **Cost & Licensing Guardrails:** Because this is a personal, free hobby app, prioritize **free or free‑tier** sources. Avoid paid per‑request feeds. Implement application‑level rate limits (e.g., ≤ 60 req/min, ≤ 10k req/day) and aggressive caching so you don’t incur unexpected costs. Before enabling any paid API, add a hard monthly request cap and a visible “usage this month” counter.

> **Note:** Final source list and licenses to be confirmed prior to build. All records must include `source_url`, `ingested_at`, `game_id`, and `entity_id` keys.

### 5.2 Data Model (high‑level)
**Tables/Collections**
- `games(game_id, home_team_id, away_team_id, kickoff_ts, venue, week)`
- `teams(team_id, name, abbr, conf, div)`
- `players(player_id, name, team_id, position, depth, ir_status)`
- `injury_reports(player_id, game_id, status, detail, last_updated_ts, sources[])`
- `news(player_id|team_id, game_id|null, summary, published_ts, source_url)`
- `pbp_agg(team_id, window_key, metrics_json, plays_n, generated_ts)`
- `matchup_agg(game_id, offense_team_id, defense_team_id, metrics_json)`
- `spotlights(game_id, team_id, player_id, confidence, rationale, features_json)`

### 5.3 Computation Pipeline
1. **Ingestion** (cron/stream): fetch injury & news → normalize entities → store with provenance.
2. **Aggregation jobs:** compute rolling windows for tendencies and defensive splits.
3. **Spotlight ranking:** feature engineering → weighted scoring → rule‑based guards (injury, role) → top‑N per team.
4. **Caching:** per‑game materialized views refreshed on schedule and on manual refresh.

### 5.4 Metrics Glossary (definitions)
- **Neutral Situation:** score within ±7, first 3 quarters, first/second down unless specified.
- **EPA/play:** expected points added per play.
- **Success Rate:** play increases win probability/EP beyond down‑distance threshold.
- **Explosive Play:** gain ≥ 20 yards pass or ≥ 12 yards rush (configurable).

### 5.5 Free‑Tier Providers and Rate Budgets
This app will use **free or free‑tier** data sources only, with aggressive caching and request ceilings to avoid unexpected costs.

#### 5.5.1 Game Schedule & Results
- **Primary:** SportsData.io (Developer) — `GET /nfl/scores/json/ScoresByWeek/{season}/{week}`; ~100 calls/day free. Cache weekly; refresh daily.
- **Alternative (truly free):** ESPN public JSON (no key):
  - Scoreboard: `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard`
  - Teams: `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams`
  - Throttle ≤ 1 req/sec; cache 6h.

#### 5.5.2 Injury Reports & Player Status
- **ESPN public JSON (no key)** — per‑team injuries: `.../teams/{teamId}/injuries`. Fetch 1×/hour/team; cache 30m.
- **Cross‑check:** Pro‑Football‑Reference HTML (daily scrape for personal use); cache 24h.

#### 5.5.3 Play‑Calling & Tendencies
- **nflfastR (GitHub CSVs)** — `https://raw.githubusercontent.com/nflverse/nflfastR-data/master/data/play_by_play_{year}.csv.gz`
  - Download weekly; compute rolling windows offline. No per‑request costs beyond GitHub soft limits (~60 req/hr unauthenticated).

#### 5.5.4 Weather Forecasts
- **Open‑Meteo (no key)** — `GET /v1/forecast?latitude={lat}&longitude={lon}&hourly=temperature_2m,precipitation,wind_speed_10m&timezone=...`
  - Query once/game/12h; cache 12h; refresh within 24h of kickoff.
- **Alternative:** U.S. **National Weather Service API (no key)** — `https://api.weather.gov/gridpoints/{office}/{gridX},{gridY}/forecast/hourly`.

#### 5.5.5 Player/Team News
- **NewsAPI (free)** — `GET /v2/everything?q="TeamName" AND (injury OR inactive OR practice)`; 100 req/day.
  - Pull only for teams with non‑active players; cache 24h; dedupe by title+source.
- **Alternative:** Google News RSS — `https://news.google.com/rss/search?q={player}+NFL+injury` (free); parse XML.

#### 5.5.6 Team/Player Metadata
- **MySportsFeeds (free developer)** — `GET /v2.1/pull/nfl/latest/roster_players.json`; 500 calls/day. Cache weekly.

#### 5.5.7 Weekly Request Budget (Typical)
| Category | Calls/Week | TTL |
|---|---:|---|
| Schedules | 7–10 | 6h |
| Injuries | ~500 | 30m |
| Tendencies | 0 (offline compute) | 7d |
| Weather | ~100 | 12h |
| News | ~32 | 24h |
| Metadata | ~32 | 7d |
| **Total** | **≈700/week** | — |

> **Cost Safeguards:** Hard monthly request caps per provider, usage dashboard, and fail‑closed behavior (serve cached data + friendly notice) when a cap is hit.

---

## 6) Product & UX
### 6.1 Screens
- **Matchup Hub:** header (teams, kickoff), tabs: **Injuries**, **Tendencies**, **Key Players**.
- **Team Page:** recent games, rolling metrics, injury history.
- **Sources Modal:** list of citations per panel.

### 6.2 Interactions
- Refresh data per panel; show last updated timestamp.
- Hover tooltips for metric definitions.
- Export: PNG (charts) and CSV (tables).

### 6.3 Accessibility & Devices
- WCAG 2.1 AA: color contrast ≥ 4.5:1; keyboard navigation.
- **Desktop‑first** chart layout; responsive fallbacks for mobile ≥360px.

---

## 7) APIs (example contracts)
### 7.1 GET /games?from=YYYY‑MM‑DD&to=YYYY‑MM‑DD
**Response** `{ games: [{ game_id, kickoff_ts, home_team, away_team, week }] }`

### 7.2 GET /games/{game_id}/injuries
**Response** `{ team_id, players: [{ player_id, name, pos, status, detail, last_updated_ts, impact, sources: [{name,url}] }] }`

### 7.3 GET /games/{game_id}/tendencies
**Query** `window=last4|last6|custom&plays_min=200`
**Response** `{ offense: {...}, defense: {...}, sample_sizes: {...} }`

### 7.4 GET /games/{game_id}/spotlights
**Response** `{ team_id, players: [{ player_id, name, pos, confidence, rationale, features: {...} }] }`

---

## 8) Scoring & Heuristics (Key Players)
**Base formula:**
```
confidence = 100 * sigmoid(w_form*form_z + w_role*role_z + w_matchup*matchup_z + w_weather*weather_adj - penalties)
```
- **form_z:** recent production vs position baseline
- **role_z:** snaps/routes/targets share
- **matchup_z:** opponent weakness metrics weighted by position
- **weather_adj:** additive factor in [-1.0, +0.5] derived from precipitation probability, wind, and temperature (e.g., rain + high wind hurts passing; cold alone minor effect)
- **penalties:** injury/questionable flags, low volume risk

Weights configurable per position. Unit tests validate monotonicity (e.g., more routes → non‑decreasing score). Weather rules are table‑driven and tested with synthetic forecasts.

---

## 9) Non‑Functional Requirements
- **Freshness:** injury/news panel updates at least every 30 min; tendencies nightly and on new game completion; manual refresh available.
- **Performance:** P95 page load < 2.5s on 4G; API P95 < 400ms for cached endpoints.
- **Reliability:** 99.9% uptime during Thurs–Mon game windows; graceful degradation if a source fails.
- **Observability:** per‑panel metrics (cache hit ratio, ingest lag, error rates); alerting on staleness.
- **Security:** OWASP ASVS L2; API keys in secret manager; rate limiting.
- **Cost Safeguards:** hard request ceilings per provider and per month; dry‑run mode for new providers; usage dashboard; fail‑closed if caps are reached (show friendly error and last cached data).
- **Reproducible Builds:** Pin dependency versions; commit lockfiles; ensure `npm ci && npm run dev` works on Windows/macOS/Linux; **no reliance on system tools like `psql`**.

---

## 10) Testing & QA
- **Fixture datasets** for at least two weeks of games to snapshot calculations.
- **Golden tests** for tendency metrics; JSON schema validation.
- **UI tests**: critical paths (select game → see injuries/tendencies/keys).
- **Smoke tests** on ingest failures and partial data.

---

## 11) Rollout Plan
- **Phase 1:** Single‑game view with injuries + basic tendencies (run/pass, blitz, pace) + 2 spotlight players/team.
- **Phase 2:** Expanded metrics, confidence scoring, full explanations, exports.
- **Phase 3:** Team pages, custom windows, alerts.

---

## 12) Decisions Resolved from Open Questions
1. **Data providers & cost:** Use free or free‑tier sources only; add rate‑limiters (≤ 60 req/min, ≤ 10k req/day) and monthly caps with usage UI. Avoid paid per‑request feeds; require explicit opt‑in if ever added.
2. **Neutral situation & explosive thresholds:** Use definitions in §5.4 as current baseline.
3. **Early‑season lookback:** Use **last 30 days** when total plays < 150 or during Weeks 1–4.
4. **Weather:** Use predicted conditions to adjust Key Players; integrate a free weather API (NWS or Open‑Meteo) and surface adjustments in Explain panel.
5. **Charts priority:** **Desktop‑first**; mobile receives simplified visualizations.

*No remaining open questions at this time.*

---

## 0) Build Decisions (Locked)
- **Scope:** Phase 2 features (expanded tendencies, confidence scoring, Explain panels, exports).
- **Platform:** Web only; **dark theme** default; desktop‑first charts.
- **Branding:** App name **GridironAI**; professional palette; analytical + football‑themed logo.
- **Primary Providers:** ESPN public JSON for schedules/injuries/rosters; Google News RSS for headlines; nflfastR CSVs for play‑by‑play; Open‑Meteo (or NWS) for weather.
- **Stack:** React + Tailwind (frontend), Node.js + Express (backend), Postgres (DB), Redis (cache). Local machine hosting.
- **Repo:** `github.com/wtcunningham/NFL` (blank repo provided).
- **Privacy:** No analytics; panel‑level attribution links enabled.

---

## 14) Architecture & Implementation Plan
### 14.1 High‑Level Architecture
- **Client (React/Tailwind):** SPA with routes `/games`, `/games/:gameId` (tabs: Injuries, Tendencies, Key Players), `/teams/:teamId` (Phase 2).
- **Server (Express):** REST API + caching proxy. Scheduled jobs (node‑cron) for ingestion/aggregation.
- **Storage:** Postgres for canonical data; Redis for short‑term cache & rate limiting.

### 14.2 Services & Jobs
1. **Ingestion**
   - `espn:scoreboard` (6h), `espn:teams` (24h), `espn:injuries:*` (60m/team), `news:rss:*` (24h/team), `pfr:injury-scrape` (24h, optional), `weather:*` (12h when <24h to kickoff).
2. **Aggregation**
   - `pbp:update` (weekly download nflfastR, rebuild rolling windows).
   - `tendencies:compute` (nightly) → `pbp_agg` & `matchup_agg`.
   - `spotlights:rank` (nightly + on demand) → `spotlights`.
3. **API Cache Warmers**
   - Precompute per‑game materialized JSON blobs (`mv_game_{id}`) for fast loads.

### 14.3 Directory Layout (proposed)
```
NFL/
  backend/
    src/
      api/ (Express routes)
      jobs/ (cron tasks)
      lib/ (http, parsers, rate-limit)
      models/ (sql, repos)
      services/ (espn, news, weather, nflfastr, spotlight)
    migrations/ (node-run SQL files; no psql dependency)
    seed/
    .env.example
  frontend/
    src/
      pages/ (Routes)
      components/
      hooks/
      styles/
      assets/logo.svg
    vite.config.js
    postcss.config.cjs
    tailwind.config.cjs
    index.html
    .env.example
  docker-compose.yml (optional local stack)
  README.md
```

### 14.4 Frontend Tooling Requirements (to prevent Vite errors)
- **Dependencies (pinned):** `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `tailwindcss`, `postcss`, `autoprefixer`.
- **Lockfile:** Include `package-lock.json` (or `pnpm-lock.yaml`) committed to repo.
- **Command:** `npm ci && npm run dev` must succeed cross‑platform.
- **Config files present:** `vite.config.js` imports `@vitejs/plugin-react`.

### 14.5 Migrations & DB Tooling
- **No system `psql` calls.** Use a Node script that opens the SQL file(s) and executes via `pg` Pool.
- **Command:** `npm run migrate` runs the Node migration runner.
- **Acceptance:** Fresh Windows machine without PostgreSQL client CLI can still apply migrations successfully.

## 15) API Surface (Express)
- `GET /api/games?from&to` → upcoming games (cached 6h)
- `GET /api/games/:id/injuries` → merged ESPN injuries + news blurbs (cached 30m)
- `GET /api/games/:id/tendencies?window=last4&plays_min=200` → offense/defense metrics + samples
- `GET /api/games/:id/spotlights` → 2–6 players per game with rationale + confidence
- `POST /api/refresh/:scope` → manual refresh (auth‑gated, local only)

**Rate limiting:** `60 req/min` global; per‑route stricter when needed.

**Build reproducibility:** The project **must** build on Windows/macOS/Linux with only Node + npm installed (plus Postgres & Redis services). All scripts avoid OS‑specific commands.
) API Surface (Express)
- `GET /api/games?from&to` → upcoming games (cached 6h)
- `GET /api/games/:id/injuries` → merged ESPN injuries + news blurbs (cached 30m)
- `GET /api/games/:id/tendencies?window=last4&plays_min=200` → offense/defense metrics + samples
- `GET /api/games/:id/spotlights` → 2–6 players per game with rationale + confidence
- `POST /api/refresh/:scope` → manual refresh (auth‑gated, local only)

**Rate limiting:** `60 req/min` global; per‑route stricter when needed.

**Build reproducibility:** The project **must** build on Windows/macOS/Linux with only Node + npm installed (plus Postgres & Redis services). All scripts avoid OS‑specific commands.

---

## 16) Database Schema (DDL Outline)
```sql
-- games, teams, players as in §5.2
CREATE TABLE games (
  game_id TEXT PRIMARY KEY,
  home_team_id TEXT NOT NULL,
  away_team_id TEXT NOT NULL,
  kickoff_ts TIMESTAMPTZ NOT NULL,
  venue TEXT,
  week INT
);
CREATE TABLE teams (
  team_id TEXT PRIMARY KEY,
  name TEXT,
  abbr TEXT,
  conf TEXT,
  div TEXT
);
CREATE TABLE players (
  player_id TEXT PRIMARY KEY,
  name TEXT,
  team_id TEXT REFERENCES teams(team_id),
  position TEXT,
  depth INT,
  ir_status TEXT
);
CREATE TABLE injury_reports (
  id BIGSERIAL PRIMARY KEY,
  player_id TEXT REFERENCES players(player_id),
  game_id TEXT REFERENCES games(game_id),
  status TEXT,
  detail TEXT,
  last_updated_ts TIMESTAMPTZ,
  sources JSONB
);
CREATE TABLE news (
  id BIGSERIAL PRIMARY KEY,
  entity_id TEXT,
  game_id TEXT,
  summary TEXT,
  published_ts TIMESTAMPTZ,
  source_url TEXT
);
CREATE TABLE pbp_agg (
  team_id TEXT,
  window_key TEXT,
  metrics_json JSONB,
  plays_n INT,
  generated_ts TIMESTAMPTZ,
  PRIMARY KEY(team_id, window_key)
);
CREATE TABLE matchup_agg (
  game_id TEXT PRIMARY KEY,
  offense_team_id TEXT,
  defense_team_id TEXT,
  metrics_json JSONB
);
CREATE TABLE spotlights (
  id BIGSERIAL PRIMARY KEY,
  game_id TEXT,
  team_id TEXT,
  player_id TEXT,
  confidence NUMERIC,
  rationale TEXT,
  features_json JSONB
);
```

---

## 17) Environment & Config
**backend/.env.example**
```
NODE_ENV=development
PORT=4000
TZ=America/Los_Angeles
# Postgres
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=postgres
PGDATABASE=gridironai
# Redis
REDIS_URL=redis://localhost:6379
# Providers (free‑tier by default)
USE_ESPN_PUBLIC=true
USE_NEWSAPI=false
# Caps
CAP_RPM_GLOBAL=60
CAP_REQ_MONTHLY_NEWS=0
CAP_REQ_MONTHLY_SPORTSDATA=0
```

**frontend/.env.example**
```
VITE_API_BASE=http://localhost:4000/api
VITE_APP_NAME=GridironAI
VITE_THEME=dark
```

---

## 18) Local Development
1. **Prereqs:** Node 20+, npm 10+, Postgres 14+, Redis 6+. **No external CLI tools required** (e.g., `psql` not required) — migrations are run via Node.
2. **Clone repo** `git clone git@github.com:wtcunningham/NFL.git`.
3. **Backend**: `cd backend && npm ci && npm run migrate && npm run dev`.
4. **Frontend**: `cd frontend && npm ci && npm run dev`.
5. Visit `http://localhost:5173` (Vite default) → select a game → verify tabs render.

*(Optionally include docker-compose with Postgres + Redis for one-command spin‑up.)*

---

## 19) Logo Placeholder (SVG)
A simple professional, dark‑friendly logo you can replace later.
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="64" viewBox="0 0 256 64" fill="none">
  <rect width="256" height="64" rx="12" fill="#0B0F14"/>
  <path d="M28 16c12 0 22 6 22 16s-10 16-22 16S6 42 6 32 16 16 28 16z" fill="#1F6FEB"/>
  <path d="M16 32h24M20 24l16 16M36 24L20 40" stroke="#E6EDF3" stroke-width="2" stroke-linecap="round"/>
  <text x="72" y="40" font-family="Inter, system-ui, -apple-system" font-size="24" fill="#E6EDF3">GridironAI</text>
</svg>
```

---

## 20) What You Need to Provide (Owner Checklist)
- ✅ **Repo is ready** (`wtcunningham/NFL`). Ensure I have **write access** or you'll upload code manually.
- ✅ **Free methods only** (no paid keys needed). Confirm we can proceed without any provider keys.
- 🔲 **Stadium coordinates seed** (optional): none provided — standard list will be included.
- 🔲 **Branding tweaks** (optional): default dark mode with professional blue accent.
- 🔲 **Usage caps** (optional): confirm monthly ceilings remain zero for paid providers (already defaulted).

**Expected Delivery:** A complete **GridironAI project scaffold** packaged as a `.zip` archive, containing frontend, backend, database schema, ingestion jobs, and local setup files, ready to be uploaded to the GitHub repository (`wtcunningham/NFL`).

Once delivered, you will unzip the package, commit to GitHub, and run local setup per §18.

