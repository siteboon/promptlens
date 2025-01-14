# PromptLens

An open-source tool for comparing and analyzing LLM responses across different models.

## Features

- **Prompt Discovery & Management**
  - Dual prompt system with user and system prompts
  - Prompt history tracking
  - Continue conversations with selected or all models
  - Multi-turn conversations support

- **LLM Integration**
  - Support for OpenAI GPT models and Anthropic Claude
  - Streaming responses for real-time feedback
  - Cost calculation and usage tracking
  - API key management in settings
  - Model parameter configuration

- **Results Display**
  - Side-by-side comparison of responses
  - Syntax highlighting for code
  - Export and share functionality



## Installation

### Using Docker (Recommended)

The easiest way to get started is using Docker:

```yaml
version: '3.8'
services:
  app:
    image: siteboonai/promptlens:latest
    ports:
      - "3000:3000"  # Application port (serves both frontend and API)
    environment:
      - OPENAI_KEY=your_key  # Optional can be configured in the settings later on
      - ANTHROPIC_KEY=your_key  # Optional can be configured in the settings later on
    volumes:
      - ./data:/app/data  # For SQLite database (stores prompts, comparisons, and encrypted API keys)
```
Save as `docker-compose.yml` and run:
```bash
docker-compose up -d
```

The application will be available at http://localhost:3000

### Manual Installation

1. Clone the repository:
```bash
git clone https://github.com/siteboon/promptlens.git
cd promptlens
```

2. Install all dependencies:
```bash
npm run install:all
```

3. Configure environment:
   - Copy `.env.example` to `.env`
   - Add your OpenAI and/or Anthropic API keys (optional, can be configured in UI)

4. Start the application:
```bash
# Start both frontend and backend in development mode
npm run dev  # Frontend on port 3000, Backend on port 3001

# Or start them separately:
npm run dev:client  # Frontend on port 3000
npm run dev:server  # Backend on port 3001
```
This will initialize all packages in parallel and watch for changes, including the website which will be available at http://localhost:3000.

In development mode:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

In production mode (Docker):
- Everything runs on http://localhost:3000 with API routes prefixed with `/api`


### Key Endpoints

- `POST /api/completions` - Generate completions from LLM models
- `GET /api/comparisons` - List recent prompt comparisons
- `GET /api/models` - List available models
- `POST /api/keys` - Manage API keys
- `GET /api/keys/info` - Get API key status


### Project Structure

```
promptlens-v2/
├── src/                    # Frontend source
│   ├── components/        # React components
│   ├── services/         # API and external services
│   ├── utils/           # Helper functions
│   └── assets/         # Static assets
├── server/              # Backend source
│   ├── src/
│   │   ├── migrations/  # Database migrations
│   │   └── index.ts    # Server entry point
│   └── package.json
├── public/             # Static files
└── package.json
```

### Technology Stack

- **Frontend**
  - React with TypeScript
  - Tailwind CSS + DaisyUI
  - Vite build tool

- **Backend**
  - Node.js with TypeScript
  - SQLite database
  - Express server



## Development & Contributing
We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.



## Documentation

- [API Documentation](API.md) - Details about the backend API
- [Contributing Guide](CONTRIBUTING.md) - How to contribute to the project

## License

AGPL-3.0 - See [LICENSE](LICENSE) for details.

