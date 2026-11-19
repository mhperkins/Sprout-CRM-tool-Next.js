// lib/inboxWatch.js — SERVER ONLY. "Waiting on you": inbox threads where a real person
// wrote last and nobody at Sprout has answered for a day or more. Feeds the morning email.
//
// Any real person who wrote last counts, in either inbox. hello@ gets a lot of junk, so
// automated mail is filtered out hard (lists, receipts, notification senders, Gmail's
// Promotions/Social/Updates/Forums tabs). Website contact-form notifications ("Contact Us -
// Inquiry") are read for the real sender in the body.
//
// A thread counts as answered when the last message is ours, or when either account has
// sent anything to that person since their message (replying in a new email counts too).
//
// Read-only. Uses the same Google credentials as the rest of the server
// (GMAIL_REFRESH_TOKEN = hello@, MAX_GMAIL_REFRESH_TOKEN = maxperkins@).

import { accessToken } from "./notify";
import { svc } from "./portalDb";

const API = "https://gmail.googleapis.com/gmail/v1/users/me";
export const HELLO = "hello@sproutsociety.org";
export const MAX = "maxperkins@sproutsociety.org";
const US = new Set([HELLO, MAX]);
const FORM_SUBJECT = /^contact us\s*-\s*inquiry/i;

// Senders that are never a person waiting on a reply.
const AUTO_LOCAL = /^(no-?reply|do-?not-?reply|donotreply|notifications?|notify|mailer-daemon|postmaster|bounce[s]?|alerts?|news|newsletter|billing|invoice\+?.*|receipts?|wordpress|hello\+.*)$/i;
const AUTO_DOMAINS = [
  "slack.com", "substack.com", "paypal.com", "venmo.com", "stripe.com", "givebutter.com",
  "google.com", "googlemail.com", "amazon.com", "eventbrite.com", "shopify.com", "apple.com",
  "wpengine.com", "elementor.com", "stickermule.com", "mail.anthropic.com", "anthropic.com",
  "luma.com", "lu.ma", "canva.com", "vercel.com", "github.com", "zoom.us", "calendly.com",
];

const decode = (s) => String(s || "")
  .replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&nbsp;/g, " ");

/** Parse a From header into { name, email }. */
export function parseAddress(raw) {
  const s = String(raw || "").trim();
  const m = s.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  const email = (m ? m[2] : s).trim().toLowerCase();
  const name = (m ? m[1] : "").trim();
  return { name, email };
}

const header = (msg, name) =>
  (msg.payload?.headers || []).find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || "";

/** True when a message is automated (lists, receipts, auto-replies, notification senders). */
export function isAutomated(msg, email) {
  const [local, domain = ""] = String(email || "").split("@");
  if (AUTO_LOCAL.test(local)) return true;
  if (AUTO_DOMAINS.some((d) => domain === d || domain.endsWith("." + d))) return true;
  if (header(msg, "List-Unsubscribe") || header(msg, "List-Id")) return true;
  if (/^(bulk|list|junk)$/i.test(header(msg, "Precedence"))) return true;
  const auto = header(msg, "Auto-Submitted");
  if (auto && !/^no$/i.test(auto)) return true;
  if ((msg.labelIds || []).some((l) => l === "CATEGORY_PROMOTIONS" || l === "CATEGORY_SOCIAL" || l === "CATEGORY_UPDATES" || l === "CATEGORY_FORUMS" || l === "SPAM")) return true;
  return false;
}

/** Read the person out of a contact-form notification snippet:
 *  "Jenni Pirmann jennipirmann@live.com 6026976890 Hello. I am an artist…" */
export function parseFormSnippet(snippet) {
  const text = decode(snippet);
  const m = text.match(/[^\s@]+@[^\s@]+\.[a-z]{2,}/i);
  if (!m) return null;
  const name = text.slice(0, m.index).trim();
  const rest = text.slice(m.index + m[0].length).replace(/^\s*[+\d()\-.\s]{7,}\s*/, "").trim();
  return { name, email: m[0].toLowerCase(), message: rest };
}

/**
 * Decide whether one thread is waiting on us. Pure (no network) so it can be tested.
 * Returns a candidate, or null.
 */
