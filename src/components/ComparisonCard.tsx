import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LLMModel } from './LLMSelector';
import ModelSelector from './ModelSelector';
import ModelBadge from './ModelBadge';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ComparisonConfig {
  id: string;
  userPrompt: string;
  systemPrompt: string;
  modelId: string;
  temperature: number;
}

interface ComparisonResult {
  config: ComparisonConfig;
  response: string;
  tokensUsed: number;
  cost: number;
  responseTime: number;
}

interface ComparisonCardProps {
  config: ComparisonConfig;
  result?: ComparisonResult;
  chatHistory: Message[];
  isFirst: boolean;
  loadingModel?: string;
  availableModels: LLMModel[];
  onUpdateConfig: (id: string, updates: Partial<ComparisonConfig>) => void;
  onRemove: (id: string) => void;
  onCopyFromFirst: (id: string) => void;
  onContinue: (id: string, prompt: string, messages: Message[]) => void;
  setAvailableModels: (models: LLMModel[]) => void;
  forceHideConfig?: boolean;
}

const MessageBubble: React.FC<{ isUser?: boolean; children: React.ReactNode }> = ({ isUser, children }) => (
  <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
    <div className={`max-w-[90%] rounded-2xl px-4 py-2 ${
      isUser ? 'bg-primary text-primary-content text-right' : 'bg-base-100 text-left'
    }`}>
      {children}
    </div>
  </div>
);

export const ComparisonCard: React.FC<ComparisonCardProps> = ({
  config,
  result,
  chatHistory,
  isFirst,
  availableModels,
  onUpdateConfig,
  onRemove,
  onCopyFromFirst,
  onContinue,
  setAvailableModels,
  forceHideConfig = false
}) => {
  const [isConfigOpen, setIsConfigOpen] = useState(!forceHideConfig);
  const [showContinueInput, setShowContinueInput] = useState(false);
  const [continuePrompt, setContinuePrompt] = useState('');

  useEffect(() => {
    if (forceHideConfig) {
      setIsConfigOpen(false);
    }
  }, [forceHideConfig]);

  return (
    <div className="card glass-panel [data-theme='dark']:bg-neutral min-w-[450px] w-[800px] flex-shrink flex-grow-0">
      <div className="card-body p-1">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            {config.modelId ? (
              <ModelBadge model={availableModels.find(m => m.id === config.modelId)!} />
            ) : (
              <span className="text-gray-500">No model selected</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsConfigOpen(!isConfigOpen)}
              className="btn btn-ghost btn-sm btn-square"
              title={isConfigOpen ? "Hide configuration" : "Show configuration"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            {!isFirst && (
              <button
                onClick={() => onRemove(config.id)}
                className="btn btn-ghost btn-sm btn-square text-error"
                title="Remove this model"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {!isFirst && !forceHideConfig && (
          <div className="mt-2">
            <button
              onClick={() => onCopyFromFirst(config.id)}
              className="btn btn-ghost btn-sm gap-2 text-base-content/60 hover:text-base-content"
              title="Copy prompts from first model"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy from First
            </button>
          </div>
        )}

        <AnimatePresence>
          {isConfigOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 mt-3"
              style={{ overflow: 'visible' }}
            >
              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text">System Prompt</span>
                  <span className="label-text-alt text-gray-400">Optional</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full font-mono text-sm h-20"
                  placeholder="You are a helpful AI assistant..."
                  value={config.systemPrompt}
                  onChange={(e) => onUpdateConfig(config.id, { systemPrompt: e.target.value })}
                />
              </div>

              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text">User Prompt</span>
                  <span className="label-text-alt text-gray-400">Required</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full font-mono text-sm h-24"
                  placeholder="Enter your prompt here..."
                  value={config.userPrompt}
                  onChange={(e) => onUpdateConfig(config.id, { userPrompt: e.target.value })}
                  required
                />
              </div>

              <div className="form-control relative" style={{ zIndex: 50, overflow: 'visible', position: 'static' }}>
                <label className="label py-1">
                  <span className="label-text">Model</span>
                </label>
                <ModelSelector
                  models={availableModels}
                  selectedModelId={config.modelId}
                  onSelect={(modelId) => onUpdateConfig(config.id, { modelId })}
                  onModelsUpdate={setAvailableModels}
                />
              </div>

              {config.modelId && (
                <div className="form-control">
                  <label className="label py-1">
                    <span className="label-text">Temperature</span>
                    <span className="label-text-alt">{config.temperature}</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max={config.modelId.startsWith('gpt-') ? "2" : "1"}
                    step="0.1"
                    value={config.temperature}
                    onChange={(e) => onUpdateConfig(config.id, { temperature: parseFloat(e.target.value) })}
                    className="range range-primary range-sm"
                  />
                  <div className="flex justify-between text-xs mt-1">
                    <span>More Focused</span>
                    <span>More Creative</span>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat-like interface for prompt and response */}
        <div>
          {chatHistory.map((message, index) => (
            <MessageBubble key={index} isUser={message.role === 'user'}>
              {message.role === 'system' ? (
                <div className="text-sm opacity-60 text-left">
                  <span className="font-medium">System:</span> {message.content}
                </div>
              ) : (
                <div className={message.role === 'user' ? 'whitespace-pre-wrap font-normal' : 'prose prose-sm max-w-none dark:prose-invert text-left'}>
                  {message.role === 'assistant' ? (
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  ) : (
                    message.content
                  )}
                </div>
              )}
              {message.role === 'assistant' && result?.tokensUsed !== undefined && index === chatHistory.length - 1 && (
                <div className="flex justify-end items-center gap-2 text-xs text-base-content/60 mt-2 border-t border-base-200 pt-2">
                  <span>{result.tokensUsed.toLocaleString()} tokens</span>
                  <span>${result.cost.toFixed(4)}</span>
                  <span>{result.responseTime.toFixed(2)}s</span>
                </div>
              )}
            </MessageBubble>
          ))}

          {/* Continue conversation section */}
          {result && result.response !== 'Loading...' && (
            <div className="mt-4">
              {!showContinueInput ? (
                <button
                  onClick={() => setShowContinueInput(true)}
                  className="btn btn-ghost btn-sm gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  Continue Conversation
                </button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <textarea
                    className="textarea textarea-bordered w-full font-mono text-sm h-20"
                    placeholder="Enter your follow-up prompt..."
                    value={continuePrompt}
                    onChange={(e) => setContinuePrompt(e.target.value)}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setShowContinueInput(false);
                        setContinuePrompt('');
                      }}
                      className="btn btn-ghost btn-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        onContinue(config.id, continuePrompt, chatHistory);
                        setShowContinueInput(false);
                        setContinuePrompt('');
                      }}
                      className="btn btn-primary btn-sm"
                      disabled={!continuePrompt.trim()}
                    >
                      Send
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComparisonCard; 