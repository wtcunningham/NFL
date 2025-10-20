import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";

const API = import.meta.env.VITE_API_BASE || "http://localhost:4000/api";

function Section({ title, children }) {
  return (
    <section className="mt-6">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <div className="rounded-2xl bg-slate-900 p-4">{children}</div>
    </section>
  );
}

/* ---------------------- UI helpers ---------------------- */
const statusStyles = (sRaw) => {
  const s = (sRaw || "").toLowerCase();
  if (s.includes("out") || s.includes("reserve")) {
    return "bg-red-500/15 text-red-300 border border-red-500/30";
  }
  if (s.includes("doubt")) {
    return "bg-orange-500/15 text-orange-300 border border-orange-500/30";
  }
  if (s.includes("question")) {
    return "bg-yellow-500/15 text-yellow-300 border border-yellow-500/30";
  }
  if (s.includes("physically unable") || s.includes("pup")) {
    return "bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/30";
  }
  return "bg-slate-700/30 text-slate-300 border border-slate-600/30";
};

const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

const fmtDay = (iso) => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "Recent";
  }
};

const MAX_VISIBLE_PER_TEAM = 0; // always scrollable

/* ---------------------- Page ---------------------- */
export default function GameDetail() {
  const { id } = useParams();

  const [meta, setMeta] = useState(null);
  const [injuries, setInjuries] = useState(null);
  const [tendencies, setTendencies] = useState(null);
  const [spotlights, setSpotlights] = useState(null);
  const [error, setError] = useState(null);

  // per-team filters
  const [homeFilter, setHomeFilter] = useState(() => new Set());
  const [awayFilter, setAwayFilter] = useState(() => new Set());

  // 1️⃣ Fetch meta
  useEffect(() => {
    setMeta(null);
    setInjuries(null);
    setTendencies(null);
    setSpotlights(null);
    setError(null);
    setHomeFilter(new Set());
    setAwayFilter(new Set());

    fetch(`${API}/games/${id}`)
      .then((r) => r.json())
      .then(setMeta)
      .catch((e) => setError(String(e)));
  }, [id]);

  // 2️⃣ Fetch injuries + other data
  useEffect(() => {
    if (!meta) return;

    const qs = new URLSearchParams({
      homeId: meta.home_team_id ?? "",
      awayId: meta.away_team_id ?? "",
      homeName: meta.home_team ?? "",
      awayName: meta.away_team ?? "",
      force: "1",
    }).toString();

    fetch(`${API}/games/${id}/injuries?${qs}`)
      .then((r) => r.json())
      .then((payload) => {
        const filtered = (payload.players || []).filter((p) => {
          const s = (p.status || "").toLowerCase();
          return s && !["active", "probable"].includes(s);
        });
        setInjuries({ ...payload, players: filtered });
      })
      .catch(() => {});

    fetch(`${API}/games/${id}/tendencies`)
      .then((r) => r.json())
      .then(setTendencies)
      .catch(() => {});

    fetch(`${API}/games/${id}/spotlights`)
      .then((r) => r.json())
      .then(setSpotlights)
      .catch(() => {});
  }, [id, meta]);

  const matchesFilter = (p, filterSet) => {
    if (!filterSet || filterSet.size === 0) return true;
    const s = (p.status || "").toLowerCase();
    for (const val of filterSet) {
      if (s === val.toLowerCase()) return true;
    }
    return false;
  };

  const {
    homeInj,
    awayInj,
    homeLegend,
    awayLegend,
    homeTotal,
    awayTotal,
  } = useMemo(() => {
    const players = injuries?.players || [];
    const homeAll = players.filter(
      (p) =>
        (p.team || "").toLowerCase() === (meta?.home_team || "").toLowerCase()
    );
    const awayAll = players.filter(
      (p) =>
        (p.team || "").toLowerCase() === (meta?.away_team || "").toLowerCase()
    );

    const homeVisible = homeAll.filter((p) => matchesFilter(p, homeFilter));
    const awayVisible = awayAll.filter((p) => matchesFilter(p, awayFilter));

    const groupByDate = (arr) => {
      const map = new Map();
      for (const p of arr) {
        const k = fmtDay(p.date || p.last_updated_ts);
        if (!map.has(k)) map.set(k, []);
        map.get(k).push(p);
      }
      return [...map.entries()].sort((a, b) => new Date(b[0]) - new Date(a[0]));
    };

    const countStatuses = (arr) => {
      const counts = {};
      for (const p of arr) {
        const key = (p.status || "Unknown").trim();
        if (!key) continue;
        counts[key] = (counts[key] || 0) + 1;
      }
      return Object.entries(counts).sort((a, b) => b[1] - a[1]);
    };

    return {
      homeInj: groupByDate(homeVisible),
      awayInj: groupByDate(awayVisible),
      homeLegend: countStatuses(homeAll),
      awayLegend: countStatuses(awayAll),
      homeTotal: homeAll.length,
      awayTotal: awayAll.length,
    };
  }, [injuries, meta, homeFilter, awayFilter]);

  /* ---------------------- Render helpers ---------------------- */
  const toggleStatus = (team, status) => {
    if (team === "home") {
      setHomeFilter((prev) => {
        const next = new Set(prev);
        if (next.has(status)) next.delete(status);
        else next.add(status);
        return next;
      });
    } else {
      setAwayFilter((prev) => {
        const next = new Set(prev);
        if (next.has(status)) next.delete(status);
        else next.add(status);
        return next;
      });
    }
  };

  const clearFilter = (team) => {
    if (team === "home") setHomeFilter(new Set());
    else setAwayFilter(new Set());
  };

  const isActive = (team, status) =>
    (team === "home" ? homeFilter : awayFilter).has(status);

  const renderLegend = (legend, total, teamKey) => (
    <div className="flex flex-wrap items-center gap-2 mb-3">
      {legend.map(([status, count]) => {
        const active = isActive(teamKey, status);
        return (
          <button
            type="button"
            key={status}
            onClick={() => toggleStatus(teamKey, status)}
            className={
              "text-xs px-2 py-0.5 rounded-full transition-colors " +
              statusStyles(status) +
              (active ? " ring-2 ring-offset-0 ring-slate-300/40" : "")
            }
          >
            {count} {status}
          </button>
        );
      })}
      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 border border-slate-600/40 ml-auto">
        {total} Total Injuries
      </span>
      {(teamKey === "home" ? homeFilter.size : awayFilter.size) > 0 && (
        <button
          type="button"
          onClick={() => clearFilter(teamKey)}
          className="text-xs ml-2 underline underline-offset-2 text-slate-300 hover:text-slate-100"
        >
          Clear
        </button>
      )}
    </div>
  );

  const flatten = (grouped) => {
    const list = [];
    for (const [day, players] of grouped) {
      for (const p of players) list.push({ day, p });
    }
    return list;
  };
  const regroup = (list) => {
    const map = new Map();
    for (const { day, p } of list) {
      if (!map.has(day)) map.set(day, []);
      map.get(day).push(p);
    }
    return [...map.entries()];
  };

  const renderPlayerRow = (p) => (
    <div key={`${p.player_id}-${p.team || ""}`} className="p-3 sm:p-4 flex gap-3">
      <div className="flex-shrink-0">
        {p.headshot ? (
          <img
            src={p.headshot}
            alt={p.name}
            className="h-10 w-10 rounded-full object-cover border border-slate-700"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-slate-800 grid place-items-center text-slate-200 font-semibold">
            {initials(p.name)}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="font-semibold truncate">
            {p.name}
            {p.pos ? <span className="opacity-70 font-normal"> ({p.pos})</span> : null}
          </div>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className={"text-xs px-2 py-0.5 rounded-full " + statusStyles(p.status)}>
            {p.status}
          </span>
        </div>
        {p.detail ? <div className="text-sm opacity-90 mt-1">{p.detail}</div> : null}
      </div>
    </div>
  );

  const renderGroupedList = (grouped) => (
    <div className="divide-y divide-slate-800 rounded-xl overflow-hidden bg-slate-900/60">
      {grouped.map(([day, players]) => (
        <div key={day}>
          <div className="text-xs uppercase tracking-wide px-3 sm:px-4 pt-3 text-slate-400">
            {day}
          </div>
          {players.map(renderPlayerRow)}
        </div>
      ))}
    </div>
  );

  const renderTeamInjuries = (teamLabel, grouped, legend, total, teamKey) => {
    const flat = flatten(grouped);
    const restGrouped = regroup(flat);
    return (
      <div>
        <h4 className="text-base font-semibold mb-2">{teamLabel}</h4>
        {renderLegend(legend, total, teamKey)}
        {flat.length === 0 ? (
          <div className="opacity-70 text-sm">No injuries.</div>
        ) : (
          <div className="max-h-72 overflow-y-auto pr-2 custom-scroll">
            {renderGroupedList(restGrouped)}
          </div>
        )}
      </div>
    );
  };

  if (error)
    return (
      <div className="max-w-5xl mx-auto p-6 text-red-400">Error: {error}</div>
    );
  if (!meta) return <div className="max-w-5xl mx-auto p-6">Loading…</div>;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <Link to="/" className="text-sm opacity-80">
        &larr; Back to games
      </Link>

      <h1 className="text-3xl font-bold mt-2">
        {meta.away_team} @ {meta.home_team}
      </h1>
      <div className="opacity-80 mt-1">
        {new Date(meta.kickoff_ts).toLocaleString()} • {meta.venue || "TBD venue"}
      </div>

      <Section title="Injuries">
        {!injuries ? (
          <div className="opacity-70">Loading…</div>
        ) : (injuries.players || []).length === 0 ? (
          <div className="opacity-70">No recent injuries recorded.</div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-8">
            {renderTeamInjuries(meta.away_team, awayInj, awayLegend, awayTotal, "away")}
            {renderTeamInjuries(meta.home_team, homeInj, homeLegend, homeTotal, "home")}
          </div>
        )}
      </Section>
    </div>
  );
}
