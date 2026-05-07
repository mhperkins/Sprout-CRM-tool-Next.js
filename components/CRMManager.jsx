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
const REL_STATUS = { cold:"Cold", cool:"Cool", warm:"Warm", active:"Active" };
const REL_TYPES  = { music:"Music", art:"Art", event_host:"Event Host", community_builder:"Community Builder", partner:"Partner", other:"Other" };
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
  return (
    <div>
      {sorted.length===0&&!adding&&<p style={{fontSize:12,color:"var(--g400)",fontStyle:"italic",marginBottom:10}}>No touchpoints logged yet.</p>}
      <div className="tp-wrap">
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
function ContactDetail({contact,orgs,onClose,onUpdate,onEdit,showToast}) {
  const mouseDownTarget = useRef(null);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [naExpanded, setNaExpanded] = useState(false);
  const [addingAction, setAddingAction] = useState(false);
  useEffect(()=>{ const h=(e)=>{ if(e.key==="Escape") onClose(); }; document.addEventListener("keydown",h); return ()=>document.removeEventListener("keydown",h); },[onClose]);
  const org = orgs.find(o=>o.id===contact.org_id);
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
    onUpdate({...contact, next_action:"", next_action_date:"", next_actions_log:archived});
    showToast("Action marked complete ✓");
  };
  const saveNewAction = (text,date) => {
    const prevLog = contact.next_actions_log||[];
    const archived = contact.next_action ? [{text:contact.next_action,date:contact.next_action_date||null,loggedAt:new Date().toISOString(),completed:false},...prevLog] : prevLog;
    onUpdate({...contact, next_action:text, next_action_date:date||"", next_actions_log:archived});
    showToast("Next action saved ✓");
  };
  const addTp = (tp) => {
    const base = {...contact, touchpoints:[...(contact.touchpoints||[]),tp]};
    if (tp.next_action) {
      const prevLog = contact.next_actions_log||[];
      const prevEntry = contact.next_action ? [{text:contact.next_action,date:contact.next_action_date||null,loggedAt:new Date().toISOString()},...prevLog] : prevLog;
      onUpdate({...base, next_action:tp.next_action, next_action_date:tp.next_action_date||"", next_actions_log:prevEntry});
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
          <div className="dp-section">
            <div className="dp-sect-lbl">Contact Details</div>
            {contact.email&&<div className="dp-field"><strong>Email:</strong> <a href={`mailto:${contact.email}`} style={{color:"var(--cyan)"}}>{contact.email}</a></div>}
            {contact.phone&&<div className="dp-field"><strong>Phone:</strong> {contact.phone}</div>}
            {contact.instagram_handle&&<div className="dp-field"><strong>Instagram:</strong> {contact.instagram_handle}</div>}
            {contact.website&&<div className="dp-field"><strong>Website:</strong> <a href={contact.website} target="_blank" rel="noreferrer" style={{color:"var(--cyan)"}}>{contact.website}</a></div>}
          </div>
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
      {confirmDeleteNA!==null&&<ConfirmModal message="Delete this action? This cannot be undone." onConfirm={()=>{ if(confirmDeleteNA==="current"){onUpdate({...org,next_action:"",next_action_date:""});showToast("Action deleted");}else{deleteLogEntry(confirmDeleteNA);}setConfirmDeleteNA(null);}} onCancel={()=>setConfirmDeleteNA(null)}/>}
    </div>
  );
}

/* ─── Org Detail Panel ───────────────────────────────────────────────────────── */
function OrgDetail({org,contacts,onClose,onUpdate,onEdit,showToast}) {
  const mouseDownTarget = useRef(null);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [naExpanded, setNaExpanded] = useState(false);
  const [addingAction, setAddingAction] = useState(false);
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
function DashboardView({contacts,orgs,setView,events,onUpdateContacts,onUpdateEvents,showToast}) {
  const today = new Date().toISOString().slice(0,10);
  const overdue = contacts.filter(isOverdue);
  const active = contacts.filter(c=>c.relationship_status==="active").length;

  const allActions = [];
  contacts.forEach(c=>{
    const actions = c.next_actions||[];
    actions.filter(a=>!a.completed&&a.date).forEach(a=>{
      allActions.push({type:"contact",contact:c,text:a.text,date:a.date,id:a.id});
    });
    if((!actions.length)&&c.next_action&&c.next_action_date){
      allActions.push({type:"contact",contact:c,text:c.next_action,date:c.next_action_date,id:c.id+"-na"});
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
  const upcomingEvents = (events||[]).filter(ev=>ev.status==="upcoming"&&ev.event_date&&ev.event_date>=today).sort((a,b)=>new Date(a.event_date)-new Date(b.event_date));

  const [dashEditing,setDashEditing]=useState(null);
  const openDashEdit=(c)=>setDashEditing({...c});
  const saveDashEdit=(updated)=>{
    onUpdateContacts(contacts.map(c=>c.id===updated.id?updated:c));
    setDashEditing(null);
    showToast("Contact saved ✓");
  };
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
                  const d=daysUntil(ev.event_date);
                  const tag=d===0?"Today":d===1?"Tomorrow":d!==null?`In ${d}d`:null;
                  return (
                    <div key={ev.id} className="overdue-row" onClick={()=>setView("events")}>
                      <div><div className="overdue-name">{ev.name}</div><div className="overdue-meta">{ev.location||"No location"} · {(ev.contact_ids||[]).length} contacts</div></div>
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
                    <div key={a.id} className="overdue-row" onClick={()=>a.type==="contact"?openDashEdit(a.contact):setView("events")}>
                      <div style={{flex:1,minWidth:0}}>
                        <div className="overdue-name">
                          {a.type==="contact"?`${a.contact.first_name} ${a.contact.last_name}`:a.event?.name||"Event"}
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
          <div className="card-hd"><span className="card-ttl">⚠ Overdue Contacts</span><button className="btn btn-ghost btn-xs" onClick={()=>setView("contacts")}>View all</button></div>
          <div className="card-bd" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {overdue.length===0
              ? <p style={{fontSize:12,color:"var(--g400)",textAlign:"center",padding:"12px 0",gridColumn:"1/-1"}}>All contacts are on schedule 🎉</p>
              : overdue.map(c=>{
                  const last=lastTouchDate(c); const since=last?daysSince(last.slice(0,10)):null;
                  return (
                    <div key={c.id} className="overdue-row" onClick={()=>openDashEdit(c)}>
                      <div><div className="overdue-name">{c.first_name} {c.last_name}</div><div className="overdue-meta">{REL_STATUS[c.relationship_status]||c.relationship_status}</div></div>
                      <span style={{fontSize:11,fontWeight:700,color:"#B91C1C",whiteSpace:"nowrap"}}>{since!==null?`${since}d ago`:"Never contacted"}</span>
                    </div>
                  );
                })
            }
          </div>
        </div>

      </div>
      {dashEditing&&<ContactEditModal editing={dashEditing} setEditing={setDashEditing} onSave={saveDashEdit} orgs={orgs} events={events||[]} onUpdateEvents={onUpdateEvents} onNavigate={setView}/>}
    </div>
  );
}

/* ─── Contact Edit Modal ─────────────────────────────────────────────────────── */
function ContactEditModal({editing,setEditing,onSave,orgs,events,onUpdateEvents,onNavigate,initialTab="overview"}) {
  const [eTab,setETab]=useState(initialTab);
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
        <div className="fg"><label className="fl">Organization</label><SearchSelect options={orgOpts} value={editing.org_id||""} onChange={v=>setEditing({...editing,org_id:v})}/></div>
        <div className="fg"><label className="fl">Status</label><RadioGroup options={STATUS_OPTS} value={editing.relationship_status||"cold"} onChange={v=>setEditing({...editing,relationship_status:v})}/></div>
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
            const updated=[entry,...nas];
            const earliest=updated.filter(a=>!a.completed&&a.date).sort((a,b)=>a.date.localeCompare(b.date))[0];
            setEditing(p=>({...p,next_actions:updated,next_action:entry.text,next_action_date:earliest?.date||entry.date||"",_naText:"",_naDate:""}));
          };
          const toggleNA=(id)=>{
            const updated=nas.map(a=>a.id===id?{...a,completed:!a.completed}:a);
            const earliest=updated.filter(a=>!a.completed&&a.date).sort((a,b)=>a.date.localeCompare(b.date))[0];
            setEditing(p=>({...p,next_actions:updated,next_action_date:earliest?.date||""}));
          };
          const deleteNA=(id)=>setEditing(p=>({...p,next_actions:nas.filter(a=>a.id!==id)}));
          const scrollable=nas.length>3;
          return <div className="fg">
            <label className="fl">Next Actions</label>
            <div style={{display:"flex",gap:6,marginBottom:6}}>
              <input className="fi" style={{flex:1}} placeholder="New action…" value={naText} onChange={e=>setNaText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addNA()}/>
              <input type="date" className="fi" style={{width:140}} value={naDate} onChange={e=>setNaDate(e.target.value)}/>
              <button className="btn btn-blk btn-xs" onClick={addNA}>+ Add</button>
            </div>
            {nas.length>0&&<div style={{maxHeight:scrollable?108:undefined,overflowY:scrollable?"auto":"visible",border:"1.5px solid var(--g200)",borderRadius:6}}>
              {nas.map(a=><div key={a.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderBottom:"1px solid var(--g100)",opacity:a.completed?0.45:1,background:a.completed?"var(--g50)":"#fff"}}>
                <input type="checkbox" checked={a.completed} disabled={a.completed} onChange={()=>!a.completed&&toggleNA(a.id)} style={{cursor:a.completed?"not-allowed":"pointer"}}/>
                <div style={{flex:1,fontSize:12}}>
                  <div style={{textDecoration:a.completed?"line-through":"none",fontWeight:600}}>{a.text}</div>
                  {a.date&&<div style={{fontSize:10,color:"var(--g400)"}}>{fmtDate(a.date)}</div>}
                </div>
                <button style={{background:"none",border:"none",cursor:"pointer",color:"var(--fuchsia)",fontWeight:900,fontSize:14,padding:"0 2px"}} onClick={()=>deleteNA(a.id)}>✕</button>
              </div>)}
            </div>}
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
    </Modal>
  );
}

/* ─── Contacts View ──────────────────────────────────────────────────────────── */
function ContactsView({contacts,orgs,events,onUpdate,onDelete,onUpdateEvents,showToast,pendingDetail,onPendingDetailConsumed,setView}) {
  const [search,setSearch]=useState("");
  const [fType,setFType]=useState("all");
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
const blank={first_name:"",last_name:"",org_id:"",email:"",phone:"",instagram_handle:"",website:"",relationship_types:[],relationship_status:"cold",notes:"",next_action:"",next_action_date:"",next_actions:[]};
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
    if (fType!=="all"&&!(c.relationship_types||[c.relationship_type]).includes(fType)) return false;
    if (fStatus!=="all"&&c.relationship_status!==fStatus) return false;
    return true;
  }), [contacts, search, fType, fStatus]);

