import React from "react";
import { useState, useEffect, useCallback, useRef } from "react";

// ─── JSONBin Config ───────────────────────────────────────────────────────────
const JSONBIN_API_KEY = "$2a$10$y51xvXl1M1eKVDnQ2Oo7s.tMcMb4rAS3PUIHl1EPncL9FGrksQ7hi";
const JSONBIN_BASE = "https://api.jsonbin.io/v3";

async function getBinId(): Promise<string> {
  const stored = localStorage.getItem("hamba_bin_id");
  if (stored) return stored;
  const res = await fetch(`${JSONBIN_BASE}/b`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Master-Key": JSONBIN_API_KEY,
      "X-Bin-Name": "hamba-community-hazards",
      "X-Bin-Private": "false",
    },
    body: JSON.stringify({ hazards: [] }),
  });
  const data = await res.json();
  const id: string = data.metadata?.id;
  if (id) localStorage.setItem("hamba_bin_id", id);
  return id;
}

async function fetchHazards(): Promise<Hazard[]> {
  const binId = await getBinId();
  const res = await fetch(`${JSONBIN_BASE}/b/${binId}/latest`, {
    headers: { "X-Master-Key": JSONBIN_API_KEY },
  });
  const data = await res.json();
  return data.record?.hazards || [];
}

