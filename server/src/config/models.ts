/**
 * Model Configuration File
 * 
 * This file contains the configuration for all supported LLM models.
 * When adding a new model, follow these steps:
 * 1. Add the model configuration to the appropriate provider section below
 * 2. Create a new migration file for the model addition
 * 3. Use the migration file to add the model to existing installations
 * 
 * IMPORTANT: The defaultModels array only contains models from the initial schema (001_initial_schema.js).
 * All new models should be added through migrations to ensure proper versioning and backwards compatibility.
 * This allows existing installations to properly upgrade their databases.
 */

export interface ModelConfig {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic';
  multilingual: boolean;
  vision: boolean;
  message_batches: boolean;
  context_window: number;
  max_output_tokens: number;
  input_cost_per_1m: number;  // Cost in USD per 1M tokens
  output_cost_per_1m: number; // Cost in USD per 1M tokens
  latency: 'Fastest' | 'Fast' | 'Moderate' | 'Slow';
}

/**
 * Default models included in the initial schema (001_initial_schema.js).
 * DO NOT MODIFY or ADD to this array. New models should be added through migrations.
 * See the example below for how to add new models.
 */
export const defaultModels: ModelConfig[] = [
  // Anthropic Models
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    multilingual: true,
    vision: true,
    message_batches: true,
    context_window: 200000,
    max_output_tokens: 8192,
    input_cost_per_1m: 3.0,
    output_cost_per_1m: 15.0,
    latency: 'Fast'
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    multilingual: true,
    vision: true,
    message_batches: true,
    context_window: 200000,
    max_output_tokens: 8192,
    input_cost_per_1m: 0.8,
    output_cost_per_1m: 4.0,
    latency: 'Fastest'
  },{
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    multilingual: true,
    vision: true,
    message_batches: true,
    context_window: 200000,
    max_output_tokens: 4096,
    input_cost_per_1m: 15.0,
    output_cost_per_1m: 75.0,
    latency: 'Fast'
  },
  {
    id: 'claude-3-sonnet-20240229',
    name: 'Claude 3 Sonnet',
    provider: 'anthropic',
    multilingual: true,
    vision: true,
    message_batches: true,
    context_window: 200000,
    max_output_tokens: 4096,
    input_cost_per_1m: 3.0,
    output_cost_per_1m: 15.0,
    latency: 'Fast'
  },
  {
    id: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    provider: 'anthropic',
    multilingual: true,
    vision: true,
    message_batches: true,
    context_window: 200000,
    max_output_tokens: 4096,
    input_cost_per_1m: 0.25,
    output_cost_per_1m: 1.25,
    latency: 'Fastest'
  },
  
  // OpenAI Models
  {
    id: 'o1-2024-12-17',
    name: 'o1',
    provider: 'openai',
    multilingual: true,
    vision: false,
    message_batches: true,
    context_window: 128000,
    max_output_tokens: 4096,
    input_cost_per_1m: 15.0,
    output_cost_per_1m: 60.0,
    latency: 'Fast'
  },
  {
    id: 'o1-mini-2024-09-12',
    name: 'o1 Mini',
    provider: 'openai',
    multilingual: true,
    vision: false,
    message_batches: true,
    context_window: 128000,
    max_output_tokens: 4096,
    input_cost_per_1m: 3.0,
    output_cost_per_1m: 12.0,
    latency: 'Fast'
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    multilingual: true,
    vision: false,
    message_batches: false,
    context_window: 128000,
    max_output_tokens: 4096,
    input_cost_per_1m: 0.15,
    output_cost_per_1m: 0.60,
    latency: 'Fast'
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    multilingual: true,
    vision: false,
    message_batches: false,
    context_window: 128000,
    max_output_tokens: 4096,
    input_cost_per_1m: 10.0,
    output_cost_per_1m: 30.0,
    latency: 'Fast'
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    multilingual: true,
    vision: false,
    message_batches: false,
    context_window: 16385,
    max_output_tokens: 4096,
    input_cost_per_1m: 0.5,
    output_cost_per_1m: 1.5,
    latency: 'Fastest'
  }
];

/**
 * Helper function to generate SQL for inserting a model
 */
export function generateModelInsertSQL(model: ModelConfig): string {
  return `
  INSERT INTO models (
    id, name, provider, 
    multilingual, vision, message_batches,
    context_window, max_output_tokens,
    input_cost_per_1m, output_cost_per_1m,
    latency
  ) VALUES (
    '${model.id}',
    '${model.name}',
    '${model.provider}',
    ${model.multilingual}, ${model.vision}, ${model.message_batches},
    ${model.context_window}, ${model.max_output_tokens},
    ${model.input_cost_per_1m}, ${model.output_cost_per_1m},
    '${model.latency}'
  );`;
}

/**
 * Example of how to add a new model:
 * 
 * 1. Create a new migration file (e.g., 003_add_new_model.ts)
 * 2. Import the ModelConfig and generateModelInsertSQL
 * 3. Define your new model:
 * 
 * const newModel: ModelConfig = {
 *   id: 'new-model',
 *   name: 'New Model',
 *   provider: 'openai',
 *   // ... fill in other fields
 * };
 * 
 * 4. Generate the migration:
 * 
 * export const up = generateModelInsertSQL(newModel);
 * export const down = `DELETE FROM models WHERE id = '${newModel.id}';`;
 * 
 * This ensures that:
 * - Existing installations can upgrade properly
 * - Changes are versioned and tracked
 * - Rollbacks are possible if needed
 */ 