export function classifyThread(thread, account) {
  const msgs = (thread.messages || []).slice().sort((a, b) => Number(a.internalDate) - Number(b.internalDate));
  if (!msgs.length) return null;
  const last = msgs[msgs.length - 1];
  const subject = header(msgs[0], "Subject") || "(no subject)";
  const from = parseAddress(header(last, "From"));
  const lastAt = Number(last.internalDate);
  const base = { account, threadId: thread.id, subject, lastAt };

  // Website contact form: written by hello@ to itself, the person is in the body.
  if (account === HELLO && FORM_SUBJECT.test(subject) && from.email === HELLO) {
    const p = parseFormSnippet(last.snippet);
    if (!p) return null;
    return { ...base, kind: "form", email: p.email, name: p.name, snippet: p.message };
  }

  if (US.has(from.email)) return null;            // we wrote last
  if (isAutomated(last, from.email)) return null;  // not a person

  const cand = { ...base, email: from.email, name: from.name, snippet: decode(last.snippet) };
  if (account === MAX) return { ...cand, kind: "direct" };

  const weWroteEarlier = msgs.some((m) => US.has(parseAddress(header(m, "From")).email));
  if (weWroteEarlier) return { ...cand, kind: "reply" };
  return { ...cand, kind: "direct" };
}

/**
 * Like classifyThread, but also keeps threads where WE wrote last (dir "them": waiting on
 * the other person). Returns { ...candidate, dir: "you"|"them" } or null. Pure.
 */
export function classifyConversation(thread, account) {
  const mine = classifyThread(thread, account);
  if (mine) return { ...mine, dir: "you" };
  const msgs = (thread.messages || []).slice().sort((a, b) => Number(a.internalDate) - Number(b.internalDate));
  if (!msgs.length) return null;
  const last = msgs[msgs.length - 1];
  if (!US.has(parseAddress(header(last, "From")).email)) return null; // a non-person wrote last
  const subject = header(msgs[0], "Subject") || "(no subject)";
  if (FORM_SUBJECT.test(subject)) return null;
  // The other person: the latest real person who wrote in this thread, else who we wrote to.
  let who = null;
  for (let i = msgs.length - 1; i >= 0 && !who; i--) {
    const f = parseAddress(header(msgs[i], "From"));
    if (!US.has(f.email) && !isAutomated(msgs[i], f.email)) who = f;
  }
  if (!who) {
    const to = String(header(last, "To") || "").split(",").map(parseAddress).find((a) => a.email && !US.has(a.email));
    if (to) who = to;
  }
  if (!who) return null;
  return {
    account, threadId: thread.id, subject, lastAt: Number(last.internalDate),
    kind: "reply", email: who.email, name: who.name, snippet: decode(last.snippet), dir: "them",
  };
}

/** After you reply, a thread that's been quiet this long counts as Completed on its own. */
export const THEM_STALE_DAYS = 14;

/** Triage key for an inbox item. */
export const triageKey = (it) => (it.source === "instagram" ? `ig:${it.igId}` : `${it.account}:${it.threadId}`);

/**
 * Apply saved Pin / Completed / Ignore marks. Pure. Returns each item with `state`:
 * "open" | "pinned" | "done" | "ignored" and `auto` when Completed came from the 14-day rule.
 * Completed comes back on its own when the person writes again after it was marked.
 */
export function applyTriage(items, marks, now = Date.now()) {
  return items.map((it) => {
    const m = marks.get(triageKey(it));
    if (m?.status === "ignored") return { ...it, state: "ignored" };
    if (m?.status === "pinned") return { ...it, state: "pinned" };
    if (m?.status === "done") {
      const reopened = it.dir === "you" && it.lastAt > Date.parse(m.updated_at);
      if (!reopened) return { ...it, state: "done" };
    }
    if (it.dir === "them" && now - it.lastAt > THEM_STALE_DAYS * 86400000) return { ...it, state: "done", auto: true };
    return { ...it, state: "open" };
  });
}

