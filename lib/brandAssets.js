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
