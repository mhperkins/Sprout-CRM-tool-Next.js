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

const FIELDS = REQUEST_KEYS.map((k) => FIELD_BY_KEY[k]).filter(Boolean);
const REQUIRED = FIELDS.filter((f) => f.required);

export default function BookingRequest() {
  const [data, setData] = useState({});
  const [hp, setHp] = useState("");         // honeypot
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(null);   // { token, url }

  const setField = (k, v) => setData((d) => ({ ...d, [k]: v }));
  const missing = REQUIRED.filter((f) => isBlank(data[f.key]));

  const submit = async () => {
    if (missing.length) {
      setErr(`Still needed: ${missing.map((f) => f.label).join(", ")}`);
      return;
    }
    setErr(""); setBusy(true);
    try {
      const res = await fetch("/api/portal/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: data, company_website: hp }),
      });
      const json = await res.json();
      if (!res.ok) { setErr(json?.error || "Something went wrong. Please try again."); setBusy(false); return; }
      setDone({ token: json.token, url: `${window.location.origin}/portal/${json.token}` });
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
              We will look at the date and get back to you. Nothing is confirmed yet, but your
              event now has a home you can keep adding to.
            </p>
          </div>
          <div className="pt-note pt-good">
            <strong>This is your private link. Save it.</strong>
            <div style={{ marginTop: 10, wordBreak: "break-all", fontSize: 13.5, fontWeight: 700, color: "#2a8ca0" }}>{done.url}</div>
            <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="pt-btn pt-btn-sm" onClick={() => navigator.clipboard?.writeText(done.url)}>Copy link</button>
              <a className="pt-btn pt-btn-2 pt-btn-sm" href={`/portal/${done.token}`} style={{ textDecoration: "none", display: "inline-block" }}>Open my event portal →</a>
            </div>
          </div>
          <div className="pt-card">
            <div className="pt-sec-ttl">What happens next</div>
            <ol style={{ margin: "14px 0 0 20px", fontSize: 14.5, lineHeight: 1.85, color: "#5f5f5c" }}>
              <li>We check the date against the calendar and email you.</li>
              <li>You fill in the rest of the portal: lineup, sound, setup, promo, whatever applies.</li>
              <li>Once the essentials are in and we have both said yes, the event goes on the calendar.</li>
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
          <FieldList fields={FIELDS} data={data} setField={setField} scope="request" />
          <label className="pt-hp" aria-hidden="true">
            Company website<input tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} />
          </label>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <button className="pt-btn" onClick={submit} disabled={busy}>
            {busy ? "Sending…" : "Send request →"}
          </button>
          <span className="pt-help" style={{ margin: 0 }}>
            {missing.length ? `${missing.length} required field${missing.length === 1 ? "" : "s"} left` : "Ready to send"}
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
