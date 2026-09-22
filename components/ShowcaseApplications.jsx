"use client";

/**
 * ShowcaseApplications.jsx — the review queue for the public /showcase form.
 *
 * Applications arrive inert. Accepting one here is the ONLY thing that touches the
 * CRM: it creates or updates the contact, tags them Showcase, and adds them to the
 * night you pick. Pass keeps junk and no-thanks out of the relationship data
 * entirely. An application whose email already belongs to a contact updates that
 * record rather than making a second one — the duplicate trap this CRM keeps hitting.
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  fetchShowcaseApplications,
  updateShowcaseApplication,
  deleteShowcaseApplication,
} from "../lib/services";
import { showcaseLinks, showcaseInstagramUrl, showcaseToText, splitName } from "../lib/showcaseForm";

const SA_STYLES = `
.sa{--line:#E3E3DD;--sunk:#F1F1EC;--dim:#5F5F57;--faint:#9A9A90;--ok:#15804A;--ok-bg:#E4F3EA;--crit:#B3005F;--crit-bg:#FBE6F1;--warn:#8A6100;--warn-bg:#FAF0D6;}
.sa-top{display:flex;gap:14px 20px;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;padding-bottom:14px;border-bottom:2px solid var(--black);margin-bottom:18px}
.sa-top h1{font-size:30px;font-weight:900;letter-spacing:-.02em;line-height:1.05}
.sa-top p{color:var(--dim);font-size:13px;margin-top:5px;max-width:62ch}
.sa-top-r{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.sa-act{appearance:none;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;border:1px solid var(--line);background:#fff;color:#2c2c26;border-radius:5px;padding:6px 11px;white-space:nowrap}
.sa-act:hover{background:var(--sunk);border-color:var(--dim)}
.sa-act.pri{background:var(--black);color:var(--white);border-color:var(--black)}
.sa-act.pri:hover{background:#26261f}
.sa-act.danger{color:var(--crit)}
.sa-act:disabled{opacity:.5;cursor:not-allowed}
.sa-tabs{display:inline-flex;gap:6px;flex-wrap:wrap;margin-bottom:16px}
.sa-tab{appearance:none;font:inherit;font-size:13px;font-weight:700;cursor:pointer;border:1.5px solid var(--line);background:#fff;color:var(--dim);border-radius:999px;padding:6px 14px}
.sa-tab[aria-pressed="true"]{background:var(--black);color:var(--white);border-color:var(--black)}
.sa-tab .n{font-variant-numeric:tabular-nums;opacity:.7;margin-left:6px}
.sa-list{display:flex;flex-direction:column;gap:14px}
.sa-card{background:#fff;border:1px solid var(--line);border-radius:10px;box-shadow:var(--sh-sm);display:grid;grid-template-columns:1fr 200px;gap:20px;padding:18px}
.sa-hd{display:flex;gap:9px;align-items:baseline;flex-wrap:wrap;margin-bottom:4px}
.sa-hd h3{font-size:16px;font-weight:900;margin:0}
.sa-tag{font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;border-radius:4px;padding:2px 7px;border:1px solid var(--line);color:var(--dim)}
.sa-tag.music{background:var(--fuchsia-lt);color:#9c0069;border-color:transparent}
.sa-tag.art{background:var(--cyan-lt);color:#1d6d7e;border-color:transparent}
.sa-tag.known{background:var(--banana-lt);color:var(--warn);border-color:transparent}
.sa-tag.ok{background:var(--ok-bg);color:var(--ok);border-color:transparent}
.sa-meta{color:var(--dim);font-size:12.5px;margin-bottom:9px;display:flex;gap:4px 10px;flex-wrap:wrap}
.sa-meta a{color:#2a8ca0;font-weight:700;text-decoration:none}
.sa-pitch{font-size:13.5px;line-height:1.6;color:#2c2c26;white-space:pre-wrap;margin-bottom:10px;max-width:74ch}
.sa-note{font-size:12.5px;line-height:1.55;color:var(--dim);background:var(--sunk);border-radius:6px;padding:8px 11px;margin-bottom:10px;white-space:pre-wrap}
.sa-pills{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:10px}
.sa-pill{border:1px solid var(--line);border-radius:999px;padding:4px 12px;font-size:12.5px;color:#2a8ca0;background:#fff;font-weight:700;text-decoration:none}
.sa-pill:hover{border-color:#2a8ca0}
.sa-files{display:flex;flex-direction:column;gap:8px}
.sa-audio{width:100%;max-width:440px;height:38px}
.sa-thumbs{display:flex;gap:8px;flex-wrap:wrap}
.sa-thumbs a{display:block;width:78px;height:78px;border:1px solid var(--line);border-radius:7px;overflow:hidden;background:var(--sunk)}
.sa-thumbs img{width:100%;height:100%;object-fit:cover;display:block}
.sa-side{display:flex;flex-direction:column;gap:8px;align-content:start}
.sa-side .hint{font-size:11.5px;color:var(--faint);line-height:1.45;text-align:center}
.sa-empty{background:#fff;border:1px solid var(--line);border-radius:10px;padding:44px 24px;text-align:center}
.sa-empty b{display:block;font-size:16px;margin-bottom:6px}
.sa-empty p{color:var(--dim);font-size:13.5px;max-width:46ch;margin:0 auto}
.sa-link-box{display:flex;gap:8px;align-items:center;background:var(--sunk);border:1px solid var(--line);border-radius:7px;padding:7px 11px;font-size:12.5px;color:var(--dim);flex-wrap:wrap}
.sa-link-box code{font-family:ui-monospace,Menlo,Consolas,monospace;color:var(--black)}
@media (max-width:820px){.sa-card{grid-template-columns:1fr}}
`;

const TABS = [
  { id: "new", label: "New" },
  { id: "accepted", label: "Accepted" },
  { id: "passed", label: "Passed" },
];

const today = () => new Date().toISOString().slice(0, 10);
const fmtWhen = (iso) => {
  try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
  catch { return ""; }
};
const fmtEventDate = (d) => {
  if (!d) return "";
  try { return new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }); }
  catch { return d; }
};
const slug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);
const lc = (s) => String(s || "").trim().toLowerCase();

/** Every address we know for a contact, so a second email still finds the person. */
const emailsOf = (c) => [c.email, ...(Array.isArray(c.alt_emails) ? c.alt_emails : [])].map(lc).filter(Boolean);

export default function ShowcaseApplications({
  contacts, events, onSaveContact, onCreateContact, onUpdateEvent, openContact, showToast,
}) {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("new");
  const [accepting, setAccepting] = useState(null); // the application being placed
  const [eventId, setEventId] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setApps(await fetchShowcaseApplications());
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const c = { new: 0, accepted: 0, passed: 0 };
    apps.forEach((a) => { if (c[a.status] != null) c[a.status] += 1; });
    return c;
  }, [apps]);

  const shown = useMemo(() => apps.filter((a) => a.status === tab), [apps, tab]);

  /** The contact this application already belongs to, matched on any known address. */
  const matchOf = useCallback(
    (app) => {
      const e = lc(app.email);
      if (app.contact_id) return contacts.find((c) => c.id === app.contact_id) || null;
      if (!e) return null;
      return contacts.find((c) => emailsOf(c).includes(e)) || null;
    },
    [contacts]
  );

  const upcoming = useMemo(
    () => events
      .filter((e) => e.event_date && e.status !== "cancelled" && e.event_date >= today())
      .sort((a, b) => a.event_date.localeCompare(b.event_date)),
    [events]
  );

  const patch = async (id, p) => {
    const { error } = await updateShowcaseApplication(id, p);
    if (error) { console.error("showcase patch:", error); showToast("Save failed — check console", "err"); return false; }
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, ...p } : a)));
    return true;
  };

  const pass = async (app) => {
    if (await patch(app.id, { status: "passed" })) showToast("Passed. Nothing was added to your contacts.");
  };
  const reopen = async (app) => {
    if (await patch(app.id, { status: "new" })) showToast("Back in New");
  };
  const remove = async (app) => {
    const { error } = await deleteShowcaseApplication(app.id);
    if (error) { showToast("Delete failed — check console", "err"); return; }
    setApps((prev) => prev.filter((a) => a.id !== app.id));
    showToast("Application deleted");
  };

  /* ── Accept: the only path that writes to contacts ─────────────────────────── */
  const doAccept = async () => {
    const app = accepting;
    if (!app) return;
    setBusy(true);
    const d = app.data || {};
    const ev = eventId ? events.find((e) => e.id === eventId) : null;
    const existing = matchOf(app);
    const stamp = today();
    const where = ev ? ` for ${ev.name}` : "";
    const summary = `Applied to showcase${where} (${d.role || "showcase"}).`;

    let contact;
    if (existing) {
      // Merge, never overwrite: fill what is blank, union the types, keep their history.
      const types = new Set([...(existing.relationship_types || []), "showcase"]);
      const alt = new Set(Array.isArray(existing.alt_emails) ? existing.alt_emails : []);
      const appEmail = String(d.email || "").trim();
      if (appEmail && lc(appEmail) !== lc(existing.email) && !emailsOf(existing).includes(lc(appEmail))) {
        alt.add(appEmail);
      }
      contact = {
        ...existing,
        email: existing.email || appEmail,
        alt_emails: [...alt],
        phone: existing.phone || d.phone || "",
        instagram_handle: existing.instagram_handle || d.instagram || "",
        relationship_types: [...types],
        relationship_status: ["warm", "active"].includes(existing.relationship_status) ? existing.relationship_status : "warm",
        how_heard: existing.how_heard || "Showcase application (/showcase)",
        notes: [existing.notes, `— Showcase application ${stamp}${where}\n${d.pitch || ""}`].filter(Boolean).join("\n\n").trim(),
        touchpoints: [...(existing.touchpoints || []), { date: stamp, summary, next_action: "", next_action_date: null }],
      };
      onSaveContact(contact);
    } else {
      const { first, last } = splitName(d.name);
      let id = `ind_${slug(d.name) || `showcase_${app.id.slice(4)}`}`;
      let n = 2;
      while (contacts.some((c) => c.id === id)) id = `ind_${slug(d.name)}_${n++}`;
      contact = {
        id,
        record_type: "individual",
        org_id: null,
        org_ids: [],
        first_name: first,
        last_name: last,
        email: d.email || null,
        alt_emails: [],
        phone: d.phone || "",
        website: "",
        instagram_handle: d.instagram || "",
        relationship_types: ["showcase", d.role === "Music" ? "music" : d.role === "Art" ? "art" : null].filter(Boolean),
        other_description: "",
        how_heard: "Showcase application (/showcase)",
        segment: "community",
        is_member: false,
        campaign: "",
        campaign_id: "",
        tags: ["showcase_application"],
        notes: [`— Showcase application ${stamp}${where}`, d.pitch || "", d.notes ? `Notes: ${d.notes}` : "", ...showcaseLinks(d).map((l) => `${l.label}: ${l.url}`)].filter(Boolean).join("\n"),
        relationship_status: "warm",
        next_action: "",
        next_action_date: null,
        next_actions: [],
        touchpoints: [{ date: stamp, summary, next_action: "", next_action_date: null }],
        createdAt: new Date().toISOString(),
      };
      onCreateContact(contact);
    }

    // Put them on the night. Guarded append so a re-accept cannot duplicate the id.
    if (ev && !(ev.contact_ids || []).includes(contact.id)) {
      onUpdateEvent({ ...ev, contact_ids: [...(ev.contact_ids || []), contact.id] });
    }

    await patch(app.id, { status: "accepted", contact_id: contact.id, event_id: ev?.id || null });
    setBusy(false);
    setAccepting(null);
    setEventId("");
    showToast(existing ? `Updated ${d.name}${ev ? ` and added them to ${ev.name}` : ""}` : `Added ${d.name} to your contacts${ev ? ` and to ${ev.name}` : ""}`);
  };

  const copyLink = () => {
    const url = `${window.location.origin}/showcase`;
    navigator.clipboard?.writeText(url).then(
      () => showToast("Link copied"),
      () => showToast(url, "err")
    );
  };

  const card = (app) => {
    const d = app.data || {};
    const links = showcaseLinks(d);
    const ig = showcaseInstagramUrl(d);
    const match = matchOf(app);
    const audio = (d.files || []).filter((f) => f.kind === "audio");
    const images = (d.files || []).filter((f) => f.kind === "image");
    const other = (d.files || []).filter((f) => f.kind !== "audio" && f.kind !== "image");
    const ev = app.event_id ? events.find((e) => e.id === app.event_id) : null;
    const roleClass = d.role === "Music" ? "music" : d.role === "Art" ? "art" : "";

    return (
      <article className="sa-card" key={app.id}>
        <div>
          <div className="sa-hd">
            <h3>{d.name || "(no name given)"}</h3>
            {d.role && <span className={`sa-tag ${roleClass}`}>{d.role}</span>}
            {app.status === "accepted" && <span className="sa-tag ok">Accepted{ev ? ` · ${ev.name}` : ""}</span>}
            {app.status === "new" && match && <span className="sa-tag known">Already in the CRM</span>}
          </div>
          <div className="sa-meta">
            <span>Sent {fmtWhen(app.created_at)}</span>
            {d.email && <a href={`mailto:${d.email}`}>{d.email}</a>}
            {d.phone && <span>{d.phone}</span>}
            {ig && <a href={ig} target="_blank" rel="noopener noreferrer">{d.instagram}</a>}
          </div>
          {d.pitch && <p className="sa-pitch">{d.pitch}</p>}
          {d.notes && <div className="sa-note"><b>They noted:</b> {d.notes}</div>}
          {links.length > 0 && (
            <div className="sa-pills">
              {links.map((l) => (
                <a className="sa-pill" key={l.url} href={l.url} target="_blank" rel="noopener noreferrer">{l.label} ↗</a>
              ))}
            </div>
          )}
          {(audio.length > 0 || images.length > 0 || other.length > 0) && (
            <div className="sa-files">
              {audio.map((f) => (
                <div key={f.url}>
                  <div className="sa-meta" style={{ marginBottom: 4 }}>{f.name}</div>
                  <audio className="sa-audio" controls preload="none" src={f.url} />
                </div>
              ))}
              {images.length > 0 && (
                <div className="sa-thumbs">
                  {images.map((f) => (
                    <a key={f.url} href={f.url} target="_blank" rel="noopener noreferrer" title={f.name}>
                      <img src={f.url} alt={f.name} loading="lazy" />
                    </a>
                  ))}
                </div>
              )}
              {other.length > 0 && (
                <div className="sa-pills">
                  {other.map((f) => (
                    <a className="sa-pill" key={f.url} href={f.url} target="_blank" rel="noopener noreferrer">{f.name} ↗</a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="sa-side">
          {app.status === "new" && (
            <>
              <button className="sa-act pri" onClick={() => { setAccepting(app); setEventId(""); }}>Accept →</button>
              <span className="hint">
                {match ? <>Updates <b>{match.first_name} {match.last_name}</b> instead of making a second record</> : "Creates the contact and puts them on a night"}
              </span>
              <button className="sa-act" onClick={() => pass(app)}>Pass</button>
            </>
          )}
          {app.status === "accepted" && (
            <>
              {match && <button className="sa-act pri" onClick={() => openContact(match)}>Open in CRM</button>}
              <button className="sa-act" onClick={() => reopen(app)}>Move back to New</button>
            </>
          )}
          {app.status === "passed" && (
            <>
              <button className="sa-act" onClick={() => reopen(app)}>Move back to New</button>
              <button className="sa-act danger" onClick={() => remove(app)}>Delete</button>
            </>
          )}
          {d.email && <a className="sa-act" style={{ textAlign: "center", textDecoration: "none" }} href={`mailto:${d.email}?subject=${encodeURIComponent("Sprout N Tell")}`}>Email them</a>}
          <button className="sa-act" onClick={() => { navigator.clipboard?.writeText(showcaseToText(app)); showToast("Copied as text"); }}>Copy as text</button>
        </div>
      </article>
    );
  };

  return (
    <div className="sa">
      <style dangerouslySetInnerHTML={{ __html: SA_STYLES }} />

      <div className="sa-top">
        <div>
          <h1>Showcase applications</h1>
          <p>
            Everyone who applied at /showcase. Nothing here has touched your contacts: accepting is
            what creates or updates the record and puts them on a night.
          </p>
        </div>
        <div className="sa-top-r">
          <button className="sa-act" onClick={copyLink}>Copy the /showcase link</button>
          <button className="sa-act" onClick={load} disabled={loading}>{loading ? "Loading…" : "Refresh"}</button>
        </div>
      </div>

      <div className="sa-tabs">
        {TABS.map((t) => (
          <button key={t.id} className="sa-tab" aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}<span className="n">{counts[t.id]}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="sa-empty"><b>Loading…</b></div>
      ) : shown.length === 0 ? (
        <div className="sa-empty">
          <b>{tab === "new" ? "No new applications" : tab === "accepted" ? "Nobody accepted yet" : "Nothing passed"}</b>
          <p>
            {tab === "new"
              ? "Share the link and applications land here. Accepted ones are on the Accepted tab."
              : "Applications you act on move here."}
          </p>
          {tab === "new" && (
            <div className="sa-link-box" style={{ justifyContent: "center", marginTop: 16, display: "inline-flex" }}>
              <code>/showcase</code>
              <button className="sa-act" onClick={copyLink}>Copy link</button>
            </div>
          )}
        </div>
      ) : (
        <div className="sa-list">{shown.map(card)}</div>
      )}

      {accepting && (
        <div className="mover" onMouseDown={(e) => { if (e.target === e.currentTarget) setAccepting(null); }} onClick={(e) => { if (e.target === e.currentTarget) setAccepting(null); }}>
          <div className="modal">
            <div className="m-hd">
              <span className="m-ttl">Accept {accepting.data?.name || "this application"}</span>
              <button className="m-close" onClick={() => setAccepting(null)}>×</button>
            </div>
            <div className="m-bd">
              <p style={{ fontSize: 13.5, color: "#5F5F57", marginBottom: 14, lineHeight: 1.6 }}>
                {matchOf(accepting)
                  ? <>This email already belongs to <b>{matchOf(accepting).first_name} {matchOf(accepting).last_name}</b>, so their record gets updated. No second contact is created.</>
                  : <>This creates a new contact, tagged Showcase, in the Community bucket.</>}
              </p>
              <label className="fl">Which night?</label>
              <select className="fi" value={eventId} onChange={(e) => setEventId(e.target.value)}>
                <option value="">Decide later — just accept them</option>
                {upcoming.map((e) => (
                  <option key={e.id} value={e.id}>{fmtEventDate(e.event_date)} — {e.name}</option>
                ))}
              </select>
              <p style={{ fontSize: 12.5, color: "#9A9A90", marginTop: 8, lineHeight: 1.5 }}>
                Picking a night adds them to that event's people. You can place them later instead.
              </p>
            </div>
            <div className="m-ft">
              <button className="btn btn-ghost" onClick={() => setAccepting(null)}>Cancel</button>
              <button className="btn btn-blk" onClick={doAccept} disabled={busy}>{busy ? "Working…" : "Accept"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
