/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from 'react';
import { Search, RefreshCw, Download, FileSpreadsheet, ArrowLeft, ArrowRight, Table, Landmark, AlertCircle } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Account, Voucher, AccountType } from '../types';
import { formatCurrency, generateActivityLogs } from '../utils';
import AccountSelector from './AccountSelector';

interface ReportsTabProps {
  accounts: Account[];
  vouchers: Voucher[];
  showToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function ReportsTab({ accounts, vouchers, showToast }: ReportsTabProps) {
  // Helper to get today's date in YYYY-MM-DD
  const getTodayDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Filter States
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>(getTodayDateString);
  const [dateTo, setDateTo] = useState<string>(getTodayDateString);

  // Search compilation gate state
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  // Report Search (Highlight) & Pagination states
  const [highlightQuery, setHighlightQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Reset filters
  const handleResetFilters = () => {
    setFilterAccount('all');
    setFilterType('all');
    const today = getTodayDateString();
    setDateFrom(today);
    setDateTo(today);
    setHighlightQuery('');
    setCurrentPage(1);
    setHasSearched(false);
    showToast("Report filters refreshed", "info");
  };

  // Refresh report data preserving all existing filter values
  const handleRefresh = () => {
    // Keep all state variables exactly as is. Just re-run/trigger search and notify user.
    setHasSearched(true);
    showToast("Report compiled with existing filters", "success");
  };

  // Compile Report Data
  const reportData = useMemo(() => {
    // Determine target accounts based on filters
    let targetAccounts = [...accounts];
    if (filterAccount !== 'all') {
      targetAccounts = targetAccounts.filter(a => a.id === filterAccount);
    }
    if (filterType !== 'all') {
      targetAccounts = targetAccounts.filter(a => a.type === filterType);
    }
    const targetAccountIds = new Set(targetAccounts.map(a => a.id));

    // Calculate Opening Balance
    // Sum of openingBalances of target accounts + all transactions before dateFrom
    let openingBalance = targetAccounts.reduce((sum, a) => sum + a.openingBalance, 0);

    // Get all vouchers chronologically
    const sortedVouchers = [...vouchers].sort((a, b) => {
      return `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`);
    });

    // Separate transaction logs inside the date range vs before dateFrom
    const earlyLogs: { debit: number; credit: number; accountId: string }[] = [];
    const mainLogs: {
      id: string;
      date: string;
      time: string;
      voucherNo: string;
      accountName: string;
      description: string;
      debit: number;
      credit: number;
    }[] = [];

    sortedVouchers.forEach(v => {
      const isBeforeStart = dateFrom && v.date < dateFrom;
      const isAfterEnd = dateTo && v.date > dateTo;

      v.entries.forEach(entry => {
        // If entry is not part of filtered accounts, skip
        if (!targetAccountIds.has(entry.accountId)) return;

        const accName = accounts.find(a => a.id === entry.accountId)?.name || 'Unknown Ledger';

        if (isBeforeStart) {
          earlyLogs.push({
            debit: entry.debit,
            credit: entry.credit,
            accountId: entry.accountId
          });
        } else if (!isAfterEnd) {
          mainLogs.push({
            id: `${v.id}-${entry.id}`,
            date: v.date,
            time: v.time,
            voucherNo: v.voucherNo,
            accountName: accName,
            description: entry.description,
            debit: entry.debit,
            credit: entry.credit
          });
        }
      });
    });

    // Add early transactions to Opening Balance
    earlyLogs.forEach(log => {
      openingBalance += (log.debit - log.credit);
    });

    // Compute transaction lines with running balances
    let currentRunning = openingBalance;
    let totalDebit = 0;
    let totalCredit = 0;

    const transactionLines = mainLogs.map(log => {
      currentRunning += (log.debit - log.credit);
      totalDebit += log.debit;
      totalCredit += log.credit;

      return {
        ...log,
        runningBalance: currentRunning
      };
    });

    const closingBalance = openingBalance + totalDebit - totalCredit;

    return {
      openingBalance,
      transactionLines,
      totalDebit,
      totalCredit,
      closingBalance
    };
  }, [accounts, vouchers, filterAccount, filterType, dateFrom, dateTo]);

  // Always validate report totals before displaying report
  useEffect(() => {
    if (hasSearched) {
      const expectedClosing = reportData.openingBalance + reportData.totalDebit - reportData.totalCredit;
      const discrepancy = Math.abs(reportData.closingBalance - expectedClosing);
      if (discrepancy > 0.001) {
        showToast("Report calculation mismatch detected.", "warning");
      }
    }
  }, [reportData, hasSearched, showToast]);

  // Handle Search Highlighting helper
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const parts = text.split(new RegExp(`(${query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() 
            ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-500/40 text-gray-900 rounded-sm px-0.5 font-semibold">{part}</mark> 
            : part
        )}
      </>
    );
  };

  // Pagination math on filtered report
  const paginatedLines = useMemo(() => {
    const startIdx = (currentPage - 1) * rowsPerPage;
    return reportData.transactionLines.slice(startIdx, startIdx + rowsPerPage);
  }, [reportData.transactionLines, currentPage]);

  const totalPages = Math.max(1, Math.ceil(reportData.transactionLines.length / rowsPerPage));

  // Export to Excel-compatible CSV format
  const handleExportXLS = () => {
    try {
      // Create headers
      let csvContent = "PROFESSIONAL ACCOUNTING LEDGER REPORT\n";
      csvContent += `Generated Date: ${new Date().toISOString().slice(0, 10)}\n`;
      csvContent += `Filters - Ledger Account: ${filterAccount !== 'all' ? accounts.find(a => a.id === filterAccount)?.name : 'All Accounts'}, Type: ${filterType}, Range: ${dateFrom || 'Inception'} to ${dateTo || 'Present'}\n\n`;
      
      csvContent += "Date,Voucher No,Description,Debit,Credit,Running Balance\n";
      
      // Opening Balance Row
      csvContent += `—,Opening Balance,Initial ledger positioning,0.00,0.00,${reportData.openingBalance.toFixed(2)}\n`;

      // Transaction Rows
      reportData.transactionLines.forEach(line => {
        const desc = line.description.replace(/"/g, '""');
        csvContent += `${line.date},${line.voucherNo},"${desc}",${line.debit.toFixed(2)},${line.credit.toFixed(2)},${line.runningBalance.toFixed(2)}\n`;
      });

      // Closing Balance Row
      csvContent += `—,Closing Balance,Final ledger positioning,${reportData.totalDebit.toFixed(2)},${reportData.totalCredit.toFixed(2)},${reportData.closingBalance.toFixed(2)}\n`;

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Ledger_Report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast("Report Exported Successfully", "success");
    } catch (e) {
      showToast("Failed to export Excel report", "error");
    }
  };

  // Export to professionally formatted PDF
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      });

      // Add Document Header
      doc.setFillColor(30, 41, 59); // Slate-800
      doc.rect(0, 0, 210, 40, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text("FINANCE TRACKER", 15, 16);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text("Professional Finance Tracker", 15, 22);
      
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.text(`Generated: ${new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC`, 15, 30);

      // Top-right header info (Report Metadata)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text("LEDGER REPORT", 140, 16);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const selectedAccName = filterAccount !== 'all' ? accounts.find(a => a.id === filterAccount)?.name : 'All Accounts';
      doc.text(`Account: ${selectedAccName}`, 140, 22);
      doc.text(`Type: ${filterType === 'all' ? 'All Types' : filterType}`, 140, 26);
      doc.text(`Period: ${dateFrom} to ${dateTo}`, 140, 30);

      // Section: Summary Box (Cards layout)
      doc.setFillColor(248, 250, 252); // Light Slate background
      doc.rect(15, 48, 180, 25, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(15, 48, 180, 25, 'S');

      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      
      // Headers for summary items
      doc.text("OPENING BALANCE", 20, 54);
      doc.text("TOTAL DEBIT (+)", 65, 54);
      doc.text("TOTAL CREDIT (-)", 110, 54);
      doc.text("CLOSING BALANCE", 155, 54);

      // Values for summary items
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      
      doc.setTextColor(2, 132, 199); // Opening - Blue
      doc.text(formatCurrency(reportData.openingBalance), 20, 64);
      
      doc.setTextColor(22, 163, 74); // Total Debit - Green
      doc.text(formatCurrency(reportData.totalDebit), 65, 64);
      
      doc.setTextColor(220, 38, 38); // Total Credit - Red
      doc.text(formatCurrency(reportData.totalCredit), 110, 64);
      
      doc.setTextColor(15, 23, 42); // Closing - Slate-900
      doc.text(formatCurrency(reportData.closingBalance), 155, 64);

      // Transaction Lines Table
      const headers = [["Date", "Voucher No", "Description", "Debit", "Credit", "Running Balance"]];
      
      const rows = [
        // Opening Row
        [
          "—",
          "OPENING",
          "Initial position before selected period",
          formatCurrency(0),
          formatCurrency(0),
          formatCurrency(reportData.openingBalance)
        ],
        // Transaction Rows
        ...reportData.transactionLines.map(line => [
          line.date,
          line.voucherNo,
          line.description,
          line.debit > 0 ? formatCurrency(line.debit) : formatCurrency(0),
          line.credit > 0 ? formatCurrency(line.credit) : formatCurrency(0),
          formatCurrency(line.runningBalance)
        ]),
        // Closing Row
        [
          "—",
          "CLOSING",
          "Final ledger positioning after transactions",
          formatCurrency(reportData.totalDebit),
          formatCurrency(reportData.totalCredit),
          formatCurrency(reportData.closingBalance)
        ]
      ];

      autoTable(doc, {
        head: headers,
        body: rows,
        startY: 80,
        margin: { left: 15, right: 15 },
        theme: 'striped',
        headStyles: {
          fillColor: [30, 41, 59], // Slate-800
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: 'bold',
          halign: 'left'
        },
        columnStyles: {
          0: { cellWidth: 22 }, // Date
          1: { cellWidth: 25 }, // Voucher No
          2: { cellWidth: 'auto' }, // Description
          3: { cellWidth: 28, halign: 'right' }, // Debit
          4: { cellWidth: 28, halign: 'right' }, // Credit
          5: { cellWidth: 32, halign: 'right' }  // Running Balance
        },
        styles: {
          fontSize: 8.5,
          cellPadding: 3,
          valign: 'middle'
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252] // Light gray-slate alternating rows
        },
        didParseCell: (data: any) => {
          // Highlight opening/closing summary rows with custom weights
          if (data.row.index === 0 || data.row.index === rows.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            if (data.row.index === rows.length - 1) {
              data.cell.styles.fillColor = [241, 245, 249]; // Slate-100 highlight for final closing
            }
          }
        }
      });

      // Download the generated PDF
      doc.save(`Ledger_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
      showToast("PDF report generated and downloaded successfully.", "success");
    } catch (error) {
      console.error(error);
      showToast("Failed to generate PDF report.", "error");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" id="reports-tab">
      
      {/* Search Filters Section */}
      <div className="glass-panel p-5 rounded-2xl border space-y-4 no-print" id="reports-filter-panel">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
          Report Parameters
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Account Selection */}
          <div>
            <label htmlFor="filter-account" className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">
              Ledger Account
            </label>
            <AccountSelector
              accounts={accounts}
              value={filterAccount}
              onChange={(val) => { setFilterAccount(val); setCurrentPage(1); }}
              allowAll
              placeholder="Search or select account..."
            />
          </div>

          {/* Account Type selection */}
          <div>
            <label htmlFor="filter-type" className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">
              Account Type
            </label>
            <select
              id="filter-type"
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:outline-none"
            >
              <option value="all">All Types</option>
              {Object.values(AccountType).map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div>
            <label htmlFor="filter-date-from" className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">
              Date From
            </label>
            <input
              type="date"
              id="filter-date-from"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:outline-none"
            />
          </div>

          {/* Date To */}
          <div>
            <label htmlFor="filter-date-to" className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">
              Date To
            </label>
            <input
              type="date"
              id="filter-date-to"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:outline-none"
            />
          </div>
        </div>

        {/* Filters and Export buttons */}
        <div className="pt-2 flex flex-wrap gap-2 justify-between items-center border-t border-gray-100 dark:border-gray-800/40">
          <div className="flex gap-2">
            <button
              onClick={() => {
                setHasSearched(true);
                setCurrentPage(1);
                showToast("Report compiled successfully.", "success");
              }}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 active:scale-95 text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              id="btn-search-report"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search Ledger</span>
            </button>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60 text-gray-600 dark:text-gray-300 font-semibold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              id="btn-refresh-report"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                if (!hasSearched) {
                  showToast("Please compile the report before exporting.", "warning");
                  return;
                }
                handleExportPDF();
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              id="btn-export-pdf"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export PDF</span>
            </button>
            <button
              onClick={() => {
                if (!hasSearched) {
                  showToast("Please compile the report before exporting.", "warning");
                  return;
                }
                handleExportXLS();
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              id="btn-export-xls"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export XLS</span>
            </button>
          </div>
        </div>
      </div>

      {!hasSearched ? (
        <div className="glass-panel p-16 text-center rounded-2xl border-dashed border-2 flex flex-col items-center justify-center space-y-4" id="report-empty-state">
          <div className="p-4 bg-blue-500/10 text-blue-500 rounded-full">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide">Report Ledger Compiling Gate</h3>
            <p className="text-xs text-gray-500 max-w-md font-medium">
              Select filters and press Search to generate report.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3" id="compiled-report-results">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Landmark className="w-4 h-4 text-blue-500" />
            <span>Compiled General Ledger Record</span>
          </h2>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Find inside report table..."
              value={highlightQuery}
              onChange={(e) => setHighlightQuery(e.target.value)}
              className="w-full pl-8 pr-4 py-1.5 rounded-lg border border-gray-200/60 dark:border-gray-800/60 bg-white/50 dark:bg-gray-900/40 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              id="highlight-report-input"
            />
          </div>
        </div>

        {/* PRINTABLE PDF BANNER (Only visible in Print view) */}
        <div className="hidden print:block space-y-2 mb-6" id="printable-pdf-banner">
          <div className="border-b-2 border-gray-900 pb-3">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">FINANCE TRACKER SERVICES</h1>
            <p className="text-sm font-semibold text-gray-500">GENERAL LEDGER REPORT</p>
            <div className="mt-2 text-xs text-gray-400 flex justify-between">
              <span>Date Range: {dateFrom || 'Inception'} to {dateTo || 'Present'}</span>
              <span>Account Filter: {filterAccount !== 'all' ? accounts.find(a => a.id === filterAccount)?.name : 'All Accounts'} ({filterType !== 'all' ? filterType : 'All Types'})</span>
            </div>
          </div>
        </div>

        {/* Compiled Report Table */}
        <div className="glass-card rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800/40" id="report-table-container">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="report-table">
              <thead>
                <tr className="bg-gray-50/75 dark:bg-gray-800/50 border-b border-gray-200/40 dark:border-gray-800/50">
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Voucher No</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Debit (DR)</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Credit (CR)</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40 text-sm">
                
                {/* 1. Opening Balance Row (REQUIRED AT START) */}
                {currentPage === 1 && (
                  <tr className="bg-blue-50/20 dark:bg-blue-950/10 font-medium" id="opening-balance-row">
                    <td className="py-3 px-4 text-xs text-gray-400">—</td>
                    <td className="py-3 px-4 whitespace-nowrap text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                      OPENING BALANCE
                    </td>
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-400 text-xs">
                      Brought forward initial ledger state
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-600/60 dark:text-emerald-400/60 font-medium">{formatCurrency(0)}</td>
                    <td className="py-3 px-4 text-right text-rose-600/60 dark:text-rose-400/60 font-medium">{formatCurrency(0)}</td>
                    <td className="py-3 px-4 text-right font-bold text-gray-800 dark:text-gray-200">
                      {formatCurrency(reportData.openingBalance)}
                    </td>
                  </tr>
                )}

                {/* 2. Transaction Lines (PAGINATED) */}
                {paginatedLines.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-gray-400">
                      No matching transaction journals logged for this period.
                    </td>
                  </tr>
                ) : (
                  paginatedLines.map(line => (
                    <tr 
                      key={line.id} 
                      className="hover:bg-gray-50/30 dark:hover:bg-gray-800/10 transition-colors text-xs"
                      id={`report-line-${line.id}`}
                    >
                      <td className="py-3 px-4 text-gray-400 whitespace-nowrap">
                        {line.date}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                        {highlightText(line.voucherNo, highlightQuery)}
                      </td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300 max-w-sm truncate">
                        <div className="font-semibold text-gray-900 dark:text-gray-100 text-[11px] mb-0.5">
                          {line.accountName}
                        </div>
                        {highlightText(line.description, highlightQuery)}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400 font-semibold whitespace-nowrap">
                        {line.debit > 0 ? highlightText(formatCurrency(line.debit), highlightQuery) : formatCurrency(0)}
                      </td>
                      <td className="py-3 px-4 text-right text-rose-600 dark:text-rose-400 font-semibold whitespace-nowrap">
                        {line.credit > 0 ? highlightText(formatCurrency(line.credit), highlightQuery) : formatCurrency(0)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-gray-800 dark:text-gray-200 whitespace-nowrap">
                        {formatCurrency(line.runningBalance)}
                      </td>
                    </tr>
                  ))
                )}

                {/* 3. Closing Balance Row (REQUIRED AT END) */}
                {currentPage === totalPages && (
                  <tr className="bg-indigo-50/20 dark:bg-indigo-950/10 font-medium" id="closing-balance-row">
                    <td className="py-3 px-4 text-xs text-gray-400">—</td>
                    <td className="py-3 px-4 whitespace-nowrap text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      CLOSING BALANCE
                    </td>
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-400 text-xs">
                      Carry forward ledger accounting state
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400 font-bold">
                      {formatCurrency(reportData.totalDebit)}
                    </td>
                    <td className="py-3 px-4 text-right text-rose-600 dark:text-rose-400 font-bold">
                      {formatCurrency(reportData.totalCredit)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-gray-900 dark:text-gray-100">
                      {formatCurrency(reportData.closingBalance)}
                    </td>
                  </tr>
                )}

              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Aggregates card */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-900/40 rounded-2xl border" id="report-summary-aggregates">
          <div className="text-center">
            <span className="text-[10px] text-gray-400 block uppercase font-bold">Range Total DR</span>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(reportData.totalDebit)}
            </span>
          </div>
          <div className="text-center border-x border-gray-200 dark:border-gray-800">
            <span className="text-[10px] text-gray-400 block uppercase font-bold">Range Total CR</span>
            <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
              {formatCurrency(reportData.totalCredit)}
            </span>
          </div>
          <div className="text-center">
            <span className="text-[10px] text-gray-400 block uppercase font-bold">Final Ledger Bal</span>
            <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
              {formatCurrency(reportData.closingBalance)}
            </span>
          </div>
        </div>

        {/* Pagination Section */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 no-print" id="report-pagination">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                currentPage === 1 
                  ? 'border-gray-100 text-gray-300 dark:border-gray-800/40 dark:text-gray-700 cursor-not-allowed' 
                  : 'border-gray-200 hover:bg-gray-100 text-gray-600 dark:border-gray-800 dark:hover:bg-gray-800 dark:text-gray-300'
              }`}
              id="btn-prev-page"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Previous Page</span>
            </button>
            
            <span className="text-xs font-medium text-gray-500" id="pagination-indicator">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                currentPage === totalPages 
                  ? 'border-gray-100 text-gray-300 dark:border-gray-800/40 dark:text-gray-700 cursor-not-allowed' 
                  : 'border-gray-200 hover:bg-gray-100 text-gray-600 dark:border-gray-800 dark:hover:bg-gray-800 dark:text-gray-300'
              }`}
              id="btn-next-page"
            >
              <span>Next Page</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

      </div>
      )}

    </div>
  );
}
