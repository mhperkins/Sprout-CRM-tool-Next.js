/**
 * givebutterDonations.js — server-only. Reads gifts from Givebutter for Grant Metrics.
 *
 * Every succeeded, unrefunded transaction counts as a donation (tickets included, by Max's
 * call), EXCEPT the Sprout Society Membership campaign: those are dues, which Grant Metrics
 * already counts from member records. The processing fee a donor covers is not counted.
 * Needs GIVEBUTTER_API_KEY on the server. Nothing here writes to Givebutter or the CRM.
 */

const API = "https://api.givebutter.com/v1";
const DUES_CAMPAIGN_IDS = new Set([635382]); // "Sprout Society Membership"

export const hasGivebutterKey = () => !!process.env.GIVEBUTTER_API_KEY;

// Givebutter stamps UTC; report the day it happened in New York.
const nyDay = (iso) => iso ? new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/New_York" }) : "";

/** [{ id, date, amount, campaign, campaign_id, donor }] — donor is a stable per-person key. */
export async function fetchDonations() {
  const out = [];
  for (let page = 1; page <= 200; page++) {
    const r = await fetch(`${API}/transactions?page=${page}`, {
      headers: { Authorization: `Bearer ${process.env.GIVEBUTTER_API_KEY}`, Accept: "application/json" },
      cache: "no-store",
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j?.message || `Givebutter ${r.status}`);
    for (const t of j.data || []) {
      if (t.status !== "succeeded" || DUES_CAMPAIGN_IDS.has(t.campaign_id)) continue;
      if ((t.transactions || []).some(x => x.refunded)) continue;
      out.push({
        id: t.id,
        date: nyDay(t.transacted_at || t.created_at),
        amount: Number(t.amount) || 0,
        campaign: t.campaign_title || "No campaign",
        campaign_id: t.campaign_id || null,
        donor: t.contact_id ? `c${t.contact_id}` : (t.email || "").trim().toLowerCase() || t.id,
      });
    }
    if (!j.links?.next || !(j.data || []).length) break;
  }
  return out;
}
