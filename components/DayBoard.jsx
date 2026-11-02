"use client";

// The Day Board: a checklist of what needs doing beside what's on the Sprout calendar.
//
// The checklist is open CRM follow-ups plus anything added by hand, oldest first. The
// calendar side is read straight from Google, so it matches the Sprout calendar exactly.
// Max's own calendar comes down with it but stays hidden until he turns it on.
//
// Settled with Max: a completed task STAYS on the list, struck through, with Undo, for the
// rest of the day (never hide or animate it away). Every button writes to the comm log.

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  todayET, addDays, weekStartOf, shortDay, monthDay, weekdayLong, clock, newTaskId, daysLate,
  crmOpenActions, syncPlan, completeCrmAction, reopenCrmAction, moveCrmAction, contactName, recordOfKey,
} from "../lib/dayBoard";
import {
  fetchBoardTasks, fetchTaskActionKeys, insertTasks, updateTask, closeTasks,
  fetchDayBoardCalendar, fetchCrmRecordsByIds, saveContacts, saveOrgs,
} from "../lib/services";
import { validateContact, validateOrg } from "../lib/schemas";

const DB_STYLES = `
.db{--line:#E3E3DD;--soft:#EFEFEA;--sunk:#F1F1EC;--dim:#5F5F57;--ok:#15804A;--ok-bg:#E4F3EA;--crit:#B3005F;--warn:#8A6100;--warn-bg:#FAF0D6}
.db-top{display:flex;gap:8px 20px;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;padding-bottom:14px;border-bottom:2px solid var(--black);margin-bottom:16px}
.db-top h1{font-size:30px;font-weight:900;letter-spacing:-.02em;line-height:1.05}
.db-tally{font-size:13px;color:var(--dim);font-variant-numeric:tabular-nums}
.db-cols{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,2fr);gap:20px;align-items:start}
@media(max-width:860px){.db-cols{grid-template-columns:minmax(0,1fr)}}
.db-card{background:#fff;border:1px solid var(--line);border-radius:10px;padding:14px;min-width:0}
.db-hd{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px}
.db-hd h2{font-size:15px;font-weight:900}
.db-btn{appearance:none;font:inherit;font-size:13px;font-weight:700;cursor:pointer;border:1px solid var(--black);background:var(--black);color:var(--white);border-radius:6px;padding:7px 13px;white-space:nowrap}
.db-btn:disabled{opacity:.45;cursor:default}
.db-btn2{appearance:none;font:inherit;font-size:12px;font-weight:700;cursor:pointer;border:1px solid var(--line);background:#fff;color:#030000;border-radius:6px;padding:5px 10px;white-space:nowrap}
.db-btn2:hover{border-color:var(--black)}
.db-btn2:disabled{opacity:.45;cursor:default}
.db-btn2.done{background:var(--ok-bg);color:var(--ok);border-color:var(--ok)}
.db-lnk{appearance:none;background:none;border:0;padding:0;font:inherit;font-size:12px;font-weight:700;color:#2a8ca0;text-decoration:underline;cursor:pointer}
.db-btn:focus-visible,.db-btn2:focus-visible,.db-lnk:focus-visible{outline:2px solid var(--fuchsia);outline-offset:2px}
.db-in{color:#030000;color-scheme:light;font:inherit;font-size:13px;border:1px solid var(--line);border-radius:6px;padding:6px 9px;background:#fff;width:100%;min-width:0}
.db-in:focus{outline:2px solid var(--cyan);outline-offset:0;border-color:var(--cyan)}
.db-add{display:flex;gap:6px;margin-bottom:8px}
.db-task{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:start;padding:9px 0;border-top:1px solid var(--soft)}
.db-add + .db-task{border-top:0}
.db-t{min-width:0;overflow-wrap:anywhere;font-size:13.5px}
.db-task.isdone .db-txt{text-decoration:line-through;color:var(--dim)}
.db-t small{display:block;color:var(--dim);font-size:12px;margin-top:1px}
.db-late{color:var(--crit);font-weight:700}
.db-move{grid-column:2 / -1;display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.db-move input{max-width:170px}
.db-day{font-size:11.5px;font-weight:900;letter-spacing:.05em;text-transform:uppercase;color:var(--dim);padding:10px 0 3px}
.db-ev{display:grid;grid-template-columns:104px minmax(0,1fr);gap:8px;padding:4px 0;font-size:13px}
.db-ev .tm{color:var(--dim);font-variant-numeric:tabular-nums}
.db-ev span{overflow-wrap:anywhere}
.db-ev.mine{background:var(--sunk);border-radius:4px;padding-inline:6px}
.db-switch{display:inline-flex;gap:6px;align-items:center;font-size:12.5px;font-weight:700;cursor:pointer}
.db-empty{text-align:center;padding:26px 12px;color:var(--dim);font-size:13px}
.db-empty b{display:block;color:#030000;font-size:15px;margin-bottom:4px}
.db-warn{background:var(--warn-bg);color:var(--warn);border-radius:6px;padding:8px 10px;font-size:12.5px;margin-bottom:10px;display:flex;gap:10px;justify-content:space-between;align-items:center;flex-wrap:wrap}
`;

