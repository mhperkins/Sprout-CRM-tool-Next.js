"use client";

// The Past participants tab on the Showcase page: everyone tagged Showcase plus
// everyone who sent a program form for any event. Read-only.

import { useMemo, useState } from "react";
import { buildPastParticipants, showLabel, inviteFor } from "../lib/pastParticipants";

const PP_STYLES = `
.pp-bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px}
.pp-bar input{font:inherit;font-size:13.5px;padding:7px 11px;border:1px solid var(--line);border-radius:6px;min-width:220px;flex:1 1 220px;max-width:340px;background:#fff;color:#030000;color-scheme:light}
.pp-bar .sp{flex:1}
.pp-note{font-size:12.5px;color:var(--dim);margin-bottom:12px}
.pp-list{background:#fff;border:1px solid var(--line);border-radius:10px;box-shadow:var(--sh-sm);overflow:hidden}
.pp-row{display:grid;grid-template-columns:44px 1fr auto;gap:12px;align-items:center;padding:11px 14px;border-top:1px solid var(--line)}
.pp-row:first-child{border-top:0}
.pp-av{width:44px;height:44px;border-radius:50%;object-fit:cover;background:var(--sunk);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:14px;color:var(--dim)}
.pp-nm{font-weight:900;font-size:14.5px;display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}
.pp-nm a{font-weight:700;font-size:12.5px;color:#2a8ca0;text-decoration:none}
.pp-sub{display:flex;gap:6px;flex-wrap:wrap;margin-top:5px;align-items:center;font-size:12px;color:var(--dim)}
.pp-show{font-size:11.5px;font-weight:700;border-radius:4px;padding:2px 7px;background:var(--sunk);color:#2c2c26}
.pp-sv{appearance:none;font:inherit;font-size:11.5px;font-weight:700;cursor:pointer;border-radius:999px;padding:3px 10px;border:1px solid var(--line);background:#fff;color:var(--dim)}
.pp-sv.sent{background:var(--banana-lt);color:var(--warn);border-color:transparent}
.pp-sv.ok{background:var(--ok-bg);color:var(--ok);border-color:transparent}
.pp-sv:hover{border-color:var(--dim)}
.pp-r{display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:flex-end}
@media (max-width:620px){.pp-row{grid-template-columns:44px 1fr}.pp-r{grid-column:1/-1;justify-content:flex-start}}
`;

const FILTERS = [
  { id: "all", label: "All" },
  { id: "music", label: "Music" },
  { id: "art", label: "Art" },
  { id: "other", label: "Other" },
];
const ROLE_LABEL = { music: "Music", art: "Art", other: "Other" };
const today = () => new Date().toISOString().slice(0, 10);
const initials = (s) => String(s || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const fmtDate = (d) => {
  try { return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
  catch { return d; }
};

const surveyChip = (inv) =>
  inv?.replied_at ? { cls: "ok", text: "Survey replied" }
  : inv?.sent_at ? { cls: "sent", text: "Survey sent" }
  : inv ? { cls: "", text: "Survey link ready" }
  : { cls: "", text: "Survey not sent" };

export default function PastParticipants({ contacts, events, entries, invites = [], loading, openContact, openSurvey, showToast }) {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("all");

  const people = useMemo(
    () => buildPastParticipants({ contacts, events, entries, today: today() }),
    [contacts, events, entries]
  );

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase().replace(/^@/, "");
    return people.filter((p) => {
      if (role !== "all" && !p.roles.has(role)) return false;
      if (!s) return true;
      return [p.name, p.ig, p.email].some((v) => String(v || "").toLowerCase().includes(s));
    });
  }, [people, q, role]);

  const copyEmails = () => {
    const list = [...new Set(shown.map((p) => p.email).filter(Boolean))];
    if (!list.length) { showToast("No emails in this list"); return; }
    navigator.clipboard?.writeText(list.join(", "));
    showToast(`Copied ${list.length} email${list.length === 1 ? "" : "s"}`);
  };

  if (loading) return <div className="sa-empty"><b>Loading…</b></div>;

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: PP_STYLES }} />
      <div className="pp-bar">
        <input type="search" placeholder="Search name, @handle or email" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search past participants" />
        {FILTERS.map((f) => (
          <button key={f.id} className="sa-tab" aria-pressed={role === f.id} onClick={() => setRole(f.id)}>{f.label}</button>
        ))}
        <span className="sp" />
        <button className="sa-act" onClick={copyEmails}>Copy emails ({shown.filter((p) => p.email).length})</button>
      </div>
      <p className="pp-note">Everyone tagged Showcase, plus everyone who sent a program form for any event. Most shows first.</p>

      {shown.length === 0 ? (
        <div className="sa-empty">
          <b>{people.length ? "Nobody matches" : "Nobody yet"}</b>
          <p>{people.length ? "Try another name or clear the filter." : "People land here once they are tagged Showcase or send a program form."}</p>
        </div>
      ) : (
        <div className="pp-list">
          {shown.map((p) => (
            <div className="pp-row" key={p.key}>
              {p.photo ? <img className="pp-av" src={p.photo} alt="" loading="lazy" /> : <div className="pp-av">{initials(p.name)}</div>}
              <div>
                <div className="pp-nm">
                  {p.name}
                  {p.ig && <a href={`https://instagram.com/${encodeURIComponent(p.ig)}`} target="_blank" rel="noopener noreferrer">@{p.ig}</a>}
                  {[...p.roles].map((r) => <span key={r} className={`sa-tag ${r}`}>{ROLE_LABEL[r]}</span>)}
                </div>
                <div className="pp-sub">
                  {p.shows.length
                    ? p.shows.map((ev) => <span key={ev.id} className="pp-show" title={`${ev.name} · ${ev.event_date}`}>{showLabel(ev)} · {fmtDate(ev.event_date)}</span>)
                    : <span>No show on record yet</span>}
                  {p.email && <span>· {p.email}</span>}
                </div>
              </div>
              <div className="pp-r">
                {p.shows.length > 0 && (() => {
                  const chip = surveyChip(inviteFor(p, invites));
                  return <button className={`pp-sv ${chip.cls}`} title="Open the artist survey's Send tab" onClick={() => openSurvey?.()}>{chip.text}</button>;
                })()}
                {p.contact
                  ? <button className="sa-act" onClick={() => openContact(p.contact)}>Open contact</button>
                  : <span className="sa-tag known">Not in CRM</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
