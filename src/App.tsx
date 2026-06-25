/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  initializeStorage, 
  recalculateBalances, 
  saveToLocalStorage, 
  loadFromLocalStorage 
} from './utils';
import { Account, Voucher, UserRole, ToastMessage, AppSettings } from './types';

// Component imports
import ToastContainer from './components/ToastContainer';
import ConfirmModal from './components/ConfirmModal';
import PasswordPromptModal from './components/PasswordPromptModal';
import BottomNav from './components/BottomNav';
import DashboardTab from './components/DashboardTab';
import AccountsTab from './components/AccountsTab';
import VouchersTab from './components/VouchersTab';
import ReportsTab from './components/ReportsTab';
import SettingsTab from './components/SettingsTab';

// Icon imports
import { Landmark, User, Clock, ShieldAlert, ShieldCheck } from 'lucide-react';

export default function App() {
  // Navigation & UI States
  const [activeTab, setActiveTab] = useState<string>('home');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [role, setRole] = useState<UserRole>(UserRole.USER);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  
  // Ledger state
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);

  // Toast system state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Confirm dialog state
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Load configuration and data on boot
  useEffect(() => {
    // Initialize standard state ledger
    const loadedData = initializeStorage();
    setAccounts(loadedData.accounts);
    setVouchers(loadedData.vouchers);

    // Load active settings
    const storedRole = loadFromLocalStorage<UserRole>('accounting_role', UserRole.USER);
    const storedTheme = loadFromLocalStorage<'light' | 'dark'>('accounting_theme', 'light');
    
    setRole(storedRole);
    setTheme(storedTheme);

    // Apply dark mode selector on document
    if (storedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // System Toast notifier
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastMessage = { id, message, type };
    
    setToasts((prev) => [...prev, newToast]);
    
    // Auto purge toast
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Confirmation Modal Trigger
  const openConfirmModal = (title: string, message: string, onConfirm: () => void) => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        closeConfirmModal();
      }
    });
  };

  const closeConfirmModal = () => {
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
  };

  // Core Ledger Mutation Operations
  const handleCreateAccount = (newAcc: Omit<Account, 'currentBalance' | 'isPinned' | 'balanceDirection'>) => {
    const freshAccount: Account = {
      ...newAcc,
      currentBalance: newAcc.openingBalance,
      isPinned: false,
      balanceDirection: 'none'
    };

    const nextAccounts = [...accounts, freshAccount];
    const synchronized = recalculateBalances(nextAccounts, vouchers);
    
    setAccounts(synchronized);
    saveToLocalStorage('accounting_accounts', synchronized);
    showToast("Account Created Successfully", "success");
  };

  const handleUpdateAccount = (updatedAcc: Account) => {
    const nextAccounts = accounts.map(a => a.id === updatedAcc.id ? updatedAcc : a);
    const synchronized = recalculateBalances(nextAccounts, vouchers);
    
    setAccounts(synchronized);
    saveToLocalStorage('accounting_accounts', synchronized);
    showToast("Account Updated Successfully", "success");
  };

  const handleDeleteAccount = (id: string) => {
    const nextAccounts = accounts.filter(a => a.id !== id);
    const synchronized = recalculateBalances(nextAccounts, vouchers);
    
    setAccounts(synchronized);
    saveToLocalStorage('accounting_accounts', synchronized);
    showToast("Account Deleted Successfully", "success");
  };

  const handlePinToggle = (id: string) => {
    const nextAccounts = accounts.map(a => {
      if (a.id === id) {
        const nextState = !a.isPinned;
        showToast(nextState ? "Account Pinned Successfully" : "Account Unpinned Successfully", "info");
        return { ...a, isPinned: nextState };
      }
      return a;
    });

    setAccounts(nextAccounts);
    saveToLocalStorage('accounting_accounts', nextAccounts);
  };

  const handleCreateVoucher = (newVoucher: Voucher) => {
    const nextVouchers = [...vouchers, newVoucher];
    const synchronizedAccounts = recalculateBalances(accounts, nextVouchers);
    
    setVouchers(nextVouchers);
    setAccounts(synchronizedAccounts);
    
    saveToLocalStorage('accounting_vouchers', nextVouchers);
    saveToLocalStorage('accounting_accounts', synchronizedAccounts);
    showToast("Voucher Saved Successfully", "success");
  };

  const handleUpdateVoucher = (updatedVoucher: Voucher) => {
    const nextVouchers = vouchers.map(v => v.id === updatedVoucher.id ? updatedVoucher : v);
    const synchronizedAccounts = recalculateBalances(accounts, nextVouchers);
    
    setVouchers(nextVouchers);
    setAccounts(synchronizedAccounts);
    
    saveToLocalStorage('accounting_vouchers', nextVouchers);
    saveToLocalStorage('accounting_accounts', synchronizedAccounts);
    showToast("Voucher Updated Successfully", "success");
  };

  const handleDeleteVoucher = (id: string) => {
    const nextVouchers = vouchers.filter(v => v.id !== id);
    const synchronizedAccounts = recalculateBalances(accounts, nextVouchers);
    
    setVouchers(nextVouchers);
    setAccounts(synchronizedAccounts);
    
    saveToLocalStorage('accounting_vouchers', nextVouchers);
    saveToLocalStorage('accounting_accounts', synchronizedAccounts);
    showToast("Voucher Deleted Successfully", "success");
  };

  // Import / Export Systems
  const handleExportDatabase = () => {
    try {
      const data = {
        accounts,
        vouchers,
        settings: {
          role,
          theme
        }
      };
      
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
      const downloadAnchor = document.createElement('a');
      
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      
      downloadAnchor.setAttribute("href", jsonString);
      downloadAnchor.setAttribute("download", `accounting_backup_${year}_${month}_${day}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      
      showToast("Data exported successfully.", "success");
    } catch (error) {
      showToast("Failed to export database backup.", "error");
    }
  };

  const handleImportDatabase = (importedData: any) => {
    if (!importedData || typeof importedData !== 'object') {
      showToast("Invalid backup file.", "error");
      return;
    }
    
    const hasAccounts = Array.isArray(importedData.accounts);
    const hasVouchers = Array.isArray(importedData.vouchers);
    
    if (!hasAccounts || !hasVouchers) {
      showToast("Invalid backup file.", "error");
      return;
    }

    const validAccounts = importedData.accounts.every((acc: any) => 
      acc && typeof acc === 'object' && acc.id && acc.name && acc.type && typeof acc.openingBalance === 'number'
    );

    const validVouchers = importedData.vouchers.every((vch: any) => 
      vch && typeof vch === 'object' && vch.id && vch.voucherNo && vch.date && Array.isArray(vch.entries)
    );

    if (!validAccounts || !validVouchers) {
      showToast("Invalid backup file.", "error");
      return;
    }

    openConfirmModal(
      "Confirm Database Import?",
      "Warning: Importing this backup will permanently overwrite your current accounts, vouchers, and settings. Are you sure you want to proceed?",
      () => {
        localStorage.removeItem('accounting_is_wiped_empty');
        const nextAccounts = recalculateBalances(importedData.accounts, importedData.vouchers);
        setAccounts(nextAccounts);
        setVouchers(importedData.vouchers);
        
        saveToLocalStorage('accounting_accounts', nextAccounts);
        saveToLocalStorage('accounting_vouchers', importedData.vouchers);

        if (importedData.settings) {
          if (importedData.settings.role) {
            setRole(importedData.settings.role);
            saveToLocalStorage('accounting_role', importedData.settings.role);
          }
          if (importedData.settings.theme) {
            setTheme(importedData.settings.theme);
            saveToLocalStorage('accounting_theme', importedData.settings.theme);
            if (importedData.settings.theme === 'dark') {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          }
        }

        showToast("Data imported successfully.", "success");
      }
    );
  };

  // Factory Database Reset
  const handleResetDatabase = () => {
    openConfirmModal(
      "Reset Entire Ledger?",
      "Are you sure you want to restore all initial mock data? This resets the transaction log and wipes accounts to default balances.",
      () => {
        localStorage.removeItem('accounting_is_wiped_empty');
        localStorage.removeItem('accounting_accounts');
        localStorage.removeItem('accounting_vouchers');
        const loadedData = initializeStorage();
        setAccounts(loadedData.accounts);
        setVouchers(loadedData.vouchers);
        setActiveTab('home');
        showToast("Ledger Database Reset Completed", "success");
      }
    );
  };

  // Completely wipe the database empty (password verified)
  const handleWipeDatabaseSuccess = () => {
    localStorage.setItem('accounting_is_wiped_empty', 'true');
    saveToLocalStorage('accounting_accounts', []);
    saveToLocalStorage('accounting_vouchers', []);
    setAccounts([]);
    setVouchers([]);
    setActiveTab('home');
    showToast("Ledger Database Completely Wiped. All balances are zero.", "success");
  };

  // Persist settings on changes
  const updateRole = (newRole: UserRole) => {
    setRole(newRole);
    saveToLocalStorage('accounting_role', newRole);
  };

  const updateTheme = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    saveToLocalStorage('accounting_theme', newTheme);
  };

  // Compute active screen
  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return <DashboardTab accounts={accounts} vouchers={vouchers} />;
      case 'accounts':
        return (
          <AccountsTab
            accounts={accounts}
            role={role}
            onCreateAccount={handleCreateAccount}
            onUpdateAccount={handleUpdateAccount}
            onDeleteAccount={handleDeleteAccount}
            onPinToggle={handlePinToggle}
            showToast={showToast}
            openConfirmModal={openConfirmModal}
          />
        );
      case 'vouchers':
        return (
          <VouchersTab
            vouchers={vouchers}
            accounts={accounts}
            role={role}
            onCreateVoucher={handleCreateVoucher}
            onUpdateVoucher={handleUpdateVoucher}
            onDeleteVoucher={handleDeleteVoucher}
            showToast={showToast}
            openConfirmModal={openConfirmModal}
          />
        );
      case 'reports':
        return (
          <ReportsTab 
            accounts={accounts} 
            vouchers={vouchers} 
            showToast={showToast} 
          />
        );
      case 'settings':
        return (
          <SettingsTab
            role={role}
            setRole={updateRole}
            theme={theme}
            setTheme={updateTheme}
            onResetDatabase={handleResetDatabase}
            onCompletelyWipeDatabase={() => setIsPasswordModalOpen(true)}
            onExportDatabase={handleExportDatabase}
            onImportDatabase={handleImportDatabase}
            showToast={showToast}
          />
        );
      default:
        return <DashboardTab accounts={accounts} vouchers={vouchers} />;
    }
  };

  return (
    <div className="min-h-screen bg-white text-black dark:bg-gray-950 dark:text-gray-100 font-sans pb-24 transition-colors duration-300">
      
      {/* Dynamic Toast Container */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Reusable Confirm Modal */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={closeConfirmModal}
      />

      {/* Admin Password Prompt Modal for complete wipe */}
      <PasswordPromptModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSuccess={handleWipeDatabaseSuccess}
        title="Completely Wipe Database"
        message="Warning: This action will completely empty the ledger database, deleting all transactions and accounts permanently. Enter the 4-digit PIN to proceed."
        showToast={showToast}
      />

      {/* Top Professional Header (responsive & sleek) */}
      <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3.5 no-print" id="app-header">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl text-white shadow-md">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-gray-900 dark:text-gray-100 uppercase">
                Finance Tracker
              </h1>
            </div>
          </div>

          {/* User metadata & Role status badges (No personal info allowed) */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Privilege status badge */}
            <div 
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold uppercase transition-colors ${
                role === UserRole.ADMIN 
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40' 
                  : 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40'
              }`}
              id="header-privilege-badge"
            >
              {role === UserRole.ADMIN ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Admin Mode</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>User Mode</span>
                </>
              )}
            </div>
          </div>

        </div>
      </header>

      {/* Primary Tab Viewport layout wrapper */}
      <main className="max-w-6xl mx-auto px-4 py-6" id="app-viewport">
        {renderTabContent()}
      </main>

      {/* Sticky bottom nav */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

    </div>
  );
}
