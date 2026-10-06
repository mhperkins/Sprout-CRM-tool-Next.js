/**
 * grantMetrics.js — the proof-of-concept numbers for grant applications.
 *
 * Pure functions over the CRM's own records: events (with their Outcomes),
 * contacts (with their Membership), program submissions and showcase applications.
 * Nothing here writes. The Grant Metrics page and any future MCP tool share it.
 *
 * Counting rules:
 * - An event counts once its date has passed and it is not pending or cancelled.
 * - Repeating series are left out: one record stands for many nights, so a single
 *   headcount cannot describe it.
 * - Hosted by: Sprout always counts; Partner only when includePartners is on;
 *   Rental is reported on its own line and never counts as Sprout attendance.
 * - Headcount: the number typed in the Outcomes tile wins. When it is blank, the
 *   sign-ins for that night (every sign-in sheet in the Drive folder) fill it in, but only when exactly one
 *   held event falls on that date (two events on one night cannot split the count).
 * - Members: people and organizations both count, each from its Membership section.
 * - An event with no headcount either way still counts as held, and is listed as missing.
 */

const monthKey = (iso) => (iso || "").slice(0, 7);
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
export const monthLabel = (key) => { const [y, m] = key.split("-"); return `${MONTHS[Number(m) - 1]} ${y}`; };
const num = (v) => (v == null || v === "" ? null : Number(v));

export const hostedBy = (ev) => ev.outcomes?.hosted_by || "sprout";

/** Months from..to inclusive as "YYYY-MM" keys. */
export function monthsBetween(from, to) {
  const out = [];
  let [y, m] = from.slice(0, 7).split("-").map(Number);
  const [ty, tm] = to.slice(0, 7).split("-").map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m++; if (m > 12) { m = 1; y++; }
  }
  return out;
}

/** Was this contact an active (monthly/annual) member on a given date? */
export function memberOn(c, dateISO) {
  const m = c.membership;
  if (!m || m.plan === "day" || !m.start || m.start > dateISO) return false;
  if ((m.status || "active") === "active") return true;
  return !!m.end && m.end >= dateISO;
}

/** End-of-month date for a "YYYY-MM" key, capped at `cap`. */
const monthEnd = (key, cap) => {
  const [y, m] = key.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  return cap && last > cap ? cap : last;
};

/** The headcount used for each event: typed wins, else that night's kiosk sign-ins. */
export function effectiveHeadcounts(heldEvents, signins = {}) {
  const perDate = {};
  heldEvents.forEach(ev => { perDate[ev.event_date] = (perDate[ev.event_date] || 0) + 1; });
  const out = {};
  heldEvents.forEach(ev => {
    const typed = num(ev.outcomes?.headcount);
    if (typed != null) out[ev.id] = { n: typed, source: "typed" };
    else if (signins[ev.event_date] && perDate[ev.event_date] === 1) out[ev.id] = { n: signins[ev.event_date], source: "kiosk" };
  });
  return out;
}

