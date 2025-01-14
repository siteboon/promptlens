/**
 * Migration: Add Templates
 * Version: 2
 * Description: Adds tables for system and user prompt templates
 */

import { Database } from 'better-sqlite3';

export function up(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS prompt_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('system', 'user')),
      content TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, name, type)
    );
  `);
}

export function down(db: Database): void {
  db.exec('DROP TABLE IF EXISTS prompt_templates;');
} 