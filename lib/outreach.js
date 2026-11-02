// lib/outreach.js — shared rules for the Outreach page: statuses, handle cleanup, what
// each button writes to the comm log, and the record Add to CRM creates or updates.

import { igHandle } from "./pastParticipants";

export const OUTREACH_STATUS = {
  to_message: "To message",
  messaged: "Messaged",
  replied: "Replied",
  interested: "Interested",
  added: "Added",
  skip: "Skip",
};
export const STATUS_ORDER = Object.keys(OUTREACH_STATUS);
export const REACHED = ["messaged", "replied", "interested", "added"];
export const RESPONDED = ["replied", "interested", "added"];

// Accepts @handle or any instagram.com link, and keeps only what a handle can contain.
export const cleanHandle = (s) => igHandle(s).replace(/[^a-z0-9._]/g, "");

export const profileUrl = (handle) => `https://instagram.com/${encodeURIComponent(handle)}`;

/** Find a CRM record that already holds this Instagram handle. */
export function matchHandle(handle, records) {
  const h = cleanHandle(handle);
  return h ? records.find((r) => cleanHandle(r.instagram_handle) === h) || null : null;
}

export const LOG = {
  sent: "Instagram DM sent from @sproutsocietyorg (Outreach).",
  unsent: "Outreach: marked not sent.",
  skip: (why) => `Outreach: skipped${why ? ` (${why})` : ""}.`,
  unskip: "Outreach: put back on the list.",
  reply: (status, text) => `Instagram reply (${OUTREACH_STATUS[status]}): ${text}`,
  added: "Added to Contacts from Outreach.",
};

export const nextBatch = (rows) => {
  const open = rows.filter((r) => r.status === "to_message").map((r) => r.batch);
  return open.length ? Math.min(...open) : rows.length ? Math.max(...rows.map((r) => r.batch)) : 1;
};

export function batchStats(rows) {
  const by = new Map();
  rows.forEach((r) => {
    const s = by.get(r.batch) || { batch: r.batch, total: 0, reached: 0, heard: 0, ...Object.fromEntries(STATUS_ORDER.map((k) => [k, 0])) };
    s.total += 1;
    s[r.status] += 1;
    if (REACHED.includes(r.status)) s.reached += 1;
    if (RESPONDED.includes(r.status)) s.heard += 1;
    by.set(r.batch, s);
  });
  return [...by.values()].sort((a, b) => a.batch - b.batch);
}

/** Add to CRM for someone already on file: keep everything, move them into Contacts. */
export function promoteContact(rec, date) {
  return {
    ...rec,
    segment: rec.segment === "prospect" ? "community" : rec.segment,
    relationship_status: rec.relationship_status === "cold" ? "warm" : rec.relationship_status,
    touchpoints: [...(rec.touchpoints || []), { date, summary: LOG.added, auto: true }],
  };
}

/** Add to CRM for a new account: a contact carrying the row's whole history. */
export function contactFromAccount(row, id, date) {
  const parts = row.name.trim().split(/\s+/).filter(Boolean);
  return {
    id,
    record_type: "individual",
    first_name: parts[0] || `@${row.handle}`,
    last_name: parts.slice(1).join(" "),
    email: null,
    relationship_status: "warm",
    instagram_handle: row.handle,
    relationship_types: [],
    how_heard: "Instagram outreach",
    segment: "community",
    tags: ["instagram_sourced"],
    notes: row.note || "",
    touchpoints: [...(row.history || []).map((h) => ({ date: h.date, summary: h.text, ...(h.auto ? { auto: true } : {}) })), { date, summary: LOG.added, auto: true }],
    createdAt: new Date().toISOString(),
  };
}

export const contactIdFor = (row, taken) => {
  const slug = (row.name || row.handle).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "outreach";
  let id = `ind_${slug}`;
  for (let n = 2; taken.has(id); n++) id = `ind_${slug}_${n}`;
  return id;
};