export function computeGrantMetrics({ events = [], contacts = [], orgs = [], programEventIds = [], applications = [], signins = {}, from, to, today, includePartners = false }) {
  const end = to < today ? to : today;
  const inRange = (d) => !!d && d >= from && d <= end;

  const past = events.filter(ev =>
    inRange(ev.event_date) && !ev.recurrence && ev.status !== "pending" && ev.status !== "cancelled");
  const counted = past.filter(ev => { const h = hostedBy(ev); return h === "sprout" || (h === "partner" && includePartners); });
  const rentals = past.filter(ev => hostedBy(ev) === "rental");
  const heads = effectiveHeadcounts(past, signins);
  const headOf = (ev) => heads[ev.id]?.n ?? null;
  const skippedSeries = events.filter(ev => ev.recurrence && ev.event_date && ev.event_date <= end && ev.status !== "cancelled").length;

  const artistsBy = {};
  programEventIds.forEach(id => { artistsBy[id] = (artistsBy[id] || 0) + 1; });

  // People: how many counted events each linked contact appears on.
  const visits = {};
  counted.forEach(ev => (ev.contact_ids || []).forEach(id => { visits[id] = (visits[id] || 0) + 1; }));
  const unique = Object.keys(visits).length;
  const repeat = Object.values(visits).filter(n => n > 1).length;

  const withCount = counted.filter(ev => headOf(ev) != null);
  const missing = counted.filter(ev => headOf(ev) == null);
  const fromSheet = counted.filter(ev => heads[ev.id]?.source === "kiosk");
  const sum = (list, key) => list.reduce((s, ev) => s + (num(ev.outcomes?.[key]) || 0), 0);

  const apps = applications.filter(a => inRange((a.created_at || "").slice(0, 10)));

  // Members can be people or organizations; both carry the same membership shape.
  const memberRecs = contacts.concat(orgs);
  const payments = [];
  memberRecs.forEach(c => (c.membership?.payments || []).forEach(p => payments.push({ ...p, plan: c.membership.plan })));
  const paysInRange = payments.filter(p => inRange(p.date));
  const dayPasses = memberRecs.filter(c => c.membership?.plan === "day" && inRange(c.membership.start)).length;
  const newMembers = memberRecs.filter(c => c.membership && c.membership.plan !== "day" && inRange(c.membership.start)).length;

  const months = monthsBetween(from, end).map(key => {
    const evs = counted.filter(ev => monthKey(ev.event_date) === key);
    const rs = rentals.filter(ev => monthKey(ev.event_date) === key);
    return {
      key,
      label: monthLabel(key),
      events: evs.length,
      attendance: evs.reduce((s, ev) => s + (headOf(ev) || 0), 0),
      missing: evs.filter(ev => headOf(ev) == null).length,
      firstTimers: evs.reduce((s, ev) => s + (num(ev.outcomes?.first_timers) || 0), 0),
      artists: evs.reduce((s, ev) => s + (artistsBy[ev.id] || 0), 0),
      members: memberRecs.filter(c => memberOn(c, monthEnd(key, end))).length,
      dues: paysInRange.filter(p => monthKey(p.date) === key).reduce((s, p) => s + Number(p.amount || 0), 0),
      rentals: rs.length,
      rentalFees: rs.reduce((s, ev) => s + (num(ev.outcomes?.rental_fee) || 0), 0),
      // Per-event rows for the month's dropdown, counted events and rentals by date.
      list: evs.concat(rs).sort((a, b) => a.event_date.localeCompare(b.event_date)).map(ev => ({
        id: ev.id, name: ev.name, date: ev.event_date, hosted: hostedBy(ev),
        attendance: headOf(ev), source: heads[ev.id]?.source || null,
        typed: num(ev.outcomes?.headcount), signins: signins[ev.event_date] ?? null,
        firstTimers: num(ev.outcomes?.first_timers), artists: artistsBy[ev.id] || 0,
        rentalFee: hostedBy(ev) === "rental" ? num(ev.outcomes?.rental_fee) : null,
      })),
    };
  });

  // How people heard, among the unique people who came.
  const heard = {};
  const byId = new Map(contacts.map(c => [c.id, c]));
  Object.keys(visits).forEach(id => {
    const c = byId.get(id);
    const h = (c?.how_heard || "").trim();
    if (h) { const k = h.toLowerCase(); heard[k] = heard[k] || { label: h, n: 0 }; heard[k].n++; }
  });

  return {
    from, to: end,
    events: counted.length,
    partnerEvents: past.filter(ev => hostedBy(ev) === "partner").length,
    attendance: withCount.reduce((s, ev) => s + headOf(ev), 0),
    fromSheet: fromSheet.map(ev => ({ id: ev.id, name: ev.name, date: ev.event_date, n: headOf(ev) })),
    firstTimers: sum(withCount, "first_timers"),
    missing: missing.map(ev => ({ id: ev.id, name: ev.name, date: ev.event_date })),
    skippedSeries,
    unique, repeat,
    repeatRate: unique ? Math.round((repeat / unique) * 100) : 0,
    artists: counted.reduce((s, ev) => s + (artistsBy[ev.id] || 0), 0),
    applications: apps.length,
    activeMembers: memberRecs.filter(c => memberOn(c, end)).length,
    activeOrgMembers: orgs.filter(o => memberOn(o, end)).length,
    newMembers, dayPasses,
    dues: paysInRange.reduce((s, p) => s + Number(p.amount || 0), 0),
    rentals: rentals.length,
    rentalFees: sum(rentals, "rental_fee"),
    rentalsUnpaid: rentals.filter(ev => num(ev.outcomes?.rental_fee) && !ev.outcomes?.rental_paid).length,
    months,
    quotes: counted.concat(rentals)
      .filter(ev => (ev.outcomes?.quote || "").trim())
      .sort((a, b) => b.event_date.localeCompare(a.event_date))
      .map(ev => ({ text: ev.outcomes.quote.trim(), event: ev.name, date: ev.event_date })),
    heard: Object.values(heard).sort((a, b) => b.n - a.n).slice(0, 6),
    heardTotal: Object.values(heard).reduce((s, h) => s + h.n, 0),
  };
}

const fmtD = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const money = (n) => "$" + Math.round(n).toLocaleString();

/** Plain text Danielle can paste into an application. Only states numbers that exist. */
export function metricsToText(m, orgName = "Sprout Society") {
  const lines = [`${orgName} · ${fmtD(m.from)} to ${fmtD(m.to)}`];
  lines.push(`${m.events} community events held` + (m.attendance ? ` · ${m.attendance.toLocaleString()} total attendance` : ""));
  if (m.unique) lines.push(`${m.unique} unique people on our event lists · ${m.repeatRate}% came back for a second event`);
  if (m.firstTimers) lines.push(`${m.firstTimers} first-time guests`);
  if (m.artists || m.applications) lines.push([m.artists && `${m.artists} artists and performers featured`, m.applications && `${m.applications} applied to show`].filter(Boolean).join(" · "));
  if (m.activeMembers || m.newMembers) lines.push(`${m.activeMembers} active members` + (m.newMembers ? ` · ${m.newMembers} joined in this period` : "") + (m.dues ? ` · ${money(m.dues)} in dues` : ""));
  if (m.rentals) lines.push(`${m.rentals} space rentals` + (m.rentalFees ? ` (${money(m.rentalFees)} in fees)` : ""));
  if (m.missing.length) lines.push(`(${m.missing.length} events have no headcount recorded yet, so attendance is a floor.)`);
  return lines.join("\n");
}
