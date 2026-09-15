"use client";

// The Day Board: Max's day and week at Sprout, built on Dasha-Board's schedule.
// Day view is a checklist (Complete / Push / Follow up, plus a ⋯ menu); Week view is the
// weekly bank and a 7-day grid. Tasks live in sprout_tasks; both Google calendars are
// read-only here. The rules (dates, pushes, CRM follow-up mirroring, totals) live in
// lib/dayBoard.js so the summary emails compute the same numbers.
//
// Settled with Max, 2026-09-15: a completed task STAYS on the list, struck through, with
// Undo (never hide or animate it away). Push notes are optional. Anything not done by
// midnight moves forward on its own, so there is no catch-up card.

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  CATS, CAT_ORDER, catInfo, todayET, addDays, weekStartOf, weekDays, shortDay, weekdayShort,
  weekdayLong, monthDay, monthDayShort, weekLabel, fmtH, hrsTxt, hm, clock, newTaskId, byPriority,
  daysLate, pushPatch, crmOpenActions, syncPlan, completeCrmAction, reopenCrmAction, addCrmFollowUp,
  weekTotals, sproutTotals, contactName, recordOfKey,
} from "../lib/dayBoard";
import {
  rollForwardTasks, fetchWeekTasks, fetchTaskActionKeys, insertTasks, updateTask, closeTasks,
  deleteTask, fetchDayBoardCalendar, fetchCrmRecordsByIds,
} from "../lib/services";

