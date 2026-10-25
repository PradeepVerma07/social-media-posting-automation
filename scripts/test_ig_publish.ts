import { db } from '../server/src/db/sqlite.js';
import { decryptToken } from '../server/src/crypto/tokenVault.js';

async function testIgPublish() {
  const accIg = db.prepare('SELECT * FROM social_accounts WHERE account_id = ?').get('ACC-002') as any;
  const token = decryptToken({
    ciphertext: accIg.token_ciphertext,
    iv: accIg.token_iv,
    tag: accIg.token_tag,
    version: accIg.token_version
  });

  const igUserId = accIg.external_id; // '17841439037630316'
  const message = 'Test publish from CI360 Orchestrator at ' + new Date().toISOString();
  const imageUrl = 'https://images.unsplash.com/photo-1546842931-886c185b4c8c?w=800';

  console.log('1. Creating IG media container for user:', igUserId);
  const containerRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_url: imageUrl,
      caption: message,
      access_token: token
    })
  });

  const containerData = await containerRes.json();
  console.log('Container result:', JSON.stringify(containerData, null, 2));

  if (containerData.id) {
    console.log('2. Publishing IG container:', containerData.id);
    const pubRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: containerData.id,
        access_token: token
      })
    });
    const pubData = await pubRes.json();
    console.log('Instagram Publish Result:', JSON.stringify(pubData, null, 2));
  }
}

testIgPublish().catch(console.error);
