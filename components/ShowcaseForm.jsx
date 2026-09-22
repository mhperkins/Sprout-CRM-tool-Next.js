"use client";

/**
 * ShowcaseForm.jsx — the public application at /showcase.
 *
 * Replaces the Sprout N Tell Google Form. One standing link, no sign-in. People say
 * what they'd showcase and how to hear or see their work: links first (most send a
 * Spotify or portfolio URL), with file uploads as the fallback for anyone without
 * one. Nothing here writes to the CRM's contacts — staff accept the application
 * first. Bio, photo and payment links come later, through the program form.
 */

import { useState, useRef } from "react";
import { PortalShell, uploadPortalFile } from "./PortalForm";
import {
  SHOWCASE_ROLES,
  MAX_LINKS,
  MAX_FILES,
  MAX_FILE_BYTES,
  SHOWCASE_SCOPE,
  showcaseProblems,
} from "../lib/showcaseForm";

const prettySize = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const kindOf = (file) =>
  (file.type || "").startsWith("audio/") ? "audio" : (file.type || "").startsWith("image/") ? "image" : "file";

const FOOT = "Applying to showcase? Reply to the email you get back and a human will answer.";

export default function ShowcaseForm() {
  const [d, setD] = useState({ name: "", email: "", phone: "", instagram: "", role: "", pitch: "", notes: "" });
  const [links, setLinks] = useState([""]);
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [upBusy, setUpBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const fileRef = useRef(null);

  const set = (k) => (e) => setD((p) => ({ ...p, [k]: e.target.value }));
  const setLink = (i, v) => setLinks((p) => p.map((l, n) => (n === i ? v : l)));
  const dropLink = (i) => setLinks((p) => (p.length === 1 ? [""] : p.filter((_, n) => n !== i)));

  /* ── uploads go straight to storage; Vercel caps a request body at 4.5MB ── */
  const pickFiles = async (list) => {
    const chosen = Array.from(list || []);
    if (!chosen.length) return;
    setErr("");
    setUpBusy(true);
    const added = [];
    for (const f of chosen) {
      if (files.length + added.length >= MAX_FILES) {
        setErr(`You can send up to ${MAX_FILES} files. Paste a link for anything else.`);
        break;
      }
      if (f.size > MAX_FILE_BYTES) {
        setErr(`"${f.name}" is larger than 25 MB. Send it as a link instead.`);
        continue;
      }
      try {
        const up = await uploadPortalFile(f, SHOWCASE_SCOPE);
        added.push({ ...up, kind: kindOf(f) });
      } catch {
        setErr(`Could not upload "${f.name}". Please try again, or send it as a link.`);
      }
    }
    setUpBusy(false);
    if (added.length) setFiles((p) => [...p, ...added]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = async () => {
    const data = { ...d, links: links.filter((l) => l.trim()), files };
    const problems = showcaseProblems(data);
    if (problems.length) { setErr(problems[0]); return; }

    setErr("");
    setBusy(true);
    try {
      const res = await fetch("/api/showcase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(json?.error || "Something went wrong. Please try again."); setBusy(false); return; }
      setDone(true);
    } catch {
      setErr("We could not reach the server. Check your connection and try again.");
      setBusy(false);
    }
  };

  if (done) {
    return (
      <PortalShell subtitle="Sprout N Tell" title="Showcase application" footNote={FOOT}>
        <div className="pt-wrap">
          <div className="pt-hero">
            <h1 className="pt-h1">Got it, {d.name.split(" ")[0] || "thanks"}.</h1>
            <p className="pt-lead">
              We read every application before each showcase and write back either way. Sprout N Tell
              usually runs the fourth Friday of the month, and we will come back to you with date options.
            </p>
          </div>
          <div className="pt-note pt-good">
            Nothing else to do right now. If you want to add something, reply to the email we send you.
          </div>
        </div>
      </PortalShell>
    );
  }

  return (
    <PortalShell subtitle="Sprout N Tell" title="Showcase application" footNote={FOOT}>
      <div className="pt-wrap">
        <div className="pt-hero">
          <h1 className="pt-h1">Showcase at Sprout N Tell</h1>
          <p className="pt-lead">
            A music and art showcase in Bushwick, usually the fourth Friday of every month. Tell us what
            you would share and how to hear or see your work. We will write back with date options.
          </p>
        </div>

        {err && <div className="pt-err">{err}</div>}

        <div className="pt-card">
          <div className="pt-fg">
            <label className="pt-lbl">What do you do?<span className="pt-req">*</span></label>
            <div className="pt-chips">
              {SHOWCASE_ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`pt-chip ${d.role === r ? "on" : ""}`}
                  aria-pressed={d.role === r}
                  onClick={() => setD((p) => ({ ...p, role: r }))}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-fg">
            <label className="pt-lbl" htmlFor="sc-pitch">What would you showcase?<span className="pt-req">*</span></label>
            <textarea
              id="sc-pitch"
              className="pt-ta"
              value={d.pitch}
              onChange={set("pitch")}
              placeholder="A few sentences. What you would play or show, roughly how long, solo or with other people."
            />
          </div>

          <div className="pt-fg">
            <label className="pt-lbl">Links to your work</label>
            <p className="pt-help" style={{ marginTop: 0, marginBottom: 8 }}>
              Spotify, SoundCloud, Bandcamp, YouTube, a portfolio. Add as many as you like.
            </p>
            {links.map((l, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <input
                  id={`sc-link-${i}`}
                  className="pt-in"
                  value={l}
                  onChange={(e) => setLink(i, e.target.value)}
                  placeholder="Paste a link to your work"
                  inputMode="url"
                />
                {(links.length > 1 || l) && (
                  <button
                    type="button"
                    className="pt-btn pt-btn-2 pt-btn-sm"
                    onClick={() => dropLink(i)}
                    aria-label={`Remove link ${i + 1}`}
                    style={{ flex: "0 0 auto", padding: "10px 13px" }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            {links.length < MAX_LINKS && (
              <button type="button" className="pt-btn-lnk" onClick={() => setLinks((p) => [...p, ""])}>
                + Add another link
              </button>
            )}
          </div>

          <div className="pt-fg">
            <label className="pt-lbl">Or upload a file</label>
            {files.length > 0 && (
              <div className="pt-files" style={{ marginBottom: 10 }}>
                {files.map((f, i) => (
                  <div className="pt-file" key={f.url}>
                    <span aria-hidden="true">{f.kind === "audio" ? "♫" : "▤"}</span>
                    <a href={f.url} target="_blank" rel="noopener noreferrer">{f.name}</a>
                    <span className="pt-file-sz">{prettySize(f.size)}</span>
                    <button
                      type="button"
                      className="pt-btn-lnk"
                      onClick={() => setFiles((p) => p.filter((_, n) => n !== i))}
                      aria-label={`Remove ${f.name}`}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
            {files.length < MAX_FILES && (
              <div
                className="pt-drop"
                role="button"
                tabIndex={0}
                onClick={() => fileRef.current?.click()}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileRef.current?.click(); } }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); pickFiles(e.dataTransfer?.files); }}
              >
                <div className="pt-drop-t">{upBusy ? "Uploading…" : "Drop audio or images here, or choose files"}</div>
                <div className="pt-drop-s">mp3, m4a, wav, jpg, png · 25 MB each · up to {MAX_FILES}</div>
              </div>
            )}
            <input
              ref={fileRef}
              id="sc-files"
              type="file"
              multiple
              accept="audio/*,image/*"
              style={{ display: "none" }}
              onChange={(e) => pickFiles(e.target.files)}
            />
          </div>
        </div>

        <div className="pt-card">
          <div className="pt-fg">
            <label className="pt-lbl" htmlFor="sc-name">Your name<span className="pt-req">*</span></label>
            <input id="sc-name" className="pt-in" value={d.name} onChange={set("name")} placeholder="First and last" autoComplete="name" />
          </div>
          <div className="pt-row">
            <div className="pt-fg">
              <label className="pt-lbl" htmlFor="sc-email">Email<span className="pt-req">*</span></label>
              <input id="sc-email" className="pt-in" value={d.email} onChange={set("email")} placeholder="you@example.com" type="email" autoComplete="email" inputMode="email" />
            </div>
            <div className="pt-fg">
              <label className="pt-lbl" htmlFor="sc-phone">Phone</label>
              <input id="sc-phone" className="pt-in" value={d.phone} onChange={set("phone")} placeholder="For the day of" type="tel" autoComplete="tel" />
            </div>
          </div>
          <div className="pt-fg">
            <label className="pt-lbl" htmlFor="sc-ig">Instagram</label>
            <input id="sc-ig" className="pt-in" value={d.instagram} onChange={set("instagram")} placeholder="@yourhandle" />
          </div>
          <div className="pt-fg" style={{ marginBottom: 0 }}>
            <label className="pt-lbl" htmlFor="sc-notes">Anything we should know?</label>
            <textarea id="sc-notes" className="pt-ta" style={{ minHeight: 72 }} value={d.notes} onChange={set("notes")} placeholder="Gear you need, access needs, months that do or don't work." />
          </div>
        </div>

        <button type="button" className="pt-btn" onClick={submit} disabled={busy || upBusy} style={{ width: "100%" }}>
          {busy ? "Sending…" : "Send my application"}
        </button>
        <p className="pt-help" style={{ textAlign: "center", marginTop: 12 }}>
          We read every one and reply either way.
        </p>
      </div>
    </PortalShell>
  );
}