const DB_STYLES = `
.db{--line:#E3E3DD;--soft:#EFEFEA;--sunk:#F1F1EC;--dim:#5F5F57;--faint:#9A9A90;--ok:#15804A;--ok-bg:#E4F3EA;--crit:#B3005F;--crit-bg:#FBE6F1;--warn:#8A6100;--warn-bg:#FAF0D6;}
.db .mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-variant-numeric:tabular-nums}
.db-eyebrow{font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--dim);font-weight:700}
.db-top{display:flex;gap:14px 20px;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;padding-bottom:14px;border-bottom:2px solid var(--black);margin-bottom:18px}
.db-top h1{font-size:30px;font-weight:900;letter-spacing:-.02em;line-height:1.05;margin-top:2px}
.db-sum{display:flex;flex-wrap:wrap;gap:4px 14px;margin-top:6px;color:var(--dim);font-size:13px}
.db-sum b{color:var(--black)} .db-sum .crit b{color:var(--crit)}
.db-top-r{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.db-nav{display:inline-flex;gap:4px}
.db-seg{display:inline-flex;border:1.5px solid var(--line);border-radius:999px;padding:2px;background:#fff}
.db-seg button{border:0;background:none;cursor:pointer;padding:4px 13px;border-radius:999px;font:inherit;font-size:12px;font-weight:700;color:var(--dim)}
.db-seg button[aria-pressed="true"]{background:var(--black);color:var(--white)}
.db-act{appearance:none;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;border:1px solid var(--line);background:#fff;color:#2c2c26;border-radius:5px;padding:6px 11px;white-space:nowrap;line-height:1.2}
.db-act:hover{background:var(--sunk);border-color:var(--dim)}
.db-act.pri{background:var(--black);color:var(--white);border-color:var(--black)}
.db-act.pri:hover{opacity:.87}
.db-act.lg{font-size:13.5px;padding:8px 15px}
.db-act:disabled{opacity:.45;cursor:default}
.db-act.ok,.db-act.ok:hover{background:var(--ok);border-color:var(--ok);color:#fff;cursor:default;opacity:1}
.db-act:focus-visible,.db-seg button:focus-visible,.db-undo:focus-visible,.db-rowmenu:focus-visible{outline:2px solid var(--fuchsia);outline-offset:2px}
.db-undo{appearance:none;border:0;background:none;cursor:pointer;padding:0;font:inherit;font-size:12px;color:var(--dim);text-decoration:underline;text-underline-offset:2px}
.db-undo:hover{color:var(--black)}
.db-grid2{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(0,1fr);gap:18px;align-items:start}
@media(max-width:900px){.db-grid2{grid-template-columns:1fr}}
.db-stack{display:grid;gap:18px}
.db-card{background:#fff;border:1.5px solid var(--g200);border-radius:8px;box-shadow:var(--sh-sm)}
.db-pad{padding:15px 17px}
.db-card-hd{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;padding:13px 17px;border-bottom:1px solid var(--line)}
.db-card-hd h2{font-size:15px;font-weight:900}
.db-sub{color:var(--dim);font-size:12.5px;margin:0}
.db-daybar{display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:13px 17px;border-bottom:1px solid var(--line)}
.db-big{font-size:21px;font-weight:700}
.db-group{padding:12px 17px 4px;display:flex;gap:8px;align-items:baseline}
.db-group span{text-transform:none;letter-spacing:0;font-weight:400;color:var(--faint)}
.db-rows{list-style:none;margin:0;padding:0}
.db-row{display:grid;grid-template-columns:84px 4px minmax(0,1fr) auto;gap:12px;padding:12px 17px;border-bottom:1px solid var(--soft);align-items:start}
.db-rows > .db-row:last-child{border-bottom:0}
.db-row.bank{grid-template-columns:26px 52px 4px minmax(0,1fr) auto}
@media(max-width:560px){.db-row{grid-template-columns:52px 4px minmax(0,1fr) auto;gap:9px;padding:11px 12px}.db-row.bank{grid-template-columns:24px 46px 4px minmax(0,1fr) auto}}
.db-t{font-size:12px;color:var(--dim);padding-top:2px}
.db-rail{width:4px;border-radius:2px;align-self:stretch;min-height:34px;background:var(--cat,#B9B9AE)}
.db-rail.hatch{background:repeating-linear-gradient(180deg,var(--faint) 0 4px,transparent 4px 8px)}
.db-name{font-weight:700;font-size:15px;overflow-wrap:anywhere;display:flex;flex-wrap:wrap;gap:4px 7px;align-items:baseline}
.db-row.done .db-name > span:first-child{color:var(--dim);text-decoration:line-through;text-decoration-thickness:2px}
.db-row.cal .db-name{font-weight:400}
.db-meta{font-size:12.5px;color:var(--dim);margin-top:2px;overflow-wrap:anywhere}
.db-row.done .db-meta{color:var(--faint)}
.db-acts{display:flex;gap:6px;margin-top:9px;flex-wrap:wrap;align-items:center}
.db-flag{font-size:10.5px;font-weight:700;padding:1px 6px;border-radius:3px;white-space:nowrap;text-decoration:none}
.db-flag.crit{background:var(--crit-bg);color:var(--crit)} .db-flag.warn{background:var(--warn-bg);color:var(--warn)}
.db-linkline{font-size:12.5px;color:#3b3b34;margin-top:6px;padding:6px 9px;background:var(--sunk);border-radius:4px;overflow-wrap:anywhere}
.db-linkline b{font-weight:700;color:var(--black)}
.db-rowmenu{appearance:none;border:1px solid transparent;background:none;cursor:pointer;font-size:19px;line-height:1;color:var(--dim);padding:1px 7px 7px;border-radius:4px}
.db-rowmenu:hover{color:var(--black);border-color:var(--line);background:var(--sunk)}
.db-pushbox{margin-top:9px;display:grid;gap:6px}
.db-note{width:100%;min-height:56px;resize:vertical;padding:8px 10px;border:1.5px solid var(--g200);border-radius:6px;background:#fff;font:inherit;font-size:13px}
.db-note:focus,.db-field:focus{outline:none;border-color:var(--cyan);box-shadow:0 0 0 2px rgba(115,196,214,.18)}
.db-empty{margin:14px 17px 17px;padding:24px 18px;text-align:center;color:var(--dim);font-size:13px;border:1px dashed var(--line);border-radius:6px;background:var(--sunk)}
.db-empty b{display:block;font-size:15px;color:#2c2c26;margin-bottom:4px}
.db-empty .db-act{margin-top:10px}
.db-warnline{margin:12px 17px 0;padding:8px 10px;border-radius:6px;background:var(--warn-bg);color:var(--warn);font-size:12.5px;display:flex;gap:10px;justify-content:space-between;align-items:center;flex-wrap:wrap}
.db-meters{display:grid;gap:13px;margin-top:10px}
.db-mtop{display:flex;justify-content:space-between;align-items:baseline;gap:8px;font-size:13px}
.db-mtop small{color:var(--faint);font-size:11px;margin-left:4px}
.db-sw{display:inline-block;width:10px;height:10px;border-radius:2px;background:var(--cat);vertical-align:-1px;margin-right:6px}
.db-mval{font-weight:600;font-size:12px;white-space:nowrap}
.db-track{height:7px;border-radius:4px;background:var(--sunk);margin-top:7px;overflow:hidden;border:1px solid var(--soft)}
.db-fill{height:100%;border-radius:4px;background:var(--cat)}
.db-mfoot{font-size:12px;color:var(--dim);margin-top:5px}
.db-totline{display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap;margin-top:6px}
.db-brk{display:grid;gap:4px;margin-top:10px;font-size:13px}
.db-brk div{display:flex;justify-content:space-between;gap:10px;border-top:1px solid var(--soft);padding-top:4px}
.db-brk div:first-child{border-top:0;padding-top:0}
.db-minibank{list-style:none;padding:0;display:grid;gap:6px;margin:10px 0 12px}
.db-minibank li{font-size:13px;overflow-wrap:anywhere}
.db-prio{display:grid;gap:2px;padding-top:1px}
.db-prio button{appearance:none;border:1px solid var(--line);background:#fff;border-radius:3px;cursor:pointer;font-size:9px;line-height:1;padding:3px 5px;color:var(--dim)}
.db-prio button:hover:not(:disabled){color:var(--black);border-color:var(--dim)}
.db-prio button:disabled{opacity:.35;cursor:default}
.db-weekscroll{overflow-x:auto}
.db-week{display:grid;grid-template-columns:repeat(7,minmax(128px,1fr));min-width:900px}
.db-wd{border-right:1px solid var(--line)} .db-wd:last-child{border-right:0}
.db-wd.today{background:rgba(225,0,152,.035)}
.db-wd h4{margin:0;padding:10px 10px 8px;font-size:12px;font-weight:700;border-bottom:1px solid var(--line)}
.db-wd h4 .d{display:flex;justify-content:space-between;gap:6px;align-items:baseline}
.db-dayjump{appearance:none;border:0;background:none;padding:0;cursor:pointer;font:inherit;font-weight:900;text-decoration:underline;text-underline-offset:2px;color:inherit}
.db-wd.today .db-dayjump{color:var(--fuchsia)}
.db-load{display:block;font-size:10.5px;color:var(--dim);font-weight:400;margin-top:3px}
.db-wcol{display:grid;gap:5px;padding:8px}
.db-ev{appearance:none;display:grid;gap:1px;text-align:left;width:100%;padding:5px 7px;border-radius:4px;font:inherit;font-size:12px;line-height:1.25;border:1px solid transparent}
.db-ev .evt{font-size:10.5px;color:var(--dim)}
.db-ev .evn{overflow-wrap:anywhere}
.db-ev.cal{background:var(--sunk);color:#3b3b34}
.db-ev.sprout{background:repeating-linear-gradient(135deg,rgba(0,0,0,.05) 0 5px,transparent 5px 10px);border:1px dashed var(--line);color:var(--dim)}
.db-ev.task{cursor:pointer;background:color-mix(in srgb,var(--cat) 20%,#fff);border-color:color-mix(in srgb,var(--cat) 55%,#fff);color:var(--black)}
.db-ev.task:hover{border-color:var(--black)}
.db-ev.task.done{opacity:.6}
.db-ev.task.done .evn{text-decoration:line-through}
.db-legend{display:flex;gap:14px;flex-wrap:wrap;font-size:12.5px;color:#3b3b34;margin:0 0 10px}
.db-hsw{display:inline-block;width:14px;height:10px;border:1px dashed var(--faint);vertical-align:-1px;margin-right:5px}
.db-meterrow{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin-top:18px}
.db-dialog{border:0;padding:0;border-radius:9px;background:#fff;color:var(--black);box-shadow:var(--sh-lg);max-width:480px;width:calc(100vw - 32px)}
.db-dialog.wide{max-width:720px}
.db-dialog::backdrop{background:rgba(10,12,16,.5)}
.db-dm-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:15px 18px;border-bottom:1px solid var(--line)}
.db-dm-head h3{font-size:18px;font-weight:900;margin-top:2px;overflow-wrap:anywhere}
.db-dm-close{appearance:none;border:0;background:none;font-size:22px;line-height:1;color:var(--dim);cursor:pointer;padding:2px 4px}
.db-lm{padding:14px 18px 18px;display:flex;flex-direction:column;gap:15px;max-height:74vh;overflow-y:auto}
.db-segs{display:flex;gap:6px;flex-wrap:wrap}
.db-segs .db-act[aria-pressed="true"]{background:var(--black);color:var(--white);border-color:var(--black)}
.db-chips{display:flex;gap:6px;flex-wrap:wrap}
.db-chips button{appearance:none;display:inline-flex;align-items:center;padding:5px 10px;border:1px solid var(--line);border-radius:999px;background:#fff;cursor:pointer;font:inherit;font-size:12.5px}
.db-chips button[aria-pressed="true"]{border-color:var(--black);background:color-mix(in srgb,var(--cat) 22%,#fff);font-weight:700}
.db-menulist{list-style:none;padding:0;border:1px solid var(--line);border-radius:6px;overflow:hidden}
.db-menuitem{appearance:none;display:flex;width:100%;text-align:left;gap:12px;align-items:center;background:#fff;border:0;border-bottom:1px solid var(--line);padding:11px 14px;cursor:pointer;font:inherit}
.db-menulist > li:last-child .db-menuitem{border-bottom:0}
.db-menuitem:hover{background:var(--sunk)}
.db-menuitem span{flex:1;min-width:0}
.db-menuitem b{display:block;font-size:14px}
.db-menuitem small{display:block;font-size:12.5px;color:var(--dim);margin-top:1px}
.db-menuitem::after{content:"›";color:var(--dim);font-size:18px}
.db-menuitem.danger b{color:var(--crit)}
.db-weeknav{display:flex;justify-content:space-between;align-items:center;gap:10px}
.db-daypick{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}
@media(max-width:560px){.db-daypick{grid-template-columns:repeat(4,minmax(0,1fr))}}
.db-dp{appearance:none;display:grid;gap:2px;justify-items:start;text-align:left;padding:8px;border:1px solid var(--line);border-radius:5px;background:#fff;cursor:pointer;font:inherit;font-size:12px}
.db-dp:hover:not(:disabled){border-color:var(--dim)}
.db-dp:disabled{background:var(--sunk);opacity:.6;cursor:default}
.db-dp small{font-size:10.5px;color:var(--dim)}
.db-dp.cur{background:var(--warn-bg);opacity:1}
.db-dp em{font-style:normal;font-size:10px;font-weight:700;color:var(--warn)}
.db-dp[aria-pressed="true"]{border-color:var(--black);box-shadow:inset 0 0 0 1px var(--black);background:rgba(115,196,214,.18)}
.db-confirm{padding:11px 13px;border-radius:6px;background:var(--sunk);border:1px solid var(--line);font-size:13.5px;line-height:1.55}
.db-mc{border:1px solid var(--line);border-radius:6px;padding:10px}
.db-mc-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;text-align:center;margin-top:8px}
.db-mc-grid .wdh{font-size:10px;color:var(--faint);font-weight:700;padding:3px 0}
.db-mc-grid button{appearance:none;border:1px solid transparent;background:none;border-radius:4px;padding:6px 0;cursor:pointer;font:inherit;font-size:13px}
.db-mc-grid button:hover:not(:disabled){background:var(--sunk)}
.db-mc-grid button:disabled{color:var(--faint);opacity:.5;cursor:default}
.db-mc-grid button.today{border-color:var(--fuchsia)}
.db-mc-grid button[aria-pressed="true"]{background:var(--black);color:var(--white);font-weight:700}
.db-fld{display:grid;gap:4px}
.db-fld label,.db-fld .db-eyebrow{font-size:11px}
.db-field{padding:8px 10px;border:1.5px solid var(--g200);border-radius:6px;background:#fff;width:100%;font:inherit;font-size:13px}
.db-frow{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.db-err{margin:0;font-size:12.5px;color:var(--crit)}
`;

