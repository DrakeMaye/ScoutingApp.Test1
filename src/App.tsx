import { useEffect, useMemo, useState } from "react";

type Field = {
  id: string;
  label: string;
  type: "number" | "text" | "counter" | "boolean" | "select";
  min?: number;
  defaultValue?: string | number | boolean;
  options?: string[];
};
type Phase = { id: string; label: string; fields: Field[] };
type GameConfig = { season: string; event: string; title: string; phases: Phase[] };
type Entry = { id: string; createdAt: string; team: string; match: string; values: Record<string, unknown> };

const STORAGE_KEY = "scoutboard.entries.v1";
const configUrl = "/game-config.json";

export default function App() {
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [entries, setEntries] = useState<Entry[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
  });
  const [team, setTeam] = useState("");
  const [match, setMatch] = useState("");
  const [phase, setPhase] = useState("");
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [notice, setNotice] = useState("");

  useEffect(() => {
    fetch(configUrl).then((r) => r.json()).then((data: GameConfig) => {
      setConfig(data);
      setPhase(data.phases[0]?.id ?? "");
      const defaults = Object.fromEntries(data.phases.flatMap((p) => p.fields)
        .filter((f) => f.defaultValue !== undefined).map((f) => [f.id, f.defaultValue]));
      setValues(defaults);
    }).catch(() => setNotice("Could not load game-config.json"));
  }, []);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); }, [entries]);

  const activePhase = config?.phases.find((item) => item.id === phase);
  const ready = team.trim().length > 0 && match.trim().length > 0;
  const latest = useMemo(() => entries.slice(0, 5), [entries]);

  function setField(id: string, value: unknown) { setValues((current) => ({ ...current, [id]: value })); }
  function saveEntry() {
    if (!ready) return;
    const entry = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), team: team.trim(), match: match.trim(), values };
    const next = [entry, ...entries];
    setEntries(next);
    setNotice("Match saved on this device");
    setValues(Object.fromEntries((config?.phases.flatMap((p) => p.fields) ?? [])
      .filter((f) => f.defaultValue !== undefined).map((f) => [f.id, f.defaultValue])));
  }
  function exportData() {
    const blob = new Blob([JSON.stringify({ season: config?.season, event: config?.event, entries }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = "scouting-data.json"; link.click();
    URL.revokeObjectURL(url);
  }

  if (!config) return <main className="loading">{notice || "Loading scouting config..."}</main>;
  return <main className="app-shell">
    <header className="topbar">
      <a className="wordmark" href="#" aria-label="Scoutboard home"><span className="mark">S</span> Scoutboard</a>
      <div className="event-meta"><span>{config.season} season</span><span className="dot" />{config.event}</div>
      <button className="icon-button" onClick={exportData} title="Export scouting data" aria-label="Export scouting data">⇩</button>
    </header>

    <section className="workspace">
      <aside className="sidebar">
        <div className="sidebar-heading">WORKSPACE</div>
        <button className="nav-item active"><span>◉</span> Match scouting</button>
        <div className="sidebar-bottom"><span className="status-dot" /> Saved on this device</div>
      </aside>

      <div className="content">
        <div className="page-heading">
          <div><div className="eyebrow">MATCH SCOUTING</div><h1>{config.title}</h1><p>Record one robot's performance for each match.</p></div>
          <button className="secondary-button" onClick={exportData}>⇩ <span>Export data</span></button>
        </div>

        <section className="match-bar" aria-label="Match details">
          <label>TEAM NUMBER<input inputMode="numeric" value={team} onChange={(e) => setTeam(e.target.value)} placeholder="e.g. 2713" /></label>
          <label>MATCH<input inputMode="numeric" value={match} onChange={(e) => setMatch(e.target.value)} placeholder="e.g. 12" /></label>
          <div className="record-count"><strong>{entries.length}</strong><span>records saved</span></div>
        </section>

        <div className="phase-tabs" role="tablist" aria-label="Match phase">
          {config.phases.map((item) => <button key={item.id} role="tab" aria-selected={phase === item.id} className={phase === item.id ? "phase-tab selected" : "phase-tab"} onClick={() => setPhase(item.id)}>{item.label}</button>)}
        </div>

        <section className="form-section">
          <div className="section-title"><h2>{activePhase?.label}</h2><span>PHASE DATA</span></div>
          <div className="field-grid">
            {activePhase?.fields.map((field) => <FieldInput key={field.id} field={field} value={values[field.id]} onChange={(v) => setField(field.id, v)} />)}
          </div>
          <div className="form-footer">
            <span className="notice" role="status">{notice}</span>
            <button className="primary-button" disabled={!ready} onClick={saveEntry}>Save match <span aria-hidden="true">↗</span></button>
          </div>
        </section>

        <section className="recent-section">
          <div className="section-title"><h2>Recent records</h2><span>{entries.length} TOTAL</span></div>
          {latest.length === 0 ? <div className="empty-state">Saved match records will appear here.</div> :
            <div className="record-list">{latest.map((entry) => <div className="record-row" key={entry.id}><strong>Team {entry.team}</strong><span>Match {entry.match}</span><time>{new Date(entry.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time></div>)}</div>}
        </section>
      </div>
    </section>
  </main>;
}

function FieldInput({ field, value, onChange }: { field: Field; value: unknown; onChange: (v: unknown) => void }) {
  if (field.type === "boolean") return <label className="toggle-field"><span>{field.label}</span><input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} /></label>;
  if (field.type === "counter") return <div className="counter-field"><span>{field.label}</span><div><button onClick={() => onChange(Math.max(0, Number(value || 0) - 1))} aria-label={"Decrease " + field.label}>−</button><strong>{Number(value || 0)}</strong><button onClick={() => onChange(Number(value || 0) + 1)} aria-label={"Increase " + field.label}>+</button></div></div>;
  if (field.type === "select") return <label className="input-field"><span>{field.label}</span><select value={String(value ?? "")} onChange={(e) => onChange(e.target.value)}>{field.options?.map((option) => <option key={option}>{option}</option>)}</select></label>;
  return <label className="input-field"><span>{field.label}</span><input type={field.type === "number" ? "number" : "text"} min={field.min} value={String(value ?? "")} onChange={(e) => onChange(field.type === "number" ? Number(e.target.value) : e.target.value)} /></label>;
}