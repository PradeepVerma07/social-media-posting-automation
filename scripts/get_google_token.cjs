const fs = require('fs');
const path = require('path');
const CryptoJS = require(path.join(process.env.APPDATA, 'npm', 'node_modules', 'n8n', 'node_modules', 'crypto-js'));
const sqlite3 = require(path.join(process.env.APPDATA, 'npm', 'node_modules', 'n8n', 'node_modules', 'sqlite3'));

const homedir = process.env.USERPROFILE || process.env.HOME;
const config = JSON.parse(fs.readFileSync(path.join(homedir, '.n8n', 'config'), 'utf8'));
const encryptionKey = config.encryptionKey;

const db = new sqlite3.Database(path.join(homedir, '.n8n', 'database.sqlite'));

db.get("SELECT data FROM credentials_entity WHERE id = 'kCwnWgNcq5lsTVNX'", (err, row) => {
  if (err || !row) {
    console.error('Error:', err);
    process.exit(1);
  }
  
  const bytes = CryptoJS.AES.decrypt(row.data, encryptionKey);
  const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  console.log('Decrypted keys:', Object.keys(decryptedData));
  if (decryptedData.oauthTokenData) {
    console.log('Access token preview:', decryptedData.oauthTokenData.access_token ? decryptedData.oauthTokenData.access_token.slice(0, 25) : 'none');
    fs.writeFileSync('scripts/google_token.json', JSON.stringify(decryptedData.oauthTokenData, null, 2));
    console.log('Saved token data to scripts/google_token.json');
  }
  db.close();
});
