// lib/md.js — compact Markdown → HTML renderer for the Outreach workspace.
// Handles the constructs the virtual-employee docs actually use: headings, bold,
// italic, inline code, links, blockquotes, horizontal rules, ordered/unordered
// lists, and GFM tables. Not a full CommonMark parser — deliberately small.

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Inline formatting inside a single block of text (already newline-joined).
function mdInline(s) {
  let t = esc(s);
  t = t.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // single-* italic that isn't part of a ** run
  t = t.replace(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g, "$1<em>$2</em>");
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  return t;
}

// Inline renderer, exported for cell-level rendering in the table editor.
export function renderInline(s) { return mdInline(s); }

const isTableSep = (l) =>
  /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(l);

// Split a pipe row into cell sources, honoring escaped pipes (\|) inside a cell.
function splitRow(l) {
  let s = l.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  const cells = [];
  let cur = "";
  for (let k = 0; k < s.length; k++) {
    const ch = s[k];
    if (ch === "\\" && s[k + 1] === "|") { cur += "|"; k++; }
    else if (ch === "|") { cells.push(cur.trim()); cur = ""; }
    else cur += ch;
  }
  cells.push(cur.trim());
  return cells;
}

// Parse a table block's raw source into { header:[cell…], rows:[[cell…]…] }.
// Cells are kept as raw markdown so formatting (bold, code, links) survives editing.
export function parseTableBlock(raw) {
  const lines = String(raw || "").replace(/\r\n?/g, "\n").split("\n").filter((l) => l.trim());
  if (!lines.length) return { header: [], rows: [] };
  const header = splitRow(lines[0]);
  const start = lines[1] && isTableSep(lines[1]) ? 2 : 1;
  const rows = lines.slice(start).map((l) => {
    const cells = splitRow(l);
    return header.map((_, c) => cells[c] ?? "");
  });
  return { header, rows };
}

// Rebuild a markdown table from { header, rows }. Escapes pipes in cells.
export function serializeTable(header, rows) {
  const cell = (v) => String(v ?? "").replace(/\n+/g, " ").replace(/\|/g, "\\|").trim();
  const head = "| " + header.map(cell).join(" | ") + " |";
  const sep = "| " + header.map(() => "---").join(" | ") + " |";
  const body = rows.map((r) => "| " + header.map((_, c) => cell(r[c])).join(" | ") + " |");
  return [head, sep, ...body].join("\n");
}

// Render a single already-classified block (its raw source lines) to HTML.
function renderBlock(rawLines) {
  const lines = rawLines;
  const N = lines.length;
  const line = lines[0] || "";

  if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line) && N === 1) return "<hr/>";

  const h = line.match(/^(#{1,6})\s+(.*)$/);
  if (h) { const lv = h[1].length; return `<h${lv}>${mdInline(h[2])}</h${lv}>`; }

  if (line.trim().startsWith("|") && N >= 2 && isTableSep(lines[1])) {
    const header = splitRow(line);
    const rows = [];
    for (let k = 2; k < N; k++) { if (lines[k].trim().startsWith("|")) rows.push(splitRow(lines[k])); }
    let t = "<div class=\"md-tbl\"><table><thead><tr>" +
      header.map((c) => `<th>${mdInline(c)}</th>`).join("") + "</tr></thead><tbody>";
    t += rows.map((r) => "<tr>" + r.map((c) => `<td>${mdInline(c)}</td>`).join("") + "</tr>").join("");
    t += "</tbody></table></div>";
    return t;
  }

  if (/^\s*>/.test(line)) {
    const buf = lines.map((b) => b.replace(/^\s*>\s?/, ""));
    const paras = [];
    let cur = [];
    buf.forEach((b) => {
      if (!b.trim()) { if (cur.length) { paras.push(cur.join(" ")); cur = []; } }
      else cur.push(b);
    });
    if (cur.length) paras.push(cur.join(" "));
    return "<blockquote>" + paras.map((p) => `<p>${mdInline(p)}</p>`).join("") + "</blockquote>";
  }

  if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
    const ordered = /^\s*\d+\.\s+/.test(line);
    const tag = ordered ? "ol" : "ul";
    return `<${tag}>` +
      lines.map((it) => `<li>${mdInline(it.replace(/^\s*([-*+]|\d+\.)\s+/, ""))}</li>`).join("") +
      `</${tag}>`;
  }

  return `<p>${mdInline(lines.join(" "))}</p>`;
}

// Split markdown into editable blocks: [{ raw, html }]. Blank lines are separators
// and are not blocks themselves. Each block's `raw` is a standalone markdown snippet
// that renders (via renderBlock) to the same HTML the whole-doc renderer produces —
// so a doc round-trips as blocks.map(raw).join("\n\n").
export function blocksOf(md) {
  const lines = String(md || "").replace(/\r\n?/g, "\n").replace(/\t/g, "    ").split("\n");
  const N = lines.length;
  const out = [];
  let i = 0;

  const push = (start, end, type) => {
    const raw = lines.slice(start, end);
    out.push({ raw: raw.join("\n"), html: renderBlock(raw), type });
  };

  while (i < N) {
    if (!lines[i].trim()) { i++; continue; }
    const start = i;
    const line = lines[i];

    // horizontal rule
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { i++; push(start, i, "hr"); continue; }

    // heading
    if (/^(#{1,6})\s+/.test(line)) { i++; push(start, i, "heading"); continue; }

    // table
    if (line.trim().startsWith("|") && i + 1 < N && isTableSep(lines[i + 1])) {
      i += 2;
      while (i < N && lines[i].trim().startsWith("|")) i++;
      push(start, i, "table");
      continue;
    }

    // blockquote
    if (/^\s*>/.test(line)) {
      while (i < N && /^\s*>/.test(lines[i])) i++;
      push(start, i, "blockquote");
      continue;
    }

    // list
    if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
      while (i < N && /^\s*([-*+]|\d+\.)\s+/.test(lines[i])) i++;
      push(start, i, "list");
      continue;
    }

    // paragraph
    i++;
    while (
      i < N && lines[i].trim() &&
      !/^\s*(#{1,6}\s|>|[-*+]\s|\d+\.\s|\|)/.test(lines[i]) &&
      !/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(lines[i])
    ) { i++; }
    push(start, i, "paragraph");
  }

  return out;
}

export function mdToHtml(md) {
  return blocksOf(md).map((b) => b.html).join("\n");
}

// Pull the first `# ` heading as a document title.
export function firstHeading(md) {
  const m = String(md || "").match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : "";
}
