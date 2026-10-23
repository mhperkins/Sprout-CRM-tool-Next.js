"use client";

/**
 * GalleryForm.jsx — the gallery submission form at /gallery/[token].
 *
 * Replaces the "Gallery Art Submission Form" Google Form. Artists send 1 to 4 pieces
 * (title, size, medium, price, photo), whether they are hang-ready, a statement, and
 * whether they would share more work. Each send gets a private edit key kept in this
 * browser, so the artist can come back and fix it.
 */

import { useState, useEffect } from "react";
import { PortalShell, uploadPortalFile } from "./PortalForm";
import { MAX_PIECES, READY_OPTS, MORE_OPTS, galleryProblems } from "../lib/galleryForm";

const MAX_PHOTO = 25 * 1024 * 1024;
const FOOT = "Questions about showing your work? Email hello@sproutsociety.org and a human will answer.";

const fmtDate = (d) => {
  if (!d) return "";
  try { return new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }); }
  catch { return d; }
};

const storeKey = (token) => `sprout_gallery_${token}`;
const readSaved = (token) => { try { return JSON.parse(localStorage.getItem(storeKey(token)) || "null"); } catch { return null; } };
const writeSaved = (token, v) => {
  try { v ? localStorage.setItem(storeKey(token), JSON.stringify(v)) : localStorage.removeItem(storeKey(token)); } catch { /* private mode */ }
};

const blankPiece = () => ({ title: "", width: "", height: "", medium: "", price: "", photo_url: "" });

function PieceCard({ i, piece, scope, onChange, onRemove, canRemove }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => onChange({ ...piece, [k]: v });
  const id = `gp${i}`;

  const pick = async (file) => {
    if (!file) return;
    setErr("");
    if (!(file.type || "").startsWith("image/")) { setErr("That file is not an image. Choose a JPG or PNG."); return; }
    if (file.size > MAX_PHOTO) { setErr("That photo is larger than 25 MB. Choose a smaller one."); return; }
    setBusy(true);
    try { set("photo_url", (await uploadPortalFile(file, `${scope}/gallery`)).url); }
    catch { setErr("Could not upload that photo. Please try again."); }
    setBusy(false);
  };

  return (
    <div className="pt-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div className="pt-sec-ttl" style={{ margin: 0 }}>Piece {i + 1}</div>
        {canRemove && <button type="button" className="pt-btn-lnk" style={{ padding: 0 }} onClick={onRemove}>Remove</button>}
      </div>
      <div className="pt-sec-body">
        <div className="pt-fg">
          <label className="pt-lbl" htmlFor={`${id}t`}>Title <span style={{ fontWeight: 400 }}>(optional)</span></label>
          <input id={`${id}t`} className="pt-in" value={piece.title} onChange={(e) => set("title", e.target.value)} />
        </div>
        <div className="pt-row">
          <div className="pt-fg">
            <label className="pt-lbl" htmlFor={`${id}w`}>Width (inches)</label>
            <input id={`${id}w`} className="pt-in" inputMode="decimal" value={piece.width} placeholder="24"
              onChange={(e) => set("width", e.target.value)} />
          </div>
          <div className="pt-fg">
            <label className="pt-lbl" htmlFor={`${id}h`}>Height (inches)</label>
            <input id={`${id}h`} className="pt-in" inputMode="decimal" value={piece.height} placeholder="36"
              onChange={(e) => set("height", e.target.value)} />
          </div>
        </div>
        <div className="pt-row">
          <div className="pt-fg">
            <label className="pt-lbl" htmlFor={`${id}m`}>Medium</label>
            <input id={`${id}m`} className="pt-in" value={piece.medium} placeholder="Oil on canvas, photo print…"
              onChange={(e) => set("medium", e.target.value)} />
          </div>
          <div className="pt-fg">
            <label className="pt-lbl" htmlFor={`${id}p`}>Price <span style={{ fontWeight: 400 }}>(if for sale)</span></label>
            <input id={`${id}p`} className="pt-in" value={piece.price} placeholder="$350"
              onChange={(e) => set("price", e.target.value)} />
          </div>
        </div>
        <div className="pt-fg" style={{ marginBottom: 0 }}>
          <label className="pt-lbl">Photo of the piece</label>
          {piece.photo_url ? (
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <img src={piece.photo_url} alt={`Piece ${i + 1}`}
                style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 8, border: "1px solid #DCDCD9" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
                <label className="pt-btn pt-btn-2 pt-btn-sm" style={{ cursor: "pointer" }}>
                  {busy ? "Uploading…" : "Replace photo"}
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => pick(e.target.files?.[0])} />
                </label>
                <button type="button" className="pt-btn-lnk" style={{ padding: 0 }} onClick={() => set("photo_url", "")}>Remove photo</button>
              </div>
            </div>
          ) : (
            <label className="pt-drop" style={{ display: "block", cursor: busy ? "default" : "pointer" }}>
              <div className="pt-drop-t">{busy ? "Uploading…" : "Choose a photo"}</div>
              <div className="pt-drop-s">Helps us plan the walls ahead of time. JPG or PNG.</div>
              <input type="file" accept="image/*" style={{ display: "none" }} disabled={busy}
                onChange={(e) => pick(e.target.files?.[0])} />
            </label>
          )}
          {err && <div className="pt-err" style={{ marginTop: 8 }}>{err}</div>}
        </div>
      </div>
    </div>
  );
}

