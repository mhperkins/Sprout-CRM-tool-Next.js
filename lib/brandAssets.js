// lib/brandAssets.js — the logo files hosts can download from their event portal
// for flyers. Files live in public/brand/ and are served as static downloads.
//
// Only list print-ready files: transparent PNG at ~2000px and/or SVG. The old
// 200–473px newsletter logos are too small for a flyer and are deliberately left out.
//
// To add a variation: drop the file(s) in public/brand/, then add an entry here.
// `bg` sets the preview tile: "light" for dark artwork, "dark" for white artwork.

export const BRAND_ASSETS = [
  {
    key: "flower",
    label: "Flower icon",
    note: "Full color with black linework. Use it on light backgrounds.",
    bg: "light",
    preview: "/brand/sprout-flower-icon.png",
    files: [
      { format: "PNG", href: "/brand/sprout-flower-icon.png" },
      { format: "SVG", href: "/brand/sprout-flower-icon.svg" },
    ],
  },
];

export const BRAND_GUIDELINES = [
  "Use black artwork on light backgrounds and white artwork on dark ones.",
  "Keep the proportions. Do not stretch, recolor, or add effects.",
  "Leave some breathing room around the logo.",
  "Tag us on Instagram: @sproutsocietyorg",
];
