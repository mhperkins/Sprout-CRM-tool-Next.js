// lib/dayBoard.js — the Day Board's shared rules. Pure functions, no database access, so
// the browser board and the server's summary emails compute the same things the same way.
//
// Dates are "YYYY-MM-DD" strings in New York time. Calendar event times are minutes after
// midnight on that date. Weeks run Monday to Sunday.

export const TZ = "America/New_York";

/** Categories, each tied to the Google Calendar event color that marks it. */
export const CATS = {
  events:   { name: "Events & Programs",    gc: "Flamingo", color: "#E67C73", colorId: "4" },
  outreach: { name: "Outreach",             gc: "Peacock",  color: "#039BE5", colorId: "7" },
  admin:    { name: "Admin",                gc: "Graphite", color: "#616161", colorId: "8" },
  grants:   { name: "Grants & Fundraising", gc: "Banana",   color: "#F6BF26", colorId: "5" },
  personal: { name: "Personal",             gc: "Sage",     color: "#33B679", colorId: "2" },
};
export const CAT_ORDER = ["events", "outreach", "admin", "grants", "personal"];
export const UNCATEGORIZED = { name: "Uncategorized", gc: "no color", color: "#B9B9AE" };
export const catInfo = (key) => CATS[key] || UNCATEGORIZED;
export const categoryForColorId = (id) =>
  CAT_ORDER.find((k) => CATS[k].colorId === String(id ?? "")) || "none";

/* ─── dates ─────────────────────────────────────────────────────────────────── */

const partsFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

