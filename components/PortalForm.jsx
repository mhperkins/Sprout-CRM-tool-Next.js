"use client";

/**
 * PortalForm.jsx — the client-facing events portal UI.
 *
 * Shared by the public booking request page (/book) and the full portal
 * (/portal/[token]). Every field is rendered from the spec in lib/eventPortal.js,
 * so the form, the CRM viewer, and the API validation can never drift apart.
 *
 * These pages live outside AuthGate, so they carry their own styles — CRMManager's
 * stylesheet is not mounted here.
 */

import { useState, useRef, useCallback } from "react";
import { getSupabase } from "../lib/supabase";
import { isBlank } from "../lib/eventPortal";

/* ─── Styles ───────────────────────────────────────────────────────────────── */

export const PORTAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,300;0,400;0,700;0,900;1,400&display=swap');
  .pt *, .pt *::before, .pt *::after { box-sizing: border-box; margin: 0; padding: 0; }
  .pt {
    --ink:#030000; --paper:#F7F7F6; --cyan:#2a8ca0; --cyan-lt:#73C4D6;
    --fuchsia:#E10098; --acid:#C6C902; --banana:#FAD100;
    --g100:#ECECEA; --g200:#DCDCD9; --g300:#C2C2BF; --g500:#8a8a86; --g600:#5f5f5c;
    font-family:'Lato',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    color:var(--ink); background:var(--paper); min-height:100vh;
    -webkit-font-smoothing:antialiased;
  }
  .pt-wrap { max-width:760px; margin:0 auto; padding:0 20px 96px; }

  .pt-mast { background:var(--ink); padding:22px 20px; margin-bottom:0; }
  .pt-mast-in { max-width:760px; margin:0 auto; display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; }
  .pt-mast-ttl { color:#fff; font-size:15px; font-weight:900; letter-spacing:.06em; text-transform:uppercase; }
  .pt-mast-sub { color:var(--g300); font-size:12px; margin-top:2px; }
  .pt-rule { height:4px; background:var(--acid); }

  .pt-hero { padding:38px 0 26px; }
  .pt-h1 { font-size:32px; font-weight:900; line-height:1.15; letter-spacing:-.02em; }
  .pt-lead { font-size:16px; line-height:1.65; color:var(--g600); margin-top:12px; }

  .pt-card { background:#fff; border:1px solid var(--g200); border-radius:10px; padding:24px; margin-bottom:18px; box-shadow:0 2px 10px rgba(0,0,0,.045); }
  .pt-card.pt-open { border-color:var(--cyan-lt); }

  .pt-sec-hd { display:flex; align-items:flex-start; gap:14px; cursor:pointer; user-select:none; }
  .pt-num { flex:0 0 30px; height:30px; border-radius:50%; background:var(--ink); color:#fff; font-size:13px; font-weight:900; display:flex; align-items:center; justify-content:center; margin-top:1px; }
  .pt-num.pt-done { background:var(--acid); color:var(--ink); }
  .pt-sec-ttl { font-size:19px; font-weight:900; letter-spacing:-.01em; }
  .pt-sec-blurb { font-size:13.5px; color:var(--g600); margin-top:3px; line-height:1.55; }
  .pt-sec-meta { margin-left:auto; display:flex; align-items:center; gap:10px; flex-shrink:0; }
  .pt-count { font-size:11px; font-weight:700; color:var(--g500); white-space:nowrap; }
  .pt-caret { font-size:13px; color:var(--g500); }
  .pt-sec-body { margin-top:22px; padding-top:20px; border-top:1px solid var(--g100); }

  .pt-row { display:flex; gap:14px; flex-wrap:wrap; }
  .pt-row > .pt-fg { flex:1 1 220px; min-width:0; }
  .pt-fg { margin-bottom:16px; }
  .pt-lbl { display:block; font-size:12px; font-weight:700; letter-spacing:.03em; text-transform:uppercase; color:var(--g600); margin-bottom:6px; }
  .pt-req { color:var(--fuchsia); margin-left:3px; }
  .pt-help { font-size:12.5px; color:var(--g500); line-height:1.5; margin-top:5px; }

  .pt-in, .pt-sel, .pt-ta {
    width:100%; font-family:inherit; font-size:15px; color:var(--ink); background:#fff;
    border:1.5px solid var(--g200); border-radius:7px; padding:11px 12px; outline:none;
    transition:border-color .12s;
  }
  .pt-ta { line-height:1.6; resize:vertical; min-height:96px; }
  .pt-in:focus, .pt-sel:focus, .pt-ta:focus { border-color:var(--cyan); }
  .pt-in::placeholder, .pt-ta::placeholder { color:var(--g300); }
  .pt-sel { appearance:none; cursor:pointer;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8'><path d='M1 1l5 5 5-5' stroke='%235f5f5c' stroke-width='1.8' fill='none' stroke-linecap='round'/></svg>");
    background-repeat:no-repeat; background-position:right 12px center; padding-right:34px; }

  .pt-chips { display:flex; flex-wrap:wrap; gap:8px; }
  .pt-chip { font-size:13.5px; font-weight:700; padding:8px 14px; border-radius:999px; border:1.5px solid var(--g200); background:#fff; color:var(--g600); cursor:pointer; font-family:inherit; }
  .pt-chip.on { background:var(--ink); border-color:var(--ink); color:#fff; }

  .pt-check { display:flex; align-items:flex-start; gap:10px; cursor:pointer; padding:4px 0; }
  .pt-check input { width:19px; height:19px; margin-top:1px; accent-color:var(--fuchsia); flex-shrink:0; cursor:pointer; }
  .pt-check span { font-size:14.5px; line-height:1.5; }

  .pt-rep { border:1px solid var(--g200); border-radius:8px; padding:16px; margin-bottom:12px; background:var(--paper); }
  .pt-rep-hd { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
  .pt-rep-n { font-size:11px; font-weight:900; letter-spacing:.08em; text-transform:uppercase; color:var(--g500); }

  .pt-files { display:flex; flex-direction:column; gap:8px; }
  .pt-file { display:flex; align-items:center; gap:10px; background:var(--paper); border:1px solid var(--g200); border-radius:7px; padding:9px 12px; font-size:13.5px; }
  .pt-file a { color:var(--cyan); font-weight:700; text-decoration:none; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .pt-file-sz { font-size:11.5px; color:var(--g500); margin-left:auto; white-space:nowrap; }
  .pt-drop { border:2px dashed var(--g300); border-radius:8px; padding:18px; text-align:center; cursor:pointer; background:#fff; transition:border-color .12s,background .12s; }
  .pt-drop:hover { border-color:var(--cyan); background:rgba(115,196,214,.05); }
  .pt-drop-t { font-size:13.5px; font-weight:700; color:var(--cyan); }
  .pt-drop-s { font-size:12px; color:var(--g500); margin-top:3px; }

  .pt-btn { font-family:inherit; font-size:15px; font-weight:900; border-radius:7px; padding:13px 26px; border:1.5px solid var(--ink); background:var(--ink); color:#fff; cursor:pointer; }
  .pt-btn:disabled { opacity:.5; cursor:not-allowed; }
  .pt-btn-2 { background:#fff; color:var(--ink); }
  .pt-btn-sm { font-size:13px; padding:8px 15px; }
  .pt-btn-lnk { background:none; border:none; color:var(--fuchsia); font-family:inherit; font-size:13px; font-weight:700; cursor:pointer; padding:4px; }

  .pt-bar { position:sticky; bottom:0; background:rgba(255,255,255,.96); backdrop-filter:blur(6px); border-top:1px solid var(--g200); padding:14px 20px; margin-top:8px; z-index:20; }
  .pt-bar-in { max-width:760px; margin:0 auto; display:flex; align-items:center; gap:14px; flex-wrap:wrap; }
  .pt-prog { flex:1 1 180px; min-width:140px; }
  .pt-prog-t { font-size:11.5px; font-weight:700; color:var(--g600); margin-bottom:5px; }
  .pt-prog-bar { height:7px; border-radius:999px; background:var(--g100); overflow:hidden; }
  .pt-prog-fill { height:100%; background:var(--acid); border-radius:999px; transition:width .3s; }
  .pt-save { font-size:12px; font-weight:700; color:var(--g500); white-space:nowrap; }

  .pt-note { border-left:5px solid var(--cyan-lt); background:#fff; border-radius:0 8px 8px 0; padding:16px 18px; font-size:14px; line-height:1.6; margin-bottom:18px; box-shadow:0 2px 10px rgba(0,0,0,.045); }
  .pt-warn { border-left-color:var(--fuchsia); }
  .pt-good { border-left-color:var(--acid); }
  .pt-err { background:#fff; border-left:5px solid var(--fuchsia); border-radius:0 8px 8px 0; padding:14px 16px; font-size:14px; color:var(--ink); margin-bottom:16px; }

  .pt-foot { text-align:center; font-size:12px; color:var(--g500); padding:34px 20px; line-height:1.7; }
  .pt-hp { position:absolute; left:-9999px; width:1px; height:1px; overflow:hidden; }

  @media (max-width:600px) {
    .pt-h1 { font-size:26px; }
    .pt-card { padding:18px 16px; }
    .pt-row { gap:0; }
    .pt-row > .pt-fg { flex:1 1 100%; }
  }
`;

/* ─── Page frame ───────────────────────────────────────────────────────────── */

export function PortalShell({ title, subtitle, children }) {
  return (
    <div className="pt">
      <style dangerouslySetInnerHTML={{ __html: PORTAL_CSS }} />
      <div className="pt-mast">
        <div className="pt-mast-in">
          <div>
            <div className="pt-mast-ttl">Sprout Society</div>
            <div className="pt-mast-sub">{subtitle || "Events Portal"}</div>
          </div>
          {title && <div className="pt-mast-sub" style={{ maxWidth: 320, textAlign: "right" }}>{title}</div>}
        </div>
      </div>
      <div className="pt-rule" />
      {children}
      <div className="pt-foot">
        Sprout Society · Brooklyn, NY · <a href="mailto:hello@sproutsociety.org" style={{ color: "#2a8ca0", fontWeight: 700 }}>hello@sproutsociety.org</a>
        <br />
        Questions about your booking? Reply to any email from us and a human will answer.
      </div>
    </div>
  );
}

/* ─── File upload ──────────────────────────────────────────────────────────── */

const MAX_FILE = 25 * 1024 * 1024;
const prettySize = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

// Uploads go straight from the browser to Supabase Storage rather than through the
// API, because Vercel caps a serverless request body at 4.5MB and artwork/riders
// routinely exceed that. The bucket is public-read, same as newsletter-images.
async function uploadPortalFile(file, scope) {
  const sb = getSupabase();
  const ext = (file.name?.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
  const rand = Math.random().toString(36).slice(2, 8);
  const path = `${scope || "unscoped"}/${Date.now()}_${rand}.${ext}`;
  const { error } = await sb.storage
    .from("event-portal-files")
    .upload(path, file, { cacheControl: "31536000", upsert: false, contentType: file.type || undefined });
  if (error) throw new Error(error.message || "Upload failed");
  const { data } = sb.storage.from("event-portal-files").getPublicUrl(path);
  return { url: data.publicUrl, name: file.name || "file", size: file.size || 0 };
}

function FileField({ field, value, onChange, scope }) {
  const files = Array.isArray(value) ? value : [];
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const inputRef = useRef(null);

  const pick = async (list) => {
    const chosen = Array.from(list || []);
    if (!chosen.length) return;
    setErr(""); setBusy(true);
    const added = [];
    for (const f of chosen) {
      if (f.size > MAX_FILE) { setErr(`"${f.name}" is larger than 25 MB. Send us a link instead.`); continue; }
      try { added.push(await uploadPortalFile(f, scope)); }
      catch { setErr(`Could not upload "${f.name}". Please try again.`); }
    }
    setBusy(false);
    if (added.length) onChange([...files, ...added]);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div>
      {files.length > 0 && (
        <div className="pt-files" style={{ marginBottom: 10 }}>
          {files.map((f, i) => (
            <div className="pt-file" key={`${f.url}-${i}`}>
              <span>📎</span>
              <a href={f.url} target="_blank" rel="noopener noreferrer">{f.name}</a>
              <span className="pt-file-sz">{f.size ? prettySize(f.size) : ""}</span>
              <button type="button" className="pt-btn-lnk" onClick={() => onChange(files.filter((_, j) => j !== i))}>Remove</button>
            </div>
          ))}
        </div>
      )}
      <div className="pt-drop" onClick={() => !busy && inputRef.current?.click()}>
        <div className="pt-drop-t">{busy ? "Uploading…" : files.length ? "Add another file" : "Choose a file"}</div>
        <div className="pt-drop-s">Up to 25 MB each. PDF, images, documents.</div>
      </div>
      <input ref={inputRef} type="file" multiple style={{ display: "none" }} onChange={(e) => pick(e.target.files)} />
      {err && <div className="pt-help" style={{ color: "#E10098", fontWeight: 700 }}>{err}</div>}
    </div>
  );
}

/* ─── Repeat rows ──────────────────────────────────────────────────────────── */

function RepeatField({ field, value, onChange }) {
  const rows = Array.isArray(value) && value.length ? value : [{}];
  const setRow = (i, patch) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const addRow = () => onChange([...rows, {}]);
  const delRow = (i) => onChange(rows.length <= 1 ? [{}] : rows.filter((_, j) => j !== i));

  return (
    <div>
      {rows.map((row, i) => (
        <div className="pt-rep" key={i}>
          <div className="pt-rep-hd">
            <span className="pt-rep-n">{field.label} {i + 1}</span>
            {rows.length > 1 && <button type="button" className="pt-btn-lnk" onClick={() => delRow(i)}>Remove</button>}
          </div>
          {groupRows(field.itemFields || []).map((group, gi) => (
            <div className={group.length > 1 ? "pt-row" : ""} key={gi}>
              {group.map((sub) => (
                <div className="pt-fg" key={sub.key}>
                  <label className="pt-lbl">{sub.label}</label>
                  {sub.type === "textarea" ? (
                    <textarea className="pt-ta" style={{ minHeight: 68 }} value={row[sub.key] || ""} placeholder={sub.placeholder || ""} onChange={(e) => setRow(i, { [sub.key]: e.target.value })} />
                  ) : (
                    <input className="pt-in" value={row[sub.key] || ""} placeholder={sub.placeholder || ""} onChange={(e) => setRow(i, { [sub.key]: e.target.value })} />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
      <button type="button" className="pt-btn pt-btn-2 pt-btn-sm" onClick={addRow}>+ {field.addLabel || "Add another"}</button>
    </div>
  );
}

/* ─── One field ────────────────────────────────────────────────────────────── */

export function PortalField({ field, value, onChange, scope }) {
  const common = { className: "pt-in", value: value ?? "", onChange: (e) => onChange(e.target.value), placeholder: field.placeholder || "" };

  let control;
  switch (field.type) {
    case "textarea":
      control = <textarea className="pt-ta" value={value ?? ""} placeholder={field.placeholder || ""} onChange={(e) => onChange(e.target.value)} />;
      break;
    case "select":
      control = (
        <select className="pt-sel" value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">Choose one…</option>
          {(field.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
      break;
    case "multi": {
      const arr = Array.isArray(value) ? value : [];
      control = (
        <div className="pt-chips">
          {(field.options || []).map((o) => (
            <button type="button" key={o} className={`pt-chip ${arr.includes(o) ? "on" : ""}`}
              onClick={() => onChange(arr.includes(o) ? arr.filter((x) => x !== o) : [...arr, o])}>{o}</button>
          ))}
        </div>
      );
      break;
    }
    case "checkbox":
      return (
        <div className="pt-fg">
          <label className="pt-check">
            <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
            <span>{field.label}</span>
          </label>
          {field.help && <div className="pt-help" style={{ marginLeft: 29 }}>{field.help}</div>}
        </div>
      );
    case "files":
      control = <FileField field={field} value={value} onChange={onChange} scope={scope} />;
      break;
    case "repeat":
      control = <RepeatField field={field} value={value} onChange={onChange} />;
      break;
    case "number":
      control = <input type="number" min="0" {...common} />;
      break;
    case "date":
      control = <input type="date" {...common} />;
      break;
    case "time":
      control = <input type="time" {...common} />;
      break;
    case "email":
      control = <input type="email" autoComplete="email" {...common} />;
      break;
    case "tel":
      control = <input type="tel" autoComplete="tel" {...common} />;
      break;
    case "url":
      control = <input type="url" {...common} />;
      break;
    default:
      control = <input type="text" {...common} />;
  }

  return (
    <div className="pt-fg">
      <label className="pt-lbl">{field.label}{field.required && <span className="pt-req">*</span>}</label>
      {control}
      {field.help && <div className="pt-help">{field.help}</div>}
    </div>
  );
}

/* ─── Layout helper ────────────────────────────────────────────────────────── */

/** Group consecutive `half` fields into shared rows; everything else stands alone. */
export function groupRows(fields) {
  const out = [];
  let run = [];
  for (const f of fields) {
    const half = f.half && f.type !== "textarea" && f.type !== "repeat" && f.type !== "files" && f.type !== "multi" && f.type !== "checkbox";
    if (half) {
      run.push(f);
      if (run.length === 2) { out.push(run); run = []; }
    } else {
      if (run.length) { out.push(run); run = []; }
      out.push([f]);
    }
  }
  if (run.length) out.push(run);
  return out;
}

/** Render a list of fields with the half-width grouping applied. */
export function FieldList({ fields, data, setField, scope }) {
  return groupRows(fields).map((group, gi) => (
    <div className={group.length > 1 ? "pt-row" : ""} key={gi}>
      {group.map((f) => (
        <PortalField key={f.key} field={f} value={data[f.key]} onChange={(v) => setField(f.key, v)} scope={scope} />
      ))}
    </div>
  ));
}

/* ─── Debounced autosave ───────────────────────────────────────────────────── */

/** Returns [status, schedule] — status is "" | "saving" | "saved" | "error". */
export function useAutosave(save, delay = 900) {
  const [status, setStatus] = useState("");
  const timer = useRef(null);
  const latest = useRef(null);

  const schedule = useCallback((payload) => {
    latest.current = payload;
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        await save(latest.current);
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    }, delay);
  }, [save, delay]);

  return [status, schedule];
}

export { isBlank };
