import { db } from '../server/src/db/sqlite.js';
import { decryptToken } from '../server/src/crypto/tokenVault.js';

async function run() {
  const accFb = db.prepare('SELECT * FROM social_accounts WHERE account_id = ?').get('ACC-001') as any;
  const token = decryptToken({
    ciphertext: accFb.token_ciphertext,
    iv: accFb.token_iv,
    tag: accFb.token_tag,
    version: accFb.token_version
  });

  console.log('Decrypted FB token length:', token.length);
  const fbRes = await fetch(`https://graph.facebook.com/v21.0/${accFb.external_id}?fields=id,name&access_token=${token}`);
  const fbData = await fbRes.json();
  console.log('Facebook Page verified:', JSON.stringify(fbData));

  const accIg = db.prepare('SELECT * FROM social_accounts WHERE account_id = ?').get('ACC-002') as any;
  const igRes = await fetch(`https://graph.facebook.com/v21.0/${accIg.external_id}?fields=id,username&access_token=${token}`);
  const igData = await igRes.json();
  console.log('Instagram Account verified:', JSON.stringify(igData));
}

run().catch(console.error);
