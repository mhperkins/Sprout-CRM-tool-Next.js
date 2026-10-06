"use client";
/**
 * MembersView — every member (people and orgs) in one list, plus the staff
 * "Add member" form. Stripe invoices are read fresh on load and matched by billing
 * email (lib/memberBilling.js); nothing from Stripe is written into the records.
 * The form writes only the record's `membership` + `is_member`.
 */
import { useState, useEffect, useMemo } from "react";
import { fetchStripeMemberInvoices } from "../lib/services";
import { MEMBER_PLANS, BILLING, memberFlag, memberRate, billingEmail, withStripeInvoices, nextOpen } from "../lib/memberBilling";

const STYLES = `
.mb{--line:#E3E3DD;--dim:#5F5F57;--warn:#8A6100;--warn-bg:#FAF0D6}
.mb-top{display:flex;gap:12px 20px;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;padding-bottom:14px;border-bottom:2px solid var(--black);margin-bottom:16px}
.mb-top h1{font-size:30px;font-weight:900;letter-spacing:-.02em;line-height:1.05}
.mb-top p{color:var(--dim);font-size:13px;margin-top:5px;max-width:62ch}
.mb-btn{appearance:none;font:inherit;font-size:13px;font-weight:700;cursor:pointer;border:1px solid var(--black);background:var(--black);color:var(--white);border-radius:6px;padding:8px 14px}
.mb-btn.ghost{background:#fff;color:var(--black);border-color:var(--line)}
.mb-btn:disabled{opacity:.45;cursor:not-allowed}
.mb-btn:focus-visible,.mb-link:focus-visible{outline:2px solid var(--fuchsia);outline-offset:2px}
.mb-warn{background:var(--warn-bg);border-left:4px solid var(--banana);border-radius:0 8px 8px 0;padding:10px 14px;font-size:13px;margin-bottom:16px}
.mb-warn b{color:var(--warn)}
.mb-h{font-size:12px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;color:var(--dim);margin:0 0 8px}
.mb-tw{overflow-x:auto;background:#fff;border:1px solid var(--line);border-radius:10px;margin-bottom:22px}
.mb-t{border-collapse:collapse;width:100%;font-size:13px;font-variant-numeric:tabular-nums}
.mb-t th,.mb-t td{padding:8px 12px;border-bottom:1px solid var(--g100);text-align:left;white-space:nowrap}
.mb-t th{font-size:11.5px;color:var(--dim);font-weight:700}
.mb-link{appearance:none;background:none;border:none;padding:0;font:inherit;font-weight:700;color:var(--black);cursor:pointer;text-align:left}
.mb-link:hover{text-decoration:underline}
.mb-tag{font-size:10.5px;font-weight:700;padding:1px 6px;border-radius:8px;margin-left:6px;background:var(--g100);color:var(--dim)}
.mb-st{font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px}
.mb-st.active{background:var(--acid-lt);color:#3a3d00}.mb-st.lapsed{background:var(--banana-lt);color:#7a5c00}.mb-st.cancelled{background:var(--g100);color:var(--g600)}
.mb-late{color:#B0006A;font-weight:700}
.mb-empty{color:var(--dim);font-size:13px;padding:18px 14px}
.mb-ov{position:fixed;inset:0;background:rgba(3,0,0,.45);display:flex;align-items:flex-start;justify-content:center;padding:60px 16px;z-index:300;overflow-y:auto}
.mb-md{background:#fff;border-radius:12px;width:100%;max-width:480px;padding:20px;box-shadow:0 12px 40px rgba(0,0,0,.25)}
.mb-md h2{font-size:18px;font-weight:900;margin-bottom:14px}
.mb-f{margin-bottom:12px}
.mb-f>label,.mb-f>.lbl{display:block;font-size:11.5px;font-weight:700;color:var(--dim);margin-bottom:4px}
.mb-in{color:#030000;color-scheme:light;font:inherit;font-size:13px;width:100%;border:1px solid var(--line);border-radius:6px;padding:7px 9px;background:#fff}
.mb-in:focus{outline:2px solid var(--cyan);outline-offset:0;border-color:var(--cyan)}
.mb-opts{display:flex;flex-wrap:wrap;gap:6px}
.mb-opt{appearance:none;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;border:1.5px solid var(--line);background:#fff;color:var(--dim);border-radius:999px;padding:5px 12px}
.mb-opt[aria-pressed="true"]{background:var(--black);color:var(--white);border-color:var(--black)}
.mb-res{border:1px solid var(--line);border-radius:6px;margin-top:4px;max-height:200px;overflow-y:auto}
.mb-res button{display:block;width:100%;text-align:left;appearance:none;background:#fff;border:none;border-bottom:1px solid var(--g100);padding:7px 10px;font:inherit;font-size:13px;cursor:pointer}
.mb-res button:hover{background:#F4F4F0}
.mb-res small{color:var(--dim);margin-left:6px}
.mb-pick{display:flex;justify-content:space-between;align-items:center;border:1px solid var(--line);border-radius:6px;padding:7px 10px;font-size:13px}
.mb-hint{font-size:11.5px;color:var(--dim);margin-top:4px}
.mb-foot{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}
`;

const localToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const money = (n) => (n == null ? "—" : "$" + Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 }));
const fmtD = (iso) => { if (!iso) return "—"; const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); };
const nameOf = (r) => r.record_type === "organization" ? (r.name || "(unnamed org)") : ([r.first_name, r.last_name].filter(Boolean).join(" ") || r.email || r.instagram_handle || "(no name)");

function MemberForm({ records, initial, onCancel, onSave }) {
  const [pickId, setPickId] = useState(initial.recId || "");
  const [q, setQ] = useState("");
  const rec = records.find(r => r.id === pickId) || null;
  const m0 = rec?.membership || null;
  const [plan, setPlan] = useState(initial.plan || m0?.plan || "monthly");
  const [rate, setRate] = useState(initial.rate != null ? String(initial.rate) : m0?.rate != null ? String(m0.rate) : "");
  const [billing, setBilling] = useState(initial.billing || (m0 && m0.billing) || "stripe");
  const [email, setEmail] = useState(initial.billing_email ?? m0?.billing_email ?? "");
  const [start, setStart] = useState(m0?.start || localToday());
  const [status, setStatus] = useState(m0?.status || "active");

  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (t.length < 2) return [];
    return records.filter(r => (nameOf(r) + " " + (r.email || "")).toLowerCase().includes(t)).slice(0, 8);
  }, [q, records]);

  const choose = (r) => {
    setPickId(r.id); setQ("");
    const m = r.membership;
    if (m) { setPlan(m.plan); setRate(m.rate != null ? String(m.rate) : ""); setBilling(m.billing || "other"); setEmail(m.billing_email || ""); setStart(m.start || localToday()); setStatus(m.status || "active"); }
  };

  const save = () => {
    if (!rec) return;
    const r = rate.trim() === "" ? null : Number(rate);
    if (r != null && (!Number.isFinite(r) || r < 0)) return;
    const base = m0 || { end: "", payments: [] };
    const membership = {
      ...base, plan, rate: r, billing, start, status,
      end: status === "active" ? "" : (base.end || localToday()),
      billing_email: billing === "stripe" ? email.trim() : (base.billing_email || ""),
      paid_via: BILLING[billing],
    };
    onSave(rec, membership);
  };

  const list = MEMBER_PLANS[plan]?.price;
  return (
    <div className="mb-ov" onMouseDown={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="mb-md" role="dialog" aria-label={m0 ? "Edit member" : "Add member"} onKeyDown={e => { if (e.key === "Escape") onCancel(); }}>
        <h2>{m0 ? "Edit member" : "Add member"}</h2>
        <div className="mb-f">
          <div className="lbl">Person or organization</div>
          {rec ? (
            <div className="mb-pick"><span><b>{nameOf(rec)}</b>{rec.record_type === "organization" && <span className="mb-tag">Org</span>}{rec.email && <small style={{ color: "var(--dim)", marginLeft: 6 }}>{rec.email}</small>}</span>
              {!initial.recId && <button className="mb-link" style={{ fontWeight: 400, color: "#2a8ca0" }} onClick={() => setPickId("")}>Change</button>}</div>
          ) : <>
            <input className="mb-in" autoFocus placeholder="Search contacts and orgs by name or email" value={q} onChange={e => setQ(e.target.value)} aria-label="Search contacts and orgs"/>
            {matches.length > 0 && <div className="mb-res">{matches.map(r => <button key={r.id} onClick={() => choose(r)}>{nameOf(r)}{r.record_type === "organization" && <span className="mb-tag">Org</span>}<small>{r.email}</small>{r.membership && <small>· already a member</small>}</button>)}</div>}
            {q.trim().length >= 2 && matches.length === 0 && <div className="mb-hint">No match. Add them in Contacts or Organizations first, then come back.</div>}
          </>}
        </div>
        <div className="mb-f">
          <div className="lbl">Plan</div>
          <div className="mb-opts">{Object.entries(MEMBER_PLANS).map(([k, p]) => <button key={k} className="mb-opt" aria-pressed={plan === k} onClick={() => setPlan(k)}>{p.label} ${p.price}</button>)}</div>
        </div>
        <div className="mb-f">
          <label htmlFor="mb-rate">Rate per {MEMBER_PLANS[plan]?.per}</label>
          <input id="mb-rate" className="mb-in" inputMode="decimal" placeholder={`$${list} (list price)`} value={rate} onChange={e => setRate(e.target.value)}/>
          <div className="mb-hint">Leave blank for the list price. Type a number for a custom rate.</div>
        </div>
        <div className="mb-f">
          <div className="lbl">Billed through</div>
          <div className="mb-opts">{Object.entries(BILLING).map(([k, l]) => <button key={k} className="mb-opt" aria-pressed={billing === k} onClick={() => setBilling(k)}>{l}</button>)}</div>
        </div>
        {billing === "stripe" && <div className="mb-f">
          <label htmlFor="mb-em">Stripe billing email</label>
          <input id="mb-em" className="mb-in" type="email" placeholder={rec?.email || "the email on the Stripe invoice"} value={email} onChange={e => setEmail(e.target.value)}/>
          <div className="mb-hint">Paid invoices to this address count as their dues. Blank uses {rec?.email ? rec.email : "their email"}. Create the invoice in Stripe yourself; this form never sends one.</div>
        </div>}
        <div className="mb-f" style={{ display: "grid", gridTemplateColumns: m0 ? "1fr 1fr" : "1fr", gap: 10 }}>
          <div><label htmlFor="mb-st">{plan === "day" ? "Date" : "Member since"}</label>
            <input id="mb-st" type="date" className="mb-in" value={start} onChange={e => setStart(e.target.value)}/></div>
          {m0 && <div><label htmlFor="mb-sts">Status</label>
            <select id="mb-sts" className="mb-in" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="active">Active</option><option value="lapsed">Lapsed</option><option value="cancelled">Cancelled</option>
            </select></div>}
        </div>
        <div className="mb-foot">
          <button className="mb-btn ghost" onClick={onCancel}>Cancel</button>
          <button className="mb-btn" disabled={!rec || !start} onClick={save}>{m0 ? "Save" : "Add member"}</button>
        </div>
      </div>
    </div>
  );
}

