const fs = require('fs');
const https = require('https');
const path = require('path');

const tokenPath = path.resolve(__dirname, 'google_token.json');
const googleToken = JSON.parse(fs.readFileSync(tokenPath, 'utf8')).access_token;
const spreadsheetId = '1t4TsrPeKjI5FKM5u1oByldtfhpzDN_iRm1mD7zOr31A';

const pageToken = 'EAGVJejn6LZAgBSxZAyX1JlWMJ2nJBM0ON8ZByRAZBBILZCv8kDJwB40jM2qA5arDAep5cm6gisgUIeW0PovpRBx5pr0rLYAmqvP9vmKpozGjk7UwsS9i2kefGndgvjtDMC3Fb4pssBLv0XDD1kMV0WWgOttox8rvVkJ0FvbcWlazscBOXnVGflU5EHQr6ezqRPoSNLmELWqlrOFaOzL4ClXzhpcGFjNOZBj15NlbMZD';
const userToken = 'EAGVJejn6LZAgBS9ti94Az8VqSZBuAaLYYdLLLKVB4YdWAGWjmNXipYQJuC5pQjgZCn2Om1B5RJg0y0Oem8J4QAHwfgZCkNiafiemrHrFH7ribhNriULDNyDHVZAxAZCebZCiuVJ9jndSQdUYjzzZAaTQKFYgzrfuZB0GILrBmqQeusoqC7d1bnQchg5II6oNZA3VQSvUPZBANGi91iV6L9t5WkoPXvKCVqEh12lG4CARMUbMciyu0Yu5XA8aXmeYrZAZB3gpwBvU4z1jmpuwZBGmLRTEEf4Rhq';

// Row 2 is Facebook (ACC-001) -> pageToken
// Row 3 is Instagram (ACC-002) -> pageToken
const values = [
  [pageToken],
  [pageToken]
];

const postData = JSON.stringify({ values });

const options = {
  hostname: 'sheets.googleapis.com',
  path: `/v4/spreadsheets/${spreadsheetId}/values/Social_Accounts!I2:I3?valueInputOption=USER_ENTERED`,
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${googleToken}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Updated Social_Accounts tokens:', JSON.parse(body));
  });
});

req.on('error', (e) => {
  console.error('Error updating social accounts:', e);
});

req.write(postData);
req.end();