const [editing,setEditing]=useState(null);
  const [editingTab,setEditingTab]=useState("overview"); // pre-select tab on open
  const [confirmDelete,setConfirmDelete]=useState(null);
  const [quickLog,setQuickLog]=useState(null); // contact id or null

  const addContact=()=>{
    const c={...nc,record_type:"individual",id:`ind_${uid()}`,touchpoints:[],financial_relationship:{has_given:false,total_given:0},createdAt:new Date().toISOString()};
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
<select className="fs" value={fStatus} onChange={e=>setFStatus(e.target.value)}><option value="all">All statuses</option>{Object.entries(REL_STATUS).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
{(search||fType!=="all"||fStatus!=="all")&&<button className="btn btn-ghost btn-sm" onClick={()=>{setSearch("");setFType("all");setFStatus("all");}}>✕ Clear</button>}
      </div>
{adding&&(
        <Modal title="Add Contact" onClose={()=>{setAdding(false);setNc(blank);}}
          footer={<><button className="btn btn-ghost btn-sm" onClick={()=>{setAdding(false);setNc(blank);}}>Cancel</button><button className="btn btn-blk btn-sm" onClick={addContact}>Add Contact →</button></>}>
          <div className="frow">
            <div className="fg"><label className="fl">First Name *</label><input className="fi" value={nc.first_name} onChange={e=>setNc({...nc,first_name:e.target.value})} autoFocus/></div>
            <div className="fg"><label className="fl">Last Name *</label><input className="fi" value={nc.last_name} onChange={e=>setNc({...nc,last_name:e.target.value})}/></div>
          </div>
          <div className="fg"><label className="fl">Organization</label>
            <SearchSelect options={[{value:"",label:"— None —"},...orgs.map(o=>({value:o.id,label:o.name,meta:ORG_CATS[o.category]||o.category}))]} value={nc.org_id} onChange={v=>setNc({...nc,org_id:v})} placeholder="Search organizations…"/>
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
          <button className="drawer-toggle" onClick={()=>setNcDrawer(d=>!d)}>{ncDrawer?"▾":"▸"} More details</button>
          {ncDrawer&&<><hr className="drawer-divider"/>
            <div className="frow">
              <div className="fg"><label className="fl">Email</label><input type="email" className="fi" value={nc.email} onChange={e=>setNc({...nc,email:e.target.value})}/></div>
              <div className="fg"><label className="fl">Phone</label><input className="fi" value={nc.phone} onChange={e=>setNc({...nc,phone:e.target.value})}/></div>
            </div>
            <div className="fg"><label className="fl">Instagram</label><input className="fi" value={nc.instagram_handle||""} onChange={e=>setNc({...nc,instagram_handle:e.target.value})} placeholder="@handle"/></div>
            <div className="fg"><label className="fl">Website</label><input className="fi" value={nc.website||""} onChange={e=>setNc({...nc,website:e.target.value})} placeholder="https://example.org"/></div>
            <div className="frow">
              <div className="fg"><label className="fl">Next Action</label><input className="fi" value={nc.next_action} onChange={e=>setNc({...nc,next_action:e.target.value})}/></div>
              <div className="fg"><label className="fl">Due Date</label><input type="date" className="fi" value={nc.next_action_date} onChange={e=>setNc({...nc,next_action_date:e.target.value})}/></div>
            </div>
            <div className="fg"><label className="fl">Notes</label><textarea className="fta" rows={2} value={nc.notes} onChange={e=>setNc({...nc,notes:e.target.value})}/></div>
          </>}
        </Modal>
      )}
      {filtered.length===0
        ? <div className="empty"><div className="empty-ico">👤</div><div className="empty-ttl">{contacts.length===0?"No contacts yet":"No results"}</div><div className="empty-txt">{contacts.length===0?"Add contacts manually or import JSON profiles from Claude.":"Try adjusting your filters."}</div></div>
      : <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>Name</th><th>Type</th><th>Organization</th><th>Status</th><th>Next Action</th><th>Health</th><th></th></tr></thead>
            <tbody>
{filtered.map(c=>{
              const org=orgs.find(o=>o.id===c.org_id);
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
                <td style={{fontSize:12,color:"var(--g600)"}}>{org?.name||"—"}</td>
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
{sel&&<ContactDetail contact={sel} orgs={orgs} onClose={()=>setSelected(null)} onUpdate={updateContact} onEdit={()=>setEditing({...sel})} showToast={showToast}/>}
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
      <div className="modal-tabs">
        {["overview","touchpoint log"].map(t=><button key={t} className={`modal-tab ${oTab===t?"on":""}`} onClick={()=>setOTab(t)}>{t}</button>)}
      </div>
      {oTab==="overview"&&<>
        <div className="fg"><label className="fl">Name *</label><input className="fi" value={editingOrg.name||""} onChange={e=>setEditingOrg({...editingOrg,name:e.target.value})} autoFocus/></div>
        <div className="fg"><label className="fl">Website</label><input className="fi" value={editingOrg.website||""} onChange={e=>setEditingOrg({...editingOrg,website:e.target.value})} placeholder="https://example.org"/></div>
        <div className="fg"><label className="fl">Instagram</label><input className="fi" value={editingOrg.instagram_handle||""} onChange={e=>setEditingOrg({...editingOrg,instagram_handle:e.target.value})} placeholder="@handle"/></div>
        <div className="fg"><label className="fl">Category</label>
          <SearchSelect options={Object.entries(ORG_CATS).map(([v,l])=>({value:v,label:l}))} value={editingOrg.category||"funder"} onChange={v=>setEditingOrg({...editingOrg,category:v})}/>
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
  const [selected,setSelected]=useState(null);
  const [adding,setAdding]=useState(false);
const blank={name:"",category:"funder",website:"",instagram_handle:"",phone:"",email:"",relationship_status:"cold",notes:"",next_action:"",next_action_date:"",primary_contact_id:""};
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
    const o={...no,record_type:"organization",id:`org_${uid()}`,primary_contact_id:"",financial_relationship:{has_given:false,total_given:0,grant_history:[]},touchpoints:[],createdAt:new Date().toISOString()};
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
          <div className="fg"><label className="fl">Website</label><input className="fi" value={no.website} onChange={e=>setNo({...no,website:e.target.value})} placeholder="https://example.org"/></div>
          <div className="fg"><label className="fl">Category</label>
            <SearchSelect options={Object.entries(ORG_CATS).map(([v,l])=>({value:v,label:l}))} value={no.category} onChange={v=>setNo({...no,category:v})}/>
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
        ? <div className="empty"><div className="empty-ico">🏢</div><div className="empty-ttl">No organizations</div><div className="empty-txt">Add organizations manually or import JSON from Claude.</div></div>
        : <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Organization</th><th>Category</th><th>Status</th><th>Next Action</th><th>Given</th><th></th></tr></thead><tbody>
            {filtered.map(o=>{
              return <tr key={o.id} onClick={()=>setSelected(o.id)}>
                <td><div style={{fontWeight:700}}>{o.name}</div><div style={{fontSize:11,color:"var(--g400)"}}>{o.website||""}</div></td>
                <td><span className="type-tag">{ORG_CATS[o.category]||o.category}</span></td>
                <td><RelTag status={o.relationship_status}/></td>
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

{editingOrg&&<OrgEditModal editingOrg={editingOrg} setEditingOrg={setEditingOrg} onSave={saveEditOrg}/>}
    </div>
  );
}

/* ─── Outreach Log ───────────────────────────────────────────────────────────── */
function OutreachView({contacts,orgs}) {
  const [search,setSearch]=useState("");

  const all=useMemo(()=>{
    const items=[];
    contacts.forEach(c=>(c.touchpoints||[]).forEach(tp=>items.push({...tp,personName:`${c.first_name} ${c.last_name}`,orgName:orgs.find(o=>o.id===c.org_id)?.name||""})));
    orgs.forEach(o=>(o.touchpoints||[]).forEach(tp=>items.push({...tp,personName:o.name,orgName:"Organization record"})));
    return items.sort((a,b)=>new Date(b.date)-new Date(a.date));
  },[contacts,orgs]);

  const filtered=useMemo(()=>all.filter(tp=>{
    if (search&&!tp.personName.toLowerCase().includes(search.toLowerCase())&&!tp.summary?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }),[all,search]);

  return (
    <div className="page">
      <div className="pg-hd"><div><div className="pg-ttl">Outreach Log</div><div className="pg-sub">{all.length} touchpoints across all records</div></div></div>
      <div className="filter-bar">
        <input className="fi" placeholder="Search contact or summary…" value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>
      {filtered.length===0
        ? <div className="empty"><div className="empty-ico">📋</div><div className="empty-ttl">No touchpoints yet</div><div className="empty-txt">Open any contact or org and log a touchpoint to track your outreach history here.</div></div>
        : <div className="card"><div className="card-bd" style={{padding:0}}>
            {filtered.map((tp,i)=>(
              <div key={tp.id||i} style={{padding:"13px 17px",borderBottom:i<filtered.length-1?"1px solid var(--g100)":"none"}}>
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
              placeholder={`// Single record:\n{\n  "record_type": "individual",\n  "id": "ind_example",\n  "first_name": "Jane",\n  "last_name": "Smith",\n  "relationship_type": "partner",\n  ...\n}\n\n// Or array:\n[\n  { "record_type": "organization", ... },\n  { "record_type": "individual", ... }\n]`}
            />
          </div>
          {parseError&&<p style={{fontSize:12,color:"#B91C1C",marginTop:8}}>⚠ {parseError}</p>}
          {parsed&&(
            <div className="preview-card">
              <div className="preview-name">{parsed.length} record(s) ready to import</div>
              {parsed.map((item,i)=>(
                <div key={i} className="preview-meta" style={{marginTop:4}}>
                  {item.record_type==="individual"||item.first_name
                    ? `👤 ${item.first_name} ${item.last_name} · ${item.relationship_type||""} · ${item.relationship_status||"cold"}`
                    : `🏢 ${item.name} · ${item.category||""} · ${item.relationship_status||"cold"}`}
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
          {[{l:"Individual — Key Fields",f:["record_type: \"individual\"","first_name, last_name","email, phone","relationship_type (partner/community_builder/other)","relationship_status (cold/warm/active)","next_action, next_action_date","instagram_handle, website"]},{l:"Organization — Key Fields",f:["record_type: \"organization\"","name","category (funder/partner/vendor/media/government)","relationship_status (cold/warm/active)","phone, email, instagram_handle, website","next_action, next_action_date"]}].map(s=>(
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
  location: "", description: "", contact_ids: [], confirmed_ids: [], notes: "",
  checklist: [], next_actions: [],
});

function EventEditModal({editing,setEditing,onSave,contacts}) {
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

  const active_cl=(editing.checklist||[]).filter(i=>!i.completed);
  const done_cl=(editing.checklist||[]).filter(i=>i.completed);
  const active_na=(editing.next_actions||[]).filter(i=>!i.completed);
  const done_na=(editing.next_actions||[]).filter(i=>i.completed);

  return (
    <Modal title={editing._isNew?"Add Event":`Edit — ${editing.name||"Event"}`} wide onClose={()=>setEditing(null)}
      footer={<><button className="btn btn-ghost btn-sm" onClick={()=>setEditing(null)}>Cancel</button><button className="btn btn-blk btn-sm" onClick={onSave}>Save Changes →</button></>}>
      <div className="modal-tabs">
        {["overview","checklist","next actions","contacts"].map(t=><button key={t} className={`modal-tab ${eTab===t?"on":""}`} onClick={()=>setETab(t)}>{t}</button>)}
      </div>

      {eTab==="overview"&&<>
        <div className="frow">
          <div className="fg"><label className="fl">Event Name</label><input className="fi" value={editing.name||""} onChange={e=>setEditing({...editing,name:e.target.value})} autoFocus/></div>
          <div className="fg"><label className="fl">Date</label><input type="date" className="fi" value={editing.event_date||""} onChange={e=>setEditing({...editing,event_date:e.target.value})}/></div>
        </div>
        <div className="fg"><label className="fl">Status</label><RadioGroup options={EVT_STATUS_OPTS} value={editing.status||"upcoming"} onChange={v=>setEditing({...editing,status:v})}/></div>
        <div className="fg"><label className="fl">Location</label><input className="fi" value={editing.location||""} onChange={e=>setEditing({...editing,location:e.target.value})}/></div>
        <div className="fg"><label className="fl">Description</label><textarea className="fta" rows={3} value={editing.description||""} onChange={e=>setEditing({...editing,description:e.target.value})}/></div>
        <div className="fg"><label className="fl">Notes</label><textarea className="fta" rows={2} value={editing.notes||""} onChange={e=>setEditing({...editing,notes:e.target.value})}/></div>
      </>}

      {eTab==="checklist"&&<>
        <div style={{fontSize:11,color:"var(--g400)",marginBottom:12}}>Event day / prep checklist — mark items done during the event.</div>
        <div style={{maxHeight:220,overflowY:"auto",marginBottom:12}}>
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
        <div style={{maxHeight:220,overflowY:"auto",marginBottom:12}}>
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
        <div style={{maxHeight:240,overflowY:"auto",border:"1.5px solid var(--g200)",borderRadius:6}}>
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
    </Modal>
  );
}

function EventDetailPanel({event,contacts,onClose,onEdit,onDelete,showToast,onUpdateEvent,onContactClick}) {
  const mouseDownTarget=useRef(null);
  useEffect(()=>{ const h=(e)=>{ if(e.key==="Escape") onClose(); }; document.addEventListener("keydown",h); return ()=>document.removeEventListener("keydown",h); },[onClose]);
  const linked = contacts.filter(c=>(event.contact_ids||[]).includes(c.id));
  const onToggleConfirm = (cId) => {
    const ids=event.confirmed_ids||[];
    onUpdateEvent({...event, confirmed_ids: ids.includes(cId)?ids.filter(x=>x!==cId):[...ids,cId]});
  };
  const onRemoveContact = (cId) => {
    onUpdateEvent({...event, contact_ids:(event.contact_ids||[]).filter(x=>x!==cId), confirmed_ids:(event.confirmed_ids||[]).filter(x=>x!==cId)});
  };
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
          {linked.length>0&&<div className="dp-section">
            <div className="dp-sect-lbl">Contacts ({linked.length})</div>
            {linked.map(c=>{
              const confirmed=(event.confirmed_ids||[]).includes(c.id);
              return <div key={c.id} onClick={()=>onContactClick&&onContactClick(c)} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:"1px solid var(--g100)",cursor:onContactClick?"pointer":"default"}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700}}>{c.first_name} {c.last_name}</div>
                  <div style={{fontSize:11,color:"var(--g600)"}}>{c.title}</div>
                </div>
                <RelTag status={c.relationship_status}/>
                <button onClick={ev=>{ev.stopPropagation();onToggleConfirm(c.id);}} style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:20,border:"1.5px solid",cursor:"pointer",background:confirmed?"var(--cyan)":"transparent",color:confirmed?"#fff":"var(--g400)",borderColor:confirmed?"var(--cyan)":"var(--g300)"}}>
                  {confirmed?"✓ Confirmed":"RSVP"}
                </button>
                <button onClick={ev=>{ev.stopPropagation();onRemoveContact(c.id);}} style={{background:"none",border:"none",cursor:"pointer",color:"var(--g400)",fontSize:16,lineHeight:1,padding:"0 2px"}} title="Remove from event">×</button>
              </div>;
            })}
          </div>}
          <div style={{marginTop:16}}><button className="btn btn-danger btn-sm" onClick={onDelete}>Delete Event</button></div>
        </div>
      </div>
    </div>
  );
}

function EventsView({events,contacts,orgs,onUpdate,onDelete,showToast,onUpdateContacts}) {
  const [search,setSearch]=useState("");
  const [fStatus,setFStatus]=useState("all");
  const [selected,setSelected]=useState(null);
  const [adding,setAdding]=useState(false);
  const [editing,setEditing]=useState(null);
  const [confirmDel,setConfirmDel]=useState(null);
  const [inlineContact,setInlineContact]=useState(null);

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

  const handleUpdateEvent = (updated) => {
    onUpdate(events.map(e=>e.id===updated.id?updated:e));
  };

  const handleContactClick = (c) => { setInlineContact({...c}); };
  const handleSaveInlineContact = () => {
    if(!inlineContact||!onUpdateContacts) return;
    onUpdateContacts(inlineContact);
    setInlineContact(null);
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
      {selectedEvent&&<EventDetailPanel event={selectedEvent} contacts={contacts} onClose={()=>setSelected(null)} onEdit={()=>setEditing({...selectedEvent})} onDelete={()=>setConfirmDel(selectedEvent.id)} showToast={showToast} onUpdateEvent={handleUpdateEvent} onContactClick={handleContactClick}/>}
      {editing&&<EventEditModal editing={editing} setEditing={setEditing} onSave={handleSave} contacts={contacts}/>}
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
        {view==="dashboard"&&<DashboardView contacts={contacts} orgs={orgs} events={events} setView={setView} onUpdateContacts={saveContacts} onUpdateEvents={saveEvents} showToast={showToast}/>}
{view==="contacts"&&<ContactsView contacts={contacts} orgs={orgs} events={events} onUpdate={saveContacts} onDelete={deleteContact} onUpdateEvents={saveEvents} showToast={showToast} pendingDetail={pendingDetail} onPendingDetailConsumed={clearPendingDetail} setView={setView}/>}
        {view==="orgs"&&<OrgsView orgs={orgs} contacts={contacts} onUpdate={saveOrgs} onDelete={deleteOrg} showToast={showToast}/>}
{view==="events"&&<EventsView events={events} contacts={contacts} orgs={orgs} onUpdate={saveEvents} onDelete={deleteEvent} showToast={showToast} onUpdateContacts={(c)=>saveContacts(contacts.map(x=>x.id===c.id?c:x))}/>}
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