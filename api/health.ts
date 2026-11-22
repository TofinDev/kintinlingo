import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureSchema, getPool, isDbConfigured } from './_db.js';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  if (!isDbConfigured()) {
    return res.status(200).json({
      ok: false,
      configured: false,
      message: 'MYSQL_USER / MYSQL_PASSWORD environment variables are not set yet.',
    });
  }

  try {
    await ensureSchema();
    const db = getPool();
    await db.query('SELECT 1');
    return res.status(200).json({
      ok: true,
      configured: true,
      host: process.env.MYSQL_HOST || '203.170.190.149',
      database: process.env.MYSQL_DATABASE || 'kintin_lingo',
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      configured: true,
      error: err instanceof Error ? err.message : 'Database connection failed',
    });
  }
}
