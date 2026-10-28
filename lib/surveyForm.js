/**
 * surveyForm.js — the impact survey's shared shape (public form, API route, CRM).
 *
 * A survey is data, not code: staff edit its questions in the CRM like a Google Form.
 * Each person gets their own link (an invite) that names the nights it covers; their
 * answers live on that invite with a copy of the questions they saw, so editing the
 * survey later never changes what an old answer meant.
 *
 * Question types:
 *   event_count  one number per night on the invite. Feeds that event's attendance.
 *   single       pick one option
 *   multi        pick any options
 *   rating_rows  one pick per row, from the same options (e.g. Very / Somewhat / Not really)
 *   scale        1 to 5
 *   text         free text
 *   testimonial  free text + "can we share this?" + how to credit them
 */

export const SURVEY_TYPES = {
  event_count: "Number per night (attendance)",
  single:      "Choose one",
  multi:       "Choose any",
  rating_rows: "Rating rows",
  scale:       "1 to 5",
  text:        "Text answer",
  testimonial: "Testimonial (with share question)",
};

export const SHARE_OPTS = [
  ["name", "Yes, with my name"],
  ["anon", "Yes, anonymously"],
  ["no",   "No"],
];

export const SURVEY_AUDIENCES = { artist: "Showcase artists", attendee: "Attendees", host: "Hosts" };

/**
 * Attendees share one link per night (it goes out in a BCC thank-you). That shared link
 * is an attendee invite that never gets answers; each submission becomes its own
 * attendee invite, already replied. So an attendee invite with no reply is a shared link.
 */
export const OPEN_AUDIENCE = "attendee";
export const isOpenLink = (inv) => inv?.survey_id === `svy_${OPEN_AUDIENCE}` && !inv?.replied_at;

const LIMITS = { label: 300, hint: 300, option: 80, options: 12, rows: 8, questions: 20, text: 3000, credit: 120, title: 120, intro: 600 };

