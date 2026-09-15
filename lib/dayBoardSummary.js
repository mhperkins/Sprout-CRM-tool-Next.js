// lib/dayBoardSummary.js — SERVER ONLY. Builds the Day Board's two emails from the task
// table and both calendars: the daily recap and the weekly summary. Like Dasha-Board's
// recap, every section leads with its count; hours are in the accent color.

import { svc } from "./portalDb";
import { fetchCalendarEvents } from "./googleCalendar";
import {
  addDays, weekStartOf, shortDay, monthDayShort, weekLabel, fmtH, hrsTxt, hm, clock,
  byPriority, daysLate, weekTotals, sproutTotals, catInfo, CAT_ORDER, contactName,
} from "./dayBoard";

export const DAY_BOARD_TO = process.env.DAY_BOARD_TO || "maxperkins@sproutsociety.org";
export const APP_URL = process.env.APP_ORIGIN || "https://sprout-crm-tool-next-js.vercel.app";

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

async function tasksForWeeks(weekStarts) {
  const { data, error } = await svc().from("sprout_tasks").select("*").in("week_start", weekStarts);
  if (error) throw new Error("tasks: " + error.message);
  return (data || []).map((r) => ({ ...r, hours: Number(r.hours), pushes: Array.isArray(r.pushes) ? r.pushes : [] }));
}

async function whoMap(tasks) {
  const cIds = [...new Set(tasks.map((t) => t.contact_id).filter(Boolean))];
  const oIds = [...new Set(tasks.map((t) => t.org_id).filter(Boolean))];
  const map = {};
  if (cIds.length) {
    const { data } = await svc().from("sprout_contacts").select("id,first_name,last_name,email").in("id", cIds);
    for (const c of data || []) map[c.id] = contactName(c);
  }
  if (oIds.length) {
    const { data } = await svc().from("sprout_orgs").select("id,name").in("id", oIds);
    for (const o of data || []) map[o.id] = o.name;
  }
  return (t) => map[t.contact_id] || map[t.org_id] || "";
}

/** Latest end, in minutes, of a timed event on a day (either calendar). */
export function lastEventEnd(events, day) {
  return events.filter((e) => e.date === day && !e.allDay && e.end != null).reduce((m, e) => Math.max(m, e.end), 0);
}

/* ─── email pieces ──────────────────────────────────────────────────────────── */

const ACCENT = "#E10098";

function section(countHtml, sub, rows = []) {
  return `<tr><td style="padding:16px 0;border-bottom:1px solid #ececea;">
<div style="font-size:26px;font-weight:900;letter-spacing:-.5px;line-height:1.15;color:#030000;">${countHtml}</div>
${sub ? `<div style="font-size:13px;color:#6c6c61;margin:3px 0 ${rows.length ? 8 : 0}px;">${sub}</div>` : ""}
${rows.length ? `<table width="100%" cellpadding="0" cellspacing="0">${rows.map(([l, r]) =>
  `<tr><td style="width:64px;padding:3px 10px 3px 0;font-family:Menlo,Consolas,monospace;font-size:12px;color:#6c6c61;vertical-align:top;white-space:nowrap;">${esc(l)}</td><td style="padding:3px 0;font-size:14px;line-height:1.45;color:#030000;">${r}</td></tr>`).join("")}</table>` : ""}
</td></tr>`;
}

const hrs = (n) => `<span style="color:${ACCENT};">${esc(fmtH(n))} hr${Number(n) === 1 ? "" : "s"}</span>`;
const dot = (cat) => `<span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${catInfo(cat).color};margin-right:6px;"></span>`;

