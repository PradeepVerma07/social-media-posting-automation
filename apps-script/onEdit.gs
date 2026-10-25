/**
 * CI360 Automation Hub — Google Sheets Instant OnEdit Webhook Trigger
 * 
 * Instructions:
 * 1. In your Google Sheet, open Extensions > Apps Script.
 * 2. Paste this code into Code.gs.
 * 3. Set BACKEND_WEBHOOK_URL and HMAC_SECRET in Script Properties:
 *    - BACKEND_WEBHOOK_URL: https://app.yourdomain.com/api/v1/webhooks/sheets
 *    - HMAC_SECRET: your SHEETS_WEBHOOK_SECRET
 * 4. Create an Installable Trigger:
 *    - Function: onSheetEditTrigger
 *    - Event source: From spreadsheet
 *    - Event type: On edit
 */

function onSheetEditTrigger(e) {
  if (!e || !e.range) return;
  var sheet = e.range.getSheet();
  var sheetName = sheet.getName();
  
  // Only process edits on the Posts tab
  if (sheetName !== 'Posts') return;
  
  var row = e.range.getRow();
  if (row <= 1) return; // Ignore header edits
  
  var props = PropertiesService.getScriptProperties();
  var webhookUrl = props.getProperty('BACKEND_WEBHOOK_URL') || 'http://localhost:3000/api/v1/webhooks/sheets';
  var secret = props.getProperty('HMAC_SECRET') || 'ci360_sheets_webhook_secret_2026';
  
  // Read target_id from Column B (col 2)
  var targetId = sheet.getRange(row, 2).getValue();
  var editorEmail = '';
  try {
    editorEmail = Session.getActiveUser().getEmail() || '';
  } catch(err) {}
  
  var colStart = e.range.getColumn();
  var numCols = e.range.getNumColumns();
  var editedColumns = [];
  for (var c = colStart; c < colStart + numCols; c++) {
    editedColumns.push(c);
  }
  
  var payload = JSON.stringify({
    sheet: sheetName,
    row: row,
    target_id: String(targetId).trim(),
    edited_columns: editedColumns,
    editor_email: editorEmail,
    edited_at: new Date().toISOString()
  });
  
  var timestamp = String(Date.now());
  var signatureBytes = Utilities.computeHmacSha256Signature(timestamp + "." + payload, secret);
  var signatureHex = signatureBytes.reduce(function(str, byte) {
    return str + (byte < 0 ? byte + 256 : byte).toString(16).padStart(2, '0');
  }, '');
  
  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'X-CI360-Timestamp': timestamp,
      'X-CI360-Signature': 'sha256=' + signatureHex
    },
    payload: payload,
    muteHttpExceptions: true
  };
  
  try {
    UrlFetchApp.fetch(webhookUrl, options);
  } catch (err) {
    Logger.log('Webhook push error: ' + err);
  }
}
