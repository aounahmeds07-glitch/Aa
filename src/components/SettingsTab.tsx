/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChangeEvent } from 'react';
import { Shield, Eye, FileSpreadsheet, PlusCircle, CheckCircle, XCircle, Sun, Moon, Download, Upload } from 'lucide-react';
import { UserRole } from '../types';

interface SettingsTabProps {
  role: UserRole;
  setRole: (role: UserRole) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  onResetDatabase: () => void;
  onCompletelyWipeDatabase: () => void;
  onExportDatabase: () => void;
  onImportDatabase: (data: any) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function SettingsTab({
  role,
  setRole,
  theme,
  setTheme,
  onResetDatabase,
  onCompletelyWipeDatabase,
  onExportDatabase,
  onImportDatabase,
  showToast
}: SettingsTabProps) {
  // Handle role switch
  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    showToast(`Switched to ${newRole === UserRole.ADMIN ? 'ADMIN' : 'USER'} MODE successfully.`, "success");
  };

  // Handle theme change
  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    showToast(`Switched to ${newTheme === 'dark' ? 'Dark' : 'Light'} Mode.`, "info");
  };

  // Trigger hidden file picker
  const fileInputId = "import-database-file-picker";
  const handleTriggerImport = () => {
    const picker = document.getElementById(fileInputId) as HTMLInputElement | null;
    if (picker) {
      picker.click();
    }
  };

  // Read selected JSON backup file
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const rawText = event.target?.result as string;
        const parsed = JSON.parse(rawText);
        onImportDatabase(parsed);
      } catch (error) {
        showToast("Invalid backup file.", "error");
      }
      e.target.value = ''; // Reset file input
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 animate-fade-in" id="settings-tab">
      
      {/* Role Switch Panel */}
      <div className="glass-panel p-6 rounded-2xl border space-y-4" id="role-switch-panel">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Role & Security Privileges</h2>
            <p className="text-xs text-gray-400 mt-0.5">Toggle between accounting access levels</p>
          </div>
        </div>

        {/* Dynamic Selector Toggle */}
        <div className="grid grid-cols-2 p-1.5 bg-gray-100 dark:bg-gray-800/80 rounded-xl" id="role-selector-bar">
          <button
            onClick={() => handleRoleChange(UserRole.USER)}
            className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              role === UserRole.USER
                ? 'bg-white dark:bg-gray-700 text-blue-500 shadow-xs'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
            id="btn-set-role-user"
          >
            USER MODE
          </button>
          
          <button
            onClick={() => handleRoleChange(UserRole.ADMIN)}
            className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              role === UserRole.ADMIN
                ? 'bg-white dark:bg-gray-700 text-blue-500 shadow-xs'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
            id="btn-set-role-admin"
          >
            ADMIN MODE
          </button>
        </div>

        {/* Interactive Matrix List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3" id="permissions-matrix-grid">
          {/* USER Card */}
          <div className={`p-4 rounded-xl border transition-all ${
            role === UserRole.USER 
              ? 'bg-blue-50/10 border-blue-200 dark:border-blue-900/30' 
              : 'bg-transparent border-gray-100 dark:border-gray-800/40 opacity-70'
          }`} id="permission-user-card">
            <span className="text-[10px] font-bold text-gray-400 block mb-3 uppercase tracking-wider">User Mode Permissions</span>
            
            <ul className="space-y-2 text-xs">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-gray-600 dark:text-gray-300">Create & post general journal vouchers</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-gray-600 dark:text-gray-300">View posted voucher distributions</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-gray-600 dark:text-gray-300">Compile & paginate ledger reports</span>
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                <span className="text-gray-400">Cannot Create/Edit/Delete accounts</span>
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                <span className="text-gray-400">Cannot Pin/Unpin ledger cards</span>
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                <span className="text-gray-400">Cannot modify posted historical vouchers</span>
              </li>
            </ul>
          </div>

          {/* ADMIN Card */}
          <div className={`p-4 rounded-xl border transition-all ${
            role === UserRole.ADMIN 
              ? 'bg-blue-50/10 border-blue-200 dark:border-blue-900/30' 
              : 'bg-transparent border-gray-100 dark:border-gray-800/40 opacity-70'
          }`} id="permission-admin-card">
            <span className="text-[10px] font-bold text-gray-400 block mb-3 uppercase tracking-wider">Admin Mode Permissions</span>
            
            <ul className="space-y-2 text-xs">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-gray-600 dark:text-gray-300">Complete, unrestricted system control</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-gray-600 dark:text-gray-300">Create, edit, and delete ledger accounts</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-gray-600 dark:text-gray-300">Pin accounts to dashboard indicators</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-gray-600 dark:text-gray-300">Revise or delete historical vouchers</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-gray-600 dark:text-gray-300">Automatic double-entry balance updates</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Interface Theme preferences */}
      <div className="glass-panel p-6 rounded-2xl border space-y-4" id="theme-panel">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl">
            {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Visual Settings</h2>
            <p className="text-xs text-gray-400 mt-0.5">Adjust client visual interface</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3" id="theme-buttons-container">
          <button
            onClick={() => handleThemeChange('light')}
            className={`p-3 text-xs font-semibold rounded-xl border flex items-center justify-center gap-2 cursor-pointer transition-all ${
              theme === 'light'
                ? 'bg-blue-500/10 border-blue-500 text-blue-500 font-bold shadow-xs'
                : 'border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
            id="btn-theme-light"
          >
            <Sun className="w-4 h-4" />
            <span>Light Interface</span>
          </button>

          <button
            onClick={() => handleThemeChange('dark')}
            className={`p-3 text-xs font-semibold rounded-xl border flex items-center justify-center gap-2 cursor-pointer transition-all ${
              theme === 'dark'
                ? 'bg-blue-500/10 border-blue-500 text-blue-500 font-bold shadow-xs'
                : 'border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
            id="btn-theme-dark"
          >
            <Moon className="w-4 h-4" />
            <span>Dark Interface</span>
          </button>
        </div>
      </div>

      {/* Import / Export Complete Database Backup System */}
      <div className="glass-panel p-6 rounded-2xl border space-y-4" id="backup-actions-panel">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Data Portability Suite</h2>
          <p className="text-xs text-gray-400 mt-0.5">Export or restore your professional accounting datasets</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* EXPORT DATA CARD */}
          <div className="p-4 rounded-xl border border-gray-100 dark:border-gray-850 bg-white/50 dark:bg-gray-900/40 flex flex-col justify-between space-y-3" id="export-panel-card">
            <div>
              <h3 className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide">Export Data</h3>
              <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                Download a fully synchronized ledger database backup containing accounts, pinned list state, posted vouchers, and current settings.
              </p>
            </div>
            
            <button
              onClick={onExportDatabase}
              className="w-full py-2 bg-blue-500 hover:bg-blue-600 active:scale-95 text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
              id="btn-export-database"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Complete Database</span>
            </button>
          </div>

          {/* IMPORT DATA CARD */}
          <div className="p-4 rounded-xl border border-gray-100 dark:border-gray-850 bg-white/50 dark:bg-gray-900/40 flex flex-col justify-between space-y-3" id="import-panel-card">
            <div>
              <h3 className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide">Import Data</h3>
              <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                Restore a verified ledger database from a backup JSON file. All current client datasets will be overwritten.
              </p>
            </div>

            <input
              type="file"
              id={fileInputId}
              className="hidden"
              onChange={handleFileChange}
              accept=".json"
            />
            
            <button
              onClick={handleTriggerImport}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
              id="btn-import-database"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Database</span>
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Database wipe reset */}
      <div className="glass-panel p-6 rounded-2xl border border-rose-200/50 dark:border-rose-950/30 space-y-4" id="database-actions-panel">
        <div>
          <h2 className="text-base font-bold text-rose-600 dark:text-rose-400">Database Administration</h2>
          <p className="text-xs text-gray-400 mt-0.5">Erase client data cache and manage database states</p>
        </div>

        <div className="pt-1">
          {/* OPTION 2: EMPTY WIPE */}
          <div className="p-4 rounded-xl border border-rose-100/30 dark:border-rose-950/20 bg-rose-50/10 dark:bg-rose-950/5 flex flex-col justify-between space-y-3">
            <div>
              <h3 className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wide">Completely Empty Database</h3>
              <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                Wipes all ledger accounts and transactions completely, leaving a fully blank database. Requires admin passkey.
              </p>
            </div>
            <button
              onClick={onCompletelyWipeDatabase}
              className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
              id="btn-wipe-database-empty"
            >
              Completely Wipe (Password Protected)
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
