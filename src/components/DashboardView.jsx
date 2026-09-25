import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { normalizePaymentMethod } from '../constants';
import { Plus, TrendingDown, Wallet, PiggyBank, CreditCard } from 'lucide-react';

/* ── SVG Donut Pie Chart ── */
const DONUT_R = 88;
const DONUT_STROKE = 22;
const DONUT_CX = 110;
const DONUT_CY = 110;
const CIRCUMFERENCE = 2 * Math.PI * DONUT_R;

function PieSlice({ offset, percent, color, onHover, onLeave, isHighlighted }) {
  const dashLen = (percent / 100) * CIRCUMFERENCE;
  return (
    <circle
      cx={DONUT_CX}
      cy={DONUT_CY}
      r={DONUT_R}
      fill="none"
      stroke={color}
      strokeWidth={isHighlighted ? DONUT_STROKE + 4 : DONUT_STROKE}
      strokeDasharray={`${dashLen} ${CIRCUMFERENCE}`}
      strokeDashoffset={-offset}
      strokeLinecap="round"
      style={{
        transition: 'stroke-width 0.2s, opacity 0.2s',
        cursor: 'pointer',
        opacity: isHighlighted === false ? 0.35 : 1,
        transformOrigin: `${DONUT_CX}px ${DONUT_CY}px`,
      }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onTouchStart={onHover}
    />
  );
}

export const DashboardView = () => {
  const {
    expenses, categories, monthlyBudget, currency,
    selectedMonth, setEditingExpense, setIsAddModalOpen, setActiveTab
  } = useApp();

  const [hovered, setHovered] = useState(null); // category id

  // Filter by selected month
  const monthlyExpenses = useMemo(() =>
    expenses.filter(e => e.date?.startsWith(selectedMonth)), [expenses, selectedMonth]);

  // All expenses (savings included for pie chart)
  const regularExpenses = useMemo(() =>
    monthlyExpenses.filter(e => e.categoryId !== 'cat-savings'), [monthlyExpenses]);

  const savingsExpenses = useMemo(() =>
    monthlyExpenses.filter(e => e.categoryId === 'cat-savings'), [monthlyExpenses]);

  const totalSpent = useMemo(() =>
    regularExpenses.reduce((s, e) => s + (e.amount || 0), 0), [regularExpenses]);

  const totalSaved = useMemo(() =>
    savingsExpenses.reduce((s, e) => s + (e.amount || 0), 0), [savingsExpenses]);

  const creditCardSpent = useMemo(() =>
    monthlyExpenses
      .filter(e => normalizePaymentMethod(e.paymentMethod) === 'credit-card')
      .reduce((s, e) => s + (e.amount || 0), 0),
    [monthlyExpenses]
  );

  // Grand total for pie = spending + savings
  const grandTotal = totalSpent + totalSaved;

  // Build category data for pie — ALL categories including savings
  const catData = useMemo(() => {
    const categoryData = categories
      .map(cat => {
        const amt = monthlyExpenses
          .filter(e => e.categoryId === cat.id)
          .reduce((s, e) => s + (e.amount || 0), 0);
        return { ...cat, amt };
      })
      .filter(c => c.amt > 0)
      .sort((a, b) => b.amt - a.amt);

    const knownCategoryIds = new Set(categories.map(cat => cat.id));
    const uncategorizedAmount = monthlyExpenses
      .filter(expense => !knownCategoryIds.has(expense.categoryId))
      .reduce((sum, expense) => sum + (expense.amount || 0), 0);

    if (uncategorizedAmount > 0) {
      categoryData.push({
        id: 'cat-uncategorized',
        name: 'Uncategorized',
        icon: '📌',
        color: '#94a3b8',
        amt: uncategorizedAmount
      });
      categoryData.sort((a, b) => b.amt - a.amt);
    }

    return categoryData;
  }, [categories, monthlyExpenses]);

  const categoryLegend = useMemo(() => {
    const legendData = categories
      .map(cat => ({
        ...cat,
        amt: monthlyExpenses
          .filter(e => e.categoryId === cat.id)
          .reduce((s, e) => s + (e.amount || 0), 0)
      }))
      .sort((a, b) => b.amt - a.amt);

    const knownCategoryIds = new Set(categories.map(cat => cat.id));
    const uncategorizedAmount = monthlyExpenses
      .filter(expense => !knownCategoryIds.has(expense.categoryId))
      .reduce((sum, expense) => sum + (expense.amount || 0), 0);

    if (uncategorizedAmount > 0) {
      legendData.push({
        id: 'cat-uncategorized',
        name: 'Uncategorized',
        icon: '📌',
        color: '#94a3b8',
        amt: uncategorizedAmount
      });
      legendData.sort((a, b) => b.amt - a.amt);
    }

    return legendData;
  }, [categories, monthlyExpenses]);

  // Build pie slices — use grandTotal so savings slice is proportional
  const slices = useMemo(() => {
    let offset = 0;
    return catData.map(cat => {
      const percent = grandTotal > 0 ? (cat.amt / grandTotal) * 100 : 0;
      const slice = { ...cat, percent, offset };
      offset += (percent / 100) * CIRCUMFERENCE;
      return slice;
    });
  }, [catData, grandTotal]);

  const hoveredCat = hovered ? catData.find(c => c.id === hovered) : null;

  // Recent transactions — all (including savings), latest 5
  const recent = useMemo(() =>
    monthlyExpenses.slice(0, 5), [monthlyExpenses]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, flex: 1 }}>

      {/* ── Pie Chart Section ── */}
      <div style={{
        background: 'var(--bg-surface)',
        padding: '20px 20px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>

        {grandTotal === 0 ? (
          /* Empty State */
          <div style={{ padding: '32px 20px', textAlign: 'center' }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'var(--accent-soft)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <TrendingDown size={36} color="var(--accent)" />
            </div>
            <p style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 4 }}>No expenses yet</p>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 20 }}>
              Tap + to log your first expense!
            </p>
            <button
              onClick={() => { setEditingExpense(null); setIsAddModalOpen(true); }}
              className="btn btn-accent"
              style={{ padding: '12px 28px', fontSize: '0.9rem' }}
            >
              <Plus size={18} /> Add Expense
            </button>
          </div>
        ) : (
          <>
            {/* SVG Donut */}
            <div style={{ position: 'relative', width: 220, height: 220 }}>
              <svg width={220} height={220} viewBox={`0 0 ${DONUT_CX * 2} ${DONUT_CY * 2}`} style={{ transform: 'rotate(-90deg)' }}>
                {/* Background ring */}
                <circle
                  cx={DONUT_CX} cy={DONUT_CY} r={DONUT_R}
                  fill="none" stroke="var(--bg-base)"
                  strokeWidth={DONUT_STROKE}
                />
                {/* Slices */}
                {slices.map(s => (
                  <PieSlice
                    key={s.id}
                    offset={s.offset}
                    percent={s.percent}
                    color={s.color}
                    isHighlighted={hovered === null ? null : hovered === s.id}
                    onHover={() => setHovered(s.id)}
                    onLeave={() => setHovered(null)}
                  />
                ))}
              </svg>

              {/* Center Text */}
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none',
                animation: 'popIn 0.3s ease',
              }}>
                {hoveredCat ? (
                  <>
                    <span style={{ fontSize: '1.4rem', marginBottom: 2 }}>{hoveredCat.icon}</span>
                    <span className="mono" style={{ fontSize: '1.2rem', fontWeight: 800, color: hoveredCat.color }}>
                      {currency.symbol}{hoveredCat.amt.toLocaleString()}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, maxWidth: 90, textAlign: 'center', lineHeight: 1.2 }}>
                      {hoveredCat.name}
                    </span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Total This Month
                    </span>
                    <span className="mono" style={{ fontSize: '1.55rem', fontWeight: 900, letterSpacing: '-1px', color: 'var(--text-primary)', marginTop: 2 }}>
                      {currency.symbol}{grandTotal.toLocaleString()}
                    </span>
                    {monthlyBudget > 0 && (
                      <span style={{ fontSize: '0.72rem', color: totalSpent > monthlyBudget ? 'var(--danger)' : 'var(--success)', fontWeight: 600, marginTop: 2 }}>
                        {totalSpent > monthlyBudget
                          ? `${currency.symbol}${(totalSpent - monthlyBudget).toLocaleString()} over`
                          : `${currency.symbol}${(monthlyBudget - totalSpent).toLocaleString()} left`}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Category Legend */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              justifyContent: 'center',
              marginTop: 16,
              padding: '0 8px',
            }}>
              {categoryLegend.map(s => {
                const percent = grandTotal > 0 ? (s.amt / grandTotal) * 100 : 0;
                return (
                <button
                  key={s.id}
                  onMouseEnter={() => setHovered(s.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => setHovered(hovered === s.id ? null : s.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 10px',
                    borderRadius: 'var(--radius-full)',
                    background: hovered === s.id ? `${s.color}18` : 'var(--bg-input)',
                    border: `1.5px solid ${hovered === s.id ? s.color : 'transparent'}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    fontFamily: 'var(--font)',
                  }}
                >
                  <span style={{ fontSize: '0.85rem' }}>{s.icon}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {s.name}
                  </span>
                  <span className="mono" style={{ fontSize: '0.72rem', fontWeight: 700, color: s.color }}>
                    {percent.toFixed(0)}%
                  </span>
                </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Savings Card ── */}
      <div style={{ display: 'grid', gridTemplateColumns: totalSaved > 0 ? '1fr 1fr' : '1fr', gap: 12, padding: '12px 16px 0' }}>
        {creditCardSpent > 0 && (
          <div className="card" style={{
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            borderLeft: '4px solid #3b82f6',
          }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CreditCard size={20} color="#3b82f6" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Card spend</div>
              <div className="mono" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#3b82f6' }}>
                {currency.symbol}{creditCardSpent.toLocaleString()}
              </div>
            </div>
          </div>
        )}

        {totalSaved > 0 && (
          <div className="card" style={{
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            borderLeft: '4px solid var(--savings-color)',
          }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--savings-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PiggyBank size={20} color="var(--savings-color)" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Saved this month</div>
              <div className="mono" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--savings-color)' }}>
                {currency.symbol}{totalSaved.toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Recent Expenses ── */}
      <div style={{ padding: '16px 16px 8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Recent</h3>
          {regularExpenses.length > 5 && (
            <button
              onClick={() => setActiveTab('transactions')}
              className="btn btn-ghost"
              style={{ fontSize: '0.78rem', color: 'var(--accent)', padding: '4px 8px' }}
            >
              See all ({regularExpenses.length}) →
            </button>
          )}
        </div>

        {recent.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No transactions this month.
          </div>
        ) : (
          <div className="card" style={{ overflow: 'hidden' }}>
            {recent.map((exp, i) => {
              const cat = categories.find(c => c.id === exp.categoryId) || { icon: '📦', name: 'Other', color: '#64748b' };
              const isLast = i === recent.length - 1;
              return (
                <div
                  key={exp.id}
                  onClick={() => { setEditingExpense(exp); setIsAddModalOpen(true); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '13px 16px',
                    borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  {/* Icon */}
                  <div style={{
                    width: 42, height: 42, borderRadius: 14,
                    background: `${cat.color}18`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.2rem', flexShrink: 0,
                  }}>
                    {cat.icon}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {exp.title}
                    </div>
                    <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', display: 'flex', gap: 6, marginTop: 2 }}>
                      <span style={{ color: cat.color, fontWeight: 600 }}>{cat.name}</span>
                      <span>·</span>
                      <span>{exp.date}</span>
                    </div>
                  </div>

                  {/* Amount */}
                  <span className="mono" style={{ fontSize: '0.97rem', fontWeight: 800, color: 'var(--danger)', flexShrink: 0 }}>
                    -{currency.symbol}{exp.amount.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
