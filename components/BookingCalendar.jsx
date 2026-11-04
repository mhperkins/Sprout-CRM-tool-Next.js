"use client";

/**
 * BookingCalendar.jsx — the date calendar for /book and the portal's Dates section.
 *
 *   <DatesSection token>    portal: the client's own dates + everyone else's as
 *                           "Unavailable", and a popup to ask for more.
 *   <BookDatesPicker>       /book: the same popup, picking dates before the request exists.
 *
 * Busy times arrive as { date, start, end } in minutes, with no titles. The server
 * re-checks every date, so the checks here are only there to help people pick.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  addDays, weekday, todayNY, earliestDate, latestDate, monthTitle, shortDate, longDate,
  clock, timeRange, toMin, clashesFor, expandRepeat, slotProblem, WEEKDAYS, MAX_SLOTS,
} from "../lib/booking";

export const BK_CSS = `
  .bk-legend { display:flex; flex-wrap:wrap; gap:14px; font-size:12.5px; color:var(--g600); margin:12px 0; }
  .bk-sw { display:inline-block; width:12px; height:12px; border-radius:3px; vertical-align:-2px; margin-right:6px; }
  .bk-sw.mine { background:var(--ink); } .bk-sw.req { border:1.5px dashed var(--ink); background:#fff; } .bk-sw.busy { background:var(--g200); }
  .bk-nav { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
  .bk-mt { font-size:18px; font-weight:900; min-width:150px; }
  .bk-grid { display:grid; grid-template-columns:repeat(7,minmax(0,1fr)); border-top:1px solid var(--g200); border-left:1px solid var(--g200); }
  .bk-dow { font-size:10.5px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--g500); padding:6px; border-right:1px solid var(--g200); border-bottom:1px solid var(--g200); background:var(--paper); }
  .bk-day { min-height:86px; padding:5px; border-right:1px solid var(--g200); border-bottom:1px solid var(--g200); display:flex; flex-direction:column; gap:3px; background:#fff; cursor:pointer; text-align:left; font-family:inherit; border-top:none; border-left:none; min-width:0; }
  .bk-day:hover { background:#fbfbfa; } .bk-day:focus-visible { outline:2px solid var(--cyan); outline-offset:-2px; }
  .bk-day.out { background:var(--paper); cursor:default; } .bk-day.past { opacity:.5; }
  .bk-day.sel { box-shadow:inset 0 0 0 2px var(--ink); }
  .bk-dn { font-size:12px; color:var(--g500); font-variant-numeric:tabular-nums; }
  .bk-dn.today { color:var(--fuchsia); font-weight:900; }
  .bk-blk { font-size:10.5px; line-height:1.25; border-radius:3px; padding:2px 4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-variant-numeric:tabular-nums; }
  .bk-blk.mine { background:var(--ink); color:#fff; } .bk-blk.req { border:1.5px dashed var(--ink); background:#fff; } .bk-blk.busy { background:var(--g200); color:var(--g600); }
  .bk-more { font-size:10.5px; color:var(--g500); }
  .bk-agenda { display:none; flex-direction:column; border-top:1px solid var(--g200); }
  .bk-arow { display:grid; grid-template-columns:54px minmax(0,1fr); gap:10px; padding:9px 4px; border-bottom:1px solid var(--g200); background:none; border-left:none; border-right:none; border-top:none; text-align:left; font-family:inherit; cursor:pointer; }
  .bk-arow .d { font-size:11.5px; color:var(--g500); } .bk-arow .d b { display:block; font-size:17px; color:var(--ink); }
  .bk-arow .bl { display:flex; flex-direction:column; gap:3px; min-width:0; }
  .bk-arow .bk-blk { font-size:12.5px; padding:5px 7px; white-space:normal; }
  .bk-open { font-size:12.5px; color:var(--g500); padding:5px 0; }
  @media (max-width:600px) { .bk-grid { display:none; } .bk-agenda { display:flex; } }
  .bk-panel { border:1px solid var(--g200); border-radius:8px; padding:14px; margin-top:14px; background:#fff; }
  .bk-ph { font-size:15px; font-weight:900; margin-bottom:10px; }
  .bk-slot { display:flex; justify-content:space-between; gap:10px; font-size:13.5px; padding:8px 10px; border-radius:6px; margin-bottom:6px; align-items:center; }
  .bk-slot.mine { background:var(--ink); color:#fff; } .bk-slot.req { border:1.5px dashed var(--ink); } .bk-slot.busy { background:var(--g100); color:var(--g600); }
  .bk-list { display:flex; flex-direction:column; }
  .bk-lrow { display:flex; gap:10px; align-items:center; flex-wrap:wrap; font-size:14px; padding:9px 0; border-bottom:1px solid var(--g100); font-variant-numeric:tabular-nums; }
  .bk-lrow .when { flex:1 1 200px; min-width:0; }
  .bk-tag { font-size:11px; font-weight:700; border-radius:999px; padding:2px 9px; border:1.5px solid currentColor; white-space:nowrap; }
  .bk-tag.ok { color:#4f6b00; } .bk-tag.wait { color:var(--g600); } .bk-tag.no { color:var(--fuchsia); }
  .bk-modal-bg { position:fixed; inset:0; background:rgba(3,0,0,.45); z-index:100; display:flex; align-items:flex-start; justify-content:center; overflow:auto;
    padding:max(24px, env(safe-area-inset-top, 0px)) max(12px, env(safe-area-inset-right, 0px)) 24px max(12px, env(safe-area-inset-left, 0px)); }
  .bk-modal { background:#fff; border-radius:12px; width:100%; max-width:780px; padding:22px; box-shadow:0 20px 60px rgba(0,0,0,.25); }
  .bk-mgrid { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:20px; }
  @media (max-width:680px) { .bk-mgrid { grid-template-columns:minmax(0,1fr); } .bk-modal { padding:16px; } }
  .bk-gen { border:1px solid var(--g200); border-radius:8px; max-height:300px; overflow:auto; padding:6px 10px; }
  .bk-gen label, .bk-gen div.row { display:flex; gap:10px; align-items:center; font-size:13.5px; padding:6px 0; border-bottom:1px solid var(--g100); font-variant-numeric:tabular-nums; }
  .bk-gen input { width:17px; height:17px; accent-color:var(--ink); }
  .bk-gen .taken { color:var(--fuchsia); }
  .bk-radio { display:flex; flex-direction:column; gap:6px; font-size:14.5px; }
  .bk-radio label { display:flex; gap:8px; align-items:center; cursor:pointer; }
  .bk-radio input { accent-color:var(--ink); width:17px; height:17px; }
  .bk-summary { display:flex; gap:10px; align-items:center; flex-wrap:wrap; border:1.5px solid var(--g200); border-radius:8px; padding:10px 12px; font-size:14px; }
`;

const ym = (iso) => iso.slice(0, 7);
const monthStart = (m) => `${m}-01`;
const monthEnd = (m) => addDays(`${ym(addDays(`${m}-28`, 7))}-01`, -1);
const shiftMonth = (m, n) => { const [y, mo] = m.split("-").map(Number); const d = new Date(Date.UTC(y, mo - 1 + n, 1)); return d.toISOString().slice(0, 7); };
const byTime = (a, b) => a.start - b.start;

/** Everything on one day, merged and sorted, for the cell, the agenda and the panel. */
function dayItems(date, busy, mine) {
  const own = (mine || []).filter((s) => s.date === date && (s.status === "confirmed" || s.status === "requested"))
    .map((s) => ({ kind: s.status === "confirmed" ? "mine" : "req", start: toMin(s.start_time), end: toMin(s.end_time), slot: s }));
  const other = (busy || []).filter((b) => b.date === date).map((b) => ({ kind: "busy", start: b.start, end: b.end }));
  return [...own, ...other].sort(byTime);
}
const itemText = (it, short) => {
  const t = `${clock(it.start)}${short ? "–" : " to "}${clock(it.end)}`;
  if (it.kind === "busy") return short ? t : `${t}`;
  return t;
};
const itemLabel = (it) => (it.kind === "busy" ? "Unavailable" : it.kind === "mine" ? "Yours, confirmed" : "Yours, waiting for Sprout");

