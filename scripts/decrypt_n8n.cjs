const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sqlite3 = require(path.join(process.env.APPDATA, 'npm', 'node_modules', 'n8n', 'node_modules', 'sqlite3'));

const homedir = process.env.USERPROFILE || process.env.HOME;
const config = JSON.parse(fs.readFileSync(path.join(homedir, '.n8n', 'config'), 'utf8'));
const encryptionKey = config.encryptionKey;

const db = new sqlite3.Database(path.join(homedir, '.n8n', 'database.sqlite'));

db.get("SELECT data FROM credentials_entity WHERE id = 'kCwnWgNcq5lsTVNX'", (err, row) => {
  if (err || !row) {
    console.error('Error fetching creds:', err);
    process.exit(1);
  }
  
  try {
    // n8n credential decryption
    const [ivHex, cipherHex] = row.data.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const key = crypto.scryptSync(encryptionKey, 'salt', 32);
    // try direct key or cipher
    console.log('iv length:', iv.length, 'cipher length:', cipherHex.length);
  } catch (e) {
    console.error('Decryption parse error:', e);
  }
  db.close();
});
