"use client";

/**
 * OutreachPage.jsx — the 📣 Outreach page, built like the Impact Survey.
 *
 *   Send      one batch at a time: open the profile, Copy message, send it from Instagram,
 *             then Mark sent. Log reply and Add to CRM live on the same row.
 *   Results   counts by batch and every reply.
 *   Messages  the text Copy message uses, with a Claude rewrite.
 *
 * The CRM never sends a DM. Every button writes a dated line to the row's history and to
 * the linked contact's comm log. Add to CRM is the only move into Contacts.
 */

import { useState, useEffect, useMemo } from "react";
import {
  fetchOutreachAccounts, createOutreachAccount, updateOutreachAccount,
  fetchOutreachMessages, saveOutreachMessage, deleteOutreachMessage,
  fetchCrmRecordsByIds, findContactByHandle, saveContacts, rewriteOutreachMessage,
} from "../lib/services";
import {
  OUTREACH_STATUS, STATUS_ORDER, REACHED, RESPONDED, LOG, cleanHandle, profileUrl, matchHandle,
  nextBatch, batchStats, promoteContact, contactFromAccount, contactIdFor,
} from "../lib/outreach";
import { todayET } from "../lib/dayBoard";
import { validateContact } from "../lib/schemas";

const OT_STYLES = `
.ot{--line:#E3E3DD;--dim:#5F5F57;--warn:#8A6100;--warn-bg:#FAF0D6;--ok:#15804A;--ok-bg:#E4F3EA}
.ot-top{display:flex;gap:10px 20px;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;padding-bottom:14px;border-bottom:2px solid var(--black);margin-bottom:14px}
.ot-top h1{font-size:30px;font-weight:900;letter-spacing:-.02em;line-height:1.05}
.ot-top p{color:var(--dim);font-size:13px;margin-top:5px;max-width:62ch}
.ot-tally{font-size:13px;color:var(--dim);font-variant-numeric:tabular-nums}
.ot-bar{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:10px}
.ot-lab{font-size:11px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;color:var(--dim)}
.ot-chip{appearance:none;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;border:1.5px solid var(--line);background:#fff;color:var(--dim);border-radius:999px;padding:4px 12px;font-variant-numeric:tabular-nums}
.ot-chip[aria-pressed="true"]{background:var(--black);color:var(--white);border-color:var(--black)}
.ot-sep{width:1px;height:20px;background:var(--line);margin:0 4px}
.ot-btn{appearance:none;font:inherit;font-size:13px;font-weight:700;cursor:pointer;border:1px solid var(--black);background:var(--black);color:var(--white);border-radius:6px;padding:7px 13px}
.ot-btn:disabled{opacity:.45;cursor:default}
.ot-btn2{appearance:none;display:inline-block;text-decoration:none;font:inherit;font-size:12px;font-weight:700;cursor:pointer;border:1px solid var(--line);background:#fff;color:#030000;border-radius:6px;padding:5px 10px;white-space:nowrap}
.ot-btn2:hover{border-color:var(--black)}
.ot-btn2:disabled{opacity:.45;cursor:default}
.ot-lnk{appearance:none;background:none;border:none;padding:0;font:inherit;font-size:12px;color:#2a8ca0;text-decoration:underline;cursor:pointer}
.ot-chip:focus-visible,.ot-btn:focus-visible,.ot-btn2:focus-visible,.ot-lnk:focus-visible{outline:2px solid var(--fuchsia);outline-offset:2px}
.ot-in,.ot-ta,.ot-sel{color:#030000;color-scheme:light;font:inherit;font-size:13px;border:1px solid var(--line);border-radius:6px;padding:6px 9px;background:#fff;width:100%;min-width:0}
.ot-ta{min-height:64px;resize:vertical}
.ot-in:focus,.ot-ta:focus,.ot-sel:focus{outline:2px solid var(--cyan);outline-offset:0;border-color:var(--cyan)}
.ot-search{flex:1 1 180px;max-width:280px}
.ot-lbl{display:block;font-size:11.5px;font-weight:700;color:var(--dim);margin:0 0 3px}
.ot-tw{overflow-x:auto;background:#fff;border:1px solid var(--line);border-radius:10px}
.ot-t{border-collapse:collapse;width:100%;font-size:13px}
.ot-t th,.ot-t td{padding:9px 11px;border-bottom:1px solid var(--g100);text-align:left;vertical-align:top}
.ot-t th{font-size:11.5px;color:var(--dim);font-weight:700;white-space:nowrap}
.ot-t td small{display:block;color:var(--dim);font-size:11.5px;margin-top:2px}
.ot-num{font-variant-numeric:tabular-nums}
.ot-acts{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
.ot-tag{display:inline-block;font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;background:var(--g100);color:var(--dim);white-space:nowrap}
.ot-tag.sent{background:var(--warn-bg);color:var(--warn)}
.ot-tag.ok{background:var(--ok-bg);color:var(--ok)}
.ot-panel{background:#F4F4F0;border-radius:8px;padding:12px;display:grid;gap:10px;margin-bottom:10px;min-width:0}
.ot-two{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px}
.ot-confirm{border-left:4px solid var(--cyan);padding:6px 10px;font-size:13px;background:#fff;border-radius:0 6px 6px 0}
.ot-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:14px}
.ot-kpi{background:#fff;border:1px solid var(--line);border-radius:8px;padding:10px 12px}
.ot-kpi b{display:block;font-size:24px;font-weight:900;font-variant-numeric:tabular-nums;line-height:1.1}
.ot-kpi span{font-size:12px;color:var(--dim)}
.ot-card{background:#fff;border:1px solid var(--line);border-radius:8px;padding:10px;display:grid;gap:8px;margin-bottom:8px;min-width:0}
.ot-card .hd{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}
.ot-card .who{min-width:0;overflow-wrap:anywhere}
.ot-card small{display:block;color:var(--dim);font-size:12px}
.ot-empty{background:#fff;border:1px solid var(--line);border-radius:10px;text-align:center;padding:30px 14px;color:var(--dim);font-size:13px}
.ot-empty b{display:block;color:#030000;font-size:16px;margin-bottom:4px}
.ot-note{background:var(--warn-bg);border-left:4px solid var(--banana);border-radius:0 8px 8px 0;padding:10px 14px;font-size:13px;margin-bottom:12px}
.ot-rep{border-top:1px solid var(--g100);padding:10px 0;font-size:13px}
.ot-rep:first-child{border-top:0;padding-top:0}
.ot-pager{display:flex;gap:10px;align-items:center;justify-content:flex-end;margin-top:10px;font-size:12.5px;color:var(--dim);flex-wrap:wrap}
.ot-msg{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,2fr);gap:14px;align-items:start}
@media(max-width:760px){.ot-msg{grid-template-columns:minmax(0,1fr)}}
`;