export const newQuestionId = () => `q_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

export const blankQuestion = (type = "single") => ({
  id: newQuestionId(),
  type,
  label: "",
  hint: "",
  options: ["single", "multi", "rating_rows"].includes(type) ? ["", ""] : [],
  rows: type === "rating_rows" ? [""] : [],
});

export const DEFAULT_SURVEYS = {
  host: {
    title: "How did hosting go?",
    intro: "Thank you for being a part of the Sprout Community, {name}! A few quick questions.",
    thanks: "This goes straight into our grant applications. You can reopen this link to change your answers any time.",
    questions: [
      { id: "q_h_count", type: "event_count", label: "About how many people came?", hint: "A guess is fine. Leave blank if you don't know.", options: [], rows: [] },
      { id: "q_h_new", type: "single", label: "Roughly how many were new to your community?", hint: "", options: ["Almost none", "A few", "About half", "Most"], rows: [] },
      { id: "q_h_without", type: "single", label: "Without Sprout's space, would these have happened?", hint: "", options: ["Yes, the same", "Yes, but smaller", "Probably not"], rows: [] },
      { id: "q_h_reach", type: "single", label: "Did Sprout help you reach people you wouldn't have otherwise?", hint: "", options: ["Yes", "A little", "No"], rows: [] },
      { id: "q_h_true", type: "rating_rows", label: "How true is this?", hint: "", options: ["Very", "Somewhat", "Not really"], rows: ["People made new connections", "People felt welcome", "I'd host here again"] },
      { id: "q_h_quote", type: "testimonial", label: "What did hosting at Sprout make possible for you?", hint: "A sentence or two is plenty.", options: [], rows: [] },
    ],
  },
  attendee: {
    title: "How was your night at Sprout?",
    intro: "Thank you for being a part of the Sprout Community, {name}! A few quick questions.",
    thanks: "This goes straight into our grant applications. Thank you for helping keep Sprout going.",
    questions: [
      { id: "q_t_first", type: "single", label: "Was this your first time at Sprout?", hint: "", options: ["Yes", "No, I've been before"], rows: [] },
      { id: "q_t_met", type: "multi", label: "Did you meet someone new?", hint: "Tap all that fit.", options: ["A new friend", "Someone with shared interests", "An artist", "Someone to collaborate with", "Something else", "Not this time"], rows: [] },
      { id: "q_t_welcome", type: "scale", label: "How welcome did you feel?", hint: "1 is not at all, 5 is completely.", options: [], rows: [] },
      { id: "q_t_again", type: "single", label: "Would you come back, or bring a friend?", hint: "", options: ["Yes", "Maybe", "No"], rows: [] },
      { id: "q_t_quote", type: "testimonial", label: "What did tonight mean to you?", hint: "A sentence or two is plenty.", options: [], rows: [] },
    ],
  },
  artist: {
    title: "How was Sprout N Tell?",
    intro: "Thank you for being a part of the Sprout Community, {name}! A few quick questions.",
    thanks: "This goes straight into our grant applications. You can reopen this link to change your answers any time.",
    questions: [
      { id: "q_a_conn", type: "multi", label: "Did you make a new connection?", hint: "Tap all that fit.", options: ["A collaborator", "A friend", "New fans or followers", "A gig lead", "Something else", "None yet"], rows: [] },
      { id: "q_a_came", type: "multi", label: "Did anything come from it?", hint: "Tap all that fit.", options: ["Sale/Tips", "A booking", "A collaboration", "Something else", "Nothing yet"], rows: [] },
      { id: "q_a_welcome", type: "scale", label: "How welcome did you feel?", hint: "1 is not at all, 5 is completely.", options: [], rows: [] },
      { id: "q_a_again", type: "single", label: "Would you showcase again, or send a friend?", hint: "", options: ["Yes", "Maybe", "No"], rows: [] },
      { id: "q_a_quote", type: "testimonial", label: "What did Sprout N Tell mean to you?", hint: "A sentence or two is plenty.", options: [], rows: [] },
    ],
  },
};

/** An option like "Something else" gets an optional text box; its words live at answers[otherKey(q.id)]. */
export const isOther = (o) => /^something else/i.test(String(o || "").trim());
export const otherKey = (id) => `${id}_other`;

const str = (v, max) => String(v ?? "").replace(/\s+$/g, "").slice(0, max);
const clean = (list, max, n) => (Array.isArray(list) ? list : []).map((s) => str(s, max).trim()).filter(Boolean).slice(0, n);

/** The intro with {name} filled by a first name; with no name, ", {name}" drops out. */
export const fillIntro = (intro, name) => {
  const first = String(name || "").trim().split(/\s+/)[0];
  return String(intro || "").replace(/,?\s*\{name\}/g, (m) => (first ? m.replace("{name}", first) : ""));
};

/** Tidy a survey definition before it is saved: drops blank options, caps sizes, keeps ids. */
export function sanitizeSurvey(raw) {
  const s = raw || {};
  const seen = new Set();
  const questions = (Array.isArray(s.questions) ? s.questions : []).slice(0, LIMITS.questions).map((q) => {
    const type = SURVEY_TYPES[q?.type] ? q.type : "text";
    let id = String(q?.id || "").slice(0, 40) || newQuestionId();
    if (seen.has(id)) id = newQuestionId();
    seen.add(id);
    return {
      id, type,
      label: str(q.label, LIMITS.label).trim(),
      hint: str(q.hint, LIMITS.hint).trim(),
      options: ["single", "multi", "rating_rows"].includes(type) ? clean(q.options, LIMITS.option, LIMITS.options) : [],
      rows: type === "rating_rows" ? clean(q.rows, LIMITS.option, LIMITS.rows) : [],
    };
  }).filter((q) => q.label);
  return {
    title: str(s.title, LIMITS.title).trim(),
    intro: str(s.intro, LIMITS.intro).trim(),
    thanks: str(s.thanks, LIMITS.intro).trim(),
    questions,
  };
}

/** Problems that would make a survey confusing to answer. Empty array = fine. */
export function surveyProblems(s) {
  const out = [];
  if (!s.questions.length) out.push("Add at least one question.");
  s.questions.forEach((q, i) => {
    const n = `Question ${i + 1}`;
    if (["single", "multi", "rating_rows"].includes(q.type) && q.options.length < 2) out.push(`${n} needs at least 2 options.`);
    if (q.type === "rating_rows" && !q.rows.length) out.push(`${n} needs at least 1 row.`);
  });
  if (s.questions.filter((q) => q.type === "event_count").length > 1) out.push("Use only one attendance question.");
  return out;
}

/**
 * Keep only answers that fit the questions. `eventIds` are the nights on the invite.
 * Answers are keyed by question id.
 */
export function sanitizeAnswers(raw, questions, eventIds = []) {
  const a = raw && typeof raw === "object" ? raw : {};
  const out = {};
  for (const q of questions || []) {
    const v = a[q.id];
    if (v == null) continue;
    if (q.type === "event_count") {
      const m = {};
      for (const id of eventIds) {
        const n = v?.[id];
        if (n === "" || n == null) continue;
        const x = Math.round(Number(n));
        if (Number.isFinite(x) && x >= 0 && x <= 100000) m[id] = x;
      }
      if (Object.keys(m).length) out[q.id] = m;
    } else if (q.type === "single") {
      if (q.options.includes(v)) out[q.id] = v;
    } else if (q.type === "multi") {
      const pick = (Array.isArray(v) ? v : []).filter((o) => q.options.includes(o));
      if (pick.length) out[q.id] = [...new Set(pick)];
    }
    if (["single", "multi"].includes(q.type) && out[q.id]) {
      const picked = [].concat(out[q.id]);
      const t = str(a[otherKey(q.id)], 300).trim();
      if (t && picked.some(isOther)) out[otherKey(q.id)] = t;
    }
    if (q.type === "rating_rows") {
      const m = {};
      q.rows.forEach((row, i) => { const p = v?.[i]; if (q.options.includes(p)) m[i] = p; });
      if (Object.keys(m).length) out[q.id] = m;
    } else if (q.type === "scale") {
      const x = Number(v);
      if ([1, 2, 3, 4, 5].includes(x)) out[q.id] = x;
    } else if (q.type === "text") {
      const t = str(v, LIMITS.text).trim();
      if (t) out[q.id] = t;
    } else if (q.type === "testimonial") {
      const text = str(v?.text, LIMITS.text).trim();
      if (!text) continue;
      const share = SHARE_OPTS.some(([k]) => k === v?.share) ? v.share : "";
      out[q.id] = { text, share, credit: share === "name" ? str(v?.credit, LIMITS.credit).trim() : "" };
    }
  }
  return out;
}

/** Plain-language reasons a reply cannot be sent yet. */
export function answerProblems(answers, questions) {
  const out = [];
  if (!Object.keys(answers).length) out.push("Answer at least one question first.");
  for (const q of questions || []) {
    const t = answers[q.id];
    if (q.type === "testimonial" && t?.text && !t.share) out.push("Pick whether we can share what you wrote, or clear the box.");
  }
  return out;
}

/** Testimonial answers on one invite, with its share choice applied. */
export function inviteQuotes(invite) {
  const qs = invite?.questions || [];
  return qs.filter((q) => q.type === "testimonial").map((q) => invite.answers?.[q.id]).filter((t) => t?.text);
}

/** Attendance per event from host replies. Two replies for one night: the larger wins. */
export function surveyHeadcounts(invites = []) {
  const out = {};
  for (const inv of invites) {
    if (!inv.replied_at) continue;
    for (const q of inv.questions || []) {
      if (q.type !== "event_count") continue;
      const m = inv.answers?.[q.id] || {};
      for (const [id, n] of Object.entries(m)) if (Number.isFinite(n)) out[id] = Math.max(out[id] ?? 0, n);
    }
  }
  return out;
}

/**
 * Per-question tallies for one survey's replies, matched by question id so a question
 * that was reworded keeps its history. Returns [{ q, total, counts:[[option,n]], avg, rows }].
 */
export function tallySurvey(survey, invites = []) {
  const replies = invites.filter((i) => i.survey_id === survey.id && i.replied_at);
  return (survey.questions || []).filter((q) => ["single", "multi", "rating_rows", "scale"].includes(q.type)).map((q) => {
    const answered = replies.map((r) => r.answers?.[q.id]).filter((v) => v != null);
    const countOf = (vals) => q.options.map((o) => [o, vals.filter((v) => v === o).length]);
    if (q.type === "single") return { q, total: answered.length, counts: countOf(answered) };
    if (q.type === "multi") return { q, total: answered.length, counts: q.options.map((o) => [o, answered.filter((v) => v.includes(o)).length]) };
    if (q.type === "scale") {
      const nums = answered.map(Number).filter(Boolean);
      return { q, total: nums.length, avg: nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null,
        counts: [1, 2, 3, 4, 5].map((n) => [String(n), nums.filter((x) => x === n).length]) };
    }
    return { q, total: answered.length, rows: q.rows.map((row, i) => ({ row, counts: countOf(answered.map((v) => v[i]).filter(Boolean)) })) };
  });
}

const fmtShort = (d) => { try { return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }); } catch { return d; } };

const SITE = "https://sprout-crm-tool-next-js.vercel.app";
export const DISCORD_URL = "https://discord.gg/SUuDdrSAv";
/** One Discord line for the survey email and the survey thank-you screen. */
export const DISCORD_LINE = {
  before: "Come join us on",
  word: "Discord",
  after: "! It's a way to connect more with our community, a place to keep showcasing yourself, and where you can stay up to date on our events and offerings.",
};
const escHtml = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * The one email everyone gets. Max edits the copy here, not per person.
 * Returns plain text (body) and the same email with real links (html), so a paste
 * into Gmail keeps "here" clickable.
 */
export function surveyEmail({ firstName, audience, events = [], url }) {
  const host = audience === "host";
  const name = events.length === 1 ? events[0].name : null;
  const thanks = host
    ? `Thanks again for hosting ${name || "your events"} at Sprout!`
    : `Thanks again for showcasing at ${name || "Sprout N Tell"}!`;
  const next = host
    ? { text: "If you want to host again, or know someone who should, send them", url: `${SITE}/book` }
    : { text: "We're planning the next Sprout N Tell. If you want to showcase again, or know someone who should, send them", url: `${SITE}/submit` };
  const paras = [
    [`Hi ${firstName || "there"},`],
    [`${thanks} We're applying for grants to keep the space open and low cost, and your experience is the best proof we have. It would be a huge help if you could share your experience with us. It will take only a couple minutes and we'd greatly appreciate it. If you like, you can choose to share your comments on our Google reviews, which also help us tremendously.`],
    ["You can find the survey", url],
    [next.text, next.url],
    [DISCORD_LINE.before, DISCORD_URL, null, DISCORD_LINE.word, DISCORD_LINE.after],
    ["Thank you,", null, "Max"],
  ];
  // [text, link, line under it, link word (default "here"), text after the link]
  const body = paras.map(([t, link, extra, word, after]) => extra ? `${t}\n${extra}`
    : link ? (word ? `${t} ${word} (${link})${after}` : `${t} here: ${link}`) : t).join("\n\n");
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px">${paras.map(([t, link, extra, word, after]) =>
    `<p>${escHtml(t)}${link ? ` <a href="${escHtml(link)}">${escHtml(word || "here")}</a>${escHtml(after ?? ".")}` : ""}${extra ? `<br>${escHtml(extra)}` : ""}</p>`).join("")}</div>`;
  return { subject: "A quick favor for Sprout", body, html };
}

/** "Name · Sep 25", or "Name (all dates)" for a repeating series, which is one record for many nights. */
export const eventLabel = (ev) => {
  const series = ev.series ?? Boolean(ev.recurrence);
  if (series) return `${ev.name || "Event"} (all dates)`;
  return `${ev.name || "Event"}${ev.event_date ? ` · ${fmtShort(ev.event_date)}` : ""}`;
};
