// lib/showcaseDb.js — SERVER ONLY. Never import this from a client component.
//
// The showcase form is a standing public link with no token and no login, so the
// API route writes with the service-role key. Nothing here reads or writes
// sprout_contacts: an application is inert until staff accept it in the CRM.

import { randomBytes } from "crypto";
import { svc } from "./portalDb";

export const newApplicationId = () =>
  `shw_${Date.now().toString(36)}${randomBytes(3).toString("hex")}`;

/** How many applications arrived since `sinceISO`. Guards against a flood. */
export async function recentApplicationCount(sinceISO) {
  const { count, error } = await svc()
    .from("sprout_showcase_applications")
    .select("id", { count: "exact", head: true })
    .gte("created_at", sinceISO);
  if (error) {
    console.error("recentApplicationCount failed:", error.message);
    throw new Error("showcase count failed");
  }
  return count ?? 0;
}

/** Same person sending the same thing twice in a row. Their second send is a no-op. */
export async function duplicateRecently(email, sinceISO) {
  const clean = String(email || "").trim().toLowerCase();
  if (!clean) return false;
  const { data } = await svc()
    .from("sprout_showcase_applications")
    .select("id")
    .ilike("email", clean)
    .gte("created_at", sinceISO)
    .limit(1);
  return Boolean(data?.length);
}

/** Returns { id } or { error }. */
export async function insertApplication(data) {
  const id = newApplicationId();
  const now = new Date().toISOString();
  const { error } = await svc().from("sprout_showcase_applications").insert({
    id,
    status: "new",
    name: data.name || "",
    email: data.email || "",
    role: data.role || "",
    data,
    created_at: now,
    updated_at: now,
  });
  if (error) return { error: error.message };
  return { id };
}