const PAGE = 25;
const fmtWhen = (iso) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "");
const contactName = (c) => [c?.first_name, c?.last_name].filter(Boolean).join(" ").trim();

export default function OutreachPage({ contacts = [], orgs = [], events = [], showToast, openContact, onContactChanged }) {
  const [tab, setTab] = useState("send");
  const [rows, setRows] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadErr, setLoadErr] = useState("");
  const [batch, setBatch] = useState(null);
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState("");
  const [panel, setPanel] = useState(null); // { id, mode: "reply"|"add", text, status }
  const [adding, setAdding] = useState(null); // { handle, name, type, batch }
  const [activeMsg, setActiveMsg] = useState(null);
  const [narrow, setNarrow] = useState(false);
  const [msgDirty, setMsgDirty] = useState(false);

  useEffect(() => {
    let live = true;
    Promise.all([fetchOutreachAccounts(), fetchOutreachMessages()]).then(([a, m]) => {
      if (!live) return;
      if (a.error || m.error) { setLoadErr("Could not load Outreach. Refresh to try again."); return; }
      setRows(a.data); setMessages(m.data);
      setActiveMsg(m.data[0]?.id || null);
      setBatch(nextBatch(a.data));
    });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const contactById = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);
  const all = rows || [];
  const scoped = useMemo(() => (batch === "all" ? all : all.filter((r) => r.batch === batch)), [all, batch]);
  const batches = useMemo(() => batchStats(all), [all]);
  const visible = useMemo(() => {
    const s = q.trim().toLowerCase();
    return scoped
      .filter((r) => (status === "all" || r.status === status) && (!s || `${r.handle} ${r.name} ${r.type}`.toLowerCase().includes(s)))
      .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || a.batch - b.batch || a.handle.localeCompare(b.handle));
  }, [scoped, status, q]);
  const pages = Math.max(1, Math.ceil(visible.length / PAGE));
  const curPage = Math.min(page, pages - 1);
  const shown = visible.slice(curPage * PAGE, (curPage + 1) * PAGE);
  const count = (keys, list = all) => list.filter((r) => keys.includes(r.status)).length;
  const message = messages.find((m) => m.id === activeMsg) || messages[0] || null;

  /* ── writes ── */
  const patchRow = (row) => setRows((l) => (l.some((r) => r.id === row.id) ? l.map((r) => (r.id === row.id ? row : r)) : [...l, row]));

  // Saving a contact writes the whole record, so start from the database copy.
  const freshContact = async (id) => {
    const r = await fetchCrmRecordsByIds({ contactIds: [id] });
    return r.contacts[0] || null;
  };

  // Awaited, and checked first, so no button reports success on a write that didn't happen.
  const writeContact = async (rec) => {
    const { error: bad } = validateContact(rec);
    if (bad) return "That record has a problem and was not saved.";
    const { error } = await saveContacts([rec]);
    if (error) return error;
    onContactChanged?.(rec);
    return null;
  };

  // An id that is free in the database, not only on this page.
  const freeContactId = async (row) => {
    const taken = new Set(contacts.map((c) => c.id));
    for (;;) {
      const id = contactIdFor(row, taken);
      const r = await fetchCrmRecordsByIds({ contactIds: [id] });
      if (r.error) return { error: r.error };
      if (!r.contacts.length) return { id };
      taken.add(id);
    }
  };

  // One button press: update the row, its history, and the linked comm log.
  const act = async (row, patch, logText) => {
    setBusy(row.id);
    const date = todayET();
    const history = [...(row.history || []), { date, text: logText }];
    const { row: saved, error } = await updateOutreachAccount(row.id, { ...patch, history });
    if (error) { showToast?.("Could not save: " + error, "err"); setBusy(""); return null; }
    patchRow(saved);
    let logged = true;
    if (row.contact_id) {
      const rec = await freshContact(row.contact_id);
      if (rec) {
        const err = await writeContact({ ...rec, touchpoints: [...(rec.touchpoints || []), { date, summary: logText }] });
        if (err) { logged = false; showToast?.("Saved here, but their comm log did not update: " + err, "err"); }
      } else {
        // Their record was merged or deleted: drop the link so the row keeps working.
        logged = false;
        const cleared = await updateOutreachAccount(row.id, { contact_id: null });
        if (!cleared.error) patchRow(cleared.row);
        showToast?.("Saved here. Their CRM record no longer exists, so this row is unlinked.", "err");
      }
    }
    setBusy("");
    return logged ? saved : null;
  };

  const copyMessage = async () => {
    if (!message?.body?.trim()) { showToast?.("That message is blank. Write it on the Messages tab first.", "err"); return; }
    try {
      await navigator.clipboard.writeText(message.body);
      showToast?.("Message copied ✓ Paste it into Instagram, then press Mark sent.");
    } catch { showToast?.("Copy failed. Open Messages and select the text.", "err"); }
  };

  const markSent = async (row) => { if (await act(row, { status: "messaged", sent_at: new Date().toISOString() }, LOG.sent)) showToast?.("Marked sent ✓ Added to their comm log."); };
  const unmark = async (row) => { if (await act(row, { status: "to_message", sent_at: null }, LOG.unsent)) showToast?.("Marked not sent."); };
  const skip = async (row) => { if (await act(row, { status: "skip", skip_reason: "Skipped by hand" }, LOG.skip("by hand"))) showToast?.("Skipped."); };
  const unskip = async (row) => { if (await act(row, { status: row.sent_at ? "messaged" : "to_message", skip_reason: "" }, LOG.unskip)) showToast?.("Back on the list."); };

  const saveReply = async () => {
    const row = all.find((r) => r.id === panel.id);
    const text = panel.text.trim();
    if (!text) { showToast?.("Add what they said first.", "err"); return; }
    const saved = await act(row, { status: panel.status, reply: text, replied_at: row.replied_at || new Date().toISOString() }, LOG.reply(panel.status, text));
    if (saved) { setPanel(null); showToast?.("Reply saved to Results and their comm log."); }
  };

  const addToCrm = async () => {
    const row = all.find((r) => r.id === panel.id);
    setBusy(row.id);
    const date = todayET();
    // Always look in the database: they may have joined the CRM since this row was added,
    // and a retried press must find the contact the first press created.
    let rec = row.contact_id ? await freshContact(row.contact_id) : null;
    if (!rec) {
      const found = await findContactByHandle(row.handle);
      if (found.error) { showToast?.("Could not check the CRM. Nothing changed.", "err"); setBusy(""); return; }
      rec = found.contact;
    }
    let contactId, err;
    if (rec) {
      contactId = rec.id;
      err = await writeContact(promoteContact(rec, date));
    } else {
      const { id, error: idErr } = await freeContactId(row);
      if (idErr) { showToast?.("Could not check the CRM. Nothing changed.", "err"); setBusy(""); return; }
      contactId = id;
      const check = validateContact(contactFromAccount(row, id, date));
      err = check.data ? await writeContact(check.data) : "That record has a problem and was not saved.";
    }
    if (err) { showToast?.("Could not save the contact. Nothing changed: " + err, "err"); setBusy(""); return; }
    const { row: saved, error } = await updateOutreachAccount(row.id, {
      status: "added", contact_id: contactId, history: [...(row.history || []), { date, text: LOG.added }],
    });
    setBusy("");
    if (error) { showToast?.("Contact saved, but this row did not update: " + error, "err"); return; }
    patchRow(saved); setPanel(null);
    showToast?.(`${row.name || "@" + row.handle} added to Contacts ✓`);
  };

  const saveAdd = async () => {
    const handle = cleanHandle(adding.handle);
    if (!handle) { showToast?.("Enter an Instagram handle.", "err"); return; }
    if (all.some((r) => cleanHandle(r.handle) === handle)) { showToast?.("That account is already on the list.", "err"); return; }
    if (matchHandle(handle, orgs)) { showToast?.("That handle belongs to an organization. Orgs stay on Organizations.", "err"); return; }
    const known = matchHandle(handle, contacts);
    if (known && known.segment !== "prospect") { showToast?.(`${contactName(known) || "@" + handle} is already in Contacts.`, "err"); return; }
    const { row, error } = await createOutreachAccount({
      handle, name: adding.name.trim() || contactName(known), type: adding.type.trim() || "Unknown",
      batch: Number(adding.batch) || 1, follows_us: adding.follows === "" ? null : adding.follows === "yes", contact_id: known?.id || null,
      ...(adding.follows === "no" ? { status: "skip", skip_reason: "Not following us" } : {}),
    });
    if (error) { showToast?.("Could not add the account: " + error, "err"); return; }
    patchRow(row); setAdding(null);
    showToast?.(known ? "Account added and linked to their CRM record." : "Account added. No CRM contact until they respond.");
  };

  /* ── pieces ── */
  const tagFor = (r) => {
    if (r.status === "messaged") return <span className="ot-tag sent">Messaged {fmtWhen(r.sent_at)}</span>;
    if (RESPONDED.includes(r.status)) return <span className="ot-tag ok">{OUTREACH_STATUS[r.status]}</span>;
    if (r.status === "skip") return <><span className="ot-tag">Skip</span>{r.skip_reason && <small>{r.skip_reason}</small>}</>;
    return <span className="ot-tag">To message</span>;
  };

  const actions = (r) => {
    const off = busy === r.id;
    const profile = <a className="ot-btn2" href={profileUrl(r.handle)} target="_blank" rel="noopener noreferrer">Profile ↗</a>;
    if (r.status === "to_message") return <>{profile}
      <button className="ot-btn2" disabled={off} onClick={copyMessage}>Copy message</button>
      <button className="ot-btn2" disabled={off} onClick={() => markSent(r)}>Mark sent</button>
      <button className="ot-btn2" disabled={off} onClick={() => skip(r)}>Skip</button></>;
    if (r.status === "messaged") return <>{profile}
      <button className="ot-btn2" disabled={off} onClick={() => setPanel({ id: r.id, mode: "reply", text: "", status: "replied" })}>Log reply</button>
      <button className="ot-btn2" disabled={off} onClick={() => unmark(r)}>Unmark</button></>;
    if (r.status === "replied" || r.status === "interested") return <>{profile}
      <button className="ot-btn2" disabled={off} onClick={() => setPanel({ id: r.id, mode: "reply", text: r.reply, status: r.status })}>Edit reply</button>
      <button className="ot-btn2" disabled={off} onClick={() => setPanel({ id: r.id, mode: "add" })}>Add to CRM</button></>;
    if (r.status === "skip") return <>{profile}<button className="ot-btn2" disabled={off} onClick={() => unskip(r)}>Put back</button></>;
    return profile;
  };

  const crmLine = (r) => {
    const c = contactById.get(r.contact_id);
    if (c) return <button className="ot-lnk" onClick={() => openContact?.(c)}>{r.status === "added" ? "Open contact" : "In the CRM"}</button>;
    return r.contact_id ? "In the CRM" : "Not in the CRM";
  };

  const panelFor = (r) => {
    if (panel?.id !== r.id) return null;
    if (panel.mode === "add") return (
      <div className="ot-panel" style={{ margin: 0 }}>
        <div className="ot-confirm">{r.contact_id
          ? <>This moves {r.name || "@" + r.handle} from Outreach into Contacts. Their record, notes, and history stay as they are.</>
          : <>This creates a new contact for {r.name || "@" + r.handle} and keeps their reply and history.</>}</div>
        <div className="ot-bar" style={{ margin: 0 }}>
          <button className="ot-btn" disabled={busy === r.id} onClick={addToCrm}>Add to CRM</button>
          <button className="ot-btn2" onClick={() => setPanel(null)}>Cancel</button>
        </div>
      </div>
    );
    return (
      <div className="ot-panel" style={{ margin: 0 }}>
        <div><label className="ot-lbl" htmlFor="ot-rp">What they said</label>
          <textarea id="ot-rp" className="ot-ta" autoFocus placeholder="Paste or type their reply" value={panel.text} onChange={(e) => setPanel({ ...panel, text: e.target.value })} /></div>
        <div className="ot-two"><div><label className="ot-lbl" htmlFor="ot-rs">Where it stands</label>
          <select id="ot-rs" className="ot-sel" value={panel.status} onChange={(e) => setPanel({ ...panel, status: e.target.value })}>
            <option value="replied">Replied</option><option value="interested">Interested</option>
          </select></div></div>
        <div className="ot-bar" style={{ margin: 0 }}>
          <button className="ot-btn" disabled={busy === r.id} onClick={saveReply}>Save reply</button>
          <button className="ot-btn2" onClick={() => setPanel(null)}>Cancel</button>
        </div>
      </div>
    );
  };

  const list = () => {
    if (!visible.length) {
      const done = status === "all" && !q && !count(["to_message"], scoped);
      return <div className="ot-empty"><b>{done ? "This batch is finished" : "No one matches"}</b>{done ? "Pick the next batch above." : "Clear the search or pick another status."}</div>;
    }
    const pager = pages > 1 && <div className="ot-pager">
      <span>{curPage * PAGE + 1}–{Math.min((curPage + 1) * PAGE, visible.length)} of {visible.length}</span>
      <button className="ot-btn2" disabled={!curPage} onClick={() => setPage(curPage - 1)}>Prev</button>
      <button className="ot-btn2" disabled={curPage >= pages - 1} onClick={() => setPage(curPage + 1)}>Next</button>
    </div>;
    if (narrow) return <>{shown.map((r) => (
      <div className="ot-card" key={r.id}>
        <div className="hd"><div className="who"><b>@{r.handle}</b><small>{r.name || "No name"} · {r.type}</small>{r.note && <small>{r.note}</small>}</div><div>{tagFor(r)}</div></div>
        <div className="ot-bar" style={{ margin: 0 }}>{actions(r)}</div>
        {panelFor(r)}
      </div>
    ))}{pager}</>;
    return <><div className="ot-tw"><table className="ot-t">
      <thead><tr><th>Instagram</th><th>Name</th><th>Type</th><th>Batch</th><th>Status</th><th style={{ textAlign: "right" }}>Actions</th></tr></thead>
      <tbody>{shown.map((r) => [
        <tr key={r.id}>
          <td><b>@{r.handle}</b></td>
          <td>{r.name || <span style={{ color: "var(--dim)" }}>No name</span>}<small>{crmLine(r)}</small>{r.note && <small>{r.note}</small>}</td>
          <td>{r.type}</td>
          <td className="ot-num">{r.batch}</td>
          <td>{tagFor(r)}</td>
          <td><div className="ot-acts">{actions(r)}</div></td>
        </tr>,
        panel?.id === r.id && <tr key={r.id + "_p"}><td colSpan={6}>{panelFor(r)}</td></tr>,
      ])}</tbody>
    </table></div>{pager}</>;
  };

  if (loadErr) return <div className="page ot"><style>{OT_STYLES}</style><div className="ot-note">{loadErr}</div></div>;
  if (!rows) return <div className="page ot"><style>{OT_STYLES}</style><div className="ot-empty">Loading Outreach…</div></div>;

  const reached = count(REACHED);
  const heard = count(RESPONDED);
  const replies = all.filter((r) => r.reply).sort((a, b) => String(b.replied_at).localeCompare(String(a.replied_at)));

  return (
    <div className="page ot">
      <style>{OT_STYLES}</style>
      <div className="ot-top">
        <div>
          <h1>Outreach</h1>
          <p>Instagram outreach from @sproutsocietyorg. Copy the message, send it from Instagram, then mark it sent.</p>
        </div>
        <div className="ot-tally">{heard} replied · {reached} messaged · {count(["to_message"])} to message · {count(["skip"])} skipped</div>
      </div>

      <div className="ot-bar">
        {[["send", "Send"], ["results", "Results"], ["messages", `Messages${msgDirty ? " •" : ""}`]].map(([k, l]) => (
          <button key={k} className="ot-chip" aria-pressed={tab === k} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === "send" && (all.length === 0 && !adding
        ? <div className="ot-empty"><b>No accounts yet</b>Add an Instagram account to start your first batch.<br /><br />
            <button className="ot-btn" onClick={() => setAdding({ handle: "", name: "", type: "", batch: 1, follows: "yes" })}>+ Add account</button></div>
        : <>
          <div className="ot-bar">
            <span className="ot-lab">Batch</span>
            <button className="ot-chip" aria-pressed={batch === "all"} onClick={() => { setBatch("all"); setPage(0); setPanel(null); }}>All</button>
            {batches.map((b) => <button key={b.batch} className="ot-chip" aria-pressed={batch === b.batch} onClick={() => { setBatch(b.batch); setPage(0); setPanel(null); }}>{b.batch} · {b.to_message} left</button>)}
          </div>
          <div className="ot-bar">
            <button className="ot-chip" aria-pressed={status === "all"} onClick={() => { setStatus("all"); setPage(0); }}>All {scoped.length}</button>
            {STATUS_ORDER.map((s) => <button key={s} className="ot-chip" aria-pressed={status === s} onClick={() => { setStatus(s); setPage(0); }}>{OUTREACH_STATUS[s]} {count([s], scoped)}</button>)}
            <span className="ot-sep" />
            <input className="ot-in ot-search" aria-label="Search accounts" placeholder="Search handle or name" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
            <button className="ot-btn2" onClick={() => setAdding({ handle: "", name: "", type: "", batch: batch === "all" ? 1 : batch, follows: "yes" })}>+ Add account</button>
          </div>
          {messages.length > 1 && <div className="ot-bar"><label className="ot-lab" htmlFor="ot-active">Message to copy</label>
            <select id="ot-active" className="ot-sel" style={{ maxWidth: 320 }} disabled={msgDirty} title={msgDirty ? "Save your message edits first" : ""} value={message?.id || ""} onChange={(e) => setActiveMsg(e.target.value)}>
              {messages.map((m) => <option key={m.id} value={m.id}>{m.name || "Untitled message"}</option>)}
            </select></div>}
          {adding && <div className="ot-panel">
            <div className="ot-two">
              <div><label className="ot-lbl" htmlFor="ot-ad-h">Instagram handle</label><input id="ot-ad-h" className="ot-in" autoFocus placeholder="@handle" value={adding.handle} onChange={(e) => setAdding({ ...adding, handle: e.target.value })} /></div>
              <div><label className="ot-lbl" htmlFor="ot-ad-n">Name (optional)</label><input id="ot-ad-n" className="ot-in" value={adding.name} onChange={(e) => setAdding({ ...adding, name: e.target.value })} /></div>
              <div><label className="ot-lbl" htmlFor="ot-ad-t">Type</label><input id="ot-ad-t" className="ot-in" placeholder="Art, Music, Person" value={adding.type} onChange={(e) => setAdding({ ...adding, type: e.target.value })} /></div>
              <div><label className="ot-lbl" htmlFor="ot-ad-b">Batch</label><input id="ot-ad-b" className="ot-in" type="number" min="1" value={adding.batch} onChange={(e) => setAdding({ ...adding, batch: e.target.value })} /></div>
              <div><label className="ot-lbl" htmlFor="ot-ad-f">Follows us?</label><select id="ot-ad-f" className="ot-sel" value={adding.follows} onChange={(e) => setAdding({ ...adding, follows: e.target.value })}><option value="yes">Yes</option><option value="no">No</option><option value="">Not checked</option></select></div>
            </div>
            <div style={{ fontSize: 12.5, color: "var(--dim)" }}>They stay on this page until they respond. No CRM contact is created yet.</div>
            <div className="ot-bar" style={{ margin: 0 }}><button className="ot-btn" onClick={saveAdd}>Add account</button><button className="ot-btn2" onClick={() => setAdding(null)}>Cancel</button></div>
          </div>}
          {list()}
        </>)}

      {tab === "results" && <>
        <div className="ot-kpis">{[["Messaged", reached], ["Replied", heard], ["Interested", count(["interested"])], ["Added to CRM", count(["added"])], ["To message", count(["to_message"])]].map(([l, n]) => (
          <div className="ot-kpi" key={l}><b>{n}</b><span>{l}</span></div>
        ))}</div>
        <div className="ot-tw" style={{ marginBottom: 14 }}><table className="ot-t">
          <thead><tr><th>Batch</th><th>Accounts</th><th>To message</th><th>Messaged</th><th>Replied</th><th>Interested</th><th>Added</th><th>Skipped</th></tr></thead>
          <tbody>{batches.map((b) => (
            <tr key={b.batch} className="ot-num"><td><b>Outreach {b.batch}</b></td><td>{b.total}</td><td>{b.to_message}</td><td>{b.reached}</td><td>{b.heard}</td><td>{b.interested}</td><td>{b.added}</td><td>{b.skip}</td></tr>
          ))}</tbody>
        </table></div>
        <div className="ot-lab" style={{ marginBottom: 6 }}>Replies</div>
        {replies.length
          ? <div className="ot-tw" style={{ padding: 12 }}>{replies.map((r) => (
              <div className="ot-rep" key={r.id}><b>@{r.handle}</b> · {r.name || "No name"} · Outreach {r.batch} · {tagFor(r)}<div>{r.reply}</div></div>
            ))}</div>
          : <div className="ot-empty"><b>No replies yet</b>Press Log reply on a messaged account in Send, and it shows here.</div>}
      </>}

      {/* Stays mounted so unsaved edits survive a trip to the Send tab. */}
      <div hidden={tab !== "messages"}>
        <MessagesTab messages={messages} setMessages={setMessages} active={message} setActive={setActiveMsg} events={events} onDirty={setMsgDirty} showToast={showToast} />
      </div>
    </div>
  );
}

function MessagesTab({ messages, setMessages, active, setActive, events, onDirty, showToast }) {
  const [draft, setDraft] = useState(active ? { ...active } : null);
  const [ask, setAsk] = useState("");
  const [working, setWorking] = useState(false);
  const [prev, setPrev] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setDraft(active ? { ...active } : null); setPrev(null); }, [active?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = Boolean(draft && active && (draft.name !== active.name || draft.body !== active.body));
  useEffect(() => { onDirty?.(dirty); }, [dirty, onDirty]);

  // Real upcoming dates, so "invite them to the next show" never needs a guess.
  const context = useMemo(() => {
    const today = todayET();
    const next = events
      .filter((e) => e.event_date && e.event_date >= today && e.status !== "completed" && e.status !== "cancelled")
      .sort((a, b) => a.event_date.localeCompare(b.event_date)).slice(0, 6)
      .map((e) => `- ${e.name}, ${new Date(e.event_date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}${e.location ? ` at ${e.location}` : ""}`);
    return next.length ? `Upcoming Sprout Society events (real dates, use only if relevant):\n${next.join("\n")}` : "";
  }, [events]);

  const pick = (id) => {
    if (dirty) { showToast?.("Save or undo your edits first.", "err"); return; }
    setActive(id);
  };

  const save = async () => {
    if (!draft.body.trim()) { showToast?.("Write the message first.", "err"); return; }
    setSaving(true);
    const { message, error } = await saveOutreachMessage(draft);
    setSaving(false);
    if (error) { showToast?.("Could not save: " + error, "err"); return; }
    setMessages((l) => (l.some((m) => m.id === message.id) ? l.map((m) => (m.id === message.id ? message : m)) : [...l, message]));
    setDraft({ ...message }); setPrev(null);
    showToast?.("Message saved ✓ Copy message uses it now.");
  };

  const add = async () => {
    if (dirty) { showToast?.("Save or undo your edits first.", "err"); return; }
    const { message, error } = await saveOutreachMessage({ name: "New message", body: "", position: messages.length });
    if (error) { showToast?.("Could not add: " + error, "err"); return; }
    setMessages((l) => [...l, message]);
    setActive(message.id);
  };

  const remove = async () => {
    const { error } = await deleteOutreachMessage(active.id);
    if (error) { showToast?.("Could not delete: " + error, "err"); return; }
    const left = messages.filter((m) => m.id !== active.id);
    setMessages(left);
    setActive(left[0]?.id || null);
  };

  const rewrite = async () => {
    if (!ask.trim()) { showToast?.("Tell Claude what to change.", "err"); return; }
    setWorking(true);
    const { text, error } = await rewriteOutreachMessage(draft.body, ask.trim(), context);
    setWorking(false);
    if (error) { showToast?.(error, "err"); return; }
    setPrev(draft.body);
    setDraft((d) => (d?.id === draft.id ? { ...d, body: text } : d));
    setAsk("");
  };

  if (!draft) return <div className="ot-empty"><b>No messages yet</b>Add the message Copy message should use.<br /><br /><button className="ot-btn" onClick={add}>+ Add a message</button></div>;

  return (
    <div className="ot-msg">
      <div>
        {messages.length > 1 && <div className="ot-bar">{messages.map((m) => <button key={m.id} className="ot-chip" aria-pressed={m.id === active?.id} onClick={() => pick(m.id)}>{m.name || "Untitled"}</button>)}</div>}
        <label className="ot-lbl" htmlFor="ot-m-name">Message name</label>
        <input id="ot-m-name" className="ot-in" style={{ marginBottom: 10 }} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        <label className="ot-lbl" htmlFor="ot-m-body">Message</label>
        <textarea id="ot-m-body" className="ot-ta" style={{ minHeight: 320 }} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
        <div className="ot-bar" style={{ marginTop: 10 }}>
          <button className="ot-btn" disabled={saving || !dirty} onClick={save}>{saving ? "Saving…" : "Save message"}</button>
          <button className="ot-btn2" onClick={add}>+ Add a message</button>
          {messages.length > 1 && <button className="ot-btn2" onClick={remove}>Delete this message</button>}
        </div>
      </div>
      <div className="ot-panel">
        <div><label className="ot-lbl" htmlFor="ot-m-ai">Ask Claude to rewrite it</label>
          <input id="ot-m-ai" className="ot-in" placeholder="Make it shorter, or invite them to the next show" value={ask} onChange={(e) => setAsk(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") rewrite(); }} /></div>
        <div className="ot-bar" style={{ margin: 0 }}>
          <button className="ot-btn2" disabled={working} onClick={rewrite}>{working ? "Rewriting…" : "Rewrite"}</button>
          {prev != null && <button className="ot-btn2" onClick={() => { setDraft({ ...draft, body: prev }); setPrev(null); }}>↶ Undo</button>}
        </div>
        <div style={{ fontSize: 12.5, color: "var(--dim)" }}>The rewrite lands in the message box. Nothing changes until you press Save message.</div>
      </div>
    </div>
  );
}
