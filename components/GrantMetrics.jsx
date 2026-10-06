"use client";

/**
 * GrantMetrics.jsx — proof-of-concept numbers for grant applications.
 *
 * Reads only: events (Outcomes tile), contacts + orgs (Membership section), program
 * submissions, showcase applications and the front-door kiosk sign-in sheet
 * (attendance for any event whose headcount is blank). The math lives in lib/grantMetrics.js.
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
`;

const money = (n) => "$" + Math.round(n || 0).toLocaleString();
const fmtD = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
const localToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const shiftMonths = (iso, n) => { const d = new Date(iso + "T12:00:00"); d.setMonth(d.getMonth() + n); d.setDate(1); return d.toISOString().slice(0, 10); };
const PARTNER_KEY = "sprout_gm_partners";

export default function GrantMetrics({ events = [], contacts = [], orgs = [], profile, openEvent, showToast }) {
  const today = localToday();
  const firstEvent = useMemo(() => events.map(e => e.event_date).filter(Boolean).sort()[0] || today.slice(0, 4) + "-01-01", [events, today]);
  const [range, setRange] = useState("all");
  const [custom, setCustom] = useState({ from: shiftMonths(today, -3), to: today });
  const [partners, setPartners] = useState(() => { try { return localStorage.getItem(PARTNER_KEY) === "1"; } catch { return false; } });
  const [programIds, setProgramIds] = useState([]);
  const [apps, setApps] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [kiosk, setKiosk] = useState({ nights: {}, sheetUrl: null, error: null, loading: true });

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

      {kiosk.error && <div className="gm-warn"><b>Couldn't read the sign-in sheet.</b> Attendance below uses typed headcounts only. ({kiosk.error})</div>}

      {m.missing.length > 0 && (
        <div className="gm-warn">
          <b>{m.missing.length} event{m.missing.length === 1 ? " has" : "s have"} no headcount.</b> No door sign-ins match {m.missing.length === 1 ? "it" : "them"} either, so attendance below undercounts until they are filled in. Open one and fill in its Outcomes tile:
          <ul>{m.missing.map(ev => <li key={ev.id}><button onClick={() => openEvent?.({ id: ev.id })}>{ev.name || "(unnamed)"}</button> · {fmtD(ev.date)}</li>)}</ul>
        </div>
      )}

      {m.events === 0 && m.rentals === 0 ? (
        <div className="gm-card gm-empty">No events in this range. Pick a wider range, or check that past events are marked completed.</div>
      ) : <>
        <div className="gm-kpis">
          <div className="gm-kpi"><b>{m.events}</b><span>Events held</span><small>{partners ? "Sprout + partner" : "Run by Sprout"}</small></div>
          <div className="gm-kpi"><b>{m.attendance.toLocaleString()}</b><span>Total attendance</span><small>{kiosk.loading ? "Reading the sign-in sheet…" : m.missing.length ? `${m.missing.length} events not counted yet` : "Every event counted"}{m.fromSheet.length > 0 && <> · {m.fromSheet.length} from {kiosk.sheetUrl ? <a href={kiosk.sheetUrl} target="_blank" rel="noopener noreferrer">door sign-ins</a> : "door sign-ins"}</>}</small></div>
          <div className="gm-kpi"><b>{m.unique}</b><span>Unique people</span><small>On event lists in the CRM</small></div>
          <div className="gm-kpi"><b>{m.repeatRate}%</b><span>Came back</span><small>{m.repeat} of {m.unique} at 2+ events</small></div>
          <div className="gm-kpi"><b>{m.firstTimers}</b><span>First-timers</span><small>From Outcomes tiles</small></div>
          <div className="gm-kpi"><b>{loaded ? m.artists : "…"}</b><span>Artists featured</span><small>From Program submissions</small></div>
          <div className="gm-kpi"><b>{loaded ? m.applications : "…"}</b><span>Showcase applications</span><small>Through /showcase</small></div>
          <div className="gm-kpi"><b>{m.activeMembers}</b><span>Active members</span><small>{m.activeOrgMembers > 0 && `${m.activeMembers - m.activeOrgMembers} people · ${m.activeOrgMembers} orgs · `}{m.newMembers} joined · {money(m.dues)} dues logged</small></div>
          <div className="gm-kpi"><b>{m.rentals}</b><span>Space rentals</span><small>{money(m.rentalFees)} in fees{m.rentalsUnpaid ? ` · ${m.rentalsUnpaid} unpaid` : ""}</small></div>
        </div>

        <div className="gm-h">By month</div>
        <div className="gm-tw">
          <table className="gm-t">
            <thead><tr><th>Month</th><th>Events</th><th>Attendance</th><th>First-timers</th><th>Artists</th><th>Members</th><th>Dues</th><th>Rentals</th><th>Rental fees</th></tr></thead>
            <tbody>{m.months.map(r => (
              <tr key={r.key}>
                <td>{r.label}</td><td>{r.events}</td>
                <td>{r.attendance}{r.missing > 0 && <span className="gm-miss">· {r.missing} missing</span>}</td>
                <td>{r.firstTimers}</td><td>{r.artists}</td><td>{r.members}</td><td>{money(r.dues)}</td><td>{r.rentals}</td><td>{money(r.rentalFees)}</td>
              </tr>))}</tbody>
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
          Door sign-ins filled in attendance for {m.fromSheet.map(ev => `${ev.name} (${ev.n})`).join(", ")}. A headcount typed in an event's Outcomes tile always wins, so type one in if more people came than signed in.
        </p>}
        {m.skippedSeries > 0 && <p className="gm-empty" style={{ fontSize: 11.5, marginTop: 14 }}>{m.skippedSeries} repeating series are left out: one record covers many nights, so it cannot carry one headcount.</p>}
      </>}
    </div>
  );
}
