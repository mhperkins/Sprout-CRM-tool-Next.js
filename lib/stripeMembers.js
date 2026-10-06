/**
 * stripeMembers.js — server-only. Reads membership invoices from Stripe.
 *
 * The Stripe account also holds gala pledges, sponsorships and space-share invoices,
 * so only invoice LINES whose description says "membership" count. The key
 * (STRIPE_SECRET_KEY) is a restricted read-only key: Customers, Subscriptions, Invoices.
 * Nothing here writes to Stripe or to the CRM.
 */

const API = "https://api.stripe.com/v1";
const IS_MEMBERSHIP = /membership/i;

export const hasStripeKey = () => !!process.env.STRIPE_SECRET_KEY;

const isoDay = (unix) => (unix ? new Date(unix * 1000).toISOString().slice(0, 10) : "");

async function stripeGet(path) {
  const r = await fetch(`${API}/${path}`, {
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
    cache: "no-store",
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error?.message || `Stripe ${r.status}`);
  return j;
}

/**
 * Every invoice with a membership line, newest first.
 * Returns [{ id, number, email, name, status, amount, date, paid_date, due_date, desc, url }].
 * amount = the membership lines only, in dollars. Drafts and voided invoices are left out.
 */
export async function fetchMembershipInvoices() {
  const out = [];
  let after = "";
  for (let page = 0; page < 20; page++) {
    const j = await stripeGet(`invoices?limit=100&expand[]=data.lines${after ? `&starting_after=${after}` : ""}`);
    for (const inv of j.data || []) {
      if (inv.status === "draft" || inv.status === "void") continue;
      const lines = (inv.lines?.data || []).filter(l => IS_MEMBERSHIP.test(l.description || ""));
      if (!lines.length) continue;
      out.push({
        id: inv.id,
        number: inv.number || "",
        email: (inv.customer_email || "").trim().toLowerCase(),
        name: inv.customer_name || "",
        status: inv.status, // open | paid | uncollectible
        amount: lines.reduce((s, l) => s + (l.amount || 0), 0) / 100,
        date: isoDay(inv.created),
        paid_date: isoDay(inv.status_transitions?.paid_at),
        due_date: isoDay(inv.due_date),
        desc: [...new Set(lines.map(l => l.description))].join(" · "),
        url: inv.hosted_invoice_url || "",
      });
    }
    if (!j.has_more || !j.data?.length) break;
    after = j.data[j.data.length - 1].id;
  }
  return out;
}