/** A moment as New York wall time: { date: "YYYY-MM-DD", minutes }. */
export function etParts(input = new Date()) {
  const p = Object.fromEntries(partsFmt.formatToParts(new Date(input)).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
}
export const todayET = (now = new Date()) => etParts(now).date;

const noonUTC = (iso) => new Date(`${iso}T12:00:00Z`);
export function addDays(iso, n) {
  const d = noonUTC(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
/** 0 = Monday ... 6 = Sunday */
export const weekdayIndex = (iso) => (noonUTC(iso).getUTCDay() + 6) % 7;
export const weekStartOf = (iso) => addDays(iso, -weekdayIndex(iso));
export const weekDays = (weekStart) => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

const WD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WD_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const md = (iso) => `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`;

export const shortDay = (iso) => `${WD[weekdayIndex(iso)]} ${md(iso)}`;
export const weekdayShort = (iso) => WD[weekdayIndex(iso)];
export const weekdayLong = (iso) => WD_LONG[weekdayIndex(iso)];
export const monthDay = (iso) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}`;
export const monthDayShort = md;
export const weekLabel = (weekStart) => {
  const end = addDays(weekStart, 6);
  return `${monthDay(weekStart)} to ${weekStart.slice(5, 7) === end.slice(5, 7) ? Number(end.slice(8, 10)) : monthDay(end)}`;
};
export const daysBetween = (a, b) => Math.round((noonUTC(b) - noonUTC(a)) / 864e5);

/* ─── formatting ────────────────────────────────────────────────────────────── */

export const fmtH = (n) => String(Math.round(Number(n || 0) * 4) / 4);
export const hrsTxt = (h) => (Number(h) === 0.5 ? "30 min" : `${fmtH(h)} hr${Number(h) === 1 ? "" : "s"}`);
export const hm = (mins) => `${Math.floor(mins / 60)}h ${String(Math.round(mins % 60)).padStart(2, "0")}m`;
export function clock(min) {
  const h = Math.floor(min / 60) % 24, m = min % 60;
  return `${((h + 11) % 12) + 1}${m ? ":" + String(m).padStart(2, "0") : ""}${h < 12 ? "am" : "pm"}`;
}

/* ─── tasks ─────────────────────────────────────────────────────────────────── */

export const newTaskId = () => `tsk_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
export const byPriority = (a, b) => (a.priority ?? 0) - (b.priority ?? 0) || String(a.created_at || "").localeCompare(String(b.created_at || ""));
export const daysLate = (task, today) =>
  task.kind === "follow_up" && task.due && task.due < today ? daysBetween(task.due, today) : 0;

/** Push = it didn't happen that day. Moves to the next day, or next week's bank from Sunday. */
export function pushPatch(task, note) {
  const next = addDays(task.day, 1);
  const pushes = [...(task.pushes || []), { from: task.day, note: note || "", auto: false, at: new Date().toISOString() }];
  if (next >= addDays(task.week_start, 7)) return { day: null, week_start: next, carried: true, pushes };
  return { day: next, pushes };
}

/* ─── CRM follow-ups ────────────────────────────────────────────────────────── */

function hashText(s) {
  let h = 5381;
  for (const ch of String(s || "")) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0;
  return h.toString(36);
}
export const contactName = (c) =>
  [c.first_name, c.last_name].filter(Boolean).join(" ").trim() || c.email || c.instagram_handle || c.id;

/**
 * Every open next action in the CRM, keyed so a task mirrors exactly one of them.
 * Contacts: each open next_actions[] entry, or the flat fields when the array has none.
 * Orgs: the single flat next action (orgs keep one current action by design).
 */
export function crmOpenActions(contacts = [], orgs = []) {
  const out = [];
  for (const c of contacts) {
    const open = (c.next_actions || []).filter((a) => !a.completed && a.date && a.text);
    if (open.length) {
      for (const a of open) out.push({ key: `ind:${c.id}:${a.id}`, contact_id: c.id, org_id: null, who: contactName(c), text: a.text, due: a.date });
    } else if (c.next_action && c.next_action_date) {
      out.push({ key: `ind:${c.id}:flat:${c.next_action_date}:${hashText(c.next_action)}`, contact_id: c.id, org_id: null, who: contactName(c), text: c.next_action, due: c.next_action_date });
    }
  }
  for (const o of orgs) {
    if (o.next_action && o.next_action_date) {
      out.push({ key: `org:${o.id}:${o.next_action_date}:${hashText(o.next_action)}`, contact_id: null, org_id: o.id, who: o.name || o.id, text: o.next_action, due: o.next_action_date });
    }
  }
  return out;
}

/**
 * An org (and a contact without a next_actions list) holds ONE current action, so its key
 * changes whenever the date or wording is edited. The slot is the part that doesn't.
 */
export const actionSlot = (key) => {
  const p = String(key || "").split(":");
  if (p[0] === "org") return `org:${p[1]}`;
  if (p[0] === "ind" && p[2] === "flat") return `ind:${p[1]}:flat`;
  return key;
};

/** The CRM record id a task's action_key points at. */
export const recordOfKey = (key) => {
  const [type, id] = String(key || "").split(":");
  return type === "org" ? { orgId: id } : { contactId: id };
};

/**
 * What to change so the task list mirrors the CRM for one week.
 * - A follow-up due by the end of the week (overdue included) with no task yet lands in the bank.
 * - A single-action record whose action was rescheduled or reworded updates its open task.
 * - An open follow-up task whose CRM action is no longer open was closed in the CRM: mark it done.
 * existing = [{ id, action_key, done }] across all weeks.
 */
export function syncPlan({ actions, existing, weekStart, startPriority = 0 }) {
  const weekEnd = addDays(weekStart, 6);
  const known = new Set(existing.map((t) => t.action_key));
  const openKeys = new Set(actions.map((a) => a.key));
  const openBySlot = new Map();
  for (const t of existing) {
    const slot = actionSlot(t.action_key);
    if (!t.done && !openKeys.has(t.action_key) && slot !== t.action_key) openBySlot.set(slot, t);
  }
  const updates = [];
  const rekeyed = new Set();
  const fresh = [];
  for (const a of actions) {
    if (known.has(a.key)) continue;
    const t = openBySlot.get(actionSlot(a.key));
    if (t && !rekeyed.has(t.id)) {
      updates.push({ id: t.id, patch: { action_key: a.key, title: a.text, due: a.due } });
      rekeyed.add(t.id);
    } else if (a.due <= weekEnd) {
      fresh.push(a);
    }
  }
  const inserts = fresh
    .sort((a, b) => a.due.localeCompare(b.due))
    .map((a, i) => ({
      id: newTaskId() + i,
      title: a.text,
      category: "outreach",
      hours: 1,
      week_start: weekStart,
      day: null,
      priority: startPriority + i + 1,
      kind: "follow_up",
      contact_id: a.contact_id,
      org_id: a.org_id,
      action_key: a.key,
      due: a.due,
    }));
  const closeIds = existing.filter((t) => !t.done && !openKeys.has(t.action_key) && !rekeyed.has(t.id)).map((t) => t.id);
  return { inserts, updates, closeIds };
}

const recomputeFlat = (nextActions) => {
  const first = nextActions.filter((a) => !a.completed && a.date).sort((a, b) => a.date.localeCompare(b.date))[0];
  return { next_action: first?.text || "", next_action_date: first?.date || "" };
};
const parseKey = (key) => {
  const [type, id, ...rest] = String(key || "").split(":");
  if (type === "ind" && rest[0] === "flat") return { type, id, flat: true };
  if (type === "ind") return { type, id, actionId: rest.join(":") };
  return { type, id, flat: true };
};

/** The CRM record after completing the action a task mirrors (same shape the detail panels write). */
export function completeCrmAction(rec, task) {
  const k = parseKey(task.action_key);
  const log = rec.next_actions_log || [];
  const loggedAt = new Date().toISOString();
  if (k.type === "ind" && !k.flat) {
    const entry = (rec.next_actions || []).find((a) => a.id === k.actionId);
    if (!entry || entry.completed) return rec;
    const nas = rec.next_actions.map((a) => (a.id === k.actionId ? { ...a, completed: true } : a));
    return { ...rec, next_actions: nas, ...recomputeFlat(nas), next_actions_log: [{ text: entry.text, date: entry.date || null, loggedAt, completed: true, action_id: entry.id }, ...log] };
  }
  if (!rec.next_action) return rec;
  return { ...rec, next_action: "", next_action_date: "", next_actions_log: [{ text: rec.next_action, date: rec.next_action_date || null, loggedAt, completed: true }, ...log] };
}

/** Undo a completion made from the board. */
export function reopenCrmAction(rec, task) {
  const k = parseKey(task.action_key);
  const log = rec.next_actions_log || [];
  const idx = log.findIndex((e) => e.completed && ((k.actionId && e.action_id === k.actionId) || (e.text === task.title && (e.date || null) === (task.due || null))));
  const newLog = idx >= 0 ? log.filter((_, i) => i !== idx) : log;
  if (k.type === "ind" && !k.flat) {
    if (!(rec.next_actions || []).some((a) => a.id === k.actionId)) return rec;
    const nas = rec.next_actions.map((a) => (a.id === k.actionId ? { ...a, completed: false } : a));
    return { ...rec, next_actions: nas, ...recomputeFlat(nas), next_actions_log: newLog };
  }
  // One current action per record: if a newer action has taken its place (a follow-up set
  // from the board, or an edit in the CRM), leave that one alone.
  if (rec.next_action && !(rec.next_action === task.title && (rec.next_action_date || "") === (task.due || ""))) return rec;
  return { ...rec, next_action: task.title, next_action_date: task.due || "", next_actions_log: newLog };
}

/** Add a dated follow-up to a CRM record. Returns { rec, key } for the new action. */
export function addCrmFollowUp(rec, text, date, isContact) {
  if (isContact) {
    const entry = { id: `na_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, text, date, completed: false };
    const nas = [entry, ...(rec.next_actions || [])];
    return { rec: { ...rec, next_actions: nas, ...recomputeFlat(nas) }, key: `ind:${rec.id}:${entry.id}` };
  }
  return { rec: { ...rec, next_action: text, next_action_date: date }, key: `org:${rec.id}:${date}:${hashText(text)}` };
}

/* ─── totals ────────────────────────────────────────────────────────────────── */

const eventMinutes = (e) => (e.allDay || e.start == null ? 0 : Math.max(0, e.end - e.start));

/**
 * Hours for a week by category: done out of what the week asks for.
 * Tasks count their hours; your own timed calendar events count once their day has passed
 * (planned until then). The Sprout calendar never counts here.
 */
export function weekTotals(tasks, events, today) {
  const cats = {};
  for (const k of [...CAT_ORDER, "none"]) cats[k] = { done: 0, plan: 0, followUps: 0, tasks: 0, events: 0 };
  for (const t of tasks) {
    const c = cats[t.category] || cats.none;
    const h = Number(t.hours) || 0;
    c.plan += h;
    if (t.done) c.done += h;
    if (t.kind === "follow_up") c.followUps++; else c.tasks++;
  }
  for (const e of events) {
    if (e.cal !== "mine") continue;
    const h = eventMinutes(e) / 60;
    if (!h) continue;
    const c = cats[e.category] || cats.none;
    c.plan += h;
    c.events++;
    if (e.date < today) c.done += h;
  }
  const done = Object.values(cats).reduce((a, c) => a + c.done, 0);
  const plan = Object.values(cats).reduce((a, c) => a + c.plan, 0);
  return { cats, done, plan };
}

/** The Sprout calendar's own total, grouped by event title. */
export function sproutTotals(events) {
  const groups = new Map();
  let total = 0;
  for (const e of events) {
    if (e.cal !== "sprout") continue;
    const m = eventMinutes(e);
    if (!m) continue;
    total += m;
    groups.set(e.title, (groups.get(e.title) || 0) + m);
  }
  return { total, groups: [...groups.entries()].sort((a, b) => b[1] - a[1]) };
}
