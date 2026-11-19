"use client";

/**
 * InboxEmail.jsx — Inbox › Email. Both Gmail inboxes (real people only) plus Instagram
 * outreach replies that were logged on the Outreach page, one entry per person.
 *
 * Pin / Completed / Ignore are saved in the CRM (sprout_inbox_triage) and never touch
 * Gmail. Completed comes back on its own when the person writes again; Ignore hides that
 * one thread for good; a thread waiting on them for 14 quiet days counts as Completed.
 * The 9am "Waiting on you" email follows the same marks.
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { fetchInboxThreads, setInboxMark } from "../lib/services";

const IB_STYLES = `
.ib{--line:#E3E3DD;--dim:#5F5F57;--sunk:#F4F4F0}
.ib-hd{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:baseline;justify-content:space-between;margin-bottom:12px}
.ib-hd h1{font-size:23px;font-weight:900;letter-spacing:-.01em}
.ib-meta{font-size:12px;color:var(--dim);display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.ib-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px}
.ib-chip{appearance:none;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;border:1.5px solid var(--line);background:#fff;color:var(--dim);border-radius:999px;padding:5px 12px}
.ib-chip.on{background:var(--cyan);border-color:var(--cyan);color:var(--black)}
.ib-chip .n{opacity:.7;margin-left:5px;font-variant-numeric:tabular-nums}
.ib-list{display:flex;flex-direction:column;gap:8px}
.ib-row{display:flex;flex-wrap:wrap;gap:10px 14px;background:#fff;border:1px solid var(--line);border-radius:8px;padding:11px 13px;color:var(--black)}
.ib-row.pinned{border-color:var(--cyan);box-shadow:inset 4px 0 0 var(--cyan)}
.ib-row.muted{opacity:.62}
.ib-l{flex:1 1 380px;min-width:0;display:flex;flex-direction:column;gap:3px}
.ib-top{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.ib-who{font-weight:900;font-size:14px}
.ib-tag{font-size:11px;padding:1px 8px;border-radius:999px;background:var(--sunk);color:var(--dim)}
.ib-tag.ig{background:#FBE6F1;color:#B3005F}
.ib-pin{font-size:11px;font-weight:700}
.ib-age{font-size:12px;color:var(--dim);margin-left:auto}
.ib-line{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ib-subj{font-weight:700}.ib-snip{color:var(--dim)}
.ib-crm{font-size:12px;color:var(--dim)}
.ib-crm button{appearance:none;font:inherit;border:0;background:none;padding:0;color:#2a8ca0;font-weight:700;cursor:pointer}
.ib-crm .no{color:var(--fuchsia);font-weight:700}
.ib-a{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.ib-btn{appearance:none;font:inherit;font-size:12px;font-weight:700;cursor:pointer;border:1.5px solid var(--line);background:#fff;color:#2c2c26;border-radius:6px;padding:5px 10px;white-space:nowrap}
.ib-btn:hover{border-color:var(--dim)}
.ib-btn.pri{background:var(--black);color:var(--white);border-color:var(--black)}
.ib-btn:disabled{opacity:.5;cursor:not-allowed}
.ib-btn:focus-visible,.ib-chip:focus-visible{outline:2px solid var(--cyan);outline-offset:2px}
.ib-link{font-size:12px;color:var(--dim);text-decoration:underline;background:none;border:0;cursor:pointer;font:inherit;padding:0}
.ib-empty{border:1.5px dashed var(--line);border-radius:8px;padding:24px;text-align:center;color:var(--dim);font-size:13px;background:#fff}
.ib-empty b{display:block;color:var(--black);font-size:14px;margin-bottom:4px}
`;

const FILTERS = [
  ["you", "Waiting on you"],
  ["them", "Waiting on them"],
  ["pinned", "Pinned"],
  ["done", "Completed"],
  ["ignored", "Ignored"],
];
const EMPTY = {
  you: ["All caught up", "Nobody is waiting on a reply. Receipts, newsletters and notifications never show here."],
  them: ["Nothing waiting on them", "Threads you've answered show here until they write back, or for 14 days."],
  pinned: ["Nothing pinned", "Pin a thread to keep it at the top of Waiting on you."],
  done: ["Nothing completed", "Threads you mark Completed land here. They come back if the person writes again."],
  ignored: ["Nothing ignored", "Ignored threads stay hidden, even if they write again."],
};

const keyOf = (it) => (it.source === "instagram" ? `ig:${it.igId}` : `${it.account}:${it.threadId}`);
const live = (it) => it.state === "open" || it.state === "pinned";
function inFilter(it, f) {
  if (f === "pinned") return it.state === "pinned";
  if (f === "done" || f === "ignored") return it.state === f;
  return live(it) && it.dir === f;
}
function ago(ms) {
  const d = Math.floor((Date.now() - ms) / 86400000);
  if (d <= 0) { const h = Math.floor((Date.now() - ms) / 3600000); return h <= 1 ? "just now" : `${h} hours`; }
  return d === 1 ? "1 day" : `${d} days`;
}
const monthDay = (iso) => (iso ? new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "");

export default function InboxEmail({ openContact, setView, showToast, onCount }) {
  const [items, setItems] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkedAt, setCheckedAt] = useState(null);
  const [filter, setFilter] = useState("you");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    const { data, error } = await fetchInboxThreads();
    setLoading(false);
    if (error) { setErr(error); return; }
    setItems(data.items || []);
    setCheckedAt(data.checkedAt);
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (items) onCount?.(items.filter((it) => live(it) && it.dir === "you").length);
  }, [items, onCount]);

  const counts = useMemo(() => Object.fromEntries(FILTERS.map(([k]) => [k, (items || []).filter((it) => inFilter(it, k)).length])), [items]);
  const shown = useMemo(() => {
    const l = (items || []).filter((it) => inFilter(it, filter));
    if (filter === "you" || filter === "them") l.sort((a, b) => (b.state === "pinned") - (a.state === "pinned") || a.lastAt - b.lastAt);
    return l;
  }, [items, filter]);

  async function mark(it, status) {
    const k = keyOf(it);
    setBusy(k);
    const { error } = await setInboxMark(k, status);
    setBusy("");
    if (error) { showToast?.("Couldn't save: " + error, "err"); return; }
    setItems((l) => l.map((x) => (keyOf(x) === k ? { ...x, state: status || "open", auto: false } : x)));
    showToast?.(status === "pinned" ? "Pinned" : status === "done" ? "Marked completed" : status === "ignored" ? "Ignored" : "Moved back");
  }

  const who = (it) => it.crm?.name || it.name || it.email;
  const inboxLabel = (it) => (it.source === "instagram" ? "Instagram" : it.account.split("@")[0] + "@");

  return (
    <div className="ib">
      <style>{IB_STYLES}</style>
      <div className="ib-hd">
        <h1>Email</h1>
        <div className="ib-meta">
          <span>hello@ + maxperkins@ + Instagram replies · last 30 days</span>
          {checkedAt && <span>· checked {new Date(checkedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>}
          <button className="ib-btn" onClick={load} disabled={loading}>{loading ? "Checking…" : "↻ Check again"}</button>
        </div>
      </div>

      {err && <div className="ib-empty" style={{ marginBottom: 12 }}><b>Couldn't check the inboxes</b>{err}</div>}

      {!items && !err && <div className="ib-empty"><b>Checking both inboxes…</b>This takes a few seconds.</div>}

      {items && (
        <>
          <div className="ib-chips" role="tablist">
            {FILTERS.map(([k, l]) => (
              <button key={k} role="tab" aria-selected={filter === k} className={`ib-chip ${filter === k ? "on" : ""}`} onClick={() => setFilter(k)}>
                {l}<span className="n">{counts[k]}</span>
              </button>
            ))}
          </div>

          {!shown.length ? (
            <div className="ib-empty"><b>{EMPTY[filter][0]}</b>{EMPTY[filter][1]}</div>
          ) : (
            <div className="ib-list">
              {shown.map((it) => {
                const k = keyOf(it);
                const snip = String(it.snippet || "").replace(/\s+/g, " ").trim();
                return (
                  <div key={k} className={`ib-row ${it.state === "pinned" ? "pinned" : ""} ${it.state === "done" || it.state === "ignored" ? "muted" : ""}`}>
                    <div className="ib-l">
                      <div className="ib-top">
                        <span className="ib-who">{who(it)}</span>
                        <span className={`ib-tag ${it.source === "instagram" ? "ig" : ""}`}>{inboxLabel(it)}</span>
                        {it.kind === "form" && <span className="ib-tag">website form</span>}
                        {it.state === "pinned" && <span className="ib-pin">📌 Pinned</span>}
                        <span className="ib-age">
                          {it.state === "done" && it.auto ? "quiet 14+ days" : it.dir === "you" ? "waiting on you" : it.answeredElsewhere ? "you replied in another email" : "you replied"} · {ago(it.lastAt)}
                        </span>
                      </div>
                      <div className="ib-line"><span className="ib-subj">{it.subject}</span>{snip && <span className="ib-snip"> · {snip}</span>}</div>
                      <div className="ib-crm">
                        {it.crm ? (
                          <><button onClick={() => openContact?.({ id: it.crm.id })}>In CRM</button>{it.crm.nextActionDate ? ` · next action ${monthDay(it.crm.nextActionDate)}` : " · no next action"}</>
                        ) : <span className="no">Not in CRM</span>}
                        {it.source === "email" && it.email && <> · {it.email}</>}
                      </div>
                    </div>
                    <div className="ib-a">
                      {it.state === "done" || it.state === "ignored" ? (
                        it.auto
                          ? <button className="ib-btn" disabled={busy === k} onClick={() => mark(it, "pinned")}>📌 Pin to keep</button>
                          : <button className="ib-btn" disabled={busy === k} onClick={() => mark(it, null)}>↩ Move back</button>
                      ) : (
                        <>
                          <button className="ib-btn" disabled={busy === k} onClick={() => mark(it, it.state === "pinned" ? null : "pinned")}>{it.state === "pinned" ? "Unpin" : "📌 Pin"}</button>
                          <button className="ib-btn pri" disabled={busy === k} onClick={() => mark(it, "done")}>✓ Completed</button>
                          <button className="ib-btn" disabled={busy === k} onClick={() => mark(it, "ignored")}>Ignore</button>
                        </>
                      )}
                      {it.source === "instagram"
                        ? <button className="ib-link" onClick={() => setView?.("outreach")}>Open on Outreach →</button>
                        : <a className="ib-link" href={it.url} target="_blank" rel="noopener noreferrer">Open in Gmail ↗</a>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
