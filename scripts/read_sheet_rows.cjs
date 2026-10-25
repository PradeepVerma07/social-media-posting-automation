const fs = require('fs');
const https = require('https');

const tokenData = JSON.parse(fs.readFileSync('scripts/google_token.json', 'utf8'));
const accessToken = tokenData.access_token;
const spreadsheetId = '1t4TsrPeKjI5FKM5u1oByldtfhpzDN_iRm1mD7zOr31A';

const options = {
  hostname: 'sheets.googleapis.com',
  path: `/v4/spreadsheets/${spreadsheetId}/values/Posts!A1:Z10`,
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const data = JSON.parse(body);
    const rows = data.values || [];
    rows.forEach((r, idx) => {
      console.log(`Row ${idx + 1}:`, r[0], r[16], r[12], r[13], r[14]);
    });
  });
});

req.on('error', (e) => console.error('Error:', e));
req.end();