/** Saved marks, keyed by triage key. Empty map if the table can't be read. */
export async function loadTriage() {
  const { data, error } = await svc().from("sprout_inbox_triage").select("key,status,updated_at");
  if (error) throw new Error("Could not read inbox marks: " + error.message);
  return new Map((data || []).map((r) => [r.key, r]));
}

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// Gmail answers 403/429 when reads come too fast; back off and retry instead of failing.
async function gmail(token, path) {
  for (let attempt = 0; ; attempt++) {
    const r = await fetch(API + path, { headers: { Authorization: "Bearer " + token } });
    if (r.ok) return r.json();
    if ((r.status === 403 || r.status === 429 || r.status >= 500) && attempt < 4) {
      await sleep(800 * 2 ** attempt);
      continue;
    }
    throw new Error(`Gmail ${r.status} on ${path.split("?")[0]}`);
  }
}

async function listThreadIds(token, q, max = 400) {
  const ids = [];
  let pageToken = "";
  while (ids.length < max) {
    const j = await gmail(token, `/threads?maxResults=100&q=${encodeURIComponent(q)}${pageToken ? "&pageToken=" + pageToken : ""}`);
    ids.push(...(j.threads || []).map((t) => t.id));
    if (!j.nextPageToken) break;
    pageToken = j.nextPageToken;
  }
  return ids.slice(0, max);
}

async function inBatches(items, size, fn) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  return out;
}

const META = ["From", "To", "Subject", "List-Unsubscribe", "List-Id", "Precedence", "Auto-Submitted"]
  .map((h) => "&metadataHeaders=" + h).join("");

export async function scanAccount(token, account, days, classify = classifyThread) {
  const q = account === MAX
    ? `in:inbox newer_than:${days}d -category:promotions -category:social -category:updates -category:forums -from:${HELLO}`
    : `in:inbox newer_than:${days}d -category:promotions -category:social -category:updates -category:forums`;
  const ids = await listThreadIds(token, q);
  const threads = await inBatches(ids, 10, (id) => gmail(token, `/threads/${id}?format=metadata${META}`).catch(() => null));
  return threads.filter(Boolean).map((t) => classify(t, account)).filter(Boolean);
}

/** Has either account sent anything to this address since `sinceMs`? */
async function answeredSince(tokens, email, sinceMs) {
  const after = Math.floor(sinceMs / 1000);
  const q = encodeURIComponent(`in:sent {to:${email} cc:${email} bcc:${email}} after:${after}`);
  for (const token of tokens) {
    const j = await gmail(token, `/messages?maxResults=1&q=${q}`);
    if (j.messages?.length) return true;
  }
  return false;
}

const escLike = (s) => s.replace(/[\\%_]/g, (c) => "\\" + c);

/** CRM contacts for these emails (primary or alternate), keyed by lowercase email. */
async function crmByEmail(emails) {
  const map = new Map();
  const list = [...new Set(emails)].filter(Boolean);
  if (!list.length) return map;
  const or = list.map((e) => `email.ilike.${escLike(e)}`).join(",");
  const { data: primary } = await svc().from("sprout_contacts")
    .select("id, first_name, last_name, email, next_action_date, data").or(or);
  const { data: alt } = await svc().from("sprout_contacts")
    .select("id, first_name, last_name, email, next_action_date, data")
    .or(list.map((e) => `data->alt_emails.cs.${JSON.stringify([e])}`).join(","));
  for (const c of [...(primary || []), ...(alt || [])]) {
    const all = [c.email, ...((c.data?.alt_emails) || [])].map((e) => String(e || "").toLowerCase());
    for (const e of all) if (list.includes(e) && !map.has(e)) map.set(e, {
      id: c.id,
      name: [c.first_name, c.last_name].filter(Boolean).join(" "),
      nextAction: c.data?.next_action || "",
      nextActionDate: c.next_action_date || null,
    });
  }
  return map;
}

/**
 * Everything waiting on a reply for at least `minAgeHours`, oldest first, across both
 * inboxes. One entry per person (their latest unanswered thread).
 */
async function gmailTokens() {
  const accounts = [[HELLO, process.env.GMAIL_REFRESH_TOKEN], [MAX, process.env.MAX_GMAIL_REFRESH_TOKEN]]
    .filter(([, rt]) => rt);
  if (!accounts.length) throw new Error("No Gmail credentials set.");
  return Object.fromEntries(await Promise.all(accounts.map(async ([a, rt]) => [a, await accessToken(rt)])));
}

/**
 * Everything for the Inbox page: one entry per person (their newest thread) across both
 * inboxes, waiting on you or on them, plus Instagram outreach replies. Marks applied.
 */
