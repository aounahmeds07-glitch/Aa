/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { ToastMessage } from '../types';

interface ToastContainerProps {
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
}

export default function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-auto md:right-4 z-50 flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none no-print" id="toast-container">
      <AnimatePresence>
        {toasts.map((toast) => {
          let bgColor = 'bg-white dark:bg-gray-800';
          let textColor = 'text-gray-900 dark:text-gray-100';
          let iconColor = 'text-blue-500';
          let Icon = Info;

          switch (toast.type) {
            case 'success':
              bgColor = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50';
              textColor = 'text-emerald-800 dark:text-emerald-200';
              iconColor = 'text-emerald-500';
              Icon = CheckCircle;
              break;
            case 'error':
              bgColor = 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50';
              textColor = 'text-rose-800 dark:text-rose-200';
              iconColor = 'text-rose-500';
              Icon = XCircle;
              break;
            case 'warning':
              bgColor = 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50';
              textColor = 'text-amber-800 dark:text-amber-200';
              iconColor = 'text-amber-500';
              Icon = AlertTriangle;
              break;
            case 'info':
              bgColor = 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-900/50';
              textColor = 'text-sky-800 dark:text-sky-200';
              iconColor = 'text-sky-500';
              Icon = Info;
              break;
          }

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className={`flex items-center gap-3 p-4 rounded-xl border shadow-lg pointer-events-auto ${bgColor}`}
              role="alert"
              id={`toast-${toast.id}`}
            >
              <Icon className={`w-5 h-5 shrink-0 ${iconColor}`} />
              <p className={`text-sm font-medium flex-1 ${textColor}`}>{toast.message}</p>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
                aria-label="Close notification"
                id={`close-toast-${toast.id}`}
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