export default function MembersView({ contacts = [], orgs = [], onSaveContact, onSaveOrg, openContact, showToast }) {
  const [stripe, setStripe] = useState({ invoices: [], error: null, loading: true });
  const [form, setForm] = useState(null); // initial values while the form is open
  const today = localToday();

  useEffect(() => {
    let live = true;
    fetchStripeMemberInvoices().then(st => { if (live) setStripe({ ...st, loading: false }); });
    return () => { live = false; };
  }, []);

  const records = useMemo(() => contacts.concat(orgs), [contacts, orgs]);
  const joined = useMemo(() => withStripeInvoices(records, stripe.invoices), [records, stripe.invoices]);
  const members = joined.records.filter(r => r.membership)
    .sort((a, b) => (memberFlag(b.membership) - memberFlag(a.membership)) || nameOf(a).localeCompare(nameOf(b)));
  const active = members.filter(r => memberFlag(r.membership)).length;

  const save = (rec, membership) => {
    const next = { ...rec, membership, is_member: memberFlag(membership) };
    (rec.record_type === "organization" ? onSaveOrg : onSaveContact)(next);
    showToast?.(rec.membership ? "Member saved ✓" : "Member added ✓");
    setForm(null);
  };

  const fromInvoice = (inv) => setForm({
    billing: "stripe", billing_email: inv.email,
    plan: /annual|year/i.test(inv.desc) ? "annual" : "monthly",
  });

  return (
    <div className="mb">
      <style>{STYLES}</style>
      <div className="mb-top">
        <div>
          <h1>Members</h1>
          <p>{active} active · {members.length} on record. Stripe invoices are read live and count as dues in Grant Metrics once the billing email matches.</p>
        </div>
        <button className="mb-btn" onClick={() => setForm({})}>+ Add member</button>
      </div>

      {stripe.error && <div className="mb-warn"><b>Couldn't read Stripe.</b> Last paid and next due leave out Stripe. ({stripe.error})</div>}

      {joined.unmatched.length > 0 && <>
        <div className="mb-h">Stripe membership invoices with no member</div>
        <div className="mb-tw"><table className="mb-t">
          <thead><tr><th>Billed to</th><th>Invoice</th><th>Amount</th><th>Status</th><th>Date</th><th></th></tr></thead>
          <tbody>{joined.unmatched.map(inv => (
            <tr key={inv.id}>
              <td>{inv.name || inv.email || "(no email)"}{inv.name && <small style={{ color: "var(--dim)", marginLeft: 6 }}>{inv.email}</small>}</td>
              <td>{inv.url ? <a href={inv.url} target="_blank" rel="noopener noreferrer">{inv.desc}</a> : inv.desc}</td>
              <td>{money(inv.amount)}</td><td>{inv.status === "paid" ? "Paid" : "Open"}</td><td>{fmtD(inv.date)}</td>
              <td><button className="mb-btn ghost" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => fromInvoice(inv)}>Add as member</button></td>
            </tr>))}</tbody>
        </table></div>
      </>}

      <div className="mb-h">All members</div>
      <div className="mb-tw">
        {members.length === 0 ? <div className="mb-empty">No members yet. Press <b>+ Add member</b> to record the first one.</div> : (
          <table className="mb-t">
            <thead><tr><th>Name</th><th>Plan</th><th>Rate</th><th>Billed through</th><th>Last paid</th><th>Next due</th><th>Status</th><th></th></tr></thead>
            <tbody>{members.map(r => {
              const m = r.membership;
              const pays = [...(m.payments || [])].sort((a, b) => b.date.localeCompare(a.date));
              const due = nextOpen(joined.byId[r.id]);
              const late = due && (due.due_date || due.date) < today;
              const st = m.plan === "day" ? "active" : (m.status || "active");
              return (
                <tr key={r.id}>
                  <td>{r.record_type === "organization" ? <b>{nameOf(r)}</b> : <button className="mb-link" onClick={() => openContact?.(r)}>{nameOf(r)}</button>}
                    {r.record_type === "organization" && <span className="mb-tag">Org</span>}</td>
                  <td>{MEMBER_PLANS[m.plan]?.label}</td>
                  <td>{money(memberRate(m))}{m.rate != null && <span className="mb-tag">custom</span>}</td>
                  <td>{BILLING[m.billing] || "—"}{m.billing === "stripe" && <small style={{ color: "var(--dim)", marginLeft: 6 }}>{billingEmail(r) || "no email"}</small>}</td>
                  <td>{pays[0] ? <>{fmtD(pays[0].date)} · {money(pays[0].amount)}</> : "—"}</td>
                  <td>{due ? <span className={late ? "mb-late" : ""}>{fmtD(due.due_date || due.date)} · {money(due.amount)}{late ? " overdue" : ""}</span> : "—"}</td>
                  <td><span className={"mb-st " + st}>{m.plan === "day" ? "Day pass" : st[0].toUpperCase() + st.slice(1)}</span></td>
                  <td><button className="mb-btn ghost" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => setForm({ recId: r.id })}>Edit</button></td>
                </tr>
              );
            })}</tbody>
          </table>
        )}
      </div>
      {stripe.loading && <div className="mb-hint" style={{ fontSize: 12, color: "var(--dim)" }}>Reading Stripe…</div>}

      {form && <MemberForm records={records} initial={form} onCancel={() => setForm(null)} onSave={save}/>}
    </div>
  );
}
