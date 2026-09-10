"use client";

/**
 * ProgramForm.jsx — the participant form at /program/[token].
 *
 * Artists and musicians send what they want in the night's program: name, bio, a
 * photo, and their links. Nothing is required. Each send is its own submission with a
 * private edit key kept in this browser, so a participant can come back and fix it.
 */

import { useState, useEffect, useRef } from "react";
import { PortalShell, uploadPortalFile } from "./PortalForm";
import { PROGRAM_ROLES, PROGRAM_LINKS } from "../lib/programForm";

const MAX_PHOTO = 25 * 1024 * 1024;

const fmtDate = (d) => {
  if (!d) return "";
  try { return new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }); }
  catch { return d; }
};

const storeKey = (token) => `sprout_program_${token}`;
const readSaved = (token) => {
  try { return JSON.parse(localStorage.getItem(storeKey(token)) || "null"); } catch { return null; }
};
const writeSaved = (token, v) => {
  try { v ? localStorage.setItem(storeKey(token), JSON.stringify(v)) : localStorage.removeItem(storeKey(token)); } catch { /* private mode */ }
};

const FOOT = "Questions about the program? Email us and a human will answer.";

export default function ProgramForm({ token }) {
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState("");
  const [event, setEvent] = useState(null);
  const [data, setData] = useState({});
  const [saved, setSaved] = useState(null); // { entry_id, key } once this browser has sent something
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [err, setErr] = useState("");
  const [hp, setHp] = useState("");
  const fileRef = useRef(null);

  /* ── load (and reopen this browser's earlier send, if any) ── */
  useEffect(() => {
    let alive = true;
    (async () => {
      const prior = readSaved(token);
      try {
        const headers = prior ? { "x-entry-id": prior.entry_id, "x-entry-key": prior.key } : {};
        const res = await fetch(`/api/program/${token}`, { headers });
        const json = await res.json();
        if (!alive) return;
        if (!res.ok) { setFatal(json?.error || "This link is not valid."); setLoading(false); return; }
        setEvent(json.event);
        if (json.entry) { setSaved(prior); setData(json.entry.data || {}); }
        else if (prior) writeSaved(token, null);
        setLoading(false);
      } catch {
        if (alive) { setFatal("We could not load the form. Please refresh and try again."); setLoading(false); }
      }
    })();
    return () => { alive = false; };
  }, [token]);

  const set = (k, v) => setData((d) => ({ ...d, [k]: v }));

  const pickPhoto = async (file) => {
    if (!file) return;
    setErr("");
    if (!(file.type || "").startsWith("image/")) { setErr("That file is not an image. Choose a JPG or PNG."); return; }
    if (file.size > MAX_PHOTO) { setErr("That photo is larger than 25 MB. Choose a smaller one."); return; }
    setPhotoBusy(true);
    try {
      const up = await uploadPortalFile(file, `${event.id}/program`);
      set("photo_url", up.url);
    } catch {
      setErr("Could not upload that photo. Please try again.");
    }
    setPhotoBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const top = () => { try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch { /* old browsers */ } };

  const send = async () => {
    setErr("");
    setBusy(true);
    const editing = Boolean(saved);
    try {
      const res = await fetch(`/api/program/${token}`, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { entry_id: saved.entry_id, key: saved.key, data } : { data, company_website: hp }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Sprout deleted the earlier send: let the next click send it fresh.
        if (editing && res.status === 404) { writeSaved(token, null); setSaved(null); }
        throw new Error(json?.error || "Something went wrong. Please try again.");
      }
      if (!editing) {
        const s = { entry_id: json.entry_id, key: json.key };
        setSaved(s);
        writeSaved(token, s);
      }
      setDone(true);
      top();
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  };

  const startNew = () => {
    writeSaved(token, null);
    setSaved(null);
    setData({});
    setDone(false);
    setErr("");
    top();
  };

  /* ── states ── */
  if (loading) {
    return (
      <PortalShell subtitle="Program info" footNote={FOOT}>
        <div className="pt-wrap"><div className="pt-hero"><div className="pt-lead">Loading…</div></div></div>
      </PortalShell>
    );
  }

  if (fatal) {
    return (
      <PortalShell subtitle="Program info" footNote={FOOT}>
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

  const when = fmtDate(event?.event_date);

  if (done) {
    return (
      <PortalShell subtitle="Program info" title={event?.name || ""} footNote={FOOT}>
        <div className="pt-wrap">
          <div className="pt-hero">
            <div className="pt-h1">Thank you!</div>
            <p className="pt-lead">We got your info for {event?.name || "the event"}{when ? ` on ${when}` : ""}.</p>
          </div>
          <div className="pt-note pt-good">
            You can come back to this link on this device any time to change what you sent.
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="pt-btn" onClick={() => { setDone(false); top(); }}>Edit what you sent</button>
            <button className="pt-btn pt-btn-2" onClick={startNew}>Add another act</button>
          </div>
        </div>
      </PortalShell>
    );
  }

  return (
    <PortalShell subtitle="Program info" title={event?.name || ""} footNote={FOOT}>
      <div className="pt-wrap">
        <div className="pt-hero">
          <div className="pt-h1">Be in the program</div>
          <p className="pt-lead" style={{ fontWeight: 700, color: "#030000" }}>
            {event?.name}{when ? ` · ${when}` : ""}
          </p>
          <p className="pt-lead" style={{ marginTop: 8 }}>
            Tell us what to share about you in the night&apos;s program. Everything is optional, so fill in only what you want people to see.
          </p>
        </div>

        {saved && (
          <div className="pt-note">
            You are editing what you already sent.{" "}
            <button type="button" className="pt-btn-lnk" style={{ padding: 0 }} onClick={startNew}>Send a different act instead</button>
          </div>
        )}

        <div className="pt-card">
          <div className="pt-sec-ttl">About you</div>
          <div className="pt-sec-body">
            <div className="pt-fg">
              <label className="pt-lbl">Name</label>
              <input className="pt-in" value={data.name || ""} placeholder="How your name should appear"
                onChange={(e) => set("name", e.target.value)} />
            </div>

            <div className="pt-fg">
              <label className="pt-lbl">What are you sharing?</label>
              <div className="pt-chips">
                {PROGRAM_ROLES.map((r) => (
                  <button type="button" key={r} className={`pt-chip ${data.role === r ? "on" : ""}`}
                    onClick={() => set("role", data.role === r ? "" : r)}>{r}</button>
                ))}
              </div>
            </div>

            <div className="pt-fg">
              <label className="pt-lbl">Bio</label>
              <textarea className="pt-ta" value={data.bio || ""} placeholder="A few sentences about you and your work"
                onChange={(e) => set("bio", e.target.value)} />
            </div>

            <div className="pt-fg" style={{ marginBottom: 0 }}>
              <label className="pt-lbl">Photo</label>
              {data.photo_url ? (
                <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                  <img src={data.photo_url} alt="Your photo"
                    style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 8, border: "1px solid #DCDCD9" }} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
                    <button type="button" className="pt-btn pt-btn-2 pt-btn-sm" disabled={photoBusy}
                      onClick={() => fileRef.current?.click()}>{photoBusy ? "Uploading…" : "Replace photo"}</button>
                    <button type="button" className="pt-btn-lnk" style={{ padding: 0 }} onClick={() => set("photo_url", "")}>Remove</button>
                  </div>
                </div>
              ) : (
                <div className="pt-drop" onClick={() => !photoBusy && fileRef.current?.click()}>
                  <div className="pt-drop-t">{photoBusy ? "Uploading…" : "Choose a photo"}</div>
                  <div className="pt-drop-s">A photo of you or your work. JPG or PNG.</div>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
                onChange={(e) => pickPhoto(e.target.files?.[0])} />
            </div>
          </div>
        </div>

        <div className="pt-card">
          <div className="pt-sec-ttl">Links</div>
          <p className="pt-sec-blurb">Where people can follow you, tip you, or buy your work.</p>
          <div className="pt-sec-body">
            <div className="pt-row">
              {PROGRAM_LINKS.map((l) => (
                <div className="pt-fg" key={l.key}>
                  <label className="pt-lbl">{l.label}</label>
                  <input className="pt-in" value={data[l.key] || ""} placeholder={l.placeholder}
                    autoCapitalize="off" autoCorrect="off" onChange={(e) => set(l.key, e.target.value)} />
                </div>
              ))}
            </div>
            <div className="pt-row">
              <div className="pt-fg">
                <label className="pt-lbl">Other link name</label>
                <input className="pt-in" value={data.other_label || ""} placeholder="Spotify, Bandcamp, shop…"
                  onChange={(e) => set("other_label", e.target.value)} />
              </div>
              <div className="pt-fg">
                <label className="pt-lbl">Other link</label>
                <input className="pt-in" value={data.other_url || ""} placeholder="https://"
                  autoCapitalize="off" autoCorrect="off" onChange={(e) => set("other_url", e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <div className="pt-card">
          <div className="pt-sec-ttl">Your email</div>
          <p className="pt-sec-blurb">Not printed in the program. Only so we can reach you.</p>
          <div className="pt-sec-body">
            <input className="pt-in" type="email" autoComplete="email" value={data.email || ""} placeholder="you@email.com"
              onChange={(e) => set("email", e.target.value)} />
          </div>
        </div>

        <input className="pt-hp" tabIndex={-1} autoComplete="off" aria-hidden="true" value={hp} onChange={(e) => setHp(e.target.value)} />

        {err && <div className="pt-err">{err}</div>}

        <button className="pt-btn" onClick={send} disabled={busy || photoBusy}>
          {busy ? "Sending…" : saved ? "Save changes" : "Send to Sprout"}
        </button>
      </div>
    </PortalShell>
  );
}
