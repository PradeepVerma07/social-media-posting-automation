const fs = require('fs');
const https = require('https');

const tokenData = JSON.parse(fs.readFileSync('scripts/google_token.json', 'utf8'));
const accessToken = tokenData.access_token;
const spreadsheetId = '1t4TsrPeKjI5FKM5u1oByldtfhpzDN_iRm1mD7zOr31A';

// Append row for POST-004 scheduled at 00:10 on 2026-10-25
const row = [
  "POST-004",                                  // post_id
  "CL-001",                                    // client_id
  "BR-001",                                    // brand_id
  "Flower Plant",                              // brand_name
  "facebook",                                  // platform
  "1454740611044963",                          // social_media_id
  "Demo Post Loop Test 00:10",                 // post_title
  "🌿 Midnight Botanical Blossom! Testing automated multi-platform publishing engine. ✨🪴 #IndoorPlants #PlantCare #HomeDecor", // caption
  "#FlowerPlant #UrbanJungle",                 // hashtags
  "image",                                     // media_type
  "https://images.unsplash.com/photo-1545241047-6083a3684587?auto=format&fit=crop&w=1200&q=80", // media_url(s)
  "",                                          // link_url
  "2026-10-25",                                // schedule_date
  "00:10:00",                                  // schedule_time
  "Asia/Kolkata",                              // timezone
  "",                                          // scheduled_utc
  "Scheduled",                                 // status
  "0",                                         // attempt_count
  "",                                          // last_attempt_at
  "",                                          // posted_at
  "",                                          // platform_post_id
  "",                                          // post_url
  "",                                          // error_code
  "",                                          // error_message
  "",                                          // locked_by_execution
  new Date().toISOString()                     // updated_at
];

const postData = JSON.stringify({
  values: [row]
});

const options = {
  hostname: 'sheets.googleapis.com',
  path: `/v4/spreadsheets/${spreadsheetId}/values/Posts!A:Z:append?valueInputOption=USER_ENTERED`,
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Status code:', res.statusCode);
    console.log('Response:', body);
  });
});

req.on('error', (e) => console.error('Error:', e));
req.write(postData);
req.end();
