import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;
let initialized = false;

export function isDbConfigured(): boolean {
  return Boolean(process.env.MYSQL_USER && process.env.MYSQL_PASSWORD);
}

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST || '203.170.190.149',
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE || 'kintin_lingo',
      waitForConnections: true,
      connectionLimit: 5,
      connectTimeout: 8000,
    });
  }
  return pool;
}

export async function ensureSchema(): Promise<void> {
  if (initialized) return;
  const db = getPool();

  await db.query(`
    CREATE TABLE IF NOT EXISTS players (
      id VARCHAR(64) PRIMARY KEY,
      friend_code VARCHAR(16) NOT NULL,
      name VARCHAR(64) NOT NULL,
      avatar MEDIUMTEXT NOT NULL,
      pin VARCHAR(16) NULL,
      selected_grade VARCHAR(8) NOT NULL DEFAULT 'k1',
      stars INT NOT NULL DEFAULT 0,
      completed_lessons_json LONGTEXT NOT NULL,
      learned_words_json LONGTEXT NOT NULL,
      wrong_words_json LONGTEXT NOT NULL,
      last_seen DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS friendships (
      player_id VARCHAR(64) NOT NULL,
      friend_id VARCHAR(64) NOT NULL,
      friend_code VARCHAR(16) NOT NULL,
      friend_name VARCHAR(64) NOT NULL,
      friend_avatar MEDIUMTEXT NOT NULL,
      friend_grade VARCHAR(8) NOT NULL DEFAULT 'k1',
      friend_stars INT NOT NULL DEFAULT 0,
      added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (player_id, friend_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  initialized = true;
}
