import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { PAYMENT_METHODS } from '../constants';
import { X, ChevronDown, Repeat, Check, Trash2, Calendar, Tag } from 'lucide-react';

export const AddExpenseModal = () => {
  const {
    isAddModalOpen, setIsAddModalOpen,
    editingExpense, setEditingExpense,
    addExpense, updateExpense, deleteExpense,
    categories, currency,
    setActiveTab,
  } = useApp();

  const today = new Date().toISOString().split('T')[0];

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [date, setDate] = useState(today);
  const [isRecurring, setIsRecurring] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isAddModalOpen) return;

    const fallbackCategoryId = categories[0]?.id || '';

    if (editingExpense) {
      const validCategoryId = categories.some(cat => cat.id === editingExpense.categoryId)
        ? editingExpense.categoryId
        : fallbackCategoryId;

      setTitle(editingExpense.title || '');
      setAmount(editingExpense.amount?.toString() || '');
      setCategoryId(validCategoryId);
      setPaymentMethod(editingExpense.paymentMethod || 'upi');
      setDate(editingExpense.date || today);
      setIsRecurring(!!editingExpense.isRecurring);
    } else {
      const validCategoryId = categories.some(cat => cat.id === categoryId) ? categoryId : fallbackCategoryId;

      setTitle('');
      setAmount('');
      setCategoryId(validCategoryId);
      setPaymentMethod('upi');
      setDate(today);
      setIsRecurring(false);
      setShowDatePicker(false);
    }
  }, [isAddModalOpen, editingExpense, categories, categoryId, today]);

  if (!isAddModalOpen) return null;

  const handleClose = () => {
    setIsAddModalOpen(false);
    setEditingExpense(null);
  };

  const handleSubmit = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;

    const data = {
      title: title.trim() || (categories.find(c => c.id === categoryId)?.name || 'Expense'),
      amount: amt,
      categoryId,
      paymentMethod,
      date,
      isRecurring,
    };

    if (editingExpense) {
      updateExpense(editingExpense.id, data);
    } else {
      addExpense(data);
    }
    handleClose();
  };

  const handleDelete = () => {
    if (!editingExpense) return;
    if (window.confirm('Delete this expense?')) {
      deleteExpense(editingExpense.id);
      handleClose();
    }
  };

  const addQuick = (n) => setAmount(v => String((parseFloat(v) || 0) + n));

  const selectedCat = categories.find(c => c.id === categoryId);
  const isDateToday = date === today;

  // Format displayed date nicely
  const dateLabel = isDateToday ? 'Today' : new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric'
  });

  return (
    <>
      {/* Overlay */}
      <div className="sheet-overlay" onClick={handleClose} />

      {/* Bottom Sheet */}
      <div className="sheet">
        <div className="sheet-handle" />

        <div style={{ padding: '8px 20px 0' }}>
          {/* Sheet Title */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>
              {editingExpense ? 'Edit Expense' : 'Log Expense'}
            </h2>
            <button onClick={handleClose} className="btn btn-ghost" style={{ padding: 6, borderRadius: '50%', background: 'var(--bg-input)' }}>
              <X size={18} />
            </button>
          </div>

          {/* ── Amount Entry ── */}
          <div style={{
            background: 'var(--bg-base)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px',
            marginBottom: 16,
            textAlign: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <span className="mono" style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>
                {currency.symbol}
              </span>
              <input
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                autoFocus
                className="mono"
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: '2.8rem',
                  fontWeight: 900,
                  color: 'var(--text-primary)',
                  width: '180px',
                  textAlign: 'center',
                  letterSpacing: '-1px',
                }}
              />
            </div>
            {/* Quick Amount Buttons */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 10 }}>
              {[50, 100, 200, 500].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => addQuick(n)}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-full)',
                    padding: '5px 12px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font)',
                  }}
                >+{n}</button>
              ))}
            </div>
          </div>

          {/* ── Title ── */}
          <input
            type="text"
            placeholder="What was this for? (optional)"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="input"
            style={{ marginBottom: 12 }}
          />

          {/* ── Category Picker ── */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
              Category
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 8,
            }}>
              {categories.map(cat => {
                const isSel = categoryId === cat.id;
                const isSavings = cat.id === 'cat-savings';
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      padding: '10px 4px',
                      borderRadius: 'var(--radius-md)',
                      border: `2px solid ${isSel ? cat.color : 'transparent'}`,
                      background: isSel
                        ? (isSavings ? 'var(--savings-soft)' : `${cat.color}18`)
                        : 'var(--bg-input)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      fontFamily: 'var(--font)',
                    }}
                  >
                    <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{cat.icon}</span>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      color: isSel ? cat.color : 'var(--text-muted)',
                      textAlign: 'center',
                      lineHeight: 1.2,
                      maxWidth: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {cat.name.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => {
                setIsAddModalOpen(false);
                setEditingExpense(null);
                setActiveTab('categories');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 8,
                padding: 0,
                border: 'none',
                background: 'transparent',
                color: 'var(--accent)',
                fontFamily: 'var(--font)',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Tag size={14} />
              Manage categories
            </button>
          </div>

          {/* ── Payment Mode ── */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
              Paid via
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PAYMENT_METHODS.map(pm => {
                const isSel = paymentMethod === pm.id;
                return (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setPaymentMethod(pm.id)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 'var(--radius-full)',
                      border: `1.5px solid ${isSel ? 'var(--accent)' : 'var(--border-medium)'}`,
                      background: isSel ? 'var(--accent-soft)' : 'var(--bg-input)',
                      color: isSel ? 'var(--accent)' : 'var(--text-secondary)',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      fontFamily: 'var(--font)',
                      transition: 'all 0.15s',
                    }}
                  >
                    <span>{pm.icon}</span>
                    <span>{pm.name.split('/')[0].split('(')[0].trim()}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Date (Collapsible) + Recurring ── */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {/* Date toggle */}
            <button
              type="button"
              onClick={() => setShowDatePicker(v => !v)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: `1.5px solid ${showDatePicker ? 'var(--accent)' : 'var(--border-medium)'}`,
                background: showDatePicker ? 'var(--accent-soft)' : 'var(--bg-input)',
                color: showDatePicker ? 'var(--accent)' : 'var(--text-secondary)',
                fontFamily: 'var(--font)',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <Calendar size={15} />
              <span>{dateLabel}</span>
              <ChevronDown size={14} style={{ marginLeft: 'auto', transform: showDatePicker ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>

            {/* Recurring toggle */}
            <button
              type="button"
              onClick={() => setIsRecurring(v => !v)}
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: `1.5px solid ${isRecurring ? 'var(--accent)' : 'var(--border-medium)'}`,
                background: isRecurring ? 'var(--accent-soft)' : 'var(--bg-input)',
                color: isRecurring ? 'var(--accent)' : 'var(--text-muted)',
                fontFamily: 'var(--font)',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                transition: 'all 0.15s',
              }}
            >
              <Repeat size={15} />
              <span>Monthly</span>
            </button>
          </div>

          {/* Date picker (shown only if toggled) */}
          {showDatePicker && (
            <div style={{ marginBottom: 16 }}>
              <input
                type="date"
                value={date}
                max={today}
                onChange={e => { setDate(e.target.value); }}
                className="input"
                style={{ fontSize: '0.9rem' }}
              />
            </div>
          )}

          {/* ── Actions ── */}
          <div style={{ display: 'flex', gap: 10, paddingBottom: 4 }}>
            {editingExpense && (
              <button
                type="button"
                onClick={handleDelete}
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px solid rgba(239,68,68,0.25)',
                  background: 'rgba(239,68,68,0.08)',
                  color: 'var(--danger)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Trash2 size={18} />
              </button>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!amount || parseFloat(amount) <= 0}
              className="btn btn-accent"
              style={{
                flex: 1,
                padding: '14px',
                fontSize: '1rem',
                fontWeight: 700,
                borderRadius: 'var(--radius-md)',
                opacity: (!amount || parseFloat(amount) <= 0) ? 0.45 : 1,
                pointerEvents: (!amount || parseFloat(amount) <= 0) ? 'none' : 'auto',
              }}
            >
              <Check size={18} />
              {editingExpense ? 'Save Changes' : 'Add Expense'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
