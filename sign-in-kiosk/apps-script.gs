/**
 * Sprout Society — Sign-in sheet sink.
 * Receives a POST from sprout-sign-in.html and appends one row per sign-in.
 *
 * Setup: see SETUP.md. In short — paste this into the Apps Script editor of
 * your Google Sheet (Extensions → Apps Script), set SHEET_NAME if you like,
 * then Deploy → New deployment → Web app → Execute as: Me, Who has access:
 * Anyone. Copy the Web App URL into CONFIG.SCRIPT_URL in the HTML.
 */

const SHEET_NAME = 'Sign-ins'; // tab the rows are written to (created if missing)

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000); // serialize concurrent kiosk submits
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(['Timestamp', 'Name', 'Email', 'How heard', 'Source']);
      sheet.setFrozenRows(1);
    }
    sheet.appendRow([
      data.ts ? new Date(data.ts) : new Date(),
      String(data.name || ''),
      String(data.email || ''),
      String(data.heard || ''),
      String(data.source || 'kiosk')
    ]);
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Optional: lets you open the Web App URL in a browser to confirm it's live.
function doGet() {
  return json({ ok: true, service: 'sprout-signin', time: new Date().toISOString() });
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
