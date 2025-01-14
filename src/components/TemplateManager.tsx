import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Template, getTemplates, saveTemplate, deleteTemplate } from '../services/api';

interface TemplateManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: Template) => void;
  type: 'system' | 'user';
}

export const TemplateManager: React.FC<TemplateManagerProps> = ({
  isOpen,
  onClose,
  onSelect,
  type
}) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    content: '',
    description: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen, type]);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const loadedTemplates = await getTemplates(type);
      setTemplates(loadedTemplates);
      setError(null);
    } catch (err) {
      setError('Failed to load templates');
      console.error('Error loading templates:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!newTemplate.name || !newTemplate.content) {
      setError('Name and content are required');
      return;
    }

    try {
      setIsLoading(true);
      await saveTemplate({
        name: newTemplate.name,
        content: newTemplate.content,
        description: newTemplate.description,
        type
      });
      
      setNewTemplate({ name: '', content: '', description: '' });
      await loadTemplates();
      setError(null);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to save template');
      }
      console.error('Error saving template:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (name: string) => {
    try {
      setIsLoading(true);
      await deleteTemplate(type, name);
      await loadTemplates();
      setError(null);
    } catch (err) {
      setError('Failed to delete template');
      console.error('Error deleting template:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-base-100 rounded-lg shadow-xl p-6 w-full max-w-2xl relative"
      >
        <h2 className="text-2xl font-bold mb-6">
          {type === 'system' ? 'System' : 'User'} Prompt Templates
        </h2>

        {error && (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* New Template Form */}
          <div className="card bg-base-200 p-4">
            <h3 className="font-medium mb-4">Create New Template</h3>
            <div className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Name</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Template name..."
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Content</span>
                </label>
                <textarea
                  className="textarea textarea-bordered font-mono text-sm"
                  value={newTemplate.content}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Template content..."
                  rows={4}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Description (Optional)</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Template description..."
                />
              </div>

              <button
                className={`btn btn-primary w-full ${isLoading ? 'loading' : ''}`}
                onClick={handleSave}
                disabled={isLoading}
              >
                Save Template
              </button>
            </div>
          </div>

          {/* Template List */}
          <div className="card bg-base-200 p-4">
            <h3 className="font-medium mb-4">Saved Templates</h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="card bg-base-300 p-3 hover:bg-base-100 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">{template.name}</h4>
                      {template.description && (
                        <p className="text-sm opacity-70">{template.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => onSelect(template)}
                      >
                        Use
                      </button>
                      <button
                        className="btn btn-ghost btn-xs text-error"
                        onClick={() => handleDelete(template.name)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <pre className="text-xs bg-base-200 p-2 rounded overflow-x-auto">
                    {template.content}
                  </pre>
                </div>
              ))}
              {templates.length === 0 && !isLoading && (
                <div className="text-center py-4 opacity-70">
                  No templates saved yet
                </div>
              )}
              {isLoading && (
                <div className="text-center py-4">
                  <span className="loading loading-spinner"></span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}; 