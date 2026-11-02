"use client";

/**
 * MediaUploadForm.jsx — the guest page at /media/[token].
 *
 * People who were at an event send their photos and video. Each file starts uploading
 * the moment it is picked: the server opens a Google Drive upload for it and the
 * browser sends the bytes straight to Google, so big phone videos work. Footage that
 * already lives somewhere else comes in as a pasted link, checked for sharing on the
 * spot. Name, Instagram, email and permission to post are optional.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { PortalShell } from "./PortalForm";
import { MAX_FILE_BYTES, isMediaFile, newBatchId, fmtBytes } from "../lib/mediaForm";

const PARALLEL = 2;
const FOOT = "Questions? Email hello@sproutsociety.org and a human will answer.";

const fmtDate = (d) => {
  if (!d) return "";
  try { return new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }); }
  catch { return d; }
};

let seq = 0;

/** PUT one file to its Drive session URL, reporting progress. Resolves with Drive's file id. */
function putToDrive(url, file, onPct) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    if (file.type) xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onPct(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 201) {
        try { resolve(JSON.parse(xhr.responseText).id); } catch { reject(new Error("bad response")); }
      } else reject(new Error(`upload ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("network"));
    xhr.send(file);
  });
}

export default function MediaUploadForm({ token }) {
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState("");
  const [event, setEvent] = useState(null);
  const [batch, setBatch] = useState(newBatchId);
  const [items, setItems] = useState([]); // { key, file, name, size, status, pct, err }
  const [links, setLinks] = useState([]); // { id, url, checked }
  const [linkIn, setLinkIn] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkErr, setLinkErr] = useState("");
  const [sender, setSender] = useState({ name: "", instagram: "", email: "", note: "", ok_to_post: false });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(0);
  const fileRef = useRef(null);
  const running = useRef(new Set());

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/media/${token}`);
        const json = await res.json();
        if (!alive) return;
        if (!res.ok) setFatal(json?.error || "This link is not valid.");
        else setEvent(json.event);
      } catch {
        if (alive) setFatal("We could not load this page. Please refresh and try again.");
      }
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [token]);

  const patch = useCallback((key, p) => setItems((list) => list.map((it) => (it.key === key ? { ...it, ...p } : it))), []);

  const api = useCallback(async (body) => {
    const res = await fetch(`/api/media/${token}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { const e = new Error(json?.error || "Something went wrong. Please try again."); e.status = res.status; throw e; }
    return json;
  }, [token]);

  const upload = useCallback(async (it) => {
    running.current.add(it.key);
    patch(it.key, { status: "uploading", pct: 0, err: "" });
    try {
      const start = await api({ action: "start", batch, name: it.name, mime: it.file.type, size: it.size });
      const fileId = await putToDrive(start.upload_url, it.file, (pct) => patch(it.key, { pct }));
      patch(it.key, { status: "confirming", pct: 100 });
      await api({ action: "done", id: start.id, file_id: fileId });
      patch(it.key, { status: "done", file: null });
    } catch (e) {
      const msg = e.status ? e.message : "The upload stopped. Check your connection and try again.";
      patch(it.key, { status: "error", err: msg });
    }
    running.current.delete(it.key);
  }, [api, batch, patch]);

  // Start queued files, a couple at a time.
  useEffect(() => {
    const free = PARALLEL - running.current.size;
    if (free <= 0) return;
    items.filter((it) => it.status === "queued" && !running.current.has(it.key)).slice(0, free).forEach(upload);
  }, [items, upload]);

  const active = items.some((it) => ["queued", "uploading", "confirming"].includes(it.status));

  // Warn before leaving mid-upload.
  useEffect(() => {
    if (!active) return;
    const h = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [active]);

  const pick = (fileList) => {
    setErr("");
    const add = [];
    for (const f of Array.from(fileList || [])) {
      const base = { key: `f${++seq}`, file: f, name: f.name || "upload", size: f.size, pct: 0 };
      if (!isMediaFile(f.name, f.type)) add.push({ ...base, status: "error", err: "Not a photo or video." });
      else if (f.size > MAX_FILE_BYTES) add.push({ ...base, status: "error", err: "Over 10 GB. Paste a link to it below instead." });
      else add.push({ ...base, status: "queued" });
    }
    setItems((list) => [...list, ...add]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const addLink = async () => {
    const url = linkIn.trim();
    if (!url) return;
    setLinkErr("");
    setLinkBusy(true);
    try {
      const out = await api({ action: "link", batch, url });
      setLinks((l) => [...l, { id: out.id, url: out.url, checked: out.checked }]);
      setLinkIn("");
    } catch (e) {
      setLinkErr(e.message);
    }
    setLinkBusy(false);
  };

  const doneCount = items.filter((it) => it.status === "done").length + links.length;

  const send = async () => {
    setErr("");
    setBusy(true);
    try {
      const out = await api({ action: "finish", batch, sender });
      setSent(out.count || doneCount);
      try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch { /* old browsers */ }
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  };

  const again = () => {
    setBatch(newBatchId());
    setItems([]);
    setLinks([]);
    setSent(0);
    setErr("");
  };

  const set = (k, v) => setSender((s) => ({ ...s, [k]: v }));
  const when = fmtDate(event?.event_date);

  if (loading) {
    return (
      <PortalShell subtitle="Share your photos & video" footNote={FOOT}>
        <div className="pt-wrap"><div className="pt-hero"><div className="pt-lead">Loading…</div></div></div>
      </PortalShell>
    );
  }

  if (fatal) {
    return (
      <PortalShell subtitle="Share your photos & video" footNote={FOOT}>
        <div className="pt-wrap">
          <div className="pt-hero">
            <div className="pt-h1">This link did not work</div>
            <p className="pt-lead">{fatal}</p>
          </div>
          <div className="pt-note">
            Email <a href="mailto:hello@sproutsociety.org" style={{ color: "#2a8ca0", fontWeight: 700 }}>hello@sproutsociety.org</a> and
            we will send a fresh link.
          </div>
        </div>
      </PortalShell>
    );
  }

  if (sent) {
    return (
      <PortalShell subtitle="Share your photos & video" title={event?.name || ""} footNote={FOOT}>
        <div className="pt-wrap">
          <div className="pt-hero">
            <div className="pt-h1">Thank you!</div>
            <p className="pt-lead">We got {sent} {sent === 1 ? "item" : "items"} from {event?.name || "the event"}.</p>
          </div>
          <button className="pt-btn" onClick={again}>Send more</button>
        </div>
      </PortalShell>
    );
  }

  return (
    <PortalShell subtitle="Share your photos & video" title={event?.name || ""} footNote={FOOT}>
      <div className="pt-wrap">
        <div className="pt-hero">
          <div className="pt-h1">Share your photos &amp; video</div>
          <p className="pt-lead" style={{ fontWeight: 700, color: "#030000" }}>
            {event?.name}{when ? ` · ${when}` : ""}
          </p>
          <p className="pt-lead" style={{ marginTop: 8 }}>
            Got shots from the night? Send them our way. Any size works, including long videos.
          </p>
        </div>

        <div className="pt-card">
          <div className="pt-sec-ttl">Photos &amp; video</div>
          <div className="pt-sec-body">
            <div className="pt-drop" onClick={() => fileRef.current?.click()}>
              <div className="pt-drop-t">Tap to add photos or video</div>
              <div className="pt-drop-s">Pick as many as you like. They start uploading right away.</div>
            </div>
            <input ref={fileRef} type="file" accept="image/*,video/*" multiple style={{ display: "none" }}
              onChange={(e) => pick(e.target.files)} />

            {items.length > 0 && (
              <div className="pt-files" style={{ marginTop: 12 }}>
                {items.map((it) => (
                  <div className="pt-file" key={it.key} style={{ flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, flex: "1 1 140px" }}>{it.name}</span>
                    <span className="pt-file-sz">
                      {it.status === "done" ? `✓ ${fmtBytes(it.size)}`
                        : it.status === "error" ? ""
                        : it.status === "queued" ? "Waiting…"
                        : it.status === "confirming" ? "Finishing…"
                        : `${it.pct}% of ${fmtBytes(it.size)}`}
                    </span>
                    {["uploading", "confirming"].includes(it.status) && (
                      <div className="pt-prog-bar" style={{ flex: "1 1 100%" }}>
                        <div className="pt-prog-fill" style={{ width: `${it.pct}%` }} />
                      </div>
                    )}
                    {it.status === "error" && (
                      <div style={{ flex: "1 1 100%", fontSize: 12.5, color: "#c4006f", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <span>{it.err}</span>
                        {it.file && isMediaFile(it.name, it.file.type) && it.size <= MAX_FILE_BYTES && (
                          <button type="button" className="pt-btn-lnk" style={{ padding: 0 }} onClick={() => patch(it.key, { status: "queued", err: "" })}>Try again</button>
                        )}
                        <button type="button" className="pt-btn-lnk" style={{ padding: 0 }} onClick={() => setItems((l) => l.filter((x) => x.key !== it.key))}>Remove</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="pt-card">
          <div className="pt-sec-ttl">Already uploaded somewhere?</div>
          <p className="pt-sec-blurb">Paste a Google Drive, iCloud, Dropbox or WeTransfer link. Set it so anyone with the link can view.</p>
          <div className="pt-sec-body">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input className="pt-in" style={{ flex: "1 1 200px" }} value={linkIn} placeholder="https://"
                autoCapitalize="off" autoCorrect="off" inputMode="url"
                onChange={(e) => setLinkIn(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLink(); } }} />
              <button type="button" className="pt-btn pt-btn-2 pt-btn-sm" disabled={linkBusy || !linkIn.trim()} onClick={addLink}>
                {linkBusy ? "Checking…" : "Add link"}
              </button>
            </div>
            {linkErr && <div className="pt-err" style={{ marginTop: 10, marginBottom: 0 }}>{linkErr}</div>}
            {links.length > 0 && (
              <div className="pt-files" style={{ marginTop: 12 }}>
                {links.map((l) => (
                  <div className="pt-file" key={l.id}>
                    <a href={l.url} target="_blank" rel="noopener noreferrer">{l.url}</a>
                    <span className="pt-file-sz">✓ added</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="pt-card">
          <div className="pt-sec-ttl">About you</div>
          <p className="pt-sec-blurb">All optional. Add your Instagram if you want credit when we share.</p>
          <div className="pt-sec-body">
            <div className="pt-row">
              <div className="pt-fg">
                <label className="pt-lbl">Name</label>
                <input className="pt-in" value={sender.name} onChange={(e) => set("name", e.target.value)} />
              </div>
              <div className="pt-fg">
                <label className="pt-lbl">Instagram</label>
                <input className="pt-in" value={sender.instagram} placeholder="@handle"
                  autoCapitalize="off" autoCorrect="off" onChange={(e) => set("instagram", e.target.value)} />
              </div>
            </div>
            <div className="pt-fg">
              <label className="pt-lbl">Email</label>
              <input className="pt-in" type="email" value={sender.email} placeholder="So we can ask about a clip"
                autoCapitalize="off" onChange={(e) => set("email", e.target.value)} />
            </div>
            <div className="pt-fg">
              <label className="pt-lbl">Anything to add?</label>
              <textarea className="pt-ta" value={sender.note} placeholder="Who's in the shots, what moment it was…"
                onChange={(e) => set("note", e.target.value)} />
            </div>
            <div className="pt-fg" style={{ marginBottom: 0 }}>
              <label className="pt-check">
                <input type="checkbox" checked={sender.ok_to_post} onChange={(e) => set("ok_to_post", e.target.checked)} />
                <span>Sprout Society can post these on Instagram and our site.</span>
              </label>
            </div>
          </div>
        </div>

        {err && <div className="pt-err">{err}</div>}

        <button className="pt-btn" onClick={send} disabled={busy || active || doneCount === 0}>
          {busy ? "Sending…" : active ? "Waiting for uploads to finish…" : doneCount ? `Send ${doneCount} ${doneCount === 1 ? "item" : "items"}` : "Add a photo, video or link"}
        </button>
        {doneCount > 0 && !active && (
          <p className="pt-help" style={{ marginTop: 8 }}>Your files are already saved with us. Sending tells us who they came from.</p>
        )}
      </div>
    </PortalShell>
  );
}
