/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, ShieldAlert, X } from 'lucide-react';

interface PasswordPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title: string;
  message: string;
  showToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function PasswordPromptModal({
  isOpen,
  onClose,
  onSuccess,
  title,
  message,
  showToast
}: PasswordPromptModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  // Reset local state when modal is opened/closed
  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError(false);
    }
  }, [isOpen]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (password === '1234') {
      onSuccess();
      onClose();
    } else {
      setError(true);
      showToast("Access Denied: Incorrect administrator pin.", "error");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 no-print" id="password-modal-overlay">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gray-950/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative w-full max-w-sm glass-panel p-6 rounded-2xl shadow-xl border border-rose-200/50 dark:border-rose-950/20 bg-white dark:bg-gray-950 z-10 space-y-5"
            id="password-prompt-modal"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              id="password-modal-close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex gap-4 items-start">
              <div className={`p-3 rounded-xl shrink-0 ${error ? 'bg-rose-100 dark:bg-rose-950/30 text-rose-500' : 'bg-amber-100 dark:bg-amber-950/30 text-amber-500'}`}>
                {error ? <ShieldAlert className="w-6 h-6 animate-pulse" /> : <ShieldCheck className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100" id="password-modal-title">
                  {title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed" id="password-modal-message">
                  {message}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="admin-pin-input" className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Enter Admin Password (PIN)
                </label>
                <input
                  type="password"
                  id="admin-pin-input"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(false);
                  }}
                  placeholder="&bull; &bull; &bull; &bull;"
                  maxLength={10}
                  autoFocus
                  className={`w-full text-center tracking-[0.5em] font-mono font-bold text-lg px-4 py-2.5 rounded-xl border bg-transparent text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 transition-all ${
                    error
                      ? 'border-rose-500 focus:ring-rose-500/20'
                      : 'border-gray-200 dark:border-gray-800 focus:ring-blue-500/20 focus:border-blue-500'
                  }`}
                  required
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60 rounded-xl transition-all cursor-pointer"
                  id="password-modal-cancel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-xl shadow-sm transition-all cursor-pointer"
                  id="password-modal-submit"
                >
                  Verify & Wipe
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
