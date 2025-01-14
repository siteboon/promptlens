import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toggleFavorite } from '../services/api';

export interface LLMModel {
  id: string;
  name: string;
  provider: string;
  latency: string;
  contextWindow: number;
  maxOutputTokens: number;
  inputCostPer1M: number;
  outputCostPer1M: number;
  isFavorite: boolean;
  temperature: number;
}

export interface ModelConfig {
  id: string;
  modelId: string;
  temperature: number;
}

interface LLMSelectorProps {
  availableModels: LLMModel[];
  selectedConfigs: ModelConfig[];
  onConfigsUpdate: (configs: ModelConfig[]) => void;
  onModelsUpdate?: (models: LLMModel[]) => void;
}

const LLMSelector: React.FC<LLMSelectorProps> = ({
  availableModels,
  selectedConfigs,
  onConfigsUpdate,
  onModelsUpdate,
}) => {
  const [showAll, setShowAll] = useState(false);
  const modelsPerRow = 3;

  // Sort models: favorites first, then by provider and cost
  const sortedModels = [...availableModels].sort((a, b) => {
    if (a.isFavorite !== b.isFavorite) {
      return b.isFavorite ? 1 : -1;
    }
    if (a.provider !== b.provider) {
      return a.provider === 'openai' ? -1 : 1;
    }
    return b.inputCostPer1M - a.inputCostPer1M;
  });

  const displayedModels = showAll ? sortedModels : sortedModels.slice(0, modelsPerRow);

  const addConfig = (modelId: string) => {
    const newConfig: ModelConfig = {
      id: `${modelId}-${Date.now()}`,
      modelId,
      temperature: availableModels.find(m => m.id === modelId)?.temperature || 0.7,
    };
    onConfigsUpdate([...selectedConfigs, newConfig]);
  };

  const removeConfig = (modelId: string) => {
    onConfigsUpdate(selectedConfigs.filter(c => c.modelId !== modelId));
  };

  const handleFavoriteToggle = async (modelId: string, isFavorite: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await toggleFavorite(modelId, isFavorite);
      
      const updatedModels = availableModels.map(model => 
        model.id === modelId 
          ? { ...model, isFavorite: !isFavorite }
          : model
      );
      
      onModelsUpdate?.(updatedModels);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Selected Models */}
      {selectedConfigs.length > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Selected Models</span>
            <button
              className="btn btn-ghost btn-xs"
              onClick={() => onConfigsUpdate([])}
            >
              Clear All
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedConfigs.map((config) => {
              const model = availableModels.find(m => m.id === config.modelId);
              if (!model) return null;
              return (
                <div
                  key={config.id}
                  className="badge badge-lg gap-2 cursor-pointer hover:bg-base-300"
                  onClick={() => removeConfig(config.modelId)}
                >
                  <span>{model.name}</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Models */}
      <div className="space-y-2">
        <span className="text-sm font-medium">Available Models</span>
        <div className="space-y-2">
          {displayedModels.map((model) => (
            <motion.div
              key={model.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between p-2 rounded-lg bg-base-200 hover:bg-base-300 transition-colors"
            >
              <div className="flex items-center gap-2">
                <button
                  className="btn btn-ghost btn-xs btn-circle"
                  onClick={(e) => handleFavoriteToggle(model.id, model.isFavorite, e)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-4 w-4 ${model.isFavorite ? 'text-yellow-500 fill-current' : 'text-gray-400'}`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </button>
                <div>
                  <div className="font-medium text-sm">{model.name}</div>
                  <div className="flex gap-2 mt-1">
                    <div className={`badge badge-sm ${model.provider === 'openai' ? 'badge-success text-white' : 'badge-primary'}`}>
                      {model.provider}
                    </div>
                    <div className="badge badge-sm badge-ghost">{model.latency}</div>
                  </div>
                </div>
              </div>
              <button
                className={`btn btn-primary btn-sm ${selectedConfigs.some(c => c.modelId === model.id) ? 'btn-disabled' : ''}`}
                onClick={() => addConfig(model.id)}
                disabled={selectedConfigs.some(c => c.modelId === model.id)}
              >
                {selectedConfigs.some(c => c.modelId === model.id) ? 'Added' : 'Add'}
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      {availableModels.length > modelsPerRow && (
        <button
          className="btn btn-ghost btn-sm w-full"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? 'Show Less' : 'Show More Models'}
        </button>
      )}
    </div>
  );
};

export default LLMSelector; 