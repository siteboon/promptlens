# PromptLens API Documentation

## Base URL

Development:
```
Frontend: http://localhost:3000
Backend: http://localhost:3001
```

Docker:
```
http://<your-docker-host>:3000
```

Note: In development, the frontend application is configured to automatically connect to the backend API using the `VITE_API_URL` environment variable. In production (Docker), all API routes are served through the `/api` prefix on the same port as the frontend

## Endpoints

### Models

#### List Models
```http
GET /api/models
```

Lists all available models with their capabilities and favorite status.

**Response:**
```json
[
  {
    "id": "gpt-3.5-turbo",
    "name": "GPT-3.5 Turbo",
    "provider": "openai",
    "multilingual": true,
    "vision": false,
    "message_batches": false,
    "context_window": 16385,
    "max_output_tokens": 4096,
    "input_cost_per_1m": 0.5,
    "output_cost_per_1m": 1.5,
    "latency": "Fastest",
    "isFavorite": true
  }
]
```

### Completions

#### Generate Completion
```http
POST /api/completions
```

Generates completions from LLM models with support for streaming responses.

**Request Body:**
```json
{
  "model": "gpt-3.5-turbo",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant."
    },
    {
      "role": "user",
      "content": "Hello!"
    }
  ],
  "temperature": 0.7
}
```

**Response:**
- Streaming response using Server-Sent Events (SSE):
  ```text
  data: {"content": "Hi", "fullResponse": "Hi", "responseTimeMs": 150}
  data: {"content": " there", "fullResponse": "Hi there", "responseTimeMs": 200}
  data: {"content": "!", "fullResponse": "Hi there!", "responseTimeMs": 250, "totalTokens": 10, "cost": 0.00015, "done": true}
  ```

### Comparisons

#### List Recent Comparisons
```http
GET /api/comparisons?limit=10
```

Returns recent prompt comparisons.

**Query Parameters:**
- `limit` (optional): Number of comparisons to return (default: 10)

**Response:**
```json
[
  {
    "id": 1,
    "system_prompt": "You are a helpful assistant.",
    "user_prompt": "Hello!",
    "responses": [
      {
        "modelId": "gpt-3.5-turbo",
        "response": "Hi there!",
        "tokensUsed": 10,
        "durationMs": 250
      }
    ],
    "created_at": "2024-01-13T12:00:00Z"
  }
]
```

#### Save Comparison
```http
POST /api/comparisons
```

Saves a new comparison.

**Request Body:**
```json
{
  "systemPrompt": "You are a helpful assistant.",
  "userPrompt": "Hello!",
  "responses": [
    {
      "modelId": "gpt-3.5-turbo",
      "response": "Hi there!",
      "tokensUsed": 10,
      "durationMs": 250
    }
  ]
}
```

**Response:**
```json
{
  "id": 1
}
```

### API Keys

#### Get API Key Status
```http
GET /api/keys/info
```

Returns status of API keys for different providers.

**Response:**
```json
[
  {
    "provider": "openai",
    "exists": true
  },
  {
    "provider": "anthropic",
    "exists": false
  }
]
```

#### Save API Key
```http
POST /api/keys
```

Saves an API key for a provider.

**Request Body:**
```json
{
  "provider": "openai",
  "apiKey": "sk-..."
}
```

**Response:**
```json
{
  "success": true
}
```

#### Get Provider API Key
```http
GET /api/keys/:provider
```

Gets the API key for a specific provider.

**Parameters:**
- `provider`: Provider name (e.g., "openai", "anthropic")

**Response:**
```json
{
  "apiKey": "sk-..."
}
```

### Favorites

#### Add Favorite
```http
POST /api/favorites/:modelId
```

Adds a model to favorites.

**Parameters:**
- `modelId`: Model identifier

**Response:**
```json
{
  "success": true
}
```

#### Remove Favorite
```http
DELETE /api/favorites/:modelId
```

Removes a model from favorites.

**Parameters:**
- `modelId`: Model identifier

**Response:**
```json
{
  "success": true
}
```

### Templates

#### List Templates
```http
GET /api/templates/:type
```

Gets templates for a specific type.

**Parameters:**
- `type`: Template type ('system' or 'user')

**Response:**
```json
[
  {
    "id": 1,
    "name": "Professional Assistant",
    "content": "You are a professional assistant...",
    "description": "Standard professional tone",
    "type": "system",
    "created_at": "2024-01-13T12:00:00Z"
  }
]
```

#### Create Template
```http
POST /api/templates
```

Creates a new template.

**Request Body:**
```json
{
  "name": "Professional Assistant",
  "type": "system",
  "content": "You are a professional assistant...",
  "description": "Standard professional tone"
}
```

**Response:**
```json
{
  "id": 1
}
```

#### Delete Template
```http
DELETE /api/templates/:type/:name
```

Deletes a template.

**Parameters:**
- `type`: Template type ('system' or 'user')
- `name`: Template name

**Response:**
```json
{
  "success": true
}
```

## Error Handling

All endpoints return appropriate HTTP status codes:
- 200: Success
- 400: Bad Request (invalid parameters)
- 500: Internal Server Error

Error responses include a message:
```json
{
  "error": "Error message here"
}
```

## Rate Limiting

Currently, there is no rate limiting implemented at the API level. However, the underlying LLM providers (OpenAI, Anthropic) have their own rate limits which will be respected.

## Notes

1. All timestamps are in ISO 8601 format
2. Costs are calculated per million tokens
3. Token counts include both input and output tokens
4. Streaming responses use Server-Sent Events (SSE)
5. API keys are stored securely in the SQLite database
6. All endpoints support CORS
7. In Docker/production, all endpoints are prefixed with `/api`