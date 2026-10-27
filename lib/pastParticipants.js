// Past participants: everyone who has been part of a Sprout program. A person counts
// when they are a contact tagged Showcase, or when they sent a program form for any
// event (Sprout N Tell, Industry Day, ...). Pure, so the Showcase page and a node check
// share one rule. Read-only: nothing here writes to contacts.

const lc = (s) => String(s || "").trim().toLowerCase();

/** "@Foo", "foo/", "https://www.instagram.com/foo/" all become "foo". */
export function igHandle(v) {
  let s = lc(v);
  if (!s) return "";
  const m = s.match(/instagram\.com\/([^/?#]+)/);
  if (m) s = m[1];
  return s.replace(/^@+/, "").replace(/\/+$/, "").trim();
}

/** Letters and digits only, accents dropped, so "Maxwell Höuse" matches "maxwell house". */
export const normName = (s) =>
  lc(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\([^)]*\)/g, " ").replace(/[^a-z0-9]+/g, "");

/** Handle with dots and underscores dropped, so "this.here.giraffe" finds "thisheregiraffe". */
const looseIg = (h) => igHandle(h).replace(/[._]/g, "");
const tokens = (s) => lc(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\([^)]*\)/g, " ").split(/[^a-z0-9]+/).filter(Boolean);

const fullName = (c) => [c.first_name, c.last_name].filter(Boolean).join(" ").trim();

/** Short chip label for a night: "Vol. 4", otherwise the event's own name. */
export function showLabel(ev) {
  const m = String(ev?.name || "").match(/vol\.?\s*(\d+)/i);
  if (m) return `Vol. ${m[1]}`;
  const n = String(ev?.name || "Event");
  return n.length > 30 ? `${n.slice(0, 29)}…` : n;
}

const roleOf = (r) => (r === "Music" ? "music" : r === "Art" ? "art" : r ? "other" : null);

/**
 * @param contacts  CRM contacts (merged shape)
 * @param events    CRM events
 * @param entries   every sprout_program_entries row: { id, event_id, data }
 * @param today     YYYY-MM-DD; nights after it are not "past"
 * @returns sorted [{ key, name, contact, ig, photo, roles:Set, shows:[event], email }]
 */
export function buildPastParticipants({ contacts = [], events = [], entries = [], today }) {
  const evById = new Map(events.map((e) => [e.id, e]));
  const isPast = (ev) => ev && ev.status !== "cancelled" && ev.event_date && (!today || ev.event_date <= today);
  const programEventIds = new Set(entries.map((e) => e.event_id));
  const isShowcaseNight = (ev) => programEventIds.has(ev.id) || /tell/i.test(ev.name || "");

  // Lookups over ALL contacts, so a program sender who is already a contact links up.
  const byIg = new Map();
  const byLooseIg = new Map();
  const byName = new Map();
  const byLast = new Map(); // last name -> contacts, for "Maggie V. Miles" and "Tim Falvey of Big Iron Echoes"
  for (const c of contacts) {
    const h = igHandle(c.instagram_handle);
    if (h && !byIg.has(h)) byIg.set(h, c);
    const lh = looseIg(c.instagram_handle);
    if (lh && !byLooseIg.has(lh)) byLooseIg.set(lh, c);
    const n = normName(fullName(c));
    if (n && c.first_name && c.last_name && !byName.has(n)) byName.set(n, c);
    const last = normName(c.last_name);
    if (last && normName(c.first_name)) {
      if (!byLast.has(last)) byLast.set(last, []);
      byLast.get(last).push(c);
    }
  }
  // Same first name and the contact's last name appears in the submitted name. Only a
  // single candidate counts, so two people sharing a surname never get merged.
  const byNameTokens = (name) => {
    const t = tokens(name);
    if (t.length < 2) return null;
    const found = new Set();
    for (const w of t.slice(1)) {
      for (const c of byLast.get(w) || []) if (normName(c.first_name) === t[0]) found.add(c);
    }
    return found.size === 1 ? [...found][0] : null;
  };
  const eventsOfContact = new Map();
  for (const ev of events) {
    for (const cid of ev.contact_ids || []) {
      if (!eventsOfContact.has(cid)) eventsOfContact.set(cid, []);
      eventsOfContact.get(cid).push(ev);
    }
  }

  const people = new Map();
  const get = (key, seed) => {
    if (!people.has(key)) people.set(key, { key, roles: new Set(), shows: new Map(), ...seed });
    return people.get(key);
  };
  const addShow = (p, ev) => { if (isPast(ev)) p.shows.set(ev.id, ev); };

  // 1. Everyone tagged Showcase, with the showcase nights they are linked to.
  for (const c of contacts) {
    const types = c.relationship_types || [];
    if (!types.includes("showcase")) continue;
    const p = get(`c:${c.id}`, { contact: c, name: fullName(c) || c.instagram_handle || "Unnamed", ig: igHandle(c.instagram_handle) });
    if (types.includes("music")) p.roles.add("music");
    if (types.includes("art")) p.roles.add("art");
    for (const ev of eventsOfContact.get(c.id) || []) if (isShowcaseNight(ev)) addShow(p, ev);
  }

  // 2. Everyone who sent a program form, matched to a contact by Instagram, then name.
  for (const row of entries) {
    const d = row.data || {};
    const ev = evById.get(row.event_id);
    const h = igHandle(d.instagram);
    const n = normName(d.name);
    const c = (h && (byIg.get(h) || byLooseIg.get(looseIg(h)))) || (n && byName.get(n)) || byNameTokens(d.name) || null;
    const key = c ? `c:${c.id}` : h ? `ig:${h}` : n ? `nm:${n}` : `e:${row.id}`;
    const p = get(key, { contact: c, name: c ? fullName(c) || d.name : d.name || "Unnamed", ig: h || (c ? igHandle(c.instagram_handle) : "") });
    if (!p.ig && h) p.ig = h;
    if (!p.photo && d.photo_url) p.photo = d.photo_url;
    const r = roleOf(d.role);
    if (r) p.roles.add(r);
    if (ev) addShow(p, ev);
  }

  return [...people.values()]
    .map((p) => {
      const shows = [...p.shows.values()].sort((a, b) => (a.event_date < b.event_date ? -1 : 1));
      return { ...p, shows, email: p.contact?.email || "", last: shows.length ? shows[shows.length - 1].event_date : "" };
    })
    .sort((a, b) => b.shows.length - a.shows.length || (a.last < b.last ? 1 : a.last > b.last ? -1 : 0) || lc(a.name).localeCompare(lc(b.name)));
}
