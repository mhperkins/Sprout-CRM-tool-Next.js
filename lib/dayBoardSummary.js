// lib/dayBoardSummary.js — SERVER ONLY. Builds the Sprout calendar emails: the Monday
// overview of the week and the morning email for today and tomorrow. Both list everything on
// the Sprout Google calendar, not just events in the CRM.

import { addDays, shortDay, weekdayLong, monthDay, weekLabel, eventTime } from "./dayBoard";

export const DAY_BOARD_TO = process.env.DAY_BOARD_TO || "maxperkins@sproutsociety.org";
export const APP_URL = process.env.APP_ORIGIN || "https://sprout-crm-tool-next-js.vercel.app";

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function rows(events) {
  return `<table width="100%" cellpadding="0" cellspacing="0">${events.map((e) =>
    `<tr><td style="width:112px;padding:3px 10px 3px 0;font-size:13px;color:#6c6c61;vertical-align:top;white-space:nowrap;">${esc(eventTime(e))}</td><td style="padding:3px 0;font-size:14px;line-height:1.45;color:#030000;">${esc(e.title)}</td></tr>`).join("")}</table>`;
}

function shell({ heading, when, body }) {
  return `<!doctype html><html><body style="margin:0;background:#F7F7F6;font-family:Lato,Helvetica,Arial,sans-serif;color:#030000;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7F6;padding:28px 12px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:8px;overflow:hidden;">
<tr><td style="background:#030000;padding:16px 24px;color:#fff;font-size:12px;font-weight:900;letter-spacing:2px;text-transform:uppercase;">Sprout Society</td></tr>
<tr><td style="height:4px;background:#C6C902;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:20px 24px 4px;">
<div style="font-size:22px;font-weight:900;line-height:1.25;">${esc(heading)}</div>
<div style="font-size:13px;color:#6c6c61;margin-top:4px;">${esc(when)}</div>
</td></tr>
<tr><td style="padding:12px 24px 0;">${body}</td></tr>
<tr><td style="padding:18px 24px 26px;"><a href="${esc(APP_URL)}" style="display:inline-block;background:#030000;color:#fff;font-weight:700;font-size:14px;text-decoration:none;padding:11px 20px;border-radius:6px;">Open the Day Board</a></td></tr>
</table></td></tr></table></body></html>`;
}

const onCalendar = (n) => `${n} on the calendar`;

/** Monday morning: the whole week on the Sprout calendar, day by day. */
export function buildMondayOverview(weekStart, events) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
    .map((d) => [d, events.filter((e) => e.date === d)]).filter(([, evs]) => evs.length);
  const body = days.length
    ? days.map(([d, evs]) => `<div style="font-size:12px;font-weight:900;letter-spacing:.05em;text-transform:uppercase;color:#6c6c61;padding:12px 0 3px;">${esc(shortDay(d))}</div>${rows(evs)}`).join("")
    : `<div style="font-size:14px;color:#6c6c61;">Nothing on the Sprout calendar this week.</div>`;
  return {
    subject: `This week at Sprout: ${onCalendar(events.length)}`,
    html: shell({ heading: "This week at Sprout", when: weekLabel(weekStart), body }),
  };
}

const age = (ms, now) => {
  const h = Math.max(0, Math.floor((now - ms) / 3600000));
  if (h < 48) return h < 24 ? `${h} hr` : "1 day";
  return `${Math.floor(h / 24)} days`;
};

const KIND_NOTE = { form: "website form", reply: "reply", direct: "" };

/** The "Waiting on you" list: people who wrote last and haven't heard back.
 *  `waiting` = list ([] hides the section), or null when the inbox check failed. */
export function waitingSection(waiting, now = Date.now()) {
  const label = (text, color) =>
    `<div style="font-size:12px;font-weight:900;letter-spacing:.05em;text-transform:uppercase;color:${color};padding:18px 0 3px;">${text}</div>`;
  if (waiting === null) {
    return label("Waiting on you", "#6c6c61") +
      `<div style="font-size:14px;color:#6c6c61;padding:3px 0;">Couldn't check the inboxes this morning.</div>`;
  }
  if (!waiting.length) return "";
  const items = waiting.map((w) => {
    const who = w.crm?.name || w.name || w.email;
    const inbox = w.account.split("@")[0] + "@";
    const kind = KIND_NOTE[w.kind] ? ` · ${KIND_NOTE[w.kind]}` : "";
    const crm = w.crm
      ? `<span style="color:#2a8ca0;">In CRM</span>${w.crm.nextActionDate ? ` · next action ${esc(monthDay(w.crm.nextActionDate))}` : " · no next action"}`
      : `<span style="color:#E10098;">Not in CRM</span>`;
    const snip = String(w.snippet || "").replace(/\s+/g, " ").trim();
    const short = snip.length > 110 ? snip.slice(0, 107) + "…" : snip;
    return `<tr><td style="padding:8px 0;border-top:1px solid #ECECEA;">
<div style="font-size:14px;line-height:1.4;"><a href="${esc(w.url)}" style="color:#030000;font-weight:700;text-decoration:none;">${esc(who)}</a> <span style="color:#6c6c61;font-size:13px;">· ${esc(inbox)}${esc(kind)} · ${esc(age(w.lastAt, now))}</span></div>
<div style="font-size:13px;line-height:1.45;color:#3a3a38;">${esc(w.subject)}${short ? ` · <span style="color:#6c6c61;">${esc(short)}</span>` : ""}</div>
<div style="font-size:12px;margin-top:2px;">${crm}</div>
</td></tr>`;
  }).join("");
  return label(`Waiting on you (${waiting.length})`, "#E10098") +
    `<table width="100%" cellpadding="0" cellspacing="0">${items}</table>`;
}

/** Every morning: everything on the Sprout calendar today and tomorrow, plus anyone
 *  waiting on a reply (see waitingSection for the `waiting` values). */
export function buildTodayTomorrow(today, todayEvents, tomorrowEvents, waiting = [], now = Date.now()) {
  const tomorrow = addDays(today, 1);
  const section = (label, day, evs) =>
    `<div style="font-size:12px;font-weight:900;letter-spacing:.05em;text-transform:uppercase;color:#6c6c61;padding:12px 0 3px;">${esc(label)} · ${esc(weekdayLong(day))}, ${esc(monthDay(day))}</div>` +
    (evs.length ? rows(evs) : `<div style="font-size:14px;color:#6c6c61;padding:3px 0;">Nothing on the calendar.</div>`);
  const n = waiting?.length || 0;
  return {
    subject: `Today ${todayEvents.length} · Tomorrow ${tomorrowEvents.length} on the Sprout calendar${n ? ` · ${n} waiting on you` : ""}`,
    html: shell({
      heading: "Today and tomorrow at Sprout",
      when: `${weekdayLong(today)}, ${monthDay(today)}`,
      body: section("Today", today, todayEvents) + section("Tomorrow", tomorrow, tomorrowEvents) + waitingSection(waiting, now),
    }),
  };
}
