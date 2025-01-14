import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../../../');

// Environment configuration and validation
const envConfig = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001'),
  STATIC_DIR: process.env.STATIC_DIR || (process.env.NODE_ENV === 'production' ? '../dist' : '../../client/dist'),
};


// Warn if API keys are missing
if (!process.env.OPENAI_KEY || !process.env.ANTHROPIC_KEY) {
  console.log('Missing API keys:', {
    OPENAI_KEY: process.env.OPENAI_KEY ? 'Present' : 'Missing',
    ANTHROPIC_KEY: process.env.ANTHROPIC_KEY ? 'Present' : 'Missing'
  });
}

export { envConfig }; 