/* ─── small pieces ──────────────────────────────────────────────────────────── */

function Dialog({ open, onClose, wide, labelledBy, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);
  return (
    <dialog ref={ref} className={`db-dialog${wide ? " wide" : ""}`} aria-labelledby={labelledBy}
      onClose={onClose} onMouseDown={(e) => { if (e.target === ref.current) onClose(); }}>
      {open ? children : null}
    </dialog>
  );
}

function DialogHead({ eyebrow, title, sub, onClose, id }) {
  return (
    <div className="db-dm-head">
      <div>
        <div className="db-eyebrow">{eyebrow}</div>
        <h3 id={id}>{title}</h3>
        {sub && <div className="db-sub">{sub}</div>}
      </div>
      <button type="button" className="db-dm-close" aria-label="Close" onClick={onClose}>×</button>
    </div>
  );
}

function PushLine({ p, weekStart }) {
  if (p.auto) {
    return <div className="db-linkline">Not done <b>{shortDay(p.from)}</b>, {p.from < weekStart ? "carried into this week" : "moved here at midnight"}</div>;
  }
  return <div className="db-linkline">Pushed from <b>{shortDay(p.from)}</b>{p.note ? `: ${p.note}` : ""}</div>;
}

function Meter({ cat, done, plan, foot }) {
  const info = catInfo(cat);
  return (
    <div style={{ "--cat": info.color }}>
      <div className="db-mtop">
        <span><span className="db-sw" />{info.name}<small>{info.gc}</small></span>
        <span className="db-mval mono">{fmtH(done)} / {fmtH(plan)} hrs</span>
      </div>
      <div className="db-track"><div className="db-fill" style={{ width: `${plan ? Math.min(100, (done / plan) * 100) : 0}%` }} /></div>
      <div className="db-mfoot">{foot}</div>
    </div>
  );
}

const meterFoot = (c) => [
  c.followUps && `${c.followUps} follow-up${c.followUps > 1 ? "s" : ""}`,
  c.tasks && `${c.tasks} task${c.tasks > 1 ? "s" : ""}`,
  c.events && `${c.events} calendar item${c.events > 1 ? "s" : ""}`,
].filter(Boolean).join(", ");

function TaskRow({ t, who, today, bank, first, last, push, h }) {
  const late = daysLate(t, today);
  const pushes = t.pushes || [];
  const info = catInfo(t.category);
  const name = who || t.title;
  const meta = [info.name, t.kind === "follow_up" ? "Follow-up" : "Task", who ? t.title : null].filter(Boolean).join(" · ");
  const nextDay = t.day ? addDays(t.day, 1) : null;
  const nextLabel = nextDay && nextDay >= addDays(t.week_start, 7) ? "next week" : nextDay ? shortDay(nextDay) : "";
  return (
    <li className={`db-row${t.done ? " done" : ""}${bank ? " bank" : ""}`}>
      {bank && (
        <div className="db-prio">
          <button type="button" aria-label="Move up" disabled={first} onClick={() => h.reorder(t, -1)}>▲</button>
          <button type="button" aria-label="Move down" disabled={last} onClick={() => h.reorder(t, 1)}>▼</button>
        </div>
      )}
      <div className="db-t mono">{hrsTxt(t.hours)}</div>
      <div className="db-rail" style={{ "--cat": info.color }} />
      <div>
        <div className="db-name">
          <span>{name}</span>
          {late > 0 && <span className="db-flag crit mono">{late}d late</span>}
          {t.carried && <span className="db-flag warn">Carried over</span>}
          {pushes.length > 1 && <span className="db-flag warn">Pushed {pushes.length}×</span>}
        </div>
        <div className="db-meta">{meta}</div>
        {pushes.length > 0 && <PushLine p={pushes[pushes.length - 1]} weekStart={t.week_start} />}
        {bank ? (
          <div className="db-acts"><button type="button" className="db-act" onClick={() => h.place(t)}>Place on a day</button></div>
        ) : t.done ? (
          <div className="db-acts">
            <span className="db-act ok">✓ Done</span>
            <button type="button" className="db-undo" onClick={() => h.undo(t)}>Undo</button>
          </div>
        ) : push.openId === t.id ? (
          <div className="db-pushbox">
            <label className="db-eyebrow" htmlFor={`push-${t.id}`}>Note (optional)</label>
            <textarea id={`push-${t.id}`} className="db-note" autoFocus placeholder="e.g. Waiting on her reply"
              value={push.note} onChange={(e) => push.setNote(e.target.value)} />
            <div className="db-acts" style={{ marginTop: 0 }}>
              <button type="button" className="db-act pri" onClick={() => h.pushGo(t)}>Push to {nextLabel}</button>
              <button type="button" className="db-act" onClick={push.cancel}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="db-acts">
            <button type="button" className="db-act pri" onClick={() => h.complete(t)}>Complete</button>
            <button type="button" className="db-act" onClick={() => h.pushOpen(t)}>Push</button>
            <button type="button" className="db-act" onClick={() => h.followUp(t)}>Follow up</button>
          </div>
        )}
      </div>
      <button type="button" className="db-rowmenu" aria-label={`Actions for ${name}`} onClick={() => h.menu(t)}>⋯</button>
    </li>
  );
}

