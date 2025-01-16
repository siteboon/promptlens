import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Comparison } from '../services/api';
import ReactMarkdown from 'react-markdown';

interface ComparisonResponse {
  modelId: string;
  response: string;
  tokensUsed: number;
  responseTime: number;
  cost: number;
}

interface HistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  comparisons: Comparison[];
  onLoadComparison: (comparison: Comparison) => void;
}

const HistoryDialog: React.FC<HistoryDialogProps> = ({
  isOpen,
  onClose,
  comparisons,
  onLoadComparison,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            className="bg-base-100 rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-base-300 flex justify-between items-center flex-shrink-0">
              <h2 className="text-xl font-bold">Comparison History</h2>
              <button className="btn btn-ghost btn-sm btn-circle" onClick={onClose}>✕</button>
            </div>

            <div className="overflow-y-auto p-4 space-y-4 flex-1">
              {comparisons.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No comparison history yet
                </div>
              ) : (
                comparisons.map((comparison) => {
                  const responses = typeof comparison.responses === 'string' 
                    ? JSON.parse(comparison.responses) as ComparisonResponse[]
                    : comparison.responses;
                  
                  return (
                    <div
                      key={comparison.id}
                      className="card bg-base-200 hover:bg-base-300 transition-colors cursor-pointer"
                      onClick={() => {
                        onLoadComparison(comparison);
                        onClose();
                      }}
                    >
                      <div className="card-body p-4">
                        <div className="space-y-2">
                          <div className="text-sm opacity-60">
                            {new Date(comparison.created_at).toLocaleString()}
                          </div>
                          <div className="font-mono text-sm bg-base-300 p-2 rounded">
                            {comparison.user_prompt}
                          </div>
                          {comparison.system_prompt && (
                            <div className="text-sm opacity-60">
                              <span className="font-medium">System:</span> {comparison.system_prompt}
                            </div>
                          )}
                        </div>
                        <div className="mt-3 space-y-3">
                          {responses.map((response, index) => (
                            <div key={index} className="space-y-1">
                              <div className="badge badge-outline gap-1">
                                <span>{response.modelId}</span>
                              </div>
                              <div className="text-sm opacity-80 line-clamp-2">
                                {response.response}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default HistoryDialog; 