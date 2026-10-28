// lib/googleDrive.js — SERVER ONLY. Google Drive writes for the guest media link.
//
// Uses hello@'s existing GMAIL_* env token (it carries the full drive scope). Guest
// files go to the Sprout Society Team shared drive: one "Guest media uploads" folder,
// one subfolder per event. The server only opens a resumable upload session; the
// guest's browser then sends the file bytes straight to Google, so any size works
// and nothing large passes through our function.

import { accessToken } from "./notify";

const API = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";
const FOLDER = "application/vnd.google-apps.folder";

/** Sprout Society Team shared drive. */
export const SHARED_DRIVE_ID = process.env.GUEST_MEDIA_DRIVE_ID || "0AABHYS_tIU_6Uk9PVA";
const ROOT_NAME = "Guest media uploads";

async function api(path, { method = "GET", body, token } = {}) {
  const r = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token || (await accessToken())}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = r.status === 204 ? {} : await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Drive ${method} ${path.split("?")[0]} failed: ${j?.error?.message || r.status}`);
  return j;
}

const q = (s) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

async function findFolder(name, parentId, token) {
  const query = `name='${q(name)}' and mimeType='${FOLDER}' and '${parentId}' in parents and trashed=false`;
  const j = await api(
    `/files?q=${encodeURIComponent(query)}&corpora=drive&driveId=${SHARED_DRIVE_ID}&includeItemsFromAllDrives=true&supportsAllDrives=true&fields=files(id)&pageSize=1`,
    { token },
  );
  return j.files?.[0]?.id || null;
}

async function createFolder(name, parentId, token) {
  const j = await api(`/files?supportsAllDrives=true&fields=id`, { method: "POST", token, body: { name, mimeType: FOLDER, parents: [parentId] } });
  return j.id;
}

/** The shared "Guest media uploads" folder, made on first use. */
async function rootFolder(token) {
  return (await findFolder(ROOT_NAME, SHARED_DRIVE_ID, token)) || createFolder(ROOT_NAME, SHARED_DRIVE_ID, token);
}

/** Make a folder for one event ("2026-10-23 Sprout n' Tell …"). Returns its id. */
export async function createEventFolder(event) {
  const token = await accessToken();
  const root = await rootFolder(token);
  const name = `${event.event_date || "no date"} ${event.name || event.id}`.trim().slice(0, 200);
  return createFolder(name, root, token);
}

/** Trash a folder this route made but lost a race for. Best effort. */
export async function trashFolder(id) {
  try { await api(`/files/${id}?supportsAllDrives=true`, { method: "PATCH", body: { trashed: true } }); } catch { /* left behind, empty */ }
}

/**
 * Open a resumable upload in `folderId`. `origin` must be the guest page's origin:
 * Google only answers the browser's PUT with CORS headers for that origin.
 * Returns the session URL the browser PUTs the file to.
 */
export async function startUpload({ folderId, name, mime, size, origin }) {
  const r = await fetch(`${UPLOAD}?uploadType=resumable&supportsAllDrives=true&fields=id,name,size,parents`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": mime || "application/octet-stream",
      "X-Upload-Content-Length": String(size),
      Origin: origin,
    },
    body: JSON.stringify({ name, parents: [folderId] }),
  });
  const url = r.headers.get("location");
  if (!r.ok || !url) {
    const j = await r.json().catch(() => ({}));
    throw new Error(`Drive upload start failed: ${j?.error?.message || r.status}`);
  }
  return url;
}

/** A file's id, name, size and folders, or null when Drive has no such file. */
export async function driveFile(id) {
  try {
    return await api(`/files/${encodeURIComponent(id)}?supportsAllDrives=true&fields=id,name,size,mimeType,parents,trashed`);
  } catch {
    return null;
  }
}

/**
 * Can someone without a login open this link? Returns "open", "private", or
 * "unknown" (could not tell; let it through). Google answers a private Drive link
 * with a redirect to its sign-in page; other hosts with 401/403.
 */
export async function linkAccess(url) {
  try {
    const r = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SproutSociety/1.0)" },
    });
    const loc = r.headers.get("location") || "";
    if (r.status >= 300 && r.status < 400) {
      if (/accounts\.google\.com|ServiceLogin|\/signin|\/login/i.test(loc)) return "private";
      return "open";
    }
    if (r.status === 401 || r.status === 403) return "private";
    if (r.status === 404) return /google\.com/i.test(url) ? "private" : "unknown";
    if (r.ok) {
      // Drive serves a 200 "You need access" page for some private files.
      if (/google\.com/i.test(url)) {
        const text = (await r.text()).slice(0, 200000);
        if (/You need access|Request access|ServiceLogin/i.test(text)) return "private";
      }
      return "open";
    }
    return "unknown";
  } catch {
    return "unknown";
  }
}
