import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import dotenv from 'dotenv'

// Load environment variables first, before any other imports
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '../..')

// Always load .env file if it exists, regardless of environment
dotenv.config({ path: join(rootDir, '.env') })

import express, { Request, Response, RequestHandler } from 'express'
import cors from 'cors'
import Database from 'better-sqlite3'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { MigrationManager } from './migrations/index.js'
import { envConfig } from './config/env.js'

// Log environment state
console.log('Server Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  STATIC_DIR: process.env.STATIC_DIR,
  OPENAI_KEY: process.env.OPENAI_KEY?.substring(0, 5) + '...',
  ANTHROPIC_KEY: process.env.ANTHROPIC_KEY?.substring(0, 5) + '...'
});

interface User {
  id: number;
}

interface ApiKeyRow {
  api_key: string;
}

interface ModelFavorite {
  model_id: string;
}

interface ComparisonRow {
  id: number;
  system_prompt: string;
  user_prompt: string;
  created_at: string;
  responses: string;
}

interface ComparisonResponse {
  modelId: string;
  response: string;
  tokensUsed: number;
  durationMs: number;
}

interface SaveComparisonRequest {
  systemPrompt: string;
  userPrompt: string;
  responses: ComparisonResponse[];
}

interface ModelRow {
  id: string;
  name: string;
  provider: string;
  multilingual: boolean;
  vision: boolean;
  message_batches: boolean;
  context_window: number;
  max_output_tokens: number;
  input_cost_per_1m: number;
  output_cost_per_1m: number;
  latency: string;
}

interface AuthenticatedRequest<P = {}, ResBody = any, ReqBody = any> extends Request<P, ResBody, ReqBody> {
  user?: User;
}

interface ModelIdParams {
  modelId: string;
}

interface ApiKeyRequest {
  provider: string;
  apiKey: string;
}