const FIRST = 10;
const WINDOW_DAYS = 14;

const evTime = (e) => (e.allDay ? "All day" : `${clock(e.start)}–${clock(e.end)}`);

export default function DayBoard({ contacts, orgs, onContactChanged, onOrgChanged, openContact, setView, showToast }) {
  const [today, setToday] = useState(() => todayET());
  const [tasks, setTasks] = useState(null);
  const [taskErr, setTaskErr] = useState("");
  const [cal, setCal] = useState({ events: [], loading: true, error: "" });
  const [showMine, setShowMine] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [moving, setMoving] = useState(null); // { id, date }
  const [adding, setAdding] = useState("");
  const [busy, setBusy] = useState("");
  const [synced, setSynced] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await fetchBoardTasks(todayET());
    if (error) setTaskErr(error); else { setTaskErr(""); setTasks(data); }
  }, []);

  const loadCal = useCallback(async () => {
    const from = todayET();
    setCal((c) => ({ ...c, loading: true, error: "" }));
    const { data, error } = await fetchDayBoardCalendar(from, addDays(from, WINDOW_DAYS - 1));
    setCal({ events: data, loading: false, error: error || "" });
  }, []);

  useEffect(() => { load(); loadCal(); }, [load, loadCal]);

  // Midnight in New York: yesterday's finished tasks drop off and the calendar moves on.
  useEffect(() => {
    const id = setInterval(() => {
      const t = todayET();
      setToday((old) => { if (t !== old) { load(); loadCal(); } return t; });
    }, 60000);
    return () => clearInterval(id);
  }, [load, loadCal]);

  // Mirror CRM follow-ups onto the list, once per load.
  useEffect(() => {
    if (synced || !contacts.length || !tasks) return;
    setSynced(true);
    (async () => {
      const { data: existing, error } = await fetchTaskActionKeys();
      if (error) { console.warn("day board sync:", error); return; }
      const args = { existing, weekStart: weekStartOf(today) };
      let plan = syncPlan({ ...args, actions: crmOpenActions(contacts, orgs) });

      // The page's CRM copy may be older than the database. Re-read every record this sync
      // would touch, then plan again from the fresh copies.
      const byId = new Map(existing.map((t) => [t.id, t]));
      const keys = [...plan.inserts.map((r) => r.action_key), ...plan.updates.map((u) => byId.get(u.id).action_key), ...plan.closeIds.map((id) => byId.get(id).action_key)];
      if (keys.length) {
        const cIds = new Set(), oIds = new Set();
        keys.forEach((k) => { const r = recordOfKey(k); if (r.orgId) oIds.add(r.orgId); else cIds.add(r.contactId); });
        const fresh = await fetchCrmRecordsByIds({ contactIds: [...cIds], orgIds: [...oIds] });
        if (fresh.error) { console.warn("day board sync:", fresh.error); return; }
        plan = syncPlan({
          ...args,
          actions: crmOpenActions(
            contacts.filter((c) => !cIds.has(c.id)).concat(fresh.contacts),
            orgs.filter((o) => !oIds.has(o.id)).concat(fresh.orgs),
          ),
        });
      }

      const errors = [];
      const r1 = await insertTasks(plan.inserts); if (r1.error) errors.push(r1.error);
      for (const u of plan.updates) { const r = await updateTask(u.id, u.patch); if (r.error) errors.push(r.error); }
      const r2 = await closeTasks(plan.closeIds); if (r2.error) errors.push(r2.error);
      if (errors.length) console.warn("day board sync:", errors.join("; "));
      if (plan.inserts.length || plan.updates.length || plan.closeIds.length) load();
    })();
  }, [contacts, orgs, tasks, synced, today, load]);

  const contactById = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);
  const orgById = useMemo(() => new Map(orgs.map((o) => [o.id, o])), [orgs]);
  const whoOf = (t) => (t.contact_id ? contactById.get(t.contact_id) && contactName(contactById.get(t.contact_id)) : t.org_id ? orgById.get(t.org_id)?.name : "") || "";

  /* ── writes ── */
  const crmLinked = (t) => t.kind === "follow_up" && t.action_key && (t.contact_id || t.org_id);

  // Saving writes the whole record, so start from the database copy, not the page's.
  const freshRecord = async (t) => {
    const r = await fetchCrmRecordsByIds({ contactIds: t.contact_id ? [t.contact_id] : [], orgIds: t.org_id ? [t.org_id] : [] });
    return (t.contact_id ? r.contacts[0] : r.orgs[0]) || null;
  };

  // Awaited and checked first, so no button reports success on a write that didn't happen.
  const writeCrm = async (t, rec) => {
    const { error: bad } = t.contact_id ? validateContact(rec) : validateOrg(rec);
    if (bad) return "That record has a problem and was not saved.";
    const { error } = t.contact_id ? await saveContacts([rec]) : await saveOrgs([rec]);
    if (error) return error;
    if (t.contact_id) onContactChanged?.(rec); else onOrgChanged?.(rec);
    return null;
  };

  const logged = (rec, summary) => ({ ...rec, touchpoints: [...(rec.touchpoints || []), { date: todayET(), summary }] });

  const patchTask = async (t, patch) => {
    const { error } = await updateTask(t.id, patch);
    if (error) { showToast(`Couldn't save: ${error}`, "err"); return false; }
    setTasks((l) => l.map((x) => (x.id === t.id ? { ...x, ...patch } : x)));
    return true;
  };

  // CRM first: if that write fails, the checklist stays true.
  const crmStep = async (t, change) => {
    if (!crmLinked(t)) return true;
    const rec = await freshRecord(t);
    if (!rec) return true; // the record was merged or deleted; the task can still move
    const err = await writeCrm(t, change(rec));
    if (err) { showToast(`Couldn't update the CRM: ${err}`, "err"); return false; }
    return true;
  };

  const complete = async (t) => {
    setBusy(t.id);
    if (await crmStep(t, (rec) => logged(completeCrmAction(rec, t), `Completed: ${t.title}`))) {
      await patchTask(t, { done: true, done_at: new Date().toISOString() });
    }
    setBusy("");
  };

  const undo = async (t) => {
    setBusy(t.id);
    if (await crmStep(t, (rec) => logged(reopenCrmAction(rec, t), `Reopened: ${t.title}`))) {
      await patchTask(t, { done: false, done_at: null });
    }
    setBusy("");
  };

  const moveGo = async (t) => {
    const date = moving.date;
    if (!date) { showToast("Pick a date.", "err"); return; }
    setBusy(t.id);
    let key = t.action_key;
    const ok = await crmStep(t, (rec) => {
      const moved = moveCrmAction(rec, t, date);
      key = moved.key;
      return logged(moved.rec, `Moved to ${monthDay(date)}: ${t.title}`);
    });
    if (ok && (await patchTask(t, { due: date, week_start: weekStartOf(date), action_key: key }))) {
      setMoving(null);
      showToast(`Moved to ${shortDay(date)}`);
    }
    setBusy("");
  };

  const addTask = async () => {
    const title = adding.trim();
    if (!title) return;
    const row = {
      id: newTaskId(), title, category: "admin", hours: 1, week_start: weekStartOf(today), day: null,
      priority: 0, kind: "task", due: today, pushes: [], done: false, carried: false,
    };
    const { error } = await insertTasks([row]);
    if (error) { showToast(`Couldn't add the task: ${error}`, "err"); return; }
    setAdding("");
    setTasks((l) => [...l, row]);
    showToast("Task added ✓");
  };

  const openWho = (t) => {
    const c = contactById.get(t.contact_id);
    if (c) openContact(c); else if (t.org_id) setView("orgs");
  };

  /* ── derived ── */
  const sorted = useMemo(() => [...(tasks || [])].sort((a, b) =>
    String(a.due || "9999").localeCompare(String(b.due || "9999")) || String(a.created_at || "").localeCompare(String(b.created_at || ""))), [tasks]);
  const open = sorted.filter((t) => !t.done).length;
  const list = showAll ? sorted : sorted.slice(0, FIRST);

  const days = useMemo(() => {
    const by = new Map();
    cal.events.filter((e) => showMine || e.cal === "sprout").forEach((e) => { by.set(e.date, [...(by.get(e.date) || []), e]); });
    return [...by.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [cal.events, showMine]);

  return (
    <div className="page db">
      <style>{DB_STYLES}</style>
      <div className="db-top">
        <h1>Day Board</h1>
        <div className="db-tally">{tasks ? `${open} to do · ` : ""}{weekdayLong(today)}, {monthDay(today)}</div>
      </div>

      <div className="db-cols">
        <div className="db-card">
          <div className="db-hd"><h2>To do</h2></div>
          <form className="db-add" onSubmit={(e) => { e.preventDefault(); addTask(); }}>
            <input className="db-in" aria-label="New task" placeholder="Add a task" value={adding} onChange={(e) => setAdding(e.target.value)} />
            <button type="submit" className="db-btn" disabled={!adding.trim()}>Add</button>
          </form>
          {taskErr && <div className="db-warn"><span>Couldn&apos;t load your list: {taskErr}</span><button className="db-lnk" onClick={load}>Try again</button></div>}
          {!tasks && !taskErr && <div className="db-empty">Loading…</div>}
          {tasks && sorted.length === 0 && <div className="db-empty"><b>Nothing on your list</b>Add a task above, or set a next action on a contact.</div>}
          {list.map((t) => {
            const who = whoOf(t);
            const late = daysLate(t, today) > 0;
            const off = busy === t.id;
            return (
              <div className={`db-task${t.done ? " isdone" : ""}`} key={t.id}>
                {t.done
                  ? <button className="db-btn2 done" disabled={off} onClick={() => undo(t)}>✓ Done · Undo</button>
                  : <button className="db-btn2" disabled={off} onClick={() => complete(t)}>Done</button>}
                <div className="db-t">
                  <span className="db-txt">{t.title}</span>
                  <small>
                    {who && <><button className="db-lnk" onClick={() => openWho(t)}>{who}</button>{t.due ? " · " : ""}</>}
                    {t.due && <span className={late && !t.done ? "db-late" : ""}>Due {monthDay(t.due)}</span>}
                  </small>
                </div>
                {t.done ? <span /> : <button className="db-btn2" disabled={off} onClick={() => setMoving(moving?.id === t.id ? null : { id: t.id, date: t.due && t.due >= today ? t.due : today })}>Move date</button>}
                {moving?.id === t.id && !t.done && <div className="db-move">
                  <label htmlFor={`db-mv-${t.id}`} style={{ fontSize: 11.5, fontWeight: 700, color: "var(--dim)" }}>New date</label>
                  <input id={`db-mv-${t.id}`} className="db-in" type="date" min={today} value={moving.date} onChange={(e) => setMoving({ ...moving, date: e.target.value })} />
                  <button className="db-btn2" disabled={off} onClick={() => moveGo(t)}>Save</button>
                  <button className="db-btn2" onClick={() => setMoving(null)}>Cancel</button>
                </div>}
              </div>
            );
          })}
          {!showAll && sorted.length > FIRST && <div style={{ paddingTop: 8 }}><button className="db-lnk" onClick={() => setShowAll(true)}>Show all {sorted.length}</button></div>}
        </div>

        <div className="db-card">
          <div className="db-hd">
            <h2>Upcoming on the Sprout calendar</h2>
            <label className="db-switch"><input type="checkbox" checked={showMine} onChange={(e) => setShowMine(e.target.checked)} /> Show my calendar</label>
          </div>
          {cal.error && <div className="db-warn"><span>{cal.error}</span><button className="db-lnk" onClick={loadCal}>Try again</button></div>}
          {cal.loading && !cal.events.length && <div className="db-empty">Loading…</div>}
          {!cal.loading && !cal.error && days.length === 0 && <div className="db-empty"><b>Nothing in the next 14 days</b>Events added to the Sprout Google calendar show up here.</div>}
          {days.map(([d, evs]) => (
            <div key={d}>
              <div className="db-day">{shortDay(d)}{d === today ? " · Today" : ""}</div>
              {evs.map((e) => <div className={`db-ev${e.cal === "mine" ? " mine" : ""}`} key={e.id}><span className="tm">{evTime(e)}</span><span>{e.title}</span></div>)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