function shell({ heading, when, sections, cta }) {
  return `<!doctype html><html><body style="margin:0;background:#F7F7F6;font-family:Lato,Helvetica,Arial,sans-serif;color:#030000;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7F6;padding:28px 12px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:8px;overflow:hidden;">
<tr><td style="background:#030000;padding:16px 24px;color:#fff;font-size:12px;font-weight:900;letter-spacing:2px;text-transform:uppercase;">Sprout Society · Day Board</td></tr>
<tr><td style="height:4px;background:#C6C902;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:20px 24px 4px;">
<div style="font-size:22px;font-weight:900;line-height:1.25;">${esc(heading)}</div>
<div style="font-size:13px;color:#6c6c61;margin-top:4px;">${esc(when)}</div>
</td></tr>
<tr><td style="padding:0 24px;"><table width="100%" cellpadding="0" cellspacing="0">${sections.join("")}</table></td></tr>
<tr><td style="padding:18px 24px 26px;"><a href="${esc(APP_URL)}" style="display:inline-block;background:#030000;color:#fff;font-weight:700;font-size:14px;text-decoration:none;padding:11px 20px;border-radius:6px;">${esc(cta)}</a></td></tr>
</table></td></tr></table></body></html>`;
}

const pushNote = (t, day) => {
  const p = (t.pushes || []).filter((x) => x.from === day && !x.auto).pop();
  return p?.note ? `: "${esc(p.note)}"` : "";
};

/* ─── daily recap ───────────────────────────────────────────────────────────── */

export async function buildDailyRecap(day, events) {
  const ws = weekStartOf(day);
  const next = addDays(day, 1);
  const tasks = await tasksForWeeks([ws, addDays(ws, 7)]);
  const who = await whoMap(tasks);
  const label = (t) => (who(t) ? `${esc(who(t))}: ${esc(t.title)}` : esc(t.title));

  const done = tasks.filter((t) => t.day === day && t.done).sort(byPriority);
  const pushed = tasks.filter((t) => (t.pushes || []).some((p) => p.from === day && !p.auto));
  const notDone = tasks.filter((t) => (t.day === day && !t.done) || (t.pushes || []).some((p) => p.from === day && p.auto));
  const tomorrowEvents = events.filter((e) => e.date === next).sort((a, b) => (a.start ?? -1) - (b.start ?? -1));
  const tomorrowTasks = tasks.filter((t) => t.day === next && !t.done).sort(byPriority);
  const bank = tasks.filter((t) => t.week_start === weekStartOf(next) && t.day === null && !t.done);
  const overdue = tasks.filter((t) => !t.done && daysLate(t, day) > 0).sort((a, b) => a.due.localeCompare(b.due));
  const doneHrs = done.reduce((a, t) => a + t.hours, 0);
  const tomorrowHrs = tomorrowTasks.reduce((a, t) => a + t.hours, 0);
  const nextIsNewWeek = weekStartOf(next) !== ws;

  const sections = [
    section(`${done.length} done · ${hrs(doneHrs)}`, done.length ? "By category" : "Nothing marked complete today.",
      done.map((t) => [hrsTxt(t.hours), `${dot(t.category)}${esc(catInfo(t.category).name)}: ${label(t)}`])),
  ];
  if (pushed.length) sections.push(section(`${pushed.length} pushed`, "Moved on, with your note when you left one",
    pushed.map((t) => [hrsTxt(t.hours), `${label(t)}${pushNote(t, day)}${(t.pushes || []).length > 1 ? ` (pushed ${t.pushes.length}×)` : ""}`])));
  if (notDone.length) sections.push(section(`${notDone.length} not done`,
    nextIsNewWeek ? "They carry into next week's bank on their own at midnight." : `They move to ${shortDay(next)} on their own at midnight.`,
    notDone.map((t) => [hrsTxt(t.hours), label(t)])));
  sections.push(section(nextIsNewWeek ? `Tomorrow starts a new week` : `Tomorrow · ${hrs(tomorrowHrs)} of tasks`, shortDay(next), [
    ...tomorrowEvents.map((e) => [e.allDay ? "all day" : clock(e.start), `${esc(e.title)}${e.cal === "sprout" ? " (Sprout calendar)" : ""}`]),
    ...tomorrowTasks.map((t) => [hrsTxt(t.hours), label(t)]),
  ]));
  sections.push(section(`${bank.length} in the bank · ${overdue.length} overdue`,
    overdue.length ? `Oldest: ${label(overdue[0])}, ${daysLate(overdue[0], day)} days` : "No overdue follow-ups."));

  return {
    subject: `${shortDay(day)}: ${fmtH(doneHrs)} hrs done${pushed.length ? `, ${pushed.length} pushed` : ""}`,
    html: shell({ heading: `${shortDay(day)} recap`, when: "Daily recap · New York time", sections, cta: "Open the Day Board" }),
  };
}

