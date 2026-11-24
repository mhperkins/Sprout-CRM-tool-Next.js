"use client";
// Floating "Links to send" panel, bottom right of every CRM page.
// Holds the general links staff send people (never event-specific portal links).
// App links always use the production host, so a copy made on localhost or a
// preview deploy is still a link that works for the person who gets it.
import { useEffect, useRef, useState } from "react";

const APP = "https://sprout-crm-tool-next-js.vercel.app";

export const QUICK_LINKS = [
  { group: "Community" },
  { label: "Discord", note: "Permanent invite, never expires", url: "https://discord.gg/CH93QSDwrD" },
  { label: "Get involved", note: "General interest form", url: `${APP}/get-involved` },
  { label: "Instagram", note: "@sproutsocietyorg", url: "https://www.instagram.com/sproutsocietyorg" },
  { group: "Hosting & submissions" },
  { label: "Host an event", note: "Hosting / booking request", url: `${APP}/book` },
  { label: "Submit your work", note: "Music, art, anything: we place it in an event", url: `${APP}/submit` },
];

const CSS = `
.ql-fab { position:fixed; right:18px; bottom:18px; z-index:300; background:var(--black,#030000); color:#fff; border:none; border-radius:999px; height:42px; padding:0 16px; font:700 13px Lato,sans-serif; cursor:pointer; box-shadow:0 4px 14px rgba(0,0,0,.25); display:flex; align-items:center; gap:7px; }
.ql-fab:hover, .ql-fab.on { background:var(--cyan,#73C4D6); color:#030000; }
.ql-panel { position:fixed; right:18px; bottom:70px; z-index:300; width:340px; max-width:calc(100vw - 32px); max-height:calc(100vh - 100px); overflow-y:auto; background:#fff; color:#030000; border-radius:12px; box-shadow:0 10px 32px rgba(0,0,0,.28); font-family:Lato,sans-serif; }
.ql-head { display:flex; justify-content:space-between; align-items:center; padding:12px 14px 8px; border-bottom:1px solid #eee; position:sticky; top:0; background:#fff; }
.ql-head b { font-size:14px; }
.ql-x { background:none; border:none; font-size:18px; cursor:pointer; color:#666; line-height:1; padding:2px 6px; }
.ql-group { font-size:10px; font-weight:900; letter-spacing:1.5px; text-transform:uppercase; color:#E10098; padding:10px 14px 4px; }
.ql-row { display:flex; align-items:center; gap:8px; padding:7px 14px; }
.ql-row:hover { background:#F7F7F6; }
.ql-txt { flex:1; min-width:0; }
.ql-lbl { font-size:13px; font-weight:700; }
.ql-note { font-size:11px; color:#777; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ql-btn { border:1px solid #ddd; background:#fff; color:#030000; border-radius:6px; font:700 11px Lato,sans-serif; padding:5px 9px; cursor:pointer; white-space:nowrap; text-decoration:none; }
.ql-btn:hover { border-color:#030000; }
.ql-btn.done { background:#C6C902; border-color:#C6C902; }
.ql-foot { font-size:11px; color:#888; padding:8px 14px 12px; border-top:1px solid #eee; }
`;

export default function QuickLinks() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(null);
  const [err, setErr] = useState(null);
  const panelRef = useRef(null);
  const fabRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    const onDown = (e) => {
      if (panelRef.current?.contains(e.target) || fabRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onDown); };
  }, [open]);

  const copy = async (url) => {
    setErr(null);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      setTimeout(() => setCopied((c) => (c === url ? null : c)), 1500);
    } catch {
      setErr("Couldn't copy. Use Open and copy from the address bar.");
    }
  };

  return (
    <>
      <style>{CSS}</style>
      {open && (
        <div className="ql-panel" ref={panelRef} role="dialog" aria-label="Links to send">
          <div className="ql-head">
            <b>Links to send</b>
            <button className="ql-x" onClick={() => setOpen(false)} aria-label="Close">×</button>
          </div>
          {QUICK_LINKS.map((l, i) =>
            l.group ? (
              <div className="ql-group" key={"g" + i}>{l.group}</div>
            ) : (
              <div className="ql-row" key={l.url}>
                <div className="ql-txt">
                  <div className="ql-lbl">{l.label}</div>
                  <div className="ql-note" title={l.url}>{l.note}</div>
                </div>
                <button className={"ql-btn" + (copied === l.url ? " done" : "")} onClick={() => copy(l.url)}>
                  {copied === l.url ? "✓ Copied" : "Copy"}
                </button>
                <a className="ql-btn" href={l.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${l.label}`}>↗</a>
              </div>
            )
          )}
          <div className="ql-foot">{err || "Event portal links live on each event's page."}</div>
        </div>
      )}
      <button ref={fabRef} className={"ql-fab" + (open ? " on" : "")} onClick={() => setOpen((o) => !o)} aria-expanded={open} title="Links to send">
        🔗 Links
      </button>
    </>
  );
}
