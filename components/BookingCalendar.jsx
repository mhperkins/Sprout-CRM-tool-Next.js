"use client";

/**
 * BookingCalendar.jsx — the date calendar for /book and the portal's "Your dates" section.
 *
 *   <DatesSection token>    portal: the client's own dates + everyone else's as
 *                           "Unavailable". Clicking a day or "Ask for dates" opens the picker.
 *   <BookDatesPicker>       /book: the same picker, before the request exists.
 *   <PickDatesModal>        the picker: a month calendar where you click days on and off,
 *                           one time range for every picked day, and per-day edits.
 *
 * Busy times arrive as { date, start, end } in minutes, with no titles. The server
 * re-checks every date, so the checks here are only there to help people pick.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  addDays, weekday, todayNY, earliestDate, latestDate, monthTitle, shortDate, longDate,
  clock, timeRange, toMin, endMin, clashesFor, slotProblem, WEEKDAYS, MAX_SLOTS, NOTICE_DAYS,
} from "../lib/booking";

export const BK_CSS = `
  .bk-legend { display:flex; flex-wrap:wrap; gap:14px; font-size:12.5px; color:var(--g600); margin:12px 0; }
  .bk-sw { display:inline-block; width:12px; height:12px; border-radius:3px; vertical-align:-2px; margin-right:6px; }
  .bk-sw.mine { background:var(--ink); } .bk-sw.req { border:1.5px dashed var(--ink); background:#fff; } .bk-sw.busy { background:var(--g200); }
  .bk-sw.pick { background:#fff; box-shadow:inset 0 0 0 2px var(--fuchsia); }
  .bk-nav { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
  .bk-mt { font-size:18px; font-weight:900; min-width:150px; }
  .bk-grid { display:grid; grid-template-columns:repeat(7,minmax(0,1fr)); border-top:1px solid var(--g200); border-left:1px solid var(--g200); }
  .bk-dow { font-size:10.5px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--g500); padding:6px; border-right:1px solid var(--g200); border-bottom:1px solid var(--g200); background:var(--paper); }
  .bk-day { min-height:86px; padding:5px; border-right:1px solid var(--g200); border-bottom:1px solid var(--g200); display:flex; flex-direction:column; gap:3px; background:#fff; cursor:pointer; text-align:left; font-family:inherit; color:var(--ink); border-top:none; border-left:none; min-width:0; position:relative; }
  .bk-day:hover { background:#fbfbfa; } .bk-day:focus-visible { outline:2px solid var(--cyan); outline-offset:-2px; }
  .bk-day.out { background:var(--paper); cursor:default; } .bk-day.past, .bk-day.off { opacity:.45; cursor:default; }
  .bk-day.picked { box-shadow:inset 0 0 0 2.5px var(--fuchsia); background:#fff5fb; }
  .bk-day.picked .bk-dn::after { content:" ✓"; color:var(--fuchsia); font-weight:900; }
  .bk-dn { font-size:12px; color:var(--g500); font-variant-numeric:tabular-nums; }
  .bk-dn.today { color:var(--fuchsia); font-weight:900; }
  .bk-blk { font-size:10.5px; line-height:1.25; border-radius:3px; padding:2px 4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-variant-numeric:tabular-nums; }
  .bk-blk.mine { background:var(--ink); color:#fff; } .bk-blk.req { border:1.5px dashed var(--ink); background:#fff; } .bk-blk.busy { background:var(--g200); color:var(--g600); }
  .bk-more { font-size:10.5px; color:var(--g500); }
  .bk-agenda { display:none; flex-direction:column; border-top:1px solid var(--g200); }
  .bk-arow { display:grid; grid-template-columns:54px minmax(0,1fr); gap:10px; padding:9px 4px; border-bottom:1px solid var(--g200); background:#fff; border-left:none; border-right:none; border-top:none; text-align:left; font-family:inherit; color:var(--ink); cursor:pointer; }
  .bk-arow.picked { box-shadow:inset 3px 0 0 var(--fuchsia); background:#fff5fb; }
  .bk-arow.off { opacity:.45; cursor:default; }
  .bk-arow .d { font-size:11.5px; color:var(--g500); } .bk-arow .d b { display:block; font-size:17px; color:var(--ink); }
  .bk-arow.picked .d b::after { content:" ✓"; color:var(--fuchsia); }
  .bk-arow .bl { display:flex; flex-direction:column; gap:3px; min-width:0; }
  .bk-arow .bk-blk { font-size:12.5px; padding:5px 7px; white-space:normal; }
  .bk-open { font-size:12.5px; color:var(--g500); padding:5px 0; }
  @media (max-width:600px) { .bk-grid { display:none; } .bk-agenda { display:flex; } }
  .bk-list { display:flex; flex-direction:column; }
  .bk-lrow { display:flex; gap:10px; align-items:center; flex-wrap:wrap; font-size:14px; padding:9px 0; border-bottom:1px solid var(--g100); font-variant-numeric:tabular-nums; }
  .bk-lrow .when { flex:1 1 200px; min-width:0; }
  .bk-tag { font-size:11px; font-weight:700; border-radius:999px; padding:2px 9px; border:1.5px solid currentColor; white-space:nowrap; }
  .bk-tag.ok { color:#4f6b00; } .bk-tag.wait { color:var(--g600); } .bk-tag.no { color:var(--fuchsia); }
  .bk-modal-bg { position:fixed; inset:0; background:rgba(3,0,0,.45); z-index:100; display:flex; align-items:flex-start; justify-content:center; overflow:auto;
    padding:max(24px, env(safe-area-inset-top, 0px)) max(12px, env(safe-area-inset-right, 0px)) 24px max(12px, env(safe-area-inset-left, 0px)); }
  .bk-modal { background:#fff; border-radius:12px; width:100%; max-width:1040px; padding:22px; box-shadow:0 20px 60px rgba(0,0,0,.25); color:var(--ink); }
  .bk-mgrid { display:grid; grid-template-columns:minmax(0,1.5fr) minmax(0,1fr); gap:22px; align-items:start; }
  @media (max-width:820px) { .bk-mgrid { grid-template-columns:minmax(0,1fr); } .bk-modal { padding:16px; } }
  .bk-side { border:1px solid var(--g200); border-radius:10px; padding:14px; display:flex; flex-direction:column; gap:12px; background:var(--paper); }
  .bk-times { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
  .bk-times input { width:auto; flex:1 1 120px; }
  .bk-picks { display:flex; flex-direction:column; gap:6px; max-height:340px; overflow:auto; }
  .bk-pick { background:#fff; border:1px solid var(--g200); border-radius:8px; padding:8px 10px; font-size:13.5px; display:flex; flex-direction:column; gap:6px; font-variant-numeric:tabular-nums; }
  .bk-pick.bad { border-color:var(--fuchsia); }
  .bk-pick-row { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
  .bk-pick-row .when { flex:1 1 150px; min-width:0; font-weight:700; }
  .bk-pick .why { font-size:12px; color:var(--fuchsia); }
  .bk-pick .taken { font-size:12px; color:var(--g500); }
  .bk-summary { display:flex; gap:10px; align-items:center; flex-wrap:wrap; border:1.5px solid var(--g200); border-radius:8px; padding:10px 12px; font-size:14px; }
  .bk-radio { display:flex; flex-direction:column; gap:6px; font-size:14.5px; }
  .bk-radio label { display:flex; gap:8px; align-items:center; cursor:pointer; }
  .bk-radio input { accent-color:var(--ink); width:17px; height:17px; }
`;

const ym = (iso) => iso.slice(0, 7);
const monthStart = (m) => `${m}-01`;
const monthEnd = (m) => addDays(`${ym(addDays(`${m}-28`, 7))}-01`, -1);
const shiftMonth = (m, n) => { const [y, mo] = m.split("-").map(Number); const d = new Date(Date.UTC(y, mo - 1 + n, 1)); return d.toISOString().slice(0, 7); };
const byTime = (a, b) => a.start - b.start;
const bookable = (d) => d >= earliestDate() && d <= latestDate();

/** Everything on one day, merged and sorted, for the cell, the agenda and the picker. */
function dayItems(date, busy, mine) {
  const own = (mine || []).filter((s) => s.date === date && (s.status === "confirmed" || s.status === "requested"))
    .map((s) => ({ kind: s.status === "confirmed" ? "mine" : "req", start: toMin(s.start_time), end: endMin(s.end_time), slot: s }));
  const other = (busy || []).filter((b) => b.date === date).map((b) => ({ kind: "busy", start: b.start, end: b.end }));
  return [...own, ...other].sort(byTime);
}
const itemText = (it, short) => `${clock(it.start)}${short ? "–" : " to "}${clock(it.end)}`;
const itemLabel = (it) => (it.kind === "busy" ? "Unavailable" : it.kind === "mine" ? "Yours, confirmed" : "Yours, waiting for Sprout");

