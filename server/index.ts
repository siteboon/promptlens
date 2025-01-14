import express from 'express'
import cors from 'cors'
import Database from 'better-sqlite3'
import { join } from 'path'

const app = express()
const port = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

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

// API Routes
app.get('/api/comparisons', (req, res) => {
  const limit = Number(req.query.limit) || 10
  const rows = getRecentComparisons.all(limit)
  const comparisons = rows.map(row => ({
    ...row,
    responses: JSON.parse(row.responses)
  }))
  res.json(comparisons)
})

app.post('/api/comparisons', (req, res) => {
  const { systemPrompt, userPrompt, responses } = req.body

  try {
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

    res.json({ id: comparisonId })
  } catch (error) {
    console.error('Error saving comparison:', error)
    res.status(500).json({ error: 'Failed to save comparison' })
  }
})

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
}) 