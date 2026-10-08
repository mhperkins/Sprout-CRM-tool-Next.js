"use client";

/**
 * SurveyForm.jsx — the impact survey at /survey/[token].
 *
 * Renders whatever questions staff set up in the CRM (lib/surveyForm.js lists the
 * types). One link per person: reopening it shows their answers to change.
 * `preview` renders a survey without a token (the CRM's Preview button) and never sends.
 */

import { useState, useEffect } from "react";
import { PortalShell } from "./PortalForm";
import { SHARE_OPTS, eventLabel } from "../lib/surveyForm";

const FOOT = "Questions about this survey? Email us and a human will answer.";

const EXTRA_CSS = `
.sv-q{margin-bottom:24px}
.sv-body{margin:0;padding:0;border:0}
.sv-q > .pt-lbl{text-transform:none;letter-spacing:0;font-size:15.5px;font-weight:900;color:#030000;line-height:1.35;margin-bottom:4px}
.sv-q > .pt-help{margin:0 0 8px}
.sv-q:last-child{margin-bottom:0}
.sv-num-row{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:4px 0}
.sv-num-row span{flex:1 1 160px;min-width:0;font-size:14px}
.sv-num{width:96px;text-align:right}
.sv-rate{display:grid;gap:10px}
.sv-rate-row{display:grid;gap:6px}
.sv-rate-row span{font-size:14px}
.sv-sub{font-size:13.5px;font-weight:700;margin:12px 0 6px}
`;

