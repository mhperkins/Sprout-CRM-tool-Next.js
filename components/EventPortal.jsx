"use client";

/**
 * EventPortal.jsx — the client-facing portal at /portal/[token].
 *
 * One short page: the booking details, food and drinks, links, files, a shared
 * "More details" box, and our logos. Answers autosave. Links and files are written
 * to the event record itself, so they show up in the CRM's Links and Media tiles.
 * The token in the URL is the only credential; it scopes every request to one booking.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { FIELD_BY_KEY } from "../lib/eventPortal";
import { portalProgress } from "../lib/eventPortal";
import { PortalShell, FieldList, useAutosave, uploadPortalFile } from "./PortalForm";
import { BRAND_ASSETS, BRAND_GUIDELINES } from "../lib/brandAssets";

const fmtDate = (d) => {
  if (!d) return "";
  try { return new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }); }
  catch { return d; }
};

const fmtTime = (t) => {
  const m = String(t || "").match(/^(\d{1,2}):(\d{2})/);
  if (!m) return "";
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]}${h < 12 ? "am" : "pm"}`;
};

const prettySize = (b) => (!b ? "" : b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const MAX_FILE = 25 * 1024 * 1024;

const STATUS_NOTE = {
  pending:   { cls: "pt-note",          text: "This date is not confirmed yet. We are reviewing your request." },
  upcoming:  { cls: "pt-note pt-good",  text: "Confirmed. This event is on the Sprout calendar." },
  completed: { cls: "pt-note",          text: "This event has happened. Thank you for having it here." },
  cancelled: { cls: "pt-note pt-warn",  text: "This event is marked cancelled. Get in touch if that is wrong." },
};

const f = (...keys) => keys.map((k) => FIELD_BY_KEY[k]).filter(Boolean);
const CONTACT_FIELDS = f("contact_name", "contact_email", "contact_phone", "org_name");
const EVENT_FIELDS = f("event_name", "event_type", "audience", "event_date", "alt_date", "start_time", "end_time", "attendance", "short_desc");
const FOOD_FIELDS = f("food_drink");

/** Download cards for our logos, so hosts can drop them straight onto a flyer. */
function BrandKit() {
  if (!BRAND_ASSETS.length) return null;
  return (
    <div className="pt-card">
      <div className="pt-sec-ttl">Our logos for your flyer</div>
      <p className="pt-sec-blurb" style={{ marginTop: 6 }}>
        Download whichever version fits your design. PNGs have a transparent background; SVGs scale to any size.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14, marginTop: 18 }}>
        {BRAND_ASSETS.map((a) => (
          <div key={a.key} style={{ border: "1px solid #e4e4e1", borderRadius: 8, overflow: "hidden", background: "#fff" }}>
            <div style={{
              height: 140, display: "flex", alignItems: "center", justifyContent: "center", padding: 18,
              background: a.bg === "dark" ? "#030000" : "#F7F7F6",
            }}>
              <img src={a.preview} alt={a.label} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
            </div>
            <div style={{ padding: "12px 14px" }}>
              <div style={{ fontSize: 14.5, fontWeight: 900 }}>{a.label}</div>
              <div style={{ fontSize: 12.5, color: "#6b6b68", marginTop: 3, lineHeight: 1.5 }}>{a.note}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                {a.files.map((file) => (
                  <a key={file.format} href={file.href} download className="pt-btn pt-btn-2 pt-btn-sm" style={{ textDecoration: "none" }}>
                    ↓ {file.format}
                  </a>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      <ul style={{ margin: "18px 0 0", paddingLeft: 20, fontSize: 13.5, lineHeight: 1.75, color: "#5f5f5c" }}>
        {BRAND_GUIDELINES.map((g) => <li key={g}>{g}</li>)}
      </ul>
    </div>
  );
}

export default function EventPortal({ token }) {
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState("");
  const [event, setEvent] = useState(null);
  const [data, setData] = useState({});
  const dataRef = useRef({});

  // Links + files (written to the event record through /assets)
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [assetBusy, setAssetBusy] = useState(false);
  const [assetErr, setAssetErr] = useState("");
  const fileRef = useRef(null);

  /* ── load ── */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/portal/${token}`);
        const json = await res.json();
        if (!alive) return;
        if (!res.ok) { setFatal(json?.error || "This link is not valid."); setLoading(false); return; }
        setEvent(json.event);
        setData(json.portal?.data || {});
        dataRef.current = json.portal?.data || {};
        setLoading(false);
      } catch {
        if (alive) { setFatal("We could not load your portal. Please refresh and try again."); setLoading(false); }
      }
    })();
    return () => { alive = false; };
  }, [token]);

  /* ── save answers ── */
  const persist = useCallback(async (payload) => {
    const res = await fetch(`/api/portal/${token}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: payload }),
    });
    if (!res.ok) throw new Error("save failed");
    return res.json();
  }, [token]);

  const [saveStatus, scheduleSave] = useAutosave(persist);

  const setField = (k, v) => {
    setData((d) => {
      const next = { ...d, [k]: v };
      dataRef.current = next;
      scheduleSave(next);
      return next;
    });
  };

  /* ── links + files ── */
  const callAssets = async (action, payload = {}) => {
    setAssetErr("");
    const res = await fetch(`/api/portal/${token}/assets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || "Something went wrong. Please try again.");
    setEvent((e) => ({ ...e, links: json.links || [], media: json.media || [] }));
  };

  const addLink = async () => {
    if (!linkUrl.trim()) return;
    setAssetBusy(true);
    try {
      await callAssets("add_link", { label: linkLabel, url: linkUrl });
      setLinkLabel(""); setLinkUrl("");
    } catch (e) { setAssetErr(e.message); }
    setAssetBusy(false);
  };

  const addFiles = async (list) => {
    const chosen = Array.from(list || []);
    if (!chosen.length) return;
    setAssetBusy(true);
    for (const file of chosen) {
      if (file.size > MAX_FILE) { setAssetErr(`"${file.name}" is larger than 25 MB. Add it as a link instead.`); continue; }
      try {
        const up = await uploadPortalFile(file, event.id);
        await callAssets("add_media", { url: up.url, name: up.name, mime: file.type || "", size: up.size });
      } catch (e) {
        setAssetErr(`Could not upload "${file.name}". ${e.message || ""}`.trim());
      }
    }
    if (fileRef.current) fileRef.current.value = "";
    setAssetBusy(false);
  };

  const remove = async (action, id) => {
    setAssetBusy(true);
    try { await callAssets(action, { id }); } catch (e) { setAssetErr(e.message); }
    setAssetBusy(false);
  };

  /* ── states ── */
  if (loading) {
    return (
      <PortalShell>
        <div className="pt-wrap"><div className="pt-hero"><div className="pt-lead">Loading your event…</div></div></div>
      </PortalShell>
    );
  }

  if (fatal) {
    return (
      <PortalShell subtitle="Event portal">
        <div className="pt-wrap">
          <div className="pt-hero">
            <div className="pt-h1">This link did not work</div>
            <p className="pt-lead">{fatal}</p>
          </div>
          <div className="pt-note">
            Links are unique to each event. If yours stopped working, email{" "}
            <a href="mailto:hello@sproutsociety.org" style={{ color: "#2a8ca0", fontWeight: 700 }}>hello@sproutsociety.org</a>{" "}
            and we will send a fresh one. Or{" "}
            <a href="/book" style={{ color: "#E10098", fontWeight: 700 }}>start a new booking request</a>.
          </div>
        </div>
      </PortalShell>
    );
  }

  const prog = portalProgress(data);
  const note = STATUS_NOTE[event?.status] || STATUS_NOTE.pending;
  const links = event?.links || [];
  const media = event?.media || [];
  const date = data.event_date || event?.event_date;
  const start = fmtTime(data.start_time || event?.start_time);
  const end = fmtTime(data.end_time || event?.end_time);
  const isImg = (m) => (m.mime || "").startsWith("image/") || /\.(png|jpe?g|gif|webp|avif)$/i.test(m.url || "");

  return (
    <PortalShell subtitle="Event portal" title={event?.name || ""}>
      <div className="pt-wrap">
        <div className="pt-hero">
          <div className="pt-h1">{data.event_name || event?.name || "Your event"}</div>
          <p className="pt-lead">
            {fmtDate(date) || "Date to be confirmed"}{start ? ` · ${start}${end ? `–${end}` : ""}` : ""}
          </p>
        </div>

        <div className={note.cls}>{note.text}</div>

        {!prog.readyToSchedule && (
          <div className="pt-note pt-warn">
            <strong>Still needed:</strong> {prog.missingRequired.map((k) => FIELD_BY_KEY[k]?.label || k).join(", ")}
          </div>
        )}

        <div className="pt-card">
          <div className="pt-sec-ttl">Event details</div>
          <p className="pt-sec-blurb" style={{ marginTop: 6 }}>Everything here saves as you type, so come back any time.</p>
          <div className="pt-sec-body">
            <FieldList fields={CONTACT_FIELDS} data={data} setField={setField} scope={event?.id} />
            <div style={{ borderTop: "1px solid #ECECEA", margin: "6px 0 20px" }} />
            <FieldList fields={EVENT_FIELDS} data={data} setField={setField} scope={event?.id} />
          </div>
        </div>

        <div className="pt-card">
          <div className="pt-sec-ttl">Food and drinks</div>
          <p className="pt-sec-blurb" style={{ marginTop: 6 }}>
            Sprout runs a lot of sober and sober-friendly programming, so let us know what is planned.
          </p>
          <div className="pt-sec-body">
            <FieldList fields={FOOD_FIELDS} data={data} setField={setField} scope={event?.id} />
          </div>
        </div>

        <div className="pt-card">
          <div className="pt-sec-ttl">Links</div>
          <p className="pt-sec-blurb" style={{ marginTop: 6 }}>Tickets, RSVP, Instagram posts, Drive folders. Sprout sees these too.</p>
          <div className="pt-sec-body">
            {links.length > 0 && (
              <div className="pt-files" style={{ marginBottom: 14 }}>
                {links.map((l) => (
                  <div className="pt-file" key={l.id}>
                    <span>🔗</span>
                    <a href={l.url} target="_blank" rel="noopener noreferrer">{l.label || l.url}</a>
                    <button type="button" className="pt-btn-lnk" style={{ marginLeft: "auto" }} disabled={assetBusy}
                      onClick={() => remove("remove_link", l.id)}>Remove</button>
                  </div>
                ))}
              </div>
            )}
            <div className="pt-row">
              <div className="pt-fg">
                <label className="pt-lbl">Label</label>
                <input className="pt-in" value={linkLabel} placeholder="Tickets" onChange={(e) => setLinkLabel(e.target.value)} />
              </div>
              <div className="pt-fg">
                <label className="pt-lbl">Link</label>
                <input className="pt-in" type="url" value={linkUrl} placeholder="https://"
                  onChange={(e) => setLinkUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addLink(); }} />
              </div>
            </div>
            <button className="pt-btn pt-btn-2 pt-btn-sm" onClick={addLink} disabled={assetBusy || !linkUrl.trim()}>+ Add link</button>
          </div>
        </div>

        <div className="pt-card">
          <div className="pt-sec-ttl">Files</div>
          <p className="pt-sec-blurb" style={{ marginTop: 6 }}>Flyers, photos, tech riders, anything we should have. Sprout sees these too.</p>
          <div className="pt-sec-body">
            {media.length > 0 && (
              <div className="pt-files" style={{ marginBottom: 14 }}>
                {media.map((m) => (
                  <div className="pt-file" key={m.id}>
                    {isImg(m)
                      ? <img src={m.url} alt="" style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 5, flexShrink: 0 }} />
                      : <span>📎</span>}
                    <a href={m.url} target="_blank" rel="noopener noreferrer">{m.name || "file"}</a>
                    <span className="pt-file-sz">{prettySize(m.size)}</span>
                    <button type="button" className="pt-btn-lnk" disabled={assetBusy} onClick={() => remove("remove_media", m.id)}>Remove</button>
                  </div>
                ))}
              </div>
            )}
            <div className="pt-drop" onClick={() => !assetBusy && fileRef.current?.click()}>
              <div className="pt-drop-t">{assetBusy ? "Working…" : media.length ? "Add another file" : "Choose a file"}</div>
              <div className="pt-drop-s">Up to 25 MB each. Bigger files, like video, work better as a link.</div>
            </div>
            <input ref={fileRef} type="file" multiple style={{ display: "none" }} onChange={(e) => addFiles(e.target.files)} />
          </div>
        </div>

        {assetErr && <div className="pt-err">{assetErr}</div>}

        <div className="pt-card">
          <div className="pt-sec-ttl">More details</div>
          <p className="pt-sec-blurb" style={{ marginTop: 6 }}>
            Everything else: lineup, sound, setup, promo, tickets. Sprout can read and edit this too.
          </p>
          <div className="pt-sec-body">
            <textarea className="pt-ta" style={{ minHeight: 200 }} value={data.more_details || ""}
              placeholder={FIELD_BY_KEY.more_details?.placeholder || ""}
              onChange={(e) => setField("more_details", e.target.value)} />
          </div>
        </div>

        <BrandKit />
      </div>

      <div className="pt-bar">
        <div className="pt-bar-in">
          <div className="pt-save">
            {saveStatus === "saving" ? "Saving…"
              : saveStatus === "saved" ? "Saved ✓"
              : saveStatus === "error" ? "Could not save. Check your connection."
              : "Saves automatically"}
          </div>
        </div>
      </div>
    </PortalShell>
  );
}
