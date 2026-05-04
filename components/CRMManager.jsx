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
  deleteContactById,
  deleteOrgById,
  deleteEventById,
  DEFAULT_PROFILE,
} from "../lib/services";

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

  .sb { width:220px; min-width:220px; background:var(--black); display:flex; flex-direction:column; position:fixed; top:0; left:0; height:100vh; overflow-y:auto; z-index:100; }
  .sb-brand { padding:20px 18px 16px; border-bottom:1px solid rgba(247,247,246,0.07); }
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

  .main { margin-left:220px; flex:1; }
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
  .t-lapsed   { background:#FEE2E2; color:#B91C1C; }
  .t-declined { background:var(--g200); color:var(--g600); }
  .tier-a { background:var(--fuchsia); color:#fff; font-size:9px; font-weight:900; padding:2px 7px; border-radius:4px; }
  .tier-b { background:var(--cyan); color:var(--black); font-size:9px; font-weight:900; padding:2px 7px; border-radius:4px; }
  .tier-c { background:var(--g200); color:var(--g600); font-size:9px; font-weight:900; padding:2px 7px; border-radius:4px; }
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

  .tp { padding:10px 12px; border-radius:8px; background:var(--g50); border:1px solid var(--g200); margin-bottom:7px; }
  .tp-hd { display:flex; align-items:center; gap:8px; margin-bottom:4px; flex-wrap:wrap; }
  .tp-date { font-size:10px; font-weight:700; color:var(--g600); }
  .tp-type { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.07em; background:var(--cyan-lt); color:#155e6e; padding:1px 6px; border-radius:3px; }
  .tp-dir { font-size:9px; color:var(--g400); }
  .tp-summary { font-size:12px; line-height:1.5; }
  .tp-outcome { font-size:11px; color:var(--g600); font-style:italic; margin-top:2px; }
  .tp-next { font-size:11px; color:var(--cyan); font-weight:700; margin-top:3px; }

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

  .modal-tabs { display:flex; border-bottom:2px solid var(--g200); margin:-17px -21px 18px; padding:0 21px; gap:1px; }
  .modal-tab { padding:10px 14px; border:none; background:transparent; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--g400); cursor:pointer; border-bottom:2px solid transparent; margin-bottom:-2px; font-family:'Lato',sans-serif; transition:all 0.12s; }
  .modal-tab:hover { color:var(--black); }
  .modal-tab.on { color:var(--black); border-bottom-color:var(--cyan); }

  .sb-log-btn { display:flex; align-items:center; justify-content:center; gap:6px; width:100%; padding:7px 10px; border-radius:6px; border:1px solid rgba(247,247,246,0.12); background:transparent; color:rgba(247,247,246,0.45); font-size:10px; font-weight:700; font-family:'Lato',sans-serif; cursor:pointer; letter-spacing:0.06em; text-transform:uppercase; margin-bottom:10px; transition:all 0.12s; }
  .sb-log-btn:hover { background:rgba(247,247,246,0.07); color:var(--white); border-color:rgba(247,247,246,0.25); }

  @media (max-width:820px) {
    .main { margin-left:0; } .sb { display:none; }
    .stats { grid-template-columns:1fr 1fr; }
    .frow,.frow3 { grid-template-columns:1fr; }
    .page { padding:18px; }
    .detail-panel { width:100vw; }
  }`;

/* ─── Constants ─────────────────────────────────────────────────────────────── */
const REL_STATUS = { cold:"Cold", warm:"Warm", active:"Active", lapsed:"Lapsed", declined:"Declined" };
const REL_TYPES  = { funder_contact:"Funder Contact", partner:"Partner", community_builder:"Community Builder", donor:"Donor", board:"Board", volunteer:"Volunteer", mentor:"Mentor" };
const ORG_CATS   = { funder:"Funder", partner:"Partner", vendor:"Vendor", media:"Media", government:"Government" };
const CADENCE    = { A:30, B:90, C:180 };
const MONTHS     = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS       = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

/* ─── Seed Data ─────────────────────────────────────────────────────────────── */
const SEED_ORGS = [{
  record_type:"organization", id:"org_brooklyn_org", name:"Brooklyn Org", category:"funder",
  website:"brooklynorg.org", relationship_status:"warm", tier:"A",
  primary_contact_id:"ind_donna_lennon",
  financial_relationship:{ has_given:false, total_given:0, grant_history:[] },
  notes:"Key local funder. BKO Microgrant program aligns with Sprout Society mission. Three known contacts. Application in progress.",
  tags:["brooklyn","microgrant","local-funder"], touchpoints:[],
  next_action:"Submit BKO Microgrant application", next_action_date:"2026-05-31",
  confidence:"HIGH", createdAt:"2026-04-28T00:00:00.000Z",
}];

const SEED_CONTACTS = [
  { record_type:"individual", id:"ind_donna_lennon", first_name:"Donna", last_name:"Lennon",
    org_id:"org_brooklyn_org", title:"Program Manager, BKO Microgrant", email:"programs@brooklyn.org", phone:"",
    relationship_type:"funder_contact", relationship_status:"warm", tier:"A", ask_readiness:"cultivating",
    financial_relationship:{ has_given:false, total_given:0 },
    interests:["community building","peer support","Brooklyn orgs"],
    notes:"Primary contact for BKO Microgrant. Email verified via Brooklyn Org website.",
    tags:["bko","microgrant","program-officer"], touchpoints:[],
    next_action:"Submit application; follow up 1 week after", next_action_date:"2026-06-07",
linked_grants:["bko_microgrant_2026"], confidence:"HIGH", createdAt:"2026-04-28T00:00:00.000Z" },
  { record_type:"individual", id:"ind_jocelynne_rainey", first_name:"Jocelynne", last_name:"Rainey",
    org_id:"org_brooklyn_org", title:"Dr. — Brooklyn Org (role TBD)", email:"", phone:"",
    relationship_type:"funder_contact", relationship_status:"cold", tier:"B", ask_readiness:"not_ready",
    financial_relationship:{ has_given:false, total_given:0 }, interests:[],
    notes:"Identified in BKO grant research. Title and contact details need verification.",
    tags:["bko","needs-research"], touchpoints:[],
    next_action:"Verify title and contact info via web search", next_action_date:"2026-05-01",
    linked_grants:["bko_microgrant_2026"], confidence:"MEDIUM", createdAt:"2026-04-28T00:00:00.000Z" },
  { record_type:"individual", id:"ind_sabrina_hargrave", first_name:"Sabrina", last_name:"Hargrave",
    org_id:"org_brooklyn_org", title:"Brooklyn Org (role TBD)", email:"", phone:"",
    relationship_type:"funder_contact", relationship_status:"cold", tier:"B", ask_readiness:"not_ready",
    financial_relationship:{ has_given:false, total_given:0 }, interests:[],
    notes:"Identified in BKO grant research. Title and contact details need verification.",
    tags:["bko","needs-research"], touchpoints:[],
    next_action:"Verify title and contact info via web search", next_action_date:"2026-05-01",
    linked_grants:["bko_microgrant_2026"], confidence:"MEDIUM", createdAt:"2026-04-28T00:00:00.000Z" },
];

/* ─── Utils ─────────────────────────────────────────────────────────────────── */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
const fmtDate = (d) => { if (!d) return "—"; try { return new Date(d+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}); } catch { return d; }};
const fmtMoney = (n) => (!n && n!==0) ? "—" : "$"+Number(n).toLocaleString();
const daysSince = (d) => d ? Math.floor((new Date()-new Date(d))/86400000) : null;
const daysUntil = (d) => d ? Math.ceil((new Date(d)-new Date())/86400000) : null;

function lastTouchDate(record) {
  const tps = record.touchpoints || [];
  if (!tps.length) return null;
  return tps.map(t=>t.date).sort().reverse()[0];
}
function isOverdue(c) {
  if (!c.tier || c.relationship_status==="declined") return false;
  const limit = CADENCE[c.tier];
  const last = lastTouchDate(c);
  const since = last ? daysSince(last.slice(0,10)) : daysSince(c.createdAt?.slice(0,10));
  return since !== null && since > limit;
}
function healthScore(c) {
  const limit = CADENCE[c.tier];
  if (!limit) return 0;
  const last = lastTouchDate(c);
  if (!last) return 10;
  const since = daysSince(last.slice(0,10));
  return Math.max(0, Math.min(100, Math.round(100-(since/limit)*100)));
}

/* ─── Small UI Components ────────────────────────────────────────────────────── */
function RelTag({status}) { return <span className={`tag t-${status||"cold"}`}>{REL_STATUS[status]||status}</span>; }
function TierBadge({tier}) { if (!tier) return null; return <span className={`tier-${tier.toLowerCase()}`}>Tier {tier}</span>; }
function ConfBadge({confidence}) {
  const hi = confidence==="HIGH";
  return <span style={{background:hi?"var(--acid-lt)":"var(--banana-lt)",color:hi?"#3a3d00":"#7a5c00",fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:3,textTransform:"uppercase",letterSpacing:"0.07em"}}>{confidence||"MEDIUM"}</span>;
}
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
function ConfirmModal({message,onConfirm,onCancel}) {
  return (
    <Modal title="Confirm Delete" onClose={onCancel}
      footer={<><button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button><button className="btn btn-danger btn-sm" onClick={onConfirm}>Delete</button></>}>
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

/* ─── Touchpoint Log ─────────────────────────────────────────────────────────── */
function TouchpointList({touchpoints,onAdd}) {
  const [adding,setAdding] = useState(false);
  const [tp,setTp] = useState({date:new Date().toISOString().slice(0,10),type:"email",direction:"outbound",summary:"",outcome:"",next_step:""});
  const save = () => { if (!tp.summary.trim()) return; onAdd({...tp,id:uid()}); setTp({date:new Date().toISOString().slice(0,10),type:"email",direction:"outbound",summary:"",outcome:"",next_step:""}); setAdding(false); };
  const sorted = [...(touchpoints||[])].sort((a,b)=>new Date(b.date)-new Date(a.date));
  return (
    <div>
      {sorted.length===0&&!adding&&<p style={{fontSize:12,color:"var(--g400)",fontStyle:"italic",marginBottom:10}}>No touchpoints logged yet.</p>}
      {sorted.map((t,i)=>(
        <div key={t.id||i} className="tp">
          <div className="tp-hd"><span className="tp-date">{fmtDate(t.date)}</span><span className="tp-type">{t.type}</span><span className="tp-dir">{t.direction}</span></div>
          <div className="tp-summary">{t.summary}</div>
          {t.outcome&&<div className="tp-outcome">Outcome: {t.outcome}</div>}
          {t.next_step&&<div className="tp-next">→ {t.next_step}</div>}
        </div>
      ))}
      {adding ? (
        <div className="add-row">
          <div className="frow3">
            <div className="fg"><label className="fl">Date</label><input type="date" className="fi" value={tp.date} onChange={e=>setTp({...tp,date:e.target.value})}/></div>
            <div className="fg"><label className="fl">Type</label><select className="fs" value={tp.type} onChange={e=>setTp({...tp,type:e.target.value})}>{["email","call","meeting","event","grant_submission","social","other"].map(v=><option key={v} value={v}>{v}</option>)}</select></div>
            <div className="fg"><label className="fl">Direction</label><select className="fs" value={tp.direction} onChange={e=>setTp({...tp,direction:e.target.value})}><option value="outbound">Outbound</option><option value="inbound">Inbound</option><option value="mutual">Mutual</option></select></div>
          </div>
          <div className="fg"><label className="fl">Summary *</label><textarea className="fta" rows={2} value={tp.summary} onChange={e=>setTp({...tp,summary:e.target.value})} placeholder="What happened?"/></div>
          <div className="frow">
            <div className="fg"><label className="fl">Outcome</label><input className="fi" value={tp.outcome} onChange={e=>setTp({...tp,outcome:e.target.value})} placeholder="Result of this interaction"/></div>
            <div className="fg"><label className="fl">Next Step</label><input className="fi" value={tp.next_step} onChange={e=>setTp({...tp,next_step:e.target.value})} placeholder="What happens next?"/></div>
          </div>
          <div style={{display:"flex",gap:8}}><button className="btn btn-blk btn-sm" onClick={save}>Log Touchpoint</button><button className="btn btn-ghost btn-sm" onClick={()=>setAdding(false)}>Cancel</button></div>
        </div>
      ):<button className="btn btn-ghost btn-sm" style={{marginTop:8}} onClick={()=>setAdding(true)}>+ Log Touchpoint</button>}
    </div>
  );
}

/* ─── Quick Log Modal ────────────────────────────────────────────────────────── */
const TP_TYPES = ["email","call","meeting","event","grant_submission","social","other"];
const STATUS_OPTS = [
  {value:"cold",label:"Cold"},{value:"warm",label:"Warm"},
  {value:"active",label:"Active"},{value:"lapsed",label:"Lapsed"},{value:"declined",label:"Declined"}
];
const STATUS_OPTS_NO_DECLINED = STATUS_OPTS.filter(o=>o.value!=="declined");
const TIER_OPTS = [{value:"A",label:"Tier A"},{value:"B",label:"Tier B"},{value:"C",label:"Tier C"}];
const CONF_OPTS = [{value:"HIGH",label:"High"},{value:"MEDIUM",label:"Medium"},{value:"LOW",label:"Low"}];
const DIR_OPTS  = [{value:"outbound",label:"Outbound"},{value:"inbound",label:"Inbound"},{value:"mutual",label:"Mutual"}];
const TIER_COLOR = {A:"on-a",B:"on",C:"on-acid"};

function QuickLogModal({contacts,initialContactId,onLog,onClose}) {
  const today = new Date().toISOString().slice(0,10);
  const [contactId,setContactId]=useState(initialContactId||contacts[0]?.id||"");
  const [tp,setTp]=useState({date:today,type:"email",direction:"outbound",summary:"",outcome:"",next_step:""});
  const [showExtra,setShowExtra]=useState(false);
  const contactOpts=contacts.map(c=>({value:c.id,label:`${c.first_name} ${c.last_name}`,meta:c.title||""}));
  const canSave=contactId&&tp.summary.trim();
  const save=()=>{ if(!canSave) return; onLog(contactId,{...tp,id:Date.now().toString(36)}); onClose(); };
  return (
    <Modal title="Log Touchpoint" onClose={onClose}
      footer={<><button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button><button className="btn btn-blk btn-sm" onClick={save} disabled={!canSave}>Log Touchpoint →</button></>}>
      <div className="fg"><label className="fl">Contact</label>
        <SearchSelect options={contactOpts} value={contactId} onChange={setContactId} placeholder="Search contacts…"/>
      </div>
      <div className="fg"><label className="fl">Type</label>
        <div className="type-btn-group">
          {TP_TYPES.map(t=><button key={t} className={`type-btn ${tp.type===t?"on":""}`} onClick={()=>setTp({...tp,type:t})}>{t.replace("_"," ")}</button>)}
        </div>
      </div>
      <div className="frow">
        <div className="fg"><label className="fl">Direction</label><RadioGroup options={DIR_OPTS} value={tp.direction} onChange={v=>setTp({...tp,direction:v})}/></div>
        <div className="fg"><label className="fl">Date</label><input type="date" className="fi" value={tp.date} onChange={e=>setTp({...tp,date:e.target.value})}/></div>
      </div>
      <div className="fg"><label className="fl">Summary *</label>
        <textarea className="fta" rows={3} value={tp.summary} placeholder="What happened?" onChange={e=>setTp({...tp,summary:e.target.value})} autoFocus/>
      </div>
      <button className="drawer-toggle" onClick={()=>setShowExtra(!showExtra)}>
        {showExtra?"▾":"▸"} Add outcome & next step
      </button>
      {showExtra&&<><hr className="drawer-divider"/>
        <div className="fg"><label className="fl">Outcome</label><input className="fi" value={tp.outcome} placeholder="Result of this interaction" onChange={e=>setTp({...tp,outcome:e.target.value})}/></div>
        <div className="fg"><label className="fl">Next Step</label><input className="fi" value={tp.next_step} placeholder="What happens next?" onChange={e=>setTp({...tp,next_step:e.target.value})}/></div>
      </>}
    </Modal>
  );
}

/* ─── Contact Detail Panel ───────────────────────────────────────────────────── */
function ContactDetail({contact,orgs,onClose,onUpdate,onEdit,showToast}) {
  const mouseDownTarget = useRef(null);
  useEffect(()=>{ const h=(e)=>{ if(e.key==="Escape") onClose(); }; document.addEventListener("keydown",h); return ()=>document.removeEventListener("keydown",h); },[onClose]);
  const org = orgs.find(o=>o.id===contact.org_id);
  const score = healthScore(contact);
  const overdue = isOverdue(contact);
  const addTp = (tp) => { onUpdate({...contact,touchpoints:[...(contact.touchpoints||[]),tp]}); showToast("Touchpoint logged ✓"); };
  return (
<div className="detail-overlay"
      onMouseDown={e=>{ mouseDownTarget.current = e.target; }}
      onClick={e=>{ if (e.target===e.currentTarget && mouseDownTarget.current===e.currentTarget) onClose(); }}>
      <div className="detail-panel">
<div className="dp-hd">
          <div><div className="dp-name">{contact.first_name} {contact.last_name}</div><div className="dp-sub">{contact.title}{org?` · ${org.name}`:""}</div></div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <button className="btn btn-ghost btn-sm" onClick={onEdit}>Edit</button>
            <button className="dp-close" onClick={onClose}>×</button>
          </div>
        </div>
        <div className="dp-body">
          <div className="dp-row"><RelTag status={contact.relationship_status}/><TierBadge tier={contact.tier}/><span className={contact.relationship_type==="mentor"?"type-tag-mentor":"type-tag"}>{REL_TYPES[contact.relationship_type]||contact.relationship_type}</span><ConfBadge confidence={contact.confidence}/></div>
          <div className="dp-section">
            <div className="dp-sect-lbl">Relationship Health</div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{flex:1}}><div className="health-bar"><div className="health-fill" style={{width:`${score}%`,background:score>=70?"var(--acid)":score>=40?"var(--cyan)":"var(--fuchsia)"}}/></div></div>
              <span style={{fontSize:12,fontWeight:700,color:score>=70?"#3a3d00":score>=40?"#155e6e":"#B91C1C"}}>{score}%</span>
            </div>
            {overdue&&<p style={{fontSize:11,color:"#B91C1C",fontWeight:700,marginTop:5}}>⚠ Overdue for contact — Tier {contact.tier} cadence exceeded</p>}
          </div>
          <div className="dp-section">
            <div className="dp-sect-lbl">Contact Details</div>
            {contact.email&&<div className="dp-field"><strong>Email:</strong> <a href={`mailto:${contact.email}`} style={{color:"var(--cyan)"}}>{contact.email}</a></div>}
            {contact.phone&&<div className="dp-field"><strong>Phone:</strong> {contact.phone}</div>}
            {contact.ask_readiness&&<div className="dp-field"><strong>Ask Readiness:</strong> {contact.ask_readiness.replace(/_/g," ")}</div>}
            {contact.interests?.length>0&&<div className="dp-field"><strong>Interests:</strong> {contact.interests.join(", ")}</div>}
            {contact.linked_grants?.length>0&&<div className="dp-field"><strong>Linked Grants:</strong> {contact.linked_grants.join(", ")}</div>}
            {contact.financial_relationship?.has_given&&<div className="dp-field"><strong>Total Given:</strong> {fmtMoney(contact.financial_relationship.total_given)}</div>}
          </div>
          {contact.next_action&&<div className="dp-section"><div className="dp-sect-lbl">Next Action</div><div style={{background:"var(--banana-lt)",borderRadius:8,padding:"10px 12px"}}><div style={{fontSize:13,fontWeight:700}}>{contact.next_action}</div>{contact.next_action_date&&<div style={{fontSize:11,color:"var(--g600)",marginTop:3}}>By {fmtDate(contact.next_action_date)}</div>}</div></div>}
          {contact.notes&&<div className="dp-section"><div className="dp-sect-lbl">Notes</div><p style={{fontSize:12,lineHeight:1.7,color:"var(--g800)"}}>{contact.notes}</p></div>}
          {contact.tags?.length>0&&<div className="dp-section"><div className="dp-sect-lbl">Tags</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{contact.tags.map(t=><span key={t} style={{background:"var(--g100)",color:"var(--g600)",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20}}>{t}</span>)}</div></div>}
          <div className="dp-section"><div className="dp-sect-lbl">Touchpoints ({(contact.touchpoints||[]).length})</div><TouchpointList touchpoints={contact.touchpoints} onAdd={addTp}/></div>
        </div>
      </div>
    </div>
  );
}

/* ─── Org Detail Panel ───────────────────────────────────────────────────────── */
function OrgDetail({org,contacts,onClose,onUpdate,onEdit,showToast}) {
 const mouseDownTarget = useRef(null);
  useEffect(()=>{ const h=(e)=>{ if(e.key==="Escape") onClose(); }; document.addEventListener("keydown",h); return ()=>document.removeEventListener("keydown",h); },[onClose]);
  const linked = contacts.filter(c=>c.org_id===org.id);
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
          <div className="dp-row"><RelTag status={org.relationship_status}/><TierBadge tier={org.tier}/><ConfBadge confidence={org.confidence}/></div>
          {linked.length>0&&<div className="dp-section"><div className="dp-sect-lbl">People ({linked.length})</div>{linked.map(c=><div key={c.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:"1px solid var(--g100)"}}><div style={{flex:1}}><div style={{fontSize:13,fontWeight:700}}>{c.first_name} {c.last_name}</div><div style={{fontSize:11,color:"var(--g600)"}}>{c.title}</div></div><RelTag status={c.relationship_status}/></div>)}</div>}
          {org.financial_relationship&&<div className="dp-section"><div className="dp-sect-lbl">Financial</div><div className="dp-field"><strong>Given to Sprout:</strong> {org.financial_relationship.has_given?fmtMoney(org.financial_relationship.total_given):"Not yet"}</div></div>}
          {org.next_action&&<div className="dp-section"><div className="dp-sect-lbl">Next Action</div><div style={{background:"var(--banana-lt)",borderRadius:8,padding:"10px 12px"}}><div style={{fontSize:13,fontWeight:700}}>{org.next_action}</div>{org.next_action_date&&<div style={{fontSize:11,color:"var(--g600)",marginTop:3}}>By {fmtDate(org.next_action_date)}</div>}</div></div>}
{org.notes&&<div className="dp-section"><div className="dp-sect-lbl">Notes</div><p style={{fontSize:12,lineHeight:1.7}}>{org.notes}</p></div>}
          <div className="dp-section"><div className="dp-sect-lbl">Touchpoints ({(org.touchpoints||[]).length})</div><TouchpointList touchpoints={org.touchpoints} onAdd={(tp)=>{ onUpdate({...org,touchpoints:[...(org.touchpoints||[]),tp]}); showToast("Touchpoint logged ✓"); }}/></div>
        </div>
      </div>
    </div>
  );
}

/* ─── Sidebar ────────────────────────────────────────────────────────────────── */
function Sidebar({view,setView,contacts,profile,onQuickLog}) {
  const overdueCount = contacts.filter(isOverdue).length;
  const nav = [
    {section:"Overview"},
    {id:"dashboard",label:"Dashboard",icon:"📊",badge:overdueCount>0?overdueCount:null},
    {section:"Relationships"},
    {id:"contacts",label:"Contacts",icon:"👤"},
    {id:"orgs",label:"Organizations",icon:"🏢"},
    {id:"events",label:"Events",icon:"🗓"},
    {id:"outreach",label:"Outreach Log",icon:"📋"},
    {section:"Tools"},
    {id:"import",label:"Import JSON",icon:"⬇"},
    {id:"settings",label:"Settings",icon:"⚙"},
  ];
  return (
    <nav className="sb">
      <div className="sb-brand"><div className="sb-name">Sprout Society</div><div className="sb-sub">CRM Manager v1</div></div>
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
function DashboardView({contacts,orgs,setView,onOpenContact}) {
  const overdue = contacts.filter(isOverdue);
  const active = contacts.filter(c=>c.relationship_status==="active").length;
  const upcoming = contacts.filter(c=>{ const d=daysUntil(c.next_action_date); return d!==null&&d>=0&&d<=14; }).sort((a,b)=>new Date(a.next_action_date)-new Date(b.next_action_date));
const tiers = {A:contacts.filter(c=>c.tier==="A"),B:contacts.filter(c=>c.tier==="B"),C:contacts.filter(c=>c.tier==="C")};
  const scheduled = []; // sprout_posts table pending — stub until posts feature is built
  return (
    <div className="page">
      <div className="pg-hd">
        <div><div className="pg-ttl">Dashboard</div><div className="pg-sub">{new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}</div></div>
      </div>
      <div className="stats">
        <div className="stat"><div className="stat-lbl">Total Contacts</div><div className="stat-val">{contacts.length}</div><div className="stat-meta">{orgs.length} organizations</div></div>
        <div className="stat"><div className="stat-lbl">Active Relationships</div><div className="stat-val" style={{color:"var(--cyan)"}}>{active}</div><div className="stat-meta">of {contacts.length} contacts</div></div>
        <div className="stat"><div className="stat-lbl">Overdue</div><div className="stat-val" style={{color:overdue.length>0?"var(--fuchsia)":"var(--black)"}}>{overdue.length}</div><div className="stat-meta">need contact now</div></div>
        <div className="stat"><div className="stat-lbl">Due This Week</div><div className="stat-val" style={{color:"var(--acid)"}}>{upcoming.length}</div><div className="stat-meta">actions in 14 days</div></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div className="card">
          <div className="card-hd"><span className="card-ttl">⚠ Overdue Contacts</span><button className="btn btn-ghost btn-xs" onClick={()=>setView("contacts")}>View all</button></div>
          <div className="card-bd">
            {overdue.length===0
              ? <p style={{fontSize:12,color:"var(--g400)",textAlign:"center",padding:"12px 0"}}>All contacts are on schedule 🎉</p>
              : overdue.slice(0,5).map(c=>{
                  const last=lastTouchDate(c); const since=last?daysSince(last.slice(0,10)):null;
                  return <div key={c.id} className="overdue-row" onClick={()=>onOpenContact(c)}><div><div className="overdue-name">{c.first_name} {c.last_name}</div><div className="overdue-meta">{c.title} · Tier {c.tier}</div></div><span style={{fontSize:11,fontWeight:700,color:"#B91C1C",whiteSpace:"nowrap"}}>{since!==null?`${since}d ago`:"Never contacted"}</span></div>;
                })
            }
          </div>
        </div>
        <div className="card">
          <div className="card-hd"><span className="card-ttl">📅 Upcoming Actions</span></div>
          <div className="card-bd">
            {upcoming.length===0
              ? <p style={{fontSize:12,color:"var(--g400)",textAlign:"center",padding:"12px 0"}}>No actions due in next 14 days</p>
              : upcoming.slice(0,5).map(c=>(
                  <div key={c.id} className="overdue-row" onClick={()=>onOpenContact(c)}>
                    <div><div className="overdue-name">{c.first_name} {c.last_name}</div><div className="overdue-meta" style={{maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.next_action}</div></div>
                    <span style={{fontSize:11,fontWeight:700,color:"var(--g600)",whiteSpace:"nowrap"}}>{fmtDate(c.next_action_date)}</span>
                  </div>
                ))
            }
          </div>
        </div>
        <div className="card">
          <div className="card-hd"><span className="card-ttl">Tier Distribution</span></div>
          <div className="card-bd">
            {[{k:"A",label:"Tier A — Weekly",color:"var(--fuchsia)"},{k:"B",label:"Tier B — Monthly",color:"var(--cyan)"},{k:"C",label:"Tier C — Quarterly",color:"var(--g300)"}].map(row=>(
              <div key={row.k} style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}><span style={{fontSize:12,fontWeight:700}}>{row.label}</span><span style={{fontSize:12,color:"var(--g600)"}}>{tiers[row.k].length}</span></div>
                <div className="health-bar"><div className="health-fill" style={{width:contacts.length?`${(tiers[row.k].length/contacts.length)*100}%`:"0%",background:row.color}}/></div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
<div className="card-hd"><span className="card-ttl">📣 Comms Pipeline</span><button className="btn btn-ghost btn-xs" onClick={()=>setView("outreach")}>View all</button></div>
          <div className="card-bd">
            {scheduled.length===0
              ? <p style={{fontSize:12,color:"var(--g400)",textAlign:"center",padding:"12px 0"}}>No posts scheduled</p>
              : scheduled.slice(0,4).map(p=>(
                  <div key={p.id} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"8px 0",borderBottom:"1px solid var(--g100)"}}>
                    <div className={`post-platform post-${p.platform}`}>{p.platform==="ig"?"📸":"✉"}</div>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:2}}><span className={`post-status ps-${p.status}`}>{p.status}</span><span style={{fontSize:10,color:"var(--g400)"}}>{fmtDate(p.scheduled_date)}</span></div>
                      <div style={{fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:200}}>{p.caption||p.subject||"(no content)"}</div>
                    </div>
                  </div>
                ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Contact Edit Modal ─────────────────────────────────────────────────────── */
function ContactEditModal({editing,setEditing,onSave,orgs,events,onUpdateEvents}) {
  const [eTab,setETab]=useState("overview");
  const REL_TYPE_OPTS=Object.entries(REL_TYPES).map(([v,l])=>({value:v,label:l}));
  const ASK_OPTS=[{value:"not_ready",label:"Not Ready"},{value:"cultivating",label:"Cultivating"},{value:"ready",label:"Ready"},{value:"asked",label:"Asked"}];
  const orgOpts=[{value:"",label:"— None —"},...orgs.map(o=>({value:o.id,label:o.name,meta:ORG_CATS[o.category]||o.category}))];
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
      <div className="modal-tabs">
        {["overview","details","actions","profile","events"].map(t=><button key={t} className={`modal-tab ${eTab===t?"on":""}`} onClick={()=>setETab(t)}>{t}</button>)}
      </div>
      {eTab==="overview"&&<>
        <div className="fg"><label className="fl">Status</label><RadioGroup options={STATUS_OPTS} value={editing.relationship_status||"cold"} onChange={v=>setEditing({...editing,relationship_status:v})}/></div>
        <div className="fg"><label className="fl">Tier</label><RadioGroup options={TIER_OPTS} value={editing.tier||"B"} onChange={v=>setEditing({...editing,tier:v})} colorMap={TIER_COLOR}/></div>
        <div className="fg"><label className="fl">Type</label><SearchSelect options={REL_TYPE_OPTS} value={editing.relationship_type||"funder_contact"} onChange={v=>setEditing({...editing,relationship_type:v})}/></div>
        <div className="fg"><label className="fl">Confidence</label><RadioGroup options={CONF_OPTS} value={editing.confidence||"MEDIUM"} onChange={v=>setEditing({...editing,confidence:v})}/></div>
        <div className="fg"><label className="fl">Ask Readiness</label><SearchSelect options={ASK_OPTS} value={editing.ask_readiness||"not_ready"} onChange={v=>setEditing({...editing,ask_readiness:v})}/></div>
      </>}
      {eTab==="details"&&<>
        <div className="frow">
          <div className="fg"><label className="fl">First Name</label><input className="fi" value={editing.first_name||""} onChange={e=>setEditing({...editing,first_name:e.target.value})} autoFocus/></div>
          <div className="fg"><label className="fl">Last Name</label><input className="fi" value={editing.last_name||""} onChange={e=>setEditing({...editing,last_name:e.target.value})}/></div>
        </div>
        <div className="fg"><label className="fl">Title</label><input className="fi" value={editing.title||""} onChange={e=>setEditing({...editing,title:e.target.value})}/></div>
        <div className="frow">
          <div className="fg"><label className="fl">Email</label><input type="email" className="fi" value={editing.email||""} onChange={e=>setEditing({...editing,email:e.target.value})}/></div>
          <div className="fg"><label className="fl">Phone</label><input className="fi" value={editing.phone||""} onChange={e=>setEditing({...editing,phone:e.target.value})}/></div>
        </div>
        <div className="fg"><label className="fl">Organization</label><SearchSelect options={orgOpts} value={editing.org_id||""} onChange={v=>setEditing({...editing,org_id:v})}/></div>
      </>}
      {eTab==="actions"&&<>
        <div className="fg"><label className="fl">Next Action</label><input className="fi" value={editing.next_action||""} onChange={e=>setEditing({...editing,next_action:e.target.value})} autoFocus/></div>
        <div className="fg"><label className="fl">Due Date</label><input type="date" className="fi" value={editing.next_action_date||""} onChange={e=>setEditing({...editing,next_action_date:e.target.value})}/></div>
      </>}
      {eTab==="profile"&&<>
        <div className="fg"><label className="fl">Notes</label><textarea className="fta" rows={4} value={editing.notes||""} onChange={e=>setEditing({...editing,notes:e.target.value})} autoFocus/></div>
        <div className="fg"><label className="fl">Tags</label><ChipInput values={editing.tags||[]} onChange={v=>setEditing({...editing,tags:v})}/></div>
        <div className="fg"><label className="fl">Interests</label><ChipInput values={editing.interests||[]} onChange={v=>setEditing({...editing,interests:v})}/></div>
        <div className="fg"><label className="fl">Linked Grants</label><ChipInput values={editing.linked_grants||[]} onChange={v=>setEditing({...editing,linked_grants:v})}/></div>
      </>}
      {eTab==="events"&&<>
        <div className="fg">
          <label className="fl">Linked Events ({linkedEventIds.length})</label>
          <div style={{maxHeight:200,overflowY:"auto",border:"1.5px solid var(--g200)",borderRadius:6}}>
            {events.length===0&&<div style={{padding:"10px 12px",fontSize:12,color:"var(--g400)"}}>No events in CRM yet</div>}
            {events.map(ev=>{
              const on=linkedEventIds.includes(ev.id);
              return <div key={ev.id} onClick={()=>toggleEventLink(ev.id)} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",cursor:"pointer",background:on?"var(--cyan-lt)":"#fff",borderBottom:"1px solid var(--g100)"}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700}}>{ev.name||"(Unnamed)"}</div>
                  <div style={{fontSize:10,color:"var(--g400)"}}>{fmtDate(ev.event_date)}</div>
                </div>
                <EventStatusTag status={ev.status}/>
                {on&&<span style={{color:"var(--cyan)",fontWeight:900,fontSize:14}}>✓</span>}
              </div>;
            })}
          </div>
        </div>
      </>}
    </Modal>
  );
}

/* ─── Contacts View ──────────────────────────────────────────────────────────── */
function ContactsView({contacts,orgs,events,onUpdate,onDelete,onUpdateEvents,showToast,pendingDetail,onPendingDetailConsumed}) {
  const [search,setSearch]=useState("");
  const [fType,setFType]=useState("all");
  const [fTier,setFTier]=useState("all");
  const [fStatus,setFStatus]=useState("all");
  const [selected,setSelected]=useState(null);
  const [adding,setAdding]=useState(false);
  const [ncDrawer,setNcDrawer]=useState(false);

useEffect(()=>{
  if (pendingDetail?.id) {
    setSelected(pendingDetail.id);
    onPendingDetailConsumed();
  }
},[pendingDetail, onPendingDetailConsumed]);
  const blank={first_name:"",last_name:"",org_id:"",title:"",email:"",phone:"",relationship_type:"funder_contact",relationship_status:"cold",tier:"B",notes:"",next_action:"",next_action_date:"",tags:[],interests:[],linked_grants:[]};
  const [nc,setNc]=useState(blank);

// Pre-compute scores once per render, not once per table cell
  const contactMeta = useMemo(()=>{
    const m={};
    contacts.forEach(c=>{ m[c.id]={ score:healthScore(c), overdue:isOverdue(c) }; });
    return m;
  }, [contacts]);

  const filtered=useMemo(()=>contacts.filter(c=>{
    const name=`${c.first_name} ${c.last_name} ${c.title||""}`.toLowerCase();
    if (search&&!name.includes(search.toLowerCase())) return false;
    if (fType!=="all"&&c.relationship_type!==fType) return false;
    if (fTier!=="all"&&c.tier!==fTier) return false;
    if (fStatus!=="all"&&c.relationship_status!==fStatus) return false;
    return true;
  }), [contacts, search, fType, fTier, fStatus]);

const [editing,setEditing]=useState(null);
  const [confirmDelete,setConfirmDelete]=useState(null);
  const [quickLog,setQuickLog]=useState(null); // contact id or null

  const addContact=()=>{
    const c={...nc,record_type:"individual",id:`ind_${uid()}`,touchpoints:[],tags:[],interests:[],linked_grants:[],financial_relationship:{has_given:false,total_given:0},ask_readiness:"not_ready",confidence:"MEDIUM",createdAt:new Date().toISOString()};
    onUpdate([...contacts,c]); setNc(blank); setAdding(false); showToast("Contact added ✓");
  };

  const saveEdit=()=>{
    onUpdate(contacts.map(c=>c.id===editing.id?editing:c));
    setEditing(null); showToast("Contact updated ✓");
  };
  const updateContact=(updated)=>onUpdate(contacts.map(c=>c.id===updated.id?updated:c));
  const sel=contacts.find(c=>c.id===selected);

  return (
    <div className="page">
      <div className="pg-hd"><div><div className="pg-ttl">Contacts</div><div className="pg-sub">{contacts.length} individuals · {contacts.filter(isOverdue).length} overdue</div></div><button className="btn btn-blk" onClick={()=>setAdding(true)}>+ Add Contact</button></div>
      <div className="filter-bar">
        <input className="fi" placeholder="Search name or title…" value={search} onChange={e=>setSearch(e.target.value)}/>
        <select className="fs" value={fType} onChange={e=>setFType(e.target.value)}><option value="all">All types</option>{Object.entries(REL_TYPES).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
        <select className="fs" value={fTier} onChange={e=>setFTier(e.target.value)}><option value="all">All tiers</option><option value="A">Tier A</option><option value="B">Tier B</option><option value="C">Tier C</option></select>
<select className="fs" value={fStatus} onChange={e=>setFStatus(e.target.value)}><option value="all">All statuses</option>{Object.entries(REL_STATUS).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
        {(search||fType!=="all"||fTier!=="all"||fStatus!=="all")&&<button className="btn btn-ghost btn-sm" onClick={()=>{setSearch("");setFType("all");setFTier("all");setFStatus("all");}}>✕ Clear</button>}
      </div>
{adding&&(
        <Modal title="Add Contact" onClose={()=>{setAdding(false);setNc(blank);}}
          footer={<><button className="btn btn-ghost btn-sm" onClick={()=>{setAdding(false);setNc(blank);}}>Cancel</button><button className="btn btn-blk btn-sm" onClick={addContact} disabled={!nc.first_name.trim()||!nc.last_name.trim()}>Add Contact →</button></>}>
          <div className="frow">
            <div className="fg"><label className="fl">First Name *</label><input className="fi" value={nc.first_name} onChange={e=>setNc({...nc,first_name:e.target.value})} autoFocus/></div>
            <div className="fg"><label className="fl">Last Name *</label><input className="fi" value={nc.last_name} onChange={e=>setNc({...nc,last_name:e.target.value})}/></div>
          </div>
          <div className="fg"><label className="fl">Organization</label>
            <SearchSelect options={[{value:"",label:"— None —"},...orgs.map(o=>({value:o.id,label:o.name,meta:ORG_CATS[o.category]||o.category}))]} value={nc.org_id} onChange={v=>setNc({...nc,org_id:v})} placeholder="Search organizations…"/>
          </div>
          <div className="fg"><label className="fl">Type</label>
            <SearchSelect options={Object.entries(REL_TYPES).map(([v,l])=>({value:v,label:l}))} value={nc.relationship_type} onChange={v=>setNc({...nc,relationship_type:v})}/>
          </div>
          <div className="fg"><label className="fl">Status</label>
            <RadioGroup options={STATUS_OPTS} value={nc.relationship_status} onChange={v=>setNc({...nc,relationship_status:v})}/>
          </div>
          <div className="fg"><label className="fl">Tier</label>
            <RadioGroup options={TIER_OPTS} value={nc.tier} onChange={v=>setNc({...nc,tier:v})} colorMap={TIER_COLOR}/>
          </div>
          <button className="drawer-toggle" onClick={()=>setNcDrawer(d=>!d)}>{ncDrawer?"▾":"▸"} More details</button>
          {ncDrawer&&<><hr className="drawer-divider"/>
            <div className="fg"><label className="fl">Title</label><input className="fi" value={nc.title} onChange={e=>setNc({...nc,title:e.target.value})}/></div>
            <div className="frow">
              <div className="fg"><label className="fl">Email</label><input type="email" className="fi" value={nc.email} onChange={e=>setNc({...nc,email:e.target.value})}/></div>
              <div className="fg"><label className="fl">Phone</label><input className="fi" value={nc.phone} onChange={e=>setNc({...nc,phone:e.target.value})}/></div>
            </div>
            <div className="frow">
              <div className="fg"><label className="fl">Next Action</label><input className="fi" value={nc.next_action} onChange={e=>setNc({...nc,next_action:e.target.value})}/></div>
              <div className="fg"><label className="fl">Due Date</label><input type="date" className="fi" value={nc.next_action_date} onChange={e=>setNc({...nc,next_action_date:e.target.value})}/></div>
            </div>
            <div className="fg"><label className="fl">Notes</label><textarea className="fta" rows={2} value={nc.notes} onChange={e=>setNc({...nc,notes:e.target.value})}/></div>
            <div className="fg"><label className="fl">Tags</label><ChipInput values={nc.tags} onChange={v=>setNc({...nc,tags:v})}/></div>
          </>}
        </Modal>
      )}
      {filtered.length===0
        ? <div className="empty"><div className="empty-ico">👤</div><div className="empty-ttl">{contacts.length===0?"No contacts yet":"No results"}</div><div className="empty-txt">{contacts.length===0?"Add contacts manually or import JSON profiles from Claude.":"Try adjusting your filters."}</div></div>
      : <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>Name</th><th>Type</th><th>Organization</th><th>Status</th><th>Tier</th><th>Next Action</th><th>Health</th><th></th></tr></thead>
            <tbody>
{filtered.map(c=>{
              const org=orgs.find(o=>o.id===c.org_id);
              const { score, overdue: od } = contactMeta[c.id] || { score:0, overdue:false };              return <tr key={c.id} onClick={()=>setSelected(c.id)}>
                <td><div style={{fontWeight:700}}>{c.first_name} {c.last_name}{od&&<span style={{marginLeft:6,background:"var(--fuchsia)",color:"#fff",fontSize:8,fontWeight:900,padding:"1px 5px",borderRadius:10}}>!</span>}</div><div style={{fontSize:11,color:"var(--g400)"}}>{c.title}</div></td>
                <td><span className={c.relationship_type==="mentor"?"type-tag-mentor":"type-tag"}>{REL_TYPES[c.relationship_type]||c.relationship_type}</span></td>
                <td style={{fontSize:12,color:"var(--g600)"}}>{org?.name||"—"}</td>
                <td><RelTag status={c.relationship_status}/></td>
                <td><TierBadge tier={c.tier}/></td>
                <td style={{maxWidth:160,fontSize:11,color:"var(--g600)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.next_action||"—"}</td>
                <td style={{minWidth:80}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{flex:1,height:4,background:"var(--g200)",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${score}%`,background:score>=70?"var(--acid)":score>=40?"var(--cyan)":"var(--fuchsia)",borderRadius:2}}/></div><span style={{fontSize:10,fontWeight:700,color:"var(--g400)"}}>{score}%</span></div></td>