function Legend({ withMine, withPicked }) {
  return (
    <div className="bk-legend">
      {withPicked && <span><i className="bk-sw pick" />Picked</span>}
      {withMine && <span><i className="bk-sw mine" />Yours, confirmed</span>}
      {withMine && <span><i className="bk-sw req" />Yours, waiting for Sprout</span>}
      <span><i className="bk-sw busy" />Unavailable</span>
      <span>Blank = open</span>
    </div>
  );
}

/**
 * Month grid (agenda list on phones).
 * picked: Set of dates to outline. pickMode: days outside the booking window can't be clicked.
 */
export function MonthView({ month, setMonth, busy, mine, picked, onDay, loading, withMine, pickMode = false }) {
  const today = todayNY();
  const first = monthStart(month);
  const gridStart = addDays(first, -weekday(first));
  const last = monthEnd(month);
  const cells = [];
  for (let d = gridStart; cells.length < 42 && (d <= last || cells.length % 7); d = addDays(d, 1)) cells.push(d);
  const inMonth = cells.filter((d) => ym(d) === month);
  const canBack = month > ym(today);
  const canFwd = month < ym(latestDate(today));
  const isOff = (d) => (pickMode ? !bookable(d) : false);

  return (
    <div>
      <div className="bk-nav">
        <button type="button" className="pt-btn pt-btn-2 pt-btn-sm" disabled={!canBack} onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">‹</button>
        <div className="bk-mt">{monthTitle(month)}</div>
        <button type="button" className="pt-btn pt-btn-2 pt-btn-sm" disabled={!canFwd} onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Next month">›</button>
        {loading && <span className="pt-help" style={{ margin: 0 }}>Loading…</span>}
      </div>
      <Legend withMine={withMine} withPicked={pickMode} />
      <div className="bk-grid" role="grid" aria-label={monthTitle(month)}>
        {WEEKDAYS.map((w) => <div key={w} className="bk-dow">{w}</div>)}
        {cells.map((d) => {
          if (ym(d) !== month) return <div key={d} className="bk-day out" />;
          const items = dayItems(d, busy, mine);
          const on = picked?.has(d);
          const off = isOff(d);
          return (
            <button type="button" key={d} disabled={off}
              className={`bk-day${d < today ? " past" : ""}${off ? " off" : ""}${on ? " picked" : ""}`}
              aria-pressed={pickMode ? !!on : undefined}
              onClick={() => onDay(d)} aria-label={`${longDate(d)}${items.length ? `, ${items.length} booked` : ", open"}${on ? ", picked" : ""}`}>
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
          const on = picked?.has(d);
          const off = isOff(d);
          return (
            <button type="button" key={d} disabled={off} className={`bk-arow${on ? " picked" : ""}${off ? " off" : ""}`} onClick={() => onDay(d)}>
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

/**
 * The picker. Click days on and off; one time range applies to every picked day,
 * and any day can get its own times. Dates that clash are shown and left out.
 *   loadBusy(from,to) -> busy blocks   mine -> the client's own slots
 *   onDone(slots, note, state)         state lets /book reopen the picker as it was
 */
export function PickDatesModal({ initialDate, loadBusy, mine = [], onClose, onDone, doneLabel = "Use these dates", sending = false, error = "", initial }) {
  const startMonth = ym(initial?.picks?.[0]?.date || (initialDate && bookable(initialDate) ? initialDate : earliestDate()));
  const [month, setMonth] = useState(startMonth);
  const [start, setStart] = useState(initial?.start || "18:00");
  const [end, setEnd] = useState(initial?.end || "22:00");
  const [note, setNote] = useState(initial?.note || "");
  // date -> { start, end } when that day has its own times; null = uses the shared range
  const [picks, setPicks] = useState(() => {
    if (initial?.picks) return Object.fromEntries(initial.picks.map((p) => [p.date, p.custom ? { start: p.start, end: p.end } : null]));
    return initialDate && bookable(initialDate) ? { [initialDate]: null } : {};
  });
  const [editing, setEditing] = useState("");
  const [busyByMonth, setBusyByMonth] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState("");
  const [msg, setMsg] = useState("");

  // Load busy times for the shown month, plus any month that holds a picked day.
  const months = useMemo(() => [...new Set([month, ...Object.keys(picks).map(ym)])], [month, picks]);
  useEffect(() => {
    let alive = true;
    const need = months.filter((m) => !busyByMonth[m]);
    if (!need.length) return;
    setLoading(true); setLoadErr("");
    Promise.all(need.map((m) => loadBusy(monthStart(m), monthEnd(m)).then((b) => [m, b])))
      .then((rows) => { if (alive) setBusyByMonth((prev) => ({ ...prev, ...Object.fromEntries(rows) })); })
      .catch((e) => { if (alive) setLoadErr(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [months, busyByMonth, loadBusy]);

  const busy = useMemo(() => Object.values(busyByMonth).flat(), [busyByMonth]);
  const ownBlocks = mine.filter((s) => s.status === "requested" || s.status === "confirmed")
    .map((s) => ({ date: s.date, start: toMin(s.start_time), end: endMin(s.end_time) }));

  const toggle = (d) => {
    setMsg("");
    if (!bookable(d)) { setMsg(d < earliestDate() ? `Dates need at least ${NOTICE_DAYS} days' notice.` : "We book up to about three months ahead."); return; }
    setPicks((p) => {
      if (d in p) { const { [d]: _gone, ...rest } = p; return rest; }
      if (Object.keys(p).length >= MAX_SLOTS) { setMsg(`Up to ${MAX_SLOTS} dates at a time.`); return p; }
      return { ...p, [d]: null };
    });
  };
  const setDayTimes = (d, patch) => setPicks((p) => ({ ...p, [d]: { start: p[d]?.start || start, end: p[d]?.end || end, ...patch } }));
  const resetDay = (d) => { setPicks((p) => ({ ...p, [d]: null })); setEditing(""); };

  const rows = Object.keys(picks).sort().map((date) => {
    const t = picks[date];
    const s = { date, start: t?.start || start, end: t?.end || end };
    const shape = slotProblem(s);
    const taken = !shape && clashesFor(s, busy)[0];
    const already = !shape && !taken && clashesFor(s, ownBlocks)[0];
    const why = shape || (taken ? `Taken ${timeRange(taken.start, taken.end)}` : already ? `You already have ${timeRange(already.start, already.end)}` : "");
    const dayBusy = dayItems(date, busy, mine);
    return { ...s, custom: !!t, why, dayBusy };
  });
  const sendable = rows.filter((r) => !r.why);
  const pickedSet = useMemo(() => new Set(Object.keys(picks)), [picks]);

  return (
    <div className="bk-modal-bg" role="dialog" aria-modal="true" aria-label="Pick dates" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bk-modal">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <div className="pt-sec-ttl">Pick dates</div>
          <button type="button" className="pt-btn pt-btn-2 pt-btn-sm" onClick={onClose}>Close</button>
        </div>
        <p className="pt-help" style={{ marginTop: 0, marginBottom: 14 }}>Click days to pick them. Click again to unpick. Grey times are already taken.</p>
        <div className="bk-mgrid">
          <div style={{ minWidth: 0 }}>
            <MonthView month={month} setMonth={setMonth} busy={busy} mine={mine} picked={pickedSet} onDay={toggle} loading={loading} withMine={mine.length > 0} pickMode />
            {msg && <div className="pt-err" style={{ marginTop: 10 }}>{msg}</div>}
            {loadErr && <div className="pt-err" style={{ marginTop: 10 }}>{loadErr}</div>}
          </div>
          <div className="bk-side">
            <div>
              <div className="pt-lbl">Times for every picked day</div>
              <div className="bk-times">
                <input className="pt-in" type="time" step="900" aria-label="Start time" value={start} onChange={(e) => setStart(e.target.value)} />
                <span>to</span>
                <input className="pt-in" type="time" step="900" max="22:00" aria-label="End time" value={end} onChange={(e) => setEnd(e.target.value)} />
              </div>
              <p className="pt-help">Include setup and cleanup. Everything ends by 10pm.</p>
            </div>

            <div>
              <div className="pt-lbl">{rows.length ? `${rows.length} day${rows.length === 1 ? "" : "s"} picked` : "No days picked yet"}</div>
              {!rows.length && <p className="pt-help">Click any open day on the calendar.</p>}
              <div className="bk-picks">
                {rows.map((r) => (
                  <div key={r.date} className={`bk-pick${r.why ? " bad" : ""}`}>
                    <div className="bk-pick-row">
                      <span className="when">{shortDate(r.date)}</span>
                      <span>{timeRange(r.start, r.end)}{r.custom ? " *" : ""}</span>
                      <button type="button" className="pt-btn-lnk" onClick={() => setEditing(editing === r.date ? "" : r.date)}>{editing === r.date ? "Done" : "Edit time"}</button>
                      <button type="button" className="pt-btn-lnk" aria-label={`Remove ${shortDate(r.date)}`} onClick={() => toggle(r.date)}>✕</button>
                    </div>
                    {editing === r.date && (
                      <div className="bk-times">
                        <input className="pt-in" type="time" step="900" aria-label={`Start on ${shortDate(r.date)}`} value={r.start} onChange={(e) => setDayTimes(r.date, { start: e.target.value })} />
                        <span>to</span>
                        <input className="pt-in" type="time" step="900" max="22:00" aria-label={`End on ${shortDate(r.date)}`} value={r.end} onChange={(e) => setDayTimes(r.date, { end: e.target.value })} />
                        {r.custom && <button type="button" className="pt-btn-lnk" onClick={() => resetDay(r.date)}>Use the shared times</button>}
                      </div>
                    )}
                    {r.why && <span className="why">{r.why}. This day won't be sent.</span>}
                    {!r.why && r.dayBusy.length > 0 && (
                      <span className="taken">Also that day: {r.dayBusy.map((it) => `${timeRange(it.start, it.end)}${it.kind === "busy" ? "" : " (yours)"}`).join(", ")}</span>
                    )}
                  </div>
                ))}
              </div>
              {rows.some((r) => r.custom) && <p className="pt-help">* has its own times</p>}
            </div>

            <div>
              <label className="pt-lbl" htmlFor="bk-note">Anything we should know (optional)</label>
              <textarea id="bk-note" className="pt-ta" style={{ minHeight: 64 }} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>

            {error && <div className="pt-err" style={{ margin: 0 }}>{error}</div>}
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <b style={{ fontSize: 14 }}>{sendable.length} date{sendable.length === 1 ? "" : "s"} to send</b>
              <button type="button" className="pt-btn" disabled={!sendable.length || sending}
                onClick={() => onDone(
                  sendable.map(({ date, start: s, end: e }) => ({ date, start: s, end: e })),
                  note,
                  { start, end, note, picks: rows.map(({ date, start: s, end: e, custom }) => ({ date, start: s, end: e, custom })) },
                )}>
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

/** The portal's "Your dates" section. */
export function DatesSection({ token }) {
  const [month, setMonth] = useState(() => ym(todayNY()));
  const [mine, setMine] = useState([]);
  const [busy, setBusy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [modal, setModal] = useState(null);      // { date }
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState("");
  const [toast, setToast] = useState("");
  const [busyId, setBusyId] = useState("");
  const [showPast, setShowPast] = useState(false);
  const [showCal, setShowCal] = useState(false);
  const [ready, setReady] = useState(false);   // first load done, so we know whether a date is set

  const loadBusy = useCallback(async (from, to) => (await fetchJSON(`/api/portal/${token}/slots?from=${from}&to=${to}`)).busy || [], [token]);

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const j = await fetchJSON(`/api/portal/${token}/slots?from=${monthStart(month)}&to=${monthEnd(month)}`);
      setMine(j.mine || []); setBusy(j.busy || []);
    } catch (e) { setErr(e.message); }
    setLoading(false); setReady(true);
  }, [token, month]);
  useEffect(() => { load(); }, [load]);

  const open = (date = "") => { setSendErr(""); setToast(""); setModal({ date }); };

  const send = async (slots, note) => {
    setSending(true); setSendErr("");
    try {
      const j = await fetchJSON(`/api/portal/${token}/slots`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slots, note }) });
      setModal(null); setShowCal(false);
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
  // Once a date is confirmed, the host sees that date first; the calendar only
  // opens when they ask for a different time.
  const isSet = upcoming.some((s) => s.status === "confirmed");
  const calOpen = ready && (!isSet || showCal);
  const calMine = mine.filter((s) => s.start_time && s.end_time);
  const when = (s) => `${shortDate(s.date)} · ${s.start_time && s.end_time ? timeRange(s.start_time, s.end_time) : "time to be set"}`;

  return (
    <div>
      <style>{BK_CSS}</style>
      {!ready && <p className="pt-help" style={{ marginTop: 6 }}>Loading your dates…</p>}
      {isSet && !showCal && (
        <div style={{ marginTop: 6 }}>
          <p className="pt-sec-blurb" style={{ margin: "0 0 12px" }}>You're on our calendar. Need a different time? Ask below and we'll confirm by email.</p>
          <div className="bk-list">
            {upcoming.map((s) => {
              const [cls, label] = STATUS_TAG[s.status] || ["wait", s.status];
              return (
                <div className="bk-lrow" key={s.id}>
                  <span className="when" style={s.status === "confirmed" ? { fontWeight: 700 } : undefined}>{when(s)}</span>
                  <span className={`bk-tag ${cls}`}>{label}</span>
                  {s.status === "requested" && <button type="button" className="pt-btn-lnk" disabled={busyId === s.id} onClick={() => cancel(s)}>Withdraw</button>}
                </div>
              );
            })}
          </div>
          <button type="button" className="pt-btn pt-btn-sm" style={{ marginTop: 14 }} onClick={() => setShowCal(true)}>Request a different time</button>
          {toast && <div className="pt-note pt-good" style={{ marginTop: 14, marginBottom: 0 }} role="status">✓ {toast}</div>}
          {err && <div className="pt-err" style={{ marginTop: 14 }}>{err}</div>}
        </div>
      )}
      {calOpen && <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 6 }}>
        <p className="pt-sec-blurb" style={{ margin: 0 }}>{isSet ? "Pick the new day you'd like. Your current date stays on the calendar until we confirm the change." : "Your dates with us. Click a day to ask for it. Grey times are taken by someone else."}</p>
        <div style={{ display: "flex", gap: 8 }}>
          {isSet && <button type="button" className="pt-btn-lnk" onClick={() => setShowCal(false)}>Back to my date</button>}
          <button type="button" className="pt-btn pt-btn-sm" onClick={() => open()}>+ Ask for dates</button>
        </div>
      </div>
      {toast && <div className="pt-note pt-good" style={{ marginTop: 14, marginBottom: 0 }} role="status">✓ {toast}</div>}
      {err && <div className="pt-err" style={{ marginTop: 14 }}>{err}</div>}

      {!loading && !mine.length && (
        <div className="pt-note" style={{ marginTop: 14 }}>
          <strong>Ready to pick your dates?</strong> Click open days on the calendar below, or tap Ask for dates. Save this link: it's how you book with us from now on.
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <MonthView month={month} setMonth={setMonth} busy={busy} mine={calMine} onDay={(d) => open(bookable(d) ? d : "")} loading={loading} withMine />
      </div>

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
                  <span className="when">{when(s)}</span>
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
      </>}

      {modal && <PickDatesModal initialDate={modal.date} loadBusy={loadBusy} mine={calMine} onClose={() => setModal(null)}
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
  const sameTimes = sorted.every((s) => s.start === sorted[0]?.start && s.end === sorted[0]?.end);
  const summary = sorted.length
    ? `${sorted.length} date${sorted.length === 1 ? "" : "s"} · ${shortDate(sorted[0].date)}${sorted.length > 1 ? ` to ${shortDate(sorted[sorted.length - 1].date)}` : ""}${sameTimes ? ` · ${timeRange(sorted[0].start, sorted[0].end)}` : " · times vary"}`
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
