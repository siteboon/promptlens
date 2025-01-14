import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { ModelConfig } from './LLMSelector';

interface ComparisonResult {
  modelName: string;
  modelConfig: ModelConfig;
  response: string;
  tokensUsed: number;
  cost: number;
  responseTime: number;
  userPrompt: string;
  systemPrompt: string;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ComparisonResultsProps {
  results: ComparisonResult[];
  loadingModel?: string;
  onContinue: (modelConfig: ModelConfig, message: string, history: Message[]) => void;
  onContinueAll: (message: string, history: Message[]) => void;
}

const ComparisonResults: React.FC<ComparisonResultsProps> = ({ 
  results, 
  loadingModel,
  onContinue,
  onContinueAll
}) => {
  const [continuationPrompt, setContinuationPrompt] = useState('');
  const [activeContinuation, setActiveContinuation] = useState<string | null>(null);
  const [showContinueAll, setShowContinueAll] = useState(false);

  // Group results by prompt
  const groupedResults = results.reduce((groups, result) => {
    const key = `${result.userPrompt}-${result.systemPrompt}`;
    if (!groups[key]) {
      groups[key] = {
        userPrompt: result.userPrompt,
        systemPrompt: result.systemPrompt,
        results: []
      };
    }
    groups[key].results.push(result);
    return groups;
  }, {} as Record<string, { userPrompt: string; systemPrompt: string; results: ComparisonResult[] }>);

  const handleContinue = (result: ComparisonResult) => {
    const history: Message[] = [];
    if (result.systemPrompt) {
      history.push({ role: 'system', content: result.systemPrompt });
    }
    history.push({ role: 'user', content: result.userPrompt });
    history.push({ role: 'assistant', content: result.response });
    onContinue(result.modelConfig, continuationPrompt, history);
    setContinuationPrompt('');
    setActiveContinuation(null);
  };

  const handleContinueAll = () => {
    // Use the first group's prompts for history
    const firstGroup = Object.values(groupedResults)[0];
    const history: Message[] = [];
    if (firstGroup.systemPrompt) {
      history.push({ role: 'system', content: firstGroup.systemPrompt });
    }
    history.push({ role: 'user', content: firstGroup.userPrompt });
    firstGroup.results.forEach(r => {
      history.push({ role: 'assistant', content: r.response });
    });
    onContinueAll(continuationPrompt, history);
    setContinuationPrompt('');
    setShowContinueAll(false);
  };

  return (
    <div className="space-y-8">
      {Object.values(groupedResults).map((group, groupIndex) => (
        <div key={groupIndex} className="card bg-base-200">
          <div className="card-body">
            <div className="mb-4">
              <div className="font-mono text-sm bg-base-300 p-2 rounded">
                {group.userPrompt}
              </div>
              {group.systemPrompt && (
                <div className="text-sm opacity-60 mt-2">
                  <span className="font-medium">System:</span> {group.systemPrompt}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {group.results.map((result, index) => (
                <div key={index} className="card bg-base-300 min-h-[200px] flex flex-col">
                  <div className="card-body p-4 flex flex-col flex-1">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-4 h-[40px]">
                      <div>
                        <h2 className="card-title flex items-center gap-2">
                          {result.modelName}
                          {loadingModel === `${result.modelName}-${result.modelConfig.id}` && (
                            <span className="loading loading-spinner loading-sm"></span>
                          )}
                        </h2>
                        <div className="text-sm opacity-60">
                          Temperature: {result.modelConfig.temperature}
                        </div>
                      </div>
                      <div className={`badge ${result.modelName.includes('gpt') ? 'badge-success text-white' : 'badge-primary'}`}>
                        {result.modelName.includes('gpt') ? 'OpenAI' : 'Anthropic'}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                      <ReactMarkdown
                        components={{
                          code({ node, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '');
                            const language = match ? match[1] : '';
                            const isInline = !className?.includes('language-');
                            
                            if (isInline) {
                              return <code className="bg-base-300 px-1 rounded" {...props}>{children}</code>;
                            }
                            
                            return (
                              <div className="my-4">
                                <SyntaxHighlighter
                                  language={language}
                                  PreTag="div"
                                  customStyle={{
                                    margin: 0,
                                    borderRadius: '0.5rem',
                                    background: 'var(--tw-prose-pre-bg)',
                                  }}
                                >
                                  {String(children).replace(/\n$/, '')}
                                </SyntaxHighlighter>
                              </div>
                            );
                          }
                        }}
                        className="prose prose-sm max-w-none dark:prose-invert"
                      >
                        {result.response || (loadingModel === `${result.modelName}-${result.modelConfig.id}` ? 'Loading...' : 'Error: No response')}
                      </ReactMarkdown>
                    </div>

                    {/* Footer */}
                    <div className="mt-4 space-y-4">
                      <div className="flex justify-between text-sm opacity-60">
                        <span>{result.tokensUsed} tokens</span>
                        <span>${result.cost.toFixed(4)}</span>
                        <span>{result.responseTime.toFixed(2)}s</span>
                      </div>

                      {activeContinuation === `${result.modelName}-${result.modelConfig.id}` ? (
                        <div className="space-y-2">
                          <textarea
                            className="textarea textarea-bordered w-full font-mono text-sm"
                            placeholder="Continue the conversation..."
                            value={continuationPrompt}
                            onChange={(e) => setContinuationPrompt(e.target.value)}
                            rows={3}
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => {
                                setContinuationPrompt('');
                                setActiveContinuation(null);
                              }}
                            >
                              Cancel
                            </button>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleContinue(result)}
                              disabled={!continuationPrompt.trim()}
                            >
                              Send
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          className="btn btn-outline btn-sm w-full"
                          onClick={() => setActiveContinuation(`${result.modelName}-${result.modelConfig.id}`)}
                        >
                          Continue Conversation
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Continue with all models */}
            {showContinueAll ? (
              <div className="mt-4 space-y-2">
                <textarea
                  className="textarea textarea-bordered w-full font-mono text-sm"
                  placeholder="Continue the conversation with all models..."
                  value={continuationPrompt}
                  onChange={(e) => setContinuationPrompt(e.target.value)}
                  rows={3}
                />
                <div className="flex justify-end gap-2">
                  <button
                    className="btn btn-ghost"
                    onClick={() => {
                      setContinuationPrompt('');
                      setShowContinueAll(false);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleContinueAll}
                    disabled={!continuationPrompt.trim()}
                  >
                    Send to All Models
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="btn btn-outline w-full mt-4"
                onClick={() => setShowContinueAll(true)}
              >
                Continue with All Models
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ComparisonResults; 