const fs = require('fs');
const https = require('https');

const tokenData = JSON.parse(fs.readFileSync('scripts/google_token.json', 'utf8'));
const accessToken = tokenData.access_token;
const spreadsheetId = '1t4TsrPeKjI5FKM5u1oByldtfhpzDN_iRm1mD7zOr31A';

function fetchSheetPosts() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'sheets.googleapis.com',
      path: `/v4/spreadsheets/${spreadsheetId}/values/Posts!A1:Z50`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve(json.values || []);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

fetchSheetPosts().then(rows => {
  console.log('Fetched rows from sheet:', rows.length);
  const headers = rows[0];
  const postList = rows.slice(1).map(r => {
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = r[idx] || ''; });
    return obj;
  });
  console.log('Sample parsed post from sheet:', postList[0]);
}).catch(console.error);