function Legend({ withMine }) {
  return (
    <div className="bk-legend">
      {withMine && <span><i className="bk-sw mine" />Yours, confirmed</span>}
      {withMine && <span><i className="bk-sw req" />Yours, waiting for Sprout</span>}
      <span><i className="bk-sw busy" />Unavailable</span>
      <span>Blank = open</span>
    </div>
  );
}

/** Month grid (agenda list on phones). */
export function MonthView({ month, setMonth, busy, mine, selected, onSelect, loading, withMine }) {
  const today = todayNY();
  const first = monthStart(month);
  const gridStart = addDays(first, -weekday(first));
  const last = monthEnd(month);
  const cells = [];
  for (let d = gridStart; cells.length < 42 && (d <= last || cells.length % 7); d = addDays(d, 1)) cells.push(d);
  const inMonth = cells.filter((d) => ym(d) === month);
  const canBack = month > ym(today);
  const canFwd = month < ym(latestDate(today));

  return (
    <div>
      <div className="bk-nav">
        <button type="button" className="pt-btn pt-btn-2 pt-btn-sm" disabled={!canBack} onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">‹</button>
        <div className="bk-mt">{monthTitle(month)}</div>
        <button type="button" className="pt-btn pt-btn-2 pt-btn-sm" disabled={!canFwd} onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Next month">›</button>
        {loading && <span className="pt-help" style={{ margin: 0 }}>Loading…</span>}
      </div>
      <Legend withMine={withMine} />
      <div className="bk-grid" role="grid" aria-label={monthTitle(month)}>
        {WEEKDAYS.map((w) => <div key={w} className="bk-dow">{w}</div>)}
        {cells.map((d) => {
          if (ym(d) !== month) return <div key={d} className="bk-day out" />;
          const items = dayItems(d, busy, mine);
          return (
            <button type="button" key={d} className={`bk-day${d < today ? " past" : ""}${selected === d ? " sel" : ""}`}
              onClick={() => onSelect(d)} aria-label={`${longDate(d)}${items.length ? `, ${items.length} booked` : ", open"}`}>
              <span className={`bk-dn${d === today ? " today" : ""}`}>{Number(d.slice(8))}</span>
              {items.slice(0, 3).map((it, i) => (
                <span key={i} className={`bk-blk ${it.kind}`}>{itemText(it, true)}</span>
              ))}
              {items.length > 3 && <span className="bk-more">+{items.length - 3} more</span>}
            </button>
          );
        })}
      </div>
      <div className="bk-agenda">
        {inMonth.filter((d) => d >= today || ym(today) !== month).map((d) => {
          const items = dayItems(d, busy, mine);
          return (
            <button type="button" key={d} className="bk-arow" onClick={() => onSelect(d)}>
              <div className="d">{WEEKDAYS[weekday(d)]}<b>{Number(d.slice(8))}</b></div>
              <div className="bl">
                {items.length ? items.map((it, i) => (
                  <span key={i} className={`bk-blk ${it.kind}`}>{itemText(it)} · {itemLabel(it)}</span>
                )) : <span className="bk-open">Open</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** What's on one day, with open gaps between 9am and midnight. */
function DayPanel({ date, busy, mine, onRequest, onCancel, busyId }) {
  const items = dayItems(date, busy, mine);
  const rows = [];
  let cursor = 9 * 60;
  for (const it of items) {
    if (it.end <= cursor) { rows.push(it); continue; }
    if (it.start > cursor) rows.push({ kind: "open", start: cursor, end: it.start });
    rows.push(it);
    cursor = Math.max(cursor, it.end);
  }
  if (cursor < 24 * 60) rows.push({ kind: "open", start: cursor, end: 24 * 60 });
  const bookable = date >= earliestDate() && date <= latestDate();
  return (
    <div className="bk-panel" id="bk-daypanel">
      <div className="bk-ph">{longDate(date)}</div>
      {rows.map((r, i) => r.kind === "open" ? (
        <div key={i} className="bk-slot" style={{ border: "1px solid var(--g200)" }}><span>{timeRange(r.start, r.end)}</span><span>Open</span></div>
      ) : (
        <div key={i} className={`bk-slot ${r.kind}`}>
          <span>{timeRange(r.start, r.end)}</span>
          <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {itemLabel(r)}
            {r.kind === "req" && onCancel && (
              <button type="button" className="pt-btn-lnk" disabled={busyId === r.slot.id} onClick={() => onCancel(r.slot)}>Withdraw</button>
            )}
          </span>
        </div>
      ))}
      {bookable
        ? <button type="button" className="pt-btn pt-btn-sm" style={{ marginTop: 6 }} onClick={() => onRequest(date)}>Ask for this date</button>
        : <p className="pt-help">{date < earliestDate() ? "Dates need at least 3 days' notice." : "We book up to about three months ahead."}</p>}
    </div>
  );
}

/**
 * The popup for picking dates. `loadBusy(from,to)` returns busy blocks; `mine` are
 * the client's own slots so they can't ask twice. `onDone(slots, note)` gets the checked dates.
 */
export function PickDatesModal({ initialDate, loadBusy, mine = [], onClose, onDone, doneLabel = "Use these dates", sending = false, error = "", initial }) {
  const start0 = initialDate && initialDate >= earliestDate() ? initialDate : earliestDate();
  const [first, setFirst] = useState(initial?.first || start0);
  const [start, setStart] = useState(initial?.start || "18:00");
  const [end, setEnd] = useState(initial?.end || "22:00");
  const [repeat, setRepeat] = useState(initial?.repeat ?? false);
  const [days, setDays] = useState(initial?.days || [weekday(start0)]);
  const [until, setUntil] = useState(initial?.until || addDays(start0, 27));
  const [note, setNote] = useState(initial?.note || "");
  const [busy, setBusy] = useState([]);
  const [loadErr, setLoadErr] = useState("");
  const [unchecked, setUnchecked] = useState({});

  const list = useMemo(() => expandRepeat({ first, until, weekdays: repeat ? days : null, start, end }), [first, until, repeat, days, start, end]);
  const lastDate = list.length ? list[list.length - 1].date : first;

  useEffect(() => {
    let alive = true;
    if (!first) return;
    setLoadErr("");
    loadBusy(first, lastDate > first ? lastDate : first).then((b) => { if (alive) setBusy(b); }).catch((e) => { if (alive) setLoadErr(e.message); });
    return () => { alive = false; };
  }, [first, lastDate, loadBusy]);

  useEffect(() => { if (!repeat) return; if (!days.length) setDays([weekday(first)]); }, [repeat]); // eslint-disable-line

  const ownBlocks = mine.filter((s) => s.status === "requested" || s.status === "confirmed")
    .map((s) => ({ date: s.date, start: toMin(s.start_time), end: toMin(s.end_time) }));
  const rows = list.map((s) => {
    const shape = slotProblem(s);
    const taken = !shape && clashesFor(s, busy)[0];
    const already = !shape && !taken && clashesFor(s, ownBlocks)[0];
    const why = shape || (taken ? `Taken ${timeRange(taken.start, taken.end)}` : already ? "You already have this" : "");
    return { ...s, why };
  });
  const chosen = rows.filter((r) => !r.why && !unchecked[r.date]);
  const timeErr = toMin(end) != null && toMin(start) != null && toMin(end) <= toMin(start) ? "The end time has to be after the start time." : "";

  const toggleDay = (d) => setDays((x) => (x.includes(d) ? x.filter((y) => y !== d) : [...x, d].sort()));

  return (
    <div className="bk-modal-bg" role="dialog" aria-modal="true" aria-label="Pick dates" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bk-modal">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <div className="pt-sec-ttl">Pick dates</div>
          <button type="button" className="pt-btn pt-btn-2 pt-btn-sm" onClick={onClose}>Close</button>
        </div>
        <div className="bk-mgrid">
          <div>
            <div className="pt-row">
              <div className="pt-fg"><label className="pt-lbl" htmlFor="bk-first">First date</label>
                <input id="bk-first" className="pt-in" type="date" value={first} min={earliestDate()} max={latestDate()} onChange={(e) => { setFirst(e.target.value); setUnchecked({}); }} /></div>
            </div>
            <div className="pt-row">
              <div className="pt-fg"><label className="pt-lbl" htmlFor="bk-start">Start</label>
                <input id="bk-start" className="pt-in" type="time" step="900" value={start} onChange={(e) => setStart(e.target.value)} /></div>
              <div className="pt-fg"><label className="pt-lbl" htmlFor="bk-end">End</label>
                <input id="bk-end" className="pt-in" type="time" step="900" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
            </div>
            <p className="pt-help" style={{ marginTop: -8, marginBottom: 14 }}>Include setup and cleanup time.</p>
            <div className="pt-fg">
              <span className="pt-lbl">Repeat</span>
              <div className="bk-radio">
                <label><input type="radio" name="bk-rep" checked={!repeat} onChange={() => setRepeat(false)} /> Just this date</label>
                <label><input type="radio" name="bk-rep" checked={repeat} onChange={() => setRepeat(true)} /> Every week on these days</label>
              </div>
            </div>
            {repeat && <>
              <div className="pt-chips" style={{ marginBottom: 14 }}>
                {WEEKDAYS.map((w, i) => (
                  <button type="button" key={w} className={`pt-chip${days.includes(i) ? " on" : ""}`} aria-pressed={days.includes(i)} onClick={() => toggleDay(i)}>{w}</button>
                ))}
              </div>
              <div className="pt-fg"><label className="pt-lbl" htmlFor="bk-until">Until</label>
                <input id="bk-until" className="pt-in" type="date" value={until} min={first} max={latestDate()} onChange={(e) => setUntil(e.target.value)} /></div>
            </>}
            <div className="pt-fg"><label className="pt-lbl" htmlFor="bk-note">Anything we should know (optional)</label>
              <textarea id="bk-note" className="pt-ta" style={{ minHeight: 70 }} value={note} onChange={(e) => setNote(e.target.value)} /></div>
          </div>
          <div>
            <div className="pt-lbl">{rows.length} date{rows.length === 1 ? "" : "s"}</div>
            <p className="pt-help" style={{ marginBottom: 8 }}>Uncheck any you don't want. Taken times can't be picked.{rows.length >= MAX_SLOTS ? ` Up to ${MAX_SLOTS} at a time.` : ""}</p>
            {loadErr && <div className="pt-err">{loadErr}</div>}
            {timeErr ? <div className="pt-err">{timeErr}</div> : (
              <div className="bk-gen">
                {rows.map((r) => r.why ? (
                  <div className="row taken" key={r.date}><input type="checkbox" disabled aria-label={shortDate(r.date)} /> {shortDate(r.date)} <span className="bk-tag no">{r.why}</span></div>
                ) : (
                  <label key={r.date}>
                    <input type="checkbox" checked={!unchecked[r.date]} onChange={() => setUnchecked((u) => ({ ...u, [r.date]: !u[r.date] }))} />
                    {shortDate(r.date)} · {timeRange(start, end)}
                  </label>
                ))}
              </div>
            )}
            {error && <div className="pt-err" style={{ marginTop: 12 }}>{error}</div>}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
              <b style={{ fontSize: 14 }}>{chosen.length} date{chosen.length === 1 ? "" : "s"} picked</b>
              <button type="button" className="pt-btn" disabled={!chosen.length || !!timeErr || sending}
                onClick={() => onDone(chosen.map(({ date, start: s, end: e }) => ({ date, start: s, end: e })), note, { first, start, end, repeat, days, until, note })}>
                {sending ? "Sending…" : doneLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const fetchJSON = async (url, opts) => {
  const r = await fetch(url, { cache: "no-store", ...opts });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.error || "Something went wrong. Please try again."); e.data = j; throw e; }
  return j;
};

const STATUS_TAG = { confirmed: ["ok", "Confirmed"], requested: ["wait", "Waiting for Sprout"], declined: ["no", "Declined"] };

/** The portal's Dates section. */
export function DatesSection({ token }) {
  const [month, setMonth] = useState(() => ym(todayNY()));
  const [mine, setMine] = useState([]);
  const [busy, setBusy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [selected, setSelected] = useState("");
  const [modal, setModal] = useState(null);      // { date }
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState("");
  const [toast, setToast] = useState("");
  const [busyId, setBusyId] = useState("");
  const [showPast, setShowPast] = useState(false);

  const loadBusy = useCallback(async (from, to) => (await fetchJSON(`/api/portal/${token}/slots?from=${from}&to=${to}`)).busy || [], [token]);

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const j = await fetchJSON(`/api/portal/${token}/slots?from=${monthStart(month)}&to=${monthEnd(month)}`);
      setMine(j.mine || []); setBusy(j.busy || []);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  }, [token, month]);
  useEffect(() => { load(); }, [load]);
  // On a phone the day list is long, so bring the picked day's details into view.
  useEffect(() => {
    if (selected) document.getElementById("bk-daypanel")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selected]);

  const send = async (slots, note) => {
    setSending(true); setSendErr("");
    try {
      const j = await fetchJSON(`/api/portal/${token}/slots`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slots, note }) });
      setModal(null);
      const n = j.created?.length || 0;
      setToast(`Request sent for ${n} date${n === 1 ? "" : "s"}.${j.rejected?.length ? ` ${j.rejected.length} couldn't be added because the time is taken.` : ""} We'll confirm by email.`);
      await load();
    } catch (e) { setSendErr(e.message); }
    setSending(false);
  };

  const cancel = async (slot) => {
    setBusyId(slot.id); setErr("");
    try {
      await fetchJSON(`/api/portal/${token}/slots`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: slot.id }) });
      setToast(`Withdrew ${shortDate(slot.date)}.`);
      await load();
    } catch (e) { setErr(e.message); }
    setBusyId("");
  };

  const today = todayNY();
  const upcoming = mine.filter((s) => s.date >= today);
  const past = mine.filter((s) => s.date < today && s.status === "confirmed");
  const listed = showPast ? [...past, ...upcoming] : upcoming;

  return (
    <div>
      <style>{BK_CSS}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 6 }}>
        <p className="pt-sec-blurb" style={{ margin: 0 }}>Your dates with us. Grey times are taken by someone else.</p>
        <button type="button" className="pt-btn pt-btn-sm" onClick={() => { setSendErr(""); setModal({ date: selected || "" }); }}>+ Ask for dates</button>
      </div>
      {toast && <div className="pt-note pt-good" style={{ marginTop: 14, marginBottom: 0 }} role="status">✓ {toast}</div>}
      {err && <div className="pt-err" style={{ marginTop: 14 }}>{err}</div>}

      {!loading && !mine.length && (
        <div className="pt-note" style={{ marginTop: 14 }}>
          <strong>Ready to pick your dates?</strong> Choose an open day below, or tap Ask for dates. Save this link: it's how you book with us from now on.
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <MonthView month={month} setMonth={setMonth} busy={busy} mine={mine} selected={selected} onSelect={setSelected} loading={loading} withMine />
      </div>
      {selected && <DayPanel date={selected} busy={busy} mine={mine} busyId={busyId} onCancel={cancel} onRequest={(d) => { setSendErr(""); setModal({ date: d }); }} />}

      {mine.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div className="pt-lbl" style={{ margin: 0 }}>Your dates</div>
            {past.length > 0 && <button type="button" className="pt-btn-lnk" onClick={() => setShowPast((x) => !x)}>{showPast ? "Hide past dates" : `Show past dates (${past.length})`}</button>}
          </div>
          <div className="bk-list">
            {listed.map((s) => {
              const [cls, label] = STATUS_TAG[s.status] || ["wait", s.status];
              return (
                <div className="bk-lrow" key={s.id}>
                  <span className="when">{shortDate(s.date)} · {timeRange(s.start_time, s.end_time)}</span>
                  <span className={`bk-tag ${cls}`}>{label}</span>
                  {s.status === "requested" && <button type="button" className="pt-btn-lnk" disabled={busyId === s.id} onClick={() => cancel(s)}>Withdraw</button>}
                  {s.status === "declined" && s.decline_reason && <span className="pt-help" style={{ flexBasis: "100%", margin: 0 }}>{s.decline_reason}</span>}
                </div>
              );
            })}
            {!listed.length && <p className="pt-help">No upcoming dates.</p>}
          </div>
        </div>
      )}

      {modal && <PickDatesModal initialDate={modal.date} loadBusy={loadBusy} mine={mine} onClose={() => setModal(null)}
        onDone={(slots, note) => send(slots, note)} doneLabel="Send request" sending={sending} error={sendErr} />}
    </div>
  );
}

/** /book: "Do you know your dates?" plus the picker. value = { known:bool|null, slots:[], note, form } */
export function BookDatesPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const loadBusy = useCallback(async (from, to) => (await fetchJSON(`/api/availability?from=${from}&to=${to}`)).busy || [], []);
  const v = value || { known: null, slots: [] };
  const slots = v.slots || [];
  const sorted = slots.slice().sort((a, b) => a.date.localeCompare(b.date));
  const summary = sorted.length
    ? `${sorted.length} date${sorted.length === 1 ? "" : "s"} · ${shortDate(sorted[0].date)}${sorted.length > 1 ? ` to ${shortDate(sorted[sorted.length - 1].date)}` : ""} · ${timeRange(sorted[0].start, sorted[0].end)}`
    : "";
  return (
    <div className="pt-fg">
      <style>{BK_CSS}</style>
      <span className="pt-lbl">Do you know your dates?</span>
      <div className="bk-radio" style={{ marginBottom: 12 }}>
        <label><input type="radio" name="bk-known" checked={v.known === true} onChange={() => { onChange({ ...v, known: true }); if (!slots.length) setOpen(true); }} /> Yes, pick them on our calendar</label>
        <label><input type="radio" name="bk-known" checked={v.known === false} onChange={() => onChange({ ...v, known: false })} /> Not yet</label>
      </div>
      {v.known === true && (slots.length ? (
        <div className="bk-summary">
          <span style={{ flex: "1 1 220px" }}>{summary}</span>
          <button type="button" className="pt-btn pt-btn-2 pt-btn-sm" onClick={() => setOpen(true)}>Edit dates</button>
        </div>
      ) : (
        <button type="button" className="pt-btn pt-btn-2 pt-btn-sm" onClick={() => setOpen(true)}>Pick dates on our calendar</button>
      ))}
      {v.known === false && <p className="pt-help">No problem. After you send this, you'll get a private link where you can pick dates whenever you're ready.</p>}
      {open && <PickDatesModal loadBusy={loadBusy} initial={v.form} onClose={() => setOpen(false)}
        onDone={(picked, note, form) => { onChange({ known: true, slots: picked, note, form }); setOpen(false); }} />}
    </div>
  );
}
