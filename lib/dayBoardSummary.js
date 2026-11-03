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

/** Every morning: everything on the Sprout calendar today and tomorrow. */
export function buildTodayTomorrow(today, todayEvents, tomorrowEvents) {
  const tomorrow = addDays(today, 1);
  const section = (label, day, evs) =>
    `<div style="font-size:12px;font-weight:900;letter-spacing:.05em;text-transform:uppercase;color:#6c6c61;padding:12px 0 3px;">${esc(label)} · ${esc(weekdayLong(day))}, ${esc(monthDay(day))}</div>` +
    (evs.length ? rows(evs) : `<div style="font-size:14px;color:#6c6c61;padding:3px 0;">Nothing on the calendar.</div>`);
  return {
    subject: `Today ${todayEvents.length} · Tomorrow ${tomorrowEvents.length} on the Sprout calendar`,
    html: shell({
      heading: "Today and tomorrow at Sprout",
      when: `${weekdayLong(today)}, ${monthDay(today)}`,
      body: section("Today", today, todayEvents) + section("Tomorrow", tomorrow, tomorrowEvents),
    }),
  };
}
