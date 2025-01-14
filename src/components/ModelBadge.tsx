import React, { useEffect, useRef, useState } from 'react';
import { LLMModel } from './LLMSelector';

interface ModelBadgeProps {
  model: LLMModel;
  showCost?: boolean;
}

export const ModelBadge: React.FC<ModelBadgeProps> = ({ model, showCost = true }) => {
  const [tooltipPosition, setTooltipPosition] = useState<'top' | 'bottom'>('top');
  const tooltipTriggerRef = useRef<HTMLLabelElement>(null);

  useEffect(() => {
    const updatePosition = () => {
      if (tooltipTriggerRef.current) {
        const rect = tooltipTriggerRef.current.getBoundingClientRect();
        const spaceAbove = rect.top;
        const spaceBelow = window.innerHeight - rect.bottom;
        setTooltipPosition(spaceAbove > spaceBelow ? 'top' : 'bottom');
      }
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, []);

  if (!model) {
    return <span className="text-gray-500">Loading...</span>;
  }

  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2 min-w-0">
        <span className="truncate">{model.name}</span>
        <div className={`badge badge-sm ${model.provider === 'openai' ? 'badge-success text-white' : 'text-white'}`} 
          style={model.provider === 'anthropic' ? { backgroundColor: '#D4A27F' } : undefined}>
          {model.provider}
        </div>
        <div className="dropdown dropdown-hover">
          <label ref={tooltipTriggerRef} tabIndex={0} className="text-gray-400 hover:text-gray-600 cursor-help">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </label>
          <div 
            tabIndex={0} 
            className="dropdown-content z-[99999] card card-compact w-64 p-2 shadow bg-base-100 text-sm"
            style={{ 
              position: 'fixed',
              transform: tooltipPosition === 'top' ? 'translateY(-100%)' : 'translateY(0)',
              marginTop: tooltipPosition === 'top' ? '-8px' : '8px'
            }}
          >
            <div className="card-body p-2 gap-1">
              <p><strong>API Model:</strong> {model.id}</p>
              <p><strong>Context:</strong> {model.contextWindow.toLocaleString()} tokens</p>
              <p><strong>Max Output:</strong> {model.maxOutputTokens.toLocaleString()} tokens</p>
              <p><strong>Latency:</strong> {model.latency}</p>
              {(model.id.startsWith('o1-') || model.id === 'o1') && (
                <div className="mt-1 pt-1 border-t border-base-200 text-warning">
                  <p><strong>Note:</strong> This model does not support system prompts. System prompts will be prepended to the user prompt.</p>
                </div>
              )}
              <div className="mt-1 pt-1 border-t border-base-200">
                <p><strong>Input Cost:</strong> ${model.inputCostPer1M}/1M tokens</p>
                <p><strong>Output Cost:</strong> ${model.outputCostPer1M}/1M tokens</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      {showCost && (
        <div className="text-xs text-gray-500 whitespace-nowrap flex flex-col items-end">
          <span>In: ${model.inputCostPer1M}/1M</span>
          <span>Out: ${model.outputCostPer1M}/1M</span>
        </div>
      )}
    </div>
  );
};

export default ModelBadge; 