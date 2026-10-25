import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { logger } from '../logging/logger';

export interface MySQLConfig {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
  ssl?: any;
}

let pool: mysql.Pool | null = null;

export function getMySQLConfig(): MySQLConfig | null {
  const host = process.env.MYSQL_HOST || process.env.DB_HOST;
  const user = process.env.MYSQL_USER || process.env.DB_USER;
  const database = process.env.MYSQL_DATABASE || process.env.DB_NAME;
  const password = process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || '';
  const port = Number(process.env.MYSQL_PORT || process.env.DB_PORT) || 3306;

  if (!host || !user || !database) {
    return null;
  }

  return {
    host,
    port,
    user,
    password,
    database,
    ssl: process.env.MYSQL_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  };
}

export function isMySQLConfigured(): boolean {
  return getMySQLConfig() !== null;
}

export async function getMySQLPool(): Promise<mysql.Pool | null> {
  const config = getMySQLConfig();
  if (!config) return null;

  if (!pool) {
    pool = mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: 'utf8mb4',
      ssl: config.ssl,
      multipleStatements: true,
    });
    logger.info(`[MySQL] Connection pool initialized for database '${config.database}' at ${config.host}:${config.port}`);
  }

  return pool;
}

export async function testMySQLConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    const p = await getMySQLPool();
    if (!p) {
      return { ok: false, message: 'MySQL configuration is missing (DB_HOST, DB_USER, DB_NAME)' };
    }
    const [rows] = await p.query('SELECT 1 as connected');
    return { ok: true, message: 'Successfully connected to Hostinger MySQL' };
  } catch (err: any) {
    logger.error({ err }, '[MySQL] Health check failed:');
    return { ok: false, message: err.message || 'MySQL connection error' };
  }
}

/**
 * Initializes MySQL schema if tables do not exist
 */
export async function initMySQLSchema(): Promise<void> {
  const p = await getMySQLPool();
  if (!p) return;

  try {
    const schemaFile = path.resolve(process.cwd(), 'database', 'schema.mysql.sql');
    if (fs.existsSync(schemaFile)) {
      const sql = fs.readFileSync(schemaFile, 'utf8');
      logger.info(`[MySQL] Applying full database/schema.mysql.sql via multipleStatements...`);
      await p.query(sql);
      logger.info('[MySQL] Schema verification and initialization complete.');
    }
  } catch (err: any) {
    logger.error({ err }, '[MySQL] Failed to initialize MySQL schema:');
  }
}
