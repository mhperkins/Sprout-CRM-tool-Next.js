"use client";

/**
 * GrantMetrics.jsx — proof-of-concept numbers for grant applications.
 *
 * Reads only: events (Outcomes tile), contacts + orgs (Membership section), program
 * submissions, showcase applications and every sign-in sheet in the SPROUT N TELL
 * Drive folder (attendance for any event whose headcount is blank). The math lives in lib/grantMetrics.js.
 * Writes one thing: the per-event rows in the By month dropdowns edit that event's
 * Outcomes (hosted by, headcount, first-timers, artists, members who came, dues collected,
 * rental, rental fee) through the same single-event save the
 * event page uses, so the event page shows the same numbers.
 * Every gap is shown, never hidden: an event with no headcount is listed so the
 * attendance figure is never quietly understated.
 */

import { useState, useEffect, useMemo } from "react";
import { fetchProgramEntryEventIds, fetchShowcaseApplications, fetchKioskSignins } from "../lib/services";
import { computeGrantMetrics, metricsToText } from "../lib/grantMetrics";

const GM_STYLES = `
.gm{--line:#E3E3DD;--dim:#5F5F57;--warn:#8A6100;--warn-bg:#FAF0D6}
.gm-top{display:flex;gap:12px 20px;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;padding-bottom:14px;border-bottom:2px solid var(--black);margin-bottom:16px}
.gm-top h1{font-size:30px;font-weight:900;letter-spacing:-.02em;line-height:1.05}
.gm-top p{color:var(--dim);font-size:13px;margin-top:5px;max-width:62ch}
.gm-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:14px}
.gm-chip{appearance:none;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;border:1.5px solid var(--line);background:#fff;color:var(--dim);border-radius:999px;padding:5px 13px}
.gm-chip[aria-pressed="true"]{background:var(--black);color:var(--white);border-color:var(--black)}
.gm-chip:focus-visible,.gm-btn:focus-visible{outline:2px solid var(--fuchsia);outline-offset:2px}
.gm-btn{appearance:none;font:inherit;font-size:13px;font-weight:700;cursor:pointer;border:1px solid var(--black);background:var(--black);color:var(--white);border-radius:6px;padding:8px 14px}
.gm-date{font:inherit;font-size:12.5px;border:1px solid var(--line);border-radius:6px;padding:4px 8px;background:#fff}
.gm-warn{background:var(--warn-bg);border-left:4px solid var(--banana);border-radius:0 8px 8px 0;padding:10px 14px;font-size:13px;margin-bottom:16px}
.gm-warn b{color:var(--warn)}
.gm-warn ul{margin:6px 0 0 18px;display:flex;flex-wrap:wrap;gap:2px 18px}
.gm-warn button{appearance:none;background:none;border:none;padding:0;font:inherit;color:#2a8ca0;text-decoration:underline;cursor:pointer}
.gm-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-bottom:22px}
.gm-kpi{background:#fff;border:1px solid var(--line);border-radius:10px;padding:12px 14px;min-width:0}
.gm-kpi b{display:block;font-size:26px;font-weight:900;line-height:1.1;font-variant-numeric:tabular-nums}
.gm-kpi span{display:block;font-size:12px;color:var(--dim);margin-top:2px}
.gm-kpi small{display:block;font-size:11px;color:var(--g400);margin-top:3px}
.gm-h{font-size:12px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;color:var(--dim);margin:0 0 8px}
.gm-tw{overflow-x:auto;background:#fff;border:1px solid var(--line);border-radius:10px;margin-bottom:22px}
.gm-t{border-collapse:collapse;width:100%;font-size:13px;font-variant-numeric:tabular-nums}
.gm-t th,.gm-t td{padding:8px 12px;border-bottom:1px solid var(--g100);text-align:right;white-space:nowrap}
.gm-t th:first-child,.gm-t td:first-child{text-align:left}
.gm-t th{font-size:11.5px;color:var(--dim);font-weight:700}
.gm-t tfoot td{font-weight:900;border-bottom:none}
.gm-miss{color:var(--warn);font-size:11px;margin-left:4px}
.gm-two{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;align-items:start}
.gm-card{background:#fff;border:1px solid var(--line);border-radius:10px;padding:14px;min-width:0}
.gm-q{border-left:4px solid var(--acid);padding:6px 12px;margin-bottom:10px;font-size:13.5px;font-style:italic;line-height:1.55}
.gm-q small{display:block;font-style:normal;color:var(--dim);font-size:11.5px;margin-top:3px}
.gm-hr{display:grid;grid-template-columns:minmax(0,1fr) 120px 40px;gap:8px;align-items:center;font-size:12.5px;padding:3px 0}
.gm-hr .tr{height:8px;background:var(--g100);border-radius:4px;overflow:hidden}
.gm-hr .tr i{display:block;height:100%;background:var(--cyan)}
.gm-hr b{text-align:right;font-variant-numeric:tabular-nums}
.gm-empty{color:var(--dim);font-size:13px}
.gm-mtog{appearance:none;background:none;border:none;padding:0;font:inherit;font-weight:700;cursor:pointer;color:inherit;display:inline-flex;gap:6px;align-items:center}
.gm-mtog i{font-style:normal;display:inline-block;width:10px;color:var(--dim);transition:transform .15s}
.gm-mtog[aria-expanded="true"] i{transform:rotate(90deg)}
.gm-mtog:focus-visible{outline:2px solid var(--fuchsia);outline-offset:2px}
.gm-sub td{background:#FAFAF8;font-size:12.5px;color:var(--dim)}
.gm-sub td:first-child{padding-left:30px;white-space:normal;min-width:200px}
.gm-sub button{appearance:none;background:none;border:none;padding:0;font:inherit;color:var(--black);font-weight:700;cursor:pointer;text-align:left}
.gm-sub button:hover{text-decoration:underline}
.gm-src{font-size:10.5px;font-weight:700;padding:1px 6px;border-radius:8px;margin-left:5px;background:var(--g100);color:var(--dim)}
.gm-src.door{background:#E2F3F7;color:#1d6878}
.gm-src.miss{background:var(--warn-bg);color:var(--warn)}
/* Explicit text color + light scheme: globals.css flips form fields to dark mode on a
   dark-mode Mac, which made typed numbers white on these white boxes. */
.gm-in{color:#030000;color-scheme:light;font:inherit;font-size:12.5px;width:64px;text-align:right;border:1px solid var(--line);border-radius:5px;padding:3px 6px;background:#fff;font-variant-numeric:tabular-nums}
.gm-in:focus{outline:2px solid var(--cyan);outline-offset:0;border-color:var(--cyan)}
.gm-in::placeholder{color:#1d6878;opacity:.75}
.gm-ck{width:16px;height:16px;accent-color:#2a8ca0;cursor:pointer;vertical-align:middle;color-scheme:light}
.gm-sel{color:#030000;color-scheme:light;font:inherit;font-size:12px;border:1px solid var(--line);border-radius:5px;padding:2px 4px;background:#fff}
`;