/* ─── weekly summary ────────────────────────────────────────────────────────── */

export async function buildWeeklySummary(ws) {
  const prev = addDays(ws, -7);
  const nextWs = addDays(ws, 7);
  const [tasks, prevTasks] = await Promise.all([tasksForWeeks([ws]), tasksForWeeks([prev])]);
  const events = await fetchCalendarEvents(prev, addDays(ws, 6));
  const thisEvents = events.filter((e) => e.date >= ws);
  const totals = weekTotals(tasks, thisEvents, nextWs);
  const prevTotals = weekTotals(prevTasks, events.filter((e) => e.date < ws), ws);
  const sprout = sproutTotals(thisEvents);
  const who = await whoMap(tasks);
  const label = (t) => (who(t) ? `${esc(who(t))}: ${esc(t.title)}` : esc(t.title));

  const done = tasks.filter((t) => t.done);
  const open = tasks.filter((t) => !t.done);
  const manualPushes = tasks.flatMap((t) => t.pushes || []).filter((p) => !p.auto).length;
  const mostPushed = tasks.filter((t) => (t.pushes || []).length >= 2).sort((a, b) => b.pushes.length - a.pushes.length).slice(0, 3);
  const fuClosed = tasks.filter((t) => t.kind === "follow_up" && t.done).length;
  const fuNew = tasks.filter((t) => t.kind === "follow_up" && String(t.created_at) >= ws).length;
  const overdue = open.filter((t) => daysLate(t, nextWs) > 0);

  const nextEnd = addDays(nextWs, 6);
  const [{ count: cDue }, { count: oDue }] = await Promise.all([
    svc().from("sprout_contacts").select("id", { count: "exact", head: true }).gte("next_action_date", nextWs).lte("next_action_date", nextEnd),
    svc().from("sprout_orgs").select("id", { count: "exact", head: true }).gte("next_action_date", nextWs).lte("next_action_date", nextEnd),
  ]);

  const catRows = [...CAT_ORDER, "none"].filter((k) => totals.cats[k].plan || prevTotals.cats[k].done)
    .map((k) => [`${fmtH(totals.cats[k].done)} hrs`, `${dot(k)}${esc(catInfo(k).name)} <span style="color:#6c6c61;">(last week ${fmtH(prevTotals.cats[k].done)})</span>`]);

  const sections = [
    section(`${hrs(totals.done)} of your time`, `Last week: ${fmtH(prevTotals.done)} hrs`, catRows),
    section(`Sprout calendar · <span style="color:${ACCENT};">${esc(hm(sprout.total))}</span>`, "Separate from your hours",
      sprout.groups.map(([title, m]) => [hm(m), esc(title)])),
    section(`${done.length} done · ${manualPushes} pushed · ${open.length} open`, mostPushed.length ? "Pushed the most" : "",
      mostPushed.map((t) => [`${t.pushes.length}×`, label(t)])),
    section(`Follow-ups · ${fuClosed} closed, ${fuNew} new`, overdue.length ? `${overdue.length} still overdue` : "None overdue."),
    section(`Next week's bank · ${open.length} carrying over`,
      `${open.reduce((a, t) => a + t.hours, 0)} hrs carry over. ${(cDue || 0) + (oDue || 0)} CRM follow-up${(cDue || 0) + (oDue || 0) === 1 ? "" : "s"} due ${weekLabel(nextWs)}.`),
  ];

  return {
    subject: `Week of ${monthDayShort(ws)}: ${fmtH(totals.done)} Sprout hours`,
    html: shell({ heading: `Week of ${weekLabel(ws)}`, when: "Weekly summary · plan next week from the bank", sections, cta: "Plan next week" }),
  };
}
