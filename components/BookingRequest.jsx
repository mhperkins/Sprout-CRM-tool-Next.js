"use client";

/**
 * BookingRequest.jsx — the public front door at /book.
 *
 * Deliberately short: only the fields we need to hold a date. On submit it creates
 * a PENDING event plus its portal in the CRM and hands the requester their private
 * link, which is where every other detail gets filled in over time.
 */

import { useState } from "react";
import { REQUEST_KEYS, FIELD_BY_KEY, isBlank } from "../lib/eventPortal";
import { PortalShell, FieldList } from "./PortalForm";
import { BookDatesPicker } from "./BookingCalendar";

// Dates and times come from the calendar picker instead of these fields.
const PICKER_KEYS = new Set(["event_date", "alt_date", "start_time", "end_time"]);
const FIELDS = REQUEST_KEYS.filter((k) => !PICKER_KEYS.has(k)).map((k) => FIELD_BY_KEY[k]).filter(Boolean);
const BEFORE_DATES = FIELDS.slice(0, FIELDS.findIndex((f) => f.key === "attendance"));
const AFTER_DATES = FIELDS.slice(BEFORE_DATES.length);
const REQUIRED = FIELDS.filter((f) => f.required);

export default function BookingRequest() {
  const [data, setData] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(null);   // { token, url, dates }
  const [dates, setDates] = useState({ known: null, slots: [] });

  const setField = (k, v) => setData((d) => ({ ...d, [k]: v }));
  const missing = [
    ...REQUIRED.filter((f) => isBlank(data[f.key])).map((f) => f.label),
    ...(dates.known === null ? ["Do you know your dates?"] : dates.known && !dates.slots.length ? ["Your dates"] : []),
  ];

  const submit = async () => {
    if (missing.length) {
      setErr(`Still needed: ${missing.join(", ")}`);
      return;
    }
    setErr(""); setBusy(true);
    try {
      const res = await fetch("/api/portal/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: dates.known ? data : { ...data, event_date: "tbd" },
          slots: dates.known ? dates.slots : [],
          note: dates.known ? dates.note || "" : "",
        }),
      });
      const json = await res.json();
      if (!res.ok) { setErr(json?.error || "Something went wrong. Please try again."); setBusy(false); return; }
      setDone({ token: json.token, url: `${window.location.origin}/portal/${json.token}`, dates: json.dates || 0, rejected: json.rejected || [] });
    } catch {
      setErr("We could not reach the server. Please check your connection and try again.");
      setBusy(false);
    }
  };

  if (done) {
    return (
      <PortalShell subtitle="Booking request" title="Request received">
        <div className="pt-wrap">
          <div className="pt-hero">
            <div className="pt-h1">Got it. Your request is in.</div>
            <p className="pt-lead">
              {done.dates
                ? `We got ${done.dates} date${done.dates === 1 ? "" : "s"} and will confirm by email. Nothing is booked until we do.`
                : "We will look at it and get back to you. Nothing is confirmed yet."}{" "}
              Your booking now has a private page where you can see your dates, pick more, and add details.
            </p>
          </div>
          {done.rejected?.length > 0 && (
            <div className="pt-note pt-warn">{done.rejected.length} date{done.rejected.length === 1 ? " was" : "s were"} taken by the time you sent this, so we left {done.rejected.length === 1 ? "it" : "them"} out. You can pick others from your link.</div>
          )}
          <div className="pt-note pt-good">
            <strong>This is your private link. Save it. It's how you see your dates and book with us from now on.</strong>
            <div style={{ marginTop: 10, wordBreak: "break-all", fontSize: 13.5, fontWeight: 700, color: "#2a8ca0" }}>{done.url}</div>
            <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="pt-btn pt-btn-sm" onClick={() => navigator.clipboard?.writeText(done.url)}>Copy link</button>
              <a className="pt-btn pt-btn-2 pt-btn-sm" href={`/portal/${done.token}`} style={{ textDecoration: "none", display: "inline-block" }}>Open my event portal →</a>
            </div>
          </div>
          <div className="pt-card">
            <div className="pt-sec-ttl">What happens next</div>
            <ol style={{ margin: "14px 0 0 20px", fontSize: 14.5, lineHeight: 1.85, color: "#5f5f5c" }}>
              <li>We look at your dates and email you once they are confirmed.</li>
              <li>On your page, add links, files, and any extra details, and pick more dates any time.</li>
              <li>Once we have both said yes, the event goes on the calendar.</li>
            </ol>
            <p className="pt-help" style={{ marginTop: 14 }}>
              You do not have to finish it in one sitting. The link works whenever you come back, and
              everything saves as you type.
            </p>
          </div>
        </div>
      </PortalShell>
    );
  }

  return (
    <PortalShell subtitle="Booking request">
      <div className="pt-wrap">
        <div className="pt-hero">
          <div className="pt-h1">Book the space</div>
          <p className="pt-lead">
            Tell us the basics and we will check the date. This takes about two minutes. Once it is in,
            you get a private link where you can add everything else as it comes together.
          </p>
        </div>

        {err && <div className="pt-err">{err}</div>}

        <div className="pt-card pt-open">
          <FieldList fields={BEFORE_DATES} data={data} setField={setField} scope="request" />
          <BookDatesPicker value={dates} onChange={setDates} />
          <FieldList fields={AFTER_DATES} data={data} setField={setField} scope="request" />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <button className="pt-btn" onClick={submit} disabled={busy}>
            {busy ? "Sending…" : "Send request →"}
          </button>
          <span className="pt-help" style={{ margin: 0 }}>
            {missing.length ? `${missing.length} required answer${missing.length === 1 ? "" : "s"} left` : "Ready to send"}
          </span>
        </div>

        <p className="pt-help" style={{ marginTop: 22 }}>
          Sending this does not book anything. It starts the conversation and reserves your place in
          the queue for that date.
        </p>
      </div>
    </PortalShell>
  );
}
