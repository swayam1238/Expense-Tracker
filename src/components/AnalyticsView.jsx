import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PAYMENT_METHODS } from '../constants';
import { 
  CreditCard, 
} from 'lucide-react';

export const AnalyticsView = () => {
  const { expenses, categories, currency, selectedMonth, monthlyBudget } = useApp();
  const [activeCategoryHover, setActiveCategoryHover] = useState(null);

  // Filter current month expenses
  const monthlyExpenses = expenses.filter(exp => exp.date && exp.date.startsWith(selectedMonth));
  const spendingExpenses = monthlyExpenses.filter(exp => exp.categoryId !== 'cat-savings');
  const totalSpent = spendingExpenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const totalSaved = monthlyExpenses
    .filter(exp => exp.categoryId === 'cat-savings')
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const chartTotal = totalSpent + totalSaved;

  // Group by Category, including savings and expenses with retired category IDs.
  const categoryStats = categories.map(cat => {
    const matchingExpenses = monthlyExpenses.filter(exp => exp.categoryId === cat.id);
    const total = matchingExpenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const percentage = chartTotal > 0 ? (total / chartTotal) * 100 : 0;
    return {
      ...cat,
      total,
      count: matchingExpenses.length,
      percentage
    };
  }).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

  const knownCategoryIds = new Set(categories.map(cat => cat.id));
  const uncategorizedExpenses = monthlyExpenses.filter(exp => !knownCategoryIds.has(exp.categoryId));
  const uncategorizedTotal = uncategorizedExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  if (uncategorizedTotal > 0) {
    categoryStats.push({
      id: 'cat-uncategorized',
      name: 'Uncategorized',
      icon: '📌',
      color: '#94a3b8',
      total: uncategorizedTotal,
      count: uncategorizedExpenses.length,
      percentage: chartTotal > 0 ? (uncategorizedTotal / chartTotal) * 100 : 0
    });
    categoryStats.sort((a, b) => b.total - a.total);
  }

  // Group by Payment Method
  const paymentStats = PAYMENT_METHODS.map(pm => {
    const total = spendingExpenses
      .filter(exp => exp.paymentMethod === pm.id)
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const count = spendingExpenses.filter(exp => exp.paymentMethod === pm.id).length;
    const percentage = totalSpent > 0 ? (total / totalSpent) * 100 : 0;
    return {
      ...pm,
      total,
      count,
      percentage
    };
  }).sort((a, b) => b.total - a.total);

  // Group by Day (for trend chart)
  const daysInCurrentMonth = 31;
  const dailySpendMap = {};
  for (let i = 1; i <= daysInCurrentMonth; i++) {
    const dayStr = String(i).padStart(2, '0');
    dailySpendMap[dayStr] = 0;
  }
  monthlyExpenses.forEach(exp => {
    if (exp.date) {
      const day = exp.date.split('-')[2];
      if (day && dailySpendMap[day] !== undefined) {
        dailySpendMap[day] += exp.amount || 0;
      }
    }
  });

  const dailySpendList = Object.entries(dailySpendMap).map(([day, amount]) => ({
    day: parseInt(day, 10),
    amount
  }));

  const maxDailySpend = Math.max(...dailySpendList.map(d => d.amount), 1);

  // SVG Donut Chart Calculation
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  let accumulatedAngle = 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '0 16px' }}>
      {/* Header */}
      <div className="glass-card" style={{ padding: '18px 20px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Financial Analytics & Breakdown</h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Detailed visual insights into where your money flows this month.
        </p>
      </div>

      {/* Two Column Grid: Donut Chart & Category Table */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '16px'
      }}>
        {/* Interactive Donut Breakdown */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, width: '100%', marginBottom: '16px' }}>
            Category Distribution
          </h3>

          {categoryStats.length === 0 ? (
            <div style={{ padding: '40px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No expenses recorded to visualize.
            </div>
          ) : (
            <div style={{ position: 'relative', width: '220px', height: '220px', margin: '10px 0' }}>
              <svg width="220" height="220" viewBox="0 0 200 200" style={{ transform: 'rotate(-90deg)' }}>
                <circle
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="none"
                  stroke="var(--bg-primary)"
                  strokeWidth="24"
                />
                {categoryStats.map((cat, idx) => {
                  const strokeDasharray = `${(cat.percentage / 100) * circumference} ${circumference}`;
                  const strokeDashoffset = -accumulatedAngle;
                  accumulatedAngle += (cat.percentage / 100) * circumference;

                  return (
                    <circle
                      key={cat.id}
                      cx="100"
                      cy="100"
                      r={radius}
                      fill="none"
                      stroke={cat.color}
                      strokeWidth="24"
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      style={{
                        transition: 'stroke-width 0.2s ease, opacity 0.2s ease',
                        cursor: 'pointer',
                        opacity: activeCategoryHover && activeCategoryHover.id !== cat.id ? 0.4 : 1
                      }}
                      onMouseEnter={() => setActiveCategoryHover(cat)}
                      onMouseLeave={() => setActiveCategoryHover(null)}
                    />
                  );
                })}
              </svg>

              {/* Center Info in Donut */}
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                pointerEvents: 'none'
              }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {activeCategoryHover ? activeCategoryHover.name : 'Total This Month'}
                </span>
                <span className="mono" style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                  {currency.symbol}
                  {activeCategoryHover ? activeCategoryHover.total.toLocaleString() : chartTotal.toLocaleString()}
                </span>
                {activeCategoryHover && (
                  <span style={{ fontSize: '0.75rem', color: activeCategoryHover.color, fontWeight: 700 }}>
                    {activeCategoryHover.percentage.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Legend / Chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '14px' }}>
            {categoryStats.map(cat => (
              <div 
                key={cat.id}
                onMouseEnter={() => setActiveCategoryHover(cat)}
                onMouseLeave={() => setActiveCategoryHover(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  background: 'var(--bg-primary)',
                  borderRadius: 'var(--radius-full)',
                  border: `1px solid ${activeCategoryHover?.id === cat.id ? cat.color : 'var(--border-subtle)'}`,
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: cat.color }} />
                <span>{cat.name}</span>
                <span className="mono" style={{ fontWeight: 700, color: 'var(--text-muted)' }}>
                  {cat.percentage.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Methods Breakdown */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CreditCard size={18} style={{ color: 'var(--accent-primary)' }} />
            Payment Mode Distribution
          </h3>

          {paymentStats.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No data available.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {paymentStats.map(pm => (
                <div key={pm.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px', fontSize: '0.85rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                      <span>{pm.icon}</span>
                      <span>{pm.name}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({pm.count} txns)</span>
                    </span>
                    <span className="mono" style={{ fontWeight: 700 }}>
                      {currency.symbol}{pm.total.toLocaleString()}
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '6px' }}>
                        ({pm.percentage.toFixed(1)}%)
                      </span>
                    </span>
                  </div>

                  <div style={{ height: '8px', background: 'var(--bg-primary)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${pm.percentage}%`,
                      height: '100%',
                      background: pm.color || 'var(--accent-primary)',
                      borderRadius: '999px',
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* Daily Spending Trend Histogram */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Daily Spending Timeline</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Days 1 to {daysInCurrentMonth} of current month</p>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '4px',
          height: '140px',
          paddingTop: '20px',
          borderBottom: '1px solid var(--border-subtle)'
        }}>
          {dailySpendList.map(item => {
            const heightPercent = maxDailySpend > 0 ? (item.amount / maxDailySpend) * 100 : 0;
            const hasSpend = item.amount > 0;
            return (
              <div
                key={item.day}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  height: '100%',
                  justifyContent: 'flex-end',
                  position: 'relative'
                }}
                title={`Day ${item.day}: ${currency.symbol}${item.amount.toLocaleString()}`}
              >
                <div style={{
                  width: '100%',
                  maxWidth: '14px',
                  height: `${Math.max(hasSpend ? 6 : 2, heightPercent)}%`,
                  background: hasSpend ? 'var(--accent-gradient)' : 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '4px 4px 0 0',
                  transition: 'height 0.3s ease'
                }} />
              </div>
            );
          })}
        </div>

        {/* X Axis Labels */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          <span>Day 1</span>
          <span>Day 10</span>
          <span>Day 20</span>
          <span>Day {daysInCurrentMonth}</span>
        </div>
      </div>
    </div>
  );
};
