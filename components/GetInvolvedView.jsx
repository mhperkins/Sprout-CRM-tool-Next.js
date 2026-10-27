"use client";

/**
 * GetInvolvedView.jsx — the CRM page for the public /get-involved form.
 *
 * Entries arrive inert in sprout_interest. "Add as contact" is the ONLY thing that
 * writes to sprout_contacts, and it only ever creates: an entry whose email already
 * belongs to a contact shows "In CRM" with a link to that record instead, so this
 * page can never make a duplicate or merge over someone's history.
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { fetchInterest, updateInterest, deleteInterest } from "../lib/services";
import { INTERESTS, interestLabel } from "../lib/interestForm";
import { splitName } from "../lib/showcaseForm";

const GV_STYLES = `
.gv{--line:#E3E3DD;--sunk:#F1F1EC;--dim:#5F5F57;--faint:#9A9A90;--ok:#15804A;--ok-bg:#E4F3EA;--crit:#B3005F;}
.gv-top{display:flex;gap:14px 20px;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;padding-bottom:14px;border-bottom:2px solid var(--black);margin-bottom:18px}
.gv-top h1{font-size:30px;font-weight:900;letter-spacing:-.02em;line-height:1.05}
.gv-top p{color:var(--dim);font-size:13px;margin-top:5px;max-width:62ch}
.gv-top-r{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.gv-act{appearance:none;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;border:1px solid var(--line);background:#fff;color:#2c2c26;border-radius:5px;padding:6px 11px;white-space:nowrap;text-decoration:none;text-align:center}
.gv-act:hover{background:var(--sunk);border-color:var(--dim)}
.gv-act.pri{background:var(--black);color:var(--white);border-color:var(--black)}
.gv-act.danger{color:var(--crit)}
.gv-act:disabled{opacity:.5;cursor:not-allowed}
.gv-filters{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px;align-items:center}
.gv-tab{appearance:none;font:inherit;font-size:13px;font-weight:700;cursor:pointer;border:1.5px solid var(--line);background:#fff;color:var(--dim);border-radius:999px;padding:6px 14px}
.gv-tab[aria-pressed="true"]{background:var(--black);color:var(--white);border-color:var(--black)}
.gv-tab .n{font-variant-numeric:tabular-nums;opacity:.7;margin-left:6px}
.gv-gap{width:12px}
.gv-list{display:flex;flex-direction:column;gap:12px}
.gv-card{background:#fff;border:1px solid var(--line);border-radius:10px;box-shadow:var(--sh-sm);display:grid;grid-template-columns:minmax(0,1fr) 190px;gap:18px;padding:16px 18px}
.gv-hd{display:flex;gap:9px;align-items:baseline;flex-wrap:wrap;margin-bottom:3px}
.gv-hd h3{font-size:16px;font-weight:900;margin:0}
.gv-tag{font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;border-radius:4px;padding:2px 7px;border:1px solid var(--line);color:var(--dim)}
.gv-tag.known{background:var(--banana-lt);color:#8A6100;border-color:transparent}
.gv-tag.ok{background:var(--ok-bg);color:var(--ok);border-color:transparent}
.gv-meta{color:var(--dim);font-size:12.5px;margin-bottom:9px;display:flex;gap:4px 10px;flex-wrap:wrap;overflow-wrap:anywhere}
.gv-chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:9px}
.gv-chip{font-size:12px;font-weight:700;border-radius:999px;padding:3px 10px;background:var(--cyan-lt);color:#1d6d7e}
.gv-msg{font-size:13.5px;line-height:1.6;color:#2c2c26;white-space:pre-wrap;max-width:74ch;overflow-wrap:anywhere}
.gv-side{display:flex;flex-direction:column;gap:7px}
.gv-empty{background:#fff;border:1px solid var(--line);border-radius:10px;padding:44px 24px;text-align:center}
.gv-empty b{display:block;font-size:16px;margin-bottom:6px}
.gv-empty p{color:var(--dim);font-size:13.5px;max-width:52ch;margin:0 auto}
.gv-link-box{display:inline-flex;gap:8px;align-items:center;background:var(--sunk);border:1px solid var(--line);border-radius:7px;padding:7px 11px;font-size:12.5px;color:var(--dim);flex-wrap:wrap;margin-top:16px}
.gv-link-box code{font-family:ui-monospace,Menlo,Consolas,monospace;color:var(--black);overflow-wrap:anywhere}
@media (max-width:820px){.gv-card{grid-template-columns:minmax(0,1fr)}}
`;

const STATUS_TABS = [
  { id: "new", label: "New" },
  { id: "followed_up", label: "Followed up" },
];

// Interest → contact relationship type, for the ones that have a clear match.
const TYPE_FOR = { showcase: "showcase", hosting: "event_host", partnering: "partner" };

const today = () => new Date().toISOString().slice(0, 10);
const fmtWhen = (iso) => {
  try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
  catch { return ""; }
};
const slug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);
const lc = (s) => String(s || "").trim().toLowerCase();
const emailsOf = (c) => [c.email, ...(Array.isArray(c.alt_emails) ? c.alt_emails : [])].map(lc).filter(Boolean);

export default function GetInvolvedView({ contacts, onCreateContact, openContact, showToast }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState("");
  const [tab, setTab] = useState("new");
  const [interest, setInterest] = useState("");
  const [confirmDel, setConfirmDel] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await fetchInterest();
    setRows(data);
    setLoadErr(error || "");
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const matchOf = useCallback(
    (r) => {
      if (r.contact_id) return contacts.find((c) => c.id === r.contact_id) || null;
      const e = lc(r.email);
      return e ? contacts.find((c) => emailsOf(c).includes(e)) || null : null;
    },
    [contacts]
  );

  const counts = useMemo(() => {
    const c = { new: 0, followed_up: 0 };
    rows.forEach((r) => { if (c[r.status] != null) c[r.status] += 1; });
    return c;
  }, [rows]);

  const shown = useMemo(
    () => rows.filter((r) => r.status === tab && (!interest || (r.interests || []).includes(interest))),
    [rows, tab, interest]
  );

  const patch = async (id, p) => {
    const { error } = await updateInterest(id, p);
    if (error) { console.error("interest patch:", error); showToast("Save failed. Check the console.", "err"); return false; }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...p } : r)));
    return true;
  };

  const markFollowed = async (r) => {
    if (await patch(r.id, { status: "followed_up" })) showToast("Marked followed up");
  };
  const reopen = async (r) => {
    if (await patch(r.id, { status: "new" })) showToast("Moved back to New");
  };
  const remove = async (r) => {
    const { error } = await deleteInterest(r.id);
    if (error) { showToast("Delete failed. Check the console.", "err"); return; }
    setRows((prev) => prev.filter((x) => x.id !== r.id));
    setConfirmDel(null);
    showToast("Entry deleted");
  };

  /* Add as contact: create-only. Never runs when the email already matches a contact. */
  const addContact = async (r) => {
    if (matchOf(r)) return;
    const { first, last } = splitName(r.name);
    const base = slug(r.name) || `interest_${r.id.slice(4)}`;
    let id = `ind_${base}`;
    let n = 2;
    while (contacts.some((c) => c.id === id)) id = `ind_${base}_${n++}`;
    const labels = (r.interests || []).map(interestLabel).join(", ");
    const stamp = today();
    const contact = {
      id,
      record_type: "individual",
      org_id: null,
      org_ids: [],
      first_name: first,
      last_name: last,
      email: r.email || null,
      alt_emails: [],
      phone: "",
      website: "",
      instagram_handle: r.instagram || "",
      relationship_types: [...new Set((r.interests || []).map((i) => TYPE_FOR[i]).filter(Boolean))],
      other_description: "",
      how_heard: r.how_heard || "Get involved form (/get-involved)",
      segment: "community",
      is_member: false,
      campaign: "",
      campaign_id: "",
      tags: ["get_involved"],
      notes: [`Get involved form ${stamp}. Interested in: ${labels}.`, r.message || ""].filter(Boolean).join("\n"),
      relationship_status: "warm",
      next_action: "",
      next_action_date: null,
      next_actions: [],
      touchpoints: [{ date: stamp, summary: `Filled out the Get involved form (${labels}).`, next_action: "", next_action_date: null }],
      createdAt: new Date().toISOString(),
    };
    onCreateContact(contact);
    if (await patch(r.id, { contact_id: id })) showToast(`Added ${r.name || r.email} to your contacts`);
  };

  const copy = (text, done) => {
    navigator.clipboard?.writeText(text).then(() => showToast(done), () => showToast(text, "err"));
  };
  const linkUrl = () => `${window.location.origin}/get-involved`;

  const card = (r) => {
    const match = matchOf(r);
    return (
      <article className="gv-card" key={r.id}>
        <div style={{ minWidth: 0 }}>
          <div className="gv-hd">
            <h3>{r.name || "(no name given)"}</h3>
            {match && <span className={`gv-tag ${r.contact_id ? "ok" : "known"}`}>{r.contact_id ? "Added" : "In CRM"}</span>}
          </div>
          <div className="gv-meta">
            <span>{r.email}</span>
            {r.instagram && <span>{r.instagram}</span>}
            {r.how_heard && <span>Heard via {r.how_heard}</span>}
            <span>{fmtWhen(r.created_at)}</span>
          </div>
          <div className="gv-chips">{(r.interests || []).map((i) => <span key={i} className="gv-chip">{interestLabel(i)}</span>)}</div>
          {r.message && <div className="gv-msg">{r.message}</div>}
        </div>
        <div className="gv-side">
          {match
            ? <button className="gv-act" onClick={() => openContact?.(match)}>Open {match.first_name || "contact"}</button>
            : <button className="gv-act pri" onClick={() => addContact(r)}>Add as contact</button>}
          {r.status === "new"
            ? <button className="gv-act" onClick={() => markFollowed(r)}>Mark followed up</button>
            : <button className="gv-act" onClick={() => reopen(r)}>Move back to New</button>}
          <button className="gv-act" onClick={() => copy(r.email, "Email copied")}>Copy email</button>
          {confirmDel === r.id
            ? <button className="gv-act danger" onClick={() => remove(r)}>Confirm delete</button>
            : <button className="gv-act danger" onClick={() => setConfirmDel(r.id)}>Delete</button>}
        </div>
      </article>
    );
  };

  return (
    <div className="gv">
      <style dangerouslySetInnerHTML={{ __html: GV_STYLES }} />

      <div className="gv-top">
        <div>
          <h1>Get Involved</h1>
          <p>
            Everyone who filled out /get-involved. Nothing here is in your contacts until you
            press Add as contact. People whose email is already in the CRM show "In CRM".
          </p>
        </div>
        <div className="gv-top-r">
          <button className="gv-act" onClick={() => copy(linkUrl(), "Link copied")}>Copy the /get-involved link</button>
          <button className="gv-act" onClick={load} disabled={loading}>{loading ? "Loading…" : "Refresh"}</button>
        </div>
      </div>

      <div className="gv-filters">
        {STATUS_TABS.map((t) => (
          <button key={t.id} className="gv-tab" aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}<span className="n">{counts[t.id]}</span>
          </button>
        ))}
        <span className="gv-gap" />
        <button className="gv-tab" aria-pressed={!interest} onClick={() => setInterest("")}>All interests</button>
        {INTERESTS.map((i) => (
          <button key={i.id} className="gv-tab" aria-pressed={interest === i.id} onClick={() => setInterest(i.id)}>{i.short}</button>
        ))}
      </div>

      {loading ? (
        <div className="gv-empty"><b>Loading…</b></div>
      ) : loadErr ? (
        <div className="gv-empty"><b>Could not load entries</b><p>{loadErr}. Press Refresh to try again.</p></div>
      ) : shown.length === 0 ? (
        <div className="gv-empty">
          <b>{rows.length === 0 ? "No one has filled out the Get involved form yet" : tab === "new" ? "Nothing new here" : "No one followed up yet"}</b>
          <p>{rows.length === 0 ? "Share the link and entries land here. You also get an email for each one." : interest ? "Try All interests." : "Entries you mark followed up move to the other tab."}</p>
          {rows.length === 0 && (
            <div className="gv-link-box">
              <code>/get-involved</code>
              <button className="gv-act" onClick={() => copy(linkUrl(), "Link copied")}>Copy link</button>
            </div>
          )}
        </div>
      ) : (
        <div className="gv-list">{shown.map(card)}</div>
      )}
    </div>
  );
}
