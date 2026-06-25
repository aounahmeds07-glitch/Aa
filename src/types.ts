/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum AccountType {
  CASH = "Cash",
  BANK = "Bank",
  EXPENSE = "Expense",
  INCOME = "Income",
  ASSET = "Asset",
  LIABILITY = "Liability",
  EQUITY = "Equity"
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  openingBalance: number;
  currentBalance: number;
  isPinned: boolean;
  lastActivityDate?: string;
  balanceDirection?: 'up' | 'down' | 'none';
  code?: string;
  mobileNumber?: string;
  category?: string;
}

export interface VoucherEntry {
  id: string; // React list key
  accountId: string;
  description: string;
  credit: number;
  debit: number;
}

export interface Voucher {
  id: string;
  voucherNo: string; // V-000001, etc.
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  entries: VoucherEntry[];
  totalAmount: number; // Sum of debits (which equals sum of credits)
}

export interface ActivityLogItem {
  id: string;
  date: string;
  time: string;
  voucherNo: string;
  accountId: string;
  accountName: string;
  description: string;
  credit: number;
  debit: number;
}

export enum UserRole {
  USER = "USER",
  ADMIN = "ADMIN"
}

export interface AppSettings {
  role: UserRole;
  theme: 'light' | 'dark';
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}
