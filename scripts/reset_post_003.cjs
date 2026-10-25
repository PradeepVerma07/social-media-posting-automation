const fs = require('fs');
const https = require('https');

const tokenData = JSON.parse(fs.readFileSync('scripts/google_token.json', 'utf8'));
const accessToken = tokenData.access_token;
const spreadsheetId = '1t4TsrPeKjI5FKM5u1oByldtfhpzDN_iRm1mD7zOr31A';

// Update Row 4 (POST-003) status to Scheduled and clear locked_by_execution
const updateData = JSON.stringify({
  values: [
    ["Scheduled"]
  ]
});

const options = {
  hostname: 'sheets.googleapis.com',
  path: `/v4/spreadsheets/${spreadsheetId}/values/Posts!Q4:Q4?valueInputOption=USER_ENTERED`,
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(updateData)
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Reset POST-003 Status:', body);
  });
});

req.on('error', (e) => console.error('Error:', e));
req.write(updateData);
req.end();
