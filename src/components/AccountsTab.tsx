/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent } from 'react';
import { Search, Plus, Edit2, Trash2, Pin, PinOff, X, HelpCircle } from 'lucide-react';
import { Account, AccountType, UserRole } from '../types';
import { formatCurrency, generateId } from '../utils';

interface AccountsTabProps {
  accounts: Account[];
  role: UserRole;
  onCreateAccount: (account: Omit<Account, 'currentBalance' | 'isPinned' | 'balanceDirection'>) => void;
  onUpdateAccount: (account: Account) => void;
  onDeleteAccount: (id: string) => void;
  onPinToggle: (id: string) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  openConfirmModal: (title: string, msg: string, onConfirm: () => void) => void;
}

export default function AccountsTab({
  accounts,
  role,
  onCreateAccount,
  onUpdateAccount,
  onDeleteAccount,
  onPinToggle,
  showToast,
  openConfirmModal
}: AccountsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>(AccountType.CASH);
  const [openingBalance, setOpeningBalance] = useState<number | ''>('');
  const [code, setCode] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [category, setCategory] = useState('');

  // Handle opening form
  const handleOpenCreateForm = () => {
    if (role !== UserRole.ADMIN) {
      showToast("Admin permission required.", "error");
      return;
    }
    setEditingAccount(null);
    setName('');
    setType(AccountType.CASH);
    setOpeningBalance('');
    setCode('');
    setMobileNumber('');
    setCategory('');
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (account: Account) => {
    if (role !== UserRole.ADMIN) {
      showToast("Admin permission required.", "error");
      return;
    }
    setEditingAccount(account);
    setName(account.name);
    setType(account.type);
    setOpeningBalance(account.openingBalance);
    setCode(account.code || '');
    setMobileNumber(account.mobileNumber || '');
    setCategory(account.category || '');
    setIsFormOpen(true);
  };

  // Handle Pin/Unpin
  const handlePinClick = (id: string) => {
    if (role !== UserRole.ADMIN) {
      showToast("Admin permission required.", "error");
      return;
    }
    onPinToggle(id);
  };

  // Handle Delete with Modal check
  const handleDeleteClick = (account: Account) => {
    if (role !== UserRole.ADMIN) {
      showToast("Admin permission required.", "error");
      return;
    }
    openConfirmModal(
      "Delete Account?",
      `Are you sure you want to delete "${account.name}"? This action cannot be undone and will affect any vouchers associated with this account.`,
      () => {
        onDeleteAccount(account.id);
      }
    );
  };

  // Form submission
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (role !== UserRole.ADMIN) {
      showToast("Admin permission required.", "error");
      return;
    }

    // Validation
    if (!name.trim()) {
      showToast("Account name is required.", "warning");
      return;
    }
    if (openingBalance === '') {
      showToast("Opening balance is required.", "warning");
      return;
    }

    const parsedBalance = parseFloat(openingBalance.toString());
    if (isNaN(parsedBalance)) {
      showToast("Opening balance must be a number.", "warning");
      return;
    }

    if (editingAccount) {
      // Edit account
      onUpdateAccount({
        ...editingAccount,
        name: name.trim(),
        type,
        openingBalance: parsedBalance,
        code: code.trim() || undefined,
        mobileNumber: mobileNumber.trim() || undefined,
        category: category.trim() || undefined
      });
    } else {
      // Create account
      onCreateAccount({
        id: 'acc-' + generateId(),
        name: name.trim(),
        type,
        openingBalance: parsedBalance,
        code: code.trim() || undefined,
        mobileNumber: mobileNumber.trim() || undefined,
        category: category.trim() || undefined
      });
    }

    setIsFormOpen(false);
  };

  // Filter accounts
  const filteredAccounts = accounts.filter(acc =>
    acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    acc.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (acc.code && acc.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (acc.mobileNumber && acc.mobileNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (acc.category && acc.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fade-in" id="accounts-tab">
      
      {/* Header with Search and Create Button */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center" id="accounts-header">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by account name or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-white/50 dark:bg-gray-900/40 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            id="search-accounts-input"
          />
        </div>
        
        <button
          onClick={handleOpenCreateForm}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 active:scale-95 text-white font-medium text-sm rounded-xl transition-all shadow-sm cursor-pointer"
          id="btn-create-account"
        >
          <Plus className="w-4 h-4" />
          <span>Create Account</span>
        </button>
      </div>

      {/* Grid listing */}
      {filteredAccounts.length === 0 ? (
        <div className="glass-card p-12 text-center rounded-2xl border-dashed border-2" id="no-accounts-found">
          <HelpCircle className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No accounts found</p>
          <p className="text-xs text-gray-400 mt-1">Try refining your search or create a new account.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" id="accounts-grid">
          {filteredAccounts.map((acc) => (
            <div
              key={acc.id}
              className="glass-card p-4 rounded-2xl border border-gray-100 dark:border-gray-800/40 hover:shadow-md transition-all flex flex-col justify-between group"
              id={`account-card-${acc.id}`}
            >
              <div>
                <div className="flex justify-between items-start">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">
                    {acc.type}
                  </span>
                  
                  {/* Action buttons (Pin, Edit, Delete) */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handlePinClick(acc.id)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        acc.isPinned
                          ? 'text-blue-500 bg-blue-50 dark:bg-blue-950/40'
                          : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/40'
                      }`}
                      title={acc.isPinned ? "Unpin Account" : "Pin Account"}
                      id={`btn-pin-${acc.id}`}
                    >
                      {acc.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                    </button>
                    
                    <button
                      onClick={() => handleOpenEditForm(acc)}
                      className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors cursor-pointer"
                      title="Edit Account"
                      id={`btn-edit-acc-${acc.id}`}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    
                    <button
                      onClick={() => handleDeleteClick(acc)}
                      className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                      title="Delete Account"
                      id={`btn-delete-acc-${acc.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  {acc.code && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-800/50">
                      {acc.code}
                    </span>
                  )}
                  {acc.category && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-800/30">
                      {acc.category}
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mt-2 truncate" title={acc.name}>
                  {acc.name}
                </h3>
                {acc.mobileNumber && (
                  <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 mt-1">
                    Tel: {acc.mobileNumber}
                  </p>
                )}
              </div>

              {/* Balances */}
              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800/40 flex justify-between items-end">
                <div>
                  <p className="text-[9px] uppercase font-medium text-gray-400">Opening Balance</p>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-0.5">
                    {formatCurrency(acc.openingBalance)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] uppercase font-medium text-gray-400">Current Balance</p>
                  <p className="text-base font-bold text-gray-800 dark:text-gray-200 mt-0.5">
                    {formatCurrency(acc.currentBalance)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Slide-out Overlay Form (Drawer/Modal) */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex justify-end no-print" id="account-form-overlay">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-gray-950/30 backdrop-blur-xs transition-opacity"
            onClick={() => setIsFormOpen(false)}
          />

          {/* Form Container */}
          <div
            className="relative w-full max-w-md bg-white dark:bg-gray-900 border-l border-gray-100 dark:border-gray-800/40 p-6 flex flex-col shadow-2xl z-10 animate-slide-in-right"
            id="account-form-drawer"
          >
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800/40">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {editingAccount ? 'Edit Account' : 'Create New Account'}
              </h2>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors cursor-pointer"
                id="btn-close-form-drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 mt-6 flex-1 flex flex-col justify-between" id="account-form">
              <div className="space-y-4">
                {/* Account Name */}
                <div>
                  <label htmlFor="account-name" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Account Name
                  </label>
                  <input
                    type="text"
                    id="account-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Petty Cash Box, HBL Bank, Rent Expense"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    required
                  />
                </div>

                {/* Account Type Selection */}
                <div>
                  <label htmlFor="account-type" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Account Type
                  </label>
                  <select
                    id="account-type"
                    value={type}
                    onChange={(e) => setType(e.target.value as AccountType)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  >
                    {Object.values(AccountType).map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Opening Balance */}
                <div>
                  <label htmlFor="opening-balance" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Opening Balance
                  </label>
                  <input
                    type="number"
                    id="opening-balance"
                    step="0.01"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    required
                  />
                  <p className="text-[10px] text-gray-400 mt-1.5 leading-relaxed">
                    Opening balance of the ledger. Can be zero. Debit transactions increase it; credit transactions decrease it.
                  </p>
                </div>

                {/* Account Code */}
                <div>
                  <label htmlFor="account-code" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Account Code (Optional)
                  </label>
                  <input
                    type="text"
                    id="account-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. 1010, 5010, AR-01"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                {/* Account Category */}
                <div>
                  <label htmlFor="account-category" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Account Category / Sub-Group (Optional)
                  </label>
                  <input
                    type="text"
                    id="account-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Current Assets, Revenues, Utilities, Customers"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                {/* Mobile Number */}
                <div>
                  <label htmlFor="account-mobile" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Mobile / Contact Number (Optional)
                  </label>
                  <input
                    type="text"
                    id="account-mobile"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    placeholder="e.g. 0300-1234567, +12345678"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800/40 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
                  id="btn-cancel-account-form"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 active:scale-95 text-sm font-semibold text-white rounded-xl shadow-md transition-all cursor-pointer"
                  id="btn-submit-account-form"
                >
                  {editingAccount ? 'Update Account' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
