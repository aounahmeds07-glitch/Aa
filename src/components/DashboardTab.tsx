/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Wallet, FileSpreadsheet, ArrowUpRight, ArrowDownLeft, Pin, ClipboardList, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Account, Voucher, ActivityLogItem } from '../types';
import { formatCurrency, generateActivityLogs } from '../utils';

interface DashboardTabProps {
  accounts: Account[];
  vouchers: Voucher[];
}

export default function DashboardTab({ accounts, vouchers }: DashboardTabProps) {
  // Compute Stats
  const totalAccounts = accounts.length;
  const totalVouchers = vouchers.length;

  // Calculate Total Credits & Debits across all vouchers
  let totalCredits = 0;
  let totalDebits = 0;
  vouchers.forEach(v => {
    v.entries.forEach(entry => {
      totalCredits += entry.credit;
      totalDebits += entry.debit;
    });
  });

  // Filter pinned accounts
  const pinnedAccounts = accounts.filter(acc => acc.isPinned);

  // Generate recent activity logs (sorted newest first)
  const activityLogs = generateActivityLogs(vouchers, accounts);
  const recentActivities = activityLogs.slice(0, 10); // show top 10

  return (
    <div className="space-y-6 animate-fade-in" id="dashboard-tab">
      
      {/* Dynamic Statistics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="stats-grid">
        <div className="glass-card p-4 rounded-2xl flex flex-col justify-between" id="stat-total-accounts">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Accounts</span>
            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalAccounts}</h3>
            <p className="text-[10px] text-gray-400 mt-1">Active Ledgers</p>
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl flex flex-col justify-between" id="stat-total-vouchers">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Vouchers</span>
            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalVouchers}</h3>
            <p className="text-[10px] text-gray-400 mt-1">Posted Journals</p>
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl flex flex-col justify-between" id="stat-total-credits">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Credits</span>
            <div className="p-2 bg-rose-500/10 rounded-xl text-rose-500">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-bold text-rose-600 dark:text-rose-400 truncate">
              {formatCurrency(totalCredits)}
            </h3>
            <p className="text-[10px] text-gray-400 mt-1">Total Decreases</p>
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl flex flex-col justify-between" id="stat-total-debits">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Debits</span>
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 truncate">
              {formatCurrency(totalDebits)}
            </h3>
            <p className="text-[10px] text-gray-400 mt-1">Total Increases</p>
          </div>
        </div>
      </div>

      {/* Pinned Accounts Grid */}
      <div id="pinned-accounts-section" className="space-y-3">
        <div className="flex items-center gap-2">
          <Pin className="w-4 h-4 text-blue-500 rotate-45" />
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Pinned Accounts</h2>
        </div>
        
        {pinnedAccounts.length === 0 ? (
          <div className="glass-card p-6 rounded-2xl text-center border-dashed" id="no-pinned-accounts">
            <p className="text-sm text-gray-400">No pinned accounts. Go to the <span className="font-semibold text-blue-500">Accounts</span> tab to pin crucial ledgers here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" id="pinned-accounts-grid">
            {pinnedAccounts.map((acc) => {
              // Decide direction elements
              let indicatorColor = 'text-gray-400 bg-gray-100 dark:bg-gray-800';
              let IndicatorIcon = Minus;
              let indicatorText = 'No recent activity';

              if (acc.balanceDirection === 'up') {
                indicatorColor = 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30';
                IndicatorIcon = TrendingUp;
                indicatorText = 'Balance increased';
              } else if (acc.balanceDirection === 'down') {
                indicatorColor = 'text-rose-600 bg-rose-50 dark:bg-rose-950/30';
                IndicatorIcon = TrendingDown;
                indicatorText = 'Balance decreased';
              }

              return (
                <div 
                  key={acc.id} 
                  className="glass-card p-4 rounded-2xl relative overflow-hidden border-l-4 border-l-blue-500 flex flex-col justify-between h-36"
                  id={`pinned-card-${acc.id}`}
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate pr-16">
                        {acc.name}
                      </h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-medium shrink-0">
                        {acc.type}
                      </span>
                    </div>
                    <p className="text-xl font-bold mt-2 text-gray-800 dark:text-gray-200">
                      {formatCurrency(acc.currentBalance)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs mt-3 pt-2 border-t border-gray-100 dark:border-gray-800/40">
                    <span className="text-[10px] text-gray-400 shrink-0">
                      {acc.lastActivityDate ? `Activity: ${acc.lastActivityDate}` : 'No activity'}
                    </span>
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold ${indicatorColor}`}>
                      <IndicatorIcon className="w-3 h-3" />
                      <span>{indicatorText}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Activity Log */}
      <div id="activity-log-section" className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-blue-500" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Activity Log</h2>
          </div>
          <span className="text-xs text-gray-400">Showing last 10 activities</span>
        </div>

        {recentActivities.length === 0 ? (
          <div className="glass-card p-8 rounded-2xl text-center" id="no-activities">
            <p className="text-sm text-gray-400">No recent transactions recorded. Create a <span className="font-semibold text-blue-500">Voucher</span> to populate activities.</p>
          </div>
        ) : (
          <div className="glass-card rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800/40" id="activities-table-container">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse" id="activities-table">
                <thead>
                  <tr className="bg-gray-50/75 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800/50">
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Voucher No</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Account</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Debit (DR)</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Credit (CR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40">
                  {recentActivities.map((log) => (
                    <tr 
                      key={log.id} 
                      className="hover:bg-gray-50/40 dark:hover:bg-gray-800/20 transition-colors text-sm"
                      id={`activity-row-${log.id}`}
                    >
                      <td className="py-3 px-4 whitespace-nowrap text-gray-500 dark:text-gray-400 text-xs">
                        {log.date} <span className="text-[10px] text-gray-400 ml-1">{log.time}</span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-mono font-semibold text-blue-600 dark:text-blue-400 text-xs">
                        {log.voucherNo}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-medium text-gray-800 dark:text-gray-200">
                        {log.accountName}
                      </td>
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400 text-xs max-w-xs truncate" title={log.description}>
                        {log.description}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                        {log.debit > 0 ? formatCurrency(log.debit) : formatCurrency(0)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-right text-rose-600 dark:text-rose-400 font-semibold">
                        {log.credit > 0 ? formatCurrency(log.credit) : formatCurrency(0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
