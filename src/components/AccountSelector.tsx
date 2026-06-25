/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useMemo, KeyboardEvent } from 'react';
import { Search, ChevronDown, X, Check, Clock, Pin } from 'lucide-react';
import { Account, AccountType } from '../types';
import { formatCurrency } from '../utils';

interface AccountSelectorProps {
  accounts: Account[];
  value: string; // The selected account ID
  onChange: (value: string) => void;
  placeholder?: string;
  allowAll?: boolean; // If true, adds "All Accounts" (id: 'all')
  required?: boolean;
}

export default function AccountSelector({
  accounts,
  value,
  onChange,
  placeholder = "Select ledger account...",
  allowAll = false,
  required = false
}: AccountSelectorProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Find currently selected account
  const selectedAccount = useMemo(() => {
    if (value === 'all' && allowAll) {
      return { id: 'all', name: 'All Accounts', type: 'Consolidated' as any };
    }
    return accounts.find(acc => acc.id === value);
  }, [accounts, value, allowAll]);

  // Sync query with selected account when it changes or on mount
  useEffect(() => {
    if (selectedAccount) {
      setQuery(selectedAccount.name);
    } else {
      setQuery('');
    }
  }, [selectedAccount]);

  // Handle click outside to close the dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Reset query to the selected account name
        if (selectedAccount) {
          setQuery(selectedAccount.name);
        } else {
          setQuery('');
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedAccount]);

  // Generate recommendations (filtered & sorted)
  const suggestions = useMemo(() => {
    let list: any[] = [];

    // Add "All Accounts" option if allowed
    if (allowAll) {
      list.push({
        id: 'all',
        name: 'All Accounts',
        type: 'Consolidated',
        code: 'ALL',
        category: 'Consolidated view'
      });
    }

    // Add actual accounts
    list = [...list, ...accounts];

    // Filter by query if user has typed something that isn't the exact name of selected account
    const isShowingSelected = selectedAccount && query === selectedAccount.name;
    const cleanQuery = query.trim().toLowerCase();

    if (cleanQuery && !isShowingSelected) {
      list = list.filter(acc => {
        const nameMatch = acc.name.toLowerCase().includes(cleanQuery);
        const codeMatch = acc.code ? acc.code.toLowerCase().includes(cleanQuery) : false;
        const mobileMatch = acc.mobileNumber ? acc.mobileNumber.toLowerCase().includes(cleanQuery) : false;
        const categoryMatch = acc.category ? acc.category.toLowerCase().includes(cleanQuery) : false;
        const typeMatch = acc.type ? acc.type.toLowerCase().includes(cleanQuery) : false;
        return nameMatch || codeMatch || mobileMatch || categoryMatch || typeMatch;
      });
    }

    // Sort:
    // 1. If 'all' is present, keep it at top
    // 2. Sort by lastActivityDate desc (recency)
    // 3. Sort by pinned (isPinned) desc
    // 4. Sort alphabetically
    list.sort((a, b) => {
      if (a.id === 'all') return -1;
      if (b.id === 'all') return 1;

      // Recency (lastActivityDate)
      const dateA = a.lastActivityDate || '';
      const dateB = b.lastActivityDate || '';
      if (dateA && !dateB) return -1;
      if (!dateA && dateB) return 1;
      if (dateA && dateB && dateA !== dateB) {
        return dateB.localeCompare(dateA); // Most recent first
      }

      // Pinned status
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      // Alphabetical
      return a.name.localeCompare(b.name);
    });

    return list;
  }, [accounts, query, selectedAccount, allowAll]);

  // Adjust highlighted index when suggestions change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [suggestions]);

  // Handles actual selection
  const handleSelect = (account: any) => {
    onChange(account.id);
    setQuery(account.name);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  // Keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        setHighlightedIndex(prev => (prev + 1) % suggestions.length);
        e.preventDefault();
        break;
      case 'ArrowUp':
        setHighlightedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
        e.preventDefault();
        break;
      case 'Enter':
        if (suggestions[highlightedIndex]) {
          handleSelect(suggestions[highlightedIndex]);
        }
        e.preventDefault();
        break;
      case 'Escape':
        setIsOpen(false);
        if (selectedAccount) {
          setQuery(selectedAccount.name);
        } else {
          setQuery('');
        }
        e.preventDefault();
        break;
      case 'Tab':
        // If there's a highlighted item, select it when user tabs out
        if (isOpen && suggestions[highlightedIndex]) {
          handleSelect(suggestions[highlightedIndex]);
        }
        break;
      default:
        break;
    }
  };

  const handleClear = () => {
    onChange('');
    setQuery('');
    setIsOpen(true);
    inputRef.current?.focus();
  };

  return (
    <div className="relative w-full" ref={containerRef} id={`account-selector-container-${value || 'empty'}`}>
      <div className="relative">
        {/* Search Icon */}
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        
        {/* Input Field */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            // Auto-select text for easy typing over existing value
            inputRef.current?.select();
          }}
          placeholder={placeholder}
          onKeyDown={handleKeyDown}
          className="w-full pl-9 pr-16 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
          required={required && !value}
          id={`account-selector-input-${value || 'empty'}`}
        />

        {/* Action Buttons (Clear & Chevron) */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-gray-400">
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 rounded-md hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer"
              title="Clear selection"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(prev => !prev)}
            className="p-0.5 rounded-md hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Suggestion Dropdown List */}
      {isOpen && suggestions.length > 0 && (
        <div 
          className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-850 rounded-xl shadow-xl divide-y divide-gray-50 dark:divide-gray-900 animate-fade-in-down"
          id={`account-selector-dropdown-${value || 'empty'}`}
        >
          {suggestions.map((acc, index) => {
            const isSelected = acc.id === value;
            const isHighlighted = index === highlightedIndex;
            const hasRecentActivity = acc.lastActivityDate && acc.id !== 'all';

            return (
              <div
                key={acc.id}
                onClick={() => handleSelect(acc)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`px-4 py-2.5 flex items-center justify-between text-xs cursor-pointer transition-colors ${
                  isHighlighted 
                    ? 'bg-blue-50/50 dark:bg-blue-950/20 text-gray-900 dark:text-gray-100' 
                    : 'text-gray-700 dark:text-gray-300'
                }`}
                id={`suggestion-item-${acc.id}`}
              >
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Monospace Code Tag */}
                    {acc.code && (
                      <span className="px-1 py-0.2 text-[9px] font-mono font-bold rounded bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                        {acc.code}
                      </span>
                    )}

                    {/* Account Name */}
                    <span className={`font-semibold truncate ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}`}>
                      {acc.name}
                    </span>

                    {/* Pin/Recent Badges */}
                    {acc.isPinned && (
                      <Pin className="w-2.5 h-2.5 text-blue-500 shrink-0" fill="currentColor" />
                    )}
                    {hasRecentActivity && (
                      <div className="flex items-center gap-0.5 text-[8px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider shrink-0 bg-amber-500/10 px-1 rounded">
                        <Clock className="w-2 h-2" />
                        <span>Recent</span>
                      </div>
                    )}
                  </div>

                  {/* Account Metadata Line (Type & Category) */}
                  <div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                    <span>{acc.type}</span>
                    {acc.category && (
                      <>
                        <span>&bull;</span>
                        <span className="truncate">{acc.category}</span>
                      </>
                    )}
                    {acc.mobileNumber && (
                      <>
                        <span>&bull;</span>
                        <span className="truncate font-mono">{acc.mobileNumber}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Balance or selected indicator */}
                <div className="flex items-center gap-2 shrink-0 ml-3 text-right">
                  {acc.id !== 'all' && (
                    <span className="font-mono text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                      {formatCurrency(acc.currentBalance)}
                    </span>
                  )}
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-blue-500" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* No suggestions helper */}
      {isOpen && suggestions.length === 0 && (
        <div className="absolute left-0 right-0 z-50 mt-1 p-4 text-center text-xs text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-850 rounded-xl shadow-xl">
          No matching accounts found
        </div>
      )}
    </div>
  );
}
