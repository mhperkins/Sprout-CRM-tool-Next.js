// Guest media upload link: rules shared by the public form (/media/[token]), its API
// route and the CRM's Guest media tile. Guests send photos and video from an event
// straight to a Google Drive folder for that event, or paste a link to footage that
// already lives somewhere else.

/** Largest single file we accept. Drive takes far more; this just stops abuse. */
export const MAX_FILE_BYTES = 10 * 1024 ** 3;
/** Uploads started per link per hour, across everyone. */
export const MAX_STARTS_PER_HOUR = 400;
/** Pasted links per send. */
export const MAX_LINKS = 10;

export const LIMITS = { name: 120, email: 160, instagram: 80, note: 1000, url: 1000, filename: 200 };

// Some phones hand over HEIC or .mov with an empty type, so the extension also counts.
const MEDIA_EXT = /\.(jpe?g|png|gif|webp|heic|heif|avif|tiff?|dng|raw|mov|mp4|m4v|webm|avi|mkv|3gp|hevc)$/i;

/** True for a photo or video, judged by type or, failing that, file name. */
export function isMediaFile(name, mime) {
  const t = String(mime || "").toLowerCase();
  if (t.startsWith("image/") || t.startsWith("video/")) return true;
  return MEDIA_EXT.test(String(name || ""));
}

/** A browser-made id grouping one person's send. */
export const BATCH_RE = /^b_[a-z0-9]{8,32}$/;
export const newBatchId = () => `b_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

const cut = (v, n) => String(v ?? "").trim().slice(0, n);

/** Who sent it. Everything optional. */
export function sanitizeSender(raw) {
  const s = raw && typeof raw === "object" ? raw : {};
  const email = cut(s.email, LIMITS.email);
  return {
    name: cut(s.name, LIMITS.name),
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "",
    instagram: cut(s.instagram, LIMITS.instagram).replace(/^@+/, ""),
    note: cut(s.note, LIMITS.note),
    ok_to_post: s.ok_to_post === true,
  };
}

/** A pasted link, or "" when it is not an http(s) URL. */
export function cleanUrl(raw) {
  let s = cut(raw, LIMITS.url);
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : "";
  } catch {
    return "";
  }
}

export function fmtBytes(n) {
  const b = Number(n) || 0;
  if (b >= 1024 ** 3) return `${(b / 1024 ** 3).toFixed(1)} GB`;
  if (b >= 1024 ** 2) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  if (b >= 1024) return `${Math.round(b / 1024)} KB`;
  return `${b} B`;
}

export const driveFileUrl = (id) => `https://drive.google.com/file/d/${encodeURIComponent(id)}/view`;
export const driveFolderUrl = (id) => `https://drive.google.com/drive/folders/${encodeURIComponent(id)}`;
