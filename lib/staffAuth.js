// lib/staffAuth.js — SERVER ONLY. Checks the signed-in CRM user's Supabase token.
import { svc, hasServiceKey } from "./portalDb";

/** Returns null when the request is from signed-in staff, else a 401 Response. */
export async function requireStaff(req) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token || !hasServiceKey()) return Response.json({ error: "Sign in first." }, { status: 401 });
  const { data, error } = await svc().auth.getUser(token);
  if (error || !data?.user) return Response.json({ error: "Sign in first." }, { status: 401 });
  return null;
}
