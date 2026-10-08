"use client";

/**
 * SurveyView.jsx — the 📝 Impact survey page.
 *
 * Three tabs, for each audience (Hosts / Showcase artists):
 *   Replies         what people said: tallies per question and every reply in full
 *   Send            who should get a link, with Copy email / Copy link / Mark sent.
 *                   The CRM never emails anyone on its own; staff send from Gmail.
 *   Edit questions  change the survey like a Google Form. Old replies keep a copy of the
 *                   questions they answered, so editing never rewrites them.
 *
 * Grant Metrics reads the same invites: host attendance fills blank headcounts and
 * shareable testimonials join "In their words".
 */

import { useState, useEffect, useMemo } from "react";
import { fetchSurveys, saveSurvey, fetchSurveyInvites, createSurveyInvite, updateSurveyInvite, deleteSurveyInvite } from "../lib/services";
import {
  SURVEY_TYPES, SURVEY_AUDIENCES, SHARE_OPTS, DEFAULT_SURVEYS, blankQuestion, newQuestionId,
  sanitizeSurvey, surveyProblems, tallySurvey, surveyEmail, eventLabel,
} from "../lib/surveyForm";
import { pickOrganizer } from "../lib/eventPortal";
import SurveyForm from "./SurveyForm";

const SV_STYLES = `
.sv{--line:#E3E3DD;--dim:#5F5F57;--warn:#8A6100;--warn-bg:#FAF0D6;--ok:#15804A;--ok-bg:#E4F3EA}
.sv-top{display:flex;gap:12px 20px;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;padding-bottom:14px;border-bottom:2px solid var(--black);margin-bottom:16px}
.sv-top h1{font-size:30px;font-weight:900;letter-spacing:-.02em;line-height:1.05}
.sv-top p{color:var(--dim);font-size:13px;margin-top:5px;max-width:62ch}
.sv-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:14px}
.sv-chip{appearance:none;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;border:1.5px solid var(--line);background:#fff;color:var(--dim);border-radius:999px;padding:5px 13px}
.sv-chip[aria-pressed="true"]{background:var(--black);color:var(--white);border-color:var(--black)}
.sv-sep{width:1px;height:20px;background:var(--line);margin:0 4px}
.sv-btn{appearance:none;font:inherit;font-size:13px;font-weight:700;cursor:pointer;border:1px solid var(--black);background:var(--black);color:var(--white);border-radius:6px;padding:7px 13px}
.sv-btn:disabled{opacity:.45;cursor:default}
.sv-btn2{appearance:none;font:inherit;font-size:12px;font-weight:700;cursor:pointer;border:1px solid var(--line);background:#fff;color:#030000;border-radius:6px;padding:5px 10px;white-space:nowrap}
.sv-btn2:hover{border-color:var(--black)}
.sv-lnk{appearance:none;background:none;border:none;padding:0;font:inherit;font-size:12px;color:#2a8ca0;text-decoration:underline;cursor:pointer}
.sv-chip:focus-visible,.sv-btn:focus-visible,.sv-btn2:focus-visible,.sv-lnk:focus-visible{outline:2px solid var(--fuchsia);outline-offset:2px}
.sv-card{background:#fff;border:1px solid var(--line);border-radius:10px;padding:14px;min-width:0}
.sv-h{font-size:12px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;color:var(--dim);margin:0 0 8px}
.sv-empty{color:var(--dim);font-size:13px}
.sv-note{background:var(--warn-bg);border-left:4px solid var(--banana);border-radius:0 8px 8px 0;padding:10px 14px;font-size:13px;margin-bottom:14px}
.sv-tw{overflow-x:auto;background:#fff;border:1px solid var(--line);border-radius:10px}
.sv-t{border-collapse:collapse;width:100%;font-size:13px}
.sv-t th,.sv-t td{padding:9px 12px;border-bottom:1px solid var(--g100);text-align:left;vertical-align:top}
.sv-t th{font-size:11.5px;color:var(--dim);font-weight:700}
.sv-t td small{display:block;color:var(--dim);font-size:11.5px;margin-top:2px}
.sv-acts{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
.sv-tag{display:inline-block;font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;background:var(--g100);color:var(--dim);white-space:nowrap}
.sv-tag.ok{background:var(--ok-bg);color:var(--ok)}
.sv-tag.sent{background:var(--warn-bg);color:var(--warn)}
.sv-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;margin-bottom:18px}
.sv-bars{display:grid;gap:4px}
.sv-br{display:grid;grid-template-columns:minmax(0,1fr) 90px 26px;gap:8px;align-items:center;font-size:12.5px}
.sv-br .tr{height:8px;background:var(--g100);border-radius:4px;overflow:hidden}
.sv-br .tr i{display:block;height:100%;background:var(--cyan)}
.sv-br b{text-align:right;font-variant-numeric:tabular-nums}
.sv-qt{font-size:13.5px;font-weight:900;margin-bottom:8px;line-height:1.35}
.sv-q{border-left:4px solid var(--acid);padding:6px 12px;margin-bottom:10px;font-size:13.5px;font-style:italic;line-height:1.55}
.sv-q small{display:block;font-style:normal;color:var(--dim);font-size:11.5px;margin-top:3px}
.sv-rep{border-top:1px solid var(--g100);padding:12px 0}
.sv-rep:first-child{border-top:0;padding-top:0}
.sv-rep dl{display:grid;grid-template-columns:minmax(140px,240px) minmax(0,1fr);gap:4px 14px;margin:8px 0 0;font-size:13px}
.sv-rep dt{color:var(--dim)}
.sv-rep dd{margin:0}
/* Explicit text color + light scheme: globals.css flips form fields dark on a dark-mode Mac. */
.sv-in,.sv-sel,.sv-ta{color:#030000;color-scheme:light;font:inherit;font-size:13px;border:1px solid var(--line);border-radius:6px;padding:6px 9px;background:#fff;width:100%;min-width:0}
.sv-ta{min-height:60px;resize:vertical}
.sv-in:focus,.sv-sel:focus,.sv-ta:focus{outline:2px solid var(--cyan);outline-offset:0;border-color:var(--cyan)}
.sv-lbl{display:block;font-size:11.5px;font-weight:700;color:var(--dim);margin:0 0 3px}
.sv-eq{background:#fff;border:1px solid var(--line);border-radius:10px;padding:12px 14px;display:grid;gap:10px;margin-bottom:10px}
.sv-eq-hd{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.sv-eq-hd .n{font-weight:900;font-size:13px;width:22px}
.sv-eq-hd .grow{flex:1 1 260px;min-width:0}
.sv-eq-hd .ty{flex:0 1 230px;min-width:0}
.sv-opts{display:grid;gap:6px}
.sv-opt{display:flex;gap:6px;align-items:center}
.sv-x{appearance:none;border:1px solid var(--line);background:#fff;color:#030000;border-radius:6px;width:28px;height:28px;cursor:pointer;flex:0 0 auto;font:inherit}
.sv-x:disabled{opacity:.35;cursor:default}
.sv-two{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px}
.sv-sticky{position:sticky;bottom:0;background:var(--white);border-top:1px solid var(--line);padding:10px 0;display:flex;gap:10px;align-items:center;flex-wrap:wrap;z-index:5}
.sv-prev{position:fixed;inset:0;background:rgba(3,0,0,.55);z-index:400;overflow:auto;padding:24px 12px}
.sv-prev-in{max-width:720px;margin:0 auto;background:#F7F7F6;border-radius:10px;overflow:hidden}
.sv-prev-bar{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 14px;background:#030000;color:#fff;font-size:13px;font-weight:700}
.sv-add{display:grid;gap:10px;margin-bottom:14px}
.sv-evs{display:flex;flex-wrap:wrap;gap:6px;max-height:160px;overflow:auto}
`;

const localToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const fmtWhen = (iso) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "");
const fullName = (c) => [c?.first_name, c?.last_name].filter(Boolean).join(" ").trim();
// Links always point at the live site, never a preview deploy's address.
const siteOrigin = () => (typeof window !== "undefined" && window.location.hostname === "localhost" ? window.location.origin : "https://sprout-crm-tool-next-js.vercel.app");
const linkFor = (inv) => `${siteOrigin()}/survey/${inv.token}`;
const isHeld = (ev, today) => ev.event_date && ev.event_date < today && ev.status !== "cancelled" && ev.status !== "pending";

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

/** Show one answer as plain text, using the questions that reply was given. */
function answerText(q, v, evById) {
  if (v == null) return "";
  if (q.type === "event_count") return Object.entries(v).map(([id, n]) => `${evById.get(id)?.name || "Event"}: ${n}`).join(" · ");
  if (q.type === "multi") return v.join(", ");
  if (q.type === "rating_rows") return (q.rows || []).map((r, i) => (v[i] ? `${r}: ${v[i]}` : "")).filter(Boolean).join(" · ");
  if (q.type === "testimonial") return `“${v.text}” · ${SHARE_OPTS.find(([k]) => k === v.share)?.[1] || "No share answer"}${v.credit ? ` (${v.credit})` : ""}`;
  return String(v);
}

