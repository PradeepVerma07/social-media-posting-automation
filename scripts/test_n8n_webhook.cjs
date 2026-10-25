const http = require('http');

const data = JSON.stringify({
  action: "schedule_trigger",
  source: "dashboard"
});

const req = http.request({
  hostname: 'localhost',
  port: 5678,
  path: '/webhook/schedule-post',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log('Webhook Response:', res.statusCode, body));
});

req.on('error', console.error);
req.write(data);
req.end();
