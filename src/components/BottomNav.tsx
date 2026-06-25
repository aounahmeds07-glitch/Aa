/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Home, Wallet, FileSpreadsheet, BarChart3, Settings } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function BottomNav({ activeTab, setActiveTab }: BottomNavProps) {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'accounts', label: 'Accounts', icon: Wallet },
    { id: 'vouchers', label: 'Vouchers', icon: FileSpreadsheet },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/85 dark:bg-gray-900/85 backdrop-blur-md border-t border-gray-200/60 dark:border-gray-800/60 shadow-lg px-2 pb-safe pt-2 no-print"
      id="bottom-navigation-bar"
    >
      <div className="max-w-md mx-auto flex justify-between items-center px-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all cursor-pointer ${
                isActive 
                  ? 'text-blue-500 font-semibold' 
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
              id={`nav-tab-${tab.id}`}
              aria-label={tab.label}
            >
              {/* Highlight background pill */}
              {isActive && (
                <div 
                  className="absolute inset-0 bg-blue-500/10 dark:bg-blue-500/15 rounded-2xl -z-10" 
                  style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}
                />
              )}
              
              <Icon className="w-5 h-5 transition-transform" />
              
              <span className="text-[10px] mt-1 tracking-wide">{tab.label}</span>
              
              {isActive && (
                <span className="absolute -top-0.5 right-3 w-1.5 h-1.5 bg-blue-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