const money = (n) => "$" + Math.round(n || 0).toLocaleString();
const fmtD = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
const localToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const shiftMonths = (iso, n) => { const d = new Date(iso + "T12:00:00"); d.setMonth(d.getMonth() + n); d.setDate(1); return d.toISOString().slice(0, 10); };
// Partner events count by default. New key so a browser that remembered "off" under the
// old default starts included; turning the switch off is still remembered.
const PARTNER_KEY = "sprout_gm_partners_v2";

export default function GrantMetrics({ events = [], contacts = [], orgs = [], onUpdateEvent, profile, openEvent, showToast }) {
  const today = localToday();
  const firstEvent = useMemo(() => events.map(e => e.event_date).filter(Boolean).sort()[0] || today.slice(0, 4) + "-01-01", [events, today]);
  const [range, setRange] = useState("all");
  const [custom, setCustom] = useState({ from: shiftMonths(today, -3), to: today });
  const [partners, setPartners] = useState(() => { try { return localStorage.getItem(PARTNER_KEY) !== "0"; } catch { return true; } });
  const [programIds, setProgramIds] = useState([]);
  const [apps, setApps] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [kiosk, setKiosk] = useState({ nights: {}, sheets: [], folderUrl: null, error: null, loading: true });
  const [openMonths, setOpenMonths] = useState(() => new Set());
  // Edits from the dropdown rows land on the event itself (its Outcomes tile).
  const setOutcome = (id, patch, msg) => {
    const ev = events.find(e => e.id === id);
    if (!ev || !onUpdateEvent) return;
    onUpdateEvent({ ...ev, outcomes: { hosted_by: "sprout", ...(ev.outcomes || {}), ...patch } });
    showToast?.(msg || "Saved to the event ✓");
  };
  const numBlur = (id, key, current, max, extra) => (e) => {
    const raw = e.target.value.trim();
    const v = raw === "" ? null : Math.max(0, Math.round(Number(raw)));
    if (raw !== "" && !Number.isFinite(v)) { showToast?.("Enter a number", "err"); e.target.value = current ?? ""; return; }
    // Catches a typo before it lands (e.g. 181818): first-timers can't outnumber the room.
    if (v != null && max != null && v > max) { showToast?.(`First-timers can't be more than attendance (${max})`, "err"); e.target.value = current ?? ""; return; }
    if (v !== (current ?? null)) { const more = extra?.(v); setOutcome(id, { [key]: v, ...(more || {}) }, more ? "Marked Rental ✓ and saved the fee" : undefined); }
  };
  const numKey = (e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { e.currentTarget.value = e.currentTarget.defaultValue; e.currentTarget.blur(); } };
  const toggleMonth = (key) => setOpenMonths(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

  useEffect(() => {
    let live = true;
    Promise.all([fetchProgramEntryEventIds(), fetchShowcaseApplications()]).then(([ids, a]) => {
      if (!live) return;
      setProgramIds(ids); setApps(a); setLoaded(true);
    });
    fetchKioskSignins().then(k => { if (live) setKiosk({ ...k, loading: false }); });
    return () => { live = false; };
  }, []);

  const { from, to } = range === "all" ? { from: firstEvent, to: today }
    : range === "3m" ? { from: shiftMonths(today, -2), to: today }
    : range === "year" ? { from: today.slice(0, 4) + "-01-01", to: today }
    : custom;

  const m = useMemo(() => computeGrantMetrics({
    events, contacts, orgs, programEventIds: programIds, applications: apps, signins: kiosk.nights, from, to, today, includePartners: partners,
  }), [events, contacts, orgs, programIds, apps, kiosk.nights, from, to, today, partners]);

  const togglePartners = () => {
    const next = !partners; setPartners(next);
    try { localStorage.setItem(PARTNER_KEY, next ? "1" : "0"); } catch {}
  };

  const copy = async () => {
    const text = metricsToText(m, profile?.legalName || "Sprout Society");
    try { await navigator.clipboard.writeText(text); showToast?.("Numbers copied ✓"); }
    catch { showToast?.("Copy failed. Select the numbers on the page instead.", "err"); }
  };

  const totals = m.months.reduce((t, r) => ({
    events: t.events + r.events, attendance: t.attendance + r.attendance, firstTimers: t.firstTimers + r.firstTimers,
    artists: t.artists + r.artists, dues: t.dues + r.dues, rentals: t.rentals + r.rentals, rentalFees: t.rentalFees + r.rentalFees,
  }), { events: 0, attendance: 0, firstTimers: 0, artists: 0, dues: 0, rentals: 0, rentalFees: 0 });
  const heardMax = m.heard[0]?.n || 1;
  const RANGES = [["all", "All time"], ["year", "This year"], ["3m", "Last 3 months"], ["custom", "Custom"]];

  return (
    <div className="gm">
      <style>{GM_STYLES}</style>
      <div className="gm-top">
        <div>
          <h1>Grant Metrics</h1>
          <p>Proof that people come, come back, and help make the programming. Fill in each event's Outcomes tile and each member's Membership to complete these numbers.</p>
        </div>
        <button className="gm-btn" onClick={copy}>Copy numbers for an application</button>
      </div>

      <div className="gm-bar">
        {RANGES.map(([k, l]) => <button key={k} className="gm-chip" aria-pressed={range === k} onClick={() => setRange(k)}>{l}</button>)}
        {range === "custom" && <>
          <input type="date" className="gm-date" aria-label="From" value={custom.from} onChange={e => setCustom({ ...custom, from: e.target.value })}/>
          <span style={{ fontSize: 12 }}>to</span>
          <input type="date" className="gm-date" aria-label="To" value={custom.to} onChange={e => setCustom({ ...custom, to: e.target.value })}/>
        </>}
        <button className="gm-chip" aria-pressed={partners} onClick={togglePartners}>
          {partners ? "☑" : "☐"} Include partner-hosted events{m.partnerEvents ? ` (${m.partnerEvents})` : ""}
        </button>
      </div>

      {kiosk.error && <div className="gm-warn"><b>Couldn't read the sign-in sheets.</b> Attendance below uses typed headcounts only. ({kiosk.error})</div>}

      {m.missing.length > 0 && (
        <div className="gm-warn">
          <b>{m.missing.length} event{m.missing.length === 1 ? " has" : "s have"} no headcount.</b> No sign-in sheet covers {m.missing.length === 1 ? "it" : "them"} either, so attendance below undercounts until they are filled in. Open one and fill in its Outcomes tile:
          <ul>{m.missing.map(ev => <li key={ev.id}><button onClick={() => openEvent?.({ id: ev.id })}>{ev.name || "(unnamed)"}</button> · {fmtD(ev.date)}</li>)}</ul>
          <div style={{ marginTop: 6 }}>Or type them right here: <button onClick={() => setOpenMonths(new Set(m.months.filter(r => r.missing > 0).map(r => r.key)))}>open those months below</button>.</div>
        </div>
      )}

      {m.events === 0 && m.rentals === 0 ? (
        <div className="gm-card gm-empty">No events in this range. Pick a wider range, or check that past events are marked completed.</div>
      ) : <>
        <div className="gm-kpis">
          <div className="gm-kpi"><b>{m.events}</b><span>Events held</span><small>{partners ? "Sprout + partner" : "Run by Sprout"}</small></div>
          <div className="gm-kpi"><b>{m.attendance.toLocaleString()}</b><span>Total attendance</span><small>{kiosk.loading ? "Reading the sign-in sheets…" : m.missing.length ? `${m.missing.length} events not counted yet` : "Every event counted"}{m.fromSheet.length > 0 && <> · {m.fromSheet.length} from {kiosk.folderUrl ? <a href={kiosk.folderUrl} target="_blank" rel="noopener noreferrer">sign-in sheets</a> : "sign-in sheets"}</>}</small></div>
          <div className="gm-kpi"><b>{m.unique}</b><span>Unique people</span><small>On event lists in the CRM</small></div>
          <div className="gm-kpi"><b>{m.repeatRate}%</b><span>Came back</span><small>{m.repeat} of {m.unique} at 2+ events</small></div>
          <div className="gm-kpi"><b>{m.firstTimers}</b><span>First-timers</span><small>From Outcomes tiles</small></div>
          <div className="gm-kpi"><b>{loaded ? m.artists : "…"}</b><span>Artists featured</span><small>From Program submissions</small></div>
          <div className="gm-kpi"><b>{loaded ? m.applications : "…"}</b><span>Showcase applications</span><small>Through /showcase</small></div>
          <div className="gm-kpi"><b>{m.activeMembers}</b><span>Active members</span><small>{m.activeOrgMembers > 0 && `${m.activeMembers - m.activeOrgMembers} people · ${m.activeOrgMembers} orgs · `}{m.newMembers} joined · {money(m.dues)} dues logged</small></div>
          <div className="gm-kpi"><b>{m.rentals}</b><span>Space rentals</span><small>{money(m.rentalFees)} in fees{m.rentalsUnpaid ? ` · ${m.rentalsUnpaid} unpaid` : ""}</small></div>
        </div>

        <div className="gm-h">By month <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 400 }}>· open a month to see its events</span></div>
        <div className="gm-tw">
          <table className="gm-t">
            <thead><tr><th>Month</th><th>Events</th><th>Attendance</th><th>First-timers</th><th>Artists</th><th>Members</th><th>Dues</th><th>Rentals</th><th>Rental fees</th></tr></thead>
            <tbody>{m.months.map(r => {
              const open = openMonths.has(r.key);
              return [
                <tr key={r.key}>
                  <td>{r.list.length > 0
                    ? <button className="gm-mtog" aria-expanded={open} onClick={() => toggleMonth(r.key)}><i>▸</i>{r.label}</button>
                    : <span style={{ paddingLeft: 16 }}>{r.label}</span>}</td>
                  <td>{r.events}</td>
                  <td>{r.attendance}{r.missing > 0 && <span className="gm-miss">· {r.missing} missing</span>}</td>
                  <td>{r.firstTimers}</td><td>{r.artists}</td><td>{r.members}</td><td>{money(r.dues)}</td><td>{r.rentals}</td><td>{money(r.rentalFees)}</td>
                </tr>,
                ...(open ? r.list.map(ev => (
                  <tr key={r.key + ev.id} className="gm-sub">
                    <td><button onClick={() => openEvent?.({ id: ev.id })}>{ev.name || "(unnamed)"}</button> · {fmtD(ev.date)}</td>
                    <td><select className="gm-sel" aria-label={`Hosted by, ${ev.name}`} value={ev.hosted}
                      onChange={e => setOutcome(ev.id, { hosted_by: e.target.value },
                        e.target.value === "partner" && !partners ? "Marked Partner ✓ (hidden until partner events are included)"
                        : e.target.value === "rental" ? "Marked Rental ✓ (now on the rentals line)" : "Saved to the event ✓")}>
                      <option value="sprout">Sprout</option><option value="partner">Partner</option><option value="rental">Rental</option>
                    </select></td>
                    <td>
                      <input key={ev.id + "hc" + (ev.typed ?? "")} className="gm-in" inputMode="numeric" aria-label={`Headcount, ${ev.name}`}
                        defaultValue={ev.typed ?? ""} placeholder={ev.signins != null && ev.source === "kiosk" ? String(ev.signins) : "—"}
                        title={ev.source === "kiosk" ? "From the sign-in sheets. Type a number to replace it; clear it to go back to sign-ins." : "Type how many people came"}
                        onBlur={numBlur(ev.id, "headcount", ev.typed)} onKeyDown={numKey}/>
                      {ev.source === "kiosk" && <span className="gm-src door">sign-ins</span>}
                      {ev.source === "typed" && <span className="gm-src">typed</span>}
                      {ev.attendance == null && <span className="gm-src miss">missing</span>}</td>
                    <td><input key={ev.id + "ft" + (ev.firstTimers ?? "")} className="gm-in" inputMode="numeric" aria-label={`First-timers, ${ev.name}`}
                      defaultValue={ev.firstTimers ?? ""} placeholder="—" onBlur={numBlur(ev.id, "first_timers", ev.firstTimers, ev.attendance)} onKeyDown={numKey}/></td><td><input key={ev.id + "ar" + (ev.artistsTyped ?? "")} className="gm-in" inputMode="numeric" aria-label={`Artists featured, ${ev.name}`}
                      defaultValue={ev.artistsTyped ?? ""} placeholder={String(ev.artistsProgram || "—")}
                      title="Blank uses Program submissions. Type a number to replace it."
                      onBlur={numBlur(ev.id, "artists", ev.artistsTyped)} onKeyDown={numKey}/></td>
                    <td><input key={ev.id + "ma" + (ev.membersAttended ?? "")} className="gm-in" inputMode="numeric" aria-label={`Members who came, ${ev.name}`}
                      defaultValue={ev.membersAttended ?? ""} placeholder="—" title="Members who came that night"
                      onBlur={numBlur(ev.id, "members_attended", ev.membersAttended, ev.attendance)} onKeyDown={numKey}/></td>
                    <td><input key={ev.id + "dc" + (ev.duesCollected ?? "")} className="gm-in" inputMode="decimal" aria-label={`Dues collected, ${ev.name}`}
                      defaultValue={ev.duesCollected ?? ""} placeholder="$" title="Membership dues taken at the event. Adds to the month's Dues."
                      onBlur={numBlur(ev.id, "dues_collected", ev.duesCollected)} onKeyDown={numKey}/></td>
                    <td><input type="checkbox" className="gm-ck" aria-label={`Rental, ${ev.name}`} checked={ev.hosted === "rental"}
                      onChange={e => setOutcome(ev.id, { hosted_by: e.target.checked ? "rental" : "sprout" },
                        e.target.checked ? "Marked Rental ✓ (add the fee)" : "Marked Sprout ✓")}/></td>
                    <td><input key={ev.id + "rf" + (ev.rentalFeeAny ?? "")} className="gm-in" inputMode="decimal" aria-label={`Rental fee, ${ev.name}`}
                      defaultValue={ev.rentalFeeAny ?? ""} placeholder="$" title="Typing a fee marks the event as a Rental"
                      onBlur={numBlur(ev.id, "rental_fee", ev.rentalFeeAny, null, v => (v > 0 && ev.hosted !== "rental" ? { hosted_by: "rental" } : null))} onKeyDown={numKey}/></td>
                  </tr>)) : []),
              ];
            })}</tbody>
            <tfoot><tr><td>Total</td><td>{totals.events}</td><td>{totals.attendance}</td><td>{totals.firstTimers}</td><td>{totals.artists}</td><td>{m.activeMembers}</td><td>{money(totals.dues)}</td><td>{totals.rentals}</td><td>{money(totals.rentalFees)}</td></tr></tfoot>
          </table>
        </div>

        <div className="gm-two">
          <div className="gm-card">
            <div className="gm-h">In their words</div>
            {m.quotes.length === 0
              ? <div className="gm-empty">No quotes yet. Add one in an event's Outcomes tile when someone says something about the night.</div>
              : m.quotes.map((q, i) => <div key={i} className="gm-q">"{q.text}"<small>{q.event} · {fmtD(q.date)}</small></div>)}
          </div>
          <div className="gm-card">
            <div className="gm-h">How people heard about us</div>
            {m.heard.length === 0
              ? <div className="gm-empty">Nobody in this range has a "how they heard" answer yet.</div>
              : <>{m.heard.map(h => (
                  <div key={h.label} className="gm-hr"><span>{h.label}</span><div className="tr"><i style={{ width: (h.n / heardMax * 100) + "%" }}/></div><b>{h.n}</b></div>
                ))}<div className="gm-empty" style={{ fontSize: 11.5, marginTop: 6 }}>{m.heardTotal} of {m.unique} people answered.</div></>}
          </div>
        </div>
        {m.fromSheet.length > 0 && <p className="gm-empty" style={{ fontSize: 11.5, marginTop: 14 }}>
          Sign-in sheets filled in attendance for {m.fromSheet.map(ev => `${ev.name} (${ev.n})`).join(", ")}. A headcount typed in an event's Outcomes tile always wins, so type one in if more people came than signed in.
          {kiosk.sheets.length > 0 && <> Read from: {kiosk.sheets.map((s, i) => <span key={s.url}>{i > 0 && ", "}<a href={s.url} target="_blank" rel="noopener noreferrer">{s.name}</a></span>)}.</>}
        </p>}
        {m.skippedSeries > 0 && <p className="gm-empty" style={{ fontSize: 11.5, marginTop: 14 }}>{m.skippedSeries} repeating series are left out: one record covers many nights, so it cannot carry one headcount.</p>}
      </>}
    </div>
  );
}