export default function GalleryForm({ token }) {
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState("");
  const [info, setInfo] = useState(null); // { kind, event, scope }
  const [data, setData] = useState({ pieces: [blankPiece(), blankPiece()] });
  const [saved, setSaved] = useState(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const prior = readSaved(token);
      try {
        const headers = prior ? { "x-entry-id": prior.entry_id, "x-entry-key": prior.key } : {};
        const res = await fetch(`/api/gallery/${token}`, { headers });
        const json = await res.json();
        if (!alive) return;
        if (!res.ok) { setFatal(json?.error || "This link is not valid."); setLoading(false); return; }
        setInfo({ kind: json.kind, event: json.event, scope: json.scope });
        if (json.entry) {
          const d = json.entry.data || {};
          setSaved(prior);
          setData({ ...d, pieces: (d.pieces?.length ? d.pieces : [blankPiece()]).map((p) => ({ ...blankPiece(), ...p })) });
        } else if (prior) writeSaved(token, null);
        setLoading(false);
      } catch {
        if (alive) { setFatal("We could not load the form. Please refresh and try again."); setLoading(false); }
      }
    })();
    return () => { alive = false; };
  }, [token]);

  const set = (k, v) => setData((d) => ({ ...d, [k]: v }));
  const setPiece = (i, p) => setData((d) => ({ ...d, pieces: d.pieces.map((x, j) => (j === i ? p : x)) }));
  const top = () => { try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch { /* old browsers */ } };

  const send = async () => {
    setErr("");
    // Drop untouched piece cards before checking and sending.
    const clean = { ...data, pieces: data.pieces.filter((p) => Object.values(p).some((v) => String(v || "").trim())) };
    const problems = galleryProblems({ ...clean, name: (clean.name || "").trim(), email: (clean.email || "").trim() });
    if (problems.length) { setErr(problems.join(" ")); return; }
    setBusy(true);
    const editing = Boolean(saved);
    try {
      const res = await fetch(`/api/gallery/${token}`, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { entry_id: saved.entry_id, key: saved.key, data: clean } : { data: clean }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
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
    setData({ pieces: [blankPiece(), blankPiece()] });
    setDone(false);
    setErr("");
    top();
  };

  const ev = info?.event;
  const when = fmtDate(ev?.event_date);
  const title = ev?.name || "Sprout N Tell";

  if (loading) {
    return (
      <PortalShell subtitle="Gallery submission" footNote={FOOT}>
        <div className="pt-wrap"><div className="pt-hero"><div className="pt-lead">Loading…</div></div></div>
      </PortalShell>
    );
  }

  if (fatal) {
    return (
      <PortalShell subtitle="Gallery submission" footNote={FOOT}>
        <div className="pt-wrap">
          <div className="pt-hero">
            <div className="pt-h1">This link did not work</div>
            <p className="pt-lead">{fatal}</p>
          </div>
          <div className="pt-note">
            Email <a href="mailto:hello@sproutsociety.org" style={{ color: "#2a8ca0", fontWeight: 700 }}>hello@sproutsociety.org</a> and we will send a fresh link.
          </div>
        </div>
      </PortalShell>
    );
  }

  if (done) {
    return (
      <PortalShell subtitle="Gallery submission" title={title} footNote={FOOT}>
        <div className="pt-wrap">
          <div className="pt-hero">
            <div className="pt-h1">Thank you!</div>
            <p className="pt-lead">
              We got your submission{ev ? ` for ${ev.name}${when ? ` on ${when}` : ""}` : ""}. We will be in touch about
              {ev ? " the hang." : " an upcoming show."}
            </p>
          </div>
          <div className="pt-note pt-good">You can come back to this link on this device any time to change what you sent.</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="pt-btn" onClick={() => { setDone(false); top(); }}>Edit what you sent</button>
            <button className="pt-btn pt-btn-2" onClick={startNew}>Send for another artist</button>
          </div>
        </div>
      </PortalShell>
    );
  }

  return (
    <PortalShell subtitle="Gallery submission" title={title} footNote={FOOT}>
      <div className="pt-wrap">
        <div className="pt-hero">
          <div className="pt-h1">Show your work</div>
          {ev && <p className="pt-lead" style={{ fontWeight: 700, color: "#030000" }}>{ev.name}{when ? ` · ${when}` : ""}</p>}
          <p className="pt-lead" style={{ marginTop: 8 }}>
            Tell us about 2 to 4 pieces, depending on size. Sizes and photos help us plan the walls ahead of time.
          </p>
        </div>

        {saved && (
          <div className="pt-note">
            You are editing what you already sent.{" "}
            <button type="button" className="pt-btn-lnk" style={{ padding: 0 }} onClick={startNew}>Send for a different artist instead</button>
          </div>
        )}

        <div className="pt-card">
          <div className="pt-sec-ttl">About you</div>
          <div className="pt-sec-body">
            <div className="pt-row">
              <div className="pt-fg">
                <label className="pt-lbl" htmlFor="g-name">Artist name</label>
                <input id="g-name" className="pt-in" autoComplete="name" value={data.name || ""} onChange={(e) => set("name", e.target.value)} />
              </div>
              <div className="pt-fg">
                <label className="pt-lbl" htmlFor="g-email">Email</label>
                <input id="g-email" className="pt-in" type="email" autoComplete="email" inputMode="email" value={data.email || ""}
                  onChange={(e) => set("email", e.target.value)} />
              </div>
            </div>
            <div className="pt-row">
              <div className="pt-fg">
                <label className="pt-lbl" htmlFor="g-ig">Instagram <span style={{ fontWeight: 400 }}>(optional)</span></label>
                <input id="g-ig" className="pt-in" autoCapitalize="off" autoCorrect="off" placeholder="@yourhandle"
                  value={data.instagram || ""} onChange={(e) => set("instagram", e.target.value)} />
              </div>
              <div className="pt-fg">
                <label className="pt-lbl" htmlFor="g-web">Website <span style={{ fontWeight: 400 }}>(optional)</span></label>
                <input id="g-web" className="pt-in" autoCapitalize="off" autoCorrect="off" placeholder="yoursite.com"
                  value={data.website || ""} onChange={(e) => set("website", e.target.value)} />
              </div>
            </div>
            <div className="pt-fg" style={{ marginBottom: 0 }}>
              <label className="pt-lbl" htmlFor="g-st">Artist statement and/or short bio</label>
              <textarea id="g-st" className="pt-ta" value={data.statement || ""} onChange={(e) => set("statement", e.target.value)} />
            </div>
          </div>
        </div>

        {data.pieces.map((p, i) => (
          <PieceCard key={i} i={i} piece={p} scope={info?.scope || "open-call"}
            onChange={(np) => setPiece(i, np)}
            onRemove={() => setData((d) => ({ ...d, pieces: d.pieces.filter((_, j) => j !== i) }))}
            canRemove={data.pieces.length > 1} />
        ))}
        {data.pieces.length < MAX_PIECES && (
          <button type="button" className="pt-btn pt-btn-2" style={{ marginBottom: 18 }}
            onClick={() => setData((d) => ({ ...d, pieces: [...d.pieces, blankPiece()] }))}>+ Add another piece</button>
        )}

        <div className="pt-card">
          <div className="pt-sec-ttl">Hanging</div>
          <div className="pt-sec-body">
            <div className="pt-fg">
              <label className="pt-lbl">Are all pieces ready for gallery hanging (framed, wire attached, etc.)?</label>
              <div className="pt-chips">
                {READY_OPTS.map((o) => (
                  <button type="button" key={o.id} className={`pt-chip ${data.ready === o.id ? "on" : ""}`}
                    onClick={() => set("ready", data.ready === o.id ? "" : o.id)}>{o.label}</button>
                ))}
              </div>
            </div>
            <div className="pt-fg">
              <label className="pt-lbl">If space is available, would you want to share more work than you submitted?</label>
              <div className="pt-chips">
                {MORE_OPTS.map((o) => (
                  <button type="button" key={o.id} className={`pt-chip ${data.more_work === o.id ? "on" : ""}`}
                    onClick={() => set("more_work", data.more_work === o.id ? "" : o.id)}>{o.label}</button>
                ))}
              </div>
            </div>
            <div className="pt-fg" style={{ marginBottom: 0 }}>
              <label className="pt-lbl" htmlFor="g-notes">Anything else we should know? <span style={{ fontWeight: 400 }}>(optional)</span></label>
              <textarea id="g-notes" className="pt-ta" value={data.notes || ""} onChange={(e) => set("notes", e.target.value)} />
            </div>
          </div>
        </div>

        {err && <div className="pt-err">{err}</div>}
        <button className="pt-btn" onClick={send} disabled={busy}>{busy ? "Sending…" : saved ? "Save changes" : "Send to Sprout"}</button>
      </div>
    </PortalShell>
  );
}
