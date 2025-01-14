/**
 * Migration: Initial Schema
 * Version: 1
 * Description: Creates the initial database schema for PromptLens
 */

import { Database } from 'better-sqlite3';
import { defaultModels } from '../config/models.js';

export function up(db: Database): void {
  // Debug logging for environment variables
  console.log('Migration 1 - Environment:', {
    OPENAI_KEY_EXISTS: !!process.env.OPENAI_KEY,
    ANTHROPIC_KEY_EXISTS: !!process.env.ANTHROPIC_KEY
  });

  // Create api_keys table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL,
      api_key TEXT NOT NULL,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(provider, user_id)
    )
  `).run();

  // Insert API keys if they exist
  if (process.env.OPENAI_KEY) {
    db.prepare('INSERT OR REPLACE INTO api_keys (provider, api_key, user_id) VALUES (?, ?, ?)').run(
      'openai',
      process.env.OPENAI_KEY,
      1
    );
  }

  if (process.env.ANTHROPIC_KEY) {
    db.prepare('INSERT OR REPLACE INTO api_keys (provider, api_key, user_id) VALUES (?, ?, ?)').run(
      'anthropic',
      process.env.ANTHROPIC_KEY,
      1
    );
  }

  // Create chat_history table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS chat_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      system_prompt TEXT NOT NULL,
      user_prompt TEXT NOT NULL,
      responses TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // Create model_favorites table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS model_favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      model_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, model_id)
    )
  `).run();

  // Create models table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS models (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      provider TEXT NOT NULL,
      multilingual INTEGER NOT NULL,
      vision INTEGER NOT NULL,
      message_batches INTEGER NOT NULL,
      context_window INTEGER NOT NULL,
      max_output_tokens INTEGER NOT NULL,
      input_cost_per_1m REAL NOT NULL,
      output_cost_per_1m REAL NOT NULL,
      latency TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // Insert initial models
  const insertModel = db.prepare(`
    INSERT INTO models (
      id, name, provider, multilingual, vision, message_batches,
      context_window, max_output_tokens, input_cost_per_1m,
      output_cost_per_1m, latency
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const model of defaultModels) {
    // Convert boolean values to integers
    const multilingual = model.multilingual ? 1 : 0;
    const vision = model.vision ? 1 : 0;
    const message_batches = model.message_batches ? 1 : 0;

    insertModel.run(
      model.id,
      model.name,
      model.provider,
      multilingual,
      vision, 
      message_batches,
      model.context_window,
      model.max_output_tokens,
      model.input_cost_per_1m,
      model.output_cost_per_1m,
      model.latency
    );
  }
}

export function down(db: Database): void {
  db.prepare('DROP TABLE IF EXISTS api_keys').run();
  db.prepare('DROP TABLE IF EXISTS chat_history').run();
  db.prepare('DROP TABLE IF EXISTS model_favorites').run();
  db.prepare('DROP TABLE IF EXISTS models').run();
} 