async function saveHazards(hazards: Hazard[]): Promise<void> {
  const binId = await getBinId();
  const res = await fetch(`${JSONBIN_BASE}/b/${binId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Master-Key": JSONBIN_API_KEY,
    },
    body: JSON.stringify({ hazards }),
  });
  if (!res.ok) throw new Error("Save failed");
}

// ─── Types ────────────────────────────────────────────────────────────────────
type HazardType = "steps"|"no_ramp"|"narrow"|"steep"|"broken"|"no_curb"|"elevator"|"blocked";

interface Hazard {
  id: string;
  lat: number;
  lng: number;
  type: HazardType;
  timestamp: number;
}

interface Waypoint {
  lat: number;
  lng: number;
  t: number;
}

interface Route {
  id: string;
  name: string;
  waypoints: Waypoint[];
  createdAt: number;
  score: number;
}

type View = "home" | "report" | "routes" | "record" | "follow";

// ─── Constants ────────────────────────────────────────────────────────────────
const HAZARD_TYPES: { id: HazardType; label: string; emoji: string; color: string }[] = [
  { id: "steps",    label: "Steps / Stairs",  emoji: "🚫", color: "#ef4444" },
  { id: "no_ramp",  label: "No Ramp",          emoji: "⚠️", color: "#f97316" },
  { id: "narrow",   label: "Path Too Narrow",  emoji: "↔️", color: "#eab308" },
  { id: "steep",    label: "Too Steep",        emoji: "📐", color: "#a855f7" },
  { id: "broken",   label: "Broken Pavement",  emoji: "💥", color: "#ec4899" },
  { id: "no_curb",  label: "No Curb Cut",      emoji: "🛑", color: "#14b8a6" },
  { id: "elevator", label: "Broken Elevator",  emoji: "🔧", color: "#6366f1" },
  { id: "blocked",  label: "Path Blocked",     emoji: "🚧", color: "#84cc16" },
];

function calcDist(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const f1 = (lat1 * Math.PI) / 180, f2 = (lat2 * Math.PI) / 180;
  const df = ((lat2 - lat1) * Math.PI) / 180, dl = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(df / 2) ** 2 + Math.cos(f1) * Math.cos(f2) * Math.sin(dl / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function scoreLabel(s: number): { text: string; color: string } {
  if (s >= 85) return { text: "Highly Accessible", color: "#22c55e" };
  if (s >= 65) return { text: "Mostly Accessible", color: "#84cc16" };
  if (s >= 45) return { text: "Use Caution",       color: "#eab308" };
  if (s >= 25) return { text: "Difficult",         color: "#f97316" };
  return             { text: "Not Accessible",     color: "#ef4444" };
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Ring({ score }: { score: number }) {
  const [n, setN] = useState(0);
  const { color } = scoreLabel(score);
  const C = 2 * Math.PI * 54;
  useEffect(() => {
    let start: number | null = null;
    const run = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / 900, 1);
      setN(Math.round(p * score));
      if (p < 1) requestAnimationFrame(run);
    };
    requestAnimationFrame(run);
  }, [score]);
  return (
    <svg width={120} height={120} viewBox="0 0 128 128">
      <circle cx={64} cy={64} r={54} fill="none" stroke="#1e293b" strokeWidth={10} />
      <circle cx={64} cy={64} r={54} fill="none" stroke={color} strokeWidth={10}
        strokeDasharray={C} strokeDashoffset={C * (1 - n / 100)}
        strokeLinecap="round" transform="rotate(-90 64 64)"
        style={{ transition: "stroke-dashoffset 0.05s linear, stroke 0.4s" }} />
      <text x={64} y={60} textAnchor="middle" fill="white" fontSize={28} fontWeight="900" fontFamily="monospace">{n}</text>
      <text x={64} y={78} textAnchor="middle" fill="#94a3b8" fontSize={11} fontFamily="sans-serif">/ 100</text>
    </svg>
  );
}

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
      background: "#0f172a", border: "2px solid #22c55e", borderRadius: 14,
      padding: "12px 24px", color: "#22c55e", fontWeight: 800, fontSize: 14,
      zIndex: 9999, whiteSpace: "nowrap", boxShadow: "0 0 32px #22c55e33" }}>
      {msg}
    </div>
  );
}

function SyncDot({ busy, last, err }: { busy: boolean; last: number | null; err: boolean }) {
  if (err)  return <span style={{ fontSize: 11, color: "#ef4444", fontWeight: 700 }}>⚠️ Offline</span>;
  if (busy) return <span style={{ fontSize: 11, color: "#f59e0b", fontWeight: 700 }}>⟳ Syncing…</span>;
  return <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 700 }}>● Live{last ? ` · ${Math.round((Date.now() - last) / 1000)}s ago` : ""}</span>;
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function HambaApp() {
  const [view, setView]           = useState<View>("home");
  const [hazards, setHazards]     = useState<Hazard[]>([]);
  const [routes, setRoutes]       = useState<Route[]>(() => {
    try { return JSON.parse(localStorage.getItem("hamba_routes") || "[]"); } catch { return []; }
  });
  const [loc, setLoc]             = useState<[number, number] | null>(null);
  const [locErr, setLocErr]       = useState(false);
  const [toast, setToast]         = useState<string | null>(null);
  const [nearby, setNearby]       = useState<Hazard | null>(null);
  const [selType, setSelType]     = useState<HazardType | null>(null);
  const [recording, setRecording] = useState<{ id: string; waypoints: Waypoint[]; createdAt: number } | null>(null);
  const [activeRoute, setActive]  = useState<Route | null>(null);
  const [wpIdx, setWpIdx]         = useState(0);
  const [naming, setNaming]       = useState(false);
  const [rName, setRName]         = useState("");
  const [syncBusy, setSyncBusy]   = useState(false);
  const [syncErr, setSyncErr]     = useState(false);
  const [lastSync, setLastSync]   = useState<number | null>(null);
  const [submitting, setSubmit]   = useState(false);
  const gpsRef  = useRef<number | null>(null);
  const syncRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { localStorage.setItem("hamba_routes", JSON.stringify(routes)); }, [routes]);

  const load = async () => {
    setSyncBusy(true); setSyncErr(false);
    try { const h = await fetchHazards(); setHazards(h); setLastSync(Date.now()); }
    catch { setSyncErr(true); }
    finally { setSyncBusy(false); }
  };

  useEffect(() => {
    load();
    syncRef.current = setInterval(load, 15000);
    return () => { if (syncRef.current) clearInterval(syncRef.current); };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) { setLocErr(true); return; }
    gpsRef.current = navigator.geolocation.watchPosition(
      (p) => setLoc([p.coords.latitude, p.coords.longitude]),
      () => setLocErr(true),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 8000 }
    );
    return () => { if (gpsRef.current) navigator.geolocation.clearWatch(gpsRef.current); };
  }, []);

  useEffect(() => {
    if (!recording || !loc) return;
    const iv = setInterval(() => {
      setRecording((r) => r ? { ...r, waypoints: [...r.waypoints, { lat: loc[0], lng: loc[1], t: Date.now() }] } : r);
    }, 4000);
    return () => clearInterval(iv);
  }, [recording, loc]);

  useEffect(() => {
    if (!loc || !hazards.length) return;
    const n = hazards.find((h) => calcDist(loc[0], loc[1], h.lat, h.lng) < 20);
    if (n) { setNearby(n); if (navigator.vibrate) navigator.vibrate([200, 100, 200]); }
    else setNearby(null);
  }, [loc, hazards]);

  useEffect(() => {
    if (!loc || !activeRoute) return;
    const wp = activeRoute.waypoints[wpIdx];
    if (!wp) return;
    if (calcDist(loc[0], loc[1], wp.lat, wp.lng) < 10) {
      if (navigator.vibrate) navigator.vibrate(100);
      setWpIdx((i) => i + 1);
    }
  }, [loc, activeRoute, wpIdx]);

  const score = useCallback((): number => {
    if (!loc) return 100;
    const near = hazards.filter((h) => calcDist(loc[0], loc[1], h.lat, h.lng) < 400);
    const pen  = near.reduce((a, h) => {
      const d = calcDist(loc[0], loc[1], h.lat, h.lng);
      return a + (h.type === "steps" || h.type === "no_ramp" ? 18 : 10) * (1 - d / 400);
    }, 0);
    return Math.max(5, Math.min(100, Math.round(100 - pen)));
  }, [loc, hazards]);

  const S = score();
  const { text: SText, color: SColor } = scoreLabel(S);
  const tip = (m: string) => setToast(m);

  const report = async () => {
    if (!loc)     { tip("📍 Waiting for GPS…"); return; }
    if (!selType) return;
    setSubmit(true);
    try {
      const h: Hazard = { id: Date.now().toString(), lat: loc[0], lng: loc[1], type: selType, timestamp: Date.now() };
      const next = [...hazards, h];
      await saveHazards(next);
      setHazards(next); setLastSync(Date.now());
      setSelType(null); setView("home");
      tip("✅ Reported! Visible to everyone now.");
    } catch { tip("❌ Failed. Check connection."); }
    finally { setSubmit(false); }
  };

  const remove = async (id: string) => {
    try {
      const next = hazards.filter((h) => h.id !== id);
      await saveHazards(next); setHazards(next);
      tip("🗑️ Removed for everyone");
    } catch { tip("❌ Could not remove."); }
  };

  const startRec = () => {
    if (!loc) { tip("📍 Waiting for GPS…"); return; }
    setRecording({ id: Date.now().toString(), waypoints: [], createdAt: Date.now() });
    setView("record");
  };

  const stopRec = () => {
    if (!recording || recording.waypoints.length < 2) {
      tip("Need more waypoints."); setRecording(null); setView("home"); return;
    }
    setNaming(true);
  };

  const saveRoute = () => {
    const name = rName.trim() || `Route ${routes.length + 1}`;
    if (!recording) return;
    const r: Route = { ...recording, name, score: S };
    setRoutes((prev) => [...prev, r]);
    setRecording(null); setRName(""); setNaming(false); setView("routes");
    tip(`✅ "${name}" saved!`);
  };

  // ── Style helpers (all params optional) ────────────────────────────────────
  const card  = (g?: string) => ({
    background: "#0f172a", border: `1.5px solid ${g || "#1e293b"}`,
    borderRadius: 20, padding: "16px 18px", marginBottom: 12,
    boxShadow: g ? `0 0 20px ${g}33` : "none",
  });
  const btn = (bg: string, fg = "#fff", g?: string) => ({
    display: "flex", alignItems: "center", justifyContent: "center",
    gap: 10, width: "100%", padding: "15px 18px",
    background: bg, color: fg, border: "none", borderRadius: 16,
    fontSize: 15, fontWeight: 800, cursor: "pointer",
    boxShadow: g ? `0 4px 20px ${g}` : "none",
  } as React.CSSProperties);
  const ghost = (c: string) => ({
    display: "flex", alignItems: "center", justifyContent: "center",
    gap: 8, width: "100%", padding: "13px 18px",
    background: "transparent", color: c,
    border: `1.5px solid ${c}`, borderRadius: 16,
    fontSize: 14, fontWeight: 700, cursor: "pointer",
  } as React.CSSProperties);
  const back: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 6,
    background: "none", border: "none", color: "#94a3b8",
    fontWeight: 700, fontSize: 14, cursor: "pointer", padding: "16px 20px 8px",
  };
  const lbl: React.CSSProperties = {
    fontSize: 11, fontWeight: 800, color: "#64748b",
    letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8,
  };
  const bar = (p: number, c: string) => ({
    height: 8, borderRadius: 8,
    background: `linear-gradient(90deg,${c} ${p}%,#1e293b ${p}%)`,
    marginTop: 6,
  });
  const root: React.CSSProperties = {
    fontFamily: "'Segoe UI',system-ui,sans-serif",
    background: "#030712", color: "#f1f5f9",
    minHeight: "100vh", maxWidth: 480, margin: "0 auto",
  };

  // ── HOME ───────────────────────────────────────────────────────────────────
  if (view === "home") return (
    <div style={root}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}} button:active{transform:scale(.97);opacity:.9}`}</style>

      {/* Header */}
      <div style={{ padding: "20px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-0.04em", background: "linear-gradient(135deg,#f59e0b,#ef4444)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>HAMBA</div>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, letterSpacing: "0.08em" }}>COMMUNITY ACCESSIBILITY MAP</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
          <div style={{ background: SColor + "22", border: `1.5px solid ${SColor}`, borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 700, color: SColor }}>{SText}</div>
          <SyncDot busy={syncBusy} last={lastSync} err={syncErr} />
          <div style={{ fontSize: 11, color: "#475569" }}>📍 {loc ? "GPS Active" : locErr ? "No GPS" : "Searching…"}</div>
        </div>
      </div>

      {/* Live banner */}
      <div style={{ margin: "12px 20px 0", padding: "10px 14px", background: "#052e16", border: "1px solid #166534", borderRadius: 12, fontSize: 13, color: "#86efac" }}>
        🌍 <strong>{hazards.length} obstacle{hazards.length !== 1 ? "s" : ""}</strong> on the community map · updates every 15s
      </div>

      {/* Nearby alert */}
      {nearby && (
        <div style={{ margin: "10px 20px 0", padding: "12px 14px", background: "#7f1d1d", border: "1.5px solid #ef4444", borderRadius: 14, display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 22 }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 800, color: "#fca5a5", fontSize: 14 }}>HAZARD NEARBY</div>
            <div style={{ color: "#fca5a5", fontSize: 13 }}>{HAZARD_TYPES.find((h) => h.id === nearby.type)?.label} — within 20m</div>
          </div>
        </div>
      )}

      <div style={{ padding: "14px 20px 24px" }}>
        {/* Score card */}
        <div style={{ ...card(SColor), display: "flex", alignItems: "center", gap: 16 }}>
          <Ring score={S} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900, fontSize: 17, marginBottom: 3 }}>Area Score</div>
            <div style={{ fontSize: 13, color: "#94a3b8" }}>From <strong style={{ color: "#f1f5f9" }}>{hazards.length}</strong> community reports</div>
            <div style={bar(S, SColor)} />
            <button onClick={load} style={{ marginTop: 6, background: "none", border: "none", color: "#475569", fontSize: 11, cursor: "pointer", fontWeight: 700, padding: 0 }}>{syncBusy ? "⟳ Refreshing…" : "↻ Refresh"}</button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 18 }}>
          {[
            { label: "Hazards",  value: hazards.length, icon: "🚧", color: "#ef4444" },
            { label: "Routes",   value: routes.length,  icon: "🗺️", color: "#f59e0b" },
            { label: "Near You", value: loc ? hazards.filter((h) => calcDist(loc[0], loc[1], h.lat, h.lng) < 500).length : "–", icon: "📍", color: "#22c55e" },
          ].map((s) => (
            <div key={s.label} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 14, padding: "12px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 20 }}>{s.icon}</div>
              <div style={{ fontWeight: 900, fontSize: 20, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={lbl}>Actions</div>
        <button style={btn("#ef4444", "#fff", "#ef444444")} onClick={() => setView("report")}><span style={{ fontSize: 18 }}>🚧</span> Report an Obstacle</button>
        <div style={{ height: 9 }} />
        <button style={btn("#1d4ed8", "#fff", "#1d4ed844")} onClick={() => setView("routes")}><span style={{ fontSize: 18 }}>🗺️</span> Saved Routes</button>
        <div style={{ height: 9 }} />
        <button style={ghost("#22c55e")} onClick={startRec}><span>⏺</span> Record New Route</button>

        {/* Hazard list */}
        {hazards.length > 0 && (
          <>
            <div style={{ height: 1, background: "#1e293b", margin: "20px 0 14px" }} />
            <div style={lbl}>Community Reports</div>
            {hazards
              .map((h) => ({ ...h, d: loc ? calcDist(loc[0], loc[1], h.lat, h.lng) : 9999 }))
              .sort((a, b) => a.d - b.d).slice(0, 8)
              .map((h) => {
                const ht = HAZARD_TYPES.find((t) => t.id === h.type) || HAZARD_TYPES[0];
                return (
                  <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, padding: "10px 12px", background: "#0f172a", borderRadius: 14, border: "1px solid #1e293b" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: "50%", background: ht.color + "22", border: `2px solid ${ht.color}`, fontSize: 15, boxShadow: h.d < 25 ? `0 0 10px ${ht.color}` : "none", animation: h.d < 25 ? "pulse 1.2s infinite" : "none" }}>{ht.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{ht.label}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>{h.d < 1000 ? `${Math.round(h.d)}m` : `${(h.d / 1000).toFixed(1)}km`} · {new Date(h.timestamp).toLocaleDateString()}</div>
                    </div>
                    <button onClick={() => remove(h.id)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 16 }}>✕</button>
                  </div>
                );
              })}
          </>
        )}
      </div>
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
    </div>
  );

  // ── REPORT ─────────────────────────────────────────────────────────────────
  if (view === "report") return (
    <div style={root}>
      <style>{`button:active{transform:scale(.97)}`}</style>
      <button style={back} onClick={() => { setSelType(null); setView("home"); }}>← Back</button>
      <div style={{ padding: "0 20px 24px" }}>
        <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 4 }}>Report Obstacle</div>
        <div style={{ padding: "10px 14px", background: "#052e16", border: "1px solid #166534", borderRadius: 12, marginBottom: 18, fontSize: 13, color: "#86efac" }}>
          🌍 Visible to <strong>all Hamba users</strong> the moment you submit
        </div>
        {!loc && <div style={{ background: "#1c1917", border: "1px solid #78716c", borderRadius: 12, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#a8a29e" }}>📡 Waiting for GPS…</div>}
        <div style={lbl}>What's blocking the path?</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 16 }}>
          {HAZARD_TYPES.map((h) => (
            <button key={h.id}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: "13px 8px", background: selType === h.id ? h.color + "22" : "#0f172a", border: `1.5px solid ${selType === h.id ? h.color : "#1e293b"}`, borderRadius: 14, cursor: "pointer", transition: "all .15s", boxShadow: selType === h.id ? `0 0 14px ${h.color}44` : "none" }}
              onClick={() => setSelType(h.id)}>
              <span style={{ fontSize: 26 }}>{h.emoji}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: selType === h.id ? h.color : "#94a3b8", textAlign: "center" }}>{h.label}</span>
            </button>
          ))}
        </div>
        <button
          style={btn(submitting ? "#1e293b" : selType && loc ? "#ef4444" : "#1e293b", selType && loc && !submitting ? "#fff" : "#475569")}
          onClick={report}
          disabled={!selType || !loc || submitting}>
          {submitting ? "⟳ Submitting…" : "📍 Submit at My Location"}
        </button>
        <div style={{ marginTop: 10, fontSize: 12, color: "#475569", textAlign: "center" }}>GPS coordinates saved · visible to everyone immediately</div>
      </div>
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
    </div>
  );

  // ── ROUTES ─────────────────────────────────────────────────────────────────
  if (view === "routes") return (
    <div style={root}>
      <style>{`button:active{transform:scale(.97)}`}</style>
      <button style={back} onClick={() => setView("home")}>← Back</button>
      <div style={{ padding: "0 20px 24px" }}>
        <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 4 }}>Saved Routes</div>
        <div style={{ color: "#64748b", fontSize: 13, marginBottom: 18 }}>Your personally recorded accessible paths.</div>
        <button style={{ ...ghost("#f59e0b"), marginBottom: 18 }} onClick={startRec}>+ Record New Route</button>
        {routes.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#475569" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🗺️</div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>No routes yet</div>
            <div style={{ fontSize: 13 }}>Record your first route to help others.</div>
          </div>
        ) : routes.map((r) => {
          const rs = scoreLabel(r.score || 72);
          return (
            <div key={r.id} style={{ ...card(rs.color), cursor: "pointer" }} onClick={() => { setActive(r); setWpIdx(0); setView("follow"); }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 15 }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{r.waypoints.length} waypoints · {new Date(r.createdAt).toLocaleDateString()}</div>
                </div>
                <div style={{ display: "flex", gap: 7 }}>
                  <div style={{ background: rs.color + "22", border: `1.5px solid ${rs.color}`, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, color: rs.color }}>{r.score || 72}</div>
                  <button onClick={(e) => { e.stopPropagation(); setRoutes((p) => p.filter((x) => x.id !== r.id)); }} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 15 }}>✕</button>
                </div>
              </div>
              <div style={bar(r.score || 72, rs.color)} />
              <div style={{ fontSize: 11, color: "#475569", marginTop: 5 }}>Tap to follow →</div>
            </div>
          );
        })}
      </div>
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
    </div>
  );

  // ── RECORD ─────────────────────────────────────────────────────────────────
  if (view === "record") return (
    <div style={root}>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}} button:active{transform:scale(.97)}`}</style>
      <button style={back} onClick={() => { setRecording(null); setView("home"); }}>← Cancel</button>
      <div style={{ padding: "0 20px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#ef4444", animation: "blink 1s infinite" }} />
          <div style={{ fontWeight: 900, fontSize: 21 }}>Recording Route</div>
        </div>
        <div style={{ ...card("#22c55e"), textAlign: "center" }}>
          <div style={{ fontSize: 44, fontWeight: 900, color: "#22c55e" }}>{recording?.waypoints.length || 0}</div>
          <div style={{ color: "#64748b", fontSize: 13 }}>waypoints · auto-saves every 4s</div>
        </div>
        <div style={{ ...card(), marginBottom: 14 }}>
          <div style={lbl}>Your Location</div>
          {loc
            ? <div style={{ fontFamily: "monospace", fontSize: 13, color: "#22c55e" }}>{loc[0].toFixed(5)}, {loc[1].toFixed(5)}</div>
            : <div style={{ color: "#ef4444", fontSize: 13 }}>📡 Searching…</div>}
        </div>
        <div style={{ ...card(), marginBottom: 18 }}>
          <div style={lbl}>Area Score</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontWeight: 900, fontSize: 30, color: SColor }}>{S}</div>
            <div style={{ flex: 1 }}><div style={{ fontSize: 12, color: "#94a3b8" }}>{SText}</div><div style={bar(S, SColor)} /></div>
          </div>
        </div>
        <button style={btn("#22c55e", "#000", "#22c55e44")} onClick={stopRec}>⏹ Stop & Save Route</button>

        {naming && (
          <div style={{ position: "fixed", inset: 0, background: "#000c", display: "flex", alignItems: "flex-end", zIndex: 9998 }}>
            <div style={{ background: "#0f172a", border: "1.5px solid #1e293b", borderRadius: "22px 22px 0 0", width: "100%", padding: 22 }}>
              <div style={{ fontWeight: 900, fontSize: 19, marginBottom: 14 }}>Name Your Route</div>
              <input autoFocus value={rName} onChange={(e) => setRName(e.target.value)}
                placeholder={`Route ${routes.length + 1}`}
                style={{ width: "100%", background: "#1e293b", border: "1.5px solid #334155", borderRadius: 12, padding: "12px 14px", color: "#f1f5f9", fontSize: 15, fontFamily: "inherit", boxSizing: "border-box", marginBottom: 12 }}
                onKeyDown={(e) => e.key === "Enter" && saveRoute()} />
              <button style={btn("#22c55e", "#000", "#22c55e33")} onClick={saveRoute}>Save Route ✓</button>
              <div style={{ height: 8 }} />
              <button style={ghost("#64748b")} onClick={() => setNaming(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
    </div>
  );

  // ── FOLLOW ─────────────────────────────────────────────────────────────────
  if (view === "follow") return (
    <div style={root}>
      <style>{`button:active{transform:scale(.97)}`}</style>
      <button style={back} onClick={() => { setActive(null); setView("routes"); }}>← Routes</button>
      <div style={{ padding: "0 20px 24px" }}>
        <div style={{ fontWeight: 900, fontSize: 21, marginBottom: 3 }}>{activeRoute?.name}</div>
        <div style={{ color: "#64748b", fontSize: 12, marginBottom: 18 }}>{activeRoute?.waypoints.length} waypoints</div>

        <div style={card("#f59e0b")}>
          <div style={lbl}>Progress</div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
            <span style={{ fontWeight: 900, fontSize: 16 }}>Waypoint {wpIdx + 1} / {activeRoute?.waypoints.length}</span>
            <span style={{ color: "#f59e0b", fontWeight: 700 }}>{Math.round((wpIdx / (activeRoute?.waypoints.length || 1)) * 100)}%</span>
          </div>
          <div style={{ height: 7, borderRadius: 7, background: "#1e293b", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(wpIdx / (activeRoute?.waypoints.length || 1)) * 100}%`, background: "#f59e0b", borderRadius: 7, transition: "width .4s" }} />
          </div>
        </div>

        <div style={{ ...card(), display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
          <Ring score={S} />
          <div>
            <div style={{ fontWeight: 800, marginBottom: 3 }}>Live Area Score</div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>{hazards.filter((h) => loc && calcDist(loc[0], loc[1], h.lat, h.lng) < 150).length} hazards within 150m</div>
            <SyncDot busy={syncBusy} last={lastSync} err={syncErr} />
          </div>
        </div>

        {nearby && (
          <div style={{ background: "#450a0a", border: "1.5px solid #ef4444", borderRadius: 14, padding: "12px 14px", marginBottom: 14 }}>
            <div style={{ fontWeight: 800, color: "#fca5a5", fontSize: 14, marginBottom: 3 }}>⚠️ Hazard Ahead</div>
            <div style={{ color: "#fca5a5", fontSize: 13 }}>{HAZARD_TYPES.find((h) => h.id === nearby.type)?.label} — within 20m</div>
          </div>
        )}

        {wpIdx >= (activeRoute?.waypoints.length || 0) ? (
          <div style={{ ...card("#22c55e"), textAlign: "center", padding: 28 }}>
            <div style={{ fontSize: 44, marginBottom: 6 }}>🎉</div>
            <div style={{ fontWeight: 900, fontSize: 20, color: "#22c55e" }}>Route Complete!</div>
            <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 6 }}>You reached your destination safely.</div>
          </div>
        ) : (
          <div style={{ ...card("#1d4ed8"), textAlign: "center" }}>
            <div style={lbl}>Next Waypoint</div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>Continue on path</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>Phone vibrates when you arrive</div>
          </div>
        )}

        <div style={{ height: 10 }} />
        <button style={ghost("#ef4444")} onClick={() => setView("report")}>🚧 Report Obstacle Here</button>
      </div>
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
    </div>
  );

  return null;
}