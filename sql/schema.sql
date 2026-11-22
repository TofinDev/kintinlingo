CREATE DATABASE IF NOT EXISTS kintin_lingo
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE kintin_lingo;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
