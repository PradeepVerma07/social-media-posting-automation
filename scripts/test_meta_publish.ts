import { db } from '../server/src/db/sqlite.js';
import { decryptToken } from '../server/src/crypto/tokenVault.js';

async function testFbPublish() {
  const accFb = db.prepare('SELECT * FROM social_accounts WHERE account_id = ?').get('ACC-001') as any;
  const token = decryptToken({
    ciphertext: accFb.token_ciphertext,
    iv: accFb.token_iv,
    tag: accFb.token_tag,
    version: accFb.token_version
  });

  const pageId = accFb.external_id; // '1454740611044963'
  const message = 'Test publish from CI360 Orchestrator at ' + new Date().toISOString();
  const imageUrl = 'https://images.unsplash.com/photo-1546842931-886c185b4c8c?w=800';

  console.log('Publishing photo to Facebook Page:', pageId);
  const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/photos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: imageUrl,
      caption: message,
      access_token: token
    })
  });

  const data = await res.json();
  console.log('Facebook Publish Result:', JSON.stringify(data, null, 2));
}

testFbPublish().catch(console.error);