<td style={{padding:"12px 14px"}}>
                <div className="row-actions">
                  <button className="btn btn-ghost btn-xs" onClick={e=>{e.stopPropagation();setEditing({...c});}}>Edit</button>
                  <button className="btn btn-cyan btn-xs" onClick={e=>{e.stopPropagation();setQuickLog(c.id);}}>+ Log</button>
                  <button className="btn btn-danger btn-xs" onClick={e=>{e.stopPropagation();setConfirmDelete(c);}}>Del</button>
                </div>
              </td>
              </tr>;
            })}
</tbody></table></div>
      }
{sel&&<ContactDetail contact={sel} orgs={orgs} onClose={()=>setSelected(null)} onUpdate={updateContact} onEdit={()=>setEditing({...sel})} showToast={showToast}/>}
{quickLog!==null&&<QuickLogModal
        contacts={contacts}
        initialContactId={quickLog}
        onLog={(cId,tp)=>{ updateContact({...contacts.find(c=>c.id===cId), touchpoints:[...(contacts.find(c=>c.id===cId)?.touchpoints||[]),tp]}); showToast("Touchpoint logged ✓"); }}
        onClose={()=>setQuickLog(null)}
      />}
{editing&&<ContactEditModal editing={editing} setEditing={setEditing} onSave={saveEdit} orgs={orgs} events={events||[]} onUpdateEvents={onUpdateEvents}/>}
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