export async function fetchInbox({ now = Date.now(), days = 30 } = {}) {
  const tokens = await gmailTokens();
  const allTokens = Object.values(tokens);
  const found = (await Promise.all(Object.entries(tokens).map(([a, t]) => scanAccount(t, a, days, classifyConversation))))
    .flat().filter((c) => !US.has(c.email));

  const byPerson = new Map();
  for (const c of found) if (!byPerson.has(c.email) || byPerson.get(c.email).lastAt < c.lastAt) byPerson.set(c.email, c);
  const people = [...byPerson.values()];

  // Waiting on you, but answered in a different email? Then it's waiting on them.
  await inBatches(people.filter((c) => c.dir === "you"), 5, async (c) => {
    if (await answeredSince(allTokens, c.email, c.lastAt)) { c.dir = "them"; c.answeredElsewhere = true; }
  });

  const crm = await crmByEmail(people.map((c) => c.email));
  const email = people.map((c) => ({ ...c, source: "email", url: threadUrl(c), crm: crm.get(c.email) || null }));

  // Instagram: outreach replies logged on the Outreach page (the app can't read DMs).
  const since = new Date(now - days * 86400000).toISOString();
  const { data: ig } = await svc().from("sprout_outreach_accounts")
    .select("id,handle,name,status,replied_at,reply,contact_id,batch")
    .in("status", ["replied", "interested"]).gte("replied_at", since);
  const igIds = [...new Set((ig || []).map((r) => r.contact_id).filter(Boolean))];
  const { data: igContacts } = igIds.length
    ? await svc().from("sprout_contacts").select("id,first_name,last_name,next_action_date,data").in("id", igIds)
    : { data: [] };
  const igCrm = new Map((igContacts || []).map((c) => [c.id, {
    id: c.id, name: [c.first_name, c.last_name].filter(Boolean).join(" "),
    nextAction: c.data?.next_action || "", nextActionDate: c.next_action_date || null,
  }]));
  const insta = (ig || []).map((r) => ({
    source: "instagram", igId: r.id, account: "instagram", dir: "you", kind: "instagram",
    name: r.name || "@" + r.handle, email: "@" + r.handle, handle: r.handle,
    subject: `Outreach reply${r.batch ? ` · Batch ${r.batch}` : ""}`, snippet: r.reply || "",
    lastAt: Date.parse(r.replied_at), crm: r.contact_id ? igCrm.get(r.contact_id) || null : null,
  }));

  const marks = await loadTriage();
  return applyTriage([...email, ...insta], marks, now).sort((a, b) => b.lastAt - a.lastAt);
}

export async function fetchWaiting({ now = Date.now(), minAgeHours = 24, days = 30 } = {}) {
  const tokens = await gmailTokens();
  const allTokens = Object.values(tokens);

  const found = (await Promise.all(Object.entries(tokens).map(([a, t]) => scanAccount(t, a, days)))).flat();
  const cutoff = now - minAgeHours * 3600 * 1000;
  let cands = found.filter((c) => c.lastAt <= cutoff && !US.has(c.email));

  // One entry per person: keep their newest thread.
  const byPerson = new Map();
  for (const c of cands) if (!byPerson.has(c.email) || byPerson.get(c.email).lastAt < c.lastAt) byPerson.set(c.email, c);
  cands = [...byPerson.values()];

  const crm = await crmByEmail(cands.map((c) => c.email));

  const open = [];
  await inBatches(cands, 5, async (c) => {
    if (!(await answeredSince(allTokens, c.email, c.lastAt))) open.push(c);
  });

  // Respect the Inbox page: Completed and Ignored drop off, Pinned leads.
  const marks = await loadTriage().catch(() => new Map());
  return applyTriage(open.map((c) => ({ ...c, source: "email", dir: "you" })), marks, now)
    .filter((c) => c.state === "open" || c.state === "pinned")
    .map((c) => ({ ...c, pinned: c.state === "pinned", url: threadUrl(c), crm: crm.get(c.email) || null }))
    .sort((a, b) => (b.pinned - a.pinned) || (a.lastAt - b.lastAt));
}

/** Link that opens the thread in the right Gmail account. */
export const threadUrl = (c) =>
  `https://mail.google.com/mail/u/?authuser=${encodeURIComponent(c.account)}#all/${c.threadId}`;
