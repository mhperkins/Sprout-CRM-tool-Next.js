"use client";

/**
 * EventPortal.jsx — the full client-facing portal at /portal/[token].
 *
 * The home for everything about one event. Autosaves as you type, so a client can
 * leave and come back. The token in the URL is the only credential; it scopes every
 * request to this one booking.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { PORTAL_SECTIONS, sectionProgress, portalProgress, REQUIRED_KEYS, FIELD_BY_KEY, isBlank } from "../lib/eventPortal";
import { PortalShell, FieldList, useAutosave } from "./PortalForm";
import { BRAND_ASSETS, BRAND_GUIDELINES } from "../lib/brandAssets";

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
                {a.files.map((f) => (
                  <a key={f.format} href={f.href} download className="pt-btn pt-btn-2 pt-btn-sm" style={{ textDecoration: "none" }}>
                    ↓ {f.format}
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

const fmtDate = (d) => {
  if (!d) return "";
  try { return new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }); }
  catch { return d; }
};

const STATUS_NOTE = {
  pending:   { cls: "pt-note",          text: "This date is not confirmed yet. We are reviewing your request." },
  upcoming:  { cls: "pt-note pt-good",  text: "Confirmed. This event is on the Sprout calendar." },
  completed: { cls: "pt-note",          text: "This event has happened. Thank you for having it here." },
  cancelled: { cls: "pt-note pt-warn",  text: "This event is marked cancelled. Get in touch if that is wrong." },
};

export default function EventPortal({ token }) {
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState("");
  const [event, setEvent] = useState(null);
  const [portal, setPortal] = useState(null);
  const [data, setData] = useState({});
  const [open, setOpen] = useState(() => new Set([PORTAL_SECTIONS[0].key]));
  const [submitting, setSubmitting] = useState(false);
  const dataRef = useRef({});

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
        setPortal(json.portal);
        setData(json.portal?.data || {});
        dataRef.current = json.portal?.data || {};
        setLoading(false);
      } catch {
        if (alive) { setFatal("We could not load your portal. Please refresh and try again."); setLoading(false); }
      }
    })();
    return () => { alive = false; };
  }, [token]);

  /* ── save ── */
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

  const toggleSection = (k) =>
    setOpen((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/portal/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: dataRef.current }),
      });
      const json = await res.json();
      if (res.ok) setPortal((p) => ({ ...p, status: "submitted", submitted_at: json.submitted_at }));
    } finally {
      setSubmitting(false);
    }
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
  const submitted = portal?.status === "submitted";

  return (
    <PortalShell subtitle="Event portal" title={event?.name || ""}>
      <div className="pt-wrap">
        <div className="pt-hero">
          <div className="pt-h1">{data.event_name || event?.name || "Your event"}</div>
          <p className="pt-lead">
            {fmtDate(data.event_date || event?.event_date) || "Date to be confirmed"}
            {" · "}Everything about this event lives here. It saves as you type, so come back any time.
          </p>
        </div>

        <div className={note.cls}>{note.text}</div>

        {!prog.readyToSchedule && (
          <div className="pt-note pt-warn">
            <strong>{prog.missingRequired.length} thing{prog.missingRequired.length === 1 ? "" : "s"} we need before this can go on the calendar:</strong>
            <div style={{ marginTop: 8, fontSize: 13.5, lineHeight: 1.7, color: "#5f5f5c" }}>
              {prog.missingRequired.map((k) => FIELD_BY_KEY[k]?.label || k).join(" · ")}
            </div>
          </div>
        )}

        {submitted && (
          <div className="pt-note pt-good">
            You marked this as ready on {new Date(portal.submitted_at).toLocaleDateString()}. You can still
            change anything here, and we will see the updates.
          </div>
        )}

        {PORTAL_SECTIONS.map((sec) => {
          const sp = sectionProgress(sec, data);
          const isOpen = open.has(sec.key);
          const complete = sp.missingRequired === 0 && sp.answered > 0;
          return (
            <div className={`pt-card ${isOpen ? "pt-open" : ""}`} key={sec.key}>
              <div className="pt-sec-hd" onClick={() => toggleSection(sec.key)}>
                <div className={`pt-num ${complete ? "pt-done" : ""}`}>{complete ? "✓" : sec.icon}</div>
                <div style={{ minWidth: 0 }}>
                  <div className="pt-sec-ttl">{sec.title}</div>
                  <div className="pt-sec-blurb">{sec.blurb}</div>
                </div>
                <div className="pt-sec-meta">
                  <span className="pt-count">
                    {sp.missingRequired > 0 ? `${sp.missingRequired} required` : `${sp.answered}/${sp.total}`}
                  </span>
                  <span className="pt-caret">{isOpen ? "▲" : "▼"}</span>
                </div>
              </div>
              {isOpen && (
                <div className="pt-sec-body">
                  <FieldList fields={sec.fields} data={data} setField={setField} scope={token} />
                </div>
              )}
            </div>
          );
        })}

        <BrandKit />

        <div className="pt-card">
          <div className="pt-sec-ttl">Done for now?</div>
          <p className="pt-sec-blurb" style={{ marginTop: 6 }}>
            Marking it ready tells us you have put in everything you have. You can keep editing afterwards.
          </p>
          <button className="pt-btn" style={{ marginTop: 16 }} onClick={submit} disabled={submitting}>
            {submitting ? "Sending…" : submitted ? "Send an update" : "Mark ready for review →"}
          </button>
        </div>
      </div>

      <div className="pt-bar">
        <div className="pt-bar-in">
          <div className="pt-prog">
            <div className="pt-prog-t">
              {prog.readyToSchedule
                ? `Everything essential is in · ${prog.pct}% of the full portal filled`
                : `${prog.requiredDone} of ${prog.requiredTotal} essentials · ${prog.pct}% filled`}
            </div>
            <div className="pt-prog-bar"><div className="pt-prog-fill" style={{ width: `${Math.max(3, prog.pct)}%` }} /></div>
          </div>
          <div className="pt-save">
            {saveStatus === "saving" ? "Saving…"
              : saveStatus === "saved" ? "Saved ✓"
              : saveStatus === "error" ? "Could not save — check your connection"
              : "Saves automatically"}
          </div>
        </div>
      </div>
    </PortalShell>
  );
}
