// lib/brandAssets.js — the logo files hosts can download from their event portal
// for flyers. Files live in public/brand/ and are served as static downloads.
//
// Transparent PNGs, ~1900px wide, upscaled from the newsletter logo (the largest
// wordmark on hand). Swap in Canva brand-kit exports when available. The flower
// icon files stay in public/brand/ for /coming-soon but are not offered here.
//
// To add a variation: drop the file(s) in public/brand/, then add an entry here.
// `bg` sets the preview tile: "light" for dark artwork, "dark" for white artwork.

export const BRAND_ASSETS = [
  {
    key: "logo-black",
    label: "Sprout Society logo (black)",
    note: "Black lettering with the pink heart. Use it on light backgrounds.",
    bg: "light",
    preview: "/brand/sprout-society-logo-black.png",
    files: [{ format: "PNG", href: "/brand/sprout-society-logo-black.png" }],
  },
  {
    key: "logo-white",
    label: "Sprout Society logo (white)",
    note: "White lettering with the pink heart. Use it on dark backgrounds.",
    bg: "dark",
    preview: "/brand/sprout-society-logo-white.png",
    files: [{ format: "PNG", href: "/brand/sprout-society-logo-white.png" }],
  },
];

export const BRAND_GUIDELINES = [
  "Use black artwork on light backgrounds and white artwork on dark ones.",
  "Keep the proportions. Do not stretch, recolor, or add effects.",
  "Leave some breathing room around the logo.",
  "Tag us on Instagram: @sproutsocietyorg",
];

// Staff upload the real logo files in CRM Settings ("Flyer logos"); they live in
// sprout_profile.data.brand_logos as [{ id, label, note, bg, url, name }]. When any
// exist, the portal shows ONLY those. With none, it falls back to BRAND_ASSETS above.
export function logosFromProfile(list) {
  const valid = (Array.isArray(list) ? list : []).filter(
    (l) => l && typeof l.url === "string" && /^https:\/\//.test(l.url)
  );
  if (!valid.length) return BRAND_ASSETS;
  return valid.map((l) => {
    const name = l.name || "sprout-society-logo";
    const ext = name.split(".").pop().toUpperCase();
    return {
      key: l.id || l.url,
      label: l.label || "Sprout Society logo",
      note: l.note || "",
      bg: l.bg === "dark" ? "dark" : "light",
      preview: l.url,
      // Supabase storage ignores <a download> cross-origin; ?download= forces it.
      files: [{ format: ext.length <= 4 ? ext : "File", href: `${l.url}?download=${encodeURIComponent(name)}` }],
    };
  });
}
