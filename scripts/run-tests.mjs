import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
const tests = readdirSync('server/test').filter(file => file.endsWith('.test.ts')).map(file => `server/test/${file}`);
const result = spawnSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', '--test', ...tests], {
  stdio: 'inherit', env: { ...process.env, NODE_ENV: 'test', DATABASE_URL: ':memory:', ENABLE_DEMO_DATA: 'false', ENABLE_BACKGROUND_WORKERS: 'false', ENABLE_MYSQL_SYNC: 'false', GEMINI_API_KEY: '', GOOGLE_API_KEY: '', SUPER_ADMIN_EMAIL: '', SUPER_ADMIN_PASSWORD: '' },
});
process.exit(result.status ?? 1);
