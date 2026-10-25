import { db } from '../server/src/db/sqlite.js';
import { encryptToken, decryptToken } from '../server/src/crypto/tokenVault.js';

const userToken = 'EAGVJejn6LZAgBS5ZCZCnsJ1O81S52CzTzAjBOnBhPkxgeFcXpS5EghZBIp7eLK2jnB6BtHiZBvgm3gmG3Y2aY6lZBv3rvVLV0gZCZBKjWPXC3TUM8E9HhVhKhuoZAFllIBdS72uMDOgrPnf9JR7bGhwmsuWB4ZBVnkehO2wIdDjjC8Qqu8XKPPuevhrO8voYiO8aBOsqZCPnAAxXcVGDdA9AQPmcJ3MDAWTXZCf4qlX5';
const pageToken = 'EAGVJejn6LZAgBS1GcZCYgLLLzbta5SvKjjezeXpbgGns8Rh1pRZBRxFvrHLFOI0jibMwxGQQ7qXropjYooKxcMXDu57ZBjcnRCF46LfjMjUPuNGYZB1v0M07K6LgmrFsG1OKVkwZAQfPUxfidXVuuN1YT2jChE1dQOcDltDKbGALEdLVvLln1fjnPOrhKWYseMjRJ5vG4QCGjyJwqI4VdSyMzMJifFdAzw2LKvhcIZD';

async function run() {
  const now = new Date().toISOString();

  // 1. Encrypt for Facebook Page ACC-001
  const encFb = encryptToken(pageToken);
  db.prepare(`
    UPDATE social_accounts
    SET token_ciphertext = ?, token_iv = ?, token_tag = ?, token_version = ?,
        account_name = 'Flower plant', account_handle = '@flowerplant',
        external_id = '1454740611044963', status = 'active', last_checked_at = ?, updated_at = ?
    WHERE account_id = 'ACC-001'
  `).run(encFb.ciphertext, encFb.iv, encFb.tag, encFb.version, now, now);

  // 2. Encrypt for Instagram Business Account ACC-002
  const encIg = encryptToken(pageToken);
  db.prepare(`
    UPDATE social_accounts
    SET token_ciphertext = ?, token_iv = ?, token_tag = ?, token_version = ?,
        account_name = 'Flower plant (Instagram)', account_handle = '@ciflow904',
        external_id = '17841439037630316', status = 'active', last_checked_at = ?, updated_at = ?
    WHERE account_id = 'ACC-002'
  `).run(encIg.ciphertext, encIg.iv, encIg.tag, encIg.version, now, now);

  // 3. Update brand name
  db.prepare(`
    UPDATE brands
    SET brand_name = 'Flower plant', updated_at = ?
    WHERE brand_id = 'BR-001'
  `).run(now);

  console.log('Successfully updated Facebook (ACC-001) and Instagram (ACC-002) with encrypted tokens!');

  // Verify decryption
  const rowFb = db.prepare('SELECT * FROM social_accounts WHERE account_id = ?').get('ACC-001') as any;
  const decFb = decryptToken({
    ciphertext: rowFb.token_ciphertext,
    iv: rowFb.token_iv,
    tag: rowFb.token_tag,
    version: rowFb.token_version
  });
  console.log('Verified Facebook token decrypted matches:', decFb === pageToken);

  const rowIg = db.prepare('SELECT * FROM social_accounts WHERE account_id = ?').get('ACC-002') as any;
  const decIg = decryptToken({
    ciphertext: rowIg.token_ciphertext,
    iv: rowIg.token_iv,
    tag: rowIg.token_tag,
    version: rowIg.token_version
  });
  console.log('Verified Instagram token decrypted matches:', decIg === pageToken);
}

run().catch(console.error);
