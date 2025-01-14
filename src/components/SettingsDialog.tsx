import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { saveApiKey, getApiKeyInfo } from '../services/api';

interface APIKeys {
  openai?: string;
  anthropic?: string;
}

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (keys: APIKeys) => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [apiKeys, setApiKeys] = useState<APIKeys>({});
  const [existingKeys, setExistingKeys] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const loadApiKeyInfo = async () => {
      try {
        const keyInfo = await getApiKeyInfo();
        setExistingKeys(new Set(keyInfo.filter(k => k.exists).map(k => k.provider)));
        setApiKeys({});  // Reset input fields
      } catch (error) {
        console.error('Error loading API key info:', error);
      }
    };

    if (isOpen) {
      loadApiKeyInfo();
    }
  }, [isOpen]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const savePromises = [];
      if (apiKeys.openai) {
        savePromises.push(saveApiKey('openai', apiKeys.openai));
      }
      if (apiKeys.anthropic) {
        savePromises.push(saveApiKey('anthropic', apiKeys.anthropic));
      }

      await Promise.all(savePromises);
      
      // Update the list of existing keys
      const keyInfo = await getApiKeyInfo();
      setExistingKeys(new Set(keyInfo.filter(k => k.exists).map(k => k.provider)));
      
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error saving API keys:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            className="bg-base-100 rounded-lg shadow-xl p-6 w-full max-w-md relative"
          >
            <h2 className="text-lg font-bold mb-4">Settings</h2>
            
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">OpenAI API Key</span>
                {existingKeys.has('openai') && (
                  <span className="label-text-alt text-success">✓ Configured</span>
                )}
              </label>
              <input
                type="password"
                placeholder={existingKeys.has('openai') ? '••••••••' : 'Enter API key'}
                className="input input-bordered w-full"
                value={apiKeys.openai || ''}
                onChange={(e) => setApiKeys(prev => ({ ...prev, openai: e.target.value }))}
              />
            </div>

            <div className="form-control w-full mt-4">
              <label className="label">
                <span className="label-text">Anthropic API Key</span>
                {existingKeys.has('anthropic') && (
                  <span className="label-text-alt text-success">✓ Configured</span>
                )}
              </label>
              <input
                type="password"
                placeholder={existingKeys.has('anthropic') ? '••••••••' : 'Enter API key'}
                className="input input-bordered w-full"
                value={apiKeys.anthropic || ''}
                onChange={(e) => setApiKeys(prev => ({ ...prev, anthropic: e.target.value }))}
              />
            </div>

            <div className="modal-action mt-6">
              <button className="btn btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button
                className={`btn btn-primary ${isSaving ? 'loading' : ''}`}
                onClick={handleSave}
                disabled={isSaving || (!apiKeys.openai && !apiKeys.anthropic)}
              >
                {showSuccess ? 'Saved!' : 'Save'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SettingsDialog; 