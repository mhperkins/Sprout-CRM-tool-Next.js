/**
 * memberBilling.js — joins Stripe membership invoices onto CRM members. Pure, no writes.
 *
 * Works like the sign-in sheets do for attendance: the invoices are read fresh each
 * time and merged in memory, so nothing is copied into the contact record and a staff
 * save can never overwrite (or double) them.
 *
 * Matching: an invoice belongs to the person or org whose Membership billing email
 * (or, if blank, their own email) equals the invoice's customer email.
 * Paid invoices become payments (source "stripe", ref = invoice id), skipped when a
 * payment with that ref is already logged. Open invoices set the next due date.
 */

export const MEMBER_PLANS = {
  day: { label: "Day pass", price: 17, per: "visit" },
  monthly: { label: "Monthly", price: 55, per: "month" },
  annual: { label: "Annual", price: 495, per: "year" },
};
export const BILLING = { stripe: "Stripe", givebutter: "Givebutter", other: "Cash / other" };

/** Monthly or annual + active is what makes someone a Member. A day pass never does. */
export const memberFlag = (m) => !!m && m.plan !== "day" && (m.status || "active") === "active";

export const memberRate = (m) => (m?.rate != null ? Number(m.rate) : MEMBER_PLANS[m?.plan]?.price ?? null);

export const billingEmail = (rec) =>
  ((rec?.membership?.billing_email || rec?.email || "") + "").trim().toLowerCase();

/**
 * @returns {{ records: object[], unmatched: object[], byId: Record<string,{paid:object[],open:object[]}> }}
 * records = the same list with Stripe payments added to each matched membership.
 */
export function withStripeInvoices(records = [], invoices = []) {
  const byEmail = new Map();
  records.forEach(r => {
    if (!r.membership) return;
    const e = billingEmail(r);
    if (e && !byEmail.has(e)) byEmail.set(e, r.id);
  });
  const byId = {};
  const unmatched = [];
  invoices.forEach(inv => {
    const id = inv.email && byEmail.get(inv.email);
    if (!id) { unmatched.push(inv); return; }
    const slot = (byId[id] ||= { paid: [], open: [] });
    (inv.status === "paid" ? slot.paid : slot.open).push(inv);
  });
  const out = records.map(r => {
    const slot = byId[r.id];
    if (!slot || !slot.paid.length) return r;
    const have = new Set((r.membership.payments || []).map(p => p.ref).filter(Boolean));
    const extra = slot.paid.filter(inv => !have.has(inv.id)).map(inv => ({
      id: "stp_" + inv.id, date: inv.paid_date || inv.date, amount: inv.amount,
      method: "Stripe", source: "stripe", ref: inv.id,
    }));
    return extra.length ? { ...r, membership: { ...r.membership, payments: [...(r.membership.payments || []), ...extra] } } : r;
  });
  return { records: out, unmatched, byId };
}

/** Earliest unpaid invoice for a member, or null. */
export const nextOpen = (slot) =>
  (slot?.open || []).slice().sort((a, b) => (a.due_date || a.date).localeCompare(b.due_date || b.date))[0] || null;
