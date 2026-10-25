import bcrypt from 'bcryptjs';
import { DatabaseSync } from 'node:sqlite';

const dbPath = 'C:/Users/prade/.n8n/database.sqlite';
const newPassword = process.argv[2] || 'Admin@123';
const email = process.argv[3] || 'pradeepofficial8795@gmail.com';

const db = new DatabaseSync(dbPath);

const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync(newPassword, salt);

const res = db.prepare(`
  UPDATE user
  SET password = ?,
      mfaEnabled = 0,
      disabled = 0
  WHERE email = ?
`).run(hash, email);

console.log(`Password reset successfully for ${email}!`);
console.log(`New password: ${newPassword}`);
console.log(`Changes:`, res.changes);

// Verify comparison
const user = db.prepare(`SELECT email, password, mfaEnabled FROM user WHERE email = ?`).get(email) as any;
const matches = bcrypt.compareSync(newPassword, user.password);
console.log(`Verification: password match = ${matches}`);
