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

/* ---------------------- Page ---------------------- */
export default function GameDetail() {
  const { id } = useParams();

  const [meta, setMeta] = useState(null);
  const [injuries, setInjuries] = useState(null);
  const [tendencies, setTendencies] = useState(null);
  const [spotlights, setSpotlights] = useState(null);
  const [error, setError] = useState(null);

  // 1️⃣ Fetch meta
  useEffect(() => {
    setMeta(null);
    setInjuries(null);
    setTendencies(null);
    setSpotlights(null);
    setError(null);

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

  // 3️⃣ Split injuries by team + day + per-team legends
  const { homeInj, awayInj, homeLegend, awayLegend, homeTotal, awayTotal } =
    useMemo(() => {
      const players = injuries?.players || [];
      const homePlayers = players.filter(
        (p) =>
          (p.team || "").toLowerCase() ===
          (meta?.home_team || "").toLowerCase()
      );
      const awayPlayers = players.filter(
        (p) =>
          (p.team || "").toLowerCase() ===
          (meta?.away_team || "").toLowerCase()
      );

      const groupByDate = (arr) => {
        const map = new Map();
        for (const p of arr) {
          const k = fmtDay(p.date || p.last_updated_ts);
          if (!map.has(k)) map.set(k, []);
          map.get(k).push(p);
        }
        return [...map.entries()].sort(
          (a, b) => new Date(b[0]) - new Date(a[0])
        );
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
        homeInj: groupByDate(homePlayers),
        awayInj: groupByDate(awayPlayers),
        homeLegend: countStatuses(homePlayers),
        awayLegend: countStatuses(awayPlayers),
        homeTotal: homePlayers.length,
        awayTotal: awayPlayers.length,
      };
    }, [injuries, meta]);

  /* ---------------------- Render helpers ---------------------- */
  const renderLegend = (legend, total) => (
    <div className="flex flex-wrap items-center gap-2 mb-3">
      {legend.map(([status, count]) => (
        <span
          key={status}
          className={
            "text-xs px-2 py-0.5 rounded-full " + statusStyles(status)
          }
        >
          {count} {status}
        </span>
      ))}
      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 border border-slate-600/40 ml-auto">
        {total} Total Injuries
      </span>
    </div>
  );

  const renderTeamInjuries = (teamLabel, grouped, legend, total) => (
    <div>
      <h4 className="text-base font-semibold mb-2">{teamLabel}</h4>
      {renderLegend(legend, total)}
      {grouped.length === 0 ? (
        <div className="opacity-70 text-sm">No injuries.</div>
      ) : (
        <div className="space-y-5">
          {grouped.map(([day, players]) => (
            <div key={day}>
              <div className="text-xs uppercase tracking-wide mb-1 text-slate-400">
                {day}
              </div>
              <div className="divide-y divide-slate-800 rounded-xl overflow-hidden bg-slate-900/60">
                {players.map((p) => (
                  <div
                    key={`${p.player_id}-${p.team || ""}`}
                    className="p-3 sm:p-4 flex gap-3"
                  >
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-slate-800 grid place-items-center text-slate-200 font-semibold">
                        {initials(p.name)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-semibold truncate">
                          {p.name}
                          {p.pos ? (
                            <span className="opacity-70 font-normal">
                              {" "}
                              ({p.pos})
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span
                          className={
                            "text-xs px-2 py-0.5 rounded-full " +
                            statusStyles(p.status)
                          }
                        >
                          {p.status}
                        </span>
                      </div>
                      {p.detail ? (
                        <div className="text-sm opacity-90 mt-1">
                          {p.detail}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  /* ---------------------- Render ---------------------- */
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
        {new Date(meta.kickoff_ts).toLocaleString()} •{" "}
        {meta.venue || "TBD venue"}
      </div>

      {/* -------------------- Injuries -------------------- */}
      <Section title="Injuries">
        {!injuries ? (
          <div className="opacity-70">Loading…</div>
        ) : (injuries.players || []).length === 0 ? (
          <div className="opacity-70">No recent injuries recorded.</div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-8">
            {renderTeamInjuries(
              meta.away_team,
              awayInj,
              awayLegend,
              awayTotal
            )}
            {renderTeamInjuries(
              meta.home_team,
              homeInj,
              homeLegend,
              homeTotal
            )}
          </div>
        )}
      </Section>

      {/* -------------------- Tendencies -------------------- */}
      <Section title="Tendencies">
        {tendencies ? (
          <pre className="text-sm whitespace-pre-wrap">
            {JSON.stringify(tendencies, null, 2)}
          </pre>
        ) : (
          <div className="opacity-70">Loading…</div>
        )}
      </Section>

      {/* -------------------- Spotlights -------------------- */}
      <Section title="Spotlights">
        {spotlights ? (
          <div className="grid sm:grid-cols-2 gap-3">
            {(spotlights.players || []).map((pl) => (
              <div
                key={pl.player_id}
                className="rounded-xl border border-slate-800 p-3"
              >
                <div className="font-medium">
                  {pl.name} <span className="opacity-70">({pl.pos})</span>
                </div>
                <div className="opacity-80 text-sm">
                  Confidence:{" "}
                  {pl.confidence?.toFixed?.(1) ?? pl.confidence ?? "—"}%
                </div>
                {pl.rationale ? (
                  <div className="opacity-80 text-sm mt-1">{pl.rationale}</div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="opacity-70">Loading…</div>
        )}
      </Section>
    </div>
  );
}
