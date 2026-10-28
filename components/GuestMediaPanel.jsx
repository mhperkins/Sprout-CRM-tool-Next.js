"use client";

/**
 * GuestMediaPanel.jsx — the popup behind an event's Guest media tile: the public
 * upload link, the Drive folder, and every send grouped by who sent it.
 *
 * Uses the CRM's global classes (btn, dp-sect-lbl, type-tag) from CRMManager's STYLES.
 */

import { useState } from "react";
import { fmtBytes, driveFileUrl, driveFolderUrl } from "../lib/mediaForm";

const origin = () => (typeof window !== "undefined" ? window.location.origin : "");
const copy = (text, msg, showToast) => {
  try { navigator.clipboard.writeText(text); showToast?.(msg); } catch { showToast?.("Copy failed", "err"); }
};
const fmtWhen = (iso) => {
  try { return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); }
  catch { return ""; }
};

/** Uploads grouped into sends (one person's batch), newest send first. */
export function groupSends(uploads = []) {
  const map = new Map();
  for (const u of uploads) {
    if (!map.has(u.batch_id)) map.set(u.batch_id, { batch: u.batch_id, sender: u.sender || {}, at: u.created_at, items: [] });
    const g = map.get(u.batch_id);
    g.items.push(u);
    if (Object.keys(u.sender || {}).length) g.sender = u.sender;
    if (u.created_at > g.at) g.at = u.created_at;
  }
  return [...map.values()].sort((a, b) => (a.at < b.at ? 1 : -1));
}

export const senderLabel = (s = {}) => s.name || (s.instagram ? `@${s.instagram}` : "Didn't leave a name");

export function GuestMediaPanel({ media, onCreate, onRotate, onDelete, onRefresh, showToast }) {
  const [busy, setBusy] = useState(false);
  const [sure, setSure] = useState(false);
  const { form, uploads } = media;

  if (!form) {
    return (
      <div>
        <p style={{ fontSize: 12, lineHeight: 1.7, color: "var(--g600)", margin: "0 0 12px" }}>
          No upload link for this event yet. Create one and send it to everyone who came: they upload photos and
          video of any size straight to a Google Drive folder for this event, or paste a link to footage they already
          put somewhere.
        </p>
        <button className="btn btn-blk btn-sm" disabled={busy} onClick={async () => { setBusy(true); await onCreate(); setBusy(false); }}>
          {busy ? "Creating…" : "+ Create upload link"}
        </button>
      </div>
    );
  }

  const url = `${origin()}/media/${form.token}`;
  const sends = groupSends(uploads);
  const files = uploads.filter((u) => u.kind === "file");
  const total = files.reduce((n, u) => n + (Number(u.size) || 0), 0);

  return (
    <div>
      <div style={{ border: "1px solid var(--g200)", borderRadius: 8, padding: "10px 12px", marginBottom: 16, background: "var(--g50,#fafafa)" }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--g500)", marginBottom: 5 }}>Upload link for this event</div>
        <div style={{ fontSize: 11.5, wordBreak: "break-all", color: "var(--cyan)", fontWeight: 700, marginBottom: 9 }}>{url}</div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
          <button className="btn btn-blk btn-sm" onClick={() => copy(url, "Link copied ✓", showToast)}>Copy link</button>
          <a className="btn btn-ghost btn-sm" href={url} target="_blank" rel="noopener noreferrer">Open ↗</a>
          {form.folderId && <a className="btn btn-ghost btn-sm" href={driveFolderUrl(form.folderId)} target="_blank" rel="noopener noreferrer">Drive folder ↗</a>}
          {sure
            ? <>
                <span style={{ fontSize: 11.5, color: "var(--g600)" }}>The old link stops working.</span>
                <button className="btn btn-blk btn-sm" onClick={() => { setSure(false); onRotate(); }}>Make new link</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setSure(false)}>Cancel</button>
              </>
            : <button className="btn btn-ghost btn-sm" onClick={() => setSure(true)}>New link</button>}
        </div>
        <div style={{ fontSize: 11, color: "var(--g500)", marginTop: 8, lineHeight: 1.6 }}>
          Files land in the Sprout Society Team shared drive, under Guest media uploads. The folder appears with the first upload.
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <div className="dp-sect-lbl" style={{ margin: 0 }}>
          {files.length} file{files.length === 1 ? "" : "s"}{total ? ` · ${fmtBytes(total)}` : ""} · {sends.length} {sends.length === 1 ? "person" : "people"}
        </div>
        <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }} onClick={onRefresh}>↻ Refresh</button>
      </div>

      {sends.length === 0
        ? <p style={{ fontSize: 12, color: "var(--g500)", lineHeight: 1.7 }}>Nothing yet. Send the link above to everyone who came.</p>
        : <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {sends.map((g) => (
              <div key={g.batch} style={{ border: "1px solid var(--g200)", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                  <div style={{ fontWeight: 800, fontSize: 13 }}>{senderLabel(g.sender)}</div>
                  {g.sender.instagram && g.sender.name && <span style={{ fontSize: 11.5, color: "var(--g500)" }}>@{g.sender.instagram}</span>}
                  {g.sender.ok_to_post
                    ? <span className="type-tag" style={{ background: "var(--acid)", color: "var(--ink)" }}>OK to post</span>
                    : <span className="type-tag" style={{ background: "var(--g100)", color: "var(--g600)" }}>Ask before posting</span>}
                  <span style={{ fontSize: 11, color: "var(--g500)", marginLeft: "auto" }}>{fmtWhen(g.at)}</span>
                </div>
                {g.sender.email && <div style={{ fontSize: 11.5, marginBottom: 4 }}><a href={`mailto:${g.sender.email}`} style={{ color: "var(--cyan)" }}>{g.sender.email}</a></div>}
                {g.sender.note && <div style={{ fontSize: 12, color: "var(--g700)", lineHeight: 1.6, marginBottom: 6, whiteSpace: "pre-wrap" }}>{g.sender.note}</div>}
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {g.items.map((u) => (
                    <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, minWidth: 0 }}>
                      <span>{u.kind === "link" ? "🔗" : (u.mime || "").startsWith("video/") ? "🎬" : "🖼"}</span>
                      <a href={u.kind === "link" ? u.url : driveFileUrl(u.drive_file_id)} target="_blank" rel="noopener noreferrer"
                        style={{ color: "var(--cyan)", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, flex: 1 }}>
                        {u.kind === "link" ? u.url : u.name}
                      </a>
                      {u.kind === "file" && <span style={{ color: "var(--g500)", whiteSpace: "nowrap" }}>{fmtBytes(u.size)}</span>}
                      <button className="btn btn-ghost btn-sm" title="Remove from this list (the file stays in Drive)" onClick={() => onDelete(u)}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>}
    </div>
  );
}
