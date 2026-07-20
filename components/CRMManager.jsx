"use client";

/**
 * CRMManager.jsx — Sprout Society CRM v1
* Works locally and on Vercel.
 * Storage: Supabase (project: ixdnmjchvjzytyhmripc). All DB access via lib/services.js.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";

import {
  fetchContacts,
  fetchOrgs,
  fetchEvents,
  fetchProfile,
  saveContacts    as svcSaveContacts,
  saveOrgs        as svcSaveOrgs,
  saveEvents      as svcSaveEvents,
  saveProfile     as svcSaveProfile,
  fetchNewsletters,
  saveNewsletter  as svcSaveNewsletter,
  deleteContactById,
  deleteOrgById,
  deleteEventById,
  deleteNewsletterById,
  DEFAULT_PROFILE,
  uploadNewsletterImage,
  signOut,
  fetchOutreachDocs,
  saveOutreachDoc,
  resetOutreachDoc,
} from "../lib/services";
import { buildNewsletter, TEMPLATES, defaultMonthYear, COMPACT_SECTIONS, QUICK_HIT_SECTIONS, blankCompactItem } from "../lib/newsletter";
import { validateContact, validateOrg } from "../lib/schemas";
import { blocksOf, firstHeading, parseTableBlock, serializeTable, renderInline } from "../lib/md";

/* ─── Styles ───────────────────────────────────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,300;0,400;0,700;0,900;1,400&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --black:      #030000;
    --white:      #F7F7F6;
    --cyan:       #73C4D6;
    --fuchsia:    #E10098;
    --acid:       #C6C902;
    --banana:     #FAD100;
    --cyan-lt:    #C7E7EF;
    --acid-lt:    #E9E99A;
    --fuchsia-lt: #FFCDF0;
    --banana-lt:  #FEF4C1;
    --g50:  #F9FAFB;
    --g100: #F3F4F6;
    --g200: #E5E7EB;
    --g300: #D1D5DB;
    --g400: #9CA3AF;
    --g600: #4B5563;
    --g800: #1F2937;
    --sh-sm: 0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04);
    --sh:    0 4px 14px rgba(0,0,0,0.08);
    --sh-lg: 0 12px 40px rgba(0,0,0,0.13);
  }

  body { font-family:'Lato',sans-serif; background:var(--white); color:var(--black); line-height:1.5; }
  .app { display:flex; min-height:100vh; }

  .sb { width:220px; min-width:220px; background:var(--black); display:flex; flex-direction:column; position:fixed; top:0; left:0; height:100vh; overflow-y:auto; z-index:100; transition:transform 0.2s ease; }
  .sb-brand { padding:20px 18px 16px; border-bottom:1px solid rgba(247,247,246,0.07); display:flex; align-items:flex-start; justify-content:space-between; gap:8px; }
  .sb-collapse { background:rgba(247,247,246,0.07); border:none; color:rgba(247,247,246,0.5); width:22px; height:22px; border-radius:5px; cursor:pointer; font-size:13px; line-height:1; flex-shrink:0; transition:all 0.12s; }
  .sb-collapse:hover { background:var(--cyan); color:var(--black); }
  .app-sb-collapsed .sb { transform:translateX(-100%); }
  .app-sb-collapsed .main { margin-left:0; }
  .sb-reopen { position:fixed; top:14px; left:14px; z-index:101; background:var(--black); color:var(--white); border:none; width:34px; height:34px; border-radius:7px; cursor:pointer; font-size:15px; line-height:1; box-shadow:var(--sh); transition:all 0.12s; }
  .sb-reopen:hover { background:var(--cyan); color:var(--black); }
  .sb-name { font-size:11px; font-weight:900; letter-spacing:0.18em; text-transform:uppercase; color:var(--white); }
  .sb-sub  { font-size:9px; color:var(--cyan); margin-top:3px; text-transform:uppercase; letter-spacing:0.12em; font-weight:700; }
  .sb-nav  { padding:10px; flex:1; }
  .sb-sect { font-size:8px; font-weight:700; letter-spacing:0.18em; text-transform:uppercase; color:rgba(247,247,246,0.22); padding:0 8px; margin:14px 0 4px; }
  .sb-item { display:flex; align-items:center; gap:8px; padding:8px 10px; border-radius:6px; cursor:pointer; color:rgba(247,247,246,0.5); font-size:12px; font-weight:700; transition:all 0.12s; margin-bottom:1px; }
  .sb-item:hover { background:rgba(247,247,246,0.07); color:var(--white); }
  .sb-item.on { background:var(--cyan); color:var(--black); }
  .sb-badge { margin-left:auto; background:var(--fuchsia); color:#fff; border-radius:10px; padding:1px 6px; font-size:9px; font-weight:900; min-width:18px; text-align:center; }
  .sb-item.on .sb-badge { background:var(--black); color:var(--white); }
  .sb-foot { padding:12px 18px 16px; border-top:1px solid rgba(247,247,246,0.06); margin-top:auto; }
  .sb-foot-txt { font-size:8px; color:rgba(247,247,246,0.18); text-transform:uppercase; letter-spacing:0.1em; font-weight:700; line-height:1.7; }

  .main { margin-left:220px; flex:1; transition:margin-left 0.2s ease; }
  .page { padding:30px 32px; max-width:1140px; }
  .pg-hd { margin-bottom:24px; display:flex; align-items:flex-start; justify-content:space-between; gap:14px; flex-wrap:wrap; }
  .pg-ttl { font-size:23px; font-weight:900; letter-spacing:-0.01em; }
  .pg-sub { font-size:12px; color:var(--g600); margin-top:3px; }

  .stats { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:22px; }
  .stat { background:#fff; border-radius:10px; padding:15px 17px; border:1.5px solid var(--g200); }
  .stat-lbl { font-size:8px; font-weight:700; text-transform:uppercase; letter-spacing:0.12em; color:var(--g400); margin-bottom:5px; }
  .stat-val { font-size:25px; font-weight:900; color:var(--black); }
  .stat-meta { font-size:11px; color:var(--g600); margin-top:2px; }

  .tbl-wrap { background:#fff; border-radius:12px; border:1.5px solid var(--g200); overflow:hidden; box-shadow:var(--sh-sm); }
  .tbl { width:100%; border-collapse:collapse; }
  .tbl th { text-align:left; font-size:8px; font-weight:700; text-transform:uppercase; letter-spacing:0.12em; color:var(--g400); padding:10px 14px; border-bottom:1.5px solid var(--g200); white-space:nowrap; background:var(--g50); }
  .tbl td { padding:12px 14px; border-bottom:1px solid var(--g100); vertical-align:middle; font-size:13px; }
  .tbl tbody tr:last-child td { border-bottom:none; }
  .tbl tbody tr { cursor:pointer; transition:background 0.1s; }
  .tbl tbody tr:hover { background:rgba(115,196,214,0.06); }

  .tag { display:inline-flex; align-items:center; padding:2px 8px; border-radius:20px; font-size:9px; font-weight:700; letter-spacing:0.05em; text-transform:uppercase; white-space:nowrap; }
  .t-cold     { background:var(--g100); color:var(--g600); }
  .t-warm     { background:var(--banana-lt); color:#7a5c00; }
  .t-active   { background:var(--acid-lt); color:#3a3d00; }
  .t-declined { background:var(--g200); color:var(--g600); }
  .type-tag { background:rgba(115,196,214,0.15); color:#155e6e; font-size:9px; font-weight:700; padding:2px 7px; border-radius:4px; text-transform:uppercase; letter-spacing:0.05em; }
  .type-tag-mentor { background:rgba(198,201,2,0.18); color:#3a3d00; font-size:9px; font-weight:700; padding:2px 7px; border-radius:4px; text-transform:uppercase; letter-spacing:0.05em; }

  .btn { display:inline-flex; align-items:center; gap:5px; padding:8px 14px; border-radius:7px; border:none; cursor:pointer; font-size:12px; font-weight:700; font-family:'Lato',sans-serif; transition:all 0.12s; letter-spacing:0.02em; white-space:nowrap; }
  .btn-blk { background:var(--black); color:var(--white); }
  .btn-blk:hover { background:var(--g800); transform:translateY(-1px); }
  .btn-cyan { background:var(--cyan); color:var(--black); }
  .btn-cyan:hover { filter:brightness(1.07); }
  .btn-acid { background:var(--acid); color:var(--black); }
  .btn-ghost { background:transparent; color:var(--g600); border:1.5px solid var(--g200); }
  .btn-ghost:hover { border-color:var(--g400); color:var(--black); }
  .btn-danger { background:#FEE2E2; color:#B91C1C; }
  .btn-danger:hover { background:#FECACA; }
  .btn-sm { padding:5px 10px; font-size:11px; border-radius:5px; }
  .btn-xs { padding:3px 7px; font-size:10px; border-radius:4px; }

  .fg { margin-bottom:13px; }
  .fl { display:block; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:var(--g600); margin-bottom:4px; }
  .fi,.fs,.fta { width:100%; padding:8px 11px; border:1.5px solid var(--g200); border-radius:6px; font-size:13px; font-family:'Lato',sans-serif; color:var(--black); background:#fff; outline:none; transition:border-color 0.12s; }
  .fi:focus,.fs:focus,.fta:focus { border-color:var(--cyan); box-shadow:0 0 0 2px rgba(115,196,214,0.15); }
  .fta { resize:vertical; min-height:80px; line-height:1.6; }
  .frow  { display:grid; grid-template-columns:1fr 1fr; gap:11px; }
  .frow3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:11px; }

  .card { background:#fff; border-radius:11px; border:1.5px solid var(--g200); margin-bottom:12px; box-shadow:var(--sh-sm); }
  .card-hd { padding:13px 17px; border-bottom:1px solid var(--g100); display:flex; align-items:center; justify-content:space-between; gap:10px; }
  .card-ttl { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:var(--g600); }
  .card-bd { padding:15px 17px; }

  .tabs { display:flex; border-bottom:2px solid var(--g200); margin-bottom:18px; gap:1px; }
  .tab { padding:8px 14px; border:none; background:transparent; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--g400); cursor:pointer; border-bottom:2px solid transparent; margin-bottom:-2px; font-family:'Lato',sans-serif; transition:all 0.12s; }
  .tab:hover { color:var(--black); }
  .tab.on { color:var(--black); border-bottom-color:var(--cyan); }

  /* Outreach workspace: rendered markdown docs */
  .md-doc { font-size:13px; line-height:1.65; color:var(--g800); }
  .md-doc > *:first-child { margin-top:0; }
  .md-doc h1 { font-size:19px; font-weight:900; margin:20px 0 10px; color:var(--black); line-height:1.25; }
  .md-doc h2 { font-size:15px; font-weight:900; margin:20px 0 8px; color:var(--black); padding-bottom:5px; border-bottom:1px solid var(--g200); }
  .md-doc h3 { font-size:13px; font-weight:900; margin:16px 0 6px; color:var(--black); text-transform:uppercase; letter-spacing:0.04em; }
  .md-doc h4,.md-doc h5,.md-doc h6 { font-size:12px; font-weight:700; margin:12px 0 5px; color:var(--g800); }
  .md-doc p { margin:8px 0; }
  .md-doc a { color:#2a8ca0; font-weight:700; text-decoration:none; border-bottom:1px solid rgba(42,140,160,0.35); }
  .md-doc a:hover { border-bottom-color:#2a8ca0; }
  .md-doc strong { font-weight:900; color:var(--black); }
  .md-doc code { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:11.5px; background:var(--g100); color:#155e6e; padding:1px 5px; border-radius:4px; }
  .md-doc ul,.md-doc ol { margin:8px 0 8px 20px; }
  .md-doc li { margin:3px 0; }
  .md-doc hr { border:none; border-top:1px solid var(--g200); margin:18px 0; }
  .md-doc blockquote { margin:10px 0; padding:8px 14px; border-left:3px solid var(--cyan); background:var(--cyan-lt); border-radius:0 8px 8px 0; }
  .md-doc blockquote p { margin:5px 0; font-size:12.5px; }
  .md-tbl { overflow-x:auto; margin:12px 0; }
  .md-doc table { border-collapse:collapse; font-size:12px; min-width:100%; }
  .md-doc th { text-align:left; font-weight:900; background:var(--g100); color:var(--black); padding:7px 10px; border:1px solid var(--g200); white-space:nowrap; }
  .md-doc td { padding:7px 10px; border:1px solid var(--g200); vertical-align:top; }
  .md-doc tbody tr:nth-child(even) { background:var(--g50); }

  .ws-doc { border:1px solid var(--g200); border-radius:10px; margin-bottom:12px; overflow:hidden; background:#fff; }
  .ws-doc-hd { display:flex; align-items:center; gap:10px; padding:13px 16px; cursor:pointer; user-select:none; }
  .ws-doc-hd:hover { background:var(--g50); }
  .ws-doc-ttl { font-size:13px; font-weight:900; color:var(--black); }
  .ws-doc-meta { font-size:10px; color:var(--g400); font-weight:700; text-transform:uppercase; letter-spacing:0.06em; }
  .ws-doc-caret { margin-left:auto; font-size:12px; color:var(--g400); transition:transform 0.15s; }
  .ws-doc.open .ws-doc-caret { transform:rotate(90deg); }
  .ws-doc-bd { padding:4px 18px 18px; border-top:1px solid var(--g100); }
  /* Inline block editing: each rendered block is click-to-edit in place */
  .ws-editable .md-block { border-radius:6px; padding:2px 6px; margin:0 -6px; cursor:text; transition:background 0.1s,box-shadow 0.1s; }
  .ws-editable .md-block:hover { background:rgba(115,196,214,0.12); box-shadow:inset 0 0 0 1px rgba(115,196,214,0.55); }
  .ws-editable .md-block:hover a { cursor:pointer; }
  .md-inline-edit { display:block; width:100%; font-family:'Lato',sans-serif; font-size:13px; line-height:1.6; color:var(--black); background:#fff; border:1.5px solid var(--cyan); border-radius:6px; padding:7px 9px; margin:4px 0; outline:none; resize:none; box-shadow:0 0 0 3px rgba(115,196,214,0.16); overflow:hidden; }
  /* AI rewrite panel under an editing block */
  .md-edit-wrap { margin:4px 0; }
  .ai-panel { margin-top:2px; padding:8px 10px; background:rgba(198,201,2,0.10); border:1px solid rgba(198,201,2,0.55); border-radius:6px; }
  .ai-panel-row { display:flex; align-items:center; gap:8px; }
  .ai-panel-icon { font-size:15px; line-height:1; }
  .ai-panel-input { flex:1; min-width:0; font-family:'Lato',sans-serif; font-size:12.5px; color:var(--black); background:#fff; border:1px solid var(--g200); border-radius:6px; padding:6px 9px; outline:none; }
  .ai-panel-input:focus { border-color:var(--cyan); box-shadow:0 0 0 2px rgba(115,196,214,0.22); }
  .ai-panel-input:disabled { background:var(--g100); color:var(--g600); }
  .ai-panel-err { margin-top:6px; font-size:11.5px; color:var(--fuchsia); }
  .ai-panel-hint { margin-top:6px; font-size:11px; color:var(--g600); }
  /* Excel-style per-cell table editing */
  .ws-tbl .md-cell { cursor:text; transition:background 0.1s,box-shadow 0.1s; }
  .ws-tbl .md-cell:hover { background:rgba(115,196,214,0.16); box-shadow:inset 0 0 0 1px var(--cyan); }
  .ws-tbl th.md-cell:hover { background:rgba(115,196,214,0.28); }
  .ws-tbl .md-cell:hover a { cursor:pointer; }
  .ws-tbl .md-cell-edit { padding:2px; background:rgba(115,196,214,0.10); }
  .ws-tbl .md-cell-edit .md-inline-edit { margin:0; font-size:12px; padding:5px 7px; }
  .ws-stat { background:#fff; border:1px solid var(--g200); border-radius:10px; padding:14px 16px; }
  .ws-stat-n { font-size:24px; font-weight:900; color:var(--black); line-height:1; }
  .ws-stat-l { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--g400); margin-top:5px; }

  .filter-bar { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px; align-items:center; }
  .filter-bar .fi { width:auto; flex:1; min-width:160px; max-width:260px; font-size:12px; }
  .filter-bar .fs { width:auto; font-size:12px; padding:7px 11px; }

  .detail-overlay { position:fixed; inset:0; background:rgba(3,0,0,0.35); z-index:200; display:flex; justify-content:flex-end; animation:fIn 0.15s ease; }
  .detail-panel { width:520px; max-width:95vw; background:#fff; height:100vh; overflow-y:auto; box-shadow:-8px 0 40px rgba(0,0,0,0.13); animation:slideIn 0.2s ease; display:flex; flex-direction:column; }
  @keyframes slideIn { from { transform:translateX(40px); opacity:0; } to { transform:translateX(0); opacity:1; } }
  @keyframes fIn { from { opacity:0; } to { opacity:1; } }
  .dp-hd { padding:18px 20px 14px; border-bottom:1px solid var(--g200); display:flex; align-items:flex-start; justify-content:space-between; gap:12px; position:sticky; top:0; background:#fff; z-index:10; }
  .dp-name { font-size:17px; font-weight:900; }
  .dp-sub { font-size:11px; color:var(--g600); margin-top:3px; }
  .dp-close { background:none; border:none; font-size:22px; cursor:pointer; color:var(--g400); line-height:1; }
  .dp-close:hover { color:var(--black); }
  .dp-body { padding:16px 20px; flex:1; }
  .dp-section { margin-bottom:18px; }
  .dp-sect-lbl { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.12em; color:var(--g400); margin-bottom:8px; padding-bottom:5px; border-bottom:1px solid var(--g100); }
  .dp-row { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:10px; align-items:center; }
  .dp-field { font-size:12px; color:var(--g600); margin-bottom:5px; }
  .dp-field strong { color:var(--black); font-weight:700; }

  .tp { padding:10px 12px; border-radius:8px; background:var(--banana-lt); border:1px solid rgba(250,209,0,0.25); margin-bottom:7px; cursor:pointer; transition:filter 0.12s; }
  .tp:hover { filter:brightness(0.96); }
  .tp-hd { display:flex; align-items:center; gap:8px; margin-bottom:4px; flex-wrap:wrap; }
  .tp-date { font-size:10px; font-weight:700; color:var(--g600); }
  .tp-type { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.07em; background:var(--cyan-lt); color:#155e6e; padding:1px 6px; border-radius:3px; }
  .tp-dir { font-size:9px; color:var(--g400); }
  .tp-summary { font-size:12px; line-height:1.5; color:#1a5f7a; font-weight:700; }
  .tp-next { font-size:11px; color:var(--g600); font-weight:700; margin-top:3px; }
  .tp-wrap { max-height:320px; overflow-y:auto; padding-right:2px; }
  .tp-wrap::-webkit-scrollbar { width:4px; } .tp-wrap::-webkit-scrollbar-track { background:transparent; } .tp-wrap::-webkit-scrollbar-thumb { background:var(--g300); border-radius:4px; }
  .na-hist { padding:8px 10px; border-radius:7px; background:var(--g50); border:1px solid var(--g200); margin-bottom:6px; display:flex; align-items:flex-start; gap:8px; position:relative; }
  .na-hist:hover .na-hist-del { opacity:1; }
  .na-hist-del { opacity:0; transition:opacity 0.12s; background:none; border:none; cursor:pointer; font-size:11px; color:var(--g400); padding:0; line-height:1; flex-shrink:0; margin-top:2px; }
  .na-hist-del:hover { color:var(--fuchsia); }
  .na-hist-body { flex:1; }
  .na-hist-txt { font-size:12px; color:var(--g800); line-height:1.5; }
  .na-hist-date { font-size:10px; color:var(--g400); margin-top:2px; }
  .na-hist-check { width:22px; height:22px; border-radius:50%; border:2px solid #4ade80; background:#f0fdf4; display:flex; align-items:center; justify-content:center; font-size:11px; color:#16a34a; flex-shrink:0; margin-top:1px; }

  .mover { position:fixed; inset:0; background:rgba(3,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:400; padding:20px; animation:fIn 0.15s ease; }
  .modal { background:#fff; border-radius:14px; width:100%; max-width:560px; max-height:90vh; overflow-y:auto; box-shadow:0 20px 60px rgba(0,0,0,0.18); animation:sUp 0.18s ease; }
  .modal-wide { max-width:700px; }
  @keyframes sUp { from { transform:translateY(14px); opacity:0; } to { transform:translateY(0); opacity:1; } }
  .m-hd { padding:17px 21px 13px; border-bottom:1px solid var(--g200); display:flex; justify-content:space-between; align-items:center; }
  .m-ttl { font-size:14px; font-weight:900; }
  .m-close { background:none; border:none; font-size:20px; cursor:pointer; color:var(--g400); padding:0 3px; line-height:1; }
  .m-close:hover { color:var(--black); }
  .m-bd { padding:17px 21px; }
  .m-ft { padding:13px 21px; border-top:1px solid var(--g200); display:flex; justify-content:flex-end; gap:8px; }

  .import-zone { border:2px dashed var(--g300); border-radius:12px; padding:18px; background:#fff; transition:border-color 0.15s; }
  .import-zone.active { border-color:var(--cyan); }
  .import-ta { width:100%; min-height:200px; border:none; outline:none; font-size:12px; font-family:'Courier New',monospace; line-height:1.6; color:var(--black); background:transparent; resize:vertical; }
  .preview-card { background:linear-gradient(to bottom right,rgba(115,196,214,0.08),rgba(198,201,2,0.05)); border:1.5px solid var(--cyan); border-radius:12px; padding:16px 18px; margin-top:12px; }
  .preview-name { font-size:15px; font-weight:900; margin-bottom:3px; }
  .preview-meta { font-size:11px; color:var(--g600); }

  .cal-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:4px; margin-bottom:18px; }
  .cal-day-hd { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--g400); text-align:center; padding:4px 0; }
  .cal-day { min-height:72px; border-radius:7px; border:1px solid var(--g200); padding:5px 6px; background:#fff; cursor:pointer; transition:border-color 0.12s; }
  .cal-day:hover { border-color:var(--cyan); }
  .cal-day.today { border-color:var(--cyan); background:rgba(115,196,214,0.05); }
  .cal-day.other-month { background:var(--g50); opacity:0.5; }
  .cal-date { font-size:10px; font-weight:700; color:var(--g600); margin-bottom:3px; }
  .cal-day.today .cal-date { color:var(--cyan); }
  .cal-dot { font-size:9px; font-weight:700; padding:1px 5px; border-radius:3px; margin-bottom:2px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; max-width:100%; cursor:pointer; }
  .dot-ig { background:linear-gradient(to right,#f9ce34,#ee2a7b,#6228d7); color:#fff; }
  .dot-nl { background:var(--cyan-lt); color:#155e6e; }
  .dot-draft { opacity:0.55; }

  .post-card { background:#fff; border:1.5px solid var(--g200); border-radius:10px; padding:14px 16px; margin-bottom:8px; display:flex; gap:12px; align-items:flex-start; }
  .post-platform { width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0; }
  .post-ig { background:linear-gradient(135deg,#f9ce34,#ee2a7b,#6228d7); }
  .post-nl { background:var(--cyan-lt); }
  .post-info { flex:1; min-width:0; }
  .post-status { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.07em; padding:1px 6px; border-radius:3px; }
  .ps-draft     { background:var(--banana-lt); color:#7a5c00; }
  .ps-scheduled { background:var(--cyan-lt); color:#155e6e; }
  .ps-published { background:var(--acid-lt); color:#3a3d00; }
  .ps-sent      { background:var(--acid-lt); color:#3a3d00; }

  .health-bar { height:6px; background:var(--g200); border-radius:3px; overflow:hidden; margin-top:4px; }
  .health-fill { height:100%; border-radius:3px; transition:width 0.4s ease; }

  .overdue-row { display:flex; align-items:center; justify-content:space-between; padding:9px 12px; border-radius:7px; background:#fff; border:1.5px solid var(--g200); margin-bottom:6px; gap:10px; cursor:pointer; transition:border-color 0.12s; }
  .overdue-row:hover { border-color:var(--cyan); }
  .overdue-name { font-size:13px; font-weight:700; }
  .overdue-meta { font-size:11px; color:var(--g600); }

  .sect-lbl { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:var(--g600); margin:20px 0 10px; padding-bottom:6px; border-bottom:2px solid var(--g200); }

  .toast { position:fixed; bottom:22px; right:22px; padding:11px 17px; border-radius:8px; font-size:13px; font-weight:700; z-index:9999; box-shadow:var(--sh-lg); animation:sUp 0.22s ease; }
  .t-ok  { background:var(--black); color:var(--white); }
  .t-err { background:#B91C1C; color:#fff; }

  .empty { text-align:center; padding:52px 20px; }
  .empty-ico { font-size:34px; margin-bottom:12px; }
  .empty-ttl { font-size:15px; font-weight:900; color:var(--g600); margin-bottom:6px; }
  .empty-txt { font-size:12px; color:var(--g400); max-width:300px; margin:0 auto 16px; line-height:1.6; }

  .add-row { background:var(--g50); border-radius:8px; padding:12px; border:1.5px dashed var(--g300); margin-top:10px; }
  .info-banner { background:linear-gradient(to right,rgba(115,196,214,0.1),rgba(198,201,2,0.05)); border:1.5px solid var(--cyan); border-radius:10px; padding:12px 16px; margin-bottom:14px; font-size:12px; line-height:1.7; color:var(--g800); }

::-webkit-scrollbar { width:5px; }
  ::-webkit-scrollbar-thumb { background:var(--g300); border-radius:5px; }

  .row-actions { display:flex; gap:4px; opacity:0; transition:opacity 0.12s; }
  .tbl tbody tr:hover .row-actions { opacity:1; }

  .settings-foot { position:sticky; bottom:0; background:var(--white); border-top:1.5px solid var(--g200); padding:14px 32px; margin:24px -32px -30px; display:flex; justify-content:flex-end; box-shadow:0 -4px 14px rgba(0,0,0,0.06); z-index:20; }

  .radio-group { display:flex; gap:6px; flex-wrap:wrap; }
  .radio-btn { padding:5px 12px; border-radius:6px; border:1.5px solid var(--g200); background:#fff; font-size:11px; font-weight:700; font-family:'Lato',sans-serif; cursor:pointer; color:var(--g600); transition:all 0.12s; letter-spacing:0.03em; }
  .radio-btn:hover { border-color:var(--g400); color:var(--black); }
  .radio-btn.on { background:var(--cyan); border-color:var(--cyan); color:var(--black); }
  .radio-btn.on-a { background:var(--fuchsia); border-color:var(--fuchsia); color:#fff; }
  .radio-btn.on-acid { background:var(--acid); border-color:var(--acid); color:var(--black); }

  .chip-wrap { display:flex; flex-wrap:wrap; gap:5px; padding:6px 8px; border:1.5px solid var(--g200); border-radius:6px; background:#fff; min-height:36px; cursor:text; transition:border-color 0.12s; }
  .chip-wrap:focus-within { border-color:var(--cyan); box-shadow:0 0 0 2px rgba(115,196,214,0.15); }
  .chip { display:inline-flex; align-items:center; gap:4px; background:var(--cyan-lt); color:#155e6e; border-radius:20px; padding:2px 8px; font-size:11px; font-weight:700; }
  .chip-x { background:none; border:none; cursor:pointer; color:#155e6e; font-size:13px; line-height:1; padding:0 1px; font-family:'Lato',sans-serif; }
  .chip-x:hover { color:var(--fuchsia); }
  .chip-fi { border:none; outline:none; font-size:12px; font-family:'Lato',sans-serif; color:var(--black); background:transparent; min-width:80px; flex:1; padding:1px 2px; }

  .ss-wrap { position:relative; }
  .ss-input { width:100%; padding:8px 11px; border:1.5px solid var(--g200); border-radius:6px; font-size:13px; font-family:'Lato',sans-serif; color:var(--black); background:#fff; outline:none; cursor:pointer; transition:border-color 0.12s; }
  .ss-input:focus { border-color:var(--cyan); box-shadow:0 0 0 2px rgba(115,196,214,0.15); }
  .ss-drop { position:absolute; top:calc(100% + 4px); left:0; right:0; background:#fff; border:1.5px solid var(--g200); border-radius:8px; box-shadow:var(--sh-lg); z-index:500; max-height:200px; overflow-y:auto; }
  .ss-opt { padding:8px 12px; font-size:12px; cursor:pointer; color:var(--black); transition:background 0.1s; }
  .ss-opt:hover { background:var(--g50); }
  .ss-opt.selected { background:rgba(115,196,214,0.12); font-weight:700; }
  .ss-empty { padding:10px 12px; font-size:12px; color:var(--g400); font-style:italic; }

  .drawer-toggle { display:flex; align-items:center; gap:6px; background:none; border:none; font-size:11px; font-weight:700; color:var(--g400); cursor:pointer; font-family:'Lato',sans-serif; padding:4px 0; letter-spacing:0.04em; text-transform:uppercase; margin-bottom:8px; }
  .drawer-toggle:hover { color:var(--black); }
  .drawer-divider { border:none; border-top:1px dashed var(--g200); margin:10px 0 12px; }

  .type-btn-group { display:flex; gap:5px; flex-wrap:wrap; }
  .type-btn { padding:6px 11px; border-radius:6px; border:1.5px solid var(--g200); background:#fff; font-size:11px; font-weight:700; font-family:'Lato',sans-serif; cursor:pointer; color:var(--g600); transition:all 0.12s; }
  .type-btn:hover { border-color:var(--cyan); color:var(--black); }
  .type-btn.on { background:var(--black); border-color:var(--black); color:#fff; }

  .modal-tabs { display:flex; border-bottom:2px solid var(--g200); margin:0 0 18px; padding:0; gap:1px; }
  .modal-tabs.in-modal { margin:-17px -21px 18px; padding:0 21px; }
  .modal-tab { padding:10px 14px; border:none; background:transparent; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--g400); cursor:pointer; border-bottom:2px solid transparent; margin-bottom:-2px; font-family:'Lato',sans-serif; transition:all 0.12s; }
  .modal-tab:hover { color:var(--black); }
  .modal-tab.on { color:var(--black); border-bottom-color:var(--cyan); }

  .sb-log-btn { display:flex; align-items:center; justify-content:center; gap:6px; width:100%; padding:7px 10px; border-radius:6px; border:1px solid rgba(247,247,246,0.12); background:transparent; color:rgba(247,247,246,0.45); font-size:10px; font-weight:700; font-family:'Lato',sans-serif; cursor:pointer; letter-spacing:0.06em; text-transform:uppercase; margin-bottom:10px; transition:all 0.12s; }
  .sb-log-btn:hover { background:rgba(247,247,246,0.07); color:var(--white); border-color:rgba(247,247,246,0.25); }
  .sb-out-btn { display:flex; align-items:center; justify-content:center; gap:6px; width:100%; padding:6px 10px; border-radius:6px; border:1px solid rgba(247,247,246,0.10); background:transparent; color:rgba(247,247,246,0.35); font-size:10px; font-weight:700; font-family:'Lato',sans-serif; cursor:pointer; letter-spacing:0.06em; text-transform:uppercase; margin-bottom:12px; transition:all 0.12s; }
  .sb-out-btn:hover { background:rgba(225,0,152,0.12); color:#fff; border-color:rgba(225,0,152,0.4); }

  @media (max-width:820px) {
    .main { margin-left:0; } .sb { display:none; }
    .stats { grid-template-columns:1fr 1fr; }
    .frow,.frow3 { grid-template-columns:1fr; }
    .page { padding:18px; }
    .detail-panel { width:100vw; }
  }`;

/* ─── Constants ─────────────────────────────────────────────────────────────── */
const REL_STATUS = { cold:"Cold", cool:"Cool", warm:"Warm", active:"Active" };
const REL_TYPES  = { music:"Music", art:"Art", event_host:"Event Host", community_builder:"Community Builder", partner:"Partner", attendee:"Attendee", coworking:"Coworking", showcase:"Showcase", sprout_society:"Sprout Society", other:"Other" };
// High-signal role tags shared by contacts AND orgs (orgs store these in `tags`, since they have no relationship_types). Tokens match REL_TYPES so one filter spans both.
const ORG_ROLE_TAGS = [["music","Music"],["art","Art"],["event_host","Event Host"],["community_builder","Community Builder"]];
const SEGMENTS   = { community:"Community", member:"Members", donor:"Donors", prospect:"Prospects" };
// Base bucket (mutually exclusive) — a contact lives in exactly one of these.
const SEGMENT_OPTS = [{value:"community",label:"Community"},{value:"donor",label:"Donor"},{value:"prospect",label:"Prospect"}];
// Tab row / send-list buckets: the three base buckets PLUS the additive Members flag.
const BUCKET_OPTS = [{value:"community",label:"Community"},{value:"member",label:"Members"},{value:"donor",label:"Donor"},{value:"prospect",label:"Prospect"}];
const ORG_SEGMENTS   = { active:"Active", prospect:"Prospects" };
const ORG_SEGMENT_OPTS = [{value:"active",label:"Active"},{value:"prospect",label:"Prospect"}];
// Givebutter campaigns — synced via the givebutter MCP (list_campaigns). Refresh when campaigns change.
// `id` is the stable Givebutter campaign id, stored hidden alongside the title (survives a rename).
const CAMPAIGN_OPTS = [
  {value:"",label:"— None —",id:""},
  {value:"Powered by Community",label:"Powered by Community",id:"643783"},
  {value:"Support Sprout Society",label:"Support Sprout Society",id:"634555"},
  {value:"Sprout Society Membership",label:"Sprout Society Membership",id:"635382"},
  {value:"Sprout Society Membership Scholarship",label:"Sprout Society Membership Scholarship",id:"642585"},
  {value:"Sprout Society x Designs that Donate",label:"Sprout Society x Designs that Donate",id:"619527"},
];
const campaignIdFor = (title) => CAMPAIGN_OPTS.find(o=>o.value===title)?.id || "";
const ORG_CATS   = { funder:"Funder", partner:"Partner", vendor:"Vendor", media:"Media", government:"Government" };
const CADENCE    = { active:30, warm:90, cool:120, cold:180 };
const MONTHS     = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS       = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

/* ─── Seed Data ─────────────────────────────────────────────────────────────── */
const SEED_ORGS = [{
  record_type:"organization", id:"org_brooklyn_org", name:"Brooklyn Org", category:"funder",
  website:"brooklynorg.org", relationship_status:"warm",
  primary_contact_id:"ind_donna_lennon",
  financial_relationship:{ has_given:false, total_given:0, grant_history:[] },
  notes:"Key local funder. BKO Microgrant program aligns with Sprout Society mission. Three known contacts. Application in progress.",
  touchpoints:[],
  next_action:"Submit BKO Microgrant application", next_action_date:"2026-05-31",
  createdAt:"2026-04-28T00:00:00.000Z",
}];

const SEED_CONTACTS = [
  { record_type:"individual", id:"ind_donna_lennon", first_name:"Donna", last_name:"Lennon",
    org_id:"org_brooklyn_org", email:"programs@brooklyn.org", phone:"",
    relationship_type:"community_builder", relationship_status:"warm",
    financial_relationship:{ has_given:false, total_given:0 },
    notes:"Primary contact for BKO Microgrant. Email verified via Brooklyn Org website.",
    touchpoints:[],
    next_action:"Submit application; follow up 1 week after", next_action_date:"2026-06-07",
    createdAt:"2026-04-28T00:00:00.000Z" },
  { record_type:"individual", id:"ind_jocelynne_rainey", first_name:"Jocelynne", last_name:"Rainey",
    org_id:"org_brooklyn_org", email:"", phone:"",
    relationship_type:"other", other_description:"Funder contact (role TBD)", relationship_status:"cold",
    financial_relationship:{ has_given:false, total_given:0 },
    notes:"Identified in BKO grant research. Title and contact details need verification.",
    touchpoints:[],
    next_action:"Verify title and contact info via web search", next_action_date:"2026-05-01",
    createdAt:"2026-04-28T00:00:00.000Z" },
  { record_type:"individual", id:"ind_sabrina_hargrave", first_name:"Sabrina", last_name:"Hargrave",
    org_id:"org_brooklyn_org", email:"", phone:"",
    relationship_type:"other", other_description:"Funder contact (role TBD)", relationship_status:"cold",
    financial_relationship:{ has_given:false, total_given:0 },
    notes:"Identified in BKO grant research. Title and contact details need verification.",
    touchpoints:[],
    next_action:"Verify title and contact info via web search", next_action_date:"2026-05-01",
    createdAt:"2026-04-28T00:00:00.000Z" },
];

/* ─── Utils ─────────────────────────────────────────────────────────────────── */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
const fmtDate = (d) => { if (!d) return "—"; try { return new Date(d+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}); } catch { return d; }};
const fmtMoney = (n) => (!n && n!==0) ? "—" : "$"+Number(n).toLocaleString();

// event_date (YYYY-MM-DD) shifted by N days → YYYY-MM-DD (negative = before the event)
const shiftDate = (baseISO, days) => {
  if (!baseISO) return null;
  const d = new Date(baseISO+"T12:00:00");
  if (isNaN(d.getTime())) return null;
  d.setDate(d.getDate()+days);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

// ─── Recurrence ───────────────────────────────────────────────────────────────
const todayISO = () => new Date().toISOString().slice(0,10);
// "18:30" → "6:30pm"
const fmtTime = (t) => {
  if(!t) return "";
  const [h,m] = String(t).split(":").map(Number);
  if(isNaN(h)) return t;
  const ap = h<12?"am":"pm"; const h12 = ((h+11)%12)+1;
  return `${h12}:${String(m||0).padStart(2,"0")}${ap}`;
};
const WEEKDAY_LONG = ["Sundays","Mondays","Tuesdays","Wednesdays","Thursdays","Fridays","Saturdays"];
// Next occurrence of a recurring event on/after fromISO (default today). One-time → its event_date.
// Returns null if the series has ended (past `until`) or there's no anchor date.
function nextOccurrence(ev, fromISO) {
  const r = ev.recurrence;
  if(!r || !r.frequency) return ev.event_date || null;
  const start = ev.event_date; if(!start) return null;
  const from = fromISO || todayISO();
  const fromEff = from < start ? start : from;   // never before the series start
  const parse = iso => new Date(iso+"T12:00:00");
  const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const until = r.until ? parse(r.until) : null;
  const base = parse(start);
  let occ;
  if(r.frequency==="daily") {
    occ = parse(fromEff);
  } else if(r.frequency==="weekly" || r.frequency==="biweekly") {
    const wd = (r.weekday!=null) ? r.weekday : base.getDay();
    occ = parse(fromEff); occ.setDate(occ.getDate() + ((wd - occ.getDay() + 7) % 7));
    if(r.frequency==="biweekly") {
      const first = parse(start); first.setDate(first.getDate() + ((wd - first.getDay() + 7) % 7));
      const days = Math.round((occ - first)/86400000);
      const rem = ((days % 14) + 14) % 14;
      if(rem!==0) occ.setDate(occ.getDate() + (14 - rem));
    }
  } else if(r.frequency==="monthly") {
    const dom = base.getDate(); const f = parse(fromEff);
    occ = new Date(f.getFullYear(), f.getMonth(), dom, 12);
    if(occ < f) occ = new Date(f.getFullYear(), f.getMonth()+1, dom, 12);
  } else { return ev.event_date || null; }
  if(until && occ > until) return null;
  return iso(occ);
}
// Date used for sorting/showing an event in upcoming lists (recurring → next occurrence).
const eventDisplayDate = (ev, fromISO) =>
  (ev.recurrence && ev.recurrence.frequency) ? (nextOccurrence(ev, fromISO) || ev.event_date || null) : (ev.event_date || null);
// "🔁 Weekly on Fridays · 6:30pm–8:30pm · until …"
function recurrenceSummary(ev) {
  const r = ev.recurrence; if(!r || !r.frequency) return "";
  let base;
  if(r.frequency==="weekly")        base = `Weekly on ${WEEKDAY_LONG[r.weekday??0]}`;
  else if(r.frequency==="biweekly") base = `Every 2 weeks on ${WEEKDAY_LONG[r.weekday??0]}`;
  else if(r.frequency==="monthly")  base = `Monthly`;
  else if(r.frequency==="daily")    base = `Daily`;
  else                              base = `Repeats`;
  const t = ev.start_time ? ` · ${fmtTime(ev.start_time)}${ev.end_time?`–${fmtTime(ev.end_time)}`:""}` : "";
  const until = r.until ? ` · until ${fmtDate(r.until)}` : "";
  return `🔁 ${base}${t}${until}`;
}
// Every date (YYYY-MM-DD) an event lands on within [startISO,endISO] inclusive.
// One-time events return their date if it falls in range; recurring events expand every occurrence.
function occurrencesInRange(ev, startISO, endISO) {
  const r = ev.recurrence;
  if(!r || !r.frequency) {
    const d = ev.event_date;
    return (d && d>=startISO && d<=endISO) ? [d] : [];
  }
  const out = [];
  let cursor = startISO;
  for(let i=0; i<400 && cursor<=endISO; i++) {
    const occ = nextOccurrence(ev, cursor);
    if(!occ || occ>endISO) break;
    if(occ>=startISO) out.push(occ);
    const d = new Date(occ+"T12:00:00"); d.setDate(d.getDate()+1);
    cursor = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }
  return out;
}

// Reusable event checklist templates. offset = days relative to the event date (negative = before, positive = after).
// Lead times derived from the real Sprout N Tell / Show n Tell events.
// SOURCE OF TRUTH: virtual-agency/employees/Events/deliverables/sprout-n-tell-checklist-template.md (Event Manager). Keep the two in sync.
const EVENT_CHECKLIST_TEMPLATES = {
  "Sprout N Tell": [
    { text:"Confirm Musicians",                   offset:-18 },
    { text:"Confirm Artists",                     offset:-18 },
    { text:"Artists/Music Confirmed",             offset:-16 },
    { text:"Flyers Posted",                       offset:-12 },
    { text:"Social Plan",                         offset:-9  },
    { text:"CHECK-IN system ready",               offset:-9  },
    { text:"Time Survey for Pre-Show Zoom Talk",  offset:-7  },
    { text:"FINAL Lineup and Artists",            offset:-7  },
    { text:"Room Layout (Music, Art, Furniture)", offset:-7  },
    { text:"Equipment List",                      offset:-6  },
    { text:"Pre-Show Zoom",                       offset:-5  },
    { text:"QR Codes Made",                       offset:-5  },
    { text:"QR Codes for Signage made",           offset:-4  },
    { text:"Refreshments Plan",                   offset:-4  },
    { text:"Run of Show / Soundcheck",            offset:-4  },
    { text:"QR codes and screens",                offset:-2  },
    { text:"All poster/signage printed",          offset:-2  },
    { text:"QR Codes Printed",                    offset:-1  },
    { text:"Artist signage/bio",                  offset:-1  },
    { text:"Space Decorated",                     offset:-1  },
    { text:"Hanging (art install)",               offset:-1  },
    { text:"GAMEDAY",                             offset:0   },
    { text:"THANK YOU FOLLOW UP",                 offset:7   },
  ],
};
const daysSince = (d) => d ? Math.floor((new Date()-new Date(d))/86400000) : null;
const daysUntil = (d) => d ? Math.ceil((new Date(d)-new Date())/86400000) : null;

function lastTouchDate(record) {
  const tps = record.touchpoints || [];
  if (!tps.length) return null;
  return tps.map(t=>t.date).sort().reverse()[0];
}
function isOverdue(c) {
  const limit = CADENCE[c.relationship_status];
  if (!limit) return false;
  const last = lastTouchDate(c);
  const since = last ? daysSince(last.slice(0,10)) : daysSince(c.createdAt?.slice(0,10));
  return since !== null && since > limit;
}
function healthScore(c) {
  const limit = CADENCE[c.relationship_status];
  if (!limit) return 0;
  const last = lastTouchDate(c);
  if (!last) return 10;
  const since = daysSince(last.slice(0,10));
  return Math.max(0, Math.min(100, Math.round(100-(since/limit)*100)));
}

/* ─── Small UI Components ────────────────────────────────────────────────────── */
function RelTag({status}) { return <span className={`tag t-${status||"cold"}`}>{REL_STATUS[status]||status}</span>; }
function Modal({title,onClose,children,footer,wide}) {
  const mouseDownTarget = useRef(null);
  useEffect(()=>{ const h=(e)=>{ if(e.key==="Escape") onClose(); }; document.addEventListener("keydown",h); return ()=>document.removeEventListener("keydown",h); },[onClose]);
  return (    <div className="mover"
      onMouseDown={e=>{ mouseDownTarget.current = e.target; }}
      onClick={e=>{ if (e.target===e.currentTarget && mouseDownTarget.current===e.currentTarget) onClose(); }}>
      <div className={`modal ${wide?"modal-wide":""}`}>
        <div className="m-hd"><span className="m-ttl">{title}</span><button className="m-close" onClick={onClose}>×</button></div>
        <div className="m-bd">{children}</div>
        {footer&&<div className="m-ft">{footer}</div>}
      </div>
    </div>
  );
}

/* ─── Confirm Modal ──────────────────────────────────────────────────────────── */
function ConfirmModal({message,onConfirm,onCancel,title="Confirm Delete",confirmLabel="Delete",danger=true}) {
  return (
    <Modal title={title} onClose={onCancel}
      footer={<><button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button><button className={`btn ${danger?"btn-danger":"btn-blk"} btn-sm`} onClick={onConfirm}>{confirmLabel}</button></>}>
      <p style={{fontSize:13,lineHeight:1.7,color:"var(--g800)"}}>{message}</p>
    </Modal>
  );
}

/* ─── Primitives ─────────────────────────────────────────────────────────────── */
function RadioGroup({options,value,onChange,colorMap}) {
  return (
    <div className="radio-group">
      {options.map(o=>{
        const isOn = value===o.value;
        const colorClass = isOn ? (colorMap?.[o.value] || "on") : "";
        return (
          <button key={o.value} className={`radio-btn ${colorClass}`} onClick={()=>onChange(o.value)}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function ChipInput({values,onChange,placeholder}) {
  const [input,setInput]=useState("");
  const ref=useRef(null);
  const add=(val)=>{ const v=val.trim(); if(v&&!values.includes(v)) onChange([...values,v]); setInput(""); };
  const remove=(v)=>onChange(values.filter(x=>x!==v));
  const onKey=(e)=>{
    if((e.key==="Enter"||e.key===","||e.key===" ")&&input.trim()){ e.preventDefault(); add(input); }
    if(e.key==="Backspace"&&!input&&values.length) remove(values[values.length-1]);
  };
  return (
    <div className="chip-wrap" onClick={()=>ref.current?.focus()}>
      {values.map(v=><span key={v} className="chip">{v}<button className="chip-x" onClick={e=>{e.stopPropagation();remove(v);}}>×</button></span>)}
      <input ref={ref} className="chip-fi" value={input} placeholder={values.length?"":(placeholder||"Type and press Enter…")}
        onChange={e=>setInput(e.target.value)} onKeyDown={onKey} onBlur={()=>{ if(input.trim()) add(input); }}/>
    </div>
  );
}

// comment test
function SearchSelect({options,value,onChange,placeholder,disabled}) {
  const [open,setOpen]=useState(false);
  const [query,setQuery]=useState("");
  const ref=useRef(null);
  const selected=options.find(o=>o.value===value);
  const filtered=options.filter(o=>o.label.toLowerCase().includes(query.toLowerCase()));
  useEffect(()=>{
    const h=(e)=>{ if(ref.current&&!ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown",h);
    return ()=>document.removeEventListener("mousedown",h);
  },[]);
  useEffect(()=>{
    if(!open) setQuery("");
  },[open]);
  return (
    <div className="ss-wrap" ref={ref}>
      <input className="ss-input" readOnly={!open} value={open?query:(selected?.label||"")}
        placeholder={placeholder||"Select…"}
        onFocus={()=>{ if(!disabled){ setOpen(true); setQuery(""); }}}
        onChange={e=>setQuery(e.target.value)}
        disabled={disabled}
        style={disabled?{background:"var(--g50)",color:"var(--g400)",cursor:"not-allowed"}:{}}
      />
      {open&&(
        <div className="ss-drop">
          {filtered.length===0
            ? <div className="ss-empty">No results</div>
            : filtered.map(o=>(
                <div key={o.value} className={`ss-opt ${o.value===value?"selected":""}`}
                  onMouseDown={e=>{e.preventDefault(); onChange(o.value); setOpen(false);}}>
                  {o.label}{o.meta&&<span style={{fontSize:10,color:"var(--g400)",marginLeft:6}}>{o.meta}</span>}
                </div>
              ))
          }
        </div>
      )}
    </div>
  );
}

/* ─── Affiliation Field (multi-select badges: orgs + events, grouped dropdown) ── */
// Affiliations are "badges": an organization OR an event the contact is tied to.
// Org badges live on contact.org_ids; event badges are membership in event.contact_ids.
function AffiliationField({orgs,events,orgIds,eventIds,onToggleOrg,onToggleEvent,placeholder}) {
  const [open,setOpen]=useState(false);
  const [query,setQuery]=useState("");
  const ref=useRef(null);
  useEffect(()=>{
    const h=(e)=>{ if(ref.current&&!ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown",h);
    return ()=>document.removeEventListener("mousedown",h);
  },[]);
  useEffect(()=>{ if(!open) setQuery(""); },[open]);
  const q=query.toLowerCase();
  const orgMatches=(orgs||[]).filter(o=>(o.name||"").toLowerCase().includes(q));
  const evtMatches=(events||[]).filter(ev=>(ev.name||"").toLowerCase().includes(q));
  const selOrgs=(orgs||[]).filter(o=>orgIds.includes(o.id));
  const selEvts=(events||[]).filter(ev=>eventIds.includes(ev.id));
  const chip=(key,icon,label,bg,fg,onRemove)=>(
    <span key={key} style={{display:"inline-flex",alignItems:"center",gap:4,background:bg,color:fg,fontSize:11,fontWeight:700,padding:"3px 8px",borderRadius:12}}>
      <span style={{fontSize:10}}>{icon}</span>{label}
      <span onMouseDown={e=>{e.preventDefault();e.stopPropagation();onRemove();}} title="Remove" style={{cursor:"pointer",fontWeight:900,marginLeft:1,opacity:0.65}}>✕</span>
    </span>
  );
  const opt=(on,onClick,label,meta)=>(
    <div className={`ss-opt ${on?"selected":""}`} onMouseDown={e=>{e.preventDefault();onClick();}}>
      <span style={{display:"inline-block",width:14,fontWeight:900,color:"var(--cyan)"}}>{on?"✓":""}</span>{label}
      {meta&&<span style={{fontSize:10,color:"var(--g400)",marginLeft:6}}>{meta}</span>}
    </div>
  );
  return (
    <div className="ss-wrap" ref={ref}>
      {(selOrgs.length>0||selEvts.length>0)&&<div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:6}}>
        {selOrgs.map(o=>chip(o.id,"🏢",o.name,"var(--cyan-lt)","#155e6e",()=>onToggleOrg(o.id)))}
        {selEvts.map(ev=>chip(ev.id,"🗓",ev.name||"(Unnamed)","var(--banana-lt)","#7a5c00",()=>onToggleEvent(ev.id)))}
      </div>}
      <input className="ss-input" readOnly={!open} value={open?query:""}
        placeholder={placeholder||"Add organization or event…"}
        onFocus={()=>{setOpen(true);setQuery("");}}
        onChange={e=>setQuery(e.target.value)}/>
      {open&&(
        <div className="ss-drop">
          <div style={{fontSize:10,fontWeight:800,letterSpacing:0.4,textTransform:"uppercase",color:"var(--g400)",padding:"7px 10px 3px"}}>Organizations</div>
          {orgMatches.length===0
            ? <div className="ss-empty">No organizations</div>
            : orgMatches.map(o=><div key={o.id}>{opt(orgIds.includes(o.id),()=>onToggleOrg(o.id),o.name,ORG_CATS[o.category]||o.category)}</div>)}
          <div style={{fontSize:10,fontWeight:800,letterSpacing:0.4,textTransform:"uppercase",color:"var(--g400)",padding:"7px 10px 3px",borderTop:"1px solid var(--g100)",marginTop:2}}>Events</div>
          {evtMatches.length===0
            ? <div className="ss-empty">No events</div>
            : evtMatches.map(ev=><div key={ev.id}>{opt(eventIds.includes(ev.id),()=>onToggleEvent(ev.id),ev.name||"(Unnamed)",fmtDate(ev.event_date))}</div>)}
        </div>
      )}
    </div>
  );
}

/* ─── Touchpoint Log ─────────────────────────────────────────────────────────── */
function TouchpointList({touchpoints,onAdd,onEdit}) {
  const [adding,setAdding] = useState(false);
  const [editingId,setEditingId] = useState(null);
  const [tp,setTp] = useState({date:new Date().toISOString().slice(0,10),summary:"",next_action:"",next_action_date:""});
  const [editTp,setEditTp] = useState(null);
  const blankTp = () => ({date:new Date().toISOString().slice(0,10),summary:"",next_action:"",next_action_date:""});
  const save = () => { if (!tp.summary.trim()) return; onAdd({...tp,id:uid()}); setTp(blankTp()); setAdding(false); };
  const startEdit = (t) => { setEditingId(t.id); setEditTp({...t}); setAdding(false); };
  const saveEdit = () => {
    if (!editTp.summary.trim()) return;
    if (onEdit) onEdit(editTp);
    setEditingId(null); setEditTp(null);
  };
  const cancelEdit = () => { setEditingId(null); setEditTp(null); };
  const sorted = [...(touchpoints||[])].sort((a,b)=>new Date(b.date)-new Date(a.date));
  const tpScrollable = sorted.length>=3;
  return (
    <div>
      {sorted.length===0&&!adding&&<p style={{fontSize:12,color:"var(--g400)",fontStyle:"italic",marginBottom:10}}>No touchpoints logged yet.</p>}
      <div className="tp-wrap" style={tpScrollable?{maxHeight:220,overflowY:"auto"}:{maxHeight:"none",overflowY:"visible"}}>
        {sorted.map((t,i)=>(
          editingId===t.id ? (
            <div key={t.id||i} className="add-row">
              <div className="fg"><label className="fl">Date</label><input type="date" className="fi" value={editTp.date} onChange={e=>setEditTp({...editTp,date:e.target.value})}/></div>
              <div className="fg"><label className="fl">Summary</label><textarea className="fta" rows={2} value={editTp.summary} onChange={e=>setEditTp({...editTp,summary:e.target.value})}/></div>
              <div className="frow">
                <div className="fg"><label className="fl">Next Action</label><input className="fi" value={editTp.next_action||""} onChange={e=>setEditTp({...editTp,next_action:e.target.value})} placeholder="What should happen next?"/></div>
                <div className="fg"><label className="fl">Next Action Date</label><input type="date" className="fi" value={editTp.next_action_date||""} onChange={e=>setEditTp({...editTp,next_action_date:e.target.value})}/></div>
              </div>
              <div style={{display:"flex",gap:8}}><button className="btn btn-blk btn-sm" onClick={saveEdit}>Save</button><button className="btn btn-ghost btn-sm" onClick={cancelEdit}>Cancel</button></div>
            </div>
          ) : (
            <div key={t.id||i} className="tp" onClick={()=>startEdit(t)}>
              <div className="tp-hd"><span className="tp-date">{fmtDate(t.date)}</span></div>
              <div className="tp-summary">{t.summary}</div>
              {t.next_action&&<div className="tp-next">→ {t.next_action}{t.next_action_date?` · by ${fmtDate(t.next_action_date)}`:""}</div>}
            </div>
          )
        ))}
      </div>
      {adding ? (
        <div className="add-row">
          <div className="fg"><label className="fl">Date</label><input type="date" className="fi" value={tp.date} onChange={e=>setTp({...tp,date:e.target.value})}/></div>
          <div className="fg"><label className="fl">Summary *</label><textarea className="fta" rows={2} value={tp.summary} onChange={e=>setTp({...tp,summary:e.target.value})} placeholder="What happened?"/></div>
          <div className="frow">
            <div className="fg"><label className="fl">Next Action</label><input className="fi" value={tp.next_action} onChange={e=>setTp({...tp,next_action:e.target.value})} placeholder="What should happen next?"/></div>
            <div className="fg"><label className="fl">Next Action Date</label><input type="date" className="fi" value={tp.next_action_date} onChange={e=>setTp({...tp,next_action_date:e.target.value})}/></div>
          </div>
          <div style={{display:"flex",gap:8}}><button className="btn btn-blk btn-sm" onClick={save}>Log Touchpoint</button><button className="btn btn-ghost btn-sm" onClick={()=>setAdding(false)}>Cancel</button></div>
        </div>
      ):<button className="btn btn-ghost btn-sm" style={{marginTop:8}} onClick={()=>setAdding(true)}>+ Log Touchpoint</button>}
    </div>
  );
}

/* ─── Quick Log Modal ────────────────────────────────────────────────────────── */
const STATUS_OPTS = [
  {value:"cold",label:"Cold"},{value:"cool",label:"Cool"},{value:"warm",label:"Warm"},{value:"active",label:"Active"}
];
const STATUS_OPTS_NO_DECLINED = STATUS_OPTS.filter(o=>o.value!=="declined");

function QuickLogModal({contacts,initialContactId,onLog,onClose}) {
  const today = new Date().toISOString().slice(0,10);
  const [contactId,setContactId]=useState(initialContactId||contacts[0]?.id||"");
  const [tp,setTp]=useState({date:today,summary:"",next_action:"",next_action_date:""});
  const [showExtra,setShowExtra]=useState(false);
  const contactOpts=contacts.map(c=>({value:c.id,label:`${c.first_name} ${c.last_name}`,meta:""}));
  const canSave=contactId&&tp.summary.trim();
  const save=()=>{ if(!canSave) return; onLog(contactId,{...tp,id:Date.now().toString(36)}); onClose(); };
  return (
    <Modal title="Log Touchpoint" onClose={onClose}
      footer={<><button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button><button className="btn btn-blk btn-sm" onClick={save} disabled={!canSave}>Log Touchpoint →</button></>}>
      <div className="fg"><label className="fl">Contact</label>
        <SearchSelect options={contactOpts} value={contactId} onChange={setContactId} placeholder="Search contacts…"/>
      </div>
      <div className="fg"><label className="fl">Date</label>
        <input type="date" className="fi" value={tp.date} onChange={e=>setTp({...tp,date:e.target.value})}/>
      </div>
      <div className="fg"><label className="fl">Summary *</label>
        <textarea className="fta" rows={3} value={tp.summary} placeholder="What happened?" onChange={e=>setTp({...tp,summary:e.target.value})} autoFocus/>
      </div>
      <button className="drawer-toggle" onClick={()=>setShowExtra(!showExtra)}>
        {showExtra?"▾":"▸"} Add next action
      </button>
      {showExtra&&<><hr className="drawer-divider"/>
        <div className="fg"><label className="fl">Next Action</label><input className="fi" value={tp.next_action} placeholder="What should happen next?" onChange={e=>setTp({...tp,next_action:e.target.value})}/></div>
        <div className="fg"><label className="fl">Next Action Date</label><input type="date" className="fi" value={tp.next_action_date} onChange={e=>setTp({...tp,next_action_date:e.target.value})}/></div>
      </>}
    </Modal>
  );
}

/* ─── Add Action Modal ───────────────────────────────────────────────────────── */
function AddActionModal({onSave,onClose}) {
  const [text,setText] = useState("");
  const [date,setDate] = useState("");
  const save = () => { if (!text.trim()) return; onSave(text.trim(),date); onClose(); };
  return (
    <Modal title="Add Next Action" onClose={onClose}
      footer={<><button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button><button className="btn btn-blk btn-sm" onClick={save}>Save Action →</button></>}>
      <div className="fg"><label className="fl">Action</label><input className="fi" value={text} onChange={e=>setText(e.target.value)} placeholder="What needs to happen?" autoFocus/></div>
      <div className="fg"><label className="fl">Due Date</label><input type="date" className="fi" value={date} onChange={e=>setDate(e.target.value)}/></div>
    </Modal>
  );
}

/* ─── Contact Detail Panel ───────────────────────────────────────────────────── */
function ContactDetail({contact,orgs,events,onClose,onUpdate,onEdit,showToast}) {
  const mouseDownTarget = useRef(null);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [naExpanded, setNaExpanded] = useState(false);
  const [addingAction, setAddingAction] = useState(false);
  const [segMenuOpen, setSegMenuOpen] = useState(false);
  const curSegment = contact.segment || "community";
  const moveSegment = (v) => {
    setSegMenuOpen(false);
    if (v === curSegment) return;
    onUpdate({...contact, segment:v});
    showToast(`Moved to ${SEGMENTS[v]} ✓`);
  };
  const toggleMember = () => {
    setSegMenuOpen(false);
    const next = !contact.is_member;
    onUpdate({...contact, is_member:next});
    showToast(next ? "Added to Members ✓" : "Removed from Members ✓");
  };
  useEffect(()=>{ const h=(e)=>{ if(e.key==="Escape") onClose(); }; document.addEventListener("keydown",h); return ()=>document.removeEventListener("keydown",h); },[onClose]);
  const affOrgIds = (contact.org_ids&&contact.org_ids.length)?contact.org_ids:(contact.org_id?[contact.org_id]:[]);
  const affOrgs = orgs.filter(o=>affOrgIds.includes(o.id));
  const affEvents = (events||[]).filter(ev=>(ev.contact_ids||[]).includes(contact.id));
  const org = affOrgs[0];
  const LINE_H = 1.7, FONT = 12, MAX_LINES = 6;
  const notesClamp = !notesExpanded ? {overflow:"hidden",display:"-webkit-box",WebkitLineClamp:MAX_LINES,WebkitBoxOrient:"vertical"} : {};
  const notesIsLong = (contact.notes||"").split("\n").length > MAX_LINES || (contact.notes||"").length > 420;
  const naLog = contact.next_actions_log||[];
  const [confirmDeleteNA, setConfirmDeleteNA] = useState(null);
  const uncompleteAction = (entry, idx) => {
    const newLog = naLog.filter((_,i)=>i!==idx);
    onUpdate({...contact, next_action:entry.text, next_action_date:entry.date||"", next_actions_log:newLog});
    showToast("Action restored ✓");
  };
  const deleteLogEntry = (idx) => {
    const newLog = naLog.filter((_,i)=>i!==idx);
    onUpdate({...contact, next_actions_log:newLog});
    showToast("Action removed");
  };
  const completeAction = () => {
    const prevLog = contact.next_actions_log||[];
    const archived = contact.next_action ? [{text:contact.next_action,date:contact.next_action_date||null,loggedAt:new Date().toISOString(),completed:true},...prevLog] : prevLog;
    // Also mark the matching entry in next_actions[] as completed so the dashboard clears it
    const updatedNextActions = (contact.next_actions||[]).map(a =>
      (!a.completed && a.text === contact.next_action) ? {...a, completed:true} : a
    );
    const nextActive = updatedNextActions.filter(a=>!a.completed&&a.date).sort((a,b)=>a.date.localeCompare(b.date))[0];
    onUpdate({...contact, next_action:nextActive?.text||"", next_action_date:nextActive?.date||"", next_actions_log:archived, next_actions:updatedNextActions});
    showToast("Action marked complete ✓");
  };
  const saveNewAction = (text,date) => {
    const prevLog = contact.next_actions_log||[];
    const archived = contact.next_action ? [{text:contact.next_action,date:contact.next_action_date||null,loggedAt:new Date().toISOString(),completed:false},...prevLog] : prevLog;
    const newEntry = {id:`na_${uid()}`,text,date:date||null,completed:false};
    const updatedNextActions = [newEntry,...(contact.next_actions||[])];
    onUpdate({...contact, next_action:text, next_action_date:date||"", next_actions_log:archived, next_actions:updatedNextActions});
    showToast("Next action saved ✓");
  };
  const addTp = (tp) => {
    const base = {...contact, touchpoints:[...(contact.touchpoints||[]),tp]};
    if (tp.next_action) {
      const prevLog = contact.next_actions_log||[];
      const prevEntry = contact.next_action ? [{text:contact.next_action,date:contact.next_action_date||null,loggedAt:new Date().toISOString()},...prevLog] : prevLog;
      const newEntry = tp.next_action_date ? [{id:`na_${uid()}`,text:tp.next_action.trim(),date:tp.next_action_date,completed:false}] : [];
      const updatedNextActions = [...newEntry,...(contact.next_actions||[])];
      onUpdate({...base, next_action:tp.next_action, next_action_date:tp.next_action_date||"", next_actions_log:prevEntry, next_actions:updatedNextActions});
    } else {
      onUpdate(base);
    }
    showToast("Touchpoint logged ✓");
  };
  const editTp = (updatedTp) => {
    const tps = (contact.touchpoints||[]).map(t=>t.id===updatedTp.id?updatedTp:t);
    const base = {...contact, touchpoints:tps};
    if (updatedTp.next_action) {
      const prevLog = contact.next_actions_log||[];
      const prevEntry = contact.next_action ? [{text:contact.next_action,date:contact.next_action_date||null,loggedAt:new Date().toISOString()},...prevLog] : prevLog;
      onUpdate({...base, next_action:updatedTp.next_action, next_action_date:updatedTp.next_action_date||"", next_actions_log:prevEntry});
    } else {
      onUpdate(base);
    }
    showToast("Touchpoint updated ✓");
  };
  return (
    <div className="detail-overlay"
      onMouseDown={e=>{ mouseDownTarget.current = e.target; }}
      onClick={e=>{ if (e.target===e.currentTarget && mouseDownTarget.current===e.currentTarget) onClose(); }}>
      <div className="detail-panel">
        <div className="dp-hd">
          <div><div className="dp-name">{contact.first_name} {contact.last_name}</div><div className="dp-sub">{org?org.name:""}</div></div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <button className="btn btn-ghost btn-sm" onClick={onEdit}>Edit</button>
            <button className="dp-close" onClick={onClose}>×</button>
          </div>
        </div>
        <div className="dp-body">
          <div className="dp-row"><RelTag status={contact.relationship_status}/><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{(contact.relationship_types&&contact.relationship_types.length?contact.relationship_types:[contact.relationship_type]).filter(Boolean).map(t=><span key={t} className="type-tag">{REL_TYPES[t]||t}</span>)}</div></div>
          <div className="dp-row" style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:11,fontWeight:700,color:"var(--g600)"}}>Bucket:</span>
            <span style={{fontSize:12,fontWeight:700,background:"var(--g100)",color:"var(--g800)",padding:"3px 10px",borderRadius:12}}>{SEGMENTS[curSegment]}</span>
            {contact.is_member&&<span style={{fontSize:12,fontWeight:700,background:"var(--acid)",color:"var(--black)",padding:"3px 10px",borderRadius:12}}>★ Member</span>}
            <div style={{position:"relative"}}>
              <button className="btn btn-ghost btn-xs" onClick={()=>setSegMenuOpen(o=>!o)}>Move to ▾</button>
              {segMenuOpen&&<>
                <div style={{position:"fixed",inset:0,zIndex:10}} onClick={()=>setSegMenuOpen(false)}/>
                <div style={{position:"absolute",top:"100%",left:0,marginTop:4,background:"#fff",border:"1px solid var(--g200)",borderRadius:8,boxShadow:"0 6px 20px rgba(0,0,0,0.12)",zIndex:11,minWidth:150,overflow:"hidden"}}>
                  {SEGMENT_OPTS.filter(o=>o.value!==curSegment).map(o=>(
                    <button key={o.value} onClick={()=>moveSegment(o.value)} style={{display:"block",width:"100%",textAlign:"left",padding:"8px 12px",background:"none",border:"none",cursor:"pointer",fontSize:12,fontWeight:600,color:"var(--g800)"}}
                      onMouseEnter={e=>e.currentTarget.style.background="var(--g100)"}
                      onMouseLeave={e=>e.currentTarget.style.background="none"}>{SEGMENTS[o.value]}</button>
                  ))}
                  <button onClick={toggleMember} style={{display:"block",width:"100%",textAlign:"left",padding:"8px 12px",background:"none",border:"none",borderTop:"1px solid var(--g200)",cursor:"pointer",fontSize:12,fontWeight:600,color:"var(--g800)"}}
                    onMouseEnter={e=>e.currentTarget.style.background="var(--g100)"}
                    onMouseLeave={e=>e.currentTarget.style.background="none"}>{contact.is_member?"✕ Remove from Members":"★ Add to Members"}</button>
                </div>
              </>}
            </div>
          </div>
          <div className="dp-section">
            <div className="dp-sect-lbl">Contact Details</div>
            {contact.email&&<div className="dp-field"><strong>Email:</strong> <a href={`mailto:${contact.email}`} style={{color:"var(--cyan)"}}>{contact.email}</a></div>}
            {contact.phone&&<div className="dp-field"><strong>Phone:</strong> {contact.phone}</div>}
            {contact.instagram_handle&&<div className="dp-field"><strong>Instagram:</strong> {contact.instagram_handle}</div>}
            {contact.website&&<div className="dp-field"><strong>Website:</strong> <a href={contact.website} target="_blank" rel="noreferrer" style={{color:"var(--cyan)"}}>{contact.website}</a></div>}
            {contact.how_heard&&<div className="dp-field"><strong>How they heard:</strong> {contact.how_heard}</div>}
          </div>
          {curSegment==="donor"&&contact.campaign&&<div className="dp-section">
            <div className="dp-sect-lbl">Campaign <span style={{fontSize:10,color:"var(--g400)",fontWeight:400}}>(Givebutter)</span></div>
            <span style={{display:"inline-flex",alignItems:"center",gap:4,background:"var(--banana-lt,#fff7d6)",color:"#8a6d00",fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:12}}>🎗 {contact.campaign}</span>
          </div>}
          {(affOrgs.length>0||affEvents.length>0)&&<div className="dp-section">
            <div className="dp-sect-lbl">Affiliations</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
              {affOrgs.map(o=><span key={o.id} style={{display:"inline-flex",alignItems:"center",gap:4,background:"var(--cyan-lt)",color:"#155e6e",fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:12}}>🏢 {o.name}</span>)}
              {affEvents.map(ev=><span key={ev.id} style={{display:"inline-flex",alignItems:"center",gap:4,background:"var(--banana-lt)",color:"#7a5c00",fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:12}}>🗓 {ev.name||"(Unnamed)"}</span>)}
            </div>
          </div>}
          <div className="dp-section">
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <div className="dp-sect-lbl" style={{marginBottom:0,paddingBottom:0,borderBottom:"none"}}>Next Action</div>
              <button className="btn btn-ghost btn-xs" onClick={()=>setAddingAction(true)}>+ Add Action</button>
            </div>
            <div style={{borderBottom:"1px solid var(--g100)",marginBottom:8}}/>
            {contact.next_action
              ? <div style={{background:"var(--banana-lt)",borderRadius:8,padding:"10px 12px",marginBottom:6,display:"flex",alignItems:"flex-start",gap:10}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:700}}>{contact.next_action}</div>
                    {contact.next_action_date&&<div style={{fontSize:11,color:"var(--g600)",marginTop:3}}>By {fmtDate(contact.next_action_date)}</div>}
                  </div>
                  <button onClick={completeAction} title="Mark complete" style={{background:"none",border:"2px solid var(--g300)",borderRadius:"50%",width:26,height:26,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:"var(--g400)",flexShrink:0,transition:"all 0.12s"}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--acid)";e.currentTarget.style.color="var(--acid)";}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--g300)";e.currentTarget.style.color="var(--g400)";}}>✓</button>
                  <button onClick={()=>setConfirmDeleteNA("current")} title="Delete action" style={{background:"none",border:"none",cursor:"pointer",fontSize:15,color:"var(--g300)",flexShrink:0,lineHeight:1,transition:"color 0.12s"}}
                    onMouseEnter={e=>e.currentTarget.style.color="var(--fuchsia)"}
                    onMouseLeave={e=>e.currentTarget.style.color="var(--g300)"}>✕</button>
                </div>
              : <p style={{fontSize:12,color:"var(--g400)",fontStyle:"italic",marginBottom:6}}>No action set.</p>
            }
            {naLog.length>0&&<>
              {(naExpanded?naLog:naLog.slice(0,2)).map((entry,i)=>(
                <div key={i} className="na-hist">
                  <div className="na-hist-body">
                    <div className="na-hist-txt" style={{textDecoration:entry.completed?"line-through":"none",color:entry.completed?"var(--g400)":"var(--g800)"}}>{entry.text}</div>
                    {entry.date&&<div className="na-hist-date">By {fmtDate(entry.date)}</div>}
                  </div>
                  {entry.completed&&<button onClick={()=>uncompleteAction(entry,i)} title="Restore action" className="na-hist-check" style={{cursor:"pointer",border:"2px solid #4ade80",background:"#f0fdf4"}}>✓</button>}
                  <button className="na-hist-del" onClick={()=>setConfirmDeleteNA(i)} title="Delete">✕</button>
                </div>
              ))}
              {naLog.length>2&&<button onClick={()=>setNaExpanded(x=>!x)} style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:"var(--cyan)",fontWeight:700,padding:"2px 0 0",display:"block"}}>{naExpanded?"▴ Show less":"▾ Show all previous"}</button>}
            </>}
          </div>
          {contact.notes&&<div className="dp-section">
            <div className="dp-sect-lbl">Notes</div>
            <p style={{fontSize:FONT,lineHeight:LINE_H,color:"var(--g800)",...notesClamp}}>{contact.notes}</p>
            {notesIsLong&&<button onClick={()=>setNotesExpanded(x=>!x)} style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:"var(--cyan)",fontWeight:700,padding:"4px 0 0",display:"block"}}>{notesExpanded?"▴ Show less":"▾ Show more"}</button>}
          </div>}
          <div className="dp-section">
            <div className="dp-sect-lbl">Touchpoints ({(contact.touchpoints||[]).length})</div>
            <TouchpointList touchpoints={contact.touchpoints} onAdd={addTp} onEdit={editTp}/>
          </div>
        </div>
      </div>
      {addingAction&&<AddActionModal onSave={saveNewAction} onClose={()=>setAddingAction(false)}/>}
      {confirmDeleteNA!==null&&<ConfirmModal message="Delete this action? This cannot be undone." onConfirm={()=>{ if(confirmDeleteNA==="current"){const remaining=(contact.next_actions||[]).filter(a=>a.text!==contact.next_action);const earliest=remaining.filter(a=>!a.completed&&a.date).sort((a,b)=>a.date.localeCompare(b.date))[0];onUpdate({...contact,next_action:earliest?.text||"",next_action_date:earliest?.date||"",next_actions:remaining});showToast("Action deleted");}else{deleteLogEntry(confirmDeleteNA);}setConfirmDeleteNA(null);}} onCancel={()=>setConfirmDeleteNA(null)}/>}
    </div>
  );
}

/* ─── Org Detail Panel ───────────────────────────────────────────────────────── */
function OrgDetail({org,contacts,onClose,onUpdate,onEdit,showToast}) {
  const mouseDownTarget = useRef(null);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [naExpanded, setNaExpanded] = useState(false);
  const [addingAction, setAddingAction] = useState(false);
  const curSegment = org.segment || "active";
  const moveSegment = (v) => {
    setSegMenuOpen(false);
    if (v === curSegment) return;
    onUpdate({...org, segment:v});
    showToast(`Moved to ${ORG_SEGMENTS[v]} ✓`);
  };
  useEffect(()=>{ const h=(e)=>{ if(e.key==="Escape") onClose(); }; document.addEventListener("keydown",h); return ()=>document.removeEventListener("keydown",h); },[onClose]);
  const linked = contacts.filter(c=>c.org_id===org.id);
  const completeAction = () => {
    const prevLog = org.next_actions_log||[];
    const archived = org.next_action ? [{text:org.next_action,date:org.next_action_date||null,loggedAt:new Date().toISOString(),completed:true},...prevLog] : prevLog;
    onUpdate({...org, next_action:"", next_action_date:"", next_actions_log:archived});
    showToast("Action marked complete ✓");
  };
  const saveNewAction = (text,date) => {
    const prevLog = org.next_actions_log||[];
    const archived = org.next_action ? [{text:org.next_action,date:org.next_action_date||null,loggedAt:new Date().toISOString(),completed:false},...prevLog] : prevLog;
    onUpdate({...org, next_action:text, next_action_date:date||"", next_actions_log:archived});
    showToast("Next action saved ✓");
  };
  const LINE_H = 1.7, FONT = 12, MAX_LINES = 6;
  const notesClamp = !notesExpanded ? {overflow:"hidden",display:"-webkit-box",WebkitLineClamp:MAX_LINES,WebkitBoxOrient:"vertical"} : {};
  const notesIsLong = (org.notes||"").split("\n").length > MAX_LINES || (org.notes||"").length > 420;
  const naLog = org.next_actions_log||[];
  const [confirmDeleteNA, setConfirmDeleteNA] = useState(null);
  const uncompleteAction = (entry, idx) => {
    const newLog = naLog.filter((_,i)=>i!==idx);
    onUpdate({...org, next_action:entry.text, next_action_date:entry.date||"", next_actions_log:newLog});
    showToast("Action restored ✓");
  };
  const deleteLogEntry = (idx) => {
    const newLog = naLog.filter((_,i)=>i!==idx);
    onUpdate({...org, next_actions_log:newLog});
    showToast("Action removed");
  };
  const addTp = (tp) => {
    const base = {...org, touchpoints:[...(org.touchpoints||[]),tp]};
    if (tp.next_action) {
      const prevLog = org.next_actions_log||[];
      const prevEntry = org.next_action ? [{text:org.next_action,date:org.next_action_date||null,loggedAt:new Date().toISOString()},...prevLog] : prevLog;
      onUpdate({...base, next_action:tp.next_action, next_action_date:tp.next_action_date||"", next_actions_log:prevEntry});
    } else {
      onUpdate(base);
    }
    showToast("Touchpoint logged ✓");
  };
  const editTp = (updatedTp) => {
    const tps = (org.touchpoints||[]).map(t=>t.id===updatedTp.id?updatedTp:t);
    const base = {...org, touchpoints:tps};
    if (updatedTp.next_action) {
      const prevLog = org.next_actions_log||[];
      const prevEntry = org.next_action ? [{text:org.next_action,date:org.next_action_date||null,loggedAt:new Date().toISOString()},...prevLog] : prevLog;
      onUpdate({...base, next_action:updatedTp.next_action, next_action_date:updatedTp.next_action_date||"", next_actions_log:prevEntry});
    } else {
      onUpdate(base);
    }
    showToast("Touchpoint updated ✓");
  };
  return (
    <div className="detail-overlay"
      onMouseDown={e=>{ mouseDownTarget.current = e.target; }}
      onClick={e=>{ if (e.target===e.currentTarget && mouseDownTarget.current===e.currentTarget) onClose(); }}>
      <div className="detail-panel">
        <div className="dp-hd">
          <div><div className="dp-name">{org.name}</div><div className="dp-sub">{ORG_CATS[org.category]||org.category}{org.website?` · ${org.website}`:""}</div></div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <button className="btn btn-ghost btn-sm" onClick={onEdit}>Edit</button>
            <button className="dp-close" onClick={onClose}>×</button>
          </div>
        </div>
        <div className="dp-body">
          <div className="dp-row"><RelTag status={org.relationship_status}/></div>
          <div className="dp-row" style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:11,fontWeight:700,color:"var(--g600)"}}>Bucket:</span>
            <span style={{fontSize:12,fontWeight:700,background:"var(--g100)",color:"var(--g800)",padding:"3px 10px",borderRadius:12}}>{ORG_SEGMENTS[curSegment]}</span>
            {ORG_SEGMENT_OPTS.filter(o=>o.value!==curSegment).map(o=>(
              <button key={o.value} className={o.value==="active"?"btn btn-blk btn-xs":"btn btn-ghost btn-xs"} onClick={()=>moveSegment(o.value)}>→ Move to {ORG_SEGMENTS[o.value]}</button>
            ))}
          </div>
          {linked.length>0&&<div className="dp-section"><div className="dp-sect-lbl">People ({linked.length})</div>{linked.map(c=><div key={c.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:"1px solid var(--g100)"}}><div style={{flex:1}}><div style={{fontSize:13,fontWeight:700}}>{c.first_name} {c.last_name}</div></div><RelTag status={c.relationship_status}/></div>)}</div>}
          <div className="dp-section">
            <div className="dp-sect-lbl">Contact Details</div>
            {org.category&&<div className="dp-field"><strong>Category:</strong> {ORG_CATS[org.category]||org.category}</div>}
            {org.phone&&<div className="dp-field"><strong>Phone:</strong> {org.phone}</div>}
            {org.email&&<div className="dp-field"><strong>Email:</strong> <a href={`mailto:${org.email}`} style={{color:"var(--cyan)"}}>{org.email}</a></div>}
            {org.instagram_handle&&<div className="dp-field"><strong>Instagram:</strong> {org.instagram_handle}</div>}
            {org.website&&<div className="dp-field"><strong>Website:</strong> <a href={org.website} target="_blank" rel="noreferrer" style={{color:"var(--cyan)"}}>{org.website}</a></div>}
          </div>
          <div className="dp-section">
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <div className="dp-sect-lbl" style={{marginBottom:0,paddingBottom:0,borderBottom:"none"}}>Next Action</div>
              <button className="btn btn-ghost btn-xs" onClick={()=>setAddingAction(true)}>+ Add Action</button>
            </div>
            <div style={{borderBottom:"1px solid var(--g100)",marginBottom:8}}/>
            {org.next_action
              ? <div style={{background:"var(--banana-lt)",borderRadius:8,padding:"10px 12px",marginBottom:6,display:"flex",alignItems:"flex-start",gap:10}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:700}}>{org.next_action}</div>
                    {org.next_action_date&&<div style={{fontSize:11,color:"var(--g600)",marginTop:3}}>By {fmtDate(org.next_action_date)}</div>}
                  </div>
                  <button onClick={completeAction} title="Mark complete" style={{background:"none",border:"2px solid var(--g300)",borderRadius:"50%",width:26,height:26,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:"var(--g400)",flexShrink:0,transition:"all 0.12s"}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--acid)";e.currentTarget.style.color="var(--acid)";}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--g300)";e.currentTarget.style.color="var(--g400)";}}>✓</button>
                  <button onClick={()=>setConfirmDeleteNA("current")} title="Delete action" style={{background:"none",border:"none",cursor:"pointer",fontSize:15,color:"var(--g300)",flexShrink:0,lineHeight:1,transition:"color 0.12s"}}
                    onMouseEnter={e=>e.currentTarget.style.color="var(--fuchsia)"}
                    onMouseLeave={e=>e.currentTarget.style.color="var(--g300)"}>✕</button>
                </div>
              : <p style={{fontSize:12,color:"var(--g400)",fontStyle:"italic",marginBottom:6}}>No action set.</p>
            }
            {naLog.length>0&&<>
              {(naExpanded?naLog:naLog.slice(0,2)).map((entry,i)=>(
                <div key={i} className="na-hist">
                  <div className="na-hist-body">
                    <div className="na-hist-txt" style={{textDecoration:entry.completed?"line-through":"none",color:entry.completed?"var(--g400)":"var(--g800)"}}>{entry.text}</div>
                    {entry.date&&<div className="na-hist-date">By {fmtDate(entry.date)}</div>}
                  </div>
                  {entry.completed&&<button onClick={()=>uncompleteAction(entry,i)} title="Restore action" className="na-hist-check" style={{cursor:"pointer",border:"2px solid #4ade80",background:"#f0fdf4"}}>✓</button>}
                  <button className="na-hist-del" onClick={()=>setConfirmDeleteNA(i)} title="Delete">✕</button>
                </div>
              ))}
              {naLog.length>2&&<button onClick={()=>setNaExpanded(x=>!x)} style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:"var(--cyan)",fontWeight:700,padding:"2px 0 0",display:"block"}}>{naExpanded?"▴ Show less":"▾ Show all previous"}</button>}
            </>}
          </div>
          {org.notes&&<div className="dp-section">
            <div className="dp-sect-lbl">Notes</div>
            <p style={{fontSize:FONT,lineHeight:LINE_H,...notesClamp}}>{org.notes}</p>
            {notesIsLong&&<button onClick={()=>setNotesExpanded(x=>!x)} style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:"var(--cyan)",fontWeight:700,padding:"4px 0 0",display:"block"}}>{notesExpanded?"▴ Show less":"▾ Show more"}</button>}
          </div>}
          <div className="dp-section">
            <div className="dp-sect-lbl">Touchpoints ({(org.touchpoints||[]).length})</div>
            <TouchpointList touchpoints={org.touchpoints} onAdd={addTp} onEdit={editTp}/>
          </div>
        </div>
      </div>
      {addingAction&&<AddActionModal onSave={saveNewAction} onClose={()=>setAddingAction(false)}/>}
      {confirmDeleteNA!==null&&<ConfirmModal message="Delete this action? This cannot be undone." onConfirm={()=>{if(confirmDeleteNA==="current"){onUpdate({...org,next_action:"",next_action_date:""});showToast("Action deleted");}else{deleteLogEntry(confirmDeleteNA);}setConfirmDeleteNA(null);}} onCancel={()=>setConfirmDeleteNA(null)}/>}
    </div>
  );
}

/* ─── Sidebar ────────────────────────────────────────────────────────────────── */
function Sidebar({view,setView,contacts,events,profile,onQuickLog,onCollapse}) {
  const notifCount = (() => {
    const items = [];
    contacts.forEach(c=>{
      const actions = c.next_actions||[];
      actions.filter(a=>!a.completed&&a.date).forEach(a=>items.push(a.date));
      if(!actions.length&&c.next_action&&c.next_action_date) items.push(c.next_action_date);
    });
    (events||[]).forEach(ev=>{
      (ev.checklist||[]).filter(i=>!i.completed&&i.date).forEach(i=>items.push(i.date));
    });
    return items.filter(d=>{ const n=daysUntil(d); return n!==null&&n<=3; }).length;
  })();
  const nav = [
    {section:"Overview"},
    {id:"dashboard",label:"Dashboard",icon:"📊",badge:notifCount>0?notifCount:null},
    {section:"Relationships"},
    {id:"contacts",label:"Contacts",icon:"👤"},
    {id:"orgs",label:"Organizations",icon:"🏢"},
    {id:"events",label:"Events",icon:"🗓"},
    {id:"newsletter",label:"Newsletter",icon:"📰"},
    {id:"outreach",label:"Outreach",icon:"📣"},
    {section:"Tools"},
    {id:"import",label:"Import JSON",icon:"⬇"},
    {id:"settings",label:"Settings",icon:"⚙"},
  ];
  return (
    <nav className="sb">
      <div className="sb-brand"><div><div className="sb-name">Sprout Society</div><div className="sb-sub">CRM Manager v1</div></div><button className="sb-collapse" onClick={onCollapse} title="Hide sidebar">«</button></div>
      <div className="sb-nav">
        {nav.map((item,i)=>item.section
          ? <div key={i} className="sb-sect">{item.section}</div>
          : <div key={item.id} className={`sb-item ${view===item.id?"on":""}`} onClick={()=>setView(item.id)}>
              <span>{item.icon}</span><span>{item.label}</span>
              {item.badge&&<span className="sb-badge">{item.badge}</span>}
            </div>
        )}
      </div>
<div className="sb-foot">
        <button className="sb-log-btn" onClick={onQuickLog}>+ Log Touchpoint</button>
        <button className="sb-out-btn" onClick={()=>signOut()}>⎋ Sign out</button>
        <div className="sb-foot-txt">
          {profile?.legalName||"Sprout Society Inc."}
          {profile?.ein&&<><br/>EIN {profile.ein}</>}
          {profile?.address&&<><br/>{profile.address}</>}
        </div>
      </div>
    </nav>
  );
}

/* ─── Dashboard ──────────────────────────────────────────────────────────────── */
function DashboardView({contacts,orgs,setView,openContact,events,onUpdateContacts,onUpdateEvents,showToast}) {
  const today = new Date().toISOString().slice(0,10);
  const overdue = contacts.filter(isOverdue);
  const active = contacts.filter(c=>c.relationship_status==="active").length;

  const allActions = [];
  contacts.forEach(c=>{
    const actions = c.next_actions||[];
    const activeActions = actions.filter(a=>!a.completed&&a.date);
    activeActions.forEach(a=>{
      allActions.push({type:"contact",contact:c,text:a.text,date:a.date,id:a.id});
    });
    if(!activeActions.length && c.next_action && c.next_action_date){
      allActions.push({type:"contact",contact:c,text:c.next_action,date:c.next_action_date,id:c.id+"-na"});
    }
  });
  // Orgs track a single current action in the flat next_action/next_action_date fields
  // (completed actions move to next_actions_log). They have no next_actions[] array —
  // OrgSchema omits it, so reading one here would always come back empty.
  (orgs||[]).forEach(o=>{
    if(o.next_action && o.next_action_date){
      allActions.push({type:"org",org:o,text:o.next_action,date:o.next_action_date,id:o.id+"-na"});
    }
  });
  (events||[]).forEach(ev=>{
    (ev.checklist||[]).filter(item=>!item.completed&&item.date).forEach(item=>{
      allActions.push({type:"event",event:ev,text:item.text,date:item.date,id:ev.id+"-"+item.id});
    });
  });
  allActions.sort((a,b)=>new Date(a.date)-new Date(b.date));

  const getNotiTag = (date) => {
    const d=daysUntil(date);
    if(d===null) return null;
    if(d<0) return {label:"Overdue",color:"#B91C1C"};
    if(d===0) return {label:"Due today",color:"var(--fuchsia)"};
    if(d<=3) return {label:"Due soon",color:"var(--acid)"};
    return null;
  };

  const dueSoon = allActions.filter(a=>{ const d=daysUntil(a.date); return d!==null&&d>=0&&d<=14; });
  const totalNotifications = allActions.filter(a=>{ const d=daysUntil(a.date); return d!==null&&d<=3; }).length;
  const upcomingEvents = (events||[])
    .filter(ev=>ev.status==="upcoming")
    .map(ev=>({...ev,_next:eventDisplayDate(ev,today)}))
    .filter(ev=>ev._next&&ev._next>=today)
    .sort((a,b)=>a._next.localeCompare(b._next));

  const [dashEditing,setDashEditing]=useState(null);
  const openDashEdit=(c)=>setDashEditing({...c});
  const saveDashEdit=()=>{
    onUpdateContacts(contacts.map(c=>c.id===dashEditing.id?dashEditing:c));
    setDashEditing(null);
    showToast("Contact saved ✓");
  };
  const [dashContact,setDashContact]=useState(null);
  return (
    <div className="page">
      <div className="pg-hd">
        <div>
          <div className="pg-ttl">Dashboard
            {totalNotifications>0&&<span style={{marginLeft:8,fontSize:11,fontWeight:700,background:"var(--fuchsia)",color:"#fff",borderRadius:10,padding:"2px 8px",verticalAlign:"middle"}}>{totalNotifications}</span>}
          </div>
          <div className="pg-sub">{new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}</div>
        </div>
      </div>
      <div className="stats">
        <div className="stat"><div className="stat-lbl">Total Contacts</div><div className="stat-val">{contacts.length}</div><div className="stat-meta">{orgs.length} organizations</div></div>
        <div className="stat"><div className="stat-lbl">Active Relationships</div><div className="stat-val" style={{color:"var(--cyan)"}}>{active}</div><div className="stat-meta">of {contacts.length} contacts</div></div>
        <div className="stat"><div className="stat-lbl">Overdue</div><div className="stat-val" style={{color:overdue.length>0?"var(--fuchsia)":"var(--black)"}}>{overdue.length}</div><div className="stat-meta">need contact now</div></div>
        <div className="stat"><div className="stat-lbl">Due This Week</div><div className="stat-val" style={{color:"var(--acid)"}}>{dueSoon.length}</div><div className="stat-meta">actions in 14 days</div></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>

        <div className="card">
          <div className="card-hd"><span className="card-ttl">🗓 Upcoming Events</span><button className="btn btn-ghost btn-xs" onClick={()=>setView("events")}>View all</button></div>
          <div className="card-bd">
            {upcomingEvents.length===0
              ? <p style={{fontSize:12,color:"var(--g400)",textAlign:"center",padding:"12px 0"}}>No upcoming events</p>
              : upcomingEvents.slice(0,5).map(ev=>{
                  const d=daysUntil(ev._next);
                  const tag=d===0?"Today":d===1?"Tomorrow":d!==null?`In ${d}d`:null;
                  return (
                    <div key={ev.id} className="overdue-row" onClick={()=>setView("events")}>
                      <div><div className="overdue-name">{ev.name}{ev.recurrence?.frequency?" 🔁":""}</div><div className="overdue-meta">{ev.start_time?`${fmtTime(ev.start_time)} · `:""}{ev.location||"No location"} · {(ev.contact_ids||[]).length} contacts</div></div>
                      {tag&&<span style={{fontSize:11,fontWeight:700,color:d===0?"var(--fuchsia)":d<=3?"var(--acid)":"var(--g600)",whiteSpace:"nowrap"}}>{tag}</span>}
                    </div>
                  );
                })
            }
          </div>
        </div>

        <div className="card">
          <div className="card-hd"><span className="card-ttl">📅 Next Actions</span></div>
          <div className="card-bd" style={dueSoon.length>5?{maxHeight:280,overflowY:"auto"}:{}}>
            {dueSoon.length===0
              ? <p style={{fontSize:12,color:"var(--g400)",textAlign:"center",padding:"12px 0"}}>No actions due in next 14 days</p>
              : dueSoon.map(a=>{
                  const tag=getNotiTag(a.date);
                  return (
                    <div key={a.id} className="overdue-row" onClick={()=>a.type==="contact"?setDashContact(a.contact):a.type==="org"?setView("orgs"):setView("events")}>
                      <div style={{flex:1,minWidth:0}}>
                        <div className="overdue-name">
                          {a.type==="contact"?`${a.contact.first_name} ${a.contact.last_name}`:a.type==="org"?a.org?.name||"Org":a.event?.name||"Event"}
                          {a.type==="org"&&<span style={{fontSize:10,marginLeft:6,color:"var(--g400)"}}>🏢 org</span>}
                          {a.type==="event"&&<span style={{fontSize:10,marginLeft:6,color:"var(--g400)"}}>📅 event</span>}
                        </div>
                        <div className="overdue-meta" style={{maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.text}</div>
                      </div>
                      <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2,whiteSpace:"nowrap"}}>
                        {tag&&<span style={{fontSize:10,fontWeight:700,color:tag.color,background:tag.color+"18",borderRadius:4,padding:"1px 5px"}}>{tag.label}</span>}
                        <span style={{fontSize:11,color:"var(--g600)"}}>{fmtDate(a.date)}</span>
                      </div>
                    </div>
                  );
                })
            }
          </div>
        </div>

        <div className="card" style={{gridColumn:"1/-1"}}>
          <div className="card-hd"><span className="card-ttl">⚠ Overdue Actions</span></div>
          <div className="card-bd" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,maxHeight:allActions.filter(a=>{const d=daysUntil(a.date);return d!==null&&d<0;}).length>4?260:undefined,overflowY:allActions.filter(a=>{const d=daysUntil(a.date);return d!==null&&d<0;}).length>4?"auto":"visible"}}>
            {allActions.filter(a=>{const d=daysUntil(a.date);return d!==null&&d<0;}).length===0
              ? <p style={{fontSize:12,color:"var(--g400)",textAlign:"center",padding:"12px 0",gridColumn:"1/-1"}}>No overdue actions 🎉</p>
              : allActions.filter(a=>{const d=daysUntil(a.date);return d!==null&&d<0;}).map(a=>{
                  const name=a.type==="contact"?`${a.contact.first_name} ${a.contact.last_name}`:a.type==="org"?a.org?.name||"Org":a.event?.name||"Event";
                  const daysAgo=Math.abs(Math.ceil((new Date(a.date)-new Date())/86400000));
                  return (
                    <div key={a.id} className="overdue-row" onClick={()=>a.type==="contact"?setDashContact(a.contact):a.type==="org"?setView("orgs"):setView("events")}>
                      <div><div className="overdue-name">{name}{a.type==="org"&&<span style={{fontSize:10,marginLeft:6,color:"var(--g400)"}}>🏢 org</span>}{a.type==="event"&&<span style={{fontSize:10,marginLeft:6,color:"var(--g400)"}}>📅 event</span>}</div><div className="overdue-meta">{a.text}</div></div>
                      <span style={{fontSize:11,fontWeight:700,color:"#B91C1C",whiteSpace:"nowrap"}}>{daysAgo}d ago</span>
                    </div>
                  );
                })
            }
          </div>
        </div>

      </div>
      {dashEditing&&<ContactEditModal editing={dashEditing} setEditing={setDashEditing} onSave={saveDashEdit} orgs={orgs} events={events||[]} onUpdateEvents={onUpdateEvents} onNavigate={setView}/>}
      {dashContact&&<ContactDetail contact={contacts.find(c=>c.id===dashContact.id)||dashContact} orgs={orgs} events={events||[]} onClose={()=>setDashContact(null)} onUpdate={(updated)=>{onUpdateContacts(contacts.map(c=>c.id===updated.id?updated:c));setDashContact(updated);showToast("Contact saved ✓");}} onEdit={()=>{setDashEditing({...dashContact});setDashContact(null);}} showToast={showToast}/>}
    </div>
  );
}

/* ─── Contact Edit Modal ─────────────────────────────────────────────────────── */
function ContactEditModal({editing,setEditing,onSave,orgs,events,onUpdateEvents,onNavigate,initialTab="overview"}) {
  const [eTab,setETab]=useState(initialTab);
  const [origSegment]=useState(editing.segment||"community");
  const [segConfirm,setSegConfirm]=useState(null);
  const onSegmentClick=(v)=>{
    if(v===(editing.segment||"community")) return;       // no change
    if(v===origSegment){ setEditing({...editing,segment:v}); return; }  // moving back to original bucket — no warning
    setSegConfirm(v);                                    // moving to a different bucket — warn, don't block
  };
  const toggleEventLink = (evtId) => {
    const updated = events.map(ev=>{
      const ids=ev.contact_ids||[];
      const linked=ids.includes(editing.id);
      if(ev.id===evtId) return {...ev,contact_ids:linked?ids.filter(x=>x!==editing.id):[...ids,editing.id]};
      return ev;
    });
    onUpdateEvents(updated);
  };
  const linkedEventIds = events.filter(ev=>(ev.contact_ids||[]).includes(editing.id)).map(ev=>ev.id);
  return (
    <Modal title={`Edit — ${editing.first_name} ${editing.last_name}`} wide onClose={()=>setEditing(null)}
      footer={<><button className="btn btn-ghost btn-sm" onClick={()=>setEditing(null)}>Cancel</button><button className="btn btn-blk btn-sm" onClick={onSave}>Save Changes →</button></>}>
      <div className="modal-tabs in-modal">
        {["overview","outreach log","events"].map(t=><button key={t} className={`modal-tab ${eTab===t?"on":""}`} onClick={()=>setETab(t)}>{t}</button>)}
      </div>
      {eTab==="overview"&&<>
        <div className="frow">
          <div className="fg"><label className="fl">First Name</label><input className="fi" value={editing.first_name||""} onChange={e=>setEditing({...editing,first_name:e.target.value})} autoFocus/></div>
          <div className="fg"><label className="fl">Last Name</label><input className="fi" value={editing.last_name||""} onChange={e=>setEditing({...editing,last_name:e.target.value})}/></div>
        </div>
        <div className="frow">
          <div className="fg"><label className="fl">Email</label><input type="email" className="fi" value={editing.email||""} onChange={e=>setEditing({...editing,email:e.target.value})}/></div>
          <div className="fg"><label className="fl">Phone</label><input className="fi" value={editing.phone||""} onChange={e=>setEditing({...editing,phone:e.target.value})}/></div>
        </div>
        <div className="fg"><label className="fl">Instagram</label><input className="fi" value={editing.instagram_handle||""} onChange={e=>setEditing({...editing,instagram_handle:e.target.value})} placeholder="@handle"/></div>
        <div className="fg"><label className="fl">How did you hear about us</label><input className="fi" value={editing.how_heard||""} onChange={e=>setEditing({...editing,how_heard:e.target.value})} placeholder="Referral, event, social…"/></div>
        <div className="fg"><label className="fl">Affiliation <span style={{fontSize:10,color:"var(--g400)",fontWeight:400}}>(organizations &amp; events)</span></label>
          <AffiliationField orgs={orgs} events={events}
            orgIds={editing.org_ids||(editing.org_id?[editing.org_id]:[])}
            eventIds={linkedEventIds}
            onToggleOrg={(id)=>{const cur=editing.org_ids||(editing.org_id?[editing.org_id]:[]);const next=cur.includes(id)?cur.filter(x=>x!==id):[...cur,id];setEditing({...editing,org_ids:next,org_id:next[0]||""});}}
            onToggleEvent={toggleEventLink}/>
        </div>
        <div className="fg"><label className="fl">Status</label><RadioGroup options={STATUS_OPTS} value={editing.relationship_status||"cold"} onChange={v=>setEditing({...editing,relationship_status:v})}/></div>
        <div className="fg"><label className="fl">Bucket <span style={{fontSize:10,color:"var(--g400)",fontWeight:400}}>(one at a time)</span></label><RadioGroup options={SEGMENT_OPTS} value={editing.segment||"community"} onChange={onSegmentClick}/></div>
        <div className="fg"><label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,fontWeight:600,color:"var(--g800)"}}><input type="checkbox" checked={!!editing.is_member} onChange={e=>setEditing({...editing,is_member:e.target.checked})} style={{accentColor:"var(--cyan)",cursor:"pointer"}}/> <span>★ Also a Member <span style={{fontSize:10,color:"var(--g400)",fontWeight:400}}>(stacks on top of the bucket above)</span></span></label></div>
        {editing.segment==="donor"&&<div className="fg"><label className="fl">Campaign <span style={{fontSize:10,color:"var(--g400)",fontWeight:400}}>(Givebutter)</span></label><SearchSelect options={CAMPAIGN_OPTS} value={editing.campaign||""} onChange={v=>setEditing({...editing,campaign:v,campaign_id:campaignIdFor(v)})} placeholder="Search campaigns…"/></div>}
        <div className="fg"><label className="fl">Type <span style={{fontSize:10,color:"var(--g400)",fontWeight:400}}>(select all that apply)</span></label>
          <div className="type-btn-group">
            {Object.entries(REL_TYPES).map(([v,l])=>{
              const types=editing.relationship_types||[];
              const on=types.includes(v);
              return <button key={v} className={`type-btn ${on?"on":""}`} onClick={()=>setEditing({...editing,relationship_types:on?types.filter(t=>t!==v):[...types,v]})}>{l}</button>;
            })}
          </div>
        </div>
        {(editing.relationship_types||[]).includes("other")&&<div className="fg"><label className="fl">Describe Type</label><input className="fi" value={editing.other_description||""} onChange={e=>setEditing({...editing,other_description:e.target.value})} placeholder="Describe the relationship…"/></div>}
        {(()=>{
          const nas=editing.next_actions||[];
          const [naText,setNaText]=[editing._naText||"",v=>setEditing(p=>({...p,_naText:v}))];
          const [naDate,setNaDate]=[editing._naDate||"",v=>setEditing(p=>({...p,_naDate:v}))];
          const addNA=()=>{
            if(!naText.trim()) return;
            const entry={id:`na_${uid()}`,text:naText.trim(),date:naDate||null,completed:false};
            setEditing(p=>{
              const updated=[entry,...(p.next_actions||[])];
              const earliest=updated.filter(a=>!a.completed&&a.date).sort((a,b)=>a.date.localeCompare(b.date))[0];
              return {...p,next_actions:updated,next_action:entry.text,next_action_date:earliest?.date||entry.date||"",_naText:"",_naDate:""};
            });
          };
          const toggleNA=(id)=>{
            setEditing(p=>{
              const updated=(p.next_actions||[]).map(a=>a.id===id?{...a,completed:!a.completed}:a);
              const earliest=updated.filter(a=>!a.completed&&a.date).sort((a,b)=>a.date.localeCompare(b.date))[0];
              return {...p,next_actions:updated,next_action_date:earliest?.date||""};
            });
          };
          const deleteNA=(id)=>{ showToast("Action deleted ✓"); setEditing(p=>({...p,next_actions:(p.next_actions||[]).filter(a=>a.id!==id)})); };
          const scrollable=nas.length>=3;
          return <div className="fg">
            <label className="fl">Next Actions</label>
            <div style={{display:"flex",gap:6,marginBottom:6}}>
              <input className="fi" style={{flex:1}} placeholder="New action…" value={naText} onChange={e=>setNaText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addNA()}/>
              <input type="date" className="fi" style={{width:140}} value={naDate} onChange={e=>setNaDate(e.target.value)}/>
              <button className="btn btn-blk btn-xs" onClick={addNA}>+ Add</button>
            </div>
            {nas.length>0&&(()=>{
              const active_nas=nas.filter(a=>!a.completed);
              const done_nas=nas.filter(a=>a.completed);
              const renderRow=(a)=>(
                <div key={a.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderBottom:"1px solid var(--g100)",background:a.completed?"var(--g50)":"var(--banana-lt)"}}>
                  <input type="checkbox" checked={a.completed} disabled={a.completed} onChange={()=>!a.completed&&toggleNA(a.id)} style={{cursor:a.completed?"not-allowed":"pointer",flexShrink:0}}/>
                  <div style={{flex:1,fontSize:12,opacity:a.completed?0.45:1}}>
                    <div style={{textDecoration:a.completed?"line-through":"none",fontWeight:600}}>{a.text}</div>
                    {a.date&&<div style={{fontSize:10,color:"var(--g400)"}}>{fmtDate(a.date)}</div>}
                  </div>
                  <button style={{background:"none",border:"none",cursor:"pointer",color:"var(--fuchsia)",fontWeight:900,fontSize:14,padding:"0 2px"}} onClick={e=>{e.stopPropagation();deleteNA(a.id);}}>✕</button>
                </div>
              );
              return <div style={{maxHeight:scrollable?180:undefined,overflowY:scrollable?"auto":"visible",border:"1.5px solid var(--g200)",borderRadius:6}}>
                {active_nas.map(renderRow)}
                {done_nas.length>0&&active_nas.length>0&&<div style={{borderTop:"2px solid var(--g200)"}}/>}
                {done_nas.map(renderRow)}
              </div>;
            })()}
          </div>;
        })()}
        <button className="drawer-toggle" onClick={()=>setEditing(prev=>({...prev,_showMore:!prev._showMore}))}>
          {editing._showMore?"▾":"▸"} Show more
        </button>
        {editing._showMore&&<><hr className="drawer-divider"/>
          <div className="fg"><label className="fl">Website</label><input className="fi" value={editing.website||""} onChange={e=>setEditing({...editing,website:e.target.value})} placeholder="https://example.org"/></div>
          <div className="fg"><label className="fl">Notes</label><textarea className="fta" rows={3} value={editing.notes||""} onChange={e=>setEditing({...editing,notes:e.target.value})}/></div>
        </>}
      </>}
      {eTab==="outreach log"&&<>
        <TouchpointList touchpoints={editing.touchpoints||[]} onAdd={(tp)=>{
          const base={...editing,touchpoints:[...(editing.touchpoints||[]),tp]};
          if(tp.next_action&&tp.next_action.trim()){
            const entry={id:`na_${uid()}`,text:tp.next_action.trim(),date:tp.next_action_date||null,completed:false};
            const updated=[entry,...(editing.next_actions||[])];
            const earliest=updated.filter(a=>!a.completed&&a.date).sort((a,b)=>a.date.localeCompare(b.date))[0];
            setEditing({...base,next_actions:updated,next_action:entry.text,next_action_date:earliest?.date||entry.date||""});
          } else {
            setEditing(base);
          }
        }}/>
      </>}
      {eTab==="events"&&<>
        <div className="fg">
          <label className="fl">Linked Events ({linkedEventIds.length})</label>
          <div style={{maxHeight:200,overflowY:"auto",border:"1.5px solid var(--g200)",borderRadius:6}}>
            {events.length===0&&<div style={{padding:"10px 12px",fontSize:12,color:"var(--g400)"}}>No events in CRM yet</div>}
            {events.map(ev=>{
              const on=linkedEventIds.includes(ev.id);
              return <div key={ev.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:on?"var(--cyan-lt)":"#fff",borderBottom:"1px solid var(--g100)"}}>
                <div style={{flex:1,cursor:"pointer"}} onClick={()=>toggleEventLink(ev.id)}>
                  <div style={{fontSize:13,fontWeight:700}}>{ev.name||"(Unnamed)"}</div>
                  <div style={{fontSize:10,color:"var(--g400)"}}>{fmtDate(ev.event_date)}</div>
                </div>
                <EventStatusTag status={ev.status}/>
                {on&&<span style={{color:"var(--cyan)",fontWeight:900,fontSize:14}}>✓</span>}
                {on&&<button className="btn btn-ghost btn-xs" onClick={()=>{ setEditing(null); onNavigate("events"); }}>View Event →</button>}
              </div>;
            })}
          </div>
        </div>
      </>}
      {segConfirm&&<ConfirmModal
        title="Move bucket?"
        confirmLabel={`Move to ${SEGMENTS[segConfirm]}`}
        danger={false}
        message={`${(editing.first_name||"This contact").trim()} is currently in ${SEGMENTS[origSegment]}. A contact lives in one bucket at a time, so this moves them out of ${SEGMENTS[origSegment]} and into ${SEGMENTS[segConfirm]}. Continue?`}
        onConfirm={()=>{setEditing({...editing,segment:segConfirm});setSegConfirm(null);}}
        onCancel={()=>setSegConfirm(null)}/>}
    </Modal>
  );
}

/* ─── Contacts View ──────────────────────────────────────────────────────────── */
function ContactsView({contacts,orgs,events,onUpdate,onDelete,onUpdateEvents,showToast,pendingDetail,onPendingDetailConsumed,setView}) {
  const [search,setSearch]=useState("");
  const [segment,setSegment]=useState("community");
  const [fType,setFType]=useState("all");
  const [fStatus,setFStatus]=useState("all");
  const [needsName,setNeedsName]=useState(false);
  const [hideNameless,setHideNameless]=useState(true);
  const [sortBy,setSortBy]=useState("name");
  const [perPage,setPerPage]=useState(50);
  const [page,setPage]=useState(1);
  const [selected,setSelected]=useState(null);
  const [adding,setAdding]=useState(false);
  const [ncDrawer,setNcDrawer]=useState(false);

useEffect(()=>{
  if (pendingDetail?.id) {
    setSelected(pendingDetail.id);
    onPendingDetailConsumed();
  }
},[pendingDetail, onPendingDetailConsumed]);
const blank={first_name:"",last_name:"",org_id:"",org_ids:[],_pendingEventIds:[],email:"",phone:"",instagram_handle:"",website:"",how_heard:"",relationship_types:[],relationship_status:"cold",segment:"community",is_member:false,notes:"",next_action:"",next_action_date:"",next_actions:[]};
  const [nc,setNc]=useState(blank);

// Pre-compute scores once per render, not once per table cell
  const contactMeta = useMemo(()=>{
    const m={};
    contacts.forEach(c=>{ m[c.id]={ score:healthScore(c), overdue:isOverdue(c) }; });
    return m;
  }, [contacts]);

  const segCounts=useMemo(()=>{
    const m={community:0,member:0,donor:0,prospect:0};
    contacts.forEach(c=>{ const s=c.segment||"community"; m[s]=(m[s]||0)+1; if(c.is_member) m.member+=1; });
    return m;
  }, [contacts]);

  // Members is an additive flag; the other three are the mutually-exclusive base bucket.
  const inBucket=(c,seg)=> seg==="member" ? !!c.is_member : (c.segment||"community")===seg;

  const filtered=useMemo(()=>contacts.filter(c=>{
    if (!inBucket(c,segment)) return false;
    const name=`${c.first_name} ${c.last_name} ${c.title||""}`.toLowerCase();
    if (search&&!name.includes(search.toLowerCase())) return false;
    if (fType!=="all") {
      // Prefer relationship_types array if it has entries; fall back to legacy relationship_type string
      const types = (c.relationship_types && c.relationship_types.length > 0)
        ? c.relationship_types
        : (c.relationship_type ? [c.relationship_type] : []);
      if (!types.includes(fType)) return false;
    }
    if (fStatus!=="all"&&c.relationship_status!==fStatus) return false;
    const hasName=(`${c.first_name||""}${c.last_name||""}`).trim();
    if (needsName && hasName) return false;
    if (hideNameless && !hasName) return false;
    return true;
  }), [contacts, segment, search, fType, fStatus, needsName, hideNameless]);

  // Sort the filtered set (default Name A–Z so the paginated list is scannable).
  const sorted=useMemo(()=>{
    const arr=[...filtered];
    const nameOf=c=>`${c.last_name||""} ${c.first_name||""}`.trim().toLowerCase()||(c.email||"").toLowerCase()||"zzz";
    const given=c=>Number(c.financial_relationship?.total_given||0);
    if(sortBy==="name") arr.sort((a,b)=>nameOf(a).localeCompare(nameOf(b)));
    else if(sortBy==="newest") arr.sort((a,b)=>(b.createdAt||"").localeCompare(a.createdAt||""));
    else if(sortBy==="health") arr.sort((a,b)=>(contactMeta[b.id]?.score||0)-(contactMeta[a.id]?.score||0));
    else if(sortBy==="given") arr.sort((a,b)=>given(b)-given(a));
    return arr;
  }, [filtered, sortBy, contactMeta]);

  // Pagination
  const pageCount=Math.max(1, Math.ceil(sorted.length/perPage));
  const safePage=Math.min(page, pageCount);
  const paged=useMemo(()=>sorted.slice((safePage-1)*perPage, safePage*perPage), [sorted, safePage, perPage]);
  // Reset to page 1 whenever the result set changes.
  useEffect(()=>{ setPage(1); }, [segment, search, fType, fStatus, needsName, hideNameless, sortBy, perPage]);

const [editing,setEditing]=useState(null);
  const [editingTab,setEditingTab]=useState("overview"); // pre-select tab on open
  const [confirmDelete,setConfirmDelete]=useState(null);
  const [quickLog,setQuickLog]=useState(null); // contact id or null

  const addContact=()=>{
    const id=`ind_${uid()}`;
    const {_pendingEventIds,...rest}=nc;
    const orgIds=rest.org_ids||(rest.org_id?[rest.org_id]:[]);
    const c={...rest,record_type:"individual",id,org_ids:orgIds,org_id:orgIds[0]||"",touchpoints:[],financial_relationship:{has_given:false,total_given:0},createdAt:new Date().toISOString()};
    onUpdate([...contacts,c]);
    // Apply staged event affiliations: add the new contact to each event's attendee list.
    if(_pendingEventIds&&_pendingEventIds.length&&onUpdateEvents){
      onUpdateEvents((events||[]).map(ev=>_pendingEventIds.includes(ev.id)?{...ev,contact_ids:[...(ev.contact_ids||[]),id]}:ev));
    }
    setNc(blank); setAdding(false); showToast("Contact added ✓");
  };

  const saveEdit=()=>{
    onUpdate(contacts.map(c=>c.id===editing.id?editing:c));
    setEditing(null); showToast("Contact updated ✓");
  };
  const updateContact=(updated)=>onUpdate(contacts.map(c=>c.id===updated.id?updated:c));
  const sel=contacts.find(c=>c.id===selected);

  // Export the full current bucket (Community/Donors) to a Campaign Monitor-ready CSV.
  // Ignores search/filters on purpose — CM wants the whole list. Email is required;
  // rows without one (or duplicate emails) are dropped. CM auto-applies its suppressions on import.
  const exportSegmentCSV = () => {
    const seen = new Set();
    const rows = contacts.filter(c => {
      if (!inBucket(c,segment)) return false;
      const em=(c.email||"").trim().toLowerCase();
      if(!em||seen.has(em)) return false;
      seen.add(em); return true;
    });
    if(!rows.length){ showToast(`No ${SEGMENTS[segment]} contacts have an email to export`); return; }
    const esc = s => { const v=(s==null?"":String(s)).trim(); return /[",\n\r]/.test(v)?`"${v.replace(/"/g,'""')}"`:v; };
    const csv = [["Email","First Name","Last Name"].join(",")]
      .concat(rows.map(c=>[c.email,c.first_name,c.last_name].map(esc).join(","))).join("\r\n");
    const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));
    const a=document.createElement("a"); a.href=url; a.download=`sprout-${segment}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    showToast(`Exported ${rows.length} ${SEGMENTS[segment]} → sprout-${segment}.csv ✓`);
  };

  return (
    <div className="page">
      <div className="pg-hd"><div><div className="pg-ttl">Contacts</div><div className="pg-sub">{contacts.length} individuals · {contacts.filter(isOverdue).length} overdue</div></div><button className="btn btn-blk" onClick={()=>{setNc(segment==="member"?{...blank,is_member:true}:{...blank,segment});setAdding(true);}}>+ Add to {SEGMENTS[segment]}</button></div>
      <div className="tabs">
        {BUCKET_OPTS.map(o=>(
          <button key={o.value} className={`tab ${segment===o.value?"on":""}`} onClick={()=>{setSegment(o.value);setSelected(null);}}>
            {SEGMENTS[o.value]} <span style={{opacity:0.55}}>({segCounts[o.value]||0})</span>
          </button>
        ))}
      </div>
      <div className="filter-bar">
        <input className="fi" placeholder="Search name or title…" value={search} onChange={e=>setSearch(e.target.value)}/>
        <select className="fs" value={fType} onChange={e=>setFType(e.target.value)}><option value="all">All types</option>{Object.entries(REL_TYPES).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
<select className="fs" value={fStatus} onChange={e=>setFStatus(e.target.value)}><option value="all">All statuses</option>{Object.entries(REL_STATUS).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
<select className="fs" value={sortBy} onChange={e=>setSortBy(e.target.value)} title="Sort"><option value="name">Sort: Name A–Z</option><option value="newest">Sort: Newest added</option><option value="health">Sort: Health</option>{segment==="donor"&&<option value="given">Sort: Most given</option>}</select>
<button className={`btn btn-sm ${hideNameless?"btn-blk":"btn-ghost"}`} onClick={()=>setHideNameless(v=>{const nv=!v; if(nv) setNeedsName(false); return nv;})} title="Hide contacts with no name (email-only). On by default.">🙈 Hide nameless</button>
<button className={`btn btn-sm ${needsName?"btn-blk":"btn-ghost"}`} onClick={()=>setNeedsName(v=>{const nv=!v; if(nv) setHideNameless(false); return nv;})} title="Show only contacts with no name (email-only)">👤 Needs a name</button>
{(search||fType!=="all"||fStatus!=="all"||needsName||!hideNameless)&&<button className="btn btn-ghost btn-sm" onClick={()=>{setSearch("");setFType("all");setFStatus("all");setNeedsName(false);setHideNameless(true);}}>✕ Clear</button>}
{segment!=="prospect"&&<button className="btn btn-blk btn-sm" style={{marginLeft:"auto"}} onClick={exportSegmentCSV} title={`Download all ${SEGMENTS[segment]} contacts with an email as a CSV for Campaign Monitor (ignores filters)`}>⬇ Export {SEGMENTS[segment]} CSV</button>}
      </div>
{adding&&(
        <Modal title="Add Contact" onClose={()=>{setAdding(false);setNc(blank);}}
          footer={<><button className="btn btn-ghost btn-sm" onClick={()=>{setAdding(false);setNc(blank);}}>Cancel</button><button className="btn btn-blk btn-sm" onClick={addContact}>Add Contact →</button></>}>
          <div className="frow">
            <div className="fg"><label className="fl">First Name *</label><input className="fi" value={nc.first_name} onChange={e=>setNc({...nc,first_name:e.target.value})} autoFocus/></div>
            <div className="fg"><label className="fl">Last Name *</label><input className="fi" value={nc.last_name} onChange={e=>setNc({...nc,last_name:e.target.value})}/></div>
          </div>
          <div className="fg"><label className="fl">Affiliation <span style={{fontSize:10,color:"var(--g400)",fontWeight:400}}>(organizations &amp; events)</span></label>
            <AffiliationField orgs={orgs} events={events}
              orgIds={nc.org_ids||(nc.org_id?[nc.org_id]:[])}
              eventIds={nc._pendingEventIds||[]}
              onToggleOrg={(id)=>{const cur=nc.org_ids||(nc.org_id?[nc.org_id]:[]);const next=cur.includes(id)?cur.filter(x=>x!==id):[...cur,id];setNc({...nc,org_ids:next,org_id:next[0]||""});}}
              onToggleEvent={(id)=>{const cur=nc._pendingEventIds||[];const next=cur.includes(id)?cur.filter(x=>x!==id):[...cur,id];setNc({...nc,_pendingEventIds:next});}}/>
          </div>
          <div className="fg"><label className="fl">Type <span style={{fontSize:10,color:"var(--g400)",fontWeight:400}}>(select all that apply)</span></label>
            <div className="type-btn-group">
              {Object.entries(REL_TYPES).map(([v,l])=>{
                const types=nc.relationship_types||[];
                const on=types.includes(v);
                return <button key={v} className={`type-btn ${on?"on":""}`} onClick={()=>setNc({...nc,relationship_types:on?types.filter(t=>t!==v):[...types,v]})}>{l}</button>;
              })}
            </div>
          </div>
          {(nc.relationship_types||[]).includes("other")&&<div className="fg"><label className="fl">Describe Type</label><input className="fi" value={nc.other_description||""} onChange={e=>setNc({...nc,other_description:e.target.value})} placeholder="Describe the relationship…"/></div>}
          <div className="fg"><label className="fl">Status</label>
            <RadioGroup options={STATUS_OPTS} value={nc.relationship_status} onChange={v=>setNc({...nc,relationship_status:v})}/>
          </div>
          <div className="fg"><label className="fl">Bucket</label>
            <RadioGroup options={SEGMENT_OPTS} value={nc.segment||"community"} onChange={v=>setNc({...nc,segment:v})}/>
          </div>
          <div className="fg"><label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,fontWeight:600,color:"var(--g800)"}}><input type="checkbox" checked={!!nc.is_member} onChange={e=>setNc({...nc,is_member:e.target.checked})} style={{accentColor:"var(--cyan)",cursor:"pointer"}}/> <span>★ Also a Member <span style={{fontSize:10,color:"var(--g400)",fontWeight:400}}>(stacks on top of the bucket above)</span></span></label></div>
          {nc.segment==="donor"&&<div className="fg"><label className="fl">Campaign <span style={{fontSize:10,color:"var(--g400)",fontWeight:400}}>(Givebutter)</span></label>
            <SearchSelect options={CAMPAIGN_OPTS} value={nc.campaign||""} onChange={v=>setNc({...nc,campaign:v,campaign_id:campaignIdFor(v)})} placeholder="Search campaigns…"/>
          </div>}
          <button className="drawer-toggle" onClick={()=>setNcDrawer(d=>!d)}>{ncDrawer?"▾":"▸"} More details</button>
          {ncDrawer&&<><hr className="drawer-divider"/>
            <div className="frow">
              <div className="fg"><label className="fl">Email</label><input type="email" className="fi" value={nc.email} onChange={e=>setNc({...nc,email:e.target.value})}/></div>
              <div className="fg"><label className="fl">Phone</label><input className="fi" value={nc.phone} onChange={e=>setNc({...nc,phone:e.target.value})}/></div>
            </div>
            <div className="fg"><label className="fl">Instagram</label><input className="fi" value={nc.instagram_handle||""} onChange={e=>setNc({...nc,instagram_handle:e.target.value})} placeholder="@handle"/></div>
            <div className="fg"><label className="fl">Website</label><input className="fi" value={nc.website||""} onChange={e=>setNc({...nc,website:e.target.value})} placeholder="https://example.org"/></div>
            <div className="fg"><label className="fl">How did you hear about us</label><input className="fi" value={nc.how_heard||""} onChange={e=>setNc({...nc,how_heard:e.target.value})} placeholder="Referral, event, social…"/></div>
            <div className="frow">
              <div className="fg"><label className="fl">Next Action</label><input className="fi" value={nc.next_action} onChange={e=>setNc({...nc,next_action:e.target.value})}/></div>
              <div className="fg"><label className="fl">Due Date</label><input type="date" className="fi" value={nc.next_action_date} onChange={e=>setNc({...nc,next_action_date:e.target.value})}/></div>
            </div>
            <div className="fg"><label className="fl">Notes</label><textarea className="fta" rows={2} value={nc.notes} onChange={e=>setNc({...nc,notes:e.target.value})}/></div>
          </>}
        </Modal>
      )}
      {contacts.length>0&&<div style={{fontSize:12,color:"var(--g600)",marginBottom:12,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
        <span>{sorted.length>0
          ? <>Showing <strong style={{color:"var(--black)"}}>{(safePage-1)*perPage+1}–{Math.min(safePage*perPage,sorted.length)}</strong> of <strong style={{color:"var(--black)"}}>{sorted.length}</strong> in {SEGMENTS[segment]}</>
          : <><strong style={{color:"var(--black)"}}>0</strong> of {segCounts[segment]||0} in {SEGMENTS[segment]}</>}</span>
        {(search||fType!=="all"||fStatus!=="all"||needsName)&&<span style={{fontSize:11,background:"var(--cyan-lt)",color:"#155e6e",padding:"1px 7px",borderRadius:10,fontWeight:700}}>filtered</span>}
        <span style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:6}}>
          <span style={{color:"var(--g400)"}}>Per page</span>
          <select className="fs" style={{padding:"3px 6px"}} value={perPage} onChange={e=>setPerPage(Number(e.target.value))}>
            {[20,50,100,250].map(n=><option key={n} value={n}>{n}</option>)}
          </select>
        </span>
      </div>}
      {sorted.length===0
        ? <div className="empty"><div className="empty-ico">👤</div><div className="empty-ttl">{contacts.length===0?"No contacts yet":"No results"}</div><div className="empty-txt">{contacts.length===0?"Add contacts manually or import JSON profiles from Claude.":"Try adjusting your filters."}</div></div>
      : <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>Name</th><th>Type</th><th>{segment==="donor"?"Campaign":"Affiliation"}</th><th>Status</th><th>Next Action</th><th>Health</th><th></th></tr></thead>
            <tbody>
{paged.map(c=>{
              const cOrgIds=(c.org_ids&&c.org_ids.length)?c.org_ids:(c.org_id?[c.org_id]:[]);
              const cOrgs=orgs.filter(o=>cOrgIds.includes(o.id));
              const { score, overdue: od } = contactMeta[c.id] || { score:0, overdue:false };              return <tr key={c.id} onClick={()=>setSelected(c.id)}>
                <td>{(()=>{
                  const cEvts=(events||[]).filter(ev=>(ev.contact_ids||[]).includes(c.id));
                  const confirmed=cEvts.filter(ev=>(ev.confirmed_ids||[]).includes(c.id));
                  return <div>
                    <div style={{fontWeight:700,display:"flex",alignItems:"center",gap:5}}>
                      {c.first_name} {c.last_name}
                      {od&&<span style={{background:"var(--fuchsia)",color:"#fff",fontSize:8,fontWeight:900,padding:"1px 5px",borderRadius:10}}>!</span>}
                      {confirmed.length>0&&<span title={`Confirmed: ${confirmed.map(e=>e.name).join(", ")}`} style={{background:"var(--acid)",color:"#000",fontSize:8,fontWeight:900,padding:"1px 5px",borderRadius:10}}>✓ {confirmed.length}</span>}
                      {(cEvts.length-confirmed.length)>0&&<span title={`Invited: ${cEvts.filter(ev=>!(ev.confirmed_ids||[]).includes(c.id)).map(e=>e.name).join(", ")}`} style={{background:"var(--cyan)",color:"#fff",fontSize:8,fontWeight:900,padding:"1px 5px",borderRadius:10}}>🗓 {cEvts.length-confirmed.length}</span>}
                    </div>
                    <div style={{fontSize:11,color:"var(--g400)"}}>{c.title}</div>
                  </div>;
                })()}</td>
                <td><div style={{display:"flex",flexWrap:"wrap",gap:3}}>{(c.relationship_types&&c.relationship_types.length?c.relationship_types:[c.relationship_type]).filter(Boolean).map(t=><span key={t} className="type-tag">{REL_TYPES[t]||t}</span>)}</div></td>
                <td style={{fontSize:12,color:"var(--g600)"}}>{segment==="donor"
                  ? (c.campaign?<span style={{display:"inline-flex",alignItems:"center",gap:3,background:"var(--banana-lt,#fff7d6)",color:"#8a6d00",fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:10}}>🎗 {c.campaign}</span>:"—")
                  : (cOrgs.length?<div style={{display:"flex",flexWrap:"wrap",gap:3}}>{cOrgs.map(o=><span key={o.id} style={{display:"inline-flex",alignItems:"center",gap:3,background:"var(--cyan-lt)",color:"#155e6e",fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:10}}>🏢 {o.name}</span>)}</div>:"—")}</td>
                <td><RelTag status={c.relationship_status}/></td>
                <td style={{maxWidth:160,fontSize:11,color:"var(--g600)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.next_action||"—"}</td>
                <td style={{padding:"12px 14px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <div className="health-bar" style={{width:48,margin:0}}><div className="health-fill" style={{width:`${score}%`,background:score>60?"var(--acid)":score>30?"var(--banana)":"var(--fuchsia)"}}/></div>
                    <span style={{fontSize:10,color:"var(--g400)",fontWeight:700}}>{score}</span>
                  </div>
                </td>
                <td style={{padding:"12px 14px"}}>
                  <div className="row-actions">
                    <button className="btn btn-ghost btn-xs" onClick={e=>{e.stopPropagation();setEditingTab("overview");setEditing({...c});}}>Edit</button>
                    <button className="btn btn-cyan btn-xs" onClick={e=>{e.stopPropagation();setQuickLog(c.id);}}>+ Log</button>
                    <button className="btn btn-ghost btn-xs" onClick={e=>{e.stopPropagation();setEditingTab("events");setEditing({...c});}}>+ Event</button>
                    <button className="btn btn-danger btn-xs" onClick={e=>{e.stopPropagation();setConfirmDelete(c);}}>Del</button>
                  </div>
                </td>
              </tr>;
            })}
</tbody></table></div>
      }
      {sorted.length>perPage&&<div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginTop:14}}>
        <button className="btn btn-ghost btn-sm" disabled={safePage<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>← Prev</button>
        <span style={{fontSize:12,color:"var(--g600)"}}>Page <strong style={{color:"var(--black)"}}>{safePage}</strong> of {pageCount}</span>
        <button className="btn btn-ghost btn-sm" disabled={safePage>=pageCount} onClick={()=>setPage(p=>Math.min(pageCount,p+1))}>Next →</button>
      </div>}
{sel&&<ContactDetail contact={sel} orgs={orgs} events={events||[]} onClose={()=>setSelected(null)} onUpdate={updateContact} onEdit={()=>setEditing({...sel})} showToast={showToast}/>}
{quickLog!==null&&<QuickLogModal
        contacts={contacts}
        initialContactId={quickLog}
        onLog={(cId,tp)=>{ updateContact({...contacts.find(c=>c.id===cId), touchpoints:[...(contacts.find(c=>c.id===cId)?.touchpoints||[]),tp]}); showToast("Touchpoint logged ✓"); }}
        onClose={()=>setQuickLog(null)}
      />}
{editing&&<ContactEditModal editing={editing} setEditing={setEditing} onSave={saveEdit} orgs={orgs} events={events||[]} onUpdateEvents={onUpdateEvents} onNavigate={setView} initialTab={editingTab}/>}
      {confirmDelete&&<ConfirmModal
        message={`Delete ${confirmDelete.first_name} ${confirmDelete.last_name}? This cannot be undone.`}
        onConfirm={()=>{
          if(selected===confirmDelete.id) setSelected(null);
          onDelete(confirmDelete.id);
          setConfirmDelete(null);
        }}
        onCancel={()=>setConfirmDelete(null)}
      />}

    </div>
  );
}

/* ─── Org Edit Modal ─────────────────────────────────────────────────────────── */
function OrgEditModal({editingOrg,setEditingOrg,onSave}) {
  const [oTab,setOTab]=useState("overview");
  return (
    <Modal title={`Edit — ${editingOrg.name}`} wide onClose={()=>setEditingOrg(null)}
      footer={<><button className="btn btn-ghost btn-sm" onClick={()=>setEditingOrg(null)}>Cancel</button><button className="btn btn-blk btn-sm" onClick={onSave}>Save Changes →</button></>}>
      <div className="modal-tabs in-modal">
        {["overview","touchpoint log"].map(t=><button key={t} className={`modal-tab ${oTab===t?"on":""}`} onClick={()=>setOTab(t)}>{t}</button>)}
      </div>
      {oTab==="overview"&&<>
        <div className="fg"><label className="fl">Name *</label><input className="fi" value={editingOrg.name||""} onChange={e=>setEditingOrg({...editingOrg,name:e.target.value})} autoFocus/></div>
        <div className="fg"><label className="fl">Website</label><input className="fi" value={editingOrg.website||""} onChange={e=>setEditingOrg({...editingOrg,website:e.target.value})} placeholder="https://example.org"/></div>
        <div className="fg"><label className="fl">Instagram</label><input className="fi" value={editingOrg.instagram_handle||""} onChange={e=>setEditingOrg({...editingOrg,instagram_handle:e.target.value})} placeholder="@handle"/></div>
        <div className="fg"><label className="fl">Bucket</label>
          <RadioGroup options={ORG_SEGMENT_OPTS} value={editingOrg.segment||"active"} onChange={v=>setEditingOrg({...editingOrg,segment:v})}/>
        </div>
        <div className="fg"><label className="fl">Category</label>
          <SearchSelect options={Object.entries(ORG_CATS).map(([v,l])=>({value:v,label:l}))} value={editingOrg.category||"funder"} onChange={v=>setEditingOrg({...editingOrg,category:v})}/>
        </div>
        <div className="fg"><label className="fl">Type <span style={{fontSize:10,color:"var(--g400)",fontWeight:400}}>(select all that apply)</span></label>
          <div className="type-btn-group">
            {ORG_ROLE_TAGS.map(([v,l])=>{
              const tags=editingOrg.tags||[]; const on=tags.includes(v);
              return <button key={v} className={`type-btn ${on?"on":""}`} onClick={()=>setEditingOrg({...editingOrg,tags:on?tags.filter(t=>t!==v):[...tags,v]})}>{l}</button>;
            })}
          </div>
        </div>
        <div className="fg"><label className="fl">Status</label>
          <RadioGroup options={STATUS_OPTS_NO_DECLINED} value={editingOrg.relationship_status||"cold"} onChange={v=>setEditingOrg({...editingOrg,relationship_status:v})}/>
        </div>
        <button className="drawer-toggle" onClick={()=>setEditingOrg(o=>({...o,_showMore:!o._showMore}))}>
          {editingOrg._showMore?"▾":"▸"} Show more
        </button>
        {editingOrg._showMore&&<><hr className="drawer-divider"/>
          <div className="frow">
            <div className="fg"><label className="fl">Phone</label><input className="fi" value={editingOrg.phone||""} onChange={e=>setEditingOrg({...editingOrg,phone:e.target.value})}/></div>
            <div className="fg"><label className="fl">Email</label><input type="email" className="fi" value={editingOrg.email||""} onChange={e=>setEditingOrg({...editingOrg,email:e.target.value})}/></div>
          </div>
          <div className="fg"><label className="fl">Notes</label><textarea className="fta" rows={3} value={editingOrg.notes||""} onChange={e=>setEditingOrg({...editingOrg,notes:e.target.value})}/></div>
        </>}
      </>}
      {oTab==="touchpoint log"&&<>
        <TouchpointList touchpoints={editingOrg.touchpoints||[]} onAdd={(tp)=>setEditingOrg({...editingOrg,touchpoints:[...(editingOrg.touchpoints||[]),tp]})}/>
      </>}
    </Modal>
  );
}

/* ─── Organizations View ─────────────────────────────────────────────────────── */
function OrgsView({orgs,contacts,onUpdate,onDelete,showToast}) {
  const [search,setSearch]=useState("");
  const [fCat,setFCat]=useState("all");
  const [fStatus,setFStatus]=useState("all");
  const [segment,setSegment]=useState("active");
  const [selected,setSelected]=useState(null);
  const [adding,setAdding]=useState(false);
const blank={name:"",category:"funder",segment:"active",website:"",instagram_handle:"",phone:"",email:"",relationship_status:"cold",tags:[],notes:"",next_action:"",next_action_date:"",primary_contact_id:""};
  const [no,setNo]=useState(blank);
  const [noDrawer,setNoDrawer]=useState(false);

  const segCounts=useMemo(()=>{const c={};orgs.forEach(o=>{const s=o.segment||"active";c[s]=(c[s]||0)+1;});return c;},[orgs]);

const filtered=useMemo(()=>orgs.filter(o=>{
    if ((o.segment||"active")!==segment) return false;
    if (search&&!o.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (fCat!=="all"&&o.category!==fCat) return false;
    if (fStatus!=="all"&&o.relationship_status!==fStatus) return false;
    return true;
  }),[orgs,segment,search,fCat,fStatus]);

const [editingOrg,setEditingOrg]=useState(null);
  const [confirmDeleteOrg,setConfirmDeleteOrg]=useState(null);

  const saveEditOrg=()=>{
    onUpdate(orgs.map(o=>o.id===editingOrg.id?editingOrg:o));
    setEditingOrg(null); showToast("Organization updated ✓");
  };

  const addOrg=()=>{
    if (!no.name.trim()) return;
    const o={...no,record_type:"organization",id:`org_${uid()}`,segment:no.segment||segment,primary_contact_id:"",financial_relationship:{has_given:false,total_given:0,grant_history:[]},touchpoints:[],createdAt:new Date().toISOString()};
    onUpdate([...orgs,o]); setNo({...blank,segment}); setAdding(false); showToast("Organization added ✓");
  };
  const updateOrg=(updated)=>onUpdate(orgs.map(o=>o.id===updated.id?updated:o));
  const sel=orgs.find(o=>o.id===selected);

  return (
    <div className="page">
      <div className="pg-hd"><div><div className="pg-ttl">Organizations</div><div className="pg-sub">{orgs.length} organizations tracked</div></div><button className="btn btn-blk" onClick={()=>{setNo({...blank,segment});setAdding(true);}}>+ Add to {ORG_SEGMENTS[segment]}</button></div>
      <div className="tabs">
        {ORG_SEGMENT_OPTS.map(o=>(
          <button key={o.value} className={`tab ${segment===o.value?"on":""}`} onClick={()=>{setSegment(o.value);setSelected(null);}}>
            {ORG_SEGMENTS[o.value]} <span style={{opacity:0.55}}>({segCounts[o.value]||0})</span>
          </button>
        ))}
      </div>
      <div className="filter-bar">
        <input className="fi" placeholder="Search organizations…" value={search} onChange={e=>setSearch(e.target.value)}/>
        <select className="fs" value={fCat} onChange={e=>setFCat(e.target.value)}><option value="all">All categories</option>{Object.entries(ORG_CATS).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
<select className="fs" value={fStatus} onChange={e=>setFStatus(e.target.value)}><option value="all">All statuses</option>{Object.entries(REL_STATUS).filter(([v])=>v!=="declined").map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
        {(search||fCat!=="all"||fStatus!=="all")&&<button className="btn btn-ghost btn-sm" onClick={()=>{setSearch("");setFCat("all");setFStatus("all");}}>✕ Clear</button>}
      </div>
{adding&&(
        <Modal title="Add Organization" onClose={()=>{setAdding(false);setNo(blank);}}
          footer={<><button className="btn btn-ghost btn-sm" onClick={()=>{setAdding(false);setNo(blank);}}>Cancel</button><button className="btn btn-blk btn-sm" onClick={addOrg} disabled={!no.name.trim()}>Add Organization →</button></>}>
          <div className="fg"><label className="fl">Name *</label><input className="fi" value={no.name} onChange={e=>setNo({...no,name:e.target.value})} autoFocus/></div>
          <div className="fg"><label className="fl">Website</label><input className="fi" value={no.website} onChange={e=>setNo({...no,website:e.target.value})} placeholder="https://example.org"/></div>
          <div className="fg"><label className="fl">Bucket</label>
            <RadioGroup options={ORG_SEGMENT_OPTS} value={no.segment||"active"} onChange={v=>setNo({...no,segment:v})}/>
          </div>
          <div className="fg"><label className="fl">Category</label>
            <SearchSelect options={Object.entries(ORG_CATS).map(([v,l])=>({value:v,label:l}))} value={no.category} onChange={v=>setNo({...no,category:v})}/>
          </div>
          <div className="fg"><label className="fl">Type <span style={{fontSize:10,color:"var(--g400)",fontWeight:400}}>(select all that apply)</span></label>
            <div className="type-btn-group">
              {ORG_ROLE_TAGS.map(([v,l])=>{
                const tags=no.tags||[]; const on=tags.includes(v);
                return <button key={v} className={`type-btn ${on?"on":""}`} onClick={()=>setNo({...no,tags:on?tags.filter(t=>t!==v):[...tags,v]})}>{l}</button>;
              })}
            </div>
          </div>
          <div className="fg"><label className="fl">Status</label>
            <RadioGroup options={STATUS_OPTS_NO_DECLINED} value={no.relationship_status} onChange={v=>setNo({...no,relationship_status:v})}/>
          </div>
          <button className="drawer-toggle" onClick={()=>setNoDrawer(d=>!d)}>{noDrawer?"▾":"▸"} More details</button>
          {noDrawer&&<><hr className="drawer-divider"/>
            <div className="fg"><label className="fl">Instagram</label><input className="fi" value={no.instagram_handle||""} onChange={e=>setNo({...no,instagram_handle:e.target.value})} placeholder="@handle"/></div>
            <div className="frow">
              <div className="fg"><label className="fl">Phone</label><input className="fi" value={no.phone||""} onChange={e=>setNo({...no,phone:e.target.value})}/></div>
              <div className="fg"><label className="fl">Email</label><input type="email" className="fi" value={no.email||""} onChange={e=>setNo({...no,email:e.target.value})}/></div>
            </div>
            <div className="fg"><label className="fl">Notes</label><textarea className="fta" rows={2} value={no.notes} onChange={e=>setNo({...no,notes:e.target.value})}/></div>
          </>}
        </Modal>
      )}
      {filtered.length===0
        ? <div className="empty"><div className="empty-ico">🏢</div><div className="empty-ttl">No {ORG_SEGMENTS[segment]} organizations</div><div className="empty-txt">Add organizations manually or import JSON from Claude.</div></div>
        : <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Organization</th><th>Category</th><th>Type</th><th>Status</th><th>Next Action</th><th>Given</th><th></th></tr></thead><tbody>
            {filtered.map(o=>{
              return <tr key={o.id} onClick={()=>setSelected(o.id)}>
                <td><div style={{fontWeight:700}}>{o.name}</div><div style={{fontSize:11,color:"var(--g400)"}}>{o.website||""}</div></td>
                <td><span className="type-tag">{ORG_CATS[o.category]||o.category}</span></td>
                <td><div style={{display:"flex",flexWrap:"wrap",gap:3}}>{(o.tags||[]).filter(t=>REL_TYPES[t]).map(t=><span key={t} className="type-tag">{REL_TYPES[t]}</span>)}</div></td>
                <td><RelTag status={o.relationship_status}/></td>
                <td style={{maxWidth:160,fontSize:11,color:"var(--g600)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{o.next_action||"—"}</td>
<td style={{fontSize:12}}>{o.financial_relationship?.has_given?fmtMoney(o.financial_relationship.total_given):<span style={{color:"var(--g400)"}}>—</span>}</td>
<td style={{padding:"12px 14px"}}>
                  <div className="row-actions">
                    {ORG_SEGMENT_OPTS.filter(s=>s.value!==(o.segment||"active")).map(s=>(
                      <button key={s.value} className={s.value==="active"?"btn btn-blk btn-xs":"btn btn-ghost btn-xs"} onClick={e=>{e.stopPropagation();updateOrg({...o,segment:s.value});showToast(`Moved to ${ORG_SEGMENTS[s.value]} ✓`);}}>→ {ORG_SEGMENTS[s.value]}</button>
                    ))}
                    <button className="btn btn-ghost btn-xs" onClick={e=>{e.stopPropagation();setEditingOrg({...o});}}>Edit</button>
                    <button className="btn btn-danger btn-xs" onClick={e=>{e.stopPropagation();setConfirmDeleteOrg(o);}}>Del</button>
                  </div>
                </td>
              </tr>;
            })}
          </tbody></table></div>
      }
{sel&&<OrgDetail org={sel} contacts={contacts} onClose={()=>setSelected(null)} onUpdate={updateOrg} onEdit={()=>setEditingOrg({...sel})} showToast={showToast}/>}
      {confirmDeleteOrg&&<ConfirmModal message={`Delete ${confirmDeleteOrg.name}? This cannot be undone.`} onConfirm={()=>{if(selected===confirmDeleteOrg.id)setSelected(null);onDelete(confirmDeleteOrg.id);setConfirmDeleteOrg(null);}} onCancel={()=>setConfirmDeleteOrg(null)}/>}

{editingOrg&&<OrgEditModal editingOrg={editingOrg} setEditingOrg={setEditingOrg} onSave={saveEditOrg}/>}
    </div>
  );
}

/* ─── Outreach Workspace ─────────────────────────────────────────────────────── */
// An auto-growing textarea used for inline block editing.
function AutoGrow({value,...props}) {
  const ref=useRef(null);
  const fit=()=>{ const el=ref.current; if(el){ el.style.height="auto"; el.style.height=(el.scrollHeight+2)+"px"; } };
  useEffect(()=>{ fit(); },[]); // size on mount
  return <textarea ref={ref} className="md-inline-edit" value={value} spellCheck={false}
    onInput={fit} {...props}/>;
}

// A markdown table rendered with Excel-style per-cell editing: click any cell (or
// header) and only that cell becomes an editable field. On commit it re-serializes
// the whole table's markdown and hands it back via onSave.
function TableBlock({raw,onSave}) {
  const {header,rows}=useMemo(()=>parseTableBlock(raw),[raw]);
  const [edit,setEdit]=useState(null); // {r,c}; r=-1 => header row
  const [draft,setDraft]=useState("");
  const cancelRef=useRef(false);

  const cellRaw=(r,c)=> r<0 ? (header[c]??"") : (rows[r]?.[c]??"");
  const openCell=(r,c)=>{ cancelRef.current=false; setEdit({r,c}); setDraft(cellRaw(r,c)); };
  const commit=()=>{
    if(!edit) return;
    const {r,c}=edit, val=draft;
    setEdit(null);
    if(cancelRef.current){ cancelRef.current=false; return; }
    if(val===cellRaw(r,c)) return;
    const nh=header.slice(), nr=rows.map(x=>x.slice());
    if(r<0) nh[c]=val; else { while(nr.length<=r) nr.push(header.map(()=>"")); nr[r][c]=val; }
    onSave(serializeTable(nh,nr));
  };
  const onKey=(e)=>{
    if(e.key==="Escape"){ cancelRef.current=true; e.currentTarget.blur(); }
    else if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); e.currentTarget.blur(); }
  };
  const Cell=(r,c)=>{
    const El=r<0?"th":"td";
    if(edit&&edit.r===r&&edit.c===c)
      return <El key={c} className="md-cell md-cell-edit">
        <AutoGrow value={draft} autoFocus onChange={e=>setDraft(e.target.value)} onBlur={commit} onKeyDown={onKey}/>
      </El>;
    return <El key={c} className="md-cell" title="Click to edit"
      onClick={e=>{ if(e.target.closest("a")) return; openCell(r,c); }}
      dangerouslySetInnerHTML={{__html:renderInline(cellRaw(r,c))||"&nbsp;"}}/>;
  };

  return (
    <div className="md-tbl ws-tbl">
      <table>
        <thead><tr>{header.map((_,c)=>Cell(-1,c))}</tr></thead>
        <tbody>{rows.map((row,r)=><tr key={r}>{header.map((_,c)=>Cell(r,c))}</tr>)}</tbody>
      </table>
    </div>
  );
}

// A collapsible, inline-EDITABLE doc. Stays in the rendered display view: click any
// text block and it turns into an editable field in place. Changes save automatically
// (an override in Supabase, via onSave); Reset drops the override back to the disk file.
function EditableDoc({docId,meta,content,isEdited,onSave,onReset,defaultOpen=false,aiContext=""}) {
  const [open,setOpen]=useState(defaultOpen);
  const [blocks,setBlocks]=useState(()=>blocksOf(content));
  const [editing,setEditing]=useState(null); // block index being edited
  const [draft,setDraft]=useState("");
  const [flash,setFlash]=useState("");
  const cancelRef=useRef(false);
  const editWrapRef=useRef(null);
  // AI rewrite panel state (per open block).
  const [aiInstr,setAiInstr]=useState("");
  const [aiBusy,setAiBusy]=useState(false);
  const [aiErr,setAiErr]=useState("");
  const [aiPrev,setAiPrev]=useState(null); // draft before the last rewrite (for Undo)
  const resetAi=()=>{ setAiInstr(""); setAiBusy(false); setAiErr(""); setAiPrev(null); };

  // Re-sync when the effective content changes from outside (initial load, reset).
  useEffect(()=>{ if(editing===null) setBlocks(blocksOf(content)); },[content]); // eslint-disable-line

  const title=useMemo(()=>firstHeading(content)||(meta||"Untitled").replace(/\.md$/i,""),[content,meta]);

  const persist=async(newContent)=>{
    setFlash("Saving…");
    const err=await onSave(docId,newContent);
    setFlash(err?"Save failed":"Saved ✓");
    setTimeout(()=>setFlash(f=>f==="Saving…"?f:""),2000);
  };

  const openBlock=(i)=>{ cancelRef.current=false; resetAi(); setEditing(i); setDraft(blocks[i].raw); };
  // Rewrite the current draft with Claude (Sonnet 5) per the user's instruction.
  const runRewrite=async()=>{
    const instr=aiInstr.trim();
    if(!instr){ setAiErr("Tell the AI what to change."); return; }
    setAiBusy(true); setAiErr("");
    try{
      const res=await fetch("/api/outreach-rewrite",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({text:draft,instruction:instr,context:aiContext})});
      const data=await res.json();
      if(!res.ok||data.error) throw new Error(data.error||`HTTP ${res.status}`);
      setAiPrev(draft); setDraft(data.text);
      requestAnimationFrame(()=>editWrapRef.current?.querySelector("textarea")?.focus());
    }catch(e){ setAiErr(e?.message||"Rewrite failed."); }
    finally{ setAiBusy(false); }
  };
  const undoRewrite=()=>{ if(aiPrev!==null){ setDraft(aiPrev); setAiPrev(null); } };
  // Commit on blur only when focus truly leaves the editing area (not when clicking the AI panel).
  const onEditBlur=(e)=>{ if(editWrapRef.current&&editWrapRef.current.contains(e.relatedTarget)) return; commit(); };
  const commit=async()=>{
    if(editing===null) return;
    const idx=editing, val=draft;
    if(cancelRef.current){ cancelRef.current=false; setEditing(null); resetAi(); return; }
    setEditing(null); resetAi();
    const before=blocks.map(b=>b.raw);
    const raws=before.slice();
    if(val.trim()==="") raws.splice(idx,1); else raws[idx]=val;
    const newContent=raws.join("\n\n");
    if(newContent===before.join("\n\n")) return; // no change
    setBlocks(blocksOf(newContent));
    await persist(newContent);
  };
  // Replace one block's raw source (used by the per-cell table editor) and persist.
  const saveBlockRaw=async(idx,newRaw)=>{
    const raws=blocks.map(b=>b.raw);
    if(raws[idx]===newRaw) return;
    raws[idx]=newRaw;
    const newContent=raws.join("\n\n");
    setBlocks(blocksOf(newContent));
    await persist(newContent);
  };
  const addSection=()=>{
    const idx=blocks.length;
    setBlocks(b=>[...b,{raw:"",html:"",type:"paragraph"}]);
    cancelRef.current=false; setEditing(idx); setDraft(""); setOpen(true);
  };
  const reset=async(e)=>{
    e.stopPropagation();
    if(!window.confirm("Reset this doc to the original file? Your in-app edits will be discarded.")) return;
    await onReset(docId);
  };
  const onKey=(e)=>{
    if(e.key==="Escape"){ cancelRef.current=true; e.currentTarget.blur(); }
    else if(e.key==="Enter"&&(e.metaKey||e.ctrlKey)){ e.preventDefault(); e.currentTarget.blur(); }
  };
  const blockClick=(i,e)=>{ if(e.target.closest("a")) return; openBlock(i); };

  return (
    <div className={`ws-doc${open?" open":""}`}>
      <div className="ws-doc-hd" onClick={()=>editing===null&&setOpen(o=>!o)}>
        <div style={{minWidth:0}}>
          <div className="ws-doc-ttl">{title}</div>
          <div className="ws-doc-meta" style={{marginTop:3,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            <span>{meta}</span>
            {isEdited&&<span style={{color:"var(--fuchsia)"}}>● edited in app</span>}
            {flash&&<span style={{color:flash==="Save failed"?"var(--fuchsia)":"#2a8ca0"}}>{flash}</span>}
          </div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:6,alignItems:"center"}} onClick={e=>e.stopPropagation()}>
          {isEdited&&<button className="btn btn-ghost btn-sm" onClick={reset} style={{color:"var(--fuchsia)"}}>↺ Reset to file</button>}
          <span className="ws-doc-caret" onClick={()=>editing===null&&setOpen(o=>!o)} style={{cursor:"pointer"}}>▶</span>
        </div>
      </div>
      {open&&<div className="ws-doc-bd">
        <div className="md-doc ws-editable">
          {blocks.map((b,i)=>{
            if(b.type==="table") return <TableBlock key={i} raw={b.raw} onSave={(nr)=>saveBlockRaw(i,nr)}/>;
            return editing===i
              ? <div key={i} ref={editWrapRef} className="md-edit-wrap">
                  <AutoGrow value={draft} autoFocus
                    onChange={e=>setDraft(e.target.value)} onBlur={onEditBlur} onKeyDown={onKey}/>
                  <div className="ai-panel">
                    <div className="ai-panel-row">
                      <span className="ai-panel-icon" title="Rewrite with Claude (Sonnet 5)">✨</span>
                      <input className="ai-panel-input" value={aiInstr} placeholder="Tell Claude what to do (e.g. rewrite as an invitation to our next Sprout N Tell)"
                        onChange={e=>setAiInstr(e.target.value)} disabled={aiBusy} onBlur={onEditBlur}
                        onKeyDown={e=>{ if(e.key==="Enter"){ e.preventDefault(); runRewrite(); } if(e.key==="Escape"){ e.preventDefault(); cancelRef.current=true; commit(); } }}/>
                      <button type="button" className="btn btn-blk btn-sm" onMouseDown={e=>e.preventDefault()} onClick={runRewrite} disabled={aiBusy}>{aiBusy?"Rewriting…":"Rewrite"}</button>
                      {aiPrev!==null&&!aiBusy&&<button type="button" className="btn btn-ghost btn-sm" onMouseDown={e=>e.preventDefault()} onClick={undoRewrite}>↶ Undo</button>}
                    </div>
                    {aiErr&&<div className="ai-panel-err">{aiErr}</div>}
                    <div className="ai-panel-hint">Enter to rewrite · edit the result above, then click away to save · Esc discards this edit</div>
                  </div>
                </div>
              : <div key={i} className="md-block" title="Click to edit"
                  onClick={e=>blockClick(i,e)} dangerouslySetInnerHTML={{__html:b.html}}/>;
          })}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12,marginTop:10}}>
          <button className="btn btn-ghost btn-sm" onClick={addSection}>＋ Add a section</button>
          <span className="ws-doc-meta">Click any section to edit it in place · Esc cancels · changes save automatically</span>
        </div>
      </div>}
    </div>
  );
}

function OutreachView({contacts,orgs,events=[]}) {
  const [tab,setTab]=useState("overview");
  const [ws,setWs]=useState(null);
  const [loading,setLoading]=useState(true);
  const [wsErr,setWsErr]=useState("");
  const [search,setSearch]=useState("");
  // In-app edits, keyed by file-relative id (e.g. "briefs/Foo.md", "work-log.md").
  const [overrides,setOverrides]=useState({});

  useEffect(()=>{
    let alive=true;
    Promise.all([
      fetch("/api/outreach").then(r=>{ if(!r.ok) throw new Error(String(r.status)); return r.json(); }),
      fetchOutreachDocs().catch(()=>({})),
    ])
      .then(([d,ov])=>{ if(alive){ setWs(d); setOverrides(ov||{}); setLoading(false); } })
      .catch(()=>{ if(alive){ setWsErr("Could not load the outreach workspace."); setLoading(false); } });
    return ()=>{ alive=false; };
  },[]);

  // Effective content for a doc: the saved in-app edit if present, else the disk seed.
  const contentOf=(id,seed)=> (overrides[id]!==undefined ? overrides[id].content : seed);
  const isEdited=(id)=> overrides[id]!==undefined;

  const saveDoc=async(id,content)=>{
    const { error, updated_at }=await saveOutreachDoc(id,content);
    if(error) return error;
    setOverrides(o=>({...o,[id]:{content,updated_at}}));
    return null;
  };
  const resetDoc=async(id)=>{
    await resetOutreachDoc(id);
    setOverrides(o=>{ const n={...o}; delete n[id]; return n; });
  };

  // Live outreach activity: every touchpoint logged across contacts + orgs.
  const activity=useMemo(()=>{
    const items=[];
    contacts.forEach(c=>(c.touchpoints||[]).forEach(tp=>items.push({...tp,personName:`${c.first_name} ${c.last_name}`,orgName:orgs.find(o=>o.id===c.org_id)?.name||""})));
    orgs.forEach(o=>(o.touchpoints||[]).forEach(tp=>items.push({...tp,personName:o.name,orgName:"Organization record"})));
    return items.sort((a,b)=>new Date(b.date)-new Date(a.date));
  },[contacts,orgs]);

  const filteredActivity=useMemo(()=>activity.filter(tp=>{
    if(search&&!tp.personName.toLowerCase().includes(search.toLowerCase())&&!tp.summary?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }),[activity,search]);

  const briefs=ws?.briefs||[];
  const sprints=ws?.sprints||[];
  const workLog=ws?.workLog||"";

  // Live context handed to the AI rewrite button so invitations reference real events + dates.
  const aiContext=useMemo(()=>{
    const today=new Date().toISOString().slice(0,10);
    const upcoming=(events||[])
      .filter(e=>e.event_date&&e.event_date>=today&&e.status!=="completed"&&e.status!=="cancelled")
      .sort((a,b)=>a.event_date.localeCompare(b.event_date))
      .slice(0,6)
      .map(e=>{
        const d=new Date(e.event_date+"T00:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"});
        return `- ${e.name} — ${d}${e.location?` at ${e.location}`:""}`;
      });
    return upcoming.length?`Upcoming Sprout Society events (real dates, use only if relevant):\n${upcoming.join("\n")}`:"";
  },[events]);

  const TABS=[
    ["overview","Overview"],
    ["briefs",`Research Briefs${briefs.length?` (${briefs.length})`:""}`],
    ["sprints",`Sprints${sprints.length?` (${sprints.length})`:""}`],
    ["deliverables","Deliverables"],
    ["activity",`Activity${activity.length?` (${activity.length})`:""}`],
  ];

  return (
    <div className="page">
      <div className="pg-hd"><div>
        <div className="pg-ttl">Outreach</div>
        <div className="pg-sub">Workspace for the Outreach Manager: research briefs, sprints, deliverables, and live activity</div>
      </div></div>

      <div className="tabs">
        {TABS.map(([id,label])=>(
          <button key={id} className={`tab${tab===id?" on":""}`} onClick={()=>setTab(id)}>{label}</button>
        ))}
      </div>

      {tab==="overview"&&(
        <div>
          <div className="info-banner">
            This is where the <strong>Outreach Manager</strong> employee's work lands. It owns the top of the pipeline: discovery, relationship research briefs, tiering, and first-touch outreach. Everything below is distilled straight from the employee's files in the virtual agency.
          </div>
          {loading?<div className="empty"><div className="empty-txt">Loading workspace…</div></div>:(
            <>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:12,marginBottom:18}}>
                <div className="ws-stat"><div className="ws-stat-n">{briefs.length}</div><div className="ws-stat-l">Research briefs</div></div>
                <div className="ws-stat"><div className="ws-stat-n">{sprints.length}</div><div className="ws-stat-l">Sprints</div></div>
                <div className="ws-stat"><div className="ws-stat-n">{workLog?"✓":"—"}</div><div className="ws-stat-l">Deliverables log</div></div>
                <div className="ws-stat"><div className="ws-stat-n">{activity.length}</div><div className="ws-stat-l">Logged touchpoints</div></div>
              </div>
              {wsErr&&<div className="info-banner" style={{borderColor:"var(--fuchsia)",background:"rgba(225,0,152,0.06)"}}>{wsErr}</div>}
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12}}>
                <div className="card" style={{cursor:"pointer"}} onClick={()=>setTab("briefs")}><div className="card-bd">
                  <div style={{fontSize:13,fontWeight:900,marginBottom:4}}>📄 Research Briefs</div>
                  <div style={{fontSize:12,color:"var(--g600)",lineHeight:1.6}}>Phase A–G relationship research on discovered orgs and prospects. {briefs.length} on file.</div>
                </div></div>
                <div className="card" style={{cursor:"pointer"}} onClick={()=>setTab("sprints")}><div className="card-bd">
                  <div style={{fontSize:13,fontWeight:900,marginBottom:4}}>🎯 Sprints</div>
                  <div style={{fontSize:12,color:"var(--g600)",lineHeight:1.6}}>Planned, multi-subject outreach campaigns and first-touch copy. {sprints.length} on file.</div>
                </div></div>
                <div className="card" style={{cursor:"pointer"}} onClick={()=>setTab("deliverables")}><div className="card-bd">
                  <div style={{fontSize:13,fontWeight:900,marginBottom:4}}>📦 Deliverables</div>
                  <div style={{fontSize:12,color:"var(--g600)",lineHeight:1.6}}>Append-only ledger of what the employee has shipped, newest first.</div>
                </div></div>
                <div className="card" style={{cursor:"pointer"}} onClick={()=>setTab("activity")}><div className="card-bd">
                  <div style={{fontSize:13,fontWeight:900,marginBottom:4}}>📣 Activity</div>
                  <div style={{fontSize:12,color:"var(--g600)",lineHeight:1.6}}>Every outreach touchpoint logged across contacts and orgs. {activity.length} total.</div>
                </div></div>
              </div>
            </>
          )}
        </div>
      )}

      {tab==="briefs"&&(
        loading?<div className="empty"><div className="empty-txt">Loading…</div></div>:
        briefs.length===0
          ?<div className="empty"><div className="empty-ico">📄</div><div className="empty-ttl">No research briefs yet</div><div className="empty-txt">Briefs the Outreach Manager files in <code>virtual-agency/employees/Outreach/briefs/</code> appear here.</div></div>
          :<div>{briefs.map((d,i)=>{ const id=`briefs/${d.file}`; return <EditableDoc key={id} docId={id} meta={d.file} content={contentOf(id,d.md)} isEdited={isEdited(id)} onSave={saveDoc} onReset={resetDoc} defaultOpen={i===0} aiContext={aiContext}/>; })}</div>
      )}

      {tab==="sprints"&&(
        loading?<div className="empty"><div className="empty-txt">Loading…</div></div>:
        sprints.length===0
          ?<div className="empty"><div className="empty-ico">🎯</div><div className="empty-ttl">No sprints yet</div><div className="empty-txt">Sprint plans in <code>virtual-agency/employees/Outreach/sprints/</code> appear here.</div></div>
          :<div>{sprints.map((d,i)=>{ const id=`sprints/${d.file}`; return <EditableDoc key={id} docId={id} meta={d.file} content={contentOf(id,d.md)} isEdited={isEdited(id)} onSave={saveDoc} onReset={resetDoc} defaultOpen={i===0} aiContext={aiContext}/>; })}</div>
      )}

      {tab==="deliverables"&&(()=>{
        if(loading) return <div className="empty"><div className="empty-txt">Loading…</div></div>;
        const id="work-log.md"; const content=contentOf(id,workLog);
        if(!content) return <div className="empty"><div className="empty-ico">📦</div><div className="empty-ttl">No deliverables logged</div><div className="empty-txt">The employee's <code>work-log.md</code> ledger appears here.</div></div>;
        return <EditableDoc docId={id} meta="work-log.md" content={content} isEdited={isEdited(id)} onSave={saveDoc} onReset={resetDoc} defaultOpen aiContext={aiContext}/>;
      })()}

      {tab==="activity"&&(
        <div>
          <div className="filter-bar">
            <input className="fi" placeholder="Search contact or summary…" value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          {filteredActivity.length===0
            ?<div className="empty"><div className="empty-ico">📣</div><div className="empty-ttl">No touchpoints yet</div><div className="empty-txt">Open any contact or org and log a touchpoint to track outreach activity here.</div></div>
            :<div className="card"><div className="card-bd" style={{padding:0}}>
                {filteredActivity.map((tp,i)=>(
                  <div key={tp.id||i} style={{padding:"13px 17px",borderBottom:i<filteredActivity.length-1?"1px solid var(--g100)":"none"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5,flexWrap:"wrap"}}>
                      <span style={{fontSize:13,fontWeight:700}}>{tp.personName}</span>
                      {tp.orgName&&<span style={{fontSize:11,color:"var(--g400)"}}>· {tp.orgName}</span>}
                      <span style={{marginLeft:"auto",fontSize:11,color:"var(--g400)",fontWeight:700}}>{fmtDate(tp.date)}</span>
                    </div>
                    <div style={{fontSize:12,lineHeight:1.6}}>{tp.summary}</div>
                    {tp.next_action&&<div style={{fontSize:11,color:"var(--cyan)",fontWeight:700,marginTop:2}}>→ {tp.next_action}{tp.next_action_date?` · by ${fmtDate(tp.next_action_date)}`:""}</div>}
                  </div>
                ))}
              </div></div>
          }
        </div>
      )}
    </div>
  );
}

/* ─── Import View ────────────────────────────────────────────────────────────── */
/* ─── Spreadsheet merge helpers (paste from Google Sheets / CSV) ──────────────── */
const NL_isEmpty   = (v) => v==null || (typeof v==="string" && v.trim()==="") || (Array.isArray(v)&&v.length===0);
const NL_normEmail = (e) => (e==null?"":String(e)).trim().toLowerCase();
const NL_validEmail= (e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(NL_normEmail(e));
const NL_MERGE_FIELDS = ["first_name","last_name","phone","instagram_handle","website","how_heard","notes"];

// Parse pasted text. Google Sheets copy = tab-separated; CSV export = comma + optional quotes.
function parseDelimited(text){
  const clean=(text||"").replace(/\r\n?/g,"\n").trim();
  if(!clean) return [];
  const lines=clean.split("\n").filter(l=>l.trim()!=="");
  if(!lines.length) return [];
  const delim=lines[0].includes("\t")?"\t":",";
  const parseLine=(line)=>{
    const out=[]; let cur=""; let q=false;
    for(let i=0;i<line.length;i++){
      const ch=line[i];
      if(q){
        if(ch==='"'){ if(line[i+1]==='"'){cur+='"';i++;} else q=false; }
        else cur+=ch;
      } else if(ch==='"'){ q=true; }
      else if(ch===delim){ out.push(cur); cur=""; }
      else cur+=ch;
    }
    out.push(cur);
    return out.map(s=>s.trim());
  };
  return lines.map(parseLine);
}

// Map each header column to a known field by fuzzy name match.
function detectSheetFields(headers){
  return headers.map(h=>{
    const x=(h||"").toLowerCase();
    if(/e-?mail/.test(x)) return "email";
    if(/first|fname|given/.test(x)) return "first_name";
    if(/last|lname|surname|family/.test(x)) return "last_name";
    if(/insta|handle|\big\b/.test(x)) return "instagram_handle";
    if(/phone|mobile|cell|tel/.test(x)) return "phone";
    if(/web|site|url/.test(x)) return "website";
    if(/how.*(hear|heard|find|found)|hear about|referr|source/.test(x)) return "how_heard";
    if(/note/.test(x)) return "notes";
    if(/full ?name|^name$|contact ?name/.test(x)) return "full_name";
    return null;
  });
}

// Build a merge plan: new contacts to add + existing contacts with blanks filled.
// Fill-blanks-only: never overwrites a field that already has a value. Keyed on email.
function buildSheetPlan(text, contacts){
  const rows=parseDelimited(text);
  if(rows.length<2) return {error:"Need a header row plus at least one data row."};
  const map=detectSheetFields(rows[0]);
  if(!map.includes("email")) return {error:'No email column found. Add a column with "email" in its header.'};

  // Dedupe rows within the sheet by email (fill-blanks across duplicates).
  const bySheetEmail=new Map();
  let skippedNoEmail=0;
  for(let r=1;r<rows.length;r++){
    const cells=rows[r];
    const rec={};
    map.forEach((f,ci)=>{ if(f) rec[f]=(cells[ci]||"").trim(); });
    const email=NL_normEmail(rec.email);
    if(!NL_validEmail(email)){ skippedNoEmail++; continue; }
    if(NL_isEmpty(rec.first_name)&&!NL_isEmpty(rec.full_name)){
      const parts=rec.full_name.trim().split(/\s+/);
      rec.first_name=parts.shift()||"";
      if(NL_isEmpty(rec.last_name)) rec.last_name=parts.join(" ");
    }
    delete rec.full_name;
    if(bySheetEmail.has(email)){
      const ex=bySheetEmail.get(email);
      NL_MERGE_FIELDS.forEach(f=>{ if(NL_isEmpty(ex[f])&&!NL_isEmpty(rec[f])) ex[f]=rec[f]; });
    } else { rec.email=email; bySheetEmail.set(email,rec); }
  }

  const existingByEmail=new Map();
  contacts.forEach(c=>{ const e=NL_normEmail(c.email); if(e) existingByEmail.set(e,c); });

  const toSave=[]; const details=[];
  let added=0, updated=0, unchanged=0;
  for(const [email,rec] of bySheetEmail){
    const existing=existingByEmail.get(email);
    const name=`${rec.first_name||""} ${rec.last_name||""}`.trim()||email;
    if(existing){
      const patch={}; const filled=[];
      NL_MERGE_FIELDS.forEach(f=>{ if(NL_isEmpty(existing[f])&&!NL_isEmpty(rec[f])){ patch[f]=rec[f]; filled.push(f); }});
      if(filled.length){ toSave.push({...existing,...patch}); updated++; details.push({name,email,action:"updated",filled}); }
      else { unchanged++; details.push({name,email,action:"unchanged",filled:[]}); }
    } else {
      toSave.push({
        id:`ind_${uid()}`, record_type:"individual",
        first_name:rec.first_name||"", last_name:rec.last_name||"", email,
        phone:rec.phone||"", instagram_handle:rec.instagram_handle||"", website:rec.website||"",
        how_heard:rec.how_heard||"",
        notes:rec.notes||"", relationship_status:"warm", relationship_types:[],
        next_action:"", next_action_date:null, next_actions:[], touchpoints:[],
        tags:[], interests:[], linked_grants:[],
        financial_relationship:{has_given:false,total_given:0,grant_history:[]},
        createdAt:new Date().toISOString(),
      });
      added++; details.push({name,email,action:"new",filled:[]});
    }
  }
  return {toSave,summary:{added,updated,unchanged,skippedNoEmail,total:bySheetEmail.size},details};
}

// Export contacts that have an email as a Mailchimp-ready CSV.
function downloadNewsletterCsv(contacts){
  const withEmail=contacts.filter(c=>c.email&&String(c.email).trim());
  const esc=(s)=>{ const v=(s==null?"":String(s)); return /[",\n]/.test(v)?`"${v.replace(/"/g,'""')}"`:v; };
  const lines=[["First Name","Last Name","Email"].join(",")]
    .concat(withEmail.map(c=>[esc(c.first_name),esc(c.last_name),esc(c.email)].join(",")));
  const blob=new Blob([lines.join("\n")],{type:"text/csv;charset=utf-8;"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url; a.download="sprout-newsletter-list.csv";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return withEmail.length;
}

/* ─── Import normalization (auto-heal common enum slips before Zod drops the record) ─── */
const _RELTYPE_MAP = {
  art:"art", arts:"art", artist:"art", artists:"art", "visual art":"art", "visual artist":"art", "visual artists":"art", "fine art":"art", painter:"art", designer:"art",
  music:"music", musician:"music", musicians:"music", "music artist":"music", musical:"music", dj:"music", band:"music",
  event_host:"event_host", "event host":"event_host", "event-host":"event_host", host:"event_host", organizer:"event_host", organiser:"event_host",
  partner:"partner", partners:"partner",
  community_builder:"community_builder", "community builder":"community_builder", "community-builder":"community_builder", builder:"community_builder", "community organizer":"community_builder",
  attendee:"attendee", attendees:"attendee", guest:"attendee",
  coworking:"coworking", "co-working":"coworking", "co working":"coworking", coworker:"coworking", "coworking member":"coworking",
  sprout_society:"sprout_society", "sprout society":"sprout_society",
  other:"other",
};
const _SEGMENT_MAP = { community:"community", communities:"community", "community member":"community", member:"member", members:"member", "paying member":"member", donor:"donor", donors:"donor", prospect:"prospect", prospects:"prospect", lead:"prospect", leads:"prospect" };
const _STATUS_MAP = { cold:"cold", cool:"cool", warm:"warm", active:"active", hot:"active", lukewarm:"cool", new:"cold" };
const _CATEGORY_MAP = { funder:"funder", funders:"funder", sponsor:"funder", partner:"partner", partners:"partner", vendor:"vendor", vendors:"vendor", media:"media", press:"media", government:"government", gov:"government", govt:"government" };
const _norm = s => String(s ?? "").trim().toLowerCase().replace(/\s+/g," ");

function normalizeImportRecord(raw) {
  const heals=[]; const r={...raw};
  // legacy singular relationship_type -> plural array (matches the in-app placeholder + older exports)
  if (r.relationship_type && !r.relationship_types) { r.relationship_types=[r.relationship_type]; delete r.relationship_type; heals.push("relationship_type → relationship_types[]"); }
  // relationship_types: map synonyms; anything unmappable becomes "other" (record survives, heal is shown — never a silent drop)
  if (r.relationship_types != null) {
    const arr = Array.isArray(r.relationship_types) ? r.relationship_types : [r.relationship_types];
    const mapped = arr.map(v => {
      const m = _RELTYPE_MAP[_norm(v)];
      if (m) { if (m !== v) heals.push(`type "${v}"→"${m}"`); return m; }
      heals.push(`type "${v}"→"other"`); return "other";
    });
    r.relationship_types = [...new Set(mapped)];
  }
  // segment / relationship_status / category: map synonyms; unknown -> drop the key so the schema default applies (heal shown)
  const coerce = (key, map, label) => {
    if (r[key] == null || r[key] === "") return;
    const m = map[_norm(r[key])];
    if (m) { if (m !== r[key]) heals.push(`${label} "${r[key]}"→"${m}"`); r[key]=m; }
    else { heals.push(`${label} "${r[key]}" dropped → default`); delete r[key]; }
  };
  coerce("segment", _SEGMENT_MAP, "segment");
  // "member" is now an additive flag, not a base segment — translate it so the record keeps its base bucket.
  if (r.segment === "member") { r.is_member = true; delete r.segment; heals.push('segment "member" → is_member flag'); }
  coerce("relationship_status", _STATUS_MAP, "status");
  coerce("category", _CATEGORY_MAP, "category");
  // auto-mirror the high-signal roles into tags so one filter surfaces both contacts AND orgs
  const PRIORITY_ROLES=["music","art","event_host","community_builder"];
  if (Array.isArray(r.relationship_types) && r.relationship_types.length) {
    const tags=Array.isArray(r.tags)?[...r.tags]:[];
    const add=r.relationship_types.filter(t=>PRIORITY_ROLES.includes(t)&&!tags.includes(t));
    if (add.length) { r.tags=[...tags,...add]; heals.push(`tagged role(s): ${add.join(", ")}`); }
  }
  return { record:r, heals };
}

function prepareImportItem(item) {
  const rt = item.record_type || (item.first_name ? "individual" : "organization");
  if (rt === "individual") {
    const rawId = item.id || uid(); const id = rawId.startsWith("ind_") ? rawId : `ind_${rawId}`;
    // All imports land in Prospects — the bucket gets refined by hand (or the donor cross-check below) afterward.
    return { rt, record:{...item, record_type:"individual", id, segment:"prospect", touchpoints:item.touchpoints||[], tags:item.tags||[], interests:item.interests||[], linked_grants:item.linked_grants||[], createdAt:item.createdAt||new Date().toISOString()} };
  }
  const rawId = item.id || uid(); const id = rawId.startsWith("org_") ? rawId : `org_${rawId}`;
  return { rt, record:{...item, record_type:"organization", id, segment:"prospect", touchpoints:item.touchpoints||[], tags:item.tags||[], financial_relationship:item.financial_relationship||{has_given:false,total_given:0,grant_history:[]}, createdAt:item.createdAt||new Date().toISOString()} };
}

function ImportView({contacts,orgs,onImportContact,onImportOrg,showToast}) {
  const [mode,setMode]=useState("json");
  const [jsonText,setJsonText]=useState("");
  const [parsed,setParsed]=useState(null);
  const [parseError,setParseError]=useState("");
  const [sheetText,setSheetText]=useState("");
  const [sheetPlan,setSheetPlan]=useState(null);
  const [sheetError,setSheetError]=useState("");

  // Existing donors (mostly from the Givebutter import) live in the CRM as segment:"donor".
  // An imported person who matches one — by id, email, or @handle — is upgraded prospect → donor.
  const donorKeys=(()=>{
    const norm=s=>String(s||"").trim().toLowerCase().replace(/^@/,"");
    const ids=new Set(), emails=new Set(), handles=new Set();
    contacts.forEach(c=>{ if((c.segment||"community")!=="donor") return;
      if(c.id) ids.add(c.id);
      if(c.email) emails.add(norm(c.email));
      if(c.instagram_handle) handles.add(norm(c.instagram_handle));
    });
    return { ids, emails, handles, norm };
  })();
  const matchesDonor=(r)=>{
    const {ids,emails,handles,norm}=donorKeys;
    return (r.id&&ids.has(r.id))||(r.email&&emails.has(norm(r.email)))||(r.instagram_handle&&handles.has(norm(r.instagram_handle)));
  };

  const handleParse=()=>{
    setParseError("");
    try {
      const obj=JSON.parse(jsonText.trim());
      const items=Array.isArray(obj)?obj:[obj];
      const results=items.map(raw=>{
        if (!raw.record_type&&!raw.first_name&&!raw.name)
          return { valid:false, rt:"?", record:raw, heals:[], error:{fieldErrors:{record:["Missing record_type or identifying field (first_name/name)"]}}, display:"(unidentified record)" };
        const { record:normalized, heals }=normalizeImportRecord(raw);
        const { rt, record }=prepareImportItem(normalized);
        if (rt==="individual"&&record.segment==="prospect"&&matchesDonor(record)) { record.segment="donor"; heals.push("matched existing donor → Donors"); }
        const { error }=rt==="individual"?validateContact(record):validateOrg(record);
        const display=rt==="individual"
          ? `👤 ${`${record.first_name||"?"} ${record.last_name||""}`.trim()}`
          : `🏢 ${record.name||"?"}`;
        return { valid:!error, rt, record, heals, error, display };
      });
      setParsed(results);
    } catch(e) { setParseError(e.message); setParsed(null); }
  };

  const handleImport=()=>{
    if (!parsed) return;
    const valid=parsed.filter(r=>r.valid);
    const newContacts=valid.filter(r=>r.rt==="individual").map(r=>r.record);
    const newOrgs=valid.filter(r=>r.rt==="organization").map(r=>r.record);
    if (newContacts.length) onImportContact(newContacts);
    if (newOrgs.length) onImportOrg(newOrgs);
    const dropped=parsed.length-valid.length;
    showToast(`Imported ${newContacts.length} contact(s), ${newOrgs.length} org(s)${dropped?` · ${dropped} skipped (invalid)`:""} ✓`);
    setJsonText(""); setParsed(null);
  };

  const handleSheetPreview=()=>{
    setSheetError("");
    const plan=buildSheetPlan(sheetText,contacts);
    if(plan.error){ setSheetError(plan.error); setSheetPlan(null); return; }
    setSheetPlan(plan);
  };

  const handleSheetMerge=()=>{
    if(!sheetPlan||!sheetPlan.toSave.length){ showToast("Nothing new to merge",""); return; }
    onImportContact(sheetPlan.toSave);
    const s=sheetPlan.summary;
    showToast(`Merged: ${s.added} added, ${s.updated} updated ✓`);
    setSheetText(""); setSheetPlan(null);
  };

  return (
    <div className="page">
      <div className="pg-hd">
        <div><div className="pg-ttl">Import &amp; Merge</div><div className="pg-sub">Add contacts from JSON, or merge an email list from Google Sheets</div></div>
        <button className="btn btn-ghost btn-sm" onClick={()=>{const n=downloadNewsletterCsv(contacts);showToast(`Exported ${n} contact(s) with email ✓`);}}>⬇ Export newsletter list (CSV)</button>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        <button className={`btn btn-sm ${mode==="json"?"btn-cyan":"btn-ghost"}`} onClick={()=>setMode("json")}>Paste JSON</button>
        <button className={`btn btn-sm ${mode==="sheet"?"btn-cyan":"btn-ghost"}`} onClick={()=>setMode("sheet")}>Merge spreadsheet</button>
      </div>

      {mode==="sheet"&&(
        <div className="card">
          <div className="card-hd"><span className="card-ttl">Merge email list from Google Sheets</span></div>
          <div className="card-bd">
            <div className="info-banner" style={{marginBottom:14}}>
              <strong>How to use:</strong> In your sheet, select all (Ctrl+A) and copy (Ctrl+C), then paste below — keep the header row. Rows are matched to existing contacts by <strong>email</strong>: new emails get added, and blank fields on existing contacts get filled in. Anything already filled is never overwritten. Rows without a valid email are skipped.
            </div>
            <div className={`import-zone ${sheetText?"active":""}`}>
              <textarea className="import-ta" value={sheetText}
                onChange={e=>{setSheetText(e.target.value);setSheetPlan(null);setSheetError("");}}
                placeholder={"Paste rows from Google Sheets (tab-separated) or a CSV.\n\nFirst Name\tLast Name\tEmail\tInstagram\nJane\tSmith\tjane@example.com\t@jane\n..."}
              />
            </div>
            {sheetError&&<p style={{fontSize:12,color:"#B91C1C",marginTop:8}}>⚠ {sheetError}</p>}
            {sheetPlan&&(
              <div className="preview-card">
                <div className="preview-name">{sheetPlan.summary.added} new · {sheetPlan.summary.updated} updated · {sheetPlan.summary.unchanged} unchanged · {sheetPlan.summary.skippedNoEmail} skipped (no email)</div>
                {sheetPlan.details.slice(0,12).map((d,i)=>(
                  <div key={i} className="preview-meta" style={{marginTop:4}}>
                    {d.action==="new"?"🟢 ":d.action==="updated"?"🔵 ":"⚪ "}
                    {d.name} · {d.email}{d.filled.length?` · filled: ${d.filled.join(", ")}`:(d.action==="unchanged"?" · already complete":"")}
                  </div>
                ))}
                {sheetPlan.details.length>12&&<div className="preview-meta" style={{marginTop:4,opacity:0.7}}>+{sheetPlan.details.length-12} more…</div>}
              </div>
            )}
            <div style={{display:"flex",gap:8,marginTop:14}}>
              {!sheetPlan
                ? <button className="btn btn-cyan" onClick={handleSheetPreview} disabled={!sheetText.trim()}>Preview Merge</button>
                : <button className="btn btn-acid" onClick={handleSheetMerge} disabled={!sheetPlan.toSave.length}>✓ Merge {sheetPlan.toSave.length} into CRM</button>}
              {(sheetText||sheetPlan)&&<button className="btn btn-ghost btn-sm" onClick={()=>{setSheetText("");setSheetPlan(null);setSheetError("");}}>Clear</button>}
            </div>
          </div>
        </div>
      )}

      {mode==="json"&&<>
      <div className="info-banner">
        <strong>How to use:</strong> Ask Claude to research a contact using the Session 1 prompt from <code>CRM_Session_Prompts.md</code>. Claude generates a JSON profile. Copy it, paste below, click Import. Accepts single records or arrays.
      </div>
      <div className="card">
        <div className="card-hd"><span className="card-ttl">Paste CRM Profile JSON</span></div>
        <div className="card-bd">
          <div className={`import-zone ${jsonText?"active":""}`}>
            <textarea className="import-ta" value={jsonText}
              onChange={e=>{setJsonText(e.target.value);setParsed(null);setParseError("");}}
              placeholder={`// Single record:\n{\n  "record_type": "individual",\n  "id": "ind_example",\n  "first_name": "Jane",\n  "last_name": "Smith",\n  "relationship_type": "partner",\n  ...\n}\n\n// Or array:\n[\n  { "record_type": "organization", ... },\n  { "record_type": "individual", ... }\n]`}
            />
          </div>
          {parseError&&<p style={{fontSize:12,color:"#B91C1C",marginTop:8}}>⚠ {parseError}</p>}
          {parsed&&(()=>{
            const ok=parsed.filter(r=>r.valid).length; const bad=parsed.length-ok;
            return (
            <div className="preview-card">
              <div className="preview-name">{ok} record(s) ready{bad?` · ${bad} will be skipped (invalid)`:""}</div>
              {parsed.map((item,i)=>(
                <div key={i} className="preview-meta" style={{marginTop:6}}>
                  <div style={{color:item.valid?"var(--g800)":"#B91C1C",fontWeight:item.valid?400:700}}>
                    {item.valid?"✓":"✗"} {item.display}{item.valid?"":" — will be skipped"}
                  </div>
                  {!item.valid&&item.error&&(
                    <div style={{fontSize:11,color:"#B91C1C",marginLeft:18}}>
                      {Object.entries(item.error.fieldErrors||{}).map(([k,v])=>`${k}: ${Array.isArray(v)?v.join("; "):v}`).join(" · ")}
                    </div>
                  )}
                  {item.heals&&item.heals.length>0&&(
                    <div style={{fontSize:11,color:"#92760C",marginLeft:18}}>↻ auto-fixed: {item.heals.join(" · ")}</div>
                  )}
                </div>
              ))}
            </div>
            );
          })()}
          <div style={{display:"flex",gap:8,marginTop:14}}>
            {!parsed?<button className="btn btn-cyan" onClick={handleParse} disabled={!jsonText.trim()}>Preview Import</button>:<button className="btn btn-acid" onClick={handleImport} disabled={!parsed.some(r=>r.valid)}>✓ Import {parsed.filter(r=>r.valid).length} into CRM</button>}
            {(jsonText||parsed)&&<button className="btn btn-ghost btn-sm" onClick={()=>{setJsonText("");setParsed(null);setParseError("");}}>Clear</button>}
          </div>
        </div>
      </div>
      <div style={{marginTop:20}}>
        <div className="sect-lbl">Schema Quick Reference</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {[{l:"Individual — Key Fields",f:["record_type: \"individual\"","first_name, last_name","email, phone","relationship_type (partner/community_builder/other)","relationship_status (cold/warm/active)","next_action, next_action_date","instagram_handle, website"]},{l:"Organization — Key Fields",f:["record_type: \"organization\"","name","category (funder/partner/vendor/media/government)","relationship_status (cold/warm/active)","phone, email, instagram_handle, website","next_action, next_action_date"]}].map(s=>(
            <div key={s.l} className="card"><div className="card-hd"><span className="card-ttl">{s.l}</span></div><div className="card-bd">{s.f.map(f=><div key={f} style={{fontSize:12,fontFamily:"monospace",color:"var(--g800)",marginBottom:4}}>{f}</div>)}</div></div>
          ))}
        </div>
      </div>
      </>}
    </div>
  );
}

/* ─── Settings ───────────────────────────────────────────────────────────────── */
function SettingsView({profile,onUpdate,showToast}) {
  const [d,setD]=useState(profile);
  const s=(k,v)=>setD(p=>({...p,[k]:v}));
  return (
    <div className="page">
<div className="pg-hd"><div><div className="pg-ttl">Settings</div><div className="pg-sub">Organization profile and communications setup</div></div></div>
      <div className="card"><div className="card-hd"><span className="card-ttl">Organization Identity</span></div><div className="card-bd">
        <div className="frow"><div className="fg"><label className="fl">Legal Name</label><input className="fi" value={d.legalName} onChange={e=>s("legalName",e.target.value)}/></div><div className="fg"><label className="fl">EIN</label><input className="fi" value={d.ein} onChange={e=>s("ein",e.target.value)}/></div></div>
        <div className="frow3"><div className="fg"><label className="fl">Founded</label><input className="fi" value={d.founded} onChange={e=>s("founded",e.target.value)}/></div><div className="fg"><label className="fl">Annual Budget</label><input className="fi" value={d.annualBudget} onChange={e=>s("annualBudget",e.target.value)} placeholder="e.g. $120,000"/></div><div className="fg"><label className="fl">Service Area</label><input className="fi" value={d.serviceArea} onChange={e=>s("serviceArea",e.target.value)}/></div></div>
        <div className="frow"><div className="fg"><label className="fl">Address</label><input className="fi" value={d.address} onChange={e=>s("address",e.target.value)}/></div><div className="fg"><label className="fl">Website</label><input className="fi" value={d.website} onChange={e=>s("website",e.target.value)}/></div></div>
        <div className="frow"><div className="fg"><label className="fl">Staff Count</label><input className="fi" value={d.numStaff} onChange={e=>s("numStaff",e.target.value)} placeholder="e.g. 2 FTE"/></div><div className="fg"><label className="fl">Volunteers</label><input className="fi" value={d.numVolunteers} onChange={e=>s("numVolunteers",e.target.value)}/></div></div>
        <div className="fg"><label className="fl">Mission Statement</label><textarea className="fta" rows={3} value={d.mission} onChange={e=>s("mission",e.target.value)}/></div>
        <div className="fg"><label className="fl">Programs</label><textarea className="fta" rows={2} value={d.programs} onChange={e=>s("programs",e.target.value)}/></div>
        <div className="fg"><label className="fl">Population Served</label><textarea className="fta" rows={2} value={d.population} onChange={e=>s("population",e.target.value)}/></div>
      </div></div>
      <div className="card"><div className="card-hd"><span className="card-ttl">Communications Setup</span></div><div className="card-bd">
        <div className="frow"><div className="fg"><label className="fl">Instagram Handle</label><input className="fi" value={d.igHandle} onChange={e=>s("igHandle",e.target.value)} placeholder="@sproutsocietyorg"/></div><div className="fg"><label className="fl">Instagram URL</label><input className="fi" value={d.igUrl} onChange={e=>s("igUrl",e.target.value)}/></div></div>
        <div className="frow"><div className="fg"><label className="fl">Newsletter Platform</label><input className="fi" value={d.newsletterPlatform} onChange={e=>s("newsletterPlatform",e.target.value)} placeholder="e.g. Mailchimp, Substack, Beehiiv…"/></div><div className="fg"><label className="fl">Subscriber Count</label><input className="fi" value={d.newsletterAudience} onChange={e=>s("newsletterAudience",e.target.value)} placeholder="e.g. 450 subscribers"/></div></div>
      </div></div>
      <div className="card"><div className="card-hd"><span className="card-ttl">Primary Contact</span></div><div className="card-bd">
        <div className="frow"><div className="fg"><label className="fl">Name</label><input className="fi" value={d.contactName} onChange={e=>s("contactName",e.target.value)}/></div><div className="fg"><label className="fl">Title</label><input className="fi" value={d.contactTitle} onChange={e=>s("contactTitle",e.target.value)}/></div></div>
        <div className="frow"><div className="fg"><label className="fl">Email</label><input type="email" className="fi" value={d.contactEmail} onChange={e=>s("contactEmail",e.target.value)}/></div><div className="fg"><label className="fl">Phone</label><input className="fi" value={d.contactPhone} onChange={e=>s("contactPhone",e.target.value)}/></div></div>
      </div></div>
      <div className="settings-foot"><button className="btn btn-acid" onClick={()=>{onUpdate(d);showToast("Settings saved ✓");}}>Save Settings</button></div>
    </div>
  );
}

/* ─── Newsletter View ────────────────────────────────────────────────────────── */
const NL_STATUS_OPTS = [
  {value:"draft",label:"Draft"},
  {value:"pending",label:"Pending review"},
  {value:"approved",label:"Approved"},
  {value:"sent",label:"Sent"},
];
const NL_STATUS_COLOR = {draft:"#ECECEA",pending:"#FAD100",approved:"#C6C902",scheduled:"var(--cyan-lt)",sent:"#030000"};
const NL_STATUS_TEXT  = {draft:"#6b6b66",pending:"#3a3000",approved:"#3a3d00",scheduled:"#155e6e",sent:"#FAD100"};
const NL_GROUPS = [
  {status:"draft",     label:"Drafts",    hint:"In progress"},
  {status:"pending",   label:"Pending review", hint:"Ready to test"},
  {status:"approved",  label:"Approved",  hint:"Ready to send"},
  {status:"scheduled", label:"Scheduled", hint:"Queued to send"},
  {status:"sent",      label:"Sent",      hint:"Already out"},
];

function NlStatusTag({status}) {
  return <span style={{background:NL_STATUS_COLOR[status]||"var(--g100)",color:NL_STATUS_TEXT[status]||"var(--g600)",fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:20,textTransform:"uppercase",letterSpacing:"0.05em",whiteSpace:"nowrap"}}>{status||"draft"}</span>;
}

const nlSlug = (s) => (s||"").toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"").slice(0,40);

const NL_EDITOR_LS_KEY = "sprout_nl_editor_v1";

function blankNewsletter(templateId, today) {
  return {
    id:null, subject:"", status:"draft", send_date:null,
    template:templateId, month:defaultMonthYear(today),
    field_values:{}, spotlight_contact_id:null,
    recap_limit:4, upcoming_limit:4, html:"", _isNew:true,
  };
}

function NewsletterView({newsletters,events,contacts,profile,onUpdate,onDelete,showToast}) {
  const today = new Date().toISOString().slice(0,10);
  const [mode,setMode]=useState("list");          // list | edit
  const [draft,setDraft]=useState(null);
  const [confirmDel,setConfirmDel]=useState(null);
  const [listDel,setListDel]=useState(null);      // newsletter pending delete from the list view
  const suppressAuto=useRef(false);               // skip the unmount auto-save (used by delete + explicit close)

  // Restore an in-progress editor session after a reload (persists even an unsaved new draft).
  // For an already-saved draft, prefer the DB record over the local snapshot so a stale cache
  // can never override saved content — wait for the newsletters list to load, then use the DB copy.
  const restored=useRef(false);
  useEffect(()=>{
    if(restored.current) return;
    let r=null;
    try{ r=JSON.parse(localStorage.getItem(NL_EDITOR_LS_KEY)||"null"); }catch{}
    if(!(r&&r.mode==="edit"&&r.draft)){ restored.current=true; return; }
    if(r.draft.id){
      // Saved draft: hold until the DB list arrives, then load the authoritative DB record.
      if(newsletters.length===0) return;
      const fresh=newsletters.find(n=>n.id===r.draft.id);
      restored.current=true;
      setDraft(fresh?{...fresh}:r.draft);
      setMode("edit");
    } else {
      // Never-saved new draft: only the local snapshot has it.
      restored.current=true;
      setDraft(r.draft);
      setMode("edit");
    }
  },[newsletters]);
  // Keep the local snapshot in sync so a reload mid-edit returns to the same draft.
  useEffect(()=>{
    try{
      if(mode==="edit"&&draft) localStorage.setItem(NL_EDITOR_LS_KEY,JSON.stringify({mode,draft}));
      else localStorage.removeItem(NL_EDITOR_LS_KEY);
    }catch{}
  },[mode,draft]);

  const startNew = (templateId) => { setDraft(blankNewsletter(templateId,today)); setMode("edit"); };
  const openEdit = (n) => { setDraft({...n}); setMode("edit"); };
  const backToList = () => { setDraft(null); setMode("list"); };

  // Editor save channels. Stay = Save-draft button; close = Save & close; auto = unmount/navigate-away.
  const onSaveStay  = (rec) => { onUpdate(rec); };
  const onSaveClose = (rec) => { suppressAuto.current=true; onUpdate(rec); showToast(rec._wasNew?"Newsletter created ✓":"Newsletter saved ✓"); backToList(); };
  const onAutoSave  = (rec) => {
    if(suppressAuto.current){ suppressAuto.current=false; return; }
    onUpdate(rec);
    // Reflect the assigned id back into the reload snapshot so returning never duplicates the record.
    try{ localStorage.setItem(NL_EDITOR_LS_KEY,JSON.stringify({mode:"edit",draft:rec})); }catch{}
    showToast("Draft saved ✓");
  };

  /* ── Landing: templates on top, saved newsletters below ── */
  if (mode==="list") {
    const hasSaved = newsletters.length>0;
    return (
      <div className="page">
        <div className="pg-hd">
          <div><div className="pg-ttl">Newsletter</div><div className="pg-sub">Start from a template, or open a saved one below</div></div>
        </div>

        {/* Templates */}
        <div className="card">
          <div className="card-hd"><span className="card-ttl">Templates</span><span style={{fontSize:11,color:"var(--g500)"}}>Pick a layout to start a new one</span></div>
          <div className="card-bd">
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              {TEMPLATES.map(t=>(
                <div key={t.id} className="card" style={{cursor:"pointer",margin:0}} onClick={()=>startNew(t.id)}>
                  <div className="card-bd">
                    <div style={{fontSize:15,fontWeight:900,color:"var(--g800)",marginBottom:6}}>{t.name}</div>
                    <div style={{fontSize:12,lineHeight:1.5,color:"var(--g600)"}}>{t.blurb}</div>
                    <button className="btn btn-acid btn-sm" style={{marginTop:14}} onClick={(e)=>{e.stopPropagation();startNew(t.id);}}>Use this →</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Saved */}
        <div className="card">
          <div className="card-hd"><span className="card-ttl">Saved newsletters</span><span style={{fontSize:11,color:"var(--g500)"}}>{newsletters.length} issue{newsletters.length!==1?"s":""}</span></div>
          <div className="card-bd">
            {!hasSaved && (
              <div style={{textAlign:"center",padding:"28px 24px",color:"var(--g500)"}}>
                <div style={{fontSize:26,marginBottom:8}}>📰</div>
                <div style={{fontSize:13,fontWeight:700,color:"var(--g700)",marginBottom:4}}>No saved newsletters yet</div>
                <div style={{fontSize:12}}>Pick a template above to start one. Drafts and sent issues show up here.</div>
              </div>
            )}
            {hasSaved && NL_GROUPS.map(g=>{
              const items=newsletters.filter(n=>(n.status||"draft")===g.status)
                .sort((a,b)=>(b.send_date||b.month||"").localeCompare(a.send_date||a.month||""));
              if(!items.length) return null;
              return (
                <div key={g.status} style={{marginBottom:14}}>
                  <div style={{fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.05em",color:"var(--g500)",marginBottom:8}}>{g.label} · {items.length}</div>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {items.map(n=>(
                      <div key={n.id} className="overdue-row" style={{cursor:"pointer"}} onClick={()=>openEdit(n)}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:700,color:"var(--g800)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{n.subject||"(no subject)"}</div>
                          <div style={{fontSize:11,color:"var(--g500)",marginTop:2}}>
                            {(TEMPLATES.find(t=>t.id===n.template)?.name)||n.template} · {n.month||"no month"}{n.send_date?` · ${n.send_date}`:""}
                          </div>
                        </div>
                        <NlStatusTag status={n.status}/>
                        <button className="btn btn-ghost btn-sm" title="Delete" style={{padding:"2px 8px",color:"var(--danger,#c0392b)"}} onClick={(e)=>{e.stopPropagation();setListDel(n);}}>🗑</button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {listDel&&<ConfirmModal
          message={`Delete "${listDel.subject||"(no subject)"}"? This cannot be undone.`}
          onConfirm={()=>{ suppressAuto.current=true; onDelete(listDel.id); setListDel(null); showToast("Newsletter deleted"); }}
          onCancel={()=>setListDel(null)}/>}
      </div>
    );
  }

  /* ── Editor ── */
  return <NewsletterEditor
    draft={draft} setDraft={setDraft} today={today}
    events={events} contacts={contacts} profile={profile} newsletters={newsletters}
    onBack={backToList}
    onSaveStay={onSaveStay}
    onSaveClose={onSaveClose}
    onAutoSave={onAutoSave}
    onDelete={(id)=>setConfirmDel(id)}
    confirmDel={confirmDel} setConfirmDel={setConfirmDel}
    doDelete={(id)=>{ suppressAuto.current=true; onDelete(id); setConfirmDel(null); backToList(); }}
    showToast={showToast}
  />;
}

// Drag-to-reposition control. Shows the image at the email banner's exact aspect
// ratio with object-fit:cover, and lets you drag the photo to choose what shows.
// Emits an object-position string ("50% 35%") stored back into field_values.
function ImageCrop({url,value,onChange,ratio=544/200}){
  const parse=(v)=>{ const m=(v||"").match(/(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/); return m?{x:+m[1],y:+m[2]}:{x:50,y:50}; };
  const pos=parse(value);
  const boxRef=useRef(null); const drag=useRef(null);
  const clamp=(n)=>Math.max(0,Math.min(100,n));
  const onDown=(e)=>{ e.preventDefault();
    drag.current={sx:e.clientX,sy:e.clientY,px:pos.x,py:pos.y,rect:boxRef.current.getBoundingClientRect()};
    window.addEventListener("pointermove",onMove); window.addEventListener("pointerup",onUp);
  };
  const onMove=(e)=>{ const d=drag.current; if(!d) return;
    // Drag the photo down → reveal the top (object-position y decreases), and vice versa.
    const dx=(e.clientX-d.sx)/d.rect.width*100;
    const dy=(e.clientY-d.sy)/d.rect.height*100;
    onChange(`${clamp(d.px-dx).toFixed(0)}% ${clamp(d.py-dy).toFixed(0)}%`);
  };
  const onUp=()=>{ drag.current=null; window.removeEventListener("pointermove",onMove); window.removeEventListener("pointerup",onUp); };
  return (
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      <div ref={boxRef} onPointerDown={onDown}
        style={{position:"relative",width:"100%",aspectRatio:String(ratio),borderRadius:8,overflow:"hidden",border:"1px solid var(--g200)",background:"var(--g100)",cursor:"grab",touchAction:"none"}}>
        <img src={url} alt="" draggable={false}
          style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:`${pos.x}% ${pos.y}%`,display:"block",pointerEvents:"none",userSelect:"none"}}/>
        <div style={{position:"absolute",bottom:6,left:6,fontSize:10,fontWeight:700,color:"#fff",background:"rgba(0,0,0,.55)",padding:"2px 7px",borderRadius:4,pointerEvents:"none"}}>↕ drag to reposition</div>
      </div>
    </div>
  );
}

function NewsletterEditor({draft,setDraft,today,events,contacts,profile,newsletters,onBack,onSaveStay,onSaveClose,onAutoSave,onDelete,confirmDel,setConfirmDel,doDelete,showToast}) {
  const s=(k,v)=>setDraft(p=>({...p,[k]:v}));
  const setField=(key,val)=>setDraft(p=>({...p,field_values:{...p.field_values,[key]:val}}));

  const spotlight = draft.spotlight_contact_id ? contacts.find(c=>c.id===draft.spotlight_contact_id) : null;
  const spotlightName = spotlight ? `${spotlight.first_name||""} ${spotlight.last_name||""}`.trim() : null;

  const built = useMemo(()=>buildNewsletter({
    templateId:draft.template, monthYear:draft.month, events, profile,
    fieldValues:draft.field_values, spotlightName,
    recapLimit:draft.recap_limit, upcomingLimit:draft.upcoming_limit, today,
  }),[draft.template,draft.month,draft.field_values,draft.recap_limit,draft.upcoming_limit,events,profile,spotlightName,today]);

  // Preview-only: inject <base href="about:srcdoc"> so in-email fragment links (e.g. "See more events" → #events)
  // resolve to the iframe document itself and scroll, instead of inheriting the parent page URL and reloading the
  // whole CRM app inside the preview pane. The stored/sent HTML (built.html) is left untouched.
  const previewHtml = useMemo(()=>{
    const html = built.html||"";
    return html.replace(/<head([^>]*)>/i, '<head$1><base href="about:srcdoc">');
  },[built.html]);

  const isMonthly = draft.template==="monthly-roundup";
  const isCompact = draft.template==="monthly-roundup-compact";
  const isQuick   = draft.template==="quick-hit";
  // Both the compact roundup and the one-off Quick Hit use the structured-section editor.
  const SECTIONS  = isCompact ? COMPACT_SECTIONS : (isQuick ? QUICK_HIT_SECTIONS : null);
  const isStructured = !!SECTIONS;
  const secByKey  = (k)=>(SECTIONS||[]).find(s=>s.key===k);

  // Structured-section field helpers.
  const fv = draft.field_values||{};
  const setItem   = (k,idx,sub,val)=>setDraft(p=>{ const arr=[...(p.field_values?.[k]||[blankCompactItem(secByKey(k))])]; arr[idx]={...arr[idx],[sub]:val}; return {...p,field_values:{...p.field_values,[k]:arr}}; });
  const addItem   = (sec)=>setDraft(p=>{ const arr=[...(p.field_values?.[sec.key]||[blankCompactItem(sec)])]; arr.push(blankCompactItem(sec)); return {...p,field_values:{...p.field_values,[sec.key]:arr}}; });
  const removeItem= (k,idx)=>setDraft(p=>{ const arr=[...(p.field_values?.[k]||[])]; arr.splice(idx,1); return {...p,field_values:{...p.field_values,[k]:arr}}; });

  // Per-field busy state: fieldId -> "polish" | "upload".
  const [busy,setBusy]=useState({});
  // Per-field Polish results: fieldId -> { apply, versions:[string] }. Non-destructive — the
  // original field is untouched until the user clicks "Use this" on a version.
  const [polishOut,setPolishOut]=useState({});
  // Send workflow state (test send + approved list blast).
  const [sendSecret,setSendSecret]=useState("");
  // Known test recipients as toggle buttons; whatever is toggled on receives the test.
  const TEST_PRESETS=[
    {name:"Max",      email:"maxperkins@sproutsociety.org"},
    {name:"Danielle", email:"danielle@sproutsociety.org"},
    {name:"Morgan",   email:"mkuriloff16@gmail.com"},
  ];
  const [testOn,setTestOn]=useState([TEST_PRESETS[0].email]);   // Max on by default
  const toggleTest=(em)=>setTestOn(p=>p.includes(em)?p.filter(x=>x!==em):[...p,em]);
  const [showManual,setShowManual]=useState(false);
  const [testTo,setTestTo]=useState("");   // manually-added extra addresses
  const [listSeg,setListSeg]=useState("all");
  const [sending,setSending]=useState("");   // "" | "test" | "list"
  // Version-history modals (window.prompt/confirm aren't supported in the Next dev runtime).
  const [nameVersion,setNameVersion]=useState(null);   // { defaultLabel } when the name-version modal is open
  const [versionLabel,setVersionLabel]=useState("");
  const [restoreV,setRestoreV]=useState(null);         // the version pending a restore confirm
  // ── Field ⇄ preview sync ──────────────────────────────────────────────────
  // The preview is a sticky, internally-scrolling panel (see below). Each editable
  // field maps to a "group" id that is stamped onto the matching block in the email
  // HTML as data-sec="…" (in lib/newsletter.js). Focusing a field scrolls the preview
  // to that block + flashes it; clicking a block scrolls the editor to its first field.
  const previewRef=useRef(null);
  const flashTimer=useRef(null);
  const previewScroll=useRef(0);   // remembered internal scroll, restored across srcDoc reloads
  // field key → block group id
  const SEC_GROUP={
    mastheadLabel:"masthead",
    headline:"intro", intro:"intro",
    featuredEyebrow:"featured", featuredTitle:"featured", featuredRecap:"featured", featuredAnnounce:"featured", featuredPhoto:"featured",
    coworkingEyebrow:"announce", coworkingTitle:"announce", coworking:"announce", coworkingChip:"announce", coworkingThurs:"announce",
    membership:"membership", membershipBtn:"membership", membershipLink:"membership",
    marketing:"marketing", marketingLink:"marketing",
    scholarship:"scholarship", scholarshipBtn:"scholarship", scholarshipLink:"scholarship",
    spotlightEyebrow:"spotlight", spotlightName:"spotlight", spotlightBlurb:"spotlight", spotlightImage:"spotlight", spotlightIG:"spotlight", spotlightWeb:"spotlight", spotlightTestimonial:"spotlight",
    upcomingTitle:"upcoming", upcoming:"upcoming",
    pastTitle:"past", past:"past",
    footerBrand:"footer", donateLink:"footer", memberLink:"footer", footerIG:"footer", footerAddress:"footer", footerEIN:"footer",
  };
  // block group id → first editable field key (for reverse sync)
  const GROUP_FIRST={ masthead:"mastheadLabel", intro:"headline", featured:"featuredEyebrow", announce:"coworkingEyebrow", membership:"membership", marketing:"marketing", scholarship:"scholarship", spotlight:"spotlightEyebrow", upcoming:"upcomingTitle", past:"pastTitle", footer:"footerBrand" };
  // Quick Hit (bracket template) has no structured sections — map a placeholder's bracket text to
  // its preview block group by keyword so the same focus→scroll mechanism works there too.
  const qhGroupForKey=(key)=>{
    const k=(key||"").toLowerCase();
    if(k.includes("headline")) return "qh-headline";
    if(k.includes("recap")) return "qh-recap";
    if(k.includes("event name")||k.includes("date")) return "qh-nextup";
    if(k.includes("rsvp")||k.includes("scholarship")||k.includes("apply")) return "qh-cta";
    return null;   // e.g. the hidden one-line preview — nothing to scroll to
  };
  // Quick Hit footer fields all live in one footer cell (data-sec="footerBrand").
  const QH_FOOTER=new Set(["footerBrand","donateLink","memberLink","footerIG","footerAddress","footerEIN"]);
  // key → preview group. Compact uses the static map; Quick Hit (structured) stamps
  // data-sec="<section key>" so the group IS the key (footer fields share footerBrand);
  // the old bracket path falls back to keywords.
  const groupForKey=(key)=> isCompact ? SEC_GROUP[key] : (isQuick ? (QH_FOOTER.has(key) ? "footerBrand" : key) : qhGroupForKey(key));
  // group → the data-fkey of its first editable field (for reverse sync clicks).
  const firstKeyForGroup=(grp)=>{
    if(isCompact) return GROUP_FIRST[grp];
    if(isQuick) return grp;   // structured Quick Hit: group === field key
    const i=built.placeholders.findIndex(ph=>qhGroupForKey(ph.key)===grp);
    return i<0?null:`qh-${i}`;
  };
  const flashEls=(els)=>{
    els.forEach(e=>{ e.style.transition="outline-color .2s ease"; e.style.outline="3px solid #E10098"; e.style.outlineOffset="-3px"; e.style.borderRadius="4px"; });
    if(flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current=setTimeout(()=>els.forEach(e=>{ e.style.outline=""; }),1400);
  };
  // Focus a field → scroll the preview (internally) to its block + flash it.
  // For repeat sections (upcoming/past) pass the item index so it targets that one card,
  // not just the section header. Each rendered item carries data-sec-item="<group>-<idx>".
  const focusScroll=(key,idx)=>{
    try{
      const grp=groupForKey(key); if(!grp) return;
      const ifr=previewRef.current; if(!ifr||!ifr.contentWindow||!ifr.contentDocument) return;
      let els=(idx!=null)?ifr.contentDocument.querySelectorAll(`[data-sec-item="${grp}-${idx}"]`):[];
      if(!els.length) els=ifr.contentDocument.querySelectorAll(`[data-sec="${grp}"]`);
      if(!els.length) return;
      const dest=Math.max(0,els[0].getBoundingClientRect().top+ifr.contentWindow.scrollY-24);
      previewScroll.current=dest;
      ifr.contentWindow.scrollTo({top:dest,behavior:"smooth"});
      flashEls(els);
    }catch{}
  };
  // Reverse sync: clicking a block in the preview scrolls the editor to its first field.
  // Re-wired after every in-place content swap (innerHTML replacement drops old listeners).
  const wirePreview=(doc)=>{
    doc.querySelectorAll("[data-sec]").forEach(el=>{
      el.style.cursor="pointer";
      el.addEventListener("click",(ev)=>{
        // let real links/buttons do their own thing
        if(ev.target.closest("a,button")) return;
        const fkey=firstKeyForGroup(el.getAttribute("data-sec")); if(!fkey) return;
        const node=document.querySelector(`[data-fkey="${fkey}"]`); if(!node) return;
        node.scrollIntoView({behavior:"smooth",block:"center"});
        setTimeout(()=>{ const i=node.querySelector("input,textarea"); if(i) i.focus(); },80);
      });
    });
  };
  // The iframe loads a static shell ONCE (srcDoc never changes), so its window/document persist.
  // We then swap only the inner DOM on each keystroke instead of reloading srcDoc — that keeps the
  // scroll position naturally intact (no reload → no reset → no jump-to-top), and avoids re-fetching
  // every image. (The old srcDoc-per-keystroke approach reloaded the whole document and then tried
  // to restore scroll, which flickered to the top and landed short before layout settled.)
  const PREVIEW_SHELL='<!doctype html><html><head><meta charset="utf-8"><base href="about:srcdoc"></head><body style="margin:0"></body></html>';
  const previewReady=useRef(false);
  const writePreview=()=>{
    const ifr=previewRef.current; const doc=ifr&&ifr.contentDocument; if(!doc) return;
    const m=previewHtml.match(/<html[^>]*>([\s\S]*)<\/html>/i);
    const inner=m?m[1]:previewHtml;
    const win=ifr.contentWindow;
    const y=win?win.scrollY:0;
    doc.documentElement.innerHTML=inner;
    if(win) win.scrollTo(0,y);   // hold position if the shorter/taller new content nudged it
    wirePreview(doc);
  };
  const onPreviewLoad=()=>{ previewReady.current=true; writePreview(); };
  // Push new content into the persistent document whenever the built HTML changes.
  useEffect(()=>{ if(previewReady.current) writePreview(); },[previewHtml]);   // eslint-disable-line react-hooks/exhaustive-deps
  async function runPolish(fieldId,label,current,apply){
    if(!current||!current.trim()){ showToast("Write some notes first","err"); return; }
    setBusy(b=>({...b,[fieldId]:"polish"}));
    try{
      const r=await fetch("/api/polish",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:current,label})});
      const j=await r.json();
      if(!r.ok) throw new Error(j.error||"Polish failed");
      // Append as a new version; preserve earlier versions so the user can pick any of them.
      setPolishOut(p=>({...p,[fieldId]:{apply,versions:[...((p[fieldId]&&p[fieldId].versions)||[]),j.polished]}}));
    }catch(e){ showToast("Polish: "+(e.message||"failed"),"err"); }
    finally{ setBusy(b=>{const n={...b};delete n[fieldId];return n;}); }
  }
  const clearPolish=(fieldId)=>setPolishOut(p=>{const n={...p};delete n[fieldId];return n;});
  function usePolishVersion(fieldId,text){
    const o=polishOut[fieldId]; if(o&&o.apply) o.apply(text);
    clearPolish(fieldId); showToast("Applied ✓");
  }
  // Result card rendered directly under a field. Original stays visible above; each re-polish
  // adds a numbered version, each independently selectable.
  function polishPanel(fieldId){
    const o=polishOut[fieldId]; if(!o||!o.versions.length) return null;
    const multi=o.versions.length>1;
    return (
      <div style={{marginTop:6,border:"1px solid var(--acid)",borderRadius:8,background:"var(--acid-lt)",padding:8}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <span style={{fontSize:11,fontWeight:800,color:"#3a3d00"}}>✨ Polished by Comms{multi?` · ${o.versions.length} versions`:""}</span>
          <button className="btn btn-ghost btn-sm" style={{padding:"1px 7px",fontSize:11}} onClick={()=>clearPolish(fieldId)}>✕ Discard</button>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {o.versions.map((v,i)=>(
            <div key={i} style={{background:"#fff",border:"1px solid var(--g200)",borderRadius:6,padding:"7px 9px"}}>
              {multi&&<div style={{fontSize:10,fontWeight:700,color:"var(--g500)",marginBottom:3}}>v{i+1}{i===o.versions.length-1?" · latest":""}</div>}
              <div style={{fontSize:13,lineHeight:1.5,color:"var(--g700)",whiteSpace:"pre-wrap",marginBottom:6}}>{v}</div>
              <button className="btn btn-acid btn-sm" style={{padding:"2px 9px",fontSize:11}} onClick={()=>usePolishVersion(fieldId,v)}>✓ Use this</button>
            </div>
          ))}
        </div>
      </div>
    );
  }
  function pickImage(fieldId,apply){
    const inp=document.createElement("input"); inp.type="file"; inp.accept="image/*";
    inp.onchange=async()=>{ const file=inp.files&&inp.files[0]; if(!file) return;
      setBusy(b=>({...b,[fieldId]:"upload"}));
      try{ const url=await uploadNewsletterImage(file); apply(url); showToast("Image uploaded ✓"); }
      catch(e){ showToast("Upload: "+(e.message||"failed"),"err"); }
      finally{ setBusy(b=>{const n={...b};delete n[fieldId];return n;}); }
    };
    inp.click();
  }

  // Latest draft + built html, captured in refs so the unmount auto-save reads current values.
  const draftRef=useRef(draft); useEffect(()=>{draftRef.current=draft;});
  const builtRef=useRef(built); useEffect(()=>{builtRef.current=built;});

  // Whether a draft holds anything worth persisting (avoids saving an instantly-abandoned blank).
  const draftHasContent=(d)=>{
    if(!d) return false;
    if(d.id) return true;                       // an existing record always saves
    if((d.subject||"").trim()) return true;
    if(d.spotlight_contact_id||d.send_date) return true;
    const fv=d.field_values||{};
    return Object.values(fv).some(v=>{
      if(typeof v==="string") return v.trim().length>0;
      if(Array.isArray(v)) return v.some(it=>it&&Object.values(it).some(x=>typeof x==="string"&&x.trim()));
      return !!v;
    });
  };

  // Build a clean, id-assigned, html-baked record from the given draft.
  const makeRecord=(d)=>{
    let id=d.id, wasNew=false;
    if(!id){
      wasNew=true;
      const base=`nl_${nlSlug(d.month||"newsletter")}_${isMonthly?"roundup":"quick"}`;
      id=base; let i=2;
      while(newsletters.some(n=>n.id===id)){ id=`${base}_${i++}`; }
    }
    const {_isNew,_wasNew,...clean}=d;
    return {wasNew,id,rec:{...clean,id,html:builtRef.current.html,createdAt:d.createdAt||new Date().toISOString(),_wasNew:wasNew}};
  };

  // Save draft — persist but stay in the editor.
  const saveDraft = () => {
    const d=draftRef.current;
    if(!draftHasContent(d)){ showToast("Add a subject or some copy first","err"); return; }
    const {wasNew,id,rec}=makeRecord(d);
    onSaveStay(rec);
    if(wasNew) setDraft(p=>({...p,id,_isNew:false}));   // adopt the id so further saves update, not duplicate
    showToast(wasNew?"Draft saved ✓":"Saved ✓");
  };

  // Save version — open the name modal; commitVersion does the snapshot once the user confirms a name.
  const saveVersion = () => {
    const d=draftRef.current;
    if(!draftHasContent(d)){ showToast("Add a subject or some copy first","err"); return; }
    const n=(Array.isArray(d.versions)?d.versions:[]).length+1;
    const def=`Version ${n}`;
    setVersionLabel(def);
    setNameVersion({defaultLabel:def});
  };

  // Commit a point-in-time snapshot to the version history, then persist (stay in editor).
  const commitVersion = (rawLabel) => {
    const d=draftRef.current;
    const versions=Array.isArray(d.versions)?d.versions:[];
    const n=versions.length+1;
    const label=(rawLabel||"").trim()||`Version ${n}`;
    const snap={
      id:`v_${n}_${Date.now()}`,
      savedAt:new Date().toISOString(),
      label,
      subject:d.subject||"",
      month:d.month||"",
      template:d.template,
      field_values:JSON.parse(JSON.stringify(d.field_values||{})),
      spotlight_contact_id:d.spotlight_contact_id||null,
      recap_limit:d.recap_limit,
      upcoming_limit:d.upcoming_limit,
      html:builtRef.current.html,
    };
    const nextVersions=[...versions,snap];
    const {wasNew,id,rec}=makeRecord({...d,versions:nextVersions});
    onSaveStay(rec);
    setDraft(p=>({...p,versions:nextVersions,...(wasNew?{id,_isNew:false}:{})}));
    showToast(`📌 ${label} saved ✓`);
  };

  // Restore the editor content from a saved version. History is left intact; the user must Save
  // (draft or version) to keep the restore.
  const restoreVersion = (v) => {
    setDraft(p=>({
      ...p,
      subject:v.subject??p.subject,
      month:v.month??p.month,
      template:v.template??p.template,
      field_values:JSON.parse(JSON.stringify(v.field_values||{})),
      spotlight_contact_id:v.spotlight_contact_id??null,
      recap_limit:v.recap_limit??p.recap_limit,
      upcoming_limit:v.upcoming_limit??p.upcoming_limit,
    }));
    showToast(`Restored "${v.label}" — Save draft to keep`);
  };

  // Delete a saved version from the history.
  const deleteVersion = (vid) => {
    setDraft(p=>({...p,versions:(p.versions||[]).filter(v=>v.id!==vid)}));
  };

  // Save & close.
  const saveClose = () => {
    const d=draftRef.current;
    if(!draftHasContent(d)){ onBack(); return; }
    onSaveClose(makeRecord(d).rec);
  };

  // Auto-save on navigate-away / unmount (and on tab close via beforeunload).
  const autoSaveRef=useRef();
  autoSaveRef.current=()=>{
    const d=draftRef.current;
    if(!draftHasContent(d)) return;
    onAutoSave(makeRecord(d).rec);
  };
  useEffect(()=>{
    const onBeforeUnload=()=>{ try{ autoSaveRef.current(); }catch{} };
    window.addEventListener("beforeunload",onBeforeUnload);
    return ()=>{ window.removeEventListener("beforeunload",onBeforeUnload); autoSaveRef.current(); };
  },[]);

  // Count contacts in a bucket that have a usable email (for the recipient preview).
  const emailRe=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const segCount=(seg)=>contacts.filter(c=>{
    const s=(c.segment)||"community"; const em=(c.email||"").trim();
    if(!emailRe.test(em)) return false;
    if(seg==="all") return true;
    if(seg==="member") return !!c.is_member;   // Members is an additive flag, not a base segment
    return s===seg;
  }).length;

  // Fire a send. mode "test" → typed addresses; mode "list" → server-resolved bucket blast.
  const doSend=async(mode)=>{
    if(!sendSecret.trim()){ showToast("Enter the send passphrase","err"); return; }
    if(!(draft.subject||"").trim()){ showToast("Add a subject first","err"); return; }
    const payload={mode,subject:draft.subject,html:built.html,secret:sendSecret.trim()};
    if(mode==="test"){
      const manual=testTo.split(/[\s,;]+/).map(x=>x.trim()).filter(Boolean);
      const to=[...new Set([...testOn,...manual])];
      if(!to.length){ showToast("Pick at least one test recipient","err"); return; }
      payload.to=to;
    } else {
      payload.segment=listSeg;
      if(!window.confirm(`Send "${draft.subject}" to ${segCount(listSeg)} contact(s) in "${listSeg}"? This goes out for real.`)) return;
    }
    setSending(mode);
    try{
      const r=await fetch("/api/send",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      const j=await r.json();
      if(!r.ok) throw new Error(j.error||"Send failed");
      if(mode==="test"){ showToast(`Test sent to ${j.sent} address${j.sent!==1?"es":""} ✓`); }
      else{
        showToast(`Sent to ${j.sent} contact${j.sent!==1?"s":""} ✓`);
        setDraft(p=>({...p,status:"sent",send_date:today}));
        onSaveStay(makeRecord({...draftRef.current,status:"sent",send_date:today}).rec);
      }
    }catch(e){ showToast("Send: "+(e.message||"failed"),"err"); }
    finally{ setSending(""); }
  };

  const copyHtml = async () => {
    try{ await navigator.clipboard.writeText(built.html); showToast("HTML copied — paste into Mailchimp ✓"); }
    catch{ showToast("Copy failed — check console","err"); console.error("clipboard write failed"); }
  };

  return (
    <div className="page">
      <div className="pg-hd" style={{position:"sticky",top:0,zIndex:30,background:"var(--paper, #F7F7F6)",paddingTop:8,paddingBottom:12,borderBottom:"1px solid var(--g200, #e5e5e3)"}}>
        <div><div className="pg-ttl">{draft._isNew?"New newsletter":"Edit newsletter"}</div>
          <div className="pg-sub">{TEMPLATES.find(t=>t.id===draft.template)?.name} · {isStructured?"custom sections":`${built.placeholders.length} field${built.placeholders.length!==1?"s":""} to fill`}</div></div>
        <div style={{display:"flex",gap:8}}>
          <button className="btn btn-ghost btn-sm" onClick={onBack}>← Back</button>
          {!draft._isNew&&<button className="btn btn-ghost btn-sm" onClick={()=>onDelete(draft.id)}>Delete</button>}
          <button className="btn btn-ghost btn-sm" onClick={copyHtml}>Copy HTML</button>
          <button className="btn btn-ghost btn-sm" onClick={saveDraft}>💾 Save draft</button>
          <button className="btn btn-ghost btn-sm" onClick={saveVersion}>📌 Save version</button>
          <button className="btn btn-acid btn-sm" onClick={saveClose}>Save &amp; close</button>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"minmax(0,380px) 1fr",gap:16,alignItems:"stretch"}}>

        {/* ── Form ── */}
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div className="card"><div className="card-hd"><span className="card-ttl">Details</span></div><div className="card-bd">
            <div className="fg"><label className="fl">Subject line</label><input className="fi" value={draft.subject} onChange={e=>s("subject",e.target.value)} placeholder="e.g. June at Sprout 🌱"/></div>
            <div className="frow">
              <div className="fg"><label className="fl">Status</label><select className="fi" value={draft.status} onChange={e=>s("status",e.target.value)}>{NL_STATUS_OPTS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
              <div className="fg"><label className="fl">Send date</label><input type="date" className="fi" value={draft.send_date||""} onChange={e=>s("send_date",e.target.value||null)}/></div>
            </div>
            <div className="fg"><label className="fl">Month label</label><input className="fi" value={draft.month} onChange={e=>s("month",e.target.value)} placeholder="e.g. June 2026"/></div>
          </div></div>

          <div className="card"><div className="card-hd"><span className="card-ttl">Version history</span><span style={{fontSize:11,color:"var(--g500)"}}>{(draft.versions||[]).length} saved</span></div><div className="card-bd">
            <div style={{fontSize:11,color:"var(--g500)",marginBottom:10,lineHeight:1.5}}>
              📌 <b>Save version</b> (top bar) commits a snapshot you can restore later. Saving a draft or sending does not create one.
            </div>
            {(draft.versions||[]).length===0
              ? <div style={{fontSize:12,color:"var(--g400)"}}>No versions saved yet.</div>
              : <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {draft.versions.slice().reverse().map(v=>(
                    <div key={v.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,background:"#fff",border:"1px solid var(--g200)",borderRadius:6,padding:"7px 9px"}}>
                      <div style={{minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:700,color:"var(--g700)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{v.label}</div>
                        <div style={{fontSize:10,color:"var(--g500)"}}>{v.savedAt?new Date(v.savedAt).toLocaleString():""}</div>
                      </div>
                      <div style={{display:"flex",gap:6,flexShrink:0}}>
                        <button className="btn btn-ghost btn-sm" style={{padding:"2px 9px",fontSize:11}} onClick={()=>setRestoreV(v)}>↩ Restore</button>
                        <button className="btn btn-ghost btn-sm" style={{padding:"2px 7px",fontSize:11}} onClick={()=>deleteVersion(v.id)}>🗑</button>
                      </div>
                    </div>
                  ))}
                </div>}
          </div></div>

          {isMonthly&&(
            <div className="card"><div className="card-hd"><span className="card-ttl">Auto-fill from CRM</span></div><div className="card-bd">
              <div style={{fontSize:11,color:"var(--g500)",marginBottom:10,lineHeight:1.5}}>
                {built.recapsUsed.length} recap{built.recapsUsed.length!==1?"s":""} (completed events with a recap blurb) · {built.upcomingUsed.length} upcoming event{built.upcomingUsed.length!==1?"s":""} pulled in.
              </div>
              <div className="frow">
                <div className="fg"><label className="fl">Max recaps</label><input type="number" min={0} max={8} className="fi" value={draft.recap_limit} onChange={e=>s("recap_limit",+e.target.value||0)}/></div>
                <div className="fg"><label className="fl">Max upcoming</label><input type="number" min={0} max={8} className="fi" value={draft.upcoming_limit} onChange={e=>s("upcoming_limit",+e.target.value||0)}/></div>
              </div>
              <div className="fg"><label className="fl">Spotlight contact</label>
                <select className="fi" value={draft.spotlight_contact_id||""} onChange={e=>s("spotlight_contact_id",e.target.value||null)}>
                  <option value="">— none —</option>
                  {contacts.slice().sort((a,b)=>`${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)).map(c=>(
                    <option key={c.id} value={c.id}>{`${c.first_name||""} ${c.last_name||""}`.trim()||c.id}</option>
                  ))}
                </select>
              </div>
            </div></div>
          )}

          <div className="card"><div className="card-hd"><span className="card-ttl">{isStructured?"Sections":"Fill in the blanks"}</span><span style={{fontSize:11,color:"var(--g500)"}}>{isStructured?`${SECTIONS.length} sections`:`${built.placeholders.length} left`}</span></div><div className="card-bd">
            {isStructured
              ? <div style={{display:"flex",flexDirection:"column",gap:16}}>
                  {SECTIONS.map(sec=>{
                    const LBL={textTransform:"none",letterSpacing:0,color:"var(--g600)",fontWeight:600};
                    const PB={padding:"2px 8px",fontSize:11};
                    if(sec.kind==="image"){
                      const url=fv[sec.key]||""; const fid=sec.key; const posKey=`${sec.key}Pos`;
                      // New upload recenters the crop.
                      const applyUpload=(u)=>{ setField(sec.key,u); if(sec.crop) setField(posKey,"50% 50%"); };
                      return (
                        <div className="fg" key={sec.key} data-fkey={sec.key}>
                          <label className="fl" style={LBL}>{sec.label}</label>
                          {url
                            ? (sec.crop
                                ? <div style={{display:"flex",flexDirection:"column",gap:8}}>
                                    <ImageCrop url={url} value={fv[posKey]} ratio={sec.ratio} onChange={(p)=>setField(posKey,p)}/>
                                    <div style={{display:"flex",gap:8}}>
                                      <button className="btn btn-ghost btn-sm" style={PB} disabled={busy[fid]==="upload"} onClick={()=>pickImage(fid,applyUpload)}>{busy[fid]==="upload"?"Uploading…":"Replace"}</button>
                                      <button className="btn btn-ghost btn-sm" style={PB} onClick={()=>{setField(sec.key,"");setField(posKey,"");}}>Remove</button>
                                    </div>
                                  </div>
                                : <div style={{display:"flex",alignItems:"center",gap:8}}>
                                    <img src={url} alt="" style={{width:48,height:48,objectFit:"cover",borderRadius:6,border:"1px solid var(--g200)"}}/>
                                    <button className="btn btn-ghost btn-sm" style={PB} disabled={busy[fid]==="upload"} onClick={()=>pickImage(fid,u=>setField(sec.key,u))}>{busy[fid]==="upload"?"Uploading…":"Replace"}</button>
                                    <button className="btn btn-ghost btn-sm" style={PB} onClick={()=>setField(sec.key,"")}>Remove</button>
                                  </div>)
                            : <button className="btn btn-ghost btn-sm" style={{...PB,alignSelf:"flex-start"}} disabled={busy[fid]==="upload"} onClick={()=>pickImage(fid,applyUpload)}>{busy[fid]==="upload"?"Uploading…":"🖼 Add image"}</button>}
                        </div>
                      );
                    }
                    if(sec.kind==="header"){
                      // Editable static title/subheader. Blank = the default (shown as placeholder).
                      return (
                        <div className="fg" key={sec.key} data-fkey={sec.key}>
                          <label className="fl" style={LBL}>{sec.label}</label>
                          <input className="fi" value={fv[sec.key]||""} onFocus={()=>focusScroll(sec.key)} onChange={e=>setField(sec.key,e.target.value)} placeholder={sec.ph||"Type your copy…"}/>
                        </div>
                      );
                    }
                    if(sec.kind==="single"){
                      const fid=sec.key;
                      return (
                        <div className="fg" key={sec.key} data-fkey={sec.key}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                            <label className="fl" style={{...LBL,margin:0}}>{sec.label}</label>
                            {sec.polish&&<button className="btn btn-ghost btn-sm" style={PB} disabled={busy[fid]==="polish"} onClick={()=>runPolish(fid,sec.label,fv[sec.key]||"",t=>setField(sec.key,t))}>{busy[fid]==="polish"?"Polishing…":(polishOut[fid]?"✨ Re-polish":"✨ Polish")}</button>}
                          </div>
                          <textarea className="fta" rows={sec.rows||2} value={fv[sec.key]||""} onFocus={()=>focusScroll(sec.key)} onChange={e=>setField(sec.key,e.target.value)} placeholder={sec.polish?"Brain-dump here, then ✨ Polish…":"Type your copy…"}/>
                          {polishPanel(fid)}
                        </div>
                      );
                    }
                    // repeat
                    const items=(fv[sec.key]&&fv[sec.key].length?fv[sec.key]:[blankCompactItem(sec)]);
                    return (
                      <div key={sec.key} data-fkey={sec.key} style={{borderTop:"1px solid var(--g100)",paddingTop:12}}>
                        <label className="fl" style={{...LBL,marginBottom:8,display:"block"}}>{sec.label}</label>
                        {items.map((item,idx)=>{
                          const imgFid=`${sec.key}.${idx}.image`;
                          return (
                            <div key={idx} style={{display:"flex",flexDirection:"column",gap:6,marginBottom:8,padding:10,background:"var(--g50)",borderRadius:8}}>
                              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                                <span style={{fontSize:11,fontWeight:700,color:"var(--g500)"}}>{sec.itemLabel} {idx+1}</span>
                                {items.length>1&&<button className="btn btn-ghost btn-sm" style={PB} onClick={()=>removeItem(sec.key,idx)}>Remove</button>}
                              </div>
                              {sec.fields.map(f=>{
                                const fid=`${sec.key}.${idx}.${f.k}`;
                                return (
                                  <div key={f.k}>
                                    {f.polish&&<div style={{textAlign:"right",marginBottom:2}}><button className="btn btn-ghost btn-sm" style={{padding:"1px 7px",fontSize:11}} disabled={busy[fid]==="polish"} onClick={()=>runPolish(fid,f.ph,item[f.k]||"",t=>setItem(sec.key,idx,f.k,t))}>{busy[fid]==="polish"?"Polishing…":(polishOut[fid]?"✨ Re-polish":"✨ Polish")}</button></div>}
                                    <input className="fi" value={item[f.k]||""} onFocus={()=>focusScroll(sec.key,idx)} onChange={e=>setItem(sec.key,idx,f.k,e.target.value)} placeholder={f.ph}/>
                                    {f.polish&&polishPanel(fid)}
                                  </div>
                                );
                              })}
                              {sec.itemImage&&(()=>{
                                const applyItemUpload=(u)=>{ setItem(sec.key,idx,"image",u); if(sec.itemCrop) setItem(sec.key,idx,"imagePos","50% 50%"); };
                                if(!item.image) return <button className="btn btn-ghost btn-sm" style={{...PB,alignSelf:"flex-start"}} disabled={busy[imgFid]==="upload"} onClick={()=>pickImage(imgFid,applyItemUpload)}>{busy[imgFid]==="upload"?"Uploading…":"🖼 Add image"}</button>;
                                if(sec.itemCrop) return (
                                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                                    <ImageCrop url={item.image} value={item.imagePos} ratio={sec.itemRatio} onChange={(p)=>setItem(sec.key,idx,"imagePos",p)}/>
                                    <div style={{display:"flex",gap:8}}>
                                      <button className="btn btn-ghost btn-sm" style={PB} disabled={busy[imgFid]==="upload"} onClick={()=>pickImage(imgFid,applyItemUpload)}>{busy[imgFid]==="upload"?"Uploading…":"Replace"}</button>
                                      <button className="btn btn-ghost btn-sm" style={PB} onClick={()=>{setItem(sec.key,idx,"image","");setItem(sec.key,idx,"imagePos","");}}>Remove</button>
                                    </div>
                                  </div>
                                );
                                return (
                                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                                    <img src={item.image} alt="" style={{width:40,height:40,objectFit:"cover",borderRadius:6,border:"1px solid var(--g200)"}}/>
                                    <button className="btn btn-ghost btn-sm" style={PB} disabled={busy[imgFid]==="upload"} onClick={()=>pickImage(imgFid,u=>setItem(sec.key,idx,"image",u))}>{busy[imgFid]==="upload"?"Uploading…":"Replace"}</button>
                                    <button className="btn btn-ghost btn-sm" style={PB} onClick={()=>setItem(sec.key,idx,"image","")}>Remove</button>
                                  </div>
                                );
                              })()}
                            </div>
                          );
                        })}
                        <button className="btn btn-ghost btn-sm" onClick={()=>addItem(sec)}>+ Add another {sec.itemLabel}</button>
                      </div>
                    );
                  })}
                </div>
              : built.placeholders.length===0
                ? <div style={{fontSize:12,color:"var(--g500)"}}>Nothing left to fill — every placeholder is resolved. 🎉</div>
                : <div style={{display:"flex",flexDirection:"column",gap:12}}>
                    {built.placeholders.map((ph,i)=>(
                      <div className="fg" key={ph.key} data-fkey={`qh-${i}`}>
                        <label className="fl" style={{textTransform:"none",letterSpacing:0,color:"var(--g600)",fontWeight:600}}>{ph.label}</label>
                        <textarea className="fta" rows={2} value={draft.field_values[ph.key]||""} onFocus={()=>focusScroll(ph.key)} onChange={e=>setField(ph.key,e.target.value)} placeholder="Type your copy…"/>
                      </div>
                    ))}
                  </div>}
          </div></div>
        </div>

        {/* ── Right column: Send + Preview ── */}
        <div style={{display:"flex",flexDirection:"column",gap:16}}>

          {/* ── Send ── */}
          <div className="card"><div className="card-hd"><span className="card-ttl">Send</span><span style={{fontSize:11,color:"var(--g500)"}}>via hello@sproutsociety.org</span></div><div className="card-bd">
            <div className="fg"><label className="fl">Send passphrase</label><input type="password" className="fi" value={sendSecret} onChange={e=>setSendSecret(e.target.value)} placeholder="required to send" autoComplete="off"/></div>

            <div className="frow" style={{alignItems:"flex-start"}}>
              <div style={{flex:1}}>
                <label className="fl">Test send</label>
                <div style={{fontSize:11,color:"var(--g500)",margin:"2px 0 6px",lineHeight:1.5}}>Toggle who gets the test (subject prefixed <b>[TEST]</b>).</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {TEST_PRESETS.map(p=>{
                    const on=testOn.includes(p.email);
                    return <button key={p.email} type="button" title={p.email} onClick={()=>toggleTest(p.email)}
                      style={{padding:"5px 12px",fontSize:12,fontWeight:700,borderRadius:20,cursor:"pointer",
                        border:`1.5px solid ${on?"var(--fuchsia)":"var(--g300)"}`,
                        background:on?"var(--fuchsia)":"transparent",color:on?"#fff":"var(--g600)"}}>
                      {on?"✓ ":""}{p.name}</button>;
                  })}
                  <button type="button" onClick={()=>setShowManual(s=>!s)}
                    style={{padding:"5px 12px",fontSize:12,fontWeight:700,borderRadius:20,cursor:"pointer",
                      border:"1.5px dashed var(--g300)",background:"transparent",color:"var(--g600)"}}>＋ Add email</button>
                </div>
                {showManual&&<input className="fi" style={{marginTop:8}} value={testTo} onChange={e=>setTestTo(e.target.value)} placeholder="extra@email.com, another@email.com"/>}
                <button className="btn btn-ghost btn-sm" style={{marginTop:8}} disabled={sending==="test"} onClick={()=>doSend("test")}>{sending==="test"?"Sending…":"✉️ Send test"}</button>
              </div>

              <div style={{flex:1}}>
                <label className="fl">Send to list</label>
                <div style={{fontSize:11,color:"var(--g500)",margin:"2px 0 6px",lineHeight:1.5}}>Goes to every contact in the bucket with an email. Enabled once the issue is <b>Approved</b>.</div>
                <div className="frow">
                  <div className="fg"><select className="fi" value={listSeg} onChange={e=>setListSeg(e.target.value)}>
                    <option value="all">All buckets</option>
                    <option value="community">Community</option>
                    <option value="member">Members</option>
                    <option value="donor">Donors</option>
                    <option value="prospect">Prospects</option>
                  </select></div>
                  <div style={{fontSize:12,color:"var(--g600)",alignSelf:"center",whiteSpace:"nowrap"}}>{segCount(listSeg)} with email</div>
                </div>
                <button className="btn btn-acid btn-sm" style={{marginTop:8}} disabled={draft.status!=="approved"||sending==="list"} onClick={()=>doSend("list")}>{sending==="list"?"Sending…":"🚀 Send to list"}</button>
                {draft.status!=="approved"&&<div style={{fontSize:11,color:"var(--g500)",marginTop:6}}>Set status to <b>Approved</b> above to enable.</div>}
              </div>
            </div>
          </div></div>

          {/* ── Preview (sticky panel that scrolls to whatever field you focus) ── */}
          <div className="card" style={{position:"sticky",top:12}}>
            <div className="card-hd"><span className="card-ttl">Preview</span><span style={{fontSize:11,color:"var(--g500)"}}>live · follows the field you're editing</span></div>
            <div style={{height:"calc(100vh - 96px)",minHeight:480,background:"#F7F7F6",borderRadius:"0 0 10px 10px",overflow:"hidden"}}>
              <iframe ref={previewRef} title="newsletter-preview" onLoad={onPreviewLoad} sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox" srcDoc={PREVIEW_SHELL} style={{width:"100%",height:"100%",border:"none"}}/>
            </div>
          </div>
        </div>
      </div>

      {confirmDel&&<ConfirmModal message={`Delete "${draft.subject||"this newsletter"}"? This cannot be undone.`} onConfirm={()=>doDelete(confirmDel)} onCancel={()=>setConfirmDel(null)}/>}

      {nameVersion&&<Modal title="Save version" onClose={()=>setNameVersion(null)}
        footer={<><button className="btn btn-ghost btn-sm" onClick={()=>setNameVersion(null)}>Cancel</button><button className="btn btn-blk btn-sm" onClick={()=>{ commitVersion(versionLabel); setNameVersion(null); }}>📌 Save version</button></>}>
        <label className="fl" style={{marginBottom:6}}>Name this version (optional)</label>
        <input className="fi" autoFocus value={versionLabel} placeholder={nameVersion.defaultLabel}
          onChange={e=>setVersionLabel(e.target.value)}
          onKeyDown={e=>{ if(e.key==="Enter"){ commitVersion(versionLabel); setNameVersion(null); } }}/>
      </Modal>}

      {restoreV&&<ConfirmModal title="Restore version" confirmLabel="Restore" danger={false}
        message={`Restore "${restoreV.label}"? Your current unsaved edits will be replaced (the version history is kept).`}
        onConfirm={()=>{ restoreVersion(restoreV); setRestoreV(null); }} onCancel={()=>setRestoreV(null)}/>}
    </div>
  );
}

/* ─── Events View ────────────────────────────────────────────────────────────── */
const EVT_STATUS_OPTS = [
  {value:"upcoming",label:"Upcoming"},
  {value:"completed",label:"Completed"},
  {value:"cancelled",label:"Cancelled"},
];
const EVT_STATUS_COLOR = {upcoming:"var(--acid-lt)",completed:"var(--cyan-lt)",cancelled:"var(--g200)"};
const EVT_STATUS_TEXT  = {upcoming:"#3a3d00",completed:"#155e6e",cancelled:"var(--g600)"};

function EventStatusTag({status}) {
  return <span style={{background:EVT_STATUS_COLOR[status]||"var(--g100)",color:EVT_STATUS_TEXT[status]||"var(--g600)",fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:20,textTransform:"uppercase",letterSpacing:"0.05em",whiteSpace:"nowrap"}}>{status||"upcoming"}</span>;
}

const BLANK_EVENT = () => ({
  id: `evt_${uid()}`,
  name: "", event_date: "", status: "upcoming",
  location: "", start_time: "", end_time: "", recurrence: null,
  description: "", recap: "", contact_ids: [], confirmed_ids: [], notes: "",
  checklist: [], next_actions: [], links: [],
});

function EventEditPage({editing,setEditing,onSave,onCancel,contacts}) {
  const [eTab,setETab]=useState("overview");
  const contactOpts = contacts.map(c=>({value:c.id,label:`${c.first_name} ${c.last_name}`.trim()||c.id,meta:c.title||""}));
  const toggleContact = (cId) => {
    const ids = editing.contact_ids||[];
    setEditing({...editing, contact_ids: ids.includes(cId) ? ids.filter(x=>x!==cId) : [...ids,cId]});
  };
  const [cSearch,setCSearch]=useState("");
  const filteredC = contactOpts.filter(o=>o.label.toLowerCase().includes(cSearch.toLowerCase()));

  // Checklist helpers
  const [clText,setClText]=useState(""); const [clDate,setClDate]=useState("");
  const addChecklistItem = () => {
    if(!clText.trim()) return;
    const item={id:uid(),text:clText.trim(),date:clDate||null,completed:false};
    setEditing({...editing,checklist:[...(editing.checklist||[]),item]});
    setClText(""); setClDate("");
  };
  const toggleChecklist = (id) => {
    const updated=(editing.checklist||[]).map(i=>i.id===id?{...i,completed:!i.completed}:i);
    setEditing({...editing,checklist:updated});
  };
  const deleteChecklistItem = (id) => setEditing({...editing,checklist:(editing.checklist||[]).filter(i=>i.id!==id)});
  const importChecklistTemplate = (tplName) => {
    const tpl = EVENT_CHECKLIST_TEMPLATES[tplName];
    if(!tpl || !editing.event_date) return;
    const existing = new Set((editing.checklist||[]).map(i=>(i.text||"").toLowerCase().trim()));
    const newItems = tpl
      .filter(t=>!existing.has(t.text.toLowerCase().trim()))
      .map(t=>({id:uid(),text:t.text,date:shiftDate(editing.event_date,t.offset),completed:false}));
    if(newItems.length===0) return;
    setEditing({...editing,checklist:[...(editing.checklist||[]),...newItems]});
  };

  // Next Actions helpers
  const [naText,setNaText]=useState(""); const [naDate,setNaDate]=useState("");
  const addNextAction = () => {
    if(!naText.trim()) return;
    const item={id:uid(),text:naText.trim(),date:naDate||null,completed:false};
    setEditing({...editing,next_actions:[...(editing.next_actions||[]),item]});
    setNaText(""); setNaDate("");
  };
  const toggleNextAction = (id) => {
    const updated=(editing.next_actions||[]).map(i=>i.id===id?{...i,completed:!i.completed}:i);
    setEditing({...editing,next_actions:updated});
  };
  const deleteNextAction = (id) => setEditing({...editing,next_actions:(editing.next_actions||[]).filter(i=>i.id!==id)});

  // Links helpers
  const [lkUrl,setLkUrl]=useState(""); const [lkLabel,setLkLabel]=useState("");
  const addLink = () => {
    if(!lkUrl.trim()) return;
    const item={id:uid(),url:lkUrl.trim(),label:lkLabel.trim()};
    setEditing({...editing,links:[...(editing.links||[]),item]});
    setLkUrl(""); setLkLabel("");
  };
  const deleteLink = (id) => setEditing({...editing,links:(editing.links||[]).filter(l=>l.id!==id)});

  const active_cl=(editing.checklist||[]).filter(i=>!i.completed);
  const done_cl=(editing.checklist||[]).filter(i=>i.completed);
  const active_na=(editing.next_actions||[]).filter(i=>!i.completed);
  const done_na=(editing.next_actions||[]).filter(i=>i.completed);

  return (
    <div className="page">
      <div className="pg-hd">
        <div>
          {!editing._isNew&&<div style={{fontSize:12,color:"var(--g500)",marginBottom:6}}>
            <span style={{cursor:"pointer",color:"var(--cyan)"}} onClick={onCancel}>Events</span>
            <span style={{margin:"0 6px",color:"var(--g400)"}}>›</span>
            <span style={{cursor:"pointer",color:"var(--cyan)"}} onClick={onCancel}>{editing.name||"Event"}</span>
            <span style={{margin:"0 6px",color:"var(--g400)"}}>›</span>
            <span>Edit</span>
          </div>}
          {!editing._isNew&&<button className="btn btn-ghost btn-sm" style={{marginBottom:6}} onClick={onCancel}>← Back to detail</button>}
          <div className="pg-ttl">{editing._isNew?"Add Event":`Edit — ${editing.name||"Event"}`}</div>
          <div style={{fontSize:12,color:"var(--g500)",marginTop:2}}>Changes saved optimistically</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
          <button className="btn btn-blk btn-sm" onClick={onSave}>Save Changes →</button>
        </div>
      </div>
      <div className="modal-tabs">
        {["overview","checklist","next actions","contacts","links"].map(t=><button key={t} className={`modal-tab ${eTab===t?"on":""}`} onClick={()=>setETab(t)}>{t}</button>)}
      </div>

      {eTab==="overview"&&<>
        <div className="frow">
          <div className="fg"><label className="fl">Event Name</label><input className="fi" value={editing.name||""} onChange={e=>setEditing({...editing,name:e.target.value})} autoFocus/></div>
          <div className="fg"><label className="fl">{editing.recurrence?"Start date":"Date"}</label><input type="date" className="fi" value={editing.event_date||""} onChange={e=>setEditing({...editing,event_date:e.target.value})}/></div>
        </div>
        <div className="frow">
          <div className="fg"><label className="fl">Start time</label><input type="time" className="fi" value={editing.start_time||""} onChange={e=>setEditing({...editing,start_time:e.target.value})}/></div>
          <div className="fg"><label className="fl">End time</label><input type="time" className="fi" value={editing.end_time||""} onChange={e=>setEditing({...editing,end_time:e.target.value})}/></div>
        </div>
        <div className="fg">
          <label className="fl">Repeats</label>
          <select className="fs" value={editing.recurrence?.frequency||""} onChange={e=>{
            const f=e.target.value;
            if(!f){ setEditing({...editing,recurrence:null}); return; }
            const wd = editing.recurrence?.weekday ?? (editing.event_date ? new Date(editing.event_date+"T12:00:00").getDay() : new Date().getDay());
            setEditing({...editing,recurrence:{frequency:f,weekday:wd,until:editing.recurrence?.until??null}});
          }}>
            <option value="">Doesn't repeat</option>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Every 2 weeks</option>
            <option value="monthly">Monthly</option>
            <option value="daily">Daily</option>
          </select>
        </div>
        {editing.recurrence&&(editing.recurrence.frequency==="weekly"||editing.recurrence.frequency==="biweekly")&&
          <div className="fg"><label className="fl">On</label>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d,i)=>(
                <button key={d} type="button" className={`btn btn-sm ${editing.recurrence.weekday===i?"btn-blk":"btn-ghost"}`}
                  onClick={()=>setEditing({...editing,recurrence:{...editing.recurrence,weekday:i}})}>{d}</button>
              ))}
            </div>
          </div>}
        {editing.recurrence&&
          <div className="fg"><label className="fl">Repeat until <span style={{fontWeight:400,color:"var(--g400)"}}>· optional</span></label>
            <input type="date" className="fi" value={editing.recurrence.until||""} onChange={e=>setEditing({...editing,recurrence:{...editing.recurrence,until:e.target.value||null}})}/></div>}
        {editing.recurrence&&<div style={{fontSize:12,color:"var(--cyan)",fontWeight:700,marginBottom:12,marginTop:-4}}>{recurrenceSummary(editing)}</div>}
        <div className="fg"><label className="fl">Status</label><RadioGroup options={EVT_STATUS_OPTS} value={editing.status||"upcoming"} onChange={v=>setEditing({...editing,status:v})}/></div>
        <div className="fg"><label className="fl">Location</label><input className="fi" value={editing.location||""} onChange={e=>setEditing({...editing,location:e.target.value})}/></div>
        <div className="fg"><label className="fl">Description</label><textarea className="fta" rows={3} value={editing.description||""} onChange={e=>setEditing({...editing,description:e.target.value})}/></div>
        <div className="fg"><label className="fl">Recap blurb <span style={{fontWeight:400,color:"var(--g400)"}}>· 2–3 sentences, paste-ready for the newsletter</span></label><textarea className="fta" rows={3} value={editing.recap||""} onChange={e=>setEditing({...editing,recap:e.target.value})} placeholder="Warm, specific, no jargon. Pulled into the monthly roundup by the newsletter tool once status is completed."/></div>
        <div className="fg"><label className="fl">Notes</label><textarea className="fta" rows={2} value={editing.notes||""} onChange={e=>setEditing({...editing,notes:e.target.value})}/></div>
      </>}

      {eTab==="checklist"&&<>
        <div style={{fontSize:11,color:"var(--g400)",marginBottom:12}}>Event day / prep checklist — mark items done during the event.</div>
        <div style={{marginBottom:14,padding:"10px 12px",background:"var(--g50)",borderRadius:8,border:"1px solid var(--g100)"}}>
          <div style={{fontSize:11,fontWeight:700,marginBottom:6}}>📋 Import a checklist template</div>
          {!editing.event_date
            ? <div style={{fontSize:11,color:"var(--g400)"}}>Set the event date on the Overview tab first — each item's due date is calculated from it.</div>
            : <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {Object.keys(EVENT_CHECKLIST_TEMPLATES).map(name=>(
                  <button key={name} className="btn btn-ghost btn-sm" onClick={()=>importChecklistTemplate(name)}>＋ Import “{name}” checklist</button>
                ))}
                <span style={{fontSize:10,color:"var(--g400)",alignSelf:"center"}}>Dates auto-fill from {fmtDate(editing.event_date)} · already-added items are skipped</span>
              </div>}
        </div>
        <div style={{maxHeight:340,overflowY:"auto",marginBottom:12}}>
          {[...active_cl,...done_cl].map(item=>(
            <div key={item.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:"1px solid var(--g100)"}}>
              <input type="checkbox" checked={item.completed} onChange={()=>toggleChecklist(item.id)} style={{accentColor:"var(--cyan)",cursor:"pointer"}}/>
              <span style={{flex:1,fontSize:12,textDecoration:item.completed?"line-through":"none",color:item.completed?"var(--g400)":"inherit"}}>{item.text}</span>
              {item.date&&<span style={{fontSize:10,color:"var(--g400)"}}>{fmtDate(item.date)}</span>}
              <button onClick={()=>deleteChecklistItem(item.id)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--red)",fontSize:14,lineHeight:1,padding:"0 2px"}}>×</button>
            </div>
          ))}
          {(editing.checklist||[]).length===0&&<div style={{fontSize:12,color:"var(--g400)",padding:"10px 0"}}>No checklist items yet.</div>}
        </div>
        <div className="frow" style={{alignItems:"flex-end",gap:8}}>
          <div className="fg"><label className="fl">Item</label><input className="fi" placeholder="Add checklist item…" value={clText} onChange={e=>setClText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addChecklistItem()}/></div>
          <div style={{width:130,flexShrink:0}}><label className="fl">Due date</label><input type="date" className="fi" value={clDate} onChange={e=>setClDate(e.target.value)}/></div>
          <button className="btn btn-blk btn-sm" style={{flexShrink:0,marginBottom:1}} onClick={addChecklistItem}>Add</button>
        </div>
      </>}

      {eTab==="next actions"&&<>
        <div style={{fontSize:11,color:"var(--g400)",marginBottom:12}}>Follow-up actions after this event — track to completion.</div>
        <div style={{maxHeight:340,overflowY:"auto",marginBottom:12}}>
          {[...active_na,...done_na].map(item=>(
            <div key={item.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:"1px solid var(--g100)"}}>
              <input type="checkbox" checked={item.completed} onChange={()=>toggleNextAction(item.id)} style={{accentColor:"var(--cyan)",cursor:"pointer"}}/>
              <span style={{flex:1,fontSize:12,textDecoration:item.completed?"line-through":"none",color:item.completed?"var(--g400)":"inherit"}}>{item.text}</span>
              {item.date&&<span style={{fontSize:10,color:"var(--g400)"}}>{fmtDate(item.date)}</span>}
              <button onClick={()=>deleteNextAction(item.id)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--red)",fontSize:14,lineHeight:1,padding:"0 2px"}}>×</button>
            </div>
          ))}
          {(editing.next_actions||[]).length===0&&<div style={{fontSize:12,color:"var(--g400)",padding:"10px 0"}}>No next actions yet.</div>}
        </div>
        <div className="frow" style={{alignItems:"flex-end",gap:8}}>
          <div className="fg"><label className="fl">Action</label><input className="fi" placeholder="Add next action…" value={naText} onChange={e=>setNaText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addNextAction()}/></div>
          <div style={{width:130,flexShrink:0}}><label className="fl">Due date</label><input type="date" className="fi" value={naDate} onChange={e=>setNaDate(e.target.value)}/></div>
          <button className="btn btn-blk btn-sm" style={{flexShrink:0,marginBottom:1}} onClick={addNextAction}>Add</button>
        </div>
      </>}

      {eTab==="contacts"&&<div className="fg">
        <label className="fl">Linked Contacts ({(editing.contact_ids||[]).length})</label>
        <input className="fi" placeholder="Search contacts…" value={cSearch} onChange={e=>setCSearch(e.target.value)} style={{marginBottom:6}}/>
        <div style={{maxHeight:360,overflowY:"auto",border:"1.5px solid var(--g200)",borderRadius:6}}>
          {filteredC.map(o=>{
            const on=(editing.contact_ids||[]).includes(o.value);
            return <div key={o.value} onClick={()=>toggleContact(o.value)} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",cursor:"pointer",background:on?"var(--cyan-lt)":"#fff",borderBottom:"1px solid var(--g100)"}}>
              <span style={{fontSize:12,fontWeight:700,flex:1}}>{o.label}</span>
              {o.meta&&<span style={{fontSize:10,color:"var(--g400)"}}>{o.meta}</span>}
              {on&&<span style={{color:"var(--cyan)",fontWeight:900,fontSize:14}}>✓</span>}
            </div>;
          })}
          {filteredC.length===0&&<div style={{padding:"10px 12px",fontSize:12,color:"var(--g400)"}}>No contacts found</div>}
        </div>
      </div>}

      {eTab==="links"&&<>
        <div style={{fontSize:11,color:"var(--g400)",marginBottom:12}}>Store Google Docs, Drive folders, shared resources, and reference URLs for this event.</div>
        <div style={{marginBottom:12}}>
          {(editing.links||[]).length===0&&<div style={{fontSize:12,color:"var(--g400)",padding:"10px 0"}}>No links yet.</div>}
          {(editing.links||[]).map(l=>{
            const isDoc=l.url.includes("docs.google.com");
            const isFolder=l.url.includes("drive.google.com");
            const iconBg=isDoc?"rgba(115,196,214,0.15)":isFolder?"var(--acid-lt)":"var(--g100)";
            const iconColor=isDoc?"#155e6e":isFolder?"#3a3d00":"var(--g600)";
            const iconChar=isDoc?"D":isFolder?"F":"↗";
            return (
              <div key={l.id} onClick={()=>window.open(l.url,"_blank","noreferrer")} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",marginBottom:6,border:"1.5px solid var(--g200)",borderRadius:8,background:"#fff",boxShadow:"var(--sh-sm)",cursor:"pointer"}}>
                <div style={{width:28,height:28,borderRadius:6,background:iconBg,color:iconColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,flexShrink:0}}>{iconChar}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{l.label||l.url}</div>
                  {l.label&&<div style={{fontSize:10,color:"var(--g400)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{l.url}</div>}
                </div>
                <span style={{color:"var(--g400)",fontSize:13,flexShrink:0,padding:"4px"}}>↗</span>
                <button onClick={ev=>{ev.stopPropagation();deleteLink(l.id);}} style={{background:"none",border:"none",cursor:"pointer",color:"var(--g400)",fontSize:16,lineHeight:1,padding:"0 2px",flexShrink:0}} title="Remove">×</button>
              </div>
            );
          })}
        </div>
        <div className="frow" style={{alignItems:"flex-end",gap:8}}>
          <div className="fg"><label className="fl">URL *</label><input className="fi" placeholder="https://…" value={lkUrl} onChange={e=>setLkUrl(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addLink()}/></div>
          <div className="fg"><label className="fl">Label (optional)</label><input className="fi" placeholder="e.g. RSVP Form" value={lkLabel} onChange={e=>setLkLabel(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addLink()}/></div>
          <button className="btn btn-blk btn-sm" style={{flexShrink:0,marginBottom:1}} onClick={addLink}>Add</button>
        </div>
      </>}
    </div>
  );
}

function EventDetailPage({event,contacts,onBack,onEdit,onDelete,onUpdateEvent,onContactClick}) {
  const linked = contacts.filter(c=>(event.contact_ids||[]).includes(c.id));
  const today=new Date().toISOString().slice(0,10);

  // contacts modal
  const [showContactsModal,setShowContactsModal]=useState(false);

  // calendar state — default to event month, else current month
  const defaultMonth=(event.event_date||today).slice(0,7);
  const [calMonth,setCalMonth]=useState(defaultMonth);
  const [popover,setPopover]=useState(null); // {itemId}
  const [editText,setEditText]=useState("");  // local draft for popover name edit
  const [addDate,setAddDate]=useState(null);  // dateStr → inline add input shown in that cell
  const [addText,setAddText]=useState("");
  const [dragId,setDragId]=useState(null);    // checklist item id being dragged

  const onToggleConfirm = (cId) => {
    const ids=event.confirmed_ids||[];
    onUpdateEvent({...event, confirmed_ids: ids.includes(cId)?ids.filter(x=>x!==cId):[...ids,cId]});
  };
  const onToggleChecklist = (id) => {
    const updated=(event.checklist||[]).map(i=>i.id===id?{...i,completed:!i.completed}:i);
    onUpdateEvent({...event, checklist:updated});
  };
  const updateChecklistItem = (id,patch) => {
    onUpdateEvent({...event, checklist:(event.checklist||[]).map(i=>i.id===id?{...i,...patch}:i)});
  };
  const deleteChecklistItem = (id) => {
    onUpdateEvent({...event, checklist:(event.checklist||[]).filter(i=>i.id!==id)});
    setPopover(null);
  };
  const addChecklistItem = (dateStr,text) => {
    if(!text.trim()) return;
    onUpdateEvent({...event, checklist:[...(event.checklist||[]),{id:uid(),text:text.trim(),date:dateStr||null,completed:false}]});
  };
  const openAdd = (dayStr) => { if(addDate===dayStr) return; setPopover(null); setAddDate(dayStr); setAddText(""); };
  const dropOnDay = (dayStr) => { if(dragId){ updateChecklistItem(dragId,{date:dayStr}); setDragId(null); } };

  const cl=event.checklist||[];
  const clTotal=cl.length;
  const clDone=cl.filter(i=>i.completed).length;
  const clWithDate=cl.filter(i=>i.date);
  const clNoDate=cl.filter(i=>!i.date);

  const avatarColors=["#2dd4bf","#818cf8","#fb923c","#34d399","#f472b6","#60a5fa"];
  const avatarBg=(c)=>avatarColors[(c.first_name||"").charCodeAt(0)%avatarColors.length];

  // calendar helpers
  const [calYear,calMonthIdx]=calMonth.split("-").map(Number);
  const prevMonth=()=>{
    const d=new Date(calYear,calMonthIdx-1,1);
    d.setMonth(d.getMonth()-1);
    setCalMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);
    setPopover(null);
  };
  const nextMonth=()=>{
    const d=new Date(calYear,calMonthIdx-1,1);
    d.setMonth(d.getMonth()+1);
    setCalMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);
    setPopover(null);
  };
  const daysInMonth=new Date(calYear,calMonthIdx,0).getDate();
  const firstDow=new Date(calYear,calMonthIdx-1,1).getDay();
  const monthLabel=new Date(calYear,calMonthIdx-1,1).toLocaleString("default",{month:"long",year:"numeric"});

  // map date→items for this month
  const itemsByDay={};
  clWithDate.forEach(item=>{
    if(item.date.slice(0,7)===calMonth) {
      const day=parseInt(item.date.slice(8,10),10);
      if(!itemsByDay[day]) itemsByDay[day]=[];
      itemsByDay[day].push(item);
    }
  });

  const ContactRow=({c})=>{
    const confirmed=(event.confirmed_ids||[]).includes(c.id);
    const initials=((c.first_name||"").charAt(0)+(c.last_name||"").charAt(0)).toUpperCase();
    const types=(c.relationship_types&&c.relationship_types.length?c.relationship_types:[c.relationship_type]).filter(Boolean);
    return (
      <div onClick={()=>onContactClick&&onContactClick(c)} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",borderBottom:"1px solid var(--g100)",cursor:onContactClick?"pointer":"default"}}>
        <div style={{width:32,height:32,borderRadius:"50%",background:avatarBg(c),display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#fff",flexShrink:0}}>{initials}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.first_name} {c.last_name}</div>
          {types.length>0
            ? <div style={{display:"flex",flexWrap:"wrap",gap:3,marginTop:2}}>{types.map(t=><span key={t} className="type-tag">{REL_TYPES[t]||t}</span>)}</div>
            : c.title&&<div style={{fontSize:11,color:"var(--g600)"}}>{c.title}</div>}
        </div>
        <button onClick={ev=>{ev.stopPropagation();onToggleConfirm(c.id);}} style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:20,border:"1.5px solid",cursor:"pointer",flexShrink:0,background:confirmed?"var(--cyan)":"transparent",color:confirmed?"#fff":"var(--g400)",borderColor:confirmed?"var(--cyan)":"var(--g300)"}}>
          {confirmed?"✓ Confirmed":"RSVP"}
        </button>
      </div>
    );
  };

  return (
    <div className="page" onClick={()=>{if(popover)setPopover(null);if(addDate!==null)setAddDate(null);}}>
      {/* PAGE HEADER */}
      <div className="pg-hd">
        <div>
          <div style={{fontSize:12,color:"var(--g500)",marginBottom:6}}>
            <span style={{cursor:"pointer",color:"var(--cyan)"}} onClick={onBack}>Events</span>
            <span style={{margin:"0 6px",color:"var(--g400)"}}>›</span>
            <span>{event.name||"(Unnamed Event)"}</span>
          </div>
          <div className="pg-ttl">{event.name||"(Unnamed Event)"}</div>
          <div className="pg-sub">{fmtDate(event.event_date)}{event.start_time?` · ${fmtTime(event.start_time)}${event.end_time?`–${fmtTime(event.end_time)}`:""}`:""}{event.location?` · ${event.location}`:""}</div>
          {event.recurrence?.frequency&&<div style={{fontSize:12,color:"var(--cyan)",fontWeight:700,marginTop:2}}>{recurrenceSummary(event)}</div>}
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <button className="btn btn-ghost btn-sm" onClick={onEdit}>Edit Event</button>
          <button className="btn btn-danger btn-sm" onClick={onDelete}>Delete</button>
        </div>
      </div>
      <div style={{marginBottom:16}}><EventStatusTag status={event.status}/></div>

      {/* TOP TWO-COLUMN: info left, contacts right */}
      <div style={{display:"flex",gap:24,alignItems:"flex-start",marginBottom:24}}>
        <div style={{flex:"1 1 0",minWidth:0}}>
          {event.description&&<div className="dp-section"><div className="dp-sect-lbl">Description</div><p style={{fontSize:12,lineHeight:1.7,margin:0}}>{event.description}</p></div>}
          {event.notes&&<div className="dp-section"><div className="dp-sect-lbl">Notes</div><p style={{fontSize:12,lineHeight:1.7,margin:0}}>{event.notes}</p></div>}
          {(event.links||[]).length>0&&<div className="dp-section">
            <div className="dp-sect-lbl">Links</div>
            {(event.links||[]).map(l=>{
              const isDoc=l.url.includes("docs.google.com");
              const isFolder=l.url.includes("drive.google.com");
              const iconBg=isDoc?"rgba(115,196,214,0.15)":isFolder?"var(--acid-lt)":"var(--g100)";
              const iconColor=isDoc?"#155e6e":isFolder?"#3a3d00":"var(--g600)";
              const iconChar=isDoc?"D":isFolder?"F":"↗";
              return (
                <div key={l.id} onClick={()=>window.open(l.url,"_blank","noreferrer")} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",marginBottom:6,border:"1.5px solid var(--g200)",borderRadius:8,background:"#fff",boxShadow:"var(--sh-sm)",cursor:"pointer"}}>
                  <div style={{width:28,height:28,borderRadius:6,background:iconBg,color:iconColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,flexShrink:0}}>{iconChar}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{l.label||l.url}</div>
                    {l.label&&<div style={{fontSize:10,color:"var(--g400)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{l.url}</div>}
                  </div>
                  <span style={{color:"var(--g400)",fontSize:13,flexShrink:0,padding:"4px"}}>↗</span>
                </div>
              );
            })}
          </div>}
        </div>

        {/* CONTACTS STRIP */}
        {linked.length>0&&<div style={{width:260,flexShrink:0}}>
          <div className="dp-section" style={{paddingTop:0}}>
            <div className="dp-sect-lbl">Contacts ({linked.length}) — RSVP</div>
            {linked.slice(0,3).map(c=><ContactRow key={c.id} c={c}/>)}
            {linked.length>3&&<div style={{paddingTop:8}}>
              <button className="btn btn-ghost btn-sm" style={{width:"100%"}} onClick={()=>setShowContactsModal(true)}>
                Show all {linked.length} contacts
              </button>
            </div>}
          </div>
        </div>}
      </div>

      {/* FULL-WIDTH CHECKLIST CALENDAR */}
      <div style={{borderTop:"1.5px solid var(--g200)",paddingTop:20}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div className="dp-sect-lbl" style={{margin:0}}>Checklist</div>
            {clTotal>0
              ? <span style={{fontSize:11,color:"var(--g500)"}}>{clDone} / {clTotal} done</span>
              : <span style={{fontSize:11,color:"var(--g400)"}}>Click a day to add an item</span>}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <button className="btn btn-ghost btn-sm" onClick={prevMonth}>←</button>
            <span style={{fontSize:12,fontWeight:700,minWidth:130,textAlign:"center"}}>{monthLabel}</span>
            <button className="btn btn-ghost btn-sm" onClick={nextMonth}>→</button>
          </div>
        </div>
        <div style={{height:5,borderRadius:3,background:"var(--g100)",marginBottom:16,overflow:"hidden"}}>
          <div style={{height:"100%",borderRadius:3,background:"var(--cyan)",width:clTotal?`${(clDone/clTotal)*100}%`:"0%",transition:"width 0.3s"}}/>
        </div>

        {/* CALENDAR GRID */}
        <div className="cal-grid" onClick={e=>e.stopPropagation()}>
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=>(
            <div key={d} className="cal-day-hd">{d}</div>
          ))}
          {Array.from({length:firstDow}).map((_,i)=>(
            <div key={`empty-${i}`} className="cal-day other-month"/>
          ))}
          {Array.from({length:daysInMonth}).map((_,i)=>{
            const day=i+1;
            const dayStr=`${calMonth}-${String(day).padStart(2,"0")}`;
            const isToday=dayStr===today;
            const items=itemsByDay[day]||[];
            const isDropTarget=dragId!=null;
            return (
              <div key={day} className={`cal-day${isToday?" today":""}`}
                style={{cursor:"pointer",position:"relative",outline:isDropTarget?"1.5px dashed var(--cyan)":"none"}}
                onClick={()=>openAdd(dayStr)}
                onDragOver={e=>{if(dragId)e.preventDefault();}}
                onDrop={e=>{e.preventDefault();dropOnDay(dayStr);}}>
                <div className="cal-date">{day}</div>
                {items.map(item=>(
                  <div key={item.id} style={{position:"relative"}}>
                    <div className="cal-dot" draggable
                      onDragStart={e=>{e.stopPropagation();setPopover(null);setDragId(item.id);}}
                      onDragEnd={()=>setDragId(null)}
                      onClick={e=>{e.stopPropagation();const opening=popover?.itemId!==item.id;setPopover(opening?{itemId:item.id}:null);if(opening)setEditText(item.text);setAddDate(null);}}
                      style={{background:item.completed?"var(--cyan-lt)":(!item.completed&&item.date<=today)?"var(--fuchsia-lt)":"var(--acid-lt)",color:item.completed?"#155e6e":(!item.completed&&item.date<=today)?"#8b0057":"#3a3d00",textDecoration:item.completed?"line-through":"none"}}>
                      {item.text}
                    </div>
                    {/* EDIT POPOVER */}
                    {popover?.itemId===item.id&&(
                      <div onClick={e=>e.stopPropagation()} style={{position:"absolute",top:"100%",left:0,zIndex:300,background:"#fff",border:"1.5px solid var(--g200)",borderRadius:8,padding:"10px 12px",boxShadow:"var(--sh-lg)",minWidth:210,marginTop:4}}>
                        <label className="fl">Item</label>
                        <input className="fi" style={{fontSize:12,marginBottom:8}} value={editText}
                          onChange={e=>setEditText(e.target.value)}
                          onKeyDown={e=>{if(e.key==="Enter"){updateChecklistItem(item.id,{text:editText.trim()||item.text});setPopover(null);}}}
                          onBlur={()=>{const t=editText.trim();if(t&&t!==item.text)updateChecklistItem(item.id,{text:t});}}/>
                        <label className="fl">Due date</label>
                        <input type="date" className="fi" style={{fontSize:11,marginBottom:8}} value={item.date||""}
                          onChange={e=>updateChecklistItem(item.id,{date:e.target.value||null})}/>
                        <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:12,marginBottom:8}}>
                          <input type="checkbox" checked={item.completed} onChange={()=>onToggleChecklist(item.id)} style={{accentColor:"var(--cyan)"}}/>
                          {item.completed?"Completed":"Mark complete"}
                        </label>
                        <button className="btn btn-danger btn-sm" style={{width:"100%"}} onClick={()=>deleteChecklistItem(item.id)}>Delete item</button>
                      </div>
                    )}
                  </div>
                ))}
                {/* INLINE ADD */}
                {addDate===dayStr&&(
                  <div onClick={e=>e.stopPropagation()} style={{marginTop:3}}>
                    <input autoFocus className="fi" style={{fontSize:9,padding:"2px 5px",height:"auto",lineHeight:1.3}}
                      placeholder="New item… ↵" value={addText}
                      onChange={e=>setAddText(e.target.value)}
                      onKeyDown={e=>{if(e.key==="Enter"){addChecklistItem(dayStr,addText);setAddText("");setAddDate(null);}if(e.key==="Escape")setAddDate(null);}}
                      onBlur={()=>setAddDate(null)}/>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div style={{fontSize:10,color:"var(--g400)",marginTop:8}}>Click a day to add · click an item to edit its name and date · drag an item to move it</div>

        {/* NO-DATE ITEMS */}
        {clNoDate.length>0&&<div style={{marginTop:16}}
          onDragOver={e=>{if(dragId)e.preventDefault();}}
          onDrop={e=>{e.preventDefault();if(dragId){updateChecklistItem(dragId,{date:null});setDragId(null);}}}>
          <div className="dp-sect-lbl" style={{marginBottom:8}}>No due date <span style={{fontWeight:400,textTransform:"none",letterSpacing:0,color:"var(--g400)"}}>· drag here to clear a date</span></div>
          {clNoDate.map(item=>(
            <div key={item.id} draggable onDragStart={()=>setDragId(item.id)} onDragEnd={()=>setDragId(null)}
              style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid var(--g100)"}}>
              <span style={{cursor:"grab",color:"var(--g300)",fontSize:13,lineHeight:1}} title="Drag to a day">⠿</span>
              <input type="checkbox" checked={item.completed} onChange={()=>onToggleChecklist(item.id)} style={{accentColor:"var(--cyan)",cursor:"pointer",flexShrink:0}}/>
              <input className="fi" style={{flex:1,fontSize:12,padding:"3px 6px"}} defaultValue={item.text}
                onBlur={e=>{const t=e.target.value.trim();if(t&&t!==item.text)updateChecklistItem(item.id,{text:t});}}
                onKeyDown={e=>{if(e.key==="Enter")e.target.blur();}}/>
              <input type="date" className="fi" style={{width:140,fontSize:11,padding:"3px 6px",flexShrink:0}} value={item.date||""}
                onChange={e=>updateChecklistItem(item.id,{date:e.target.value||null})}/>
              <button onClick={()=>deleteChecklistItem(item.id)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--red)",fontSize:14,lineHeight:1,padding:"0 2px",flexShrink:0}}>×</button>
            </div>
          ))}
        </div>}
      </div>

      {/* CONTACTS MODAL */}
      {showContactsModal&&(
        <div className="mover" onClick={()=>setShowContactsModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{width:480,maxHeight:"80vh",display:"flex",flexDirection:"column"}}>
            <div className="m-hd">
              <div className="m-ttl">Contacts ({linked.length}) — RSVP</div>
              <button className="m-close" onClick={()=>setShowContactsModal(false)}>×</button>
            </div>
            <div className="m-bd" style={{overflowY:"auto",flex:1}}>
              {linked.map(c=><ContactRow key={c.id} c={c}/>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EventsView({events,contacts,orgs,onUpdate,onDelete,showToast,onUpdateContacts}) {
  const [search,setSearch]=useState("");
  const [fStatus,setFStatus]=useState("all");
  const [viewMode,setViewMode]=useState(()=>{ try{ return localStorage.getItem("sprout_evt_view")||"calendar"; }catch{ return "calendar"; } });
  const setView=(m)=>{ setViewMode(m); try{ localStorage.setItem("sprout_evt_view",m); }catch{} };
  const [calMonth,setCalMonth]=useState(()=>new Date().toISOString().slice(0,7)); // YYYY-MM
  const [calPopover,setCalPopover]=useState(null); // {id,date}
  const [calDrag,setCalDrag]=useState(null); // event id being dragged
  const [evtPage,setEvtPage]=useState("list");
  const [selectedId,setSelectedId]=useState(null);
  const [editDraft,setEditDraft]=useState(null);
  const [confirmDel,setConfirmDel]=useState(null);
  const [inlineContact,setInlineContact]=useState(null);

  const filtered = useMemo(()=>{
    return events.filter(e=>{
      const q=search.toLowerCase();
      const matchQ=!q||e.name?.toLowerCase().includes(q)||(e.location||"").toLowerCase().includes(q);
      const matchS=fStatus==="all"||e.status===fStatus;
      return matchQ&&matchS;
    }).sort((a,b)=>{
      const da=eventDisplayDate(a)||"", db=eventDisplayDate(b)||"";
      if(!da&&!db) return 0;
      if(!da) return 1;
      if(!db) return -1;
      return da.localeCompare(db);
    });
  },[events,search,fStatus]);

  const selectedEvent = selectedId ? events.find(e=>e.id===selectedId) : null;

  const handleSave = () => {
    if(!editDraft) return;
    const {_isNew, ...clean} = editDraft;
    const isNew = !!_isNew;
    const updated = events.find(e=>e.id===clean.id)
      ? events.map(e=>e.id===clean.id?clean:e)
      : [...events, clean];
    onUpdate(updated);
    showToast(isNew?"Event added ✓":"Event updated ✓");
    setSelectedId(clean.id);
    setEditDraft(null);
    if(isNew) { setEvtPage("list"); }
    else { setEvtPage("detail"); }
  };

  const handleDelete = (id) => {
    onDelete(id);
    setSelectedId(null);
    setConfirmDel(null);
    setEvtPage("list");
  };

  const handleUpdateEvent = (updated) => {
    onUpdate(events.map(e=>e.id===updated.id?updated:e));
  };

  const handleContactClick = (c) => { setInlineContact({...c}); };
  const handleCancelEdit = () => { setEditDraft(null); setEvtPage(selectedId?"detail":"list"); };
  const handleSaveInlineContact = () => {
    if(!inlineContact||!onUpdateContacts) return;
    onUpdateContacts(inlineContact);
    setInlineContact(null);
  };

  if((evtPage==="edit"||evtPage==="new")&&editDraft) return <>
    <EventEditPage
      editing={editDraft}
      setEditing={setEditDraft}
      onSave={handleSave}
      onCancel={handleCancelEdit}
      contacts={contacts}
    />
    {confirmDel&&<ConfirmModal message={`Delete "${editDraft.name||"this event"}"? This cannot be undone.`} onConfirm={()=>handleDelete(confirmDel)} onCancel={()=>setConfirmDel(null)}/>}
  </>;

  if(evtPage==="detail"&&selectedEvent) return <>
    <EventDetailPage
      event={selectedEvent}
      contacts={contacts}
      onBack={()=>{setEvtPage("list");setSelectedId(null);}}
      onEdit={()=>{setEditDraft({...selectedEvent});setEvtPage("edit");}}
      onDelete={()=>setConfirmDel(selectedEvent.id)}
      onUpdateEvent={handleUpdateEvent}
      onContactClick={handleContactClick}
    />
    {confirmDel&&<ConfirmModal message={`Delete "${selectedEvent.name||"this event"}"? This cannot be undone.`} onConfirm={()=>handleDelete(confirmDel)} onCancel={()=>setConfirmDel(null)}/>}
    {inlineContact&&<ContactEditModal editing={inlineContact} setEditing={setInlineContact} onSave={handleSaveInlineContact} orgs={orgs||[]} events={events} onUpdateEvents={onUpdate} onNavigate={()=>{}}/>}
  </>;

  return (
    <div className="page">
      <div className="pg-hd">
        <div><div className="pg-ttl">Events</div><div className="pg-sub">{events.length} event{events.length!==1?"s":""} total</div></div>
        <button className="btn btn-blk" onClick={()=>{ setEditDraft({...BLANK_EVENT(),_isNew:true}); setEvtPage("new"); }}>+ Add Event</button>
      </div>
      {(()=>{
        const today=new Date().toISOString().slice(0,10);
        const upcoming=events.filter(e=>e.status==="upcoming").length;
        const completed=events.filter(e=>e.status==="completed").length;
        const overdue=events.reduce((acc,e)=>acc+(e.checklist||[]).filter(i=>!i.completed&&i.date&&i.date<=today).length,0);
        const statCard=(label,val,valColor)=>(
          <div className="stat" style={{flex:1,minWidth:90}}>
            <div className="stat-lbl">{label}</div>
            <div className="stat-val" style={valColor?{color:valColor}:{}}>{val}</div>
          </div>
        );
        return <div className="stats" style={{marginBottom:18}}>
          {statCard("Total",events.length)}
          {statCard("Upcoming",upcoming,"var(--cyan)")}
          {statCard("Completed",completed)}
          {statCard("Checklist overdue",overdue,overdue>0?"var(--orange)":undefined)}
        </div>;
      })()}
      <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
        <input className="fi" style={{maxWidth:260}} placeholder="Search events…" value={search} onChange={e=>setSearch(e.target.value)}/>
        <select className="fs" style={{maxWidth:160}} value={fStatus} onChange={e=>setFStatus(e.target.value)}>
          <option value="all">All Statuses</option>
          {EVT_STATUS_OPTS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <div style={{marginLeft:"auto",display:"flex",gap:4}}>
          <button className={`btn btn-xs ${viewMode==="calendar"?"btn-blk":"btn-ghost"}`} onClick={()=>setView("calendar")}>🗓 Calendar</button>
          <button className={`btn btn-xs ${viewMode==="list"?"btn-blk":"btn-ghost"}`} onClick={()=>setView("list")}>☰ List</button>
        </div>
      </div>

      {viewMode==="list" ? (
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr>
            <th>Event</th><th>Date</th><th>Status</th><th>Contacts</th><th>Location</th><th></th>
          </tr></thead>
          <tbody>
            {filtered.length===0
              ? <tr><td colSpan={6} style={{textAlign:"center",color:"var(--g400)",padding:"28px 0",fontSize:13}}>No events found</td></tr>
              : filtered.map(e=>(
                <tr key={e.id} onClick={()=>{setSelectedId(e.id);setEvtPage("detail");}}>
                  <td style={{fontWeight:700}}>{e.name||"(Unnamed)"}</td>
                  <td style={{fontSize:12,color:"var(--g600)"}}>{fmtDate(eventDisplayDate(e))}{e.start_time?` · ${fmtTime(e.start_time)}`:""}{e.recurrence?.frequency?<span title={recurrenceSummary(e)} style={{marginLeft:6,color:"var(--cyan)"}}>🔁</span>:null}</td>
                  <td><EventStatusTag status={e.status}/></td>
                  <td style={{fontSize:12,color:"var(--g600)"}}>{(e.contact_ids||[]).length}</td>
                  <td style={{fontSize:12,color:"var(--g600)",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.location||"—"}</td>
                  <td onClick={ev=>ev.stopPropagation()} style={{display:"flex",gap:4}}>
                    <button className="btn btn-ghost btn-xs" onClick={()=>{setEditDraft({...e});setEvtPage("edit");}}>Edit</button>
                    <button className="btn btn-danger btn-xs" onClick={()=>setConfirmDel(e.id)}>Del</button>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
      ) : (()=>{
        const today=new Date().toISOString().slice(0,10);
        const [yr,mo]=calMonth.split("-").map(Number);
        const firstDow=new Date(yr,mo-1,1).getDay();
        const daysInMonth=new Date(yr,mo,0).getDate();
        const monthStart=`${calMonth}-01`;
        const monthEnd=`${calMonth}-${String(daysInMonth).padStart(2,"0")}`;
        const monthLabel=new Date(yr,mo-1,1).toLocaleDateString(undefined,{month:"long",year:"numeric"});
        // Expand each filtered event into { ...event, _date } chips for every occurrence this month.
        const byDay={};
        filtered.forEach(ev=>{
          occurrencesInRange(ev,monthStart,monthEnd).forEach(d=>{
            const day=Number(d.slice(8,10));
            (byDay[day]=byDay[day]||[]).push(ev);
          });
        });
        Object.values(byDay).forEach(list=>list.sort((a,b)=>(a.start_time||"99").localeCompare(b.start_time||"99")));
        const shiftMonth=(delta)=>{ const d=new Date(yr,mo-1+delta,1); setCalMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`); };
        const chipColor=(st)=>st==="completed"?{bg:"var(--g100)",fg:"var(--g500)"}:st==="cancelled"?{bg:"var(--fuchsia-lt)",fg:"#8b0057"}:{bg:"var(--cyan-lt)",fg:"#155e6e"};
        const moveEvent=(ev,dateStr)=>{ if(ev.event_date===dateStr) return; handleUpdateEvent({...ev,event_date:dateStr}); showToast("Event moved ✓"); };
        return (
        <div onClick={()=>setCalPopover(null)}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <button className="btn btn-ghost btn-sm" onClick={()=>shiftMonth(-1)}>←</button>
              <span style={{fontSize:14,fontWeight:800,minWidth:150,textAlign:"center"}}>{monthLabel}</span>
              <button className="btn btn-ghost btn-sm" onClick={()=>shiftMonth(1)}>→</button>
              <button className="btn btn-ghost btn-xs" onClick={()=>setCalMonth(new Date().toISOString().slice(0,7))}>Today</button>
            </div>
          </div>
          <div className="cal-grid">
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=><div key={d} className="cal-day-hd">{d}</div>)}
            {Array.from({length:firstDow}).map((_,i)=><div key={`e${i}`} className="cal-day other-month"/>)}
            {Array.from({length:daysInMonth}).map((_,i)=>{
              const day=i+1;
              const dayStr=`${calMonth}-${String(day).padStart(2,"0")}`;
              const isToday=dayStr===today;
              const items=byDay[day]||[];
              return (
                <div key={day} className={`cal-day${isToday?" today":""}`}
                  style={{cursor:"default",minHeight:88,outline:calDrag?"1.5px dashed var(--cyan)":"none"}}
                  onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect="move";}}
                  onDrop={e=>{e.preventDefault();const id=calDrag||e.dataTransfer.getData("text/plain");if(id){const tgt=events.find(x=>x.id===id);if(tgt)moveEvent(tgt,dayStr);setCalDrag(null);}}}>
                  <div className="cal-date">{day}</div>
                  {items.map((ev,k)=>{
                    const col=chipColor(ev.status);
                    const recurring=!!ev.recurrence?.frequency;
                    const open=calPopover&&calPopover.id===ev.id&&calPopover.date===dayStr;
                    return (
                      <div key={ev.id+"-"+k} style={{position:"relative"}}>
                        <div className="cal-dot" title={`${ev.name||"(Unnamed)"}${ev.start_time?" · "+fmtTime(ev.start_time):""}${recurring?" · "+recurrenceSummary(ev):""}${recurring?"":" · drag to move"}`}
                          draggable={!recurring}
                          onDragStart={e=>{if(recurring){e.preventDefault();return;}e.stopPropagation();e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",ev.id);setCalPopover(null);setCalDrag(ev.id);}}
                          onDragEnd={()=>setCalDrag(null)}
                          onClick={e=>{e.stopPropagation();setCalPopover(open?null:{id:ev.id,date:dayStr});}}
                          style={{background:col.bg,color:col.fg,cursor:recurring?"pointer":"grab"}}>
                          {ev.start_time?fmtTime(ev.start_time)+" ":""}{recurring?"🔁 ":""}{ev.name||"(Unnamed)"}
                        </div>
                        {open&&(
                          <div onClick={e=>e.stopPropagation()} style={{position:"absolute",top:"100%",left:0,zIndex:300,background:"#fff",border:"1.5px solid var(--g200)",borderRadius:8,padding:"10px 12px",boxShadow:"var(--sh-lg)",minWidth:210,marginTop:4}}>
                            <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>{ev.name||"(Unnamed)"}</div>
                            {recurring
                              ? <div style={{fontSize:11,color:"var(--cyan)",fontWeight:700,marginBottom:10}}>{recurrenceSummary(ev)}<div style={{color:"var(--g400)",fontWeight:400,marginTop:4}}>Recurring — edit the series to change its dates.</div></div>
                              : <><label className="fl">Date</label>
                                  <input type="date" className="fi" style={{fontSize:11,marginBottom:10}} value={ev.event_date||""}
                                    onChange={e=>{if(e.target.value){moveEvent(ev,e.target.value);setCalPopover(null);}}}/></>}
                            <button className="btn btn-blk btn-sm" style={{width:"100%",marginBottom:6}} onClick={()=>{setSelectedId(ev.id);setEvtPage("detail");setCalPopover(null);}}>View event page →</button>
                            <button className="btn btn-ghost btn-sm" style={{width:"100%"}} onClick={()=>{setEditDraft({...ev});setEvtPage("edit");setCalPopover(null);}}>Edit</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <div style={{fontSize:10,color:"var(--g400)",marginTop:8}}>Click an event for options · drag a one-time event to move its date · 🔁 = recurring · use ← → to change month</div>
        </div>
        );
      })()}
      {confirmDel&&<ConfirmModal message={`Delete "${events.find(e=>e.id===confirmDel)?.name||"this event"}"? This cannot be undone.`} onConfirm={()=>handleDelete(confirmDel)} onCancel={()=>setConfirmDel(null)}/>}
      {inlineContact&&<ContactEditModal editing={inlineContact} setEditing={setInlineContact} onSave={handleSaveInlineContact} orgs={orgs||[]} events={events} onUpdateEvents={onUpdate} onNavigate={()=>{}}/>}
    </div>
  );
}

/* ─── Main App ───────────────────────────────────────────────────────────────── */
export default function CRMApp() {
  const [view,setView]=useState("dashboard");
  const [contacts,setContacts]=useState([]);
  const [orgs,setOrgs]=useState([]);
  const [events,setEvents]=useState([]);
  const [newsletters,setNewsletters]=useState([]);
  const [profile,setProfile]=useState(DEFAULT_PROFILE);
  const [toast,setToast]=useState(null);
  const [loading,setLoading]=useState(true);
  const [dbError,setDbError]=useState(null);
  const [pendingDetail,setPendingDetail]=useState(null);
  const [globalQuickLog,setGlobalQuickLog]=useState(false);
  const [sbCollapsed,setSbCollapsed]=useState(()=>{ try{ return localStorage.getItem("sprout_sb_collapsed")==="1"; }catch{ return false; } });
  const toggleSidebar=()=>setSbCollapsed(v=>{ const n=!v; try{ localStorage.setItem("sprout_sb_collapsed",n?"1":"0"); }catch{} return n; });

  const loadAll=useCallback(async()=>{
    setLoading(true);
    setDbError(null);
    try {
const [
        { data: contactRows, error: cErr },
        { data: orgRows,     error: oErr },
        { data: eventRows,   error: evErr },
        { data: profileData, error: prErr },
        { data: nlRows,      error: nlErr },
      ] = await Promise.all([
        fetchContacts(),
        fetchOrgs(),
        fetchEvents(),
        fetchProfile(),
        fetchNewsletters(),
      ]);

      if (cErr) throw new Error(cErr);
      if (oErr) throw new Error(oErr);
      if (evErr) console.warn("fetchEvents warning:", evErr);
      if (prErr) console.warn("fetchProfile warning:", prErr);
      if (nlErr) console.warn("fetchNewsletters warning:", nlErr);

      setContacts(contactRows);
      setOrgs(orgRows);
      setEvents(eventRows);
      setProfile(profileData);
      setNewsletters(nlRows);
    } catch (err) {
      console.error("CRM load error:", err);
      setDbError(err.message || "Failed to load data from Supabase.");
    } finally {
      setLoading(false);
    }
  },[]);

  useEffect(()=>{ loadAll(); },[loadAll]);

const toastTimer=useRef(null);
  const showToast=useCallback((msg,type="ok")=>{
    if(toastTimer.current) clearTimeout(toastTimer.current);
    setToast({msg,type});
    toastTimer.current=setTimeout(()=>setToast(null),3200);
  },[]);

  useEffect(()=>()=>{if(toastTimer.current)clearTimeout(toastTimer.current);},[]);
const saveContacts = useCallback((u) => {
    setContacts(u);
    svcSaveContacts(u).then(({ error }) => {
      if (error) { console.error("saveContacts:", error); showToast(`Save failed: ${error}`, "err"); }
    });
  }, [showToast]);

const saveOrgs = useCallback((u) => {
    setOrgs(u);
    svcSaveOrgs(u).then(({ error }) => {
      if (error) { console.error("saveOrgs:", error); showToast("Save failed — check console", "err"); }
    });
  }, [showToast]);

  const saveEvents = useCallback((u) => {
    setEvents(u);
    svcSaveEvents(u).then(({ error }) => {
      if (error) { console.error("saveEvents:", error); showToast("Save failed — check console", "err"); }
    });
  }, [showToast]);

const saveProfile = useCallback((u) => {
    setProfile(u);
    svcSaveProfile(u).then(({ error }) => {
      if (error) { console.error("saveProfile:", error); showToast("Save failed — check console", "err"); }
    });
  }, [showToast]);

  const saveNewsletter = useCallback((rec) => {
    // Optimistic update on the single record (functional form — no stale-closure list).
    setNewsletters(prev => prev.some(n=>n.id===rec.id)
      ? prev.map(n=>n.id===rec.id?rec:n)
      : [...prev, rec]);
    // Persist ONLY this record; a validation failure now surfaces instead of silently skipping.
    svcSaveNewsletter(rec).then(({ error }) => {
      if (error) { console.error("saveNewsletter:", error); showToast(`Save failed: ${error}`, "err"); }
    });
  }, [showToast]);

  const deleteNewsletter = useCallback(async (id) => {
    const prev = newsletters;
    setNewsletters(newsletters.filter(n=>n.id!==id)); // optimistic
    const { error } = await deleteNewsletterById(id);
    if (error) { console.error("deleteNewsletter:", error); showToast("Delete failed — check console","err"); setNewsletters(prev); }
    else showToast("Newsletter deleted");
  },[newsletters, showToast]);

  const importContact=useCallback((batch)=>{ const arr=Array.isArray(batch)?batch:[batch]; const u=[...contacts.filter(x=>!arr.find(c=>c.id===x.id)),...arr]; saveContacts(u); },[contacts,saveContacts]);
  const deleteContact=useCallback(async (id)=>{
    const prev = contacts;
    setContacts(contacts.filter(c=>c.id!==id)); // optimistic
    setPendingDetail(null);
    const { error } = await deleteContactById(id);
    if (error) { console.error("deleteContact:", error); showToast("Delete failed — check console","err"); setContacts(prev); }
    else showToast("Contact deleted");
  },[contacts, showToast]);
  const importOrg=useCallback((batch)=>{ const arr=Array.isArray(batch)?batch:[batch]; const u=[...orgs.filter(x=>!arr.find(o=>o.id===x.id)),...arr]; saveOrgs(u); },[orgs,saveOrgs]);
  const deleteOrg=useCallback(async (id)=>{
    const prev = orgs;
    setOrgs(orgs.filter(o=>o.id!==id)); // optimistic
    const { error } = await deleteOrgById(id);
    if (error) { console.error("deleteOrg:", error); showToast("Delete failed — check console","err"); setOrgs(prev); }
    else showToast("Organization deleted");
  },[orgs, showToast]);

  const deleteEvent=useCallback(async (id)=>{
    const prev = events;
    setEvents(events.filter(e=>e.id!==id)); // optimistic
    const { error } = await deleteEventById(id);
    if (error) { console.error("deleteEvent:", error); showToast("Delete failed — check console","err"); setEvents(prev); }
    else showToast("Event deleted");
  },[events, showToast]);
  const openContact=useCallback((c)=>{ setPendingDetail(c); setView("contacts"); },[]);
  const clearPendingDetail=useCallback(()=>setPendingDetail(null),[]);

if (loading) return (
    <><style>{STYLES}</style>
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",fontFamily:"Lato,sans-serif",flexDirection:"column",gap:12,color:"#9CA3AF"}}>
      <div style={{width:28,height:28,border:"2.5px solid #E5E7EB",borderTopColor:"#73C4D6",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>
      <div style={{fontSize:12,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase"}}>Loading CRM…</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div></>
  );

if (dbError) return (
    <><style>{STYLES}</style>
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",fontFamily:"Lato,sans-serif",flexDirection:"column",gap:12}}>
      <div style={{fontSize:28}}>⚠️</div>
      <div style={{fontSize:14,fontWeight:900,color:"#B91C1C"}}>CRM failed to load</div>
      <div style={{fontSize:12,color:"#4B5563",marginBottom:4}}>{dbError}</div>
      <button className="btn btn-ghost btn-sm" onClick={loadAll}>↺ Retry</button>
    </div></>
  );

  return (
    <><style>{STYLES}</style>
    <div className={`app ${sbCollapsed?"app-sb-collapsed":""}`}>
<Sidebar view={view} setView={(v)=>{setPendingDetail(null);setView(v);}} contacts={contacts} events={events} profile={profile} onQuickLog={()=>setGlobalQuickLog(true)} onCollapse={toggleSidebar}/>
      {sbCollapsed&&<button className="sb-reopen" onClick={toggleSidebar} title="Show sidebar">☰</button>}
      <main className="main">
        {view==="dashboard"&&<DashboardView contacts={contacts} orgs={orgs} events={events} setView={setView} openContact={openContact} onUpdateContacts={saveContacts} onUpdateEvents={saveEvents} showToast={showToast}/>}
{view==="contacts"&&<ContactsView contacts={contacts} orgs={orgs} events={events} onUpdate={saveContacts} onDelete={deleteContact} onUpdateEvents={saveEvents} showToast={showToast} pendingDetail={pendingDetail} onPendingDetailConsumed={clearPendingDetail} setView={setView}/>}
        {view==="orgs"&&<OrgsView orgs={orgs} contacts={contacts} onUpdate={saveOrgs} onDelete={deleteOrg} showToast={showToast}/>}
{view==="events"&&<EventsView events={events} contacts={contacts} orgs={orgs} onUpdate={saveEvents} onDelete={deleteEvent} showToast={showToast} onUpdateContacts={(c)=>saveContacts(contacts.map(x=>x.id===c.id?c:x))}/>}
        {view==="newsletter"&&<NewsletterView newsletters={newsletters} events={events} contacts={contacts} profile={profile} onUpdate={saveNewsletter} onDelete={deleteNewsletter} showToast={showToast}/>}
        {view==="outreach"&&<OutreachView contacts={contacts} orgs={orgs} events={events}/>}
        {view==="import"&&<ImportView contacts={contacts} orgs={orgs} onImportContact={importContact} onImportOrg={importOrg} showToast={showToast}/>}
        {view==="settings"&&<SettingsView profile={profile} onUpdate={saveProfile} showToast={showToast}/>}
      </main>
{toast&&<div className={`toast t-${toast.type}`}>{toast.msg}</div>}
      {globalQuickLog&&<QuickLogModal
        contacts={contacts}
        initialContactId={null}
        onLog={(cId,tp)=>{
          const updated=contacts.map(c=>c.id===cId?{...c,touchpoints:[...(c.touchpoints||[]),tp]}:c);
          saveContacts(updated);
          showToast("Touchpoint logged ✓");
        }}
        onClose={()=>setGlobalQuickLog(false)}
      />}
    </div></>
  );
}