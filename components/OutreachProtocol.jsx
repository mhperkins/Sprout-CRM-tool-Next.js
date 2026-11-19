"use client";

/**
 * OutreachProtocol.jsx — Outreach › Protocol. Run buttons that copy the phrase to paste
 * into Claude Code, and the playbook read straight from docs/guides/ig-outreach-protocol.md
 * (read-only here: Claude updates that file after each run, so this can't drift).
 */

import { useState, useEffect } from "react";
import { fetchOutreachProtocol } from "../lib/services";

const OP_STYLES = `
.op{display:flex;flex-direction:column;gap:16px;color:var(--black)}
.op-run{border:1.5px solid var(--cyan);border-radius:8px;padding:14px;background:#fff;display:flex;flex-direction:column;gap:10px}
.op-run h3,.op-pb h3{font-size:14px;font-weight:900}
.op-sub{font-size:12px;color:#5F5F57}
.op-btns{display:flex;flex-wrap:wrap;gap:8px}
.op-btn{appearance:none;font:inherit;font-size:13px;font-weight:700;cursor:pointer;border:0;border-radius:6px;padding:8px 13px;background:var(--black);color:var(--white)}
.op-btn:focus-visible{outline:2px solid var(--cyan);outline-offset:2px}
.op-pb{display:flex;flex-direction:column;gap:6px}
.op-pb details{border:1px solid #E3E3DD;border-radius:8px;background:#fff}
.op-pb summary{cursor:pointer;font-weight:700;font-size:14px;padding:10px 14px}
.op-md{padding:0 16px 14px;font-size:13.5px;line-height:1.55;max-width:80ch}
.op-md p,.op-md ul,.op-md ol,.op-md blockquote,.op-md pre,.op-md table{margin:0 0 10px}
.op-md ul,.op-md ol{padding-left:20px}
.op-md h4{font-size:13px;font-weight:900;margin:12px 0 6px}
.op-md blockquote{border-left:3px solid var(--cyan);padding:4px 12px;color:#3a3a38;background:#F4F4F0;border-radius:0 6px 6px 0}
.op-md code{font-family:Consolas,Menlo,monospace;font-size:12px;background:#F1F1EC;padding:1px 4px;border-radius:3px}
.op-md pre{background:#F1F1EC;border-radius:6px;padding:10px;overflow-x:auto;font-size:12px}
.op-md pre code{background:none;padding:0}
.op-md .tw{overflow-x:auto}
.op-md table{border-collapse:collapse;font-size:12.5px}
.op-md th,.op-md td{border:1px solid #E3E3DD;padding:5px 8px;text-align:left;vertical-align:top}
.op-md a{color:#2a8ca0;word-break:break-all}
`;

const RUNS = [
  ["① Check who responded", "Check who responded to our Instagram outreach and log it (follow docs/guides/ig-outreach-protocol.md)."],
  ["② Send the next batch", "Show me the next Instagram outreach batch to send (follow docs/guides/ig-outreach-protocol.md)."],
  ["③ Refresh the follow-backs", "Refresh the Instagram follow-backs (follow docs/guides/ig-outreach-protocol.md)."],
  ["④ Log a reply", "Log an Instagram reply from @"],
];

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inline = (s) => esc(s)
  .replace(/`([^`]+)`/g, "<code>$1</code>")
  .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
  .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
  .replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>');

/** Small markdown → HTML for the playbook (headings, lists, quotes, tables, code). */
function mdToHtml(md) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  for (let i = 0; i < lines.length;) {
    const l = lines[i];
    if (/^```/.test(l)) {
      const buf = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++; out.push(`<pre><code>${esc(buf.join("\n"))}</code></pre>`); continue;
    }
    if (/^#{3,}\s/.test(l)) { out.push(`<h4>${inline(l.replace(/^#+\s/, ""))}</h4>`); i++; continue; }
    if (/^>\s?/.test(l)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ""));
      out.push(`<blockquote>${buf.map((b) => (b.trim() ? inline(b) : "")).join("<br>")}</blockquote>`); continue;
    }
    if (/^\|/.test(l)) {
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) rows.push(lines[i++]);
      const cells = (r) => r.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const body = rows.filter((r) => !/^\|[\s:|-]+\|$/.test(r));
      const [head, ...rest] = body;
      out.push(`<div class="tw"><table><thead><tr>${cells(head).map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>${rest.map((r) => `<tr>${cells(r).map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s/.test(l)) {
      const ordered = /^\s*\d+\./.test(l);
      const buf = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s/.test(lines[i])) buf.push(lines[i++].replace(/^\s*([-*]|\d+\.)\s/, ""));
      const tag = ordered ? "ol" : "ul";
      out.push(`<${tag}>${buf.map((b) => `<li>${inline(b)}</li>`).join("")}</${tag}>`); continue;
    }
    if (!l.trim()) { i++; continue; }
    const buf = [];
    while (i < lines.length && lines[i].trim() && !/^(#|>|\||```|\s*([-*]|\d+\.)\s)/.test(lines[i])) buf.push(lines[i++]);
    out.push(`<p>${inline(buf.join(" "))}</p>`);
  }
  return out.join("");
}

/** Split the guide into its "## " sections. */
function sections(md) {
  const parts = md.replace(/\r\n/g, "\n").split(/^## /m);
  const intro = parts.shift().replace(/^# .*\n/, "").trim();
  return { intro, list: parts.map((p) => { const nl = p.indexOf("\n"); return { title: p.slice(0, nl).trim(), body: p.slice(nl + 1) }; }) };
}

export default function OutreachProtocol({ showToast }) {
  const [md, setMd] = useState(null);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    let on = true;
    fetchOutreachProtocol().then(({ data, error }) => { if (!on) return; if (error) setErr(error); else setMd(data.markdown); });
    return () => { on = false; };
  }, []);

  async function copy(label, text) {
    try { await navigator.clipboard.writeText(text); setCopied(label); showToast?.("Copied. Paste it into Claude Code."); }
    catch { showToast?.("Couldn't copy. Select the text: " + text, "err"); }
  }

  const doc = md ? sections(md) : null;

  return (
    <div className="op">
      <style>{OP_STYLES}</style>
      <div className="op-run">
        <h3>Run with Claude</h3>
        <div className="op-sub">Each button copies a phrase. Paste it into Claude Code; Claude follows the playbook below and updates it when done.</div>
        <div className="op-btns">
          {RUNS.map(([l, t]) => <button key={l} className="op-btn" onClick={() => copy(l, t)}>{l}</button>)}
        </div>
        <div className="op-sub">{copied ? `Copied "${copied.slice(2)}". Paste it into Claude Code.` : "Each session: ① before ②. ③ every week or two."}</div>
      </div>

      <div className="op-pb">
        <h3>Playbook</h3>
        <div className="op-sub">From docs/guides/ig-outreach-protocol.md · read-only here; Claude keeps it up to date.</div>
        {err && <div className="op-sub" style={{ color: "var(--fuchsia)" }}>{err}</div>}
        {!md && !err && <div className="op-sub">Loading the playbook…</div>}
        {doc && <>
          {doc.intro && <div className="op-md" style={{ padding: 0 }} dangerouslySetInnerHTML={{ __html: mdToHtml(doc.intro) }} />}
          {doc.list.map((s) => (
            <details key={s.title} open={/^status/i.test(s.title)}>
              <summary>{s.title}</summary>
              <div className="op-md" dangerouslySetInnerHTML={{ __html: mdToHtml(s.body) }} />
            </details>
          ))}
        </>}
      </div>
    </div>
  );
}
