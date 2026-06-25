/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent, useMemo } from 'react';
import { Search, Plus, Edit2, Trash2, Eye, X, PlusCircle, Trash, Check, AlertCircle, FileText, ArrowLeft, ArrowRight, Download } from 'lucide-react';
import { Voucher, VoucherEntry, Account, UserRole } from '../types';
import { formatCurrency, generateVoucherNumber, generateId } from '../utils';
import AccountSelector from './AccountSelector';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface VouchersTabProps {
  vouchers: Voucher[];
  accounts: Account[];
  role: UserRole;
  onCreateVoucher: (voucher: Voucher) => void;
  onUpdateVoucher: (voucher: Voucher) => void;
  onDeleteVoucher: (id: string) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  openConfirmModal: (title: string, msg: string, onConfirm: () => void) => void;
}

export default function VouchersTab({
  vouchers,
  accounts,
  role,
  onCreateVoucher,
  onUpdateVoucher,
  onDeleteVoucher,
  showToast,
  openConfirmModal
}: VouchersTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [currentView, setCurrentView] = useState<'list' | 'create' | 'view'>('list');
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);

  // Reset page on search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Editor states
  const [voucherId, setVoucherId] = useState('');
  const [voucherNo, setVoucherNo] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [entries, setEntries] = useState<VoucherEntry[]>([]);

  // Initial setup for creating voucher
  const handleOpenCreate = () => {
    // Both USER and ADMIN can create vouchers
    const newNo = generateVoucherNumber(vouchers);
    const now = new Date();
    
    // Format YYYY-MM-DD
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    
    // Format HH:MM
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');

    setVoucherId('v-' + generateId());
    setVoucherNo(newNo);
    setDate(`${yyyy}-${mm}-${dd}`);
    setTime(`${hh}:${min}`);
    
    // Add 2 default empty rows for double-entry guidance
    setEntries([
      { id: 've-' + generateId(), accountId: accounts[0]?.id || '', description: '', credit: 0, debit: 0 },
      { id: 've-' + generateId(), accountId: accounts[1]?.id || accounts[0]?.id || '', description: '', credit: 0, debit: 0 }
    ]);
    
    setCurrentView('create');
  };

  // Open Edit Voucher
  const handleOpenEdit = (voucher: Voucher) => {
    if (role !== UserRole.ADMIN) {
      showToast("Admin permission required.", "error");
      return;
    }
    setVoucherId(voucher.id);
    setVoucherNo(voucher.voucherNo);
    setDate(voucher.date);
    setTime(voucher.time);
    setEntries(voucher.entries.map(e => ({ ...e }))); // deep clone
    setCurrentView('create');
  };

  // Open View Voucher
  const handleOpenView = (voucher: Voucher) => {
    setSelectedVoucher(voucher);
    setCurrentView('view');
  };

  // Delete Voucher
  const handleDeleteClick = (voucher: Voucher) => {
    if (role !== UserRole.ADMIN) {
      showToast("Admin permission required.", "error");
      return;
    }
    openConfirmModal(
      "Delete Voucher?",
      `Are you sure you want to delete Voucher "${voucher.voucherNo}"? Account balances will automatically reverse transaction impacts.`,
      () => {
        onDeleteVoucher(voucher.id);
      }
    );
  };

  // Entry grid functions
  const handleAddRow = () => {
    setEntries([
      ...entries,
      { id: 've-' + generateId(), accountId: accounts[0]?.id || '', description: '', credit: 0, debit: 0 }
    ]);
  };

  const handleRemoveRow = (index: number) => {
    if (entries.length <= 1) {
      showToast("Voucher must have at least one ledger row.", "warning");
      return;
    }
    setEntries(entries.filter((_, i) => i !== index));
  };

  const handleEntryChange = (index: number, field: keyof VoucherEntry, value: any) => {
    const updated = [...entries];
    
    if (field === 'debit') {
      const numVal = value === '' ? 0 : parseFloat(value);
      updated[index].debit = isNaN(numVal) ? 0 : numVal;
      if (numVal > 0) {
        updated[index].credit = 0; // Clear credit if debit is set
      }
    } else if (field === 'credit') {
      const numVal = value === '' ? 0 : parseFloat(value);
      updated[index].credit = isNaN(numVal) ? 0 : numVal;
      if (numVal > 0) {
        updated[index].debit = 0; // Clear debit if credit is set
      }
    } else {
      updated[index] = {
        ...updated[index],
        [field]: value
      };
    }

    setEntries(updated);
  };

  // Calculate Running Totals in editor
  const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
  const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0);
  const isBalanced = totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.001;

  // Save Voucher
  const handleSaveVoucher = (e: FormEvent) => {
    e.preventDefault();

    // Verify accounts list is not empty
    if (accounts.length === 0) {
      showToast("Create at least one account first.", "error");
      return;
    }

    // Double-entry validation
    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      showToast("Total Debit and Total Credit must be equal.", "error");
      return;
    }

    // Verify duplicate voucher numbers
    const isDuplicate = vouchers.some(v => v.id !== (voucherId || '') && v.voucherNo.toLowerCase().trim() === voucherNo.toLowerCase().trim());
    if (isDuplicate) {
      showToast("Duplicate voucher number detected.", "error");
      return;
    }

    if (totalDebit === 0) {
      showToast("Voucher total amount cannot be zero.", "error");
      return;
    }

    // Validate that all rows have valid accounts selected
    const invalidRowIdx = entries.findIndex(e => !e.accountId);
    if (invalidRowIdx !== -1) {
      showToast(`Select an account for row ${invalidRowIdx + 1}.`, "warning");
      return;
    }

    // Validate that entries don't have blank values
    const blankRows = entries.filter(e => e.debit === 0 && e.credit === 0);
    if (blankRows.length > 0) {
      showToast("Remove empty rows before saving.", "warning");
      return;
    }

    const payload: Voucher = {
      id: voucherId,
      voucherNo,
      date,
      time,
      entries: entries.map(e => ({
        ...e,
        // Ensure description defaults to voucher header description if blank
        description: e.description.trim() || `Transaction against ${voucherNo}`
      })),
      totalAmount: totalDebit
    };

    const isEditMode = vouchers.some(v => v.id === voucherId);
    if (isEditMode) {
      onUpdateVoucher(payload);
    } else {
      onCreateVoucher(payload);
    }

    setCurrentView('list');
  };

  // Track last searched query to avoid redundant toast triggers
  const [lastSearchedQuery, setLastSearchedQuery] = useState('');

  useEffect(() => {
    const trimmed = searchQuery.trim().toLowerCase();
    if (trimmed.length >= 3 && trimmed !== lastSearchedQuery) {
      const match = vouchers.some(v => 
        v.voucherNo.toLowerCase() === trimmed ||
        v.voucherNo.toLowerCase().includes(trimmed)
      );
      if (!match) {
        showToast("Voucher not found.", "warning");
      }
      setLastSearchedQuery(trimmed);
    } else if (trimmed.length === 0) {
      setLastSearchedQuery('');
    }
  }, [searchQuery, vouchers, lastSearchedQuery, showToast]);

  // Filter vouchers with priority for exact voucher number matching
  const filteredVouchers = useMemo(() => {
    const trimmed = searchQuery.trim().toLowerCase();
    if (!trimmed) return vouchers;

    // Direct Exact Voucher Number Search
    const exactMatch = vouchers.find(v => v.voucherNo.toLowerCase() === trimmed);
    if (exactMatch) {
      return [exactMatch];
    }

    // Standard fallback instant filtering
    return vouchers.filter(v =>
      v.voucherNo.toLowerCase().includes(trimmed) ||
      v.date.includes(searchQuery) ||
      v.entries.some(entry => {
        const acc = accounts.find(a => a.id === entry.accountId);
        return acc?.name.toLowerCase().includes(trimmed) ||
               entry.description.toLowerCase().includes(trimmed);
      })
    );
  }, [searchQuery, vouchers, accounts]);

  const totalPages = Math.ceil(filteredVouchers.length / itemsPerPage);

  const paginatedVouchers = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredVouchers.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredVouchers, currentPage]);

  const getPageNumbers = () => {
    const maxPageButtons = 5;
    if (totalPages <= maxPageButtons) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    const half = Math.floor(maxPageButtons / 2);
    let start = currentPage - half;
    let end = currentPage + half;
    
    if (start <= 0) {
      start = 1;
      end = maxPageButtons;
    } else if (end > totalPages) {
      end = totalPages;
      start = totalPages - maxPageButtons + 1;
    }
    
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  const handleDownloadPDF = (v: Voucher) => {
    try {
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      });

      // Header Banner
      doc.setFillColor(30, 41, 59); // Slate-800
      doc.rect(0, 0, 210, 35, 'F');

      // Title
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text("FINANCE TRACKER", 15, 15);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text("Professional Accounting Voucher Document", 15, 21);

      // Voucher Info (top-right of header)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text("JOURNAL VOUCHER", 130, 15);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Voucher No: ${v.voucherNo}`, 130, 21);
      doc.text(`Date: ${v.date} ${v.time}`, 130, 26);

      // Main Details Box
      doc.setFillColor(248, 250, 252); // Light Gray background
      doc.rect(15, 42, 180, 20, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(15, 42, 180, 20, 'S');

      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text("VOUCHER SUMMARY METADATA", 20, 47);

      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Total Balanced Amount: ${formatCurrency(v.totalAmount)}`, 20, 52);
      doc.text(`Status: BALANCED & POSTED`, 20, 57);

      doc.text(`Total Lines: ${v.entries.length} Ledger Distributions`, 110, 52);
      doc.text(`System Reference ID: ${v.id}`, 110, 57);

      // Voucher Entries Table
      const tableHeaders = [["Account (Code)", "Description / Memo", "Debit (DR)", "Credit (CR)"]];
      const tableRows = v.entries.map(entry => {
        const acc = accounts.find(a => a.id === entry.accountId);
        const accountStr = acc 
          ? `${acc.name}${acc.code ? ` (${acc.code})` : ''}`
          : 'Unknown Account';
        return [
          accountStr,
          entry.description || '—',
          entry.debit > 0 ? formatCurrency(entry.debit) : '—',
          entry.credit > 0 ? formatCurrency(entry.credit) : '—'
        ];
      });

      // Add totals row to the table
      tableRows.push([
        "Totals",
        "",
        formatCurrency(v.totalAmount),
        formatCurrency(v.totalAmount)
      ]);

      autoTable(doc, {
        startY: 68,
        head: tableHeaders,
        body: tableRows,
        theme: 'striped',
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: 'bold',
          halign: 'left'
        },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 60 },
          2: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
          3: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }
        },
        styles: {
          fontSize: 8,
          cellPadding: 3
        },
        didParseCell: (data) => {
          // Style the totals row specially
          if (data.row.index === tableRows.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [241, 245, 249];
            if (data.column.index === 2) {
              data.cell.styles.textColor = [16, 185, 129]; // Emerald text
            }
            if (data.column.index === 3) {
              data.cell.styles.textColor = [239, 68, 68]; // Rose text
            }
          }
        }
      });

      // Get Y position after the table to place signatures
      const finalY = (doc as any).lastAutoTable.finalY || 120;

      // Draw Signatures Blocks at bottom
      const signatureY = finalY + 25;
      
      // Page overflow check for signatures
      if (signatureY > 270) {
        doc.addPage();
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        
        doc.line(15, 40, 90, 40);
        doc.text("Prepared By", 15, 45);

        doc.line(120, 40, 195, 40);
        doc.text("Authorized Signature & Stamp", 120, 45);
      } else {
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.setDrawColor(203, 213, 225);
        
        // Left Signature line
        doc.line(15, signatureY, 90, signatureY);
        doc.text("Prepared By (Accountant / Officer)", 15, signatureY + 5);

        // Right Signature line
        doc.line(120, signatureY, 195, signatureY);
        doc.text("Authorized Signature & Stamp", 120, signatureY + 5);
      }

      // Save PDF
      doc.save(`Voucher_${v.voucherNo}_${v.date}.pdf`);
      showToast(`Voucher PDF downloaded successfully`, "success");
    } catch (error) {
      console.error(error);
      showToast("Could not generate PDF download", "error");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" id="vouchers-tab">
      
      {currentView === 'list' && (
        <div className="space-y-6" id="voucher-list-view">
          {/* Header & Search - STICKY AT TOP */}
          <div className="sticky top-[69px] z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md border-b border-gray-100 dark:border-gray-900/60 flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by voucher #, date, account, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-white/50 dark:bg-gray-900/40 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                id="search-vouchers-input"
              />
            </div>
            
            <button
              onClick={handleOpenCreate}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 active:scale-95 text-white font-medium text-sm rounded-xl transition-all shadow-sm cursor-pointer whitespace-nowrap"
              id="btn-create-voucher"
            >
              <Plus className="w-4 h-4" />
              <span>Create Voucher</span>
            </button>
          </div>

          {/* Vouchers Grid */}
          {filteredVouchers.length === 0 ? (
            <div className="glass-card p-12 text-center rounded-2xl border-dashed border-2" id="no-vouchers-found">
              <FileText className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">No vouchers found</p>
              <p className="text-xs text-gray-400 mt-1">Start by posting your first general journal entry voucher.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="vouchers-grid">
                {paginatedVouchers.map((v) => (
                  <div 
                    key={v.id}
                    className="glass-card p-5 rounded-2xl border border-gray-100 dark:border-gray-800/40 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                    id={`voucher-card-${v.id}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg">
                          {v.voucherNo}
                        </span>
                        <p className="text-xs text-gray-400 mt-2">
                          {v.date} &bull; {v.time}
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleOpenView(v)}
                          className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors cursor-pointer"
                          title="View Voucher"
                          id={`btn-view-vouch-${v.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(v)}
                          className="p-2 text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg transition-colors cursor-pointer"
                          title="Edit Voucher"
                          id={`btn-edit-vouch-${v.id}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(v)}
                          className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                          title="Delete Voucher"
                          id={`btn-delete-vouch-${v.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Summary row */}
                    <div className="pt-3 border-t border-gray-100 dark:border-gray-800/40 flex justify-between items-center text-xs">
                      <span className="text-gray-500 dark:text-gray-400">
                        {v.entries.length} Ledger entries
                      </span>
                      <span className="font-bold text-sm text-gray-800 dark:text-gray-200">
                        Amount: {formatCurrency(v.totalAmount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-100 dark:border-gray-900" id="voucher-pagination">
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    Showing <span className="font-semibold text-gray-700 dark:text-gray-300">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      {Math.min(currentPage * itemsPerPage, filteredVouchers.length)}
                    </span>{' '}
                    of <span className="font-semibold text-gray-700 dark:text-gray-300">{filteredVouchers.length}</span> vouchers
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      className="p-2 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-40 disabled:hover:bg-transparent text-gray-600 dark:text-gray-400 cursor-pointer disabled:cursor-not-allowed transition-colors"
                      title="Previous Page"
                      id="btn-prev-page"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    
                    {getPageNumbers().map((page) => (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                          currentPage === page
                            ? 'bg-blue-500 text-white shadow-xs'
                            : 'border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 bg-white dark:bg-gray-950'
                        }`}
                        id={`btn-page-${page}`}
                      >
                        {page}
                      </button>
                    ))}

                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      className="p-2 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-40 disabled:hover:bg-transparent text-gray-600 dark:text-gray-400 cursor-pointer disabled:cursor-not-allowed transition-colors"
                      title="Next Page"
                      id="btn-next-page"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* CREATE / EDIT SCREEN */}
      {currentView === 'create' && (
        <form onSubmit={handleSaveVoucher} className="glass-panel p-6 rounded-2xl border space-y-6" id="voucher-form">
          <div className="flex items-center justify-between pb-4 border-b border-gray-200/50 dark:border-gray-800/50">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {vouchers.some(v => v.id === voucherId) ? 'Edit Journal Voucher' : 'New Journal Voucher'}
              </h2>
              <p className="text-xs text-gray-400 mt-1">Voucher ID: {voucherId}</p>
            </div>
            <button
              type="button"
              onClick={() => setCurrentView('list')}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors cursor-pointer"
              id="btn-close-voucher-editor"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Header info (Voucher #, Date, Time) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="voucher-editor-meta">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Voucher Number
              </label>
              <input
                type="text"
                value={voucherNo}
                readOnly
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/50 text-sm text-gray-500 font-mono font-semibold focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="voucher-date" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Posting Date
              </label>
              <input
                type="date"
                id="voucher-date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                required
              />
            </div>

            <div>
              <label htmlFor="voucher-time" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Posting Time
              </label>
              <input
                type="time"
                id="voucher-time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                required
              />
            </div>
          </div>

          {/* Double Entry Ledger Grid */}
          <div className="space-y-3" id="ledger-grid-editor">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex justify-between items-center">
              <span>Ledger Distributions</span>
              <button
                type="button"
                onClick={handleAddRow}
                className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-600 transition-colors cursor-pointer font-medium"
                id="btn-add-row"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add Ledger Row</span>
              </button>
            </h3>

            <div className="border border-gray-200/60 dark:border-gray-800/60 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse" id="voucher-editor-table">
                  <thead>
                    <tr className="bg-gray-50/75 dark:bg-gray-800/40 border-b border-gray-200/50 dark:border-gray-800/50 text-xs">
                      <th className="py-3 px-4 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/3">Account Ledger</th>
                      <th className="py-3 px-4 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/3">Memo Description</th>
                      <th className="py-3 px-4 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right w-28">Debit (DR)</th>
                      <th className="py-3 px-4 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right w-28">Credit (CR)</th>
                      <th className="py-3 px-4 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40">
                    {entries.map((entry, index) => (
                      <tr key={entry.id} className="text-sm" id={`entry-row-edit-${index}`}>
                        <td className="p-2">
                          <AccountSelector
                            accounts={accounts}
                            value={entry.accountId}
                            onChange={(val) => handleEntryChange(index, 'accountId', val)}
                            placeholder="Type to search account..."
                            required
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            placeholder="Memo description..."
                            value={entry.description}
                            onChange={(e) => handleEntryChange(index, 'description', e.target.value)}
                            className="w-full px-2 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-800 bg-transparent text-gray-900 dark:text-gray-100 focus:outline-none"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={entry.debit || ''}
                            onChange={(e) => handleEntryChange(index, 'debit', e.target.value)}
                            className="w-full px-2 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-800 bg-transparent text-right font-semibold text-emerald-600 dark:text-emerald-400 focus:outline-none"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={entry.credit || ''}
                            onChange={(e) => handleEntryChange(index, 'credit', e.target.value)}
                            className="w-full px-2 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-800 bg-transparent text-right font-semibold text-rose-600 dark:text-rose-400 focus:outline-none"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(index)}
                            className="p-1.5 text-gray-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                            id={`btn-remove-row-${index}`}
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Verification Bar */}
          <div 
            className={`p-4 rounded-xl border flex flex-col sm:flex-row gap-4 justify-between items-center text-sm font-semibold transition-colors ${
              isBalanced 
                ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-200' 
                : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-200'
            }`}
            id="balance-verification-bar"
          >
            <div className="flex items-center gap-2">
              {isBalanced ? (
                <>
                  <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span>Double Entry Rule Satisfied: Balanced</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                  <span>
                    Unbalanced Entry: Debits must equal Credits (Diff: {formatCurrency(Math.abs(totalDebit - totalCredit))})
                  </span>
                </>
              )}
            </div>

            <div className="flex gap-6 text-sm">
              <div>
                <span className="text-xs text-gray-400 block">Total Debit</span>
                <span className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(totalDebit)}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block">Total Credit</span>
                <span className="font-mono text-base font-bold text-rose-600 dark:text-rose-400">
                  {formatCurrency(totalCredit)}
                </span>
              </div>
            </div>
          </div>

          {/* Save buttons */}
          <div className="pt-4 border-t border-gray-200/60 dark:border-gray-800/60 flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setCurrentView('list')}
              className="px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
              id="btn-cancel-voucher-edit"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-5 py-2.5 rounded-xl shadow-md font-semibold text-sm text-white transition-all cursor-pointer ${
                isBalanced 
                  ? 'bg-blue-500 hover:bg-blue-600 active:scale-95' 
                  : 'bg-gray-300 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
              }`}
              id="btn-submit-voucher"
            >
              Save Voucher
            </button>
          </div>
        </form>
      )}

      {/* VIEW OVERLAY (INVOICE-LIKE DETAIL PRINTABLE STYLE) */}
      {currentView === 'view' && selectedVoucher && (
        <div className="glass-panel p-6 rounded-2xl border space-y-6 animate-scale-up" id="voucher-detail-overlay">
          {/* Action buttons (Close, Print) */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-200/50 dark:border-gray-800/50 no-print">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              <span>General Journal Voucher Details</span>
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => handleDownloadPDF(selectedVoucher)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                id="btn-download-pdf-voucher"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>
              <button
                onClick={() => window.print()}
                className="px-3.5 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs"
                id="btn-print-single-voucher"
              >
                Print Voucher
              </button>
              <button
                onClick={() => setCurrentView('list')}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors cursor-pointer"
                id="btn-close-voucher-viewer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Printable Container */}
          <div className="p-4 bg-white dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-900 flex flex-col space-y-6" id="printable-voucher-document">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Finance Tracker</h1>
                <p className="text-xs text-gray-400">Official Journal Voucher Document</p>
              </div>
              <div className="text-right sm:text-right font-mono">
                <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{selectedVoucher.voucherNo}</p>
                <p className="text-[10px] text-gray-400 mt-1">Date: {selectedVoucher.date} &bull; {selectedVoucher.time}</p>
              </div>
            </div>

            {/* List entries */}
            <div className="border border-gray-100 dark:border-gray-900 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-900">
                    <th className="py-2.5 px-4 font-semibold text-gray-500 dark:text-gray-400 uppercase">Account Name</th>
                    <th className="py-2.5 px-4 font-semibold text-gray-500 dark:text-gray-400 uppercase">Description</th>
                    <th className="py-2.5 px-4 font-semibold text-gray-500 dark:text-gray-400 uppercase text-right w-28">Debit (DR)</th>
                    <th className="py-2.5 px-4 font-semibold text-gray-500 dark:text-gray-400 uppercase text-right w-28">Credit (CR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-900 text-sm">
                  {selectedVoucher.entries.map((entry) => {
                    const acc = accounts.find(a => a.id === entry.accountId);
                    return (
                      <tr key={entry.id} className="text-gray-800 dark:text-gray-200">
                        <td className="py-2.5 px-4 font-medium">
                          {acc ? (
                            <span>
                              {acc.name}
                              {acc.code ? (
                                <span className="text-xs text-gray-400 ml-1.5 font-mono">({acc.code})</span>
                              ) : ''}
                            </span>
                          ) : 'Unknown Account'}
                        </td>
                        <td className="py-2.5 px-4 text-xs text-gray-500 dark:text-gray-400">{entry.description}</td>
                        <td className="py-2.5 px-4 text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                          {entry.debit > 0 ? formatCurrency(entry.debit) : '—'}
                        </td>
                        <td className="py-2.5 px-4 text-right text-rose-600 dark:text-rose-400 font-semibold">
                          {entry.credit > 0 ? formatCurrency(entry.credit) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50/50 dark:bg-gray-900/50 font-bold border-t border-gray-200 dark:border-gray-800">
                    <td colSpan={2} className="py-3 px-4 text-right">Totals</td>
                    <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(selectedVoucher.totalAmount)}
                    </td>
                    <td className="py-3 px-4 text-right text-rose-600 dark:text-rose-400">
                      {formatCurrency(selectedVoucher.totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Note signature */}
            <div className="pt-8 grid grid-cols-2 gap-4 text-xs">
              <div className="border-t border-dashed border-gray-300 dark:border-gray-700 pt-3 text-center text-gray-400">
                Prepared By
              </div>
              <div className="border-t border-dashed border-gray-300 dark:border-gray-700 pt-3 text-center text-gray-400">
                Authorized Signature
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