export default function SurveyView({ events = [], contacts = [], orgs = [], showToast, openContact }) {
  const [audience, setAudience] = useState("host");
  const [tab, setTab] = useState("replies");
  const [surveys, setSurveys] = useState(null);
  const [invites, setInvites] = useState([]);
  const [loadErr, setLoadErr] = useState("");
  const [draft, setDraft] = useState(null);       // the survey being edited
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [busyRow, setBusyRow] = useState("");
  const [adding, setAdding] = useState(false);
  const [addQ, setAddQ] = useState("");
  const [addContact, setAddContact] = useState(null);
  const [addEvents, setAddEvents] = useState([]);
  const [editRow, setEditRow] = useState(null); // { id, name, email, eventIds } while a link is being edited
  const today = localToday();

  useEffect(() => {
    let live = true;
    Promise.all([fetchSurveys(), fetchSurveyInvites()]).then(([s, i]) => {
      if (!live) return;
      setSurveys(s); setInvites(i);
    }).catch(() => live && setLoadErr("Could not load the surveys. Refresh to try again."));
    return () => { live = false; };
  }, []);

  const survey = surveys?.find(s => s.audience === audience) || null;
  useEffect(() => { if (survey) { setDraft(JSON.parse(JSON.stringify(survey))); setDirty(false); } }, [survey?.id, surveys]); // eslint-disable-line react-hooks/exhaustive-deps

  const contactById = useMemo(() => new Map(contacts.map(c => [c.id, c])), [contacts]);
  const orgById = useMemo(() => new Map(orgs.map(o => [o.id, o])), [orgs]);
  const evById = useMemo(() => new Map(events.map(e => [e.id, e])), [events]);
  const held = useMemo(() => events.filter(ev => isHeld(ev, today)).sort((a, b) => b.event_date.localeCompare(a.event_date)), [events, today]);
  const mine = useMemo(() => invites.filter(i => i.survey_id === survey?.id), [invites, survey]);

  /* ── who should get a link ── */
  const suggestions = useMemo(() => {
    const by = new Map();
    const add = (c, ev) => {
      if (!c) return;
      const row = by.get(c.id) || { contact: c, eventIds: [] };
      if (!row.eventIds.includes(ev.id)) row.eventIds.push(ev.id);
      by.set(c.id, row);
    };
    if (audience === "host") {
      held.filter(ev => ["partner", "rental"].includes(ev.outcomes?.hosted_by)).forEach(ev => add(pickOrganizer(ev, contacts), ev));
    } else {
      held.forEach(ev => (ev.contact_ids || []).forEach(id => {
        const c = contactById.get(id);
        if ((c?.relationship_types || []).includes("showcase")) add(c, ev);
      }));
    }
    return [...by.values()];
  }, [audience, held, contacts, contactById]);

  const hostsWithoutPerson = useMemo(() => audience !== "host" ? [] :
    held.filter(ev => ["partner", "rental"].includes(ev.outcomes?.hosted_by) && !pickOrganizer(ev, contacts)), [audience, held, contacts]);

  const rows = useMemo(() => {
    const invited = new Set(mine.map(i => i.contact_id).filter(Boolean));
    const out = mine.map(inv => ({ key: inv.id, invite: inv, contact: contactById.get(inv.contact_id), eventIds: inv.event_ids || [] }));
    suggestions.filter(s => !invited.has(s.contact.id)).forEach(s => out.push({ key: "s_" + s.contact.id, invite: null, contact: s.contact, eventIds: s.eventIds }));
    const rank = (r) => (!r.invite ? 0 : r.invite.replied_at ? 3 : r.invite.sent_at ? 2 : 1);
    return out.sort((a, b) => rank(a) - rank(b) || (fullName(a.contact) || a.invite?.name || "").localeCompare(fullName(b.contact) || b.invite?.name || ""));
  }, [mine, suggestions, contactById]);

  const counts = { sent: mine.filter(i => i.sent_at).length, replied: mine.filter(i => i.replied_at).length };

  const patchInvite = (inv) => setInvites(list => list.some(i => i.id === inv.id) ? list.map(i => (i.id === inv.id ? inv : i)) : [inv, ...list]);

  const ensureInvite = async (row) => {
    if (row.invite) return row.invite;
    const c = row.contact;
    const { invite, error } = await createSurveyInvite({ survey_id: survey.id, contact_id: c?.id || null, name: fullName(c), email: c?.email || "", event_ids: row.eventIds });
    if (error) { showToast?.("Could not create the link: " + error, "err"); return null; }
    patchInvite(invite);
    return invite;
  };

  const copyEmail = async (row) => {
    setBusyRow(row.key);
    const inv = await ensureInvite(row);
    if (inv) {
      const evs = (inv.event_ids || []).map(id => evById.get(id)).filter(Boolean);
      const mail = surveyEmail({ firstName: (inv.name || "").split(" ")[0] || row.contact?.first_name, audience, events: evs, url: linkFor(inv) });
      const to = inv.email || row.contact?.email;
      const ok = await copyText(`To: ${to || "(no email on file)"}\nSubject: ${mail.subject}\n\n${mail.body}`);
      showToast?.(ok ? "Email copied ✓ Paste it into Gmail, then mark it sent." : "Copy failed. Use Copy link instead.", ok ? undefined : "err");
    }
    setBusyRow("");
  };

  const copyLink = async (row) => {
    setBusyRow(row.key);
    const inv = await ensureInvite(row);
    if (inv) showToast?.((await copyText(linkFor(inv))) ? "Link copied ✓" : "Copy failed: " + linkFor(inv), undefined);
    setBusyRow("");
  };

  const toggleSent = async (row) => {
    setBusyRow(row.key);
    const inv = await ensureInvite(row);
    if (inv) {
      const { invite, error } = await updateSurveyInvite(inv.id, { sent_at: inv.sent_at ? null : new Date().toISOString() });
      if (error) showToast?.("Could not save: " + error, "err");
      else { patchInvite(invite); showToast?.(invite.sent_at ? "Marked sent ✓" : "Marked not sent"); }
    }
    setBusyRow("");
  };

  const removeInvite = async (row) => {
    if (row.invite.replied_at) { showToast?.("This person already answered. Their reply stays.", "err"); return; }
    const { error } = await deleteSurveyInvite(row.invite.id);
    if (error) { showToast?.("Could not delete: " + error, "err"); return; }
    setInvites(list => list.filter(i => i.id !== row.invite.id));
    showToast?.("Link deleted. It no longer works.");
  };

  const startEdit = (row) => setEditRow({ id: row.invite.id, name: row.invite.name || fullName(row.contact), email: row.invite.email || row.contact?.email || "", eventIds: [...(row.invite.event_ids || [])] });
  const saveEdit = async () => {
    if (!editRow.eventIds.length) { showToast?.("Pick at least one night.", "err"); return; }
    const { invite, error } = await updateSurveyInvite(editRow.id, { name: editRow.name.trim(), email: editRow.email.trim(), event_ids: editRow.eventIds });
    if (error) { showToast?.("Could not save: " + error, "err"); return; }
    patchInvite(invite); setEditRow(null); showToast?.("Link updated ✓ The same link now shows these nights.");
  };

  const addMatches = useMemo(() => {
    const q = addQ.trim().toLowerCase();
    if (q.length < 2 || addContact) return [];
    return contacts.filter(c => `${fullName(c)} ${c.email || ""}`.toLowerCase().includes(q)).slice(0, 6);
  }, [addQ, contacts, addContact]);

  const saveAdd = async () => {
    if (!addContact || !addEvents.length) return;
    const { invite, error } = await createSurveyInvite({ survey_id: survey.id, contact_id: addContact.id, name: fullName(addContact), email: addContact.email || "", event_ids: addEvents });
    if (error) { showToast?.("Could not create the link: " + error, "err"); return; }
    patchInvite(invite);
    setAdding(false); setAddQ(""); setAddContact(null); setAddEvents([]);
    showToast?.(`Link ready for ${fullName(addContact)} ✓`);
  };

  /* ── editor ── */
  const edit = (fn) => { setDraft(d => { const n = JSON.parse(JSON.stringify(d)); fn(n); return n; }); setDirty(true); };
  const setQ = (i, patch) => edit(d => { Object.assign(d.questions[i], patch); });
  const changeType = (i, type) => edit(d => {
    const old = d.questions[i];
    const fresh = blankQuestion(type);
    // A new id: answers to the old type must never be read as answers to the new one.
    d.questions[i] = { ...fresh, label: old.label, hint: old.hint,
      options: fresh.options.length && old.options.length >= 2 ? old.options : fresh.options };
  });
  const move = (i, dir) => edit(d => { const j = i + dir; if (j < 0 || j >= d.questions.length) return; [d.questions[i], d.questions[j]] = [d.questions[j], d.questions[i]]; });
  const listEdit = (i, key, j, val) => edit(d => {
    const arr = d.questions[i][key];
    if (val === undefined) arr.splice(j, 1); else if (j === arr.length) arr.push(val); else arr[j] = val;
  });
  const problems = draft ? surveyProblems(sanitizeSurvey(draft)) : [];

  const save = async () => {
    if (problems.length) { showToast?.(problems[0], "err"); return; }
    setSaving(true);
    const clean = { ...sanitizeSurvey(draft), id: draft.id, audience: draft.audience };
    const { error } = await saveSurvey(clean);
    setSaving(false);
    if (error) { showToast?.("Could not save: " + error, "err"); return; }
    setSurveys(list => list.map(s => (s.id === clean.id ? { ...s, ...clean, saved: true } : s)));
    setDirty(false);
    showToast?.("Survey saved ✓ New and reopened links use it now.");
  };

  if (loadErr) return <div className="sv"><style>{SV_STYLES}</style><div className="sv-note">{loadErr}</div></div>;
  if (!surveys || !draft) return <div className="sv"><style>{SV_STYLES}</style><div className="sv-empty">Loading surveys…</div></div>;

  const replies = mine.filter(i => i.replied_at).sort((a, b) => b.replied_at.localeCompare(a.replied_at));
  const tallies = tallySurvey(survey, mine);
  const quotes = replies.flatMap(inv => (inv.questions || []).filter(q => q.type === "testimonial").map(q => ({ inv, t: inv.answers?.[q.id] }))).filter(x => x.t?.text);
  const switchAudience = (a) => {
    if (a === audience) return;
    if (dirty) { showToast?.("Save the question changes first (or reload to drop them).", "err"); setTab("edit"); return; }
    setAudience(a);
  };

  return (
    <div className="sv">
      <style>{SV_STYLES}</style>
      <div className="sv-top">
        <div>
          <h1>Impact survey</h1>
          <p>Short surveys for hosts and showcase artists. Their answers prove the space works: they feed Grant Metrics attendance and its quotes.</p>
        </div>
        <div style={{ fontSize: 13, color: "var(--dim)" }}>{counts.replied} replied · {counts.sent} sent · {mine.length} links</div>
      </div>

      <div className="sv-bar">
        {Object.entries(SURVEY_AUDIENCES).map(([k, l]) => <button key={k} className="sv-chip" aria-pressed={audience === k} onClick={() => switchAudience(k)}>{l}</button>)}
        <span className="sv-sep" />
        {[["replies", `Replies (${replies.length})`], ["send", "Send"], ["edit", `Edit questions${dirty ? " •" : ""}`]].map(([k, l]) => (
          <button key={k} className="sv-chip" aria-pressed={tab === k} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {/* ═══ REPLIES ═══ */}
      {tab === "replies" && (replies.length === 0
        ? <div className="sv-card sv-empty">No replies yet. Open <button className="sv-lnk" onClick={() => setTab("send")}>Send</button> to hand out links.</div>
        : <>
          {tallies.some(t => t.total) && <div className="sv-grid">{tallies.filter(t => t.total).map(t => (
            <div className="sv-card" key={t.q.id}>
              <div className="sv-qt">{t.q.label}</div>
              {t.rows ? t.rows.map(r => <div key={r.row} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 12, color: "var(--dim)", marginBottom: 3 }}>{r.row}</div>
                  <Bars counts={r.counts} total={t.total} />
                </div>)
                : <Bars counts={t.counts} total={t.total} />}
              <div className="sv-empty" style={{ fontSize: 11.5, marginTop: 6 }}>{t.total} answered{t.avg != null ? ` · average ${t.avg.toFixed(1)} of 5` : ""}</div>
            </div>
          ))}</div>}

          {quotes.length > 0 && <div className="sv-card" style={{ marginBottom: 18 }}>
            <div className="sv-h">In their words</div>
            {quotes.map(({ inv, t }, i) => (
              <div className="sv-q" key={inv.id + i}>“{t.text}”
                <small>{t.share === "name" ? (t.credit || inv.name) : t.share === "anon" ? "Anonymous (OK to share)" : `${inv.name} · not for sharing`}
                  {t.share !== "no" && <> · <button className="sv-lnk" onClick={async () => showToast?.((await copyText(`“${t.text}”${t.share === "name" ? ` (${t.credit || inv.name})` : ""}`)) ? "Quote copied ✓" : "Copy failed", undefined)}>Copy</button></>}
                </small>
              </div>
            ))}
          </div>}

          <div className="sv-card">
            <div className="sv-h">Every reply</div>
            {replies.map(inv => {
              const c = contactById.get(inv.contact_id);
              return (
                <div className="sv-rep" key={inv.id}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "baseline" }}>
                    {c ? <button className="sv-lnk" style={{ fontSize: 14, fontWeight: 900, color: "#030000", textDecoration: "none" }} onClick={() => openContact?.(c)}>{inv.name || fullName(c)}</button>
                      : <b>{inv.name || "Someone"}</b>}
                    <span className="sv-empty" style={{ fontSize: 12 }}>{(inv.event_ids || []).map(id => evById.get(id)).filter(Boolean).map(eventLabel).join(" · ")} · replied {fmtWhen(inv.replied_at)}</span>
                  </div>
                  <dl>{(inv.questions || []).map(q => {
                    const t = answerText(q, inv.answers?.[q.id], evById);
                    return t ? [<dt key={q.id + "t"}>{q.label}</dt>, <dd key={q.id + "d"}>{t}</dd>] : null;
                  })}</dl>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ═══ SEND ═══ */}
      {tab === "send" && <>
        <div className="sv-note" style={{ background: "#F4F4F0", borderLeftColor: "var(--cyan)" }}>
          The CRM never emails anyone. <b>Copy email</b> copies one plain message with that person's link; paste it into Gmail, send it, then press <b>Mark sent</b>.
          {audience === "host" ? " Hosts are the linked host on past events marked Partner or Rental." : " Artists are contacts tagged Showcase who are linked to a past event."}
        </div>
        {hostsWithoutPerson.length > 0 && <div className="sv-note">
          <b>{hostsWithoutPerson.length} partner or rental event{hostsWithoutPerson.length === 1 ? " has" : "s have"} no host linked:</b> {hostsWithoutPerson.slice(0, 8).map(eventLabel).join(", ")}{hostsWithoutPerson.length > 8 ? "…" : ""}. Tag the host as Event Host on the event's People, or add them below.
        </div>}

        <div className="sv-bar">
          <button className="sv-btn2" onClick={() => setAdding(a => !a)}>{adding ? "Cancel" : "+ Add someone"}</button>
        </div>
        {adding && <div className="sv-card sv-add">
          <div>
            <label className="sv-lbl" htmlFor="sv-add-q">Person</label>
            {addContact
              ? <div style={{ fontSize: 13 }}><b>{fullName(addContact)}</b> {addContact.email && <span className="sv-empty">· {addContact.email}</span>} <button className="sv-lnk" onClick={() => { setAddContact(null); setAddQ(""); }}>change</button></div>
              : <>
                <input id="sv-add-q" className="sv-in" value={addQ} placeholder="Search contacts by name or email" onChange={e => setAddQ(e.target.value)} />
                {addMatches.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                  {addMatches.map(c => <button key={c.id} className="sv-btn2" onClick={() => setAddContact(c)}>{fullName(c) || c.email}</button>)}
                </div>}
              </>}
          </div>
          <div>
            <span className="sv-lbl">Which nights? ({addEvents.length} picked)</span>
            <div className="sv-evs">{held.slice(0, 60).map(ev => (
              <button key={ev.id} className="sv-chip" aria-pressed={addEvents.includes(ev.id)}
                onClick={() => setAddEvents(l => (l.includes(ev.id) ? l.filter(x => x !== ev.id) : [...l, ev.id]))}>{eventLabel(ev)}</button>
            ))}</div>
          </div>
          <div><button className="sv-btn" disabled={!addContact || !addEvents.length} onClick={saveAdd}>Create link</button></div>
        </div>}

        {rows.length === 0
          ? <div className="sv-card sv-empty">{audience === "host"
              ? "No one to survey yet. Mark past events as Partner or Rental (Grant Metrics or the event's Outcomes tile), or add someone above."
              : "No one to survey yet. Tag performers and artists as Showcase and link them to their event, or add someone above."}</div>
          : <div className="sv-tw"><table className="sv-t">
            <thead><tr><th>Person</th><th>Nights</th><th>Status</th><th style={{ textAlign: "right" }}>Actions</th></tr></thead>
            <tbody>{rows.map(r => {
              const inv = r.invite;
              const c = r.contact;
              const orgName = c && orgById.get((c.org_ids || [])[0])?.name;
              // The email typed on the link wins; otherwise the contact's own.
              const email = inv?.email || c?.email;
              const evs = r.eventIds.map(id => evById.get(id)).filter(Boolean);
              const busy = busyRow === r.key;
              return (
                [<tr key={r.key}>
                  <td><b>{inv?.name || fullName(c) || "Unknown"}</b><small>{[orgName, email || "no email on file"].filter(Boolean).join(" · ")}</small></td>
                  <td>{evs.length === 1 ? eventLabel(evs[0]) : `${evs.length} nights`}{evs.length > 1 && <small>{evs.map(e => e.name).slice(0, 3).join(", ")}{evs.length > 3 ? "…" : ""}</small>}</td>
                  <td>{inv?.replied_at ? <span className="sv-tag ok">Replied {fmtWhen(inv.replied_at)}</span>
                    : inv?.sent_at ? <span className="sv-tag sent">Sent {fmtWhen(inv.sent_at)}</span>
                    : <span className="sv-tag">{inv ? "Link ready" : "Not sent"}</span>}</td>
                  <td><div className="sv-acts">
                    {!inv?.replied_at && <button className="sv-btn2" disabled={busy || !email} title={email ? "" : "Add an email to this contact first"} onClick={() => copyEmail(r)}>Copy email</button>}
                    <button className="sv-btn2" disabled={busy} onClick={() => copyLink(r)}>Copy link</button>
                    {!inv?.replied_at && <button className="sv-btn2" disabled={busy} onClick={() => toggleSent(r)}>{inv?.sent_at ? "Unmark sent" : "Mark sent"}</button>}
                    {inv && !inv.replied_at && <button className="sv-btn2" disabled={busy} onClick={() => (editRow?.id === inv.id ? setEditRow(null) : startEdit(r))}>{editRow?.id === inv.id ? "Close" : "Edit"}</button>}
                    {inv && !inv.replied_at && <button className="sv-btn2" disabled={busy} title="Delete this link" onClick={() => removeInvite(r)}>✕</button>}
                  </div></td>
                </tr>,
                editRow && inv && editRow.id === inv.id && <tr key={r.key + "_edit"}><td colSpan={4} style={{ background: "#FAFAF8" }}>
                  <div className="sv-add" style={{ margin: 0 }}>
                    <div className="sv-two">
                      <div><label className="sv-lbl" htmlFor="sv-ed-name">Name on the survey</label>
                        <input id="sv-ed-name" className="sv-in" value={editRow.name} onChange={e => setEditRow({ ...editRow, name: e.target.value })} /></div>
                      <div><label className="sv-lbl" htmlFor="sv-ed-email">Send to (email)</label>
                        <input id="sv-ed-email" className="sv-in" value={editRow.email} placeholder="name@example.com" onChange={e => setEditRow({ ...editRow, email: e.target.value })} /></div>
                    </div>
                    <div>
                      <span className="sv-lbl">Nights this link covers ({editRow.eventIds.length} picked)</span>
                      <div className="sv-evs">{held.slice(0, 60).map(ev => (
                        <button key={ev.id} className="sv-chip" aria-pressed={editRow.eventIds.includes(ev.id)}
                          onClick={() => setEditRow({ ...editRow, eventIds: editRow.eventIds.includes(ev.id) ? editRow.eventIds.filter(x => x !== ev.id) : [...editRow.eventIds, ev.id] })}>{eventLabel(ev)}</button>
                      ))}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}><button className="sv-btn" onClick={saveEdit}>Save</button><button className="sv-btn2" onClick={() => setEditRow(null)}>Cancel</button></div>
                  </div>
                </td></tr>]
              );
            })}</tbody>
          </table></div>}
      </>}

      {/* ═══ EDIT ═══ */}
      {tab === "edit" && <>
        <div className="sv-card" style={{ display: "grid", gap: 10, marginBottom: 12 }}>
          <div><label className="sv-lbl" htmlFor="sv-title">Title</label>
            <input id="sv-title" className="sv-in" value={draft.title} onChange={e => edit(d => { d.title = e.target.value; })} /></div>
          <div><label className="sv-lbl" htmlFor="sv-intro">Intro (under the title)</label>
            <textarea id="sv-intro" className="sv-ta" value={draft.intro} onChange={e => edit(d => { d.intro = e.target.value; })} /></div>
          <div><label className="sv-lbl" htmlFor="sv-thanks">Thank-you message (after they send)</label>
            <textarea id="sv-thanks" className="sv-ta" value={draft.thanks} onChange={e => edit(d => { d.thanks = e.target.value; })} /></div>
        </div>

        {draft.questions.map((q, i) => (
          <div className="sv-eq" key={q.id}>
            <div className="sv-eq-hd">
              <span className="n">{i + 1}</span>
              <input className="sv-in grow" aria-label={`Question ${i + 1}`} value={q.label} placeholder="Question" onChange={e => setQ(i, { label: e.target.value })} />
              <select className="sv-sel ty" aria-label={`Question ${i + 1} type`} value={q.type} onChange={e => changeType(i, e.target.value)}>
                {Object.entries(SURVEY_TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
              <button className="sv-x" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>▲</button>
              <button className="sv-x" aria-label="Move down" disabled={i === draft.questions.length - 1} onClick={() => move(i, 1)}>▼</button>
              <button className="sv-x" aria-label="Delete question" onClick={() => edit(d => { d.questions.splice(i, 1); })}>✕</button>
            </div>
            <input className="sv-in" aria-label={`Question ${i + 1} hint`} value={q.hint} placeholder="Hint under the question (optional)" onChange={e => setQ(i, { hint: e.target.value })} />
            {q.type === "rating_rows" && <ListEditor label="Rows (one statement each)" items={q.rows} add="+ Row"
              onChange={(j, v) => listEdit(i, "rows", j, v)} />}
            {["single", "multi", "rating_rows"].includes(q.type) && <ListEditor label={q.type === "rating_rows" ? "Answer choices for every row" : "Options"} items={q.options} add="+ Option"
              onChange={(j, v) => listEdit(i, "options", j, v)} />}
            {q.type === "event_count" && <div className="sv-empty" style={{ fontSize: 12 }}>Shows one number box per night on the person's link. Answers fill blank headcounts in Grant Metrics.</div>}
            {q.type === "testimonial" && <div className="sv-empty" style={{ fontSize: 12 }}>Adds "Can we share what you wrote?" (with my name / anonymously / no) and a "Credit me as" box. Only shareable quotes reach Grant Metrics.</div>}
            {q.type === "scale" && <div className="sv-empty" style={{ fontSize: 12 }}>Shows 1 2 3 4 5. Say what 1 and 5 mean in the hint.</div>}
          </div>
        ))}

        <div className="sv-bar">
          <button className="sv-btn2" onClick={() => edit(d => { d.questions.push(blankQuestion("single")); })}>+ Add question</button>
          <button className="sv-lnk" onClick={() => { edit(d => { const def = JSON.parse(JSON.stringify(DEFAULT_SURVEYS[d.audience])); d.title = def.title; d.intro = def.intro; d.thanks = def.thanks; d.questions = def.questions.map(q => ({ ...q, id: q.id || newQuestionId() })); }); showToast?.("Defaults loaded. Save to keep them."); }}>Reset to the starting questions</button>
        </div>

        <div className="sv-sticky">
          <button className="sv-btn" disabled={saving || !dirty} onClick={save}>{saving ? "Saving…" : "Save survey"}</button>
          <button className="sv-btn2" onClick={() => setPreview(true)}>Preview</button>
          {dirty && <span className="sv-empty" style={{ fontSize: 12 }}>Unsaved changes</span>}
          {problems.length > 0 && <span style={{ fontSize: 12, color: "#B3005F" }}>{problems[0]}</span>}
          <span className="sv-empty" style={{ fontSize: 12, marginLeft: "auto" }}>Replies already in keep the questions they answered.</span>
        </div>
      </>}

      {preview && <div className="sv-prev" onMouseDown={e => { if (e.target === e.currentTarget) setPreview(false); }}>
        <div className="sv-prev-in">
          <div className="sv-prev-bar"><span>Preview · nothing is sent</span><button className="sv-btn2" onClick={() => setPreview(false)}>Close</button></div>
          <SurveyForm preview={{
            survey: sanitizeSurvey(draft),
            name: audience === "host" ? "Jonathan Winkles" : "Tim Falvey",
            events: held.slice(0, audience === "host" ? 2 : 1),
          }} />
        </div>
      </div>}
    </div>
  );
}

function Bars({ counts, total }) {
  const max = Math.max(1, ...counts.map(([, n]) => n));
  return <div className="sv-bars">{counts.map(([o, n]) => (
    <div className="sv-br" key={o}><span>{o}</span><div className="tr"><i style={{ width: (n / max * 100) + "%" }} /></div><b>{n}</b></div>
  ))}{!total && <div className="sv-empty">No answers yet.</div>}</div>;
}

function ListEditor({ label, items, add, onChange }) {
  return <div>
    <span className="sv-lbl">{label}</span>
    <div className="sv-opts">
      {items.map((v, j) => (
        <div className="sv-opt" key={j}>
          <input className="sv-in" aria-label={`${label} ${j + 1}`} value={v} onChange={e => onChange(j, e.target.value)} />
          <button className="sv-x" aria-label="Remove" onClick={() => onChange(j, undefined)}>✕</button>
        </div>
      ))}
      <div><button className="sv-btn2" onClick={() => onChange(items.length, "")}>{add}</button></div>
    </div>
  </div>;
}
