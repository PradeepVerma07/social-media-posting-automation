const https = require('http');

const data = JSON.stringify({
  brandId: 1,
  title: "Test Calendar Sync Direct",
  masterCaption: "Scheduled directly from frontend calendar! 🪴✨ #PlantLovers",
  scheduledAt: "2026-10-25T00:30:00.000Z",
  platforms: [{ platform: "facebook" }]
});

const req = https.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/v1/posts',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log('POST Response:', res.statusCode, body));
});

req.on('error', console.error);
req.write(data);
req.end();
