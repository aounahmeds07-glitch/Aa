/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Account, Voucher, AccountType, ActivityLogItem } from './types';

// Helper to generate IDs
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// Format currency (no symbol)
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

// Generate sequential voucher numbers (V-000001)
export function generateVoucherNumber(existingVouchers: Voucher[]): string {
  if (existingVouchers.length === 0) {
    return 'V-000001';
  }
  
  // Extract number parts and find max
  const numbers = existingVouchers.map(v => {
    const match = v.voucherNo.match(/V-(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  });
  
  const maxNum = Math.max(...numbers, 0);
  const nextNum = maxNum + 1;
  return `V-${String(nextNum).padStart(6, '0')}`;
}

// Default initial accounts for professional feel
const DEFAULT_ACCOUNTS: Account[] = [
  {
    id: 'acc-cash',
    name: 'Cash on Hand',
    type: AccountType.CASH,
    openingBalance: 12500,
    currentBalance: 12500,
    isPinned: true,
    balanceDirection: 'none',
    code: '1010',
    category: 'Liquid Assets'
  },
  {
    id: 'acc-bank',
    name: 'Main Bank Account',
    type: AccountType.BANK,
    openingBalance: 45000,
    currentBalance: 45000,
    isPinned: true,
    balanceDirection: 'none',
    code: '1020',
    mobileNumber: '111-222-3333',
    category: 'Bank Accounts'
  },
  {
    id: 'acc-rent',
    name: 'Office Rent Expense',
    type: AccountType.EXPENSE,
    openingBalance: 0,
    currentBalance: 0,
    isPinned: false,
    balanceDirection: 'none',
    code: '5010',
    category: 'Operating Expenses'
  },
  {
    id: 'acc-sales',
    name: 'Software Sales Income',
    type: AccountType.INCOME,
    openingBalance: 0,
    currentBalance: 0,
    isPinned: false,
    balanceDirection: 'none',
    code: '4010',
    category: 'Revenue'
  },
  {
    id: 'acc-furniture',
    name: 'Office Furniture Asset',
    type: AccountType.ASSET,
    openingBalance: 6500,
    currentBalance: 6500,
    isPinned: false,
    balanceDirection: 'none',
    code: '1510',
    category: 'Fixed Assets'
  }
];

// Default initial vouchers
const DEFAULT_VOUCHERS: Voucher[] = [
  {
    id: 'v-1',
    voucherNo: 'V-000001',
    date: '2026-06-15',
    time: '10:30',
    entries: [
      { id: 've-1-1', accountId: 'acc-rent', description: 'Paid June office rent', credit: 0, debit: 3500 },
      { id: 've-1-2', accountId: 'acc-bank', description: 'Paid June office rent', credit: 3500, debit: 0 }
    ],
    totalAmount: 3500
  },
  {
    id: 'v-2',
    voucherNo: 'V-000002',
    date: '2026-06-18',
    time: '14:15',
    entries: [
      { id: 've-2-1', accountId: 'acc-bank', description: 'Software product sales license invoice', credit: 0, debit: 12800 },
      { id: 've-2-2', accountId: 'acc-sales', description: 'Software product sales license invoice', credit: 12800, debit: 0 }
    ],
    totalAmount: 12800
  },
  {
    id: 'v-3',
    voucherNo: 'V-000003',
    date: '2026-06-22',
    time: '11:00',
    entries: [
      { id: 've-3-1', accountId: 'acc-cash', description: 'Cash withdraw for utility petty cash', credit: 0, debit: 1500 },
      { id: 've-3-2', accountId: 'acc-bank', description: 'Cash withdraw for utility petty cash', credit: 1500, debit: 0 }
    ],
    totalAmount: 1500
  }
];

// Recalculates all account current balances starting from opening balances
// This guarantees absolute consistency on additions, deletions, or edits.
export function recalculateBalances(accounts: Account[], vouchers: Voucher[]): Account[] {
  // Reset all to opening balances and direction 'none'
  const updatedAccounts = accounts.map(acc => ({
    ...acc,
    currentBalance: acc.openingBalance,
    balanceDirection: 'none' as 'up' | 'down' | 'none',
    lastActivityDate: undefined as string | undefined
  }));

  // Sort vouchers chronologically
  const sortedVouchers = [...vouchers].sort((a, b) => {
    const dateTimeA = `${a.date}T${a.time}`;
    const dateTimeB = `${b.date}T${b.time}`;
    return dateTimeA.localeCompare(dateTimeB);
  });

  // Apply each voucher transaction
  sortedVouchers.forEach(v => {
    v.entries.forEach(entry => {
      const accountIdx = updatedAccounts.findIndex(acc => acc.id === entry.accountId);
      if (accountIdx !== -1) {
        const acc = updatedAccounts[accountIdx];
        const prevBalance = acc.currentBalance;
        
        // Debit increases, Credit decreases
        const balanceChange = entry.debit - entry.credit;
        acc.currentBalance += balanceChange;
        
        // Track last activity date
        acc.lastActivityDate = v.date;

        // Set direction indicator
        if (balanceChange > 0) {
          acc.balanceDirection = 'up';
        } else if (balanceChange < 0) {
          acc.balanceDirection = 'down';
        }
      }
    });
  });

  return updatedAccounts;
}

// Generate Activity Logs from Vouchers, sorting newest first
export function generateActivityLogs(vouchers: Voucher[], accounts: Account[]): ActivityLogItem[] {
  const items: ActivityLogItem[] = [];
  const accountMap = new Map(accounts.map(a => [a.id, a.name]));

  vouchers.forEach(v => {
    v.entries.forEach(entry => {
      items.push({
        id: `${v.id}-${entry.id}`,
        date: v.date,
        time: v.time,
        voucherNo: v.voucherNo,
        accountId: entry.accountId,
        accountName: accountMap.get(entry.accountId) || 'Unknown Account',
        description: entry.description,
        credit: entry.credit,
        debit: entry.debit
      });
    });
  });

  // Sort newest first: primary by date, secondary by time, tertiary by voucherNo
  return items.sort((a, b) => {
    const dateTimeA = `${a.date}T${a.time}`;
    const dateTimeB = `${b.date}T${b.time}`;
    if (dateTimeA !== dateTimeB) {
      return dateTimeB.localeCompare(dateTimeA);
    }
    return b.voucherNo.localeCompare(a.voucherNo);
  });
}

// LocalStorage helpers
export function loadFromLocalStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error loading key "${key}" from localStorage:`, error);
    return defaultValue;
  }
}

export function saveToLocalStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving key "${key}" to localStorage:`, error);
  }
}

// Initial storage setup
export function initializeStorage() {
  const accounts = loadFromLocalStorage<Account[]>('accounting_accounts', []);
  const vouchers = loadFromLocalStorage<Voucher[]>('accounting_vouchers', []);
  const hasBeenWiped = localStorage.getItem('accounting_is_wiped_empty') === 'true';

  if (accounts.length === 0 && vouchers.length === 0 && !hasBeenWiped) {
    // Inject defaults
    const recAccounts = recalculateBalances(DEFAULT_ACCOUNTS, DEFAULT_VOUCHERS);
    saveToLocalStorage('accounting_accounts', recAccounts);
    saveToLocalStorage('accounting_vouchers', DEFAULT_VOUCHERS);
    return { accounts: recAccounts, vouchers: DEFAULT_VOUCHERS };
  }

  // Ensure balances are synchronized
  const synchronizedAccounts = recalculateBalances(accounts, vouchers);
  saveToLocalStorage('accounting_accounts', synchronizedAccounts);

  return { accounts: synchronizedAccounts, vouchers };
}
