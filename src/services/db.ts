import Database from 'better-sqlite3'
import { encrypt, decrypt } from '../utils/encryption'

// Initialize database
const db = new Database('promptlens.db')

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS comparisons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    system_prompt TEXT,
    user_prompt TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    comparison_id INTEGER,
    model_id TEXT NOT NULL,
    response TEXT NOT NULL,
    tokens_used INTEGER,
    duration_ms INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (comparison_id) REFERENCES comparisons(id)
  );

  CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    system_prompt TEXT,
    user_prompt TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider TEXT NOT NULL UNIQUE,
    encrypted_key TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`)

// Prepare statements
const insertComparison = db.prepare(`
  INSERT INTO comparisons (system_prompt, user_prompt)
  VALUES (?, ?)
`)

const insertResponse = db.prepare(`
  INSERT INTO responses (comparison_id, model_id, response, tokens_used, duration_ms)
  VALUES (?, ?, ?, ?, ?)
`)

const getRecentComparisons = db.prepare(`
  SELECT 
    c.*,
    json_group_array(
      json_object(
        'model_id', r.model_id,
        'response', r.response,
        'tokens_used', r.tokens_used,
        'duration_ms', r.duration_ms
      )
    ) as responses
  FROM comparisons c
  LEFT JOIN responses r ON c.id = r.comparison_id
  GROUP BY c.id
  ORDER BY c.created_at DESC
  LIMIT ?
`)

const saveTemplate = db.prepare(`
  INSERT INTO templates (name, system_prompt, user_prompt)
  VALUES (?, ?, ?)
`)

const getTemplates = db.prepare(`
  SELECT * FROM templates
  ORDER BY created_at DESC
`)

// New prepared statements for API keys
const upsertApiKey = db.prepare(`
  INSERT INTO api_keys (provider, encrypted_key, updated_at)
  VALUES (?, ?, CURRENT_TIMESTAMP)
  ON CONFLICT(provider) 
  DO UPDATE SET 
    encrypted_key = excluded.encrypted_key,
    updated_at = CURRENT_TIMESTAMP
`)

const getApiKey = db.prepare(`
  SELECT * FROM api_keys WHERE provider = ?
`)

const getAllApiKeysStmt = db.prepare(`
  SELECT * FROM api_keys
`)

export interface ComparisonRow {
  id: number
  system_prompt: string
  user_prompt: string
  created_at: string
  responses: string // JSON string
}

export interface Comparison {
  id: number
  system_prompt: string
  user_prompt: string
  created_at: string
  responses: Array<{
    model_id: string
    response: string
    tokens_used: number
    duration_ms: number
  }>
}

export interface Template {
  id: number
  name: string
  system_prompt: string
  user_prompt: string
  created_at: string
}

export interface ApiKey {
  provider: string
  key: string
  created_at: string
  updated_at: string
}

export function saveComparison(
  systemPrompt: string,
  userPrompt: string,
  responses: Array<{
    modelId: string
    response: string
    tokensUsed: number
    durationMs: number
  }>
): number {
  const { lastInsertRowid } = insertComparison.run(systemPrompt, userPrompt)
  const comparisonId = Number(lastInsertRowid)

  for (const response of responses) {
    insertResponse.run(
      comparisonId,
      response.modelId,
      response.response,
      response.tokensUsed,
      response.durationMs
    )
  }

  return comparisonId
}

export function getComparisons(limit = 10): Comparison[] {
  const rows = getRecentComparisons.all(limit) as ComparisonRow[]
  return rows.map(row => ({
    ...row,
    responses: JSON.parse(row.responses)
  }))
}

export function createTemplate(
  name: string,
  systemPrompt: string,
  userPrompt: string
): number {
  const { lastInsertRowid } = saveTemplate.run(name, systemPrompt, userPrompt)
  return Number(lastInsertRowid)
}

export function getAllTemplates(): Template[] {
  return getTemplates.all() as Template[]
}

export function saveApiKey(provider: string, key: string): void {
  const encryptedKey = encrypt(key)
  upsertApiKey.run(provider, encryptedKey)
}

export function getDecryptedApiKey(provider: string): string | null {
  const result = getApiKey.get(provider) as { encrypted_key: string } | undefined
  if (!result) return null
  return decrypt(result.encrypted_key)
}

export function getAllApiKeys(): Array<{ provider: string, created_at: string, updated_at: string }> {
  return getAllApiKeysStmt.all() as Array<{ provider: string, created_at: string, updated_at: string }>
}

// Export the database instance for direct access if needed
export default db 