function CalRow({ e }) {
  const sprout = e.cal === "sprout";
  return (
    <li className="db-row cal">
      <div className="db-t mono">{e.allDay ? "All day" : clock(e.start)}</div>
      <div className={`db-rail${sprout ? " hatch" : ""}`} style={sprout ? undefined : { "--cat": catInfo(e.category).color }} />
      <div>
        <div className="db-name"><span>{e.title}</span></div>
        <div className="db-meta">
          {!e.allDay && `Until ${clock(e.end)} · `}
          {sprout ? "Sprout calendar · not in your hours" : `Your calendar · ${catInfo(e.category).name}`}
        </div>
      </div>
      <span />
    </li>
  );
}

const shiftMonth = (month, n) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
};

function MonthCal({ month, setMonth, pick, setPick, today }) {
  const [y, m] = month.split("-").map(Number);
  const lead = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const name = monthDay(`${month}-01`).split(" ")[0];
  return (
    <div className="db-mc">
      <div className="db-weeknav">
        <button type="button" className="db-act" aria-label="Previous month" disabled={month <= today.slice(0, 7)} onClick={() => setMonth(shiftMonth(month, -1))}>‹</button>
        <b>{name} {y}</b>
        <button type="button" className="db-act" aria-label="Next month" onClick={() => setMonth(shiftMonth(month, 1))}>›</button>
      </div>
      <div className="db-mc-grid">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i} className="wdh">{d}</span>)}
        {Array.from({ length: lead }, (_, i) => <span key={`l${i}`} />)}
        {Array.from({ length: count }, (_, i) => {
          const iso = `${month}-${String(i + 1).padStart(2, "0")}`;
          return (
            <button key={iso} type="button" className={iso === today ? "today" : ""} disabled={iso <= today}
              aria-pressed={pick === iso} aria-label={`${name} ${i + 1}`} onClick={() => setPick(iso)}>{i + 1}</button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── the board ─────────────────────────────────────────────────────────────── */

export default function DayBoard({ contacts, orgs, onSaveContact, onSaveOrg, openContact, setView, showToast }) {
  const [today, setToday] = useState(() => todayET());
  const todayRef = useRef(today);
  todayRef.current = today;
  const [tab, setTab] = useState("day");
  const [viewDay, setViewDay] = useState(today);
  const [weeks, setWeeks] = useState({}); // weekStart -> { tasks, loading, error }
  const [cals, setCals] = useState({});   // weekStart -> { events, loading, error }
  const [pushOpenId, setPushOpenId] = useState(null);
  const [pushNote, setPushNote] = useState("");
  const [menu, setMenu] = useState(null); // { id, step: "menu"|"move", pickWeek, pick }
  const [fu, setFu] = useState(null);     // { id, month, pick, note, error }
  const [add, setAdd] = useState(null);   // { title, category, hours, day, error }
  const syncedRef = useRef(false);

  const ws = weekStartOf(viewDay);
  const currentWeek = weekStartOf(today);

  // Remember Day or Week between visits.
  useEffect(() => { try { const t = localStorage.getItem("sprout_dayboard_tab"); if (t === "week") setTab("week"); } catch {} }, []);
  const chooseTab = (t) => { setTab(t); try { localStorage.setItem("sprout_dayboard_tab", t); } catch {} };

  // Midnight in New York: move today forward and reload so the auto-push shows up.
  useEffect(() => {
    const id = setInterval(() => {
      const t = todayET();
      if (t !== todayRef.current) {
        const old = todayRef.current;
        setToday(t);
        setViewDay((d) => (d === old ? t : d));
        syncedRef.current = false;
        setWeeks({});
      }
    }, 60000);
    return () => clearInterval(id);
  }, []);

  const loadWeek = useCallback(async (w) => {
    setWeeks((p) => ({ ...p, [w]: { tasks: p[w]?.tasks || [], loading: true, error: null } }));
    if (w === weekStartOf(todayRef.current)) await rollForwardTasks(todayRef.current);
    const { data, error } = await fetchWeekTasks(w);
    setWeeks((p) => ({ ...p, [w]: { tasks: data, loading: false, error } }));
  }, []);

  const loadCal = useCallback(async (w) => {
    setCals((p) => ({ ...p, [w]: { events: p[w]?.events || [], loading: true, error: null } }));
    const { data, error } = await fetchDayBoardCalendar(w, addDays(w, 6));
    setCals((p) => ({ ...p, [w]: { events: data, loading: false, error } }));
  }, []);

  useEffect(() => { if (!weeks[ws]) loadWeek(ws); }, [ws, weeks, loadWeek]);
  useEffect(() => { if (!cals[ws]) loadCal(ws); }, [ws, cals, loadCal]);
  useEffect(() => {
    const w = menu?.pickWeek;
    if (!w) return;
    if (!weeks[w]) loadWeek(w);
    if (!cals[w]) loadCal(w);
  }, [menu?.pickWeek, weeks, cals, loadWeek, loadCal]);

  // Mirror CRM follow-ups into this week's bank, once per load of the current week.
  useEffect(() => {
    const cw = weeks[currentWeek];
    if (syncedRef.current || !contacts.length || !cw || cw.loading || cw.error) return;
    syncedRef.current = true;
    (async () => {
      const { data: existing, error } = await fetchTaskActionKeys();
      if (error) { console.warn("day board sync:", error); return; }
      const startPriority = Math.max(0, ...cw.tasks.map((t) => t.priority || 0));
      const args = { existing, weekStart: currentWeek, startPriority };
      let plan = syncPlan({ ...args, actions: crmOpenActions(contacts, orgs) });

      // The page's CRM copy may be older than the database (another tab, the CRM's MCP).
      // Re-read every record this sync would touch, then plan again from the fresh copies.
      const byId = new Map(existing.map((t) => [t.id, t]));
      const keys = [...plan.inserts.map((r) => r.action_key), ...plan.updates.map((u) => byId.get(u.id).action_key), ...plan.closeIds.map((id) => byId.get(id).action_key)];
      if (keys.length) {
        const cIds = new Set(), oIds = new Set();
        keys.forEach((k) => { const r = recordOfKey(k); if (r.orgId) oIds.add(r.orgId); else cIds.add(r.contactId); });
        const fresh = await fetchCrmRecordsByIds({ contactIds: [...cIds], orgIds: [...oIds] });
        if (fresh.error) { console.warn("day board sync:", fresh.error); return; }
        plan = syncPlan({
          ...args,
          actions: crmOpenActions(
            contacts.filter((c) => !cIds.has(c.id)).concat(fresh.contacts),
            orgs.filter((o) => !oIds.has(o.id)).concat(fresh.orgs),
          ),
        });
      }

      const errors = [];
      const r1 = await insertTasks(plan.inserts); if (r1.error) errors.push(r1.error);
      for (const u of plan.updates) { const r = await updateTask(u.id, u.patch); if (r.error) errors.push(r.error); }
      const r2 = await closeTasks(plan.closeIds); if (r2.error) errors.push(r2.error);
      if (errors.length) console.warn("day board sync:", errors.join("; "));
      if (plan.inserts.length || plan.updates.length || plan.closeIds.length) loadWeek(currentWeek);
    })();
  }, [contacts, orgs, weeks, currentWeek, loadWeek]);

  // Arrow keys step through days.
  useEffect(() => {
    const onKey = (e) => {
      if (tab !== "day" || document.querySelector("dialog[open]") || e.target.closest?.("input,textarea,select,[contenteditable]")) return;
      if (e.key === "ArrowLeft") setViewDay((d) => addDays(d, -1));
      if (e.key === "ArrowRight") setViewDay((d) => addDays(d, 1));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [tab]);

  const contactById = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);
  const orgById = useMemo(() => new Map(orgs.map((o) => [o.id, o])), [orgs]);
  const whoOf = (t) => (t.contact_id ? contactById.get(t.contact_id) && contactName(contactById.get(t.contact_id)) : t.org_id ? orgById.get(t.org_id)?.name : "") || "";
  const allTasks = () => Object.values(weeks).flatMap((w) => w.tasks || []);
  const findTask = (id) => allTasks().find((t) => t.id === id);

  /* ── writes ── */
  const setWeekTasks = (w, fn) => setWeeks((p) => (p[w] ? { ...p, [w]: { ...p[w], tasks: fn(p[w].tasks) } } : p));

  const patchTask = async (t, patch) => {
    const from = t.week_start;
    const to = patch.week_start || from;
    const next = { ...t, ...patch };
    if (to === from) setWeekTasks(from, (l) => l.map((x) => (x.id === t.id ? next : x)));
    else { setWeekTasks(from, (l) => l.filter((x) => x.id !== t.id)); setWeekTasks(to, (l) => [...l, next]); }
    const { error } = await updateTask(t.id, patch);
    if (error) {
      showToast(`Couldn't save: ${error}`, "err");
      loadWeek(from);
      if (to !== from) loadWeek(to);
      return false;
    }
    return true;
  };

  const crmRecord = (t) => (t.contact_id ? contactById.get(t.contact_id) : t.org_id ? orgById.get(t.org_id) : null);
  const saveCrm = (t, rec) => (t.contact_id ? onSaveContact(rec) : onSaveOrg(rec));
  const crmLinked = (t) => t.kind === "follow_up" && t.action_key && (t.contact_id || t.org_id);
  // Saving writes the whole record, so start from the database copy, not the page's.
  const freshRecord = async (t) => {
    const r = await fetchCrmRecordsByIds({ contactIds: t.contact_id ? [t.contact_id] : [], orgIds: t.org_id ? [t.org_id] : [] });
    return (t.contact_id ? r.contacts[0] : r.orgs[0]) || crmRecord(t);
  };

  const complete = async (t) => {
    if (!(await patchTask(t, { done: true, done_at: new Date().toISOString() }))) return;
    if (!crmLinked(t)) return;
    const rec = await freshRecord(t);
    if (rec) saveCrm(t, completeCrmAction(rec, t));
  };
  const undo = async (t) => {
    if (!(await patchTask(t, { done: false, done_at: null }))) return;
    if (!crmLinked(t)) return;
    const rec = await freshRecord(t);
    if (rec) saveCrm(t, reopenCrmAction(rec, t));
  };
  const pushGo = async (t) => {
    const patch = pushPatch(t, pushNote.trim());
    setPushOpenId(null);
    setPushNote("");
    if (await patchTask(t, patch)) showToast(patch.day ? `Pushed to ${shortDay(patch.day)}` : "Pushed to next week's bank");
  };

  const followUpGo = async () => {
    const t = findTask(fu.id);
    if (!t) { setFu(null); return; }
    if (!fu.pick) { setFu({ ...fu, error: "Pick the day you want to follow up." }); return; }
    const date = fu.pick;
    const text = fu.note.trim() || t.title;
    setFu(null);
    if (!(await patchTask(t, { done: true, done_at: new Date().toISOString() }))) return;
    let key = null;
    const rec = crmLinked(t) ? await freshRecord(t) : null;
    if (rec) {
      const added = addCrmFollowUp(completeCrmAction(rec, t), text, date, Boolean(t.contact_id));
      saveCrm(t, added.rec);
      key = added.key;
    }
    const w = weekStartOf(date);
    const row = {
      id: newTaskId(), title: text, category: t.category, hours: 1, week_start: w, day: date,
      priority: t.priority || 0, kind: "follow_up", contact_id: t.contact_id || null, org_id: t.org_id || null,
      action_key: key, due: date, pushes: [], done: false, carried: false,
    };
    const { error } = await insertTasks([row]);
    if (error) { showToast(`Couldn't add the follow-up: ${error}`, "err"); return; }
    setWeekTasks(w, (l) => [...l, row]);
    showToast(`Follow-up set for ${shortDay(date)}`);
  };

  const reorder = async (t, dir) => {
    const bank = (weeks[t.week_start]?.tasks || []).filter((x) => x.day === null).sort(byPriority);
    const i = bank.findIndex((x) => x.id === t.id);
    const other = bank[i + dir];
    if (!other) return;
    const a = t.priority || 0, b = other.priority || 0;
    const [pa, pb] = a === b ? [b + dir, a] : [b, a];
    await Promise.all([patchTask(t, { priority: pa }), patchTask(other, { priority: pb })]);
  };

  const moveGo = async () => {
    const t = findTask(menu.id);
    const pick = menu.pick;
    setMenu(null);
    if (t && pick && (await patchTask(t, { day: pick, week_start: weekStartOf(pick) }))) showToast(`Moved to ${shortDay(pick)}`);
  };

  const removeTask = async (t) => {
    setMenu(null);
    setWeekTasks(t.week_start, (l) => l.filter((x) => x.id !== t.id));
    const { error } = await deleteTask(t.id);
    if (error) { showToast(`Couldn't delete: ${error}`, "err"); loadWeek(t.week_start); } else showToast("Task deleted");
  };

  const addGo = async () => {
    if (!add.title.trim()) { setAdd({ ...add, error: "Give the task a name." }); return; }
    const day = add.day === "bank" ? null : add.day;
    const list = weeks[ws]?.tasks || [];
    const row = {
      id: newTaskId(), title: add.title.trim(), category: add.category, hours: Number(add.hours), week_start: ws, day,
      priority: Math.max(0, ...list.map((x) => x.priority || 0)) + 1, kind: "task", pushes: [], done: false, carried: false,
    };
    setAdd(null);
    const { error } = await insertTasks([row]);
    if (error) { showToast(`Couldn't add the task: ${error}`, "err"); return; }
    setWeekTasks(ws, (l) => [...l, row]);
    showToast(`Added to ${day ? shortDay(day) : "the weekly bank"}`);
  };

  const handlers = {
    complete, undo, pushGo,
    pushOpen: (t) => { setPushOpenId(t.id); setPushNote(""); },
    followUp: (t) => setFu({ id: t.id, month: today.slice(0, 7), pick: null, note: "", error: null }),
    menu: (t) => setMenu({ id: t.id, step: "menu", pickWeek: t.week_start < currentWeek ? currentWeek : t.week_start, pick: null }),
    place: (t) => setMenu({ id: t.id, step: "move", pickWeek: t.week_start < currentWeek ? currentWeek : t.week_start, pick: null }),
    reorder,
  };
  const push = { openId: pushOpenId, note: pushNote, setNote: setPushNote, cancel: () => { setPushOpenId(null); setPushNote(""); } };

  /* ── derived ── */
  const wk = weeks[ws];
  const cal = cals[ws];
  const tasks = wk?.tasks || [];
  const events = cal?.events || [];
  const dayTasks = tasks.filter((t) => t.day === viewDay).sort(byPriority);
  const dayEvents = events.filter((e) => e.date === viewDay);
  const bank = tasks.filter((t) => t.day === null).sort(byPriority);
  const totals = weekTotals(tasks, events, today);
  const sprout = sproutTotals(events);
  const overdue = tasks.filter((t) => !t.done && daysLate(t, today) > 0).length;
  const isToday = viewDay === today;

  const dayLoad = (d) => {
    const w = weekStartOf(d);
    const ev = (cals[w]?.events || []).filter((e) => e.date === d && !e.allDay);
    return {
      ready: Boolean(weeks[w] && !weeks[w].loading && cals[w] && !cals[w].loading),
      mine: ev.filter((e) => e.cal === "mine").reduce((a, e) => a + e.end - e.start, 0),
      sprout: ev.filter((e) => e.cal === "sprout").reduce((a, e) => a + e.end - e.start, 0),
      task: (weeks[w]?.tasks || []).filter((t) => t.day === d).reduce((a, t) => a + t.hours, 0),
    };
  };

  const calNote = cal?.error ? (
    <div className="db-warnline"><span>{cal.error}</span><button type="button" className="db-undo" onClick={() => loadCal(ws)}>Try again</button></div>
  ) : null;

  const meterCard = (
    <div className="db-card db-pad">
      <div className="db-eyebrow">{ws === currentWeek ? "This week so far" : `Week of ${weekLabel(ws)}`}</div>
      <div className="db-totline">
        <span className="db-big mono">{fmtH(totals.done)} / {fmtH(totals.plan)} hrs</span>
        <span className="db-sub">done of what the week asks for</span>
      </div>
      {totals.plan > 0 ? (
        <div className="db-meters">
          {[...CAT_ORDER, "none"].filter((k) => totals.cats[k].plan > 0).map((k) => (
            <Meter key={k} cat={k} done={totals.cats[k].done} plan={totals.cats[k].plan} foot={meterFoot(totals.cats[k])} />
          ))}
        </div>
      ) : <p className="db-sub" style={{ marginTop: 8 }}>No tasks or calendar time this week yet.</p>}
    </div>
  );

  const sproutCard = (
    <div className="db-card db-pad">
      <div className="db-eyebrow">Sprout calendar {ws === currentWeek ? "this week" : ""}</div>
      <div className="db-totline"><span className="db-big mono">{hm(sprout.total)}</span><span className="db-sub">Its own total. Not in your hours.</span></div>
      {sprout.groups.length > 0 && (
        <div className="db-brk">{sprout.groups.map(([title, m]) => <div key={title}><span>{title}</span><span className="mono">{hm(m)}</span></div>)}</div>
      )}
    </div>
  );

  const loadingOrError = !wk || (wk.loading && !wk.tasks.length)
    ? <p className="db-sub" style={{ padding: 17 }}>Loading…</p>
    : wk.error ? <p className="db-err" style={{ padding: 17 }}>Couldn&apos;t load tasks: {wk.error}</p> : null;

  /* ── views ── */
  const dayView = (
    <div className="db-grid2">
      <div className="db-stack">
        <div className="db-card">
          <div className="db-daybar">
            <div><div className="db-eyebrow">Sprout hours {isToday ? "today" : `on ${shortDay(viewDay)}`}</div><div className="db-big mono">{hm(dayTasks.reduce((a, t) => a + t.hours * 60, 0))}</div></div>
            <div style={{ textAlign: "right" }}><div className="db-eyebrow">Done</div><div className="db-big mono">{dayTasks.filter((t) => t.done).length} / {dayTasks.length}</div></div>
          </div>
          {calNote}
          {dayEvents.length > 0 && (
            <>
              <div className="db-group db-eyebrow">On the calendar</div>
              <ul className="db-rows">{dayEvents.map((e) => <CalRow key={e.id} e={e} />)}</ul>
            </>
          )}
          <div className="db-group db-eyebrow">{isToday ? "To do today" : viewDay < today ? "That day" : "Planned"} <span>in priority order</span></div>
          {loadingOrError || (dayTasks.length ? (
            <ul className="db-rows">
              {dayTasks.map((t) => <TaskRow key={t.id} t={t} who={whoOf(t)} today={today} push={push} h={handlers} />)}
            </ul>
          ) : (
            <div className="db-empty">
              <b>Nothing {viewDay < today ? "on" : "planned for"} {isToday ? "today" : shortDay(viewDay)}</b>
              Place something from the weekly bank, or add a task.<br />
              <button type="button" className="db-act pri" onClick={() => chooseTab("week")}>Plan the week</button>
            </div>
          ))}
        </div>
      </div>
      <div className="db-stack">
        {meterCard}
        {sproutCard}
        <div className="db-card db-pad">
          <div className="db-eyebrow">Weekly bank</div>
          <div className="db-totline">
            <span className="db-big"><span className="mono">{bank.length}</span> task{bank.length === 1 ? "" : "s"} · <span className="mono">{fmtH(bank.reduce((a, t) => a + t.hours, 0))}</span> hrs</span>
            <span className="db-sub">not on a day yet</span>
          </div>
          {bank.length ? (
            <ul className="db-minibank">
              {bank.slice(0, 3).map((t) => <li key={t.id} style={{ "--cat": catInfo(t.category).color }}><span className="db-sw" />{whoOf(t) ? `${whoOf(t)}: ${t.title}` : t.title}</li>)}
              {bank.length > 3 && <li className="db-sub">and {bank.length - 3} more</li>}
            </ul>
          ) : <p className="db-sub" style={{ margin: "8px 0 12px" }}>Everything this week has a day.</p>}
          <button type="button" className="db-act" onClick={() => chooseTab("week")}>Plan the week</button>
        </div>
      </div>
    </div>
  );

  const weekView = (
    <>
      <div className="db-card" style={{ marginBottom: 18 }}>
        <div className="db-card-hd">
          <div><h2>Weekly bank</h2><p className="db-sub">CRM follow-ups due this week, overdue ones, and whatever carried over. Put each on a day with room.</p></div>
          <span className="db-sub mono">{bank.length} tasks · {fmtH(bank.reduce((a, t) => a + t.hours, 0))} hrs</span>
        </div>
        {loadingOrError || (bank.length ? (
          <ul className="db-rows">
            {bank.map((t, i) => <TaskRow key={t.id} t={t} who={whoOf(t)} today={today} bank first={i === 0} last={i === bank.length - 1} push={push} h={handlers} />)}
          </ul>
        ) : (
          <div className="db-empty">
            <b>The bank is empty</b>
            Everything this week has a day. New CRM follow-ups land here on their own.<br />
            <button type="button" className="db-act pri" onClick={() => setAdd({ title: "", category: "admin", hours: "1", day: "bank", error: null })}>+ Add task</button>
          </div>
        ))}
      </div>
      <div className="db-legend">
        <span><span className="db-hsw" style={{ background: "var(--sunk)", borderStyle: "solid" }} />Your calendar</span>
        <span><span className="db-hsw" />Sprout calendar</span>
        <span>Colored: tasks by category. Tap one for its menu.</span>
      </div>
      {calNote && <div style={{ marginBottom: 10 }}>{calNote}</div>}
      <div className="db-card">
        <div className="db-weekscroll">
          <div className="db-week">
            {weekDays(ws).map((d) => {
              const L = dayLoad(d);
              return (
                <div key={d} className={`db-wd${d === today ? " today" : ""}`}>
                  <h4>
                    <span className="d">
                      <button type="button" className="db-dayjump" aria-label={`Open ${weekdayLong(d)} in Day view`} onClick={() => { setViewDay(d); chooseTab("day"); }}>{weekdayShort(d)}</button>
                      <span className="mono">{monthDayShort(d)}</span>
                    </span>
                    <span className="db-load mono">You {hm(L.mine)} · Sprout {hm(L.sprout)}</span>
                    <span className="db-load mono">Tasks {fmtH(L.task)} hrs</span>
                  </h4>
                  <div className="db-wcol">
                    {events.filter((e) => e.date === d).map((e) => (
                      <div key={e.id} className={`db-ev ${e.cal === "sprout" ? "sprout" : "cal"}`}>
                        <span className="evt mono">{e.allDay ? "All day" : `${clock(e.start)} to ${clock(e.end)}`}</span>
                        <span className="evn">{e.title}</span>
                      </div>
                    ))}
                    {tasks.filter((t) => t.day === d).sort((a, b) => (a.done - b.done) || byPriority(a, b)).map((t) => (
                      <button key={t.id} type="button" className={`db-ev task${t.done ? " done" : ""}`} style={{ "--cat": catInfo(t.category).color }} onClick={() => handlers.menu(t)}>
                        <span className="evt mono">{t.done ? "✓ " : ""}{hrsTxt(t.hours)}</span>
                        <span className="evn">{whoOf(t) ? `${whoOf(t)}: ${t.title}` : t.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="db-meterrow">
        {[...CAT_ORDER, "none"].filter((k) => totals.cats[k].plan > 0).map((k) => (
          <div key={k} className="db-card db-pad"><Meter cat={k} done={totals.cats[k].done} plan={totals.cats[k].plan} foot={meterFoot(totals.cats[k])} /></div>
        ))}
        {sproutCard}
      </div>
    </>
  );

  /* ── dialogs ── */
  const menuTask = menu ? findTask(menu.id) : null;
  let menuBody = null;
  if (menu && menuTask) {
    const t = menuTask;
    const who = whoOf(t);
    const late = daysLate(t, today);
    const where = t.day ? shortDay(t.day) : "Weekly bank";
    const head = (
      <DialogHead id="dbMenuH" onClose={() => setMenu(null)}
        eyebrow={menu.step === "move" ? "Move" : `${where} · ${hrsTxt(t.hours)}`}
        title={who ? `${who}: ${t.title}` : t.title}
        sub={`${catInfo(t.category).name} · ${t.kind === "follow_up" ? "Follow-up" : "Task"}${late ? ` · ${late} days late` : ""}`} />
    );
    if (menu.step === "move") {
      const pw = menu.pickWeek;
      menuBody = (
        <>
          {head}
          <div className="db-lm">
            <p className="db-sub">Each day shows what&apos;s already on it. Pick one with room.</p>
            <div className="db-weeknav">
              <button type="button" className="db-act" aria-label="Previous week" disabled={pw <= currentWeek} onClick={() => setMenu({ ...menu, pickWeek: addDays(pw, -7), pick: null })}>‹</button>
              <b>{weekLabel(pw)}</b>
              <button type="button" className="db-act" aria-label="Next week" disabled={pw >= addDays(currentWeek, 49)} onClick={() => setMenu({ ...menu, pickWeek: addDays(pw, 7), pick: null })}>›</button>
            </div>
            <div className="db-daypick">
              {weekDays(pw).map((d) => {
                const L = dayLoad(d);
                const cur = t.day === d;
                return (
                  <button key={d} type="button" className={`db-dp${cur ? " cur" : ""}`} disabled={d < today || cur}
                    aria-pressed={menu.pick === d} onClick={() => setMenu({ ...menu, pick: d })}>
                    <b>{weekdayShort(d)}</b><span className="mono">{monthDayShort(d)}</span>
                    {L.ready ? (<><small>You {hm(L.mine)}</small><small>Sprout {hm(L.sprout)}</small><small>Tasks {fmtH(L.task)} hrs</small></>) : <small>Loading…</small>}
                    {cur && <em>Now</em>}
                  </button>
                );
              })}
            </div>
            {menu.pick && (
              <div className="db-confirm">
                <div><b>From</b> {where}</div>
                <div><b>To</b> {shortDay(menu.pick)}, with {fmtH(dayLoad(menu.pick).task)} hrs of tasks already there</div>
              </div>
            )}
            <div className="db-acts" style={{ marginTop: 0 }}>
              <button type="button" className="db-act pri" disabled={!menu.pick} onClick={moveGo}>Move the task</button>
              <button type="button" className="db-act" onClick={() => setMenu({ ...menu, step: "menu", pick: null })}>Back</button>
            </div>
          </div>
        </>
      );
    } else {
      const rec = crmRecord(t);
      menuBody = (
        <>
          {head}
          <div className="db-lm">
            {(t.pushes || []).length > 0 && <div>{t.pushes.map((p, i) => <PushLine key={i} p={p} weekStart={t.week_start} />)}</div>}
            <div>
              <div className="db-eyebrow" style={{ marginBottom: 7 }}>Hours it needs</div>
              <div className="db-segs">
                {[0.5, 1, 2, 3, 4].map((h) => (
                  <button key={h} type="button" className="db-act" aria-pressed={t.hours === h} onClick={() => patchTask(t, { hours: h })}>{hrsTxt(h)}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="db-eyebrow" style={{ marginBottom: 7 }}>Category</div>
              <div className="db-chips">
                {CAT_ORDER.map((k) => (
                  <button key={k} type="button" style={{ "--cat": CATS[k].color }} aria-pressed={t.category === k} onClick={() => patchTask(t, { category: k })}>
                    <span className="db-sw" />{CATS[k].name}
                  </button>
                ))}
              </div>
            </div>
            <ul className="db-menulist">
              <li><button type="button" className="db-menuitem" onClick={() => setMenu({ ...menu, step: "move", pick: null })}><span><b>Move to another day</b><small>See what&apos;s on each day, then pick one</small></span></button></li>
              {t.day && <li><button type="button" className="db-menuitem" onClick={async () => { setMenu(null); if (await patchTask(t, { day: null })) showToast("Back in the weekly bank"); }}><span><b>Back to the weekly bank</b><small>Take it off {where} without a day</small></span></button></li>}
              {rec && t.contact_id && <li><button type="button" className="db-menuitem" onClick={() => { setMenu(null); openContact(rec); }}><span><b>Open {who} in the CRM</b><small>Contact, history and next actions</small></span></button></li>}
              {rec && t.org_id && <li><button type="button" className="db-menuitem" onClick={() => { setMenu(null); setView("orgs"); }}><span><b>Open Organizations</b><small>{who} is there, with its history and next action</small></span></button></li>}
              {!t.action_key && <li><button type="button" className="db-menuitem danger" onClick={() => removeTask(t)}><span><b>Delete task</b><small>Removes it for good</small></span></button></li>}
            </ul>
          </div>
        </>
      );
    }
  }

  const fuTask = fu ? findTask(fu.id) : null;
  const fuLinked = fuTask && fuTask.kind === "follow_up" && fuTask.action_key && crmRecord(fuTask);

  return (
    <div className="page db">
      <style>{DB_STYLES}</style>
      <header className="db-top">
        <div>
          <div className="db-eyebrow">{tab === "day" ? `${weekdayLong(viewDay)}${isToday ? " · Today" : ""}` : "Week of"}</div>
          <h1>{tab === "day" ? monthDay(viewDay) : weekLabel(ws)}</h1>
          <div className="db-sum">
            <span><b className="mono">{fmtH(dayTasks.reduce((a, t) => a + t.hours, 0))}</b> hrs of tasks {isToday ? "today" : `on ${shortDay(viewDay)}`}</span>
            <span><b className="mono">{dayTasks.filter((t) => t.done).length} / {dayTasks.length}</b> done</span>
            <span><b className="mono">{bank.length}</b> in the weekly bank</span>
            <span className={overdue ? "crit" : ""}><b className="mono">{overdue}</b> overdue follow-up{overdue === 1 ? "" : "s"}</span>
          </div>
        </div>
        <div className="db-top-r">
          <span className="db-nav">
            <button type="button" className="db-act" aria-label={tab === "day" ? "Previous day" : "Previous week"} onClick={() => setViewDay((d) => addDays(d, tab === "day" ? -1 : -7))}>‹</button>
            <button type="button" className="db-act" disabled={tab === "day" ? isToday : ws === currentWeek} onClick={() => setViewDay(today)}>{tab === "day" ? "Today" : "This week"}</button>
            <button type="button" className="db-act" aria-label={tab === "day" ? "Next day" : "Next week"} onClick={() => setViewDay((d) => addDays(d, tab === "day" ? 1 : 7))}>›</button>
          </span>
          <span className="db-seg" role="group" aria-label="View">
            <button type="button" aria-pressed={tab === "day"} onClick={() => chooseTab("day")}>Day</button>
            <button type="button" aria-pressed={tab === "week"} onClick={() => chooseTab("week")}>Week</button>
          </span>
          <button type="button" className="db-act pri lg" onClick={() => setAdd({ title: "", category: "admin", hours: "1", day: tab === "day" && viewDay >= today ? viewDay : "bank", error: null })}>+ Add task</button>
        </div>
      </header>

      {tab === "day" ? dayView : weekView}

      <Dialog open={Boolean(menu && menuTask)} wide={menu?.step === "move"} labelledBy="dbMenuH" onClose={() => setMenu(null)}>
        {menuBody}
      </Dialog>

      <Dialog open={Boolean(fu && fuTask)} labelledBy="dbFuH" onClose={() => setFu(null)}>
        {fu && fuTask && (
          <>
            <DialogHead id="dbFuH" eyebrow="Follow up" onClose={() => setFu(null)}
              title={whoOf(fuTask) ? `${whoOf(fuTask)}: ${fuTask.title}` : fuTask.title} sub={`${catInfo(fuTask.category).name} · pick the day to follow up`} />
            <div className="db-lm">
              <MonthCal month={fu.month} setMonth={(m) => setFu({ ...fu, month: m })} pick={fu.pick} setPick={(p) => setFu({ ...fu, pick: p, error: null })} today={today} />
              <div className="db-fld">
                <label className="db-eyebrow" htmlFor="dbFuNote">What&apos;s the follow-up? (optional)</label>
                <textarea id="dbFuNote" className="db-note" placeholder={fuTask.title} value={fu.note} onChange={(e) => setFu({ ...fu, note: e.target.value })} />
              </div>
              <p className="db-sub">
                {fuLinked
                  ? `Marks this done and sets ${whoOf(fuTask)}'s next action in the CRM to that day, as a 1-hour follow-up.`
                  : "Marks this done and adds a 1-hour follow-up on that day."}
              </p>
              {fu.error && <p className="db-err">{fu.error}</p>}
              <div className="db-acts" style={{ marginTop: 0 }}>
                <button type="button" className="db-act pri" onClick={followUpGo}>{fu.pick ? `Set follow-up for ${shortDay(fu.pick)}` : "Set follow-up"}</button>
                <button type="button" className="db-act" onClick={() => setFu(null)}>Cancel</button>
              </div>
            </div>
          </>
        )}
      </Dialog>

      <Dialog open={Boolean(add)} labelledBy="dbAddH" onClose={() => setAdd(null)}>
        {add && (
          <>
            <DialogHead id="dbAddH" eyebrow={`Week of ${weekLabel(ws)}`} title="Add a task" onClose={() => setAdd(null)} />
            <form className="db-lm" onSubmit={(e) => { e.preventDefault(); addGo(); }} noValidate>
              <div className="db-fld">
                <label className="db-eyebrow" htmlFor="dbAddTitle">What needs to get done?</label>
                <input id="dbAddTitle" className="db-field" autoFocus value={add.title} placeholder="Vol. 5 flyer" onChange={(e) => setAdd({ ...add, title: e.target.value, error: null })} />
              </div>
              <div>
                <div className="db-eyebrow" style={{ marginBottom: 7 }}>Category</div>
                <div className="db-chips">
                  {CAT_ORDER.map((k) => (
                    <button key={k} type="button" style={{ "--cat": CATS[k].color }} aria-pressed={add.category === k} onClick={() => setAdd({ ...add, category: k })}>
                      <span className="db-sw" />{CATS[k].name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="db-frow">
                <div className="db-fld">
                  <label className="db-eyebrow" htmlFor="dbAddHours">Hours it needs</label>
                  <select id="dbAddHours" className="db-field" value={add.hours} onChange={(e) => setAdd({ ...add, hours: e.target.value })}>
                    {["0.5", "1", "2", "3", "4"].map((h) => <option key={h} value={h}>{hrsTxt(Number(h))}</option>)}
                  </select>
                </div>
                <div className="db-fld">
                  <label className="db-eyebrow" htmlFor="dbAddDay">Put it on</label>
                  <select id="dbAddDay" className="db-field" value={add.day} onChange={(e) => setAdd({ ...add, day: e.target.value })}>
                    <option value="bank">The weekly bank</option>
                    {weekDays(ws).filter((d) => d >= today).map((d) => <option key={d} value={d}>{shortDay(d)}</option>)}
                  </select>
                </div>
              </div>
              {add.error && <p className="db-err">{add.error}</p>}
              <div className="db-acts" style={{ marginTop: 0 }}>
                <button type="submit" className="db-act pri">Add task</button>
                <button type="button" className="db-act" onClick={() => setAdd(null)}>Cancel</button>
              </div>
            </form>
          </>
        )}
      </Dialog>
    </div>
  );
}
