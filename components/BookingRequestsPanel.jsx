"use client";

/**
 * BookingRequestsPanel.jsx — the "Needs you" box at the top of the Events page.
 *
 * Three kinds of thing wait on staff, in one place:
 *  1. Date requests from /book and client portals. Every date is checked against the
 *     Program Calendar on load. A date that clashes comes in unchecked with the reason,
 *     so a double booking can't be approved by accident. Approving writes the dates
 *     onto the Program Calendar, emails the client, and adds the dates to the CRM event.
 *  2. Pending requests with no dates waiting (they still need a decision).
 *  3. Upcoming events with no "Hosted by", which decides what their page shows.
 */

import { useState, useEffect, useCallback } from "react";
import { fetchBookingRequests, decideBookingSlots } from "../lib/services";
import { shortDate, timeRange } from "../lib/booking";

const KINDS = [["sprout", "Sprout"], ["partner", "Partner"], ["rental", "Rental"]];

export default function BookingRequestsPanel({ onEventChanged, onOpenEvent, showToast, onGroups, pendingEvents = [], unsetHost = [], onSetHostedBy }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [checked, setChecked] = useState({});   // slot id -> bool
  const [reasons, setReasons] = useState({});   // event id -> note
  const [working, setWorking] = useState("");   // event id being decided
  const [hostOpen, setHostOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await fetchBookingRequests();
    setGroups(data); setErr(error || "");
    onGroups?.(data);
    const init = {};
    for (const g of data) for (const s of g.slots) init[s.id] = !s.clash;
    setChecked(init);
    setLoading(false);
  }, [onGroups]);
  useEffect(() => { load(); }, [load]);

  const decide = async (g, mode) => {
    const ids = g.slots.map((s) => s.id);
    const picked = ids.filter((id) => checked[id]);
    const approve = mode === "approve" ? picked : [];
    const decline = mode === "approve" ? [] : (picked.length ? picked : ids);
    if (!approve.length && !decline.length) { showToast?.("Check at least one date", "err"); return; }
    setWorking(g.event_id);
    const { data, error } = await decideBookingSlots({ approve, decline, reason: reasons[g.event_id] || "" });
    setWorking("");
    if (error) { showToast?.(error, "err"); return; }

    for (const r of data) {
      // The server already put the dates on the CRM event; refresh this tab's copy
      // so a later save here can't overwrite it with stale data.
      if (r.event && onEventChanged) onEventChanged(r.event);
      const bits = [
        r.confirmed.length && `${r.confirmed.length} confirmed`,
        r.declined.length && `${r.declined.length} declined`,
        r.failed.length && `${r.failed.length} not added (${r.failed[0].reason})`,
      ].filter(Boolean).join(", ");
      showToast?.(`${r.event_name || "Booking"}: ${bits}${r.emailed === false ? ". Client email not sent." : ""}`, r.failed.length ? "err" : undefined);
    }
    load();
  };

  const inGroups = new Set(groups.map((g) => g.event_id));
  const loose = pendingEvents.filter((e) => !inGroups.has(e.id));
  const count = groups.length + loose.length + (unsetHost.length ? 1 : 0);

  return (
    <div className="card" style={{ marginBottom: 18, padding: 16, border: "2px solid var(--black)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: count || err ? 12 : 0 }}>
        <div style={{ fontSize: 15, fontWeight: 900 }}>Needs you{count ? ` (${count})` : ""}</div>
        {groups.length > 0 && <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 20, background: "#FAD100", color: "#030000" }}>
          {groups.reduce((n, g) => n + g.slots.length, 0)} dates waiting
        </span>}
        <button className="btn btn-ghost btn-xs" style={{ marginLeft: "auto" }} onClick={load} disabled={loading}>{loading ? "Checking…" : "↻ Recheck calendar"}</button>
      </div>
      {!count && !err && !loading && <div style={{ fontSize: 13, color: "var(--g500)" }}>Nothing needs you right now. New hosting requests show up here.</div>}
      {err && <div style={{ fontSize: 13, color: "var(--fuchsia)", marginBottom: 10 }}>{err}</div>}

      {groups.map((g) => {
        const picked = g.slots.filter((s) => checked[s.id]).length;
        return (
          <div key={g.event_id} style={{ border: "1px solid var(--g200)", borderRadius: 8, padding: 12, marginBottom: 10, background: "#fff" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
              <button className="btn-link" style={{ fontWeight: 900, fontSize: 14, background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--ink)", textDecoration: "underline" }}
                onClick={() => onOpenEvent?.(g.event_id)}>{g.event_name}</button>
              {g.event_status === "pending" && <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 20, background: "var(--g100)" }}>New request</span>}
              <span style={{ fontSize: 12, color: "var(--g500)" }}>
                {[g.contact_name, g.org_name, g.contact_email].filter(Boolean).join(" · ")}
              </span>
              {g.token && <a href={`/portal/${g.token}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, marginLeft: "auto", color: "var(--cyan)", fontWeight: 700 }}>Their portal ↗</a>}
            </div>
            {g.slots[0]?.note && <div style={{ fontSize: 12.5, color: "var(--g600)", marginTop: 6 }}>"{g.slots[0].note}"</div>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 6, margin: "10px 0" }}>
              {g.slots.map((s) => (
                <label key={s.id} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5, padding: "6px 8px", borderRadius: 6, cursor: "pointer",
                  border: `1px solid ${s.clash ? "var(--fuchsia)" : "var(--g200)"}` }}>
                  <input type="checkbox" checked={!!checked[s.id]} onChange={() => setChecked((c) => ({ ...c, [s.id]: !c[s.id] }))} style={{ marginTop: 2 }} />
                  <span>
                    <b>{shortDate(s.date)}</b> · {timeRange(s.start_time, s.end_time)}
                    {s.clash && <span style={{ display: "block", color: "var(--fuchsia)", fontSize: 11.5 }}>{s.clash}</span>}
                    {!s.clash && s.also_requested && <span style={{ display: "block", color: "#5c4a00", fontSize: 11.5 }}>{s.also_requested}</span>}
                    {!s.clash && !s.also_requested && <span style={{ display: "block", color: "#4f6b00", fontSize: 11.5 }}>Open</span>}
                  </span>
                </label>
              ))}
            </div>
            <input className="fi" style={{ marginBottom: 8 }} placeholder="Note to the client (optional, shown with declined dates)" aria-label="Note to the client"
              value={reasons[g.event_id] || ""} onChange={(e) => setReasons((r) => ({ ...r, [g.event_id]: e.target.value }))} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn btn-blk btn-sm" disabled={!picked || working === g.event_id} onClick={() => decide(g, "approve")}>
                {working === g.event_id ? "Working…" : `Approve ${picked} onto the calendar`}
              </button>
              <button className="btn btn-ghost btn-sm" disabled={working === g.event_id} onClick={() => decide(g, "decline")}
                style={{ color: "var(--fuchsia)", borderColor: "var(--fuchsia)" }}>
                {picked && picked < g.slots.length ? `Decline ${picked} checked` : "Decline all"}
              </button>
            </div>
          </div>
        );
      })}

      {loose.map((e) => (
        <div key={e.id} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", border: "1px solid var(--g200)", borderRadius: 8, padding: "10px 12px", marginBottom: 10, background: "#fff" }}>
          <div style={{ flex: "1 1 240px", minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: 14 }}>{e.name || "(Unnamed request)"}</div>
            <div style={{ fontSize: 12, color: "var(--g500)" }}>Request · no dates waiting. Open it to add a date, approve, or decline.</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => onOpenEvent?.(e.id)}>Open</button>
        </div>
      ))}

      {unsetHost.length > 0 && (
        <div style={{ border: "1px solid var(--g200)", borderRadius: 8, padding: "10px 12px", background: "#fff" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 240px", minWidth: 0 }}>
              <div style={{ fontWeight: 900, fontSize: 14 }}>{unsetHost.length} upcoming event{unsetHost.length === 1 ? " has" : "s have"} no "Hosted by"</div>
              <div style={{ fontSize: 12, color: "var(--g500)" }}>It decides what their page shows. Rentals get no checklist; past events count toward Grant Metrics by it.</div>
            </div>
            <button className="btn btn-ghost btn-sm" aria-expanded={hostOpen} onClick={() => setHostOpen((v) => !v)}>{hostOpen ? "Done" : "Set them"}</button>
          </div>
          {hostOpen && (
            <div style={{ marginTop: 10, borderTop: "1px solid var(--g100)" }}>
              {unsetHost.map((e) => (
                <div key={e.id} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", padding: "8px 0", borderBottom: "1px solid var(--g100)" }}>
                  <button style={{ flex: "1 1 200px", minWidth: 0, textAlign: "left", background: "none", border: "none", padding: 0, fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer", color: "var(--black)" }}
                    onClick={() => onOpenEvent?.(e.id)}>{e.name || "(Unnamed)"}</button>
                  {KINDS.map(([k, label]) => (
                    <button key={k} className="btn btn-ghost btn-xs" onClick={() => onSetHostedBy?.(e, k)}>{label}</button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
