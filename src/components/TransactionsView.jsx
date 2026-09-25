import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PAYMENT_METHODS } from '../constants';
import { 
  Search, 
  Filter, 
  Download, 
  Plus, 
  Calendar, 
  ArrowUpDown, 
  Trash2, 
  FileSpreadsheet,
  Tag
} from 'lucide-react';

export const TransactionsView = () => {
  const { 
    expenses, 
    categories, 
    currency, 
    deleteExpense, 
    setEditingExpense, 
    setIsAddModalOpen,
    exportToCSV,
    selectedMonth
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [selectedPayment, setSelectedPayment] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');

  // Filter expenses
  const filteredExpenses = expenses.filter(exp => {
    // Month filter
    const matchesMonth = exp.date && exp.date.startsWith(selectedMonth);
    
    // Search query
    const matchesSearch = !search || 
      (exp.title && exp.title.toLowerCase().includes(search.toLowerCase())) ||
      (exp.notes && exp.notes.toLowerCase().includes(search.toLowerCase()));

    // Category filter
    const matchesCat = selectedCat === 'all' || exp.categoryId === selectedCat;

    // Payment method filter
    const matchesPayment = selectedPayment === 'all' || exp.paymentMethod === selectedPayment;

    return matchesMonth && matchesSearch && matchesCat && matchesPayment;
  });

  // Sort
  const sortedExpenses = [...filteredExpenses].sort((a, b) => {
    if (sortBy === 'date-desc') return new Date(b.date) - new Date(a.date);
    if (sortBy === 'date-asc') return new Date(a.date) - new Date(b.date);
    if (sortBy === 'amount-desc') return b.amount - a.amount;
    if (sortBy === 'amount-asc') return a.amount - b.amount;
    return 0;
  });

  const totalFilteredAmount = sortedExpenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '0 16px' }}>
      {/* Top Controls Bar */}
      <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Transaction History</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Showing {sortedExpenses.length} transactions totaling{' '}
              <span className="mono" style={{ color: '#f87171', fontWeight: 700 }}>
                {currency.symbol}{totalFilteredAmount.toLocaleString()}
              </span>
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={exportToCSV}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '8px 12px' }}
              title="Export as CSV spreadsheet"
            >
              <FileSpreadsheet size={15} style={{ color: 'var(--color-success)' }} />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => {
                setEditingExpense(null);
                setIsAddModalOpen(true);
              }}
              className="btn btn-primary"
              style={{ fontSize: '0.8rem', padding: '8px 14px' }}
            >
              <Plus size={16} />
              <span>Add Expense</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="transactions-filter-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          {/* Search Input */}
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search expenses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input"
              style={{ paddingLeft: '36px', fontSize: '0.85rem' }}
            />
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="select"
            style={{ fontSize: '0.85rem' }}
          >
            <option value="all">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>

          {/* Payment Method Dropdown */}
          <select
            value={selectedPayment}
            onChange={(e) => setSelectedPayment(e.target.value)}
            className="select"
            style={{ fontSize: '0.85rem' }}
          >
            <option value="all">All Payment Methods</option>
            {PAYMENT_METHODS.map(pm => (
              <option key={pm.id} value={pm.id}>
                {pm.icon} {pm.name}
              </option>
            ))}
          </select>

          {/* Sort By Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="select"
            style={{ fontSize: '0.85rem' }}
          >
            <option value="date-desc">Latest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="amount-desc">Highest Amount</option>
            <option value="amount-asc">Lowest Amount</option>
          </select>
        </div>
      </div>

      {/* Transaction List */}
      {sortedExpenses.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '48px 20px' }}>
          <Tag size={42} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>No matching transactions found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
            Try adjusting your search terms or filter selection.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {sortedExpenses.map((exp) => {
            const cat = categories.find(c => c.id === exp.categoryId) || { name: 'Misc', icon: '📦', color: '#64748b' };
            const paymentObj = PAYMENT_METHODS.find(p => p.id === exp.paymentMethod);

            return (
              <div
                key={exp.id}
                className="glass-card"
                onClick={() => {
                  setEditingExpense(exp);
                  setIsAddModalOpen(true);
                }}
                style={{
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', overflow: 'hidden' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: `${cat.color}20`,
                    border: `1.5px solid ${cat.color}40`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.3rem',
                    flexShrink: 0
                  }}>
                    {cat.icon}
                  </div>

                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {exp.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', flexWrap: 'wrap' }}>
                      <span style={{ color: cat.color, fontWeight: 600 }}>{cat.name}</span>
                      <span>•</span>
                      <span>{exp.date}</span>
                      <span>•</span>
                      <span style={{ textTransform: 'uppercase' }}>
                        {paymentObj?.icon} {exp.paymentMethod}
                      </span>
                      {exp.notes && (
                        <>
                          <span>•</span>
                          <span style={{ fontStyle: 'italic' }}>"{exp.notes}"</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div className="mono" style={{ fontWeight: 800, fontSize: '1.1rem', color: '#f87171' }}>
                    -{currency.symbol}{exp.amount.toLocaleString()}
                  </div>
                  {exp.isRecurring && (
                    <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-primary)', fontSize: '0.65rem', marginTop: '2px' }}>
                      Recurring
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
