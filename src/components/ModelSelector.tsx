import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { LLMModel } from './LLMSelector';
import { toggleFavorite } from '../services/api';
import ModelBadge from './ModelBadge';

interface ModelSelectorProps {
  models: LLMModel[];
  selectedModelId: string;
  onSelect: (modelId: string) => void;
  onModelsUpdate?: (models: LLMModel[]) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  selectedModelId,
  onSelect,
  onModelsUpdate,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [dropdownStyles, setDropdownStyles] = useState({});

  // Update dropdown position when trigger moves
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const updatePosition = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const showAbove = spaceBelow < 220 && spaceAbove > spaceBelow;

      setDropdownStyles({
        position: 'fixed',
        width: rect.width,
        left: `${rect.left}px`,
        top: showAbove ? 'auto' : `${rect.bottom + 0}px`,
        bottom: showAbove ? `${window.innerHeight - rect.top + 8}px` : 'auto',
        zIndex: 9999,
        maxHeight: '250px',
        display: 'flex',
        flexDirection: 'column' as const,
        backgroundColor: 'hsl(var(--b1) / 1)',
        borderRadius: '0.5rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        border: '1px solid hsl(var(--b3) / 1)'
      });
    };

    // Initial position update
    updatePosition();

    // Update position on scroll or resize
    const handleUpdate = () => {
      if (isOpen) {
        requestAnimationFrame(updatePosition);
      }
    };

    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);

    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const selectedModel = models.find((m) => m.id === selectedModelId);
  const filteredModels = models
    .filter((model) =>
      model.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (a.isFavorite === b.isFavorite) return 0;
      return a.isFavorite ? -1 : 1;
    });

  const handleFavoriteToggle = async (modelId: string, currentValue: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onModelsUpdate) return;
    
    try {
      const updatedModels = models.map((model) =>
        model.id === modelId ? { ...model, isFavorite: !currentValue } : model
      );
      onModelsUpdate(updatedModels);
      await toggleFavorite(modelId, currentValue);
    } catch (error) {
      console.error('Error toggling favorite:', error);
      onModelsUpdate(models);
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        className={`w-full flex items-center justify-between p-2 bg-base-100 hover:bg-base-200 rounded-lg transition-colors text-sm border border-base-300 ${isOpen ? 'bg-base-200' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          {selectedModel ? (
            <>
              <ModelBadge model={selectedModel} showCost={false} />
              {selectedModel.isFavorite && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3 w-3 text-yellow-500 fill-current"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              )}
            </>
          ) : (
            <span className="text-gray-500">Select a model</span>
          )}
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && createPortal(
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={dropdownStyles}
        >
          <div className="sticky top-0 p-2 border-b border-base-300 bg-base-100">
            <input
              ref={searchInputRef}
              type="text"
              className="input input-sm input-bordered w-full text-sm bg-base-200"
              placeholder="Search models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="overflow-y-auto custom-scrollbar flex-1 dropdown-scroll bg-base-100">
            {filteredModels.length === 0 ? (
              <div className="p-3 text-center text-gray-500 text-sm">
                No models found
              </div>
            ) : (
              filteredModels.map((model) => (
                <div
                  key={model.id}
                  className={`h-[44px] px-3 hover:bg-base-200 cursor-pointer flex items-center justify-between gap-2 text-sm ${
                    model.id === selectedModelId ? 'bg-base-200' : ''
                  }`}
                  onClick={() => {
                    onSelect(model.id);
                    setIsOpen(false);
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <ModelBadge model={model} />
                  </div>
                  <button
                    className="btn btn-ghost btn-xs btn-circle shrink-0"
                    onClick={(e) => handleFavoriteToggle(model.id, model.isFavorite, e)}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-3 w-3 ${model.isFavorite ? 'text-yellow-500 fill-current' : 'text-gray-400'}`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </motion.div>,
        document.body
      )}
    </div>
  );
};

export default ModelSelector; 