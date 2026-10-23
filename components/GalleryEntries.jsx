"use client";

/**
 * GalleryEntries.jsx — the staff side of the gallery submission form.
 *
 *   EventGalleryPanel  the popup behind an event's Gallery tile: link + every entry
 *   OpenCallGallery    the Showcase page tab: the standing open-call link, entries not
 *                      yet on a show (assign each to an event), and the /submit list
 *
 * Uses the CRM's global classes (btn, type-tag, fi) from CRMManager's STYLES.
 */

import { useState, useEffect, useCallback } from "react";
import { fetchOpenCallGallery, assignGalleryEntry, deleteGalleryEntry } from "../lib/services";
import { pieceLine, readyLabel, moreLabel, galleryToText } from "../lib/galleryForm";

const origin = () => (typeof window !== "undefined" ? window.location.origin : "");
const copy = (text, msg, showToast) => {
  try { navigator.clipboard.writeText(text); showToast?.(msg); } catch { showToast?.("Copy failed", "err"); }
};
// Supabase storage ignores <a download> cross-origin; ?download= forces an attachment.
const dl = (url, name) => url + (url.includes("?") ? "&" : "?") + "download=" + encodeURIComponent(name);
const fmtDay = (iso) => { try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }); } catch { return ""; } };
const fmtEvent = (d) => { try { return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }); } catch { return d || ""; } };

function LinkBox({ label, url, onRotate, note, showToast }) {
  const [sure, setSure] = useState(false);
  return (
    <div style={{ border: "1px solid var(--g200)", borderRadius: 8, padding: "10px 12px", marginBottom: 16, background: "var(--g50,#fafafa)" }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--g500)", marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 11.5, wordBreak: "break-all", color: "var(--cyan)", fontWeight: 700, marginBottom: 9 }}>{url}</div>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
        <button className="btn btn-blk btn-sm" onClick={() => copy(url, "Link copied ✓", showToast)}>Copy link</button>
        <a className="btn btn-ghost btn-sm" href={url} target="_blank" rel="noopener noreferrer">Open ↗</a>
        {onRotate && (sure
          ? <>
              <span style={{ fontSize: 11.5, color: "var(--g600)" }}>The old link stops working.</span>
              <button className="btn btn-blk btn-sm" onClick={() => { setSure(false); onRotate(); }}>Make new link</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setSure(false)}>Cancel</button>
            </>
          : <button className="btn btn-ghost btn-sm" onClick={() => setSure(true)}>New link</button>)}
      </div>
      {note && <div style={{ fontSize: 11, color: "var(--g500)", marginTop: 8, lineHeight: 1.55 }}>{note}</div>}
    </div>
  );
}

/** One submission: pieces with thumbnails, answers, and actions. */
export function GalleryEntryCard({ entry, events, onAssign, onDelete }) {
  const [sure, setSure] = useState(false);
  const d = entry.data || {};
  const facts = [
    d.ready && ["Gallery-ready", readyLabel(d.ready)],
    d.more_work && ["Would share more", moreLabel(d.more_work)],
  ].filter(Boolean);
  return (
    <div style={{ border: "1.5px solid var(--g200)", borderRadius: 10, padding: 14, background: "#fff", boxShadow: "var(--sh-sm)" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <div style={{ fontSize: 14, fontWeight: 900 }}>{d.name || "(no name)"}</div>
        {d.email && <a href={`mailto:${d.email}`} style={{ fontSize: 12, color: "var(--cyan)", fontWeight: 700, textDecoration: "none" }}>{d.email}</a>}
        {d.instagram && <span className="type-tag">{d.instagram}</span>}
        <span style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--g400)" }}>Sent {fmtDay(entry.created_at)}</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
        {(d.pieces || []).map((p, i) => (
          <div key={i} style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {p.photo_url
              ? <a href={p.photo_url} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0 }}>
                  <img src={p.photo_url} alt={p.title || `Piece ${i + 1}`} style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 6, display: "block" }} />
                </a>
              : <div style={{ width: 56, height: 56, borderRadius: 6, background: "var(--g100)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9.5, color: "var(--g400)" }}>No photo</div>}
            <div style={{ fontSize: 12.5, lineHeight: 1.5, minWidth: 0, flex: 1 }}>{pieceLine(p, i)}</div>
            {p.photo_url && <a href={dl(p.photo_url, `${(d.name || "artist").replace(/[^\w\- ]+/g, "")} ${i + 1}.jpg`)} style={{ fontSize: 11, color: "var(--cyan)", fontWeight: 700, textDecoration: "none", flexShrink: 0 }}>⬇</a>}
          </div>
        ))}
      </div>

      {facts.length > 0 && (
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 10, fontSize: 11.5 }}>
          {facts.map(([k, v]) => <span key={k}><b>{k}:</b> {v}</span>)}
        </div>
      )}
      {d.statement && <div style={{ fontSize: 12, lineHeight: 1.65, color: "var(--g600)", whiteSpace: "pre-wrap", marginTop: 8 }}>{d.statement}</div>}
      {d.notes && <div style={{ fontSize: 12, lineHeight: 1.6, color: "var(--g600)", whiteSpace: "pre-wrap", marginTop: 6 }}><b>Notes:</b> {d.notes}</div>}

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 10, fontSize: 11 }}>
        {onAssign && (
          <select className="fi" style={{ fontSize: 12, padding: "5px 8px", width: "auto", maxWidth: 280 }}
            value={entry.event_id || ""} onChange={(e) => onAssign(entry, e.target.value || null)} aria-label="Show">
            <option value="">Open call (no show yet)</option>
            {events.map((ev) => <option key={ev.id} value={ev.id}>{fmtEvent(ev.event_date)} · {ev.name}</option>)}
          </select>
        )}
        <span style={{ marginLeft: "auto" }} />
        {sure
          ? <>
              <span style={{ color: "var(--g600)" }}>Delete for good?</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setSure(false)}>Cancel</button>
              <button className="btn btn-blk btn-sm" style={{ background: "var(--red)", borderColor: "var(--red)" }} onClick={() => { setSure(false); onDelete(entry); }}>Delete</button>
            </>
          : <button onClick={() => setSure(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--red)", fontSize: 11, fontWeight: 700, fontFamily: "inherit" }}>Delete</button>}
      </div>
    </div>
  );
}

/** Popup behind an event's Gallery tile. */
export function EventGalleryPanel({ gallery, events, onCreate, onRotate, onAssign, onDeleteEntry, onRefresh, showToast }) {
  const [busy, setBusy] = useState(false);
  const { form, entries } = gallery;
  if (!form) {
    return (
      <div>
        <p style={{ fontSize: 12, lineHeight: 1.7, color: "var(--g600)", margin: "0 0 12px" }}>
          No gallery link for this show yet. Create one and send it to the artists you want to hang:
          they send their pieces (sizes, medium, price, photos), whether they are hang-ready, and a bio.
        </p>
        <button className="btn btn-blk btn-sm" disabled={busy} onClick={async () => { setBusy(true); await onCreate(); setBusy(false); }}>
          {busy ? "Creating…" : "+ Create gallery submission link"}
        </button>
      </div>
    );
  }
  return (
    <div>
      <LinkBox label="Gallery link for this show" url={`${origin()}/gallery/${form.token}`} onRotate={onRotate} showToast={showToast}
        note="Each artist only sees and edits what they sent. Open-call submissions you assign to this show appear here too." />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <div className="dp-sect-lbl" style={{ margin: 0 }}>{entries.length} submission{entries.length === 1 ? "" : "s"}</div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 7 }}>
          {entries.length > 0 && <button className="btn btn-ghost btn-sm" onClick={() => copy(galleryToText(entries), "All submissions copied ✓", showToast)}>Copy all as text</button>}
          <button className="btn btn-ghost btn-sm" onClick={onRefresh}>↻ Refresh</button>
        </div>
      </div>
      {entries.length === 0
        ? <p style={{ fontSize: 12, color: "var(--g500)", lineHeight: 1.7 }}>Nothing yet. Send the link above to your artists.</p>
        : <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {entries.map((en) => <GalleryEntryCard key={en.id} entry={en} events={events} onAssign={onAssign} onDelete={onDeleteEntry} />)}
          </div>}
    </div>
  );
}

/** Showcase page tab: the open call. */
export function OpenCallGallery({ events, showToast }) {
  const [state, setState] = useState({ form: null, entries: [], list: [], loaded: false });
  const load = useCallback(async () => {
    const { data, error } = await fetchOpenCallGallery();
    if (error) { console.error("fetchOpenCallGallery:", error); showToast?.("Could not load the open call", "err"); }
    setState({ ...data, loaded: true });
  }, [showToast]);
  useEffect(() => { load(); }, [load]);

  const today = new Date().toISOString().slice(0, 10);
  const shows = (events || []).filter((e) => e.event_date && e.event_date >= today && e.status !== "cancelled")
    .sort((a, b) => a.event_date.localeCompare(b.event_date));

  const assign = async (entry, eventId) => {
    const { error } = await assignGalleryEntry(entry.id, eventId);
    if (error) { showToast?.("Could not move that", "err"); return; }
    setState((s) => ({ ...s, entries: s.entries.filter((e) => e.id !== entry.id) }));
    showToast?.("Moved to that show's Gallery tile ✓");
  };
  const remove = async (entry) => {
    const { error } = await deleteGalleryEntry(entry.id);
    if (error) { showToast?.("Could not delete that", "err"); return; }
    setState((s) => ({ ...s, entries: s.entries.filter((e) => e.id !== entry.id) }));
    showToast?.("Submission deleted");
  };

  if (!state.loaded) return <div className="sa-empty"><b>Loading…</b></div>;
  const sent = state.list.filter((r) => r.sent_form_at).length;

  return (
    <div>
      {state.form && (
        <LinkBox label="Open-call gallery link (the one /submit emails)" url={`${origin()}/gallery/${state.form.token}`} showToast={showToast}
          note="Anyone who signs up at /submit (the TV slide QR) gets this link by email automatically. Submissions land below until you put them on a show." />
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <div className="dp-sect-lbl" style={{ margin: 0 }}>{state.entries.length} waiting for a show</div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 7 }}>
          {state.entries.length > 0 && <button className="btn btn-ghost btn-sm" onClick={() => copy(galleryToText(state.entries), "Copied ✓", showToast)}>Copy all as text</button>}
          <button className="btn btn-ghost btn-sm" onClick={load}>↻ Refresh</button>
        </div>
      </div>
      {state.entries.length === 0
        ? <p style={{ fontSize: 12.5, color: "var(--g500)", lineHeight: 1.7, marginBottom: 22 }}>No open-call submissions yet.</p>
        : <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 22 }}>
            {state.entries.map((en) => <GalleryEntryCard key={en.id} entry={en} events={shows} onAssign={assign} onDelete={remove} />)}
          </div>}

      <div className="dp-sect-lbl" style={{ marginBottom: 8 }}>
        Email list from /submit · {state.list.length} signed up · {sent} sent the form
      </div>
      {state.list.length === 0
        ? <p style={{ fontSize: 12.5, color: "var(--g500)" }}>Nobody yet.</p>
        : <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead><tr style={{ textAlign: "left", color: "var(--g500)", fontSize: 11 }}>
                <th style={{ padding: "6px 8px" }}>Name</th><th style={{ padding: "6px 8px" }}>Email</th>
                <th style={{ padding: "6px 8px" }}>Makes</th><th style={{ padding: "6px 8px" }}>Instagram</th>
                <th style={{ padding: "6px 8px" }}>Form sent</th><th style={{ padding: "6px 8px" }}>Signed up</th>
              </tr></thead>
              <tbody>
                {state.list.map((r) => (
                  <tr key={r.id} style={{ borderTop: "1px solid var(--g200)" }}>
                    <td style={{ padding: "6px 8px", fontWeight: 700 }}>{r.name}</td>
                    <td style={{ padding: "6px 8px" }}>{r.email}</td>
                    <td style={{ padding: "6px 8px" }}>{{ music: "Music", art: "Art", other: "Something else" }[r.role] || r.role}</td>
                    <td style={{ padding: "6px 8px" }}>{r.instagram}</td>
                    <td style={{ padding: "6px 8px" }}>{r.sent_form_at ? `✓ ${fmtDay(r.sent_form_at)}` : "Not sent"}</td>
                    <td style={{ padding: "6px 8px" }}>{fmtDay(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
    </div>
  );
}