/* ─── Organizations View ─────────────────────────────────────────────────────── */
function OrgsView({orgs,contacts,onUpdate,onDelete,showToast}) {
  const [search,setSearch]=useState("");
  const [fCat,setFCat]=useState("all");
  const [fStatus,setFStatus]=useState("all");
  const [selected,setSelected]=useState(null);
  const [adding,setAdding]=useState(false);
  const blank={name:"",category:"funder",website:"",relationship_status:"cold",tier:"B",notes:"",next_action:"",next_action_date:"",tags:[],primary_contact_id:""};
  const [no,setNo]=useState(blank);
  const [noDrawer,setNoDrawer]=useState(false);

const filtered=useMemo(()=>orgs.filter(o=>{
    if (search&&!o.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (fCat!=="all"&&o.category!==fCat) return false;
    if (fStatus!=="all"&&o.relationship_status!==fStatus) return false;
    return true;
  }),[orgs,search,fCat,fStatus]);

const [editingOrg,setEditingOrg]=useState(null);
  const [confirmDeleteOrg,setConfirmDeleteOrg]=useState(null);

  const saveEditOrg=()=>{
    onUpdate(orgs.map(o=>o.id===editingOrg.id?editingOrg:o));
    setEditingOrg(null); showToast("Organization updated ✓");
  };

  const addOrg=()=>{
    if (!no.name.trim()) return;
    const o={...no,record_type:"organization",id:`org_${uid()}`,primary_contact_id:"",financial_relationship:{has_given:false,total_given:0,grant_history:[]},tags:[],touchpoints:[],confidence:"MEDIUM",createdAt:new Date().toISOString()};
    onUpdate([...orgs,o]); setNo(blank); setAdding(false); showToast("Organization added ✓");
  };
  const updateOrg=(updated)=>onUpdate(orgs.map(o=>o.id===updated.id?updated:o));
  const sel=orgs.find(o=>o.id===selected);

  return (
    <div className="page">
      <div className="pg-hd"><div><div className="pg-ttl">Organizations</div><div className="pg-sub">{orgs.length} organizations tracked</div></div><button className="btn btn-blk" onClick={()=>setAdding(true)}>+ Add Org</button></div>
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
          <div className="fg"><label className="fl">Category</label>
            <SearchSelect options={Object.entries(ORG_CATS).map(([v,l])=>({value:v,label:l}))} value={no.category} onChange={v=>setNo({...no,category:v})}/>
          </div>
          <div className="fg"><label className="fl">Status</label>
            <RadioGroup options={STATUS_OPTS_NO_DECLINED} value={no.relationship_status} onChange={v=>setNo({...no,relationship_status:v})}/>
          </div>
          <div className="fg"><label className="fl">Tier</label>
            <RadioGroup options={TIER_OPTS} value={no.tier} onChange={v=>setNo({...no,tier:v})} colorMap={TIER_COLOR}/>
          </div>
          <button className="drawer-toggle" onClick={()=>setNoDrawer(d=>!d)}>{noDrawer?"▾":"▸"} More details</button>
          {noDrawer&&<><hr className="drawer-divider"/>
            <div className="fg"><label className="fl">Website</label><input className="fi" value={no.website} onChange={e=>setNo({...no,website:e.target.value})} placeholder="example.org"/></div>
            <div className="fg"><label className="fl">Primary Contact</label>
              <SearchSelect options={[{value:"",label:"— None —"},...contacts.map(c=>({value:c.id,label:`${c.first_name} ${c.last_name}`,meta:c.title||""}))]} value={no.primary_contact_id||""} onChange={v=>setNo({...no,primary_contact_id:v})} placeholder="Search contacts…"/>
            </div>
            <div className="frow">
              <div className="fg"><label className="fl">Next Action</label><input className="fi" value={no.next_action} onChange={e=>setNo({...no,next_action:e.target.value})}/></div>
              <div className="fg"><label className="fl">Due Date</label><input type="date" className="fi" value={no.next_action_date} onChange={e=>setNo({...no,next_action_date:e.target.value})}/></div>
            </div>
            <div className="fg"><label className="fl">Notes</label><textarea className="fta" rows={2} value={no.notes} onChange={e=>setNo({...no,notes:e.target.value})}/></div>
            <div className="fg"><label className="fl">Tags</label><ChipInput values={no.tags||[]} onChange={v=>setNo({...no,tags:v})}/></div>
          </>}
        </Modal>
      )}
      {filtered.length===0
        ? <div className="empty"><div className="empty-ico">🏢</div><div className="empty-ttl">No organizations</div><div className="empty-txt">Add organizations manually or import JSON from Claude.</div></div>
        : <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Organization</th><th>Category</th><th>Status</th><th>Tier</th><th>People</th><th>Next Action</th><th>Given</th><th></th></tr></thead><tbody>
            {filtered.map(o=>{
              const people=contacts.filter(c=>c.org_id===o.id);
              return <tr key={o.id} onClick={()=>setSelected(o.id)}>
                <td><div style={{fontWeight:700}}>{o.name}</div><div style={{fontSize:11,color:"var(--g400)"}}>{o.website||""}</div></td>
                <td><span className="type-tag">{ORG_CATS[o.category]||o.category}</span></td>
                <td><RelTag status={o.relationship_status}/></td>
                <td><TierBadge tier={o.tier}/></td>
                <td style={{fontSize:12,color:"var(--g600)"}}>{people.length}</td>
                <td style={{maxWidth:160,fontSize:11,color:"var(--g600)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{o.next_action||"—"}</td>
<td style={{fontSize:12}}>{o.financial_relationship?.has_given?fmtMoney(o.financial_relationship.total_given):<span style={{color:"var(--g400)"}}>—</span>}</td>
<td style={{padding:"12px 14px"}}>
                  <div className="row-actions">
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

{editingOrg&&(
  <Modal title={`Edit — ${editingOrg.name}`} wide onClose={()=>setEditingOrg(null)}
    footer={<><button className="btn btn-ghost btn-sm" onClick={()=>setEditingOrg(null)}>Cancel</button><button className="btn btn-blk btn-sm" onClick={saveEditOrg}>Save Changes →</button></>}>
    <div className="fg"><label className="fl">Name *</label><input className="fi" value={editingOrg.name||""} onChange={e=>setEditingOrg({...editingOrg,name:e.target.value})} autoFocus/></div>
    <div className="fg"><label className="fl">Category</label>
      <SearchSelect options={Object.entries(ORG_CATS).map(([v,l])=>({value:v,label:l}))} value={editingOrg.category||"funder"} onChange={v=>setEditingOrg({...editingOrg,category:v})}/>
    </div>
    <div className="fg"><label className="fl">Status</label>
      <RadioGroup options={STATUS_OPTS_NO_DECLINED} value={editingOrg.relationship_status||"cold"} onChange={v=>setEditingOrg({...editingOrg,relationship_status:v})}/>
    </div>
    <div className="fg"><label className="fl">Tier</label>
      <RadioGroup options={TIER_OPTS} value={editingOrg.tier||"B"} onChange={v=>setEditingOrg({...editingOrg,tier:v})} colorMap={TIER_COLOR}/>
    </div>
    <div className="fg"><label className="fl">Confidence</label>
      <RadioGroup options={CONF_OPTS} value={editingOrg.confidence||"MEDIUM"} onChange={v=>setEditingOrg({...editingOrg,confidence:v})}/>
    </div>
    <hr className="drawer-divider"/>
    <div className="fg"><label className="fl">Website</label><input className="fi" value={editingOrg.website||""} onChange={e=>setEditingOrg({...editingOrg,website:e.target.value})}/></div>
    <div className="frow">
      <div className="fg"><label className="fl">Next Action</label><input className="fi" value={editingOrg.next_action||""} onChange={e=>setEditingOrg({...editingOrg,next_action:e.target.value})}/></div>
      <div className="fg"><label className="fl">Due Date</label><input type="date" className="fi" value={editingOrg.next_action_date||""} onChange={e=>setEditingOrg({...editingOrg,next_action_date:e.target.value})}/></div>
    </div>
    <div className="fg"><label className="fl">Notes</label><textarea className="fta" rows={3} value={editingOrg.notes||""} onChange={e=>setEditingOrg({...editingOrg,notes:e.target.value})}/></div>
    <div className="fg"><label className="fl">Tags</label><ChipInput values={editingOrg.tags||[]} onChange={v=>setEditingOrg({...editingOrg,tags:v})}/></div>
  </Modal>
)}
    </div>
  );
}

/* ─── Outreach Log ───────────────────────────────────────────────────────────── */
function OutreachView({contacts,orgs}) {
  const [fType,setFType]=useState("all");
  const [search,setSearch]=useState("");

const all=useMemo(()=>{
    const items=[];
    contacts.forEach(c=>(c.touchpoints||[]).forEach(tp=>items.push({...tp,personName:`${c.first_name} ${c.last_name}`,orgName:orgs.find(o=>o.id===c.org_id)?.name||""})));
    orgs.forEach(o=>(o.touchpoints||[]).forEach(tp=>items.push({...tp,personName:o.name,orgName:"Organization record"})));
    return items.sort((a,b)=>new Date(b.date)-new Date(a.date));
  },[contacts,orgs]);

  const filtered=useMemo(()=>all.filter(tp=>{
    if (fType!=="all"&&tp.type!==fType) return false;
    if (search&&!tp.personName.toLowerCase().includes(search.toLowerCase())&&!tp.summary?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }),[all,fType,search]);

  return (
    <div className="page">
      <div className="pg-hd"><div><div className="pg-ttl">Outreach Log</div><div className="pg-sub">{all.length} touchpoints across all records</div></div></div>
      <div className="filter-bar">
        <input className="fi" placeholder="Search contact or summary…" value={search} onChange={e=>setSearch(e.target.value)}/>
        <select className="fs" value={fType} onChange={e=>setFType(e.target.value)}><option value="all">All types</option>{["email","call","meeting","event","grant_submission","social","other"].map(v=><option key={v} value={v}>{v}</option>)}</select>
      </div>
      {filtered.length===0
        ? <div className="empty"><div className="empty-ico">📋</div><div className="empty-ttl">No touchpoints yet</div><div className="empty-txt">Open any contact or org and log a touchpoint to track your outreach history here.</div></div>
        : <div className="card"><div className="card-bd" style={{padding:0}}>
            {filtered.map((tp,i)=>(
              <div key={tp.id||i} style={{padding:"13px 17px",borderBottom:i<filtered.length-1?"1px solid var(--g100)":"none"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5,flexWrap:"wrap"}}>
                  <span style={{fontSize:13,fontWeight:700}}>{tp.personName}</span>
                  {tp.orgName&&<span style={{fontSize:11,color:"var(--g400)"}}>· {tp.orgName}</span>}
                  <span style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",background:"var(--cyan-lt)",color:"#155e6e",padding:"1px 6px",borderRadius:3}}>{tp.type}</span>
                  <span style={{fontSize:9,color:"var(--g400)"}}>{tp.direction}</span>
                  <span style={{marginLeft:"auto",fontSize:11,color:"var(--g400)",fontWeight:700}}>{fmtDate(tp.date)}</span>
                </div>
                <div style={{fontSize:12,lineHeight:1.6}}>{tp.summary}</div>
                {tp.outcome&&<div style={{fontSize:11,color:"var(--g600)",fontStyle:"italic",marginTop:3}}>Outcome: {tp.outcome}</div>}
                {tp.next_step&&<div style={{fontSize:11,color:"var(--cyan)",fontWeight:700,marginTop:2}}>→ {tp.next_step}</div>}
              </div>
            ))}
          </div></div>
      }
    </div>
  );
}

/* ─── Import View ────────────────────────────────────────────────────────────── */
function ImportView({contacts,orgs,onImportContact,onImportOrg,showToast}) {
  const [jsonText,setJsonText]=useState("");
  const [parsed,setParsed]=useState(null);
  const [parseError,setParseError]=useState("");

  const handleParse=()=>{
    setParseError(""); 
    try {
      const obj=JSON.parse(jsonText.trim());
      const items=Array.isArray(obj)?obj:[obj];
      items.forEach(item=>{ if (!item.record_type&&!item.first_name&&!item.name) throw new Error("Missing record_type or identifying field (first_name/name)"); });
      setParsed(items);
    } catch(e) { setParseError(e.message); setParsed(null); }
  };

  const handleImport=()=>{
    if (!parsed) return;
    const newContacts=[]; const newOrgs=[];
    parsed.forEach(item=>{
const rt=item.record_type||(item.first_name?"individual":"organization");
      if (rt==="individual") {
        const rawId = item.id || uid();
        const id = rawId.startsWith("ind_") ? rawId : `ind_${rawId}`;
        newContacts.push({...item,record_type:"individual",id,touchpoints:item.touchpoints||[],tags:item.tags||[],interests:item.interests||[],linked_grants:item.linked_grants||[],createdAt:item.createdAt||new Date().toISOString()});
      } else {
        const rawId = item.id || uid();
        const id = rawId.startsWith("org_") ? rawId : `org_${rawId}`;
        newOrgs.push({...item,record_type:"organization",id,touchpoints:item.touchpoints||[],tags:item.tags||[],financial_relationship:item.financial_relationship||{has_given:false,total_given:0,grant_history:[]},createdAt:item.createdAt||new Date().toISOString()});
      }
    });
    if (newContacts.length) onImportContact(newContacts);
    if (newOrgs.length) onImportOrg(newOrgs);
    showToast(`Imported: ${newContacts.length} contact(s), ${newOrgs.length} org(s) ✓`);
    setJsonText(""); setParsed(null);
  };

  return (
    <div className="page">
      <div className="pg-hd"><div><div className="pg-ttl">Import JSON</div><div className="pg-sub">Paste Claude-generated profiles directly into the CRM</div></div></div>
      <div className="info-banner">
        <strong>How to use:</strong> Ask Claude to research a contact using the Session 1 prompt from <code>CRM_Session_Prompts.md</code>. Claude generates a JSON profile. Copy it, paste below, click Import. Accepts single records or arrays.
      </div>
      <div className="card">
        <div className="card-hd"><span className="card-ttl">Paste CRM Profile JSON</span></div>
        <div className="card-bd">
          <div className={`import-zone ${jsonText?"active":""}`}>
            <textarea className="import-ta" value={jsonText}
              onChange={e=>{setJsonText(e.target.value);setParsed(null);setParseError("");}}
              placeholder={`// Single record:\n{\n  "record_type": "individual",\n  "id": "ind_example",\n  "first_name": "Jane",\n  "last_name": "Smith",\n  "tier": "A",\n  ...\n}\n\n// Or array:\n[\n  { "record_type": "organization", ... },\n  { "record_type": "individual", ... }\n]`}
            />
          </div>
          {parseError&&<p style={{fontSize:12,color:"#B91C1C",marginTop:8}}>⚠ {parseError}</p>}
          {parsed&&(
            <div className="preview-card">
              <div className="preview-name">{parsed.length} record(s) ready to import</div>
              {parsed.map((item,i)=>(
                <div key={i} className="preview-meta" style={{marginTop:4}}>
                  {item.record_type==="individual"||item.first_name
                    ? `👤 ${item.first_name} ${item.last_name} · ${item.title||""} · Tier ${item.tier||"?"} · ${item.confidence||"MEDIUM"}`
                    : `🏢 ${item.name} · ${item.category||""} · Tier ${item.tier||"?"} · ${item.confidence||"MEDIUM"}`}
                </div>
              ))}
            </div>
          )}
          <div style={{display:"flex",gap:8,marginTop:14}}>
            {!parsed?<button className="btn btn-cyan" onClick={handleParse} disabled={!jsonText.trim()}>Preview Import</button>:<button className="btn btn-acid" onClick={handleImport}>✓ Import into CRM</button>}
            {(jsonText||parsed)&&<button className="btn btn-ghost btn-sm" onClick={()=>{setJsonText("");setParsed(null);setParseError("");}}>Clear</button>}
          </div>
        </div>
      </div>
      <div style={{marginTop:20}}>
        <div className="sect-lbl">Schema Quick Reference</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {[{l:"Individual — Key Fields",f:["record_type: \"individual\"","first_name, last_name","relationship_type","relationship_status","tier (A/B/C)","linked_grants: []","confidence (HIGH/MEDIUM)"]},{l:"Organization — Key Fields",f:["record_type: \"organization\"","name","category (funder/partner…)","relationship_status","tier (A/B/C)","confidence (HIGH/MEDIUM)"]}].map(s=>(
            <div key={s.l} className="card"><div className="card-hd"><span className="card-ttl">{s.l}</span></div><div className="card-bd">{s.f.map(f=><div key={f} style={{fontSize:12,fontFamily:"monospace",color:"var(--g800)",marginBottom:4}}>{f}</div>)}</div></div>
          ))}
        </div>
      </div>
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
  location: "", description: "", contact_ids: [], tags: [], notes: "",
});

function EventEditModal({editing,setEditing,onSave,contacts}) {
  const contactOpts = contacts.map(c=>({value:c.id,label:`${c.first_name} ${c.last_name}`.trim()||c.id,meta:c.title||""}));
  const toggleContact = (cId) => {
    const ids = editing.contact_ids||[];
    setEditing({...editing, contact_ids: ids.includes(cId) ? ids.filter(x=>x!==cId) : [...ids,cId]});
  };
  const [cSearch,setCSearch]=useState("");
  const filteredC = contactOpts.filter(o=>o.label.toLowerCase().includes(cSearch.toLowerCase()));
  return (
    <Modal title={editing._isNew?"Add Event":`Edit — ${editing.name||"Event"}`} wide onClose={()=>setEditing(null)}
      footer={<><button className="btn btn-ghost btn-sm" onClick={()=>setEditing(null)}>Cancel</button><button className="btn btn-blk btn-sm" onClick={onSave}>Save Changes →</button></>}>
      <div className="frow">
        <div className="fg"><label className="fl">Event Name</label><input className="fi" value={editing.name||""} onChange={e=>setEditing({...editing,name:e.target.value})} autoFocus/></div>
        <div className="fg"><label className="fl">Date</label><input type="date" className="fi" value={editing.event_date||""} onChange={e=>setEditing({...editing,event_date:e.target.value})}/></div>
      </div>
      <div className="fg"><label className="fl">Status</label><RadioGroup options={EVT_STATUS_OPTS} value={editing.status||"upcoming"} onChange={v=>setEditing({...editing,status:v})}/></div>
      <div className="fg"><label className="fl">Location</label><input className="fi" value={editing.location||""} onChange={e=>setEditing({...editing,location:e.target.value})}/></div>
      <div className="fg"><label className="fl">Description</label><textarea className="fta" rows={3} value={editing.description||""} onChange={e=>setEditing({...editing,description:e.target.value})}/></div>
      <div className="fg"><label className="fl">Notes</label><textarea className="fta" rows={2} value={editing.notes||""} onChange={e=>setEditing({...editing,notes:e.target.value})}/></div>
      <div className="fg"><label className="fl">Tags</label><ChipInput values={editing.tags||[]} onChange={v=>setEditing({...editing,tags:v})}/></div>
      <div className="fg">
        <label className="fl">Linked Contacts ({(editing.contact_ids||[]).length})</label>
        <input className="fi" placeholder="Search contacts…" value={cSearch} onChange={e=>setCSearch(e.target.value)} style={{marginBottom:6}}/>
        <div style={{maxHeight:140,overflowY:"auto",border:"1.5px solid var(--g200)",borderRadius:6}}>
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
      </div>
    </Modal>
  );
}

function EventDetailPanel({event,contacts,onClose,onEdit,onDelete,showToast}) {
  const mouseDownTarget=useRef(null);
  useEffect(()=>{ const h=(e)=>{ if(e.key==="Escape") onClose(); }; document.addEventListener("keydown",h); return ()=>document.removeEventListener("keydown",h); },[onClose]);
  const linked = contacts.filter(c=>(event.contact_ids||[]).includes(c.id));
  return (
    <div className="detail-overlay"
      onMouseDown={e=>{ mouseDownTarget.current=e.target; }}
      onClick={e=>{ if(e.target===e.currentTarget&&mouseDownTarget.current===e.currentTarget) onClose(); }}>
      <div className="detail-panel">
        <div className="dp-hd">
          <div><div className="dp-name">{event.name||"(Unnamed Event)"}</div><div className="dp-sub">{fmtDate(event.event_date)}{event.location?` · ${event.location}`:""}</div></div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <button className="btn btn-ghost btn-sm" onClick={onEdit}>Edit</button>
            <button className="dp-close" onClick={onClose}>×</button>
          </div>
        </div>
        <div className="dp-body">
          <div className="dp-row"><EventStatusTag status={event.status}/></div>
          {event.description&&<div className="dp-section"><div className="dp-sect-lbl">Description</div><p style={{fontSize:12,lineHeight:1.7}}>{event.description}</p></div>}
          {event.notes&&<div className="dp-section"><div className="dp-sect-lbl">Notes</div><p style={{fontSize:12,lineHeight:1.7}}>{event.notes}</p></div>}
          {linked.length>0&&<div className="dp-section"><div className="dp-sect-lbl">Contacts ({linked.length})</div>{linked.map(c=><div key={c.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:"1px solid var(--g100)"}}><div style={{flex:1}}><div style={{fontSize:13,fontWeight:700}}>{c.first_name} {c.last_name}</div><div style={{fontSize:11,color:"var(--g600)"}}>{c.title}</div></div><RelTag status={c.relationship_status}/></div>)}</div>}
          {(event.tags||[]).length>0&&<div className="dp-section"><div className="dp-sect-lbl">Tags</div><div style={{display:"flex",flexWrap:"wrap",gap:4}}>{event.tags.map(t=><span key={t} style={{background:"var(--g100)",color:"var(--g600)",fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:20,textTransform:"uppercase"}}>{t}</span>)}</div></div>}
          <div style={{marginTop:16}}><button className="btn btn-danger btn-sm" onClick={onDelete}>Delete Event</button></div>
        </div>
      </div>
    </div>
  );
}

function EventsView({events,contacts,onUpdate,onDelete,showToast}) {
  const [search,setSearch]=useState("");
  const [fStatus,setFStatus]=useState("all");
  const [selected,setSelected]=useState(null);
  const [adding,setAdding]=useState(false);
  const [editing,setEditing]=useState(null);
  const [confirmDel,setConfirmDel]=useState(null);

  const filtered = useMemo(()=>{
    return events.filter(e=>{
      const q=search.toLowerCase();
      const matchQ=!q||e.name?.toLowerCase().includes(q)||(e.location||"").toLowerCase().includes(q);
      const matchS=fStatus==="all"||e.status===fStatus;
      return matchQ&&matchS;
    }).sort((a,b)=>{
      if(!a.event_date&&!b.event_date) return 0;
      if(!a.event_date) return 1;
      if(!b.event_date) return -1;
      return a.event_date.localeCompare(b.event_date);
    });
  },[events,search,fStatus]);

  const selectedEvent = selected ? events.find(e=>e.id===selected) : null;

  const handleSave = () => {
    if(!editing) return;
    const updated = events.find(e=>e.id===editing.id)
      ? events.map(e=>e.id===editing.id?editing:e)
      : [...events, editing];
    onUpdate(updated);
    showToast(editing._isNew?"Event added ✓":"Event updated ✓");
    setEditing(null);
    setAdding(false);
  };

  const handleDelete = (id) => {
    onDelete(id);
    setSelected(null);
    setConfirmDel(null);
  };

  return (
    <div className="page">
      <div className="pg-hd">
        <div><div className="pg-ttl">Events</div><div className="pg-sub">{events.length} event{events.length!==1?"s":""} total</div></div>
        <button className="btn btn-blk" onClick={()=>{ const b=BLANK_EVENT(); setEditing({...b,_isNew:true}); setAdding(true); }}>+ Add Event</button>
      </div>
      <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
        <input className="fi" style={{maxWidth:260}} placeholder="Search events…" value={search} onChange={e=>setSearch(e.target.value)}/>
        <select className="fs" style={{maxWidth:160}} value={fStatus} onChange={e=>setFStatus(e.target.value)}>
          <option value="all">All Statuses</option>
          {EVT_STATUS_OPTS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr>
            <th>Event</th><th>Date</th><th>Status</th><th>Contacts</th><th>Location</th><th></th>
          </tr></thead>
          <tbody>
            {filtered.length===0
              ? <tr><td colSpan={6} style={{textAlign:"center",color:"var(--g400)",padding:"28px 0",fontSize:13}}>No events found</td></tr>
              : filtered.map(e=>(
                <tr key={e.id} onClick={()=>setSelected(e.id)}>
                  <td style={{fontWeight:700}}>{e.name||"(Unnamed)"}</td>
                  <td style={{fontSize:12,color:"var(--g600)"}}>{fmtDate(e.event_date)}</td>
                  <td><EventStatusTag status={e.status}/></td>
                  <td style={{fontSize:12,color:"var(--g600)"}}>{(e.contact_ids||[]).length}</td>
                  <td style={{fontSize:12,color:"var(--g600)",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.location||"—"}</td>
                  <td onClick={ev=>ev.stopPropagation()} style={{display:"flex",gap:4}}>
                    <button className="btn btn-ghost btn-xs" onClick={()=>setEditing({...e})}>Edit</button>
                    <button className="btn btn-danger btn-xs" onClick={()=>setConfirmDel(e.id)}>Del</button>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
      {selectedEvent&&<EventDetailPanel event={selectedEvent} contacts={contacts} onClose={()=>setSelected(null)} onEdit={()=>setEditing({...selectedEvent})} onDelete={()=>setConfirmDel(selectedEvent.id)} showToast={showToast}/>}
      {editing&&<EventEditModal editing={editing} setEditing={setEditing} onSave={handleSave} contacts={contacts}/>}
      {confirmDel&&<ConfirmModal message={`Delete "${events.find(e=>e.id===confirmDel)?.name||"this event"}"? This cannot be undone.`} onConfirm={()=>handleDelete(confirmDel)} onCancel={()=>setConfirmDel(null)}/>}
    </div>
  );
}

/* ─── Main App ───────────────────────────────────────────────────────────────── */
export default function CRMApp() {
  const [view,setView]=useState("dashboard");
  const [contacts,setContacts]=useState([]);
  const [orgs,setOrgs]=useState([]);
  const [events,setEvents]=useState([]);
  const [profile,setProfile]=useState(DEFAULT_PROFILE);
  const [toast,setToast]=useState(null);
  const [loading,setLoading]=useState(true);
  const [dbError,setDbError]=useState(null);
  const [pendingDetail,setPendingDetail]=useState(null);
  const [globalQuickLog,setGlobalQuickLog]=useState(false);

  const loadAll=useCallback(async()=>{
    setLoading(true);
    setDbError(null);
    try {
const [
        { data: contactRows, error: cErr },
        { data: orgRows,     error: oErr },
        { data: eventRows,   error: evErr },
        { data: profileData, error: prErr },
      ] = await Promise.all([
        fetchContacts(),
        fetchOrgs(),
        fetchEvents(),
        fetchProfile(),
      ]);

      if (cErr) throw new Error(cErr);
      if (oErr) throw new Error(oErr);
      if (evErr) console.warn("fetchEvents warning:", evErr);
      if (prErr) console.warn("fetchProfile warning:", prErr);

      setContacts(contactRows);
      setOrgs(orgRows);
      setEvents(eventRows);
      setProfile(profileData);
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
    <div className="app">
<Sidebar view={view} setView={(v)=>{setPendingDetail(null);setView(v);}} contacts={contacts} profile={profile} onQuickLog={()=>setGlobalQuickLog(true)}/>
      <main className="main">
        {view==="dashboard"&&<DashboardView contacts={contacts} orgs={orgs} setView={setView} onOpenContact={openContact}/>}
{view==="contacts"&&<ContactsView contacts={contacts} orgs={orgs} events={events} onUpdate={saveContacts} onDelete={deleteContact} onUpdateEvents={saveEvents} showToast={showToast} pendingDetail={pendingDetail} onPendingDetailConsumed={clearPendingDetail}/>}
        {view==="orgs"&&<OrgsView orgs={orgs} contacts={contacts} onUpdate={saveOrgs} onDelete={deleteOrg} showToast={showToast}/>}
        {view==="events"&&<EventsView events={events} contacts={contacts} onUpdate={saveEvents} onDelete={deleteEvent} showToast={showToast}/>}
        {view==="outreach"&&<OutreachView contacts={contacts} orgs={orgs}/>}
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