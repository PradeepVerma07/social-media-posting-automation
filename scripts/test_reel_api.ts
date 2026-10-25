import { db } from '../server/src/db/sqlite';
import { decryptToken } from '../server/src/crypto/tokenVault';

async function testReel() {
  const acc = db.prepare("SELECT * FROM social_accounts WHERE platform = 'instagram'").get() as any;
  const token = decryptToken({
    ciphertext: acc.token_ciphertext,
    iv: acc.token_iv,
    tag: acc.token_tag,
    version: acc.token_version
  });

  const videoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';

  console.log('Testing IG Reel creation for account:', acc.external_id);
  const reelRes = await fetch(`https://graph.facebook.com/v21.0/${acc.external_id}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      video_url: videoUrl,
      media_type: 'REELS',
      caption: 'Testing botanical reel! 🌿✨ #plants',
      share_to_feed: true,
      access_token: token
    })
  });
  console.log('Reel container status:', reelRes.status);
  const reelData = await reelRes.json();
  console.log('Reel container response:', reelData);
}

testReel().catch(console.error);