export default function SurveyForm({ token, preview }) {
  const [loading, setLoading] = useState(!preview);
  const [fatal, setFatal] = useState("");
  const [survey, setSurvey] = useState(preview?.survey || null);
  const [name, setName] = useState(preview?.name || "");
  const [events, setEvents] = useState(preview?.events || []);
  const [answers, setAnswers] = useState({});
  const [replied, setReplied] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (preview) { setSurvey(preview.survey); setName(preview.name || ""); setEvents(preview.events || []); return; }
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/survey/${token}`);
        const json = await res.json();
        if (!alive) return;
        if (!res.ok) { setFatal(json?.error || "This link is not valid."); setLoading(false); return; }
        setSurvey(json.survey); setName(json.name); setEvents(json.events || []);
        setAnswers(json.answers || {}); setReplied(json.replied); setLoading(false);
      } catch {
        if (alive) { setFatal("We could not load the survey. Please refresh and try again."); setLoading(false); }
      }
    })();
    return () => { alive = false; };
  }, [token, preview]);

  const set = (id, v) => setAnswers((a) => {
    const n = { ...a };
    if (v == null || v === "" || (Array.isArray(v) && !v.length)) delete n[id]; else n[id] = v;
    return n;
  });
  const top = () => { try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch { /* old browsers */ } };

  const send = async () => {
    setErr("");
    if (preview) { setErr("This is a preview, so nothing was sent."); return; }
    setBusy(true);
    try {
      const res = await fetch(`/api/survey/${token}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Something went wrong. Please try again.");
      setReplied(true); setDone(true); top();
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  const first = (name || "").split(" ")[0];

  if (loading) return <PortalShell subtitle="A few questions" footNote={FOOT}><div className="pt-wrap"><div className="pt-hero"><div className="pt-lead">Loading…</div></div></div></PortalShell>;

  if (fatal) {
    return (
      <PortalShell subtitle="A few questions" footNote={FOOT}>
        <div className="pt-wrap">
          <div className="pt-hero"><div className="pt-h1">This link did not work</div><p className="pt-lead">{fatal}</p></div>
          <div className="pt-note">Email <a href="mailto:hello@sproutsociety.org" style={{ color: "#2a8ca0", fontWeight: 700 }}>hello@sproutsociety.org</a> and we will send a fresh link.</div>
        </div>
      </PortalShell>
    );
  }

  if (done) {
    return (
      <PortalShell subtitle="A few questions" footNote={FOOT}>
        <div className="pt-wrap">
          <div className="pt-hero"><div className="pt-h1">Thank you{first ? `, ${first}` : ""}.</div><p className="pt-lead">{survey.thanks}</p></div>
          <button className="pt-btn pt-btn-2" onClick={() => { setDone(false); top(); }}>Change my answers</button>
        </div>
      </PortalShell>
    );
  }

  const chips = (q, value, onPick, multi) => (
    <div className="pt-chips">
      {q.options.map((o) => {
        const on = multi ? (value || []).includes(o) : value === o;
        return <button type="button" key={o} className={`pt-chip ${on ? "on" : ""}`} aria-pressed={on}
          onClick={() => onPick(o, on)}>{o}</button>;
      })}
    </div>
  );

  const field = (q, i) => {
    const v = answers[q.id];
    const label = <label className="pt-lbl" htmlFor={`sv_${q.id}`}>{i + 1}. {q.label}</label>;
    const hint = q.hint ? <div className="pt-help">{q.hint}</div> : null;
    if (q.type === "event_count") {
      if (!events.length) return null;
      return <div className="sv-q" key={q.id}>{label}{hint}
        {events.map((ev) => (
          <div className="sv-num-row" key={ev.id}>
            <span>{eventLabel(ev)}</span>
            <input className="pt-in sv-num" inputMode="numeric" aria-label={`${q.label} ${eventLabel(ev)}`} id={`sv_${q.id}_${ev.id}`}
              value={v?.[ev.id] ?? ""} placeholder="—"
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, "");
                const m = { ...(v || {}) };
                if (raw === "") delete m[ev.id]; else m[ev.id] = Number(raw);
                set(q.id, Object.keys(m).length ? m : null);
              }} />
          </div>
        ))}</div>;
    }
    if (q.type === "single") return <div className="sv-q" key={q.id}>{label}{hint}{chips(q, v, (o, on) => set(q.id, on ? null : o))}</div>;
    if (q.type === "multi") return <div className="sv-q" key={q.id}>{label}{hint}{chips(q, v, (o, on) => set(q.id, on ? (v || []).filter((x) => x !== o) : [...(v || []), o]), true)}</div>;
    if (q.type === "scale") {
      const sq = { ...q, options: ["1", "2", "3", "4", "5"] };
      return <div className="sv-q" key={q.id}>{label}{hint}{chips(sq, v != null ? String(v) : null, (o, on) => set(q.id, on ? null : Number(o)))}</div>;
    }
    if (q.type === "rating_rows") {
      return <div className="sv-q" key={q.id}>{label}{hint}
        <div className="sv-rate">{q.rows.map((row, ri) => (
          <div className="sv-rate-row" key={ri}><span>{row}</span>
            {chips(q, v?.[ri], (o, on) => {
              const m = { ...(v || {}) };
              if (on) delete m[ri]; else m[ri] = o;
              set(q.id, Object.keys(m).length ? m : null);
            })}
          </div>
        ))}</div></div>;
    }
    if (q.type === "text") {
      return <div className="sv-q" key={q.id}>{label}{hint}
        <textarea className="pt-ta" id={`sv_${q.id}`} value={v || ""} onChange={(e) => set(q.id, e.target.value)} /></div>;
    }
    if (q.type === "testimonial") {
      const t = v || {};
      const put = (patch) => { const n = { ...t, ...patch }; set(q.id, n.text || n.share ? n : null); };
      return <div className="sv-q" key={q.id}>{label}{hint}
        <textarea className="pt-ta" id={`sv_${q.id}`} value={t.text || ""} placeholder="A sentence or two is plenty." onChange={(e) => put({ text: e.target.value })} />
        {(t.text || "").trim() && <>
          <div className="sv-sub">Can we share what you wrote?</div>
          <div className="pt-chips">{SHARE_OPTS.map(([k, l]) => (
            <button type="button" key={k} className={`pt-chip ${t.share === k ? "on" : ""}`} aria-pressed={t.share === k} onClick={() => put({ share: k })}>{l}</button>
          ))}</div>
          {t.share === "name" && <>
            <label className="pt-lbl" htmlFor={`sv_${q.id}_credit`} style={{ marginTop: 10 }}>Credit me as</label>
            <input className="pt-in" id={`sv_${q.id}_credit`} value={t.credit ?? ""} placeholder={name || "Your name, and your group if you like"}
              onChange={(e) => put({ credit: e.target.value })} />
          </>}
        </>}
      </div>;
    }
    return null;
  };

  return (
    <PortalShell subtitle="A few questions" footNote={FOOT}>
      <style>{EXTRA_CSS}</style>
      <div className="pt-wrap">
        <div className="pt-hero">
          <div className="pt-h1">{survey.title}</div>
          {(name || events.length > 0) && (
            <p className="pt-lead" style={{ fontWeight: 700, color: "#030000" }}>
              {name ? `For ${name}` : ""}{name && events.length ? " · " : ""}{events.length === 1 ? eventLabel(events[0]) : events.length > 1 ? `${events.length} nights at Sprout` : ""}
            </p>
          )}
          {survey.intro && <p className="pt-lead" style={{ marginTop: 8 }}>{survey.intro}</p>}
        </div>

        {replied && <div className="pt-note">You already sent answers. Change anything below and send again.</div>}

        <div className="pt-card"><div className="sv-body">{survey.questions.map(field)}</div></div>

        {err && <div className="pt-err">{err}</div>}
        <button className="pt-btn" onClick={send} disabled={busy}>{busy ? "Sending…" : replied ? "Save my changes" : "Send my answers"}</button>
      </div>
    </PortalShell>
  );
}