async function initializeServer() {
  const app = express()
  const port = envConfig.PORT

  // Middleware
  app.use(cors())
  app.use(express.json())

  console.log('Initializing database connection...');
  const db = new Database(join(__dirname, '../../promptlens.db'))

  // Initialize and run migrations first
  console.log('Running migrations...');
  const migrationManager = new MigrationManager(db)
  try {
    await migrationManager.initialize()
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }

  console.log('Preparing database statements...');
  try {
    // Now prepare all statements after migrations are complete
    const getApiKey = db.prepare<[string], ApiKeyRow>('SELECT api_key FROM api_keys WHERE provider = ? AND user_id = 1');
    const insertApiKey = db.prepare('INSERT OR REPLACE INTO api_keys (provider, api_key, user_id) VALUES (?, ?, 1)');

    const getModelById = db.prepare('SELECT * FROM models WHERE id = ?');
    const getAllModels = db.prepare('SELECT * FROM models ORDER BY CASE provider WHEN \'openai\' THEN 1 WHEN \'anthropic\' THEN 2 ELSE 3 END, input_cost_per_1m DESC');

    const insertComparison = db.prepare(`
      INSERT INTO chat_history (system_prompt, user_prompt, responses, user_id)
      VALUES (?, ?, ?, 1)
    `);

    const getRecentComparisons = db.prepare(`
      SELECT * FROM chat_history 
      WHERE user_id = 1 
      ORDER BY created_at DESC 
      LIMIT ?
    `);

    const getFavorites = db.prepare<[], ModelFavorite>('SELECT model_id FROM model_favorites WHERE user_id = 1');
    const addFavorite = db.prepare('INSERT OR IGNORE INTO model_favorites (user_id, model_id) VALUES (1, ?)');
    const removeFavorite = db.prepare('DELETE FROM model_favorites WHERE user_id = 1 AND model_id = ?');

    const getTemplates = db.prepare(`
      SELECT * FROM prompt_templates 
      WHERE user_id = 1 AND type = ?
      ORDER BY created_at DESC
    `);

    const getTemplateByName = db.prepare(`
      SELECT * FROM prompt_templates 
      WHERE user_id = 1 AND type = ? AND name = ?
    `);

    const insertTemplate = db.prepare(`
      INSERT INTO prompt_templates (name, type, content, description, user_id)
      VALUES (?, ?, ?, ?, 1)
    `);

    const deleteTemplate = db.prepare(`
      DELETE FROM prompt_templates 
      WHERE user_id = 1 AND type = ? AND name = ?
    `);
    console.log('Database statements prepared successfully');

    // API Routes - all routes must use /api prefix
    app.get('/api/models', (req: Request, res: Response) => {
      try {
        const models = getAllModels.all() as ModelRow[];
        const favorites = (getFavorites.all() as ModelFavorite[]).map(f => f.model_id);
        
        const modelsWithFavorites = models.map(model => ({
          ...model,
          isFavorite: favorites.includes(model.id)
        }));
        
        res.json(modelsWithFavorites);
      } catch (error) {
        console.error('Error fetching models:', error);
        res.status(500).json({ error: 'Failed to fetch models' });
      }
    });

    app.get('/api/comparisons', (req: Request, res: Response) => {
      const limit = Number(req.query.limit) || 10;
      const rows = getRecentComparisons.all(limit) as ComparisonRow[];
      const comparisons = rows.map(row => ({
        ...row,
        responses: JSON.parse(row.responses)
      }));
      res.json(comparisons);
    });

    app.post('/api/comparisons', (req: Request<{}, {}, SaveComparisonRequest>, res: Response) => {
      const { systemPrompt, userPrompt, responses } = req.body;
      try {
        const { lastInsertRowid } = insertComparison.run(
          systemPrompt, 
          userPrompt,
          JSON.stringify(responses)
        );
        res.json({ id: lastInsertRowid });
      } catch (error) {
        console.error('Error saving comparison:', error);
        res.status(500).json({ error: 'Failed to save comparison' });
      }
    });

    app.get('/api/favorites', (req: Request, res: Response) => {
      try {
        const favorites = (getFavorites.all() as ModelFavorite[]).map(f => f.model_id);
        res.json(favorites);
      } catch (error) {
        console.error('Error fetching favorites:', error);
        res.status(500).json({ error: 'Failed to fetch favorites' });
      }
    });

    app.post('/api/favorites/:modelId', (req: Request<ModelIdParams>, res: Response) => {
      const { modelId } = req.params;
      try {
        addFavorite.run(modelId);
        res.json({ success: true });
      } catch (error) {
        console.error('Error adding favorite:', error);
        res.status(500).json({ error: 'Failed to add favorite' });
      }
    });

    app.delete('/api/favorites/:modelId', (req: Request<ModelIdParams>, res: Response) => {
      const { modelId } = req.params;
      try {
        removeFavorite.run(modelId);
        res.json({ success: true });
      } catch (error) {
        console.error('Error removing favorite:', error);
        res.status(500).json({ error: 'Failed to remove favorite' });
      }
    });

    // API key routes
    app.get('/api/keys/info', (req: Request, res: Response) => {
      try {
        const providers = ['openai', 'anthropic'];
        const keyInfo = providers.map(provider => {
          const result = getApiKey.get(provider);
          return {
            provider,
            exists: !!result?.api_key
          };
        });
        res.json(keyInfo);
      } catch (error) {
        console.error('Error fetching API key info:', error);
        res.status(500).json({ error: 'Failed to fetch API key info' });
      }
    });

    app.post('/api/keys', (req: Request<{}, {}, ApiKeyRequest>, res: Response) => {
      const { provider, apiKey } = req.body;
      try {
        insertApiKey.run(provider, apiKey);
        res.json({ success: true });
      } catch (error) {
        console.error('Error saving API key:', error);
        res.status(500).json({ error: 'Failed to save API key' });
      }
    });

    app.get('/api/keys/:provider', (req: Request<{ provider: string }>, res: Response) => {
      const { provider } = req.params;
      try {
        const result = getApiKey.get(provider);
        res.json({ apiKey: result?.api_key });
      } catch (error) {
        console.error('Error fetching API key:', error);
        res.status(500).json({ error: 'Failed to fetch API key' });
      }
    });

    // Template routes
    app.get('/api/templates/:type', (req: Request, res: Response) => {
      const { type } = req.params;
      
      if (type !== 'system' && type !== 'user') {
        return res.status(400).json({ error: 'Invalid template type' });
      }

      try {
        const templates = getTemplates.all(type);
        res.json(templates);
      } catch (error) {
        console.error('Error fetching templates:', error);
        res.status(500).json({ error: 'Failed to fetch templates' });
      }
    });

    app.post('/api/templates', (req: Request, res: Response) => {
      const { name, type, content, description } = req.body;
      
      if (!name || !type || !content) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      if (type !== 'system' && type !== 'user') {
        return res.status(400).json({ error: 'Invalid template type' });
      }

      try {
        const existing = getTemplateByName.get(type, name);
        if (existing) {
          return res.status(409).json({ error: 'Template with this name already exists' });
        }

        const result = insertTemplate.run(name, type, content, description || null);
        res.json({ id: result.lastInsertRowid });
      } catch (error) {
        console.error('Error saving template:', error);
        res.status(500).json({ error: 'Failed to save template' });
      }
    });

    app.delete('/api/templates/:type/:name', (req: Request, res: Response) => {
      const { type, name } = req.params;
      
      if (type !== 'system' && type !== 'user') {
        return res.status(400).json({ error: 'Invalid template type' });
      }

      try {
        deleteTemplate.run(type, name);
        res.json({ success: true });
      } catch (error) {
        console.error('Error deleting template:', error);
        res.status(500).json({ error: 'Failed to delete template' });
      }
    });

    // Unified completion endpoint for all LLM providers
    app.post('/api/completions', async (req, res) => {
      const { model, messages, temperature } = req.body;

      try {
        // Get model configuration first
        const modelConfig = getModelById.get(model) as ModelRow;
        if (!modelConfig) {
          throw new Error(`Model ${model} not found in database`);
        }

        // Get API key for the model's provider
        const apiKeyRow = getApiKey.get(modelConfig.provider);
        if (!apiKeyRow?.api_key) {
          throw new Error(`${modelConfig.provider} API key not found in database`);
        }
        const apiKey = apiKeyRow.api_key;

        const startTime = Date.now();
        let totalTokens = 0;
        let responseTokens = 0;
        let fullResponse = '';
        
        switch (modelConfig.provider) {
          case 'openai': {
            const openai = new OpenAI({
              apiKey: apiKey,
            });

            try {
              // First attempt with streaming
              const stream = await openai.chat.completions.create({
                model,
                messages,
                temperature: temperature ?? 0.7,
                max_completion_tokens: modelConfig.max_output_tokens,
                stream: true,
              });

              res.setHeader('Content-Type', 'text/event-stream');
              res.setHeader('Cache-Control', 'no-cache');
              res.setHeader('Connection', 'keep-alive');

              for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content || '';
                if (content) {
                  fullResponse += content;
                  res.write(`data: ${JSON.stringify({ 
                    content,
                    fullResponse,
                    responseTimeMs: Date.now() - startTime
                  })}\n\n`);
                }
              }

              // Get final token counts and cost for OpenAI
              const finalResponse = await openai.chat.completions.create({
                model,
                messages,
                temperature: temperature ?? 0.7,
                max_completion_tokens: modelConfig.max_output_tokens,
              });

              // OpenAI cost calculation
              totalTokens = finalResponse.usage?.total_tokens || 0;
              responseTokens = finalResponse.usage?.completion_tokens || 0;
              const promptTokens = finalResponse.usage?.prompt_tokens || 0;

              console.log('OpenAI Cost Calculation:', {
                promptTokens,
                completionTokens: responseTokens,
                inputCostPerMillion: modelConfig.input_cost_per_1m,
                outputCostPerMillion: modelConfig.output_cost_per_1m,
                rawInputCost: (promptTokens * modelConfig.input_cost_per_1m) / 1_000_000,
                rawOutputCost: (responseTokens * modelConfig.output_cost_per_1m) / 1_000_000,
                totalCost: (
                  (promptTokens * modelConfig.input_cost_per_1m + responseTokens * modelConfig.output_cost_per_1m)
                ) / 1_000_000
              });

              const cost = (
                (promptTokens * modelConfig.input_cost_per_1m + responseTokens * modelConfig.output_cost_per_1m)
              ) / 1_000_000;

              res.write(`data: ${JSON.stringify({ 
                content: '',
                fullResponse,
                totalTokens,
                cost,
                responseTimeMs: Date.now() - startTime,
                done: true
              })}\n\n`);
              res.end();

            } catch (error) {
              // Check if error is a not_found_error
              const errorObj = error as any;
              console.log('OpenAI Error:', JSON.stringify(errorObj, null, 2));
              
              // Parse error message if it's a string containing JSON
              let parsedError = errorObj;
              if (typeof errorObj?.message === 'string' && errorObj.message.includes('{')) {
                try {
                  // Extract the JSON part from the message
                  const jsonMatch = errorObj.message.match(/{.*}/);
                  if (jsonMatch) {
                    parsedError = JSON.parse(jsonMatch[0]);
                  }
                } catch (e) {
                  console.error('Error parsing error message:', e);
                }
              }

              const isNotFoundError = 
                errorObj?.error?.type === 'not_found_error' || // Direct error object
                parsedError?.error?.type === 'not_found_error' || // Parsed from message
                (typeof errorObj?.message === 'string' && 
                 (errorObj.message.includes('"type":"not_found_error"') ||
                  errorObj.message.includes('does not exist')));
              
              if (isNotFoundError) {
                console.log('Model not found, falling back to non-streaming mode');
                
                // Fallback to non-streaming mode
                const finalResponse = await openai.chat.completions.create({
                  model,
                  messages,
                  temperature: temperature ?? 0.7,
                  max_completion_tokens: modelConfig.max_output_tokens,
                  stream: false,
                });

                // Calculate metrics
                totalTokens = finalResponse.usage?.total_tokens || 0;
                responseTokens = finalResponse.usage?.completion_tokens || 0;
                const promptTokens = finalResponse.usage?.prompt_tokens || 0;
                fullResponse = finalResponse.choices[0]?.message?.content || '';

                const cost = (
                  (promptTokens * modelConfig.input_cost_per_1m + responseTokens * modelConfig.output_cost_per_1m)
                ) / 1_000_000;

                // Send single response with all data
                res.json({ 
                  content: fullResponse,
                  fullResponse,
                  totalTokens,
                  cost,
                  responseTimeMs: Date.now() - startTime,
                  done: true
                });
              } else {
                // For all other errors, throw them to be caught by the outer try-catch
                throw error;
              }
            }
            break;
          }
          
          case 'anthropic': {
            const anthropic = new Anthropic({
              apiKey: apiKey,
            });

            // Extract system prompt and user messages
            const systemPrompt = messages.find((m: { role: string; content: string }) => m.role === 'system')?.content;
            const userMessages = messages.filter((m: { role: string; content: string }) => m.role !== 'system');

            const stream = await anthropic.messages.create({
              model,
              system: systemPrompt,
              messages: userMessages.map((m: { role: string; content: string }) => ({
                role: m.role,
                content: m.content
              })),
              temperature: temperature ?? 0.7,
              max_tokens: modelConfig.max_output_tokens,
              stream: true,
            });

            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            for await (const chunk of stream) {
              if (chunk.type === 'content_block_delta' && 'text' in chunk.delta) {
                fullResponse += chunk.delta.text;
                res.write(`data: ${JSON.stringify({ 
                  content: chunk.delta.text,
                  fullResponse,
                  responseTimeMs: Date.now() - startTime
                })}\n\n`);
              }
            }

            // Get final token counts and cost for Anthropic
            const finalResponse = await anthropic.messages.create({
              model,
              system: systemPrompt,
              messages: userMessages.map((m: { role: string; content: string }) => ({
                role: m.role,
                content: m.content
              })),
              temperature: temperature ?? 0.7,
              max_tokens: modelConfig.max_output_tokens,
            });

            // Anthropic cost calculation
            totalTokens = finalResponse.usage.input_tokens + finalResponse.usage.output_tokens;
            responseTokens = finalResponse.usage.output_tokens;
            const inputTokens = finalResponse.usage.input_tokens;

            console.log('Anthropic Cost Calculation:', {
              inputTokens,
              outputTokens: responseTokens,
              inputCostPerMillion: modelConfig.input_cost_per_1m,
              outputCostPerMillion: modelConfig.output_cost_per_1m,
              rawInputCost: (inputTokens * modelConfig.input_cost_per_1m) / 1_000_000,
              rawOutputCost: (responseTokens * modelConfig.output_cost_per_1m) / 1_000_000,
              totalCost: (
                (inputTokens * modelConfig.input_cost_per_1m + responseTokens * modelConfig.output_cost_per_1m)
              ) / 1_000_000
            });

            const cost = (
              (inputTokens * modelConfig.input_cost_per_1m + responseTokens * modelConfig.output_cost_per_1m)
            ) / 1_000_000;

            res.write(`data: ${JSON.stringify({ 
              content: '',
              fullResponse,
              totalTokens,
              cost,
              responseTimeMs: Date.now() - startTime,
              done: true
            })}\n\n`);
            res.end();
            break;
          }

          default:
            throw new Error(`Unsupported provider: ${modelConfig.provider}`);
        }
      } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ 
          error: error instanceof Error ? error.message : 'Unknown error occurred' 
        });
      }
    });

    // Serve static files based on environment
    const staticDir = process.env.STATIC_DIR || (
      process.env.NODE_ENV === 'production' 
        ? join(__dirname, '../dist') 
        : join(__dirname, '../../client/dist')
    );
    console.log('Serving static files from:', staticDir);
    
    // SPA catch-all route - must come LAST
    app.all('/api/*', (req: Request, res: Response) => {
      res.status(404).json({ error: 'API endpoint not found' });
    });

    // Serve static files for non-API routes
    app.use((req: Request, res: Response, next) => {
      if (!req.path.startsWith('/api/')) {
        express.static(staticDir)(req, res, next);
      } else {
        next();
      }
    });

    // Final catch-all for SPA
    app.get('*', (req: Request, res: Response) => {
      if (!req.path.startsWith('/api/')) {
        res.sendFile(join(staticDir, 'index.html'));
      } else {
        res.status(404).json({ error: 'API endpoint not found' });
      }
    });

    app.listen(port, () => {
      console.log(`Server is running on port ${port}`)
    })

  } catch (error) {
    console.error('Error preparing database statements:', error);
    throw error;
  }
}

// Start the server
initializeServer().catch(console.error) 