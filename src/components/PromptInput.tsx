import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Template } from '../services/api';
import { TemplateManager } from './TemplateManager';

export interface Prompt {
  id: string;
  userPrompt: string;
  systemPrompt: string;
}

interface PromptInputProps {
  onSubmit: (prompts: Prompt[]) => void;
  selectedModels: string[];
}

export const PromptInput: React.FC<PromptInputProps> = ({ onSubmit, selectedModels }) => {
  const [prompts, setPrompts] = useState<Prompt[]>([{
    id: '1',
    userPrompt: '',
    systemPrompt: ''
  }]);
  const [showSystemTemplates, setShowSystemTemplates] = useState(false);
  const [showUserTemplates, setShowUserTemplates] = useState(false);
  const [activePromptId, setActivePromptId] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(prompts);
  };

  const addPrompt = () => {
    setPrompts([...prompts, {
      id: (prompts.length + 1).toString(),
      userPrompt: '',
      systemPrompt: ''
    }]);
  };

  const removePrompt = (id: string) => {
    if (prompts.length > 1) {
      setPrompts(prompts.filter(p => p.id !== id));
    }
  };

  const updatePrompt = (id: string, field: 'userPrompt' | 'systemPrompt', value: string) => {
    setPrompts(prompts.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const handleTemplateSelect = (template: Template) => {
    if (!activePromptId) return;

    const field = template.type === 'system' ? 'systemPrompt' : 'userPrompt';
    updatePrompt(activePromptId, field, template.content);

    if (template.type === 'system') {
      setShowSystemTemplates(false);
    } else {
      setShowUserTemplates(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full space-y-4"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">Prompt Configuration</h2>
          <button
            type="button"
            onClick={addPrompt}
            className="btn btn-primary btn-sm"
          >
            Add Prompt
          </button>
        </div>

        {prompts.map((prompt, index) => (
          <div key={prompt.id} className="card bg-base-200 p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium">Prompt {index + 1}</h3>
              {prompts.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePrompt(prompt.id)}
                  className="btn btn-ghost btn-sm btn-circle"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div className="w-full">
                <div className="flex justify-between items-center mb-2">
                  <label className="label">
                    <span className="label-text">System Prompt</span>
                    <span className="label-text-alt text-gray-400">Optional</span>
                  </label>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => {
                      setActivePromptId(prompt.id);
                      setShowSystemTemplates(true);
                    }}
                  >
                    Templates
                  </button>
                </div>
                <textarea
                  value={prompt.systemPrompt}
                  onChange={(e) => updatePrompt(prompt.id, 'systemPrompt', e.target.value)}
                  className="textarea textarea-bordered w-full font-mono text-sm h-24"
                  placeholder="You are a helpful AI assistant..."
                />
              </div>

              <div className="w-full">
                <div className="flex justify-between items-center mb-2">
                  <label className="label">
                    <span className="label-text">User Prompt</span>
                    <span className="label-text-alt text-gray-400">Required</span>
                  </label>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => {
                      setActivePromptId(prompt.id);
                      setShowUserTemplates(true);
                    }}
                  >
                    Templates
                  </button>
                </div>
                <textarea
                  value={prompt.userPrompt}
                  onChange={(e) => updatePrompt(prompt.id, 'userPrompt', e.target.value)}
                  className="textarea textarea-bordered w-full font-mono text-sm h-32"
                  placeholder="Enter your prompt here..."
                  required
                />
              </div>
            </div>
          </div>
        ))}

        <div className="flex justify-end">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={prompts.some(p => !p.userPrompt.trim()) || selectedModels.length === 0}
          >
            Compare {selectedModels.length} Model{selectedModels.length !== 1 ? 's' : ''}
          </button>
        </div>
      </form>

      <TemplateManager
        isOpen={showSystemTemplates}
        onClose={() => setShowSystemTemplates(false)}
        onSelect={handleTemplateSelect}
        type="system"
      />

      <TemplateManager
        isOpen={showUserTemplates}
        onClose={() => setShowUserTemplates(false)}
        onSelect={handleTemplateSelect}
        type="user"
      />
    </motion.div>
  );
};

export default PromptInput; 