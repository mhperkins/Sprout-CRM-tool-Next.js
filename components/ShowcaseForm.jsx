"use client";

/**
 * ShowcaseForm.jsx — the public submission form at /submit (/showcase redirects here).
 *
 * One form for every musician, artist and maker; staff decide later which event fits.
 * Two steps on one page:
 *   1. What you do, name, email. Pressing Next saves a 'started' row, so we keep the
 *      email even if they never finish.
 *   2. The work: what they'd show (required), links, uploads, Instagram, phone, notes.
 * Anyone who stops after step 1 gets a reminder on day 3 and day 14 with a private
 * link (/submit?t=<token>) that reopens step 2. Nothing here writes to contacts.
 */

import { useState, useRef, useEffect } from "react";
import { PortalShell, uploadPortalFile } from "./PortalForm";
import {
  SHOWCASE_ROLES, MAX_LINKS, MAX_FILES, MAX_FILE_BYTES, SHOWCASE_SCOPE,
  startProblems, workProblems,
} from "../lib/showcaseForm";

const prettySize = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const kindOf = (file) =>
  (file.type || "").startsWith("audio/") ? "audio" : (file.type || "").startsWith("image/") ? "image" : "file";

const FOOT = "Questions? Reply to the email you get back and a human will answer.";
const STORE = "sprout_submit_token";
const DISCORD = "https://discord.gg/CH93QSDwrD";
const IG = "https://www.instagram.com/sproutsocietyorg";

const remember = (t) => { try { t ? localStorage.setItem(STORE, t) : localStorage.removeItem(STORE); } catch {} };
const recall = () => { try { return localStorage.getItem(STORE) || ""; } catch { return ""; } };

function Steps({ n }) {
  return (
    <div style={{ display: "flex", gap: 6, margin: "18px 0" }} aria-label={`Step ${n} of 2`}>
      {[1, 2].map((i) => (
        <span key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: i <= n ? "#030000" : "#E3E3DD" }} />
      ))}
    </div>
  );
}

export default function ShowcaseForm({ resumeToken = "" }) {
  const [step, setStep] = useState(resumeToken ? 0 : 1); // 0 = loading a saved submission
  const [token, setToken] = useState("");
  const [welcomeBack, setWelcomeBack] = useState(false);
  const [d, setD] = useState({ name: "", email: "", role: "", phone: "", instagram: "", pitch: "", notes: "" });
  const [links, setLinks] = useState([""]);
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [upBusy, setUpBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const fileRef = useRef(null);

  /* Reopen a saved submission: from the reminder link, or this device mid-step-2. */
  useEffect(() => {
    const t = resumeToken || recall();
    if (!t) return;
    let live = true;
    (async () => {
      try {
        const res = await fetch(`/api/showcase?token=${encodeURIComponent(t)}`);
        const json = await res.json().catch(() => ({}));
        if (!live) return;
        if (!res.ok) {
          remember("");
          if (resumeToken) setErr(json?.error || "We couldn't find that submission. You can start a new one.");
          setStep(1);
          return;
        }
        if (json.status !== "started") { remember(""); setDone(true); setStep(2); return; }
        setToken(t);
        setD((p) => ({ ...p, ...json.data }));
        setWelcomeBack(Boolean(resumeToken));
        setStep(2);
      } catch {
        if (live) setStep(1);
      }
    })();
    return () => { live = false; };
  }, [resumeToken]);

  const set = (k) => (e) => setD((p) => ({ ...p, [k]: e.target.value }));
  const setLink = (i, v) => setLinks((p) => p.map((l, n) => (n === i ? v : l)));
  const dropLink = (i) => setLinks((p) => (p.length === 1 ? [""] : p.filter((_, n) => n !== i)));

  const post = async (body) => {
    const res = await fetch("/api/showcase", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || "Something went wrong. Please try again.");
    return json;
  };

  const next = async () => {
    const problems = startProblems(d);
    if (problems.length) { setErr(problems[0]); return; }
    setErr(""); setBusy(true);
    try {
      const json = await post({ step: "start", data: { name: d.name, email: d.email, role: d.role } });
      setToken(json.token);
      remember(json.token);
      setStep(2);
      window.scrollTo(0, 0);
    } catch (e) {
      setErr(e.message === "Failed to fetch" ? "We could not reach the server. Check your connection and try again." : e.message);
    }
    setBusy(false);
  };

  /* ── uploads go straight to storage; Vercel caps a request body at 4.5MB ── */
  const pickFiles = async (list) => {
    const chosen = Array.from(list || []);
    if (!chosen.length) return;
    setErr(""); setUpBusy(true);
    const added = [];
    for (const f of chosen) {
      if (files.length + added.length >= MAX_FILES) {
        setErr(`You can send up to ${MAX_FILES} files. Remove one to add another, or paste a link.`);
        break;
      }
      if (f.size > MAX_FILE_BYTES) { setErr(`"${f.name}" is larger than 25 MB. Send it as a link instead.`); continue; }
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

  const send = async () => {
    const problems = workProblems(d);
    if (problems.length) { setErr(problems[0]); return; }
    setErr(""); setBusy(true);
    try {
      await post({
        step: "finish", token,
        data: { pitch: d.pitch, instagram: d.instagram, phone: d.phone, notes: d.notes, links: links.filter((l) => l.trim()), files },
      });
      remember("");
      setDone(true);
      window.scrollTo(0, 0);
    } catch (e) {
      setErr(e.message === "Failed to fetch" ? "We could not reach the server. Check your connection and try again." : e.message);
    }
    setBusy(false);
  };

  const first = d.name.trim().split(/\s+/)[0];

  if (done) {
    return (
      <PortalShell subtitle="Show your work" title="Submission" footNote={FOOT}>
        <div className="pt-wrap">
          <div className="pt-hero">
            <h1 className="pt-h1">Got it{first ? `, ${first}` : ""}. Thank you!</h1>
            <p className="pt-lead">
              We read every submission and place people in the event that fits best. We'll email you with date options.
            </p>
          </div>
          <div className="pt-card">
            <p className="pt-help" style={{ marginTop: 0 }}>Meanwhile, come say hi in our community:</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <a className="pt-btn pt-btn-2" href={DISCORD} target="_blank" rel="noopener noreferrer">Join our Discord</a>
              <a className="pt-btn pt-btn-2" href={IG} target="_blank" rel="noopener noreferrer">Follow @sproutsocietyorg</a>
            </div>
          </div>
        </div>
      </PortalShell>
    );
  }

  if (step === 0) {
    return (
      <PortalShell subtitle="Show your work" title="Submission" footNote={FOOT}>
        <div className="pt-wrap"><p className="pt-lead">Loading your submission…</p></div>
      </PortalShell>
    );
  }

  if (step === 1) {
    return (
      <PortalShell subtitle="Show your work" title="Submission" footNote={FOOT}>
        <div className="pt-wrap">
          <Steps n={1} />
          <div className="pt-hero">
            <h1 className="pt-h1">Show your work at Sprout</h1>
            <p className="pt-lead">
              Musicians, artists, makers: tell us who you are. We'll find the right event for you and write back with date options.
            </p>
          </div>

          {err && <div className="pt-err">{err}</div>}

          <div className="pt-card">
            <div className="pt-fg">
              <label className="pt-lbl">What do you do?<span className="pt-req">*</span></label>
              <div className="pt-chips">
                {SHOWCASE_ROLES.map((r) => (
                  <button key={r} type="button" className={`pt-chip ${d.role === r ? "on" : ""}`} aria-pressed={d.role === r}
                    onClick={() => setD((p) => ({ ...p, role: r }))}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="pt-fg">
              <label className="pt-lbl" htmlFor="sc-name">Your name<span className="pt-req">*</span></label>
              <input id="sc-name" className="pt-in" value={d.name} onChange={set("name")} placeholder="First and last" autoComplete="name" />
            </div>
            <div className="pt-fg" style={{ marginBottom: 0 }}>
              <label className="pt-lbl" htmlFor="sc-email">Email<span className="pt-req">*</span></label>
              <input id="sc-email" className="pt-in" value={d.email} onChange={set("email")} placeholder="you@example.com"
                type="email" autoComplete="email" inputMode="email"
                onKeyDown={(e) => { if (e.key === "Enter") next(); }} />
            </div>
          </div>

          <button type="button" className="pt-btn" onClick={next} disabled={busy} style={{ width: "100%" }}>
            {busy ? "Saving…" : "Next: show us your work →"}
          </button>
        </div>
      </PortalShell>
    );
  }

  return (
    <PortalShell subtitle="Show your work" title="Submission" footNote={FOOT}>
      <div className="pt-wrap">
        <Steps n={2} />
        <div className="pt-hero">
          <h1 className="pt-h1">
            {welcomeBack ? `Welcome back${first ? `, ${first}` : ""}` : `Thanks${first ? `, ${first}` : ""}. Show us your work.`}
          </h1>
          <p className="pt-lead">
            {welcomeBack ? "Pick up where you left off. " : ""}Links are the most helpful. Uploads are optional.
          </p>
        </div>

        {err && <div className="pt-err">{err}</div>}

        <div className="pt-card">
          <div className="pt-fg">
            <label className="pt-lbl" htmlFor="sc-pitch">What would you show?<span className="pt-req">*</span></label>
            <textarea id="sc-pitch" className="pt-ta" value={d.pitch} onChange={set("pitch")}
              placeholder="A few sentences. What you'd play or show, roughly how long or how many pieces, solo or with other people." />
          </div>

          <div className="pt-fg">
            <label className="pt-lbl">Links to your work</label>
            <p className="pt-help" style={{ marginTop: 0, marginBottom: 8 }}>
              Instagram, Spotify, SoundCloud, Bandcamp, YouTube, a portfolio. Add as many as you like.
            </p>
            {links.map((l, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <input id={`sc-link-${i}`} className="pt-in" value={l} onChange={(e) => setLink(i, e.target.value)}
                  placeholder="Paste a link to your work" inputMode="url" />
                {(links.length > 1 || l) && (
                  <button type="button" className="pt-btn pt-btn-2 pt-btn-sm" onClick={() => dropLink(i)}
                    aria-label={`Remove link ${i + 1}`} style={{ flex: "0 0 auto", padding: "10px 13px" }}>×</button>
                )}
              </div>
            ))}
            {links.length < MAX_LINKS
              ? <button type="button" className="pt-btn-lnk" onClick={() => setLinks((p) => [...p, ""])}>+ Add another link</button>
              : <p className="pt-help">That's the most links we take ({MAX_LINKS}).</p>}
          </div>

          <div className="pt-fg" style={{ marginBottom: 0 }}>
            <label className="pt-lbl">Upload audio or images <span style={{ fontWeight: 400 }}>(optional)</span></label>
            {files.length > 0 && (
              <div className="pt-files" style={{ marginBottom: 10 }}>
                {files.map((f, i) => (
                  <div className="pt-file" key={f.url}>
                    <span aria-hidden="true">{f.kind === "audio" ? "♫" : "▤"}</span>
                    <a href={f.url} target="_blank" rel="noopener noreferrer">{f.name}</a>
                    <span className="pt-file-sz">{prettySize(f.size)}</span>
                    <button type="button" className="pt-btn-lnk" onClick={() => setFiles((p) => p.filter((_, n) => n !== i))}
                      aria-label={`Remove ${f.name}`}>Remove</button>
                  </div>
                ))}
              </div>
            )}
            {files.length < MAX_FILES ? (
              <div className="pt-drop" role="button" tabIndex={0}
                onClick={() => fileRef.current?.click()}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileRef.current?.click(); } }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); pickFiles(e.dataTransfer?.files); }}>
                <div className="pt-drop-t">{upBusy ? "Uploading…" : "Drop audio or images here, or choose files"}</div>
                <div className="pt-drop-s">mp3, m4a, wav, jpg, png · 25 MB each · up to {MAX_FILES}</div>
              </div>
            ) : (
              <p className="pt-help">{MAX_FILES} of {MAX_FILES} files. Remove one to add another.</p>
            )}
            <input ref={fileRef} id="sc-files" type="file" multiple accept="audio/*,image/*" style={{ display: "none" }}
              onChange={(e) => pickFiles(e.target.files)} />
          </div>
        </div>

        <div className="pt-card">
          <div className="pt-row">
            <div className="pt-fg">
              <label className="pt-lbl" htmlFor="sc-ig">Instagram <span style={{ fontWeight: 400 }}>(optional)</span></label>
              <input id="sc-ig" className="pt-in" value={d.instagram} onChange={set("instagram")} placeholder="@yourhandle" />
            </div>
            <div className="pt-fg">
              <label className="pt-lbl" htmlFor="sc-phone">Phone <span style={{ fontWeight: 400 }}>(optional)</span></label>
              <input id="sc-phone" className="pt-in" value={d.phone} onChange={set("phone")} placeholder="For the day of" type="tel" autoComplete="tel" />
            </div>
          </div>
          <div className="pt-fg" style={{ marginBottom: 0 }}>
            <label className="pt-lbl" htmlFor="sc-notes">Anything we should know? <span style={{ fontWeight: 400 }}>(optional)</span></label>
            <textarea id="sc-notes" className="pt-ta" style={{ minHeight: 72 }} value={d.notes} onChange={set("notes")}
              placeholder="Gear you need, access needs, months that do or don't work." />
          </div>
        </div>

        <button type="button" className="pt-btn" onClick={send} disabled={busy || upBusy} style={{ width: "100%" }}>
          {busy ? "Sending…" : "Send my submission"}
        </button>
        {!welcomeBack && (
          <button type="button" className="pt-btn-lnk" style={{ display: "block", margin: "12px auto 0" }}
            onClick={() => { setErr(""); setStep(1); }}>
            ← Back
          </button>
        )}
      </div>
    </PortalShell>
  );
}
