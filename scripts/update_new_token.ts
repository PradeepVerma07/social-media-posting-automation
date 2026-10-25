import { db } from '../server/src/db/sqlite.js';
import { encryptToken, decryptToken } from '../server/src/crypto/tokenVault.js';

const pageToken = 'EAGVJejn6LZAgBSZCfE0KFSG3ZBBqJxqCNnYJwtLRmZA7CIaiAZAguA4bsICyCoSMGoqecVE9apoaCs4mIa5hwspW6aR8YgbzMZB1FNSWJZABZADAby6BfZAdSnAZCq53MZBiVR08v7aZCSJAMYPZCSg8xnoylbkuA5GJxZC2FM8Cbfl4OaAJFxbDGgu1BcrTYyqtZCSPmTe8BoXqMIPc4dyzDl5iAr3lfikjh4sxyjN2YQLV8QZD';
const now = new Date().toISOString();

// Encrypt for Facebook Page ACC-001
const encFb = encryptToken(pageToken);
db.prepare(`
  UPDATE social_accounts
  SET token_ciphertext = ?, token_iv = ?, token_tag = ?, token_version = ?,
      account_name = 'Flower plant', account_handle = '@flowerplant',
      external_id = '1454740611044963', status = 'active', last_checked_at = ?, updated_at = ?
  WHERE account_id = 'ACC-001'
`).run(encFb.ciphertext, encFb.iv, encFb.tag, encFb.version, now, now);

// Encrypt for Instagram Business Account ACC-002
const encIg = encryptToken(pageToken);
db.prepare(`
  UPDATE social_accounts
  SET token_ciphertext = ?, token_iv = ?, token_tag = ?, token_version = ?,
      account_name = 'Flower plant (Instagram)', account_handle = '@ciflow904',
      external_id = '17841439037630316', status = 'active', last_checked_at = ?, updated_at = ?
  WHERE account_id = 'ACC-002'
`).run(encIg.ciphertext, encIg.iv, encIg.tag, encIg.version, now, now);

console.log('Successfully updated database with the new Meta access token!');
