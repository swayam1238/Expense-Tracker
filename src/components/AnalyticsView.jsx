import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { DEFAULT_CATEGORIES, PAYMENT_METHODS } from '../constants';
import { CreditCard } from 'lucide-react';
import { ChartTypeControl, ExpenseChart } from './ExpenseChart';

const MONTH_COLORS = ['#197c80', '#de714b', '#5a8b62', '#d1a42a', '#5673a6', '#bb5b7a', '#7b68a5', '#548a8b', '#9a7046', '#4f7c55', '#ab5d46', '#516f91'];
const UNCATEGORIZED_ID = 'comparison-uncategorized';

const shiftMonth = (monthKey, offset) => {
  const [year, month] = monthKey.split('-').map(Number);
  const shifted = new Date(year, month - 1 + offset, 1);
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, '0')}`;
};

const monthLabel = (monthKey) => {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
};

export const AnalyticsView = () => {
  const { expenses, categories, categoriesByMonth, currency, selectedMonth, expenseChartType, setExpenseChartType } = useApp();
  const [comparisonRange, setComparisonRange] = useState('month');
  const [customMonthA, setCustomMonthA] = useState(() => shiftMonth(selectedMonth, -1));
  const [customMonthB, setCustomMonthB] = useState(selectedMonth);

  const monthlyExpenses = useMemo(
    () => expenses.filter(exp => exp.date && exp.date.startsWith(selectedMonth)),
    [expenses, selectedMonth]
  );
  const spendingExpenses = useMemo(
    () => monthlyExpenses.filter(exp => exp.categoryId !== 'cat-savings'),
    [monthlyExpenses]
  );
  const totalSpent = useMemo(
    () => spendingExpenses.reduce((acc, curr) => acc + (curr.amount || 0), 0),
    [spendingExpenses]
  );
  const totalSaved = useMemo(
    () => monthlyExpenses
      .filter(exp => exp.categoryId === 'cat-savings')
      .reduce((acc, curr) => acc + (curr.amount || 0), 0),
    [monthlyExpenses]
  );
  const chartTotal = totalSpent + totalSaved;

  const categoryTotals = useMemo(() => {
    const totals = new Map();
    const counts = new Map();
    for (const expense of monthlyExpenses) {
      const categoryId = expense.categoryId;
      totals.set(categoryId, (totals.get(categoryId) || 0) + (Number(expense.amount) || 0));
      counts.set(categoryId, (counts.get(categoryId) || 0) + 1);
    }
    return { totals, counts };
  }, [monthlyExpenses]);

  const categoryStats = useMemo(() => {
    const stats = categories.map(cat => {
      const total = categoryTotals.totals.get(cat.id) || 0;
      return {
        ...cat,
        total,
        count: categoryTotals.counts.get(cat.id) || 0,
        percentage: chartTotal > 0 ? (total / chartTotal) * 100 : 0
      };
    }).filter(category => category.total > 0);

    const knownCategoryIds = new Set(categories.map(cat => cat.id));
    const uncategorizedExpenses = monthlyExpenses.filter(exp => !knownCategoryIds.has(exp.categoryId));
    const uncategorizedTotal = uncategorizedExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
    if (uncategorizedTotal > 0) {
      stats.push({
        id: 'cat-uncategorized',
        name: 'Uncategorized',
        icon: '📌',
        color: '#94a3b8',
        total: uncategorizedTotal,
        count: uncategorizedExpenses.length,
        percentage: chartTotal > 0 ? (uncategorizedTotal / chartTotal) * 100 : 0
      });
    }

    return stats.sort((a, b) => b.total - a.total);
  }, [categories, monthlyExpenses, chartTotal, categoryTotals]);

  const comparisonMonthKeys = useMemo(() => {
    if (comparisonRange === 'custom') {
      return [customMonthA, customMonthB].filter(Boolean);
    }
    if (comparisonRange === 'month') {
      return [shiftMonth(selectedMonth, -1), selectedMonth];
    }

    const count = Number(comparisonRange);
    return Array.from({ length: count }, (_, index) => shiftMonth(selectedMonth, index - count + 1));
  }, [comparisonRange, customMonthA, customMonthB, selectedMonth]);

  const comparisonStats = useMemo(() => comparisonMonthKeys.map((monthKey, index) => ({
    id: `${monthKey}-${index}`,
    monthKey,
    name: monthLabel(monthKey),
    color: MONTH_COLORS[index % MONTH_COLORS.length],
    value: expenses.reduce((sum, expense) => (
      expense.date?.startsWith(monthKey) ? sum + (Number(expense.amount) || 0) : sum
    ), 0)
  })), [comparisonMonthKeys, expenses]);

  const categoryComparisonRows = useMemo(() => {
    const categoryDefinitions = comparisonMonthKeys.map(monthKey => {
      if (Array.isArray(categoriesByMonth[monthKey])) return categoriesByMonth[monthKey];
      const earlierSnapshots = Object.keys(categoriesByMonth).filter(key => key <= monthKey).sort();
      const latestEarlierSnapshot = earlierSnapshots[earlierSnapshots.length - 1];
      return latestEarlierSnapshot ? categoriesByMonth[latestEarlierSnapshot] : DEFAULT_CATEGORIES;
    });
    const amountsByMonth = comparisonMonthKeys.map(monthKey => {
      const amounts = new Map();
      expenses.forEach(expense => {
        if (!expense.date?.startsWith(monthKey)) return;
        const categoryId = expense.categoryId || UNCATEGORIZED_ID;
        amounts.set(categoryId, (amounts.get(categoryId) || 0) + (Number(expense.amount) || 0));
      });
      return amounts;
    });
    const categoryIds = new Set(categoryDefinitions.flatMap(monthCategories => monthCategories.map(category => category.id)));
    amountsByMonth.forEach(amounts => amounts.forEach((_, categoryId) => categoryIds.add(categoryId)));

    return [...categoryIds].map(id => {
      const definitions = categoryDefinitions.map(monthCategories => monthCategories.find(category => category.id === id) || null);
      const knownDefinitions = definitions.filter(Boolean);
      const uniqueNames = [...new Set(knownDefinitions.map(category => category.name))];
      const currentDefinition = [...definitions].reverse().find(Boolean);
      const firstDefinition = definitions[0];
      const lastDefinition = definitions[definitions.length - 1];
      const total = amountsByMonth.reduce((sum, amounts) => sum + (amounts.get(id) || 0), 0);
      const status = !firstDefinition && lastDefinition
        ? 'Added'
        : firstDefinition && !lastDefinition
          ? 'Removed'
          : uniqueNames.length > 1
            ? 'Renamed'
            : id !== UNCATEGORIZED_ID && knownDefinitions.length === 0 && total > 0
              ? 'Removed'
              : '';
      const fallbackName = id === UNCATEGORIZED_ID ? 'Uncategorized' : 'Removed category';

      return {
        id,
        name: currentDefinition?.name || knownDefinitions[0]?.name || fallbackName,
        icon: currentDefinition?.icon || knownDefinitions[0]?.icon || (id === UNCATEGORIZED_ID ? '📌' : '📦'),
        color: currentDefinition?.color || knownDefinitions[0]?.color || '#94a3b8',
        status,
        statusDetail: uniqueNames.length > 1 ? `Previously ${uniqueNames.slice(0, -1).join(', ')}` : '',
        values: amountsByMonth.map(amounts => amounts.get(id) || 0),
        total
      };
    }).sort((left, right) => right.total - left.total || left.name.localeCompare(right.name));
  }, [comparisonMonthKeys, categoriesByMonth, expenses]);

  const comparisonDelta = comparisonRange === 'month' || comparisonRange === 'custom'
    ? comparisonStats.length === 2
      ? comparisonStats[1].value - comparisonStats[0].value
      : null
    : null;
  const customComparisonValid = comparisonRange !== 'custom'
    || Boolean(customMonthA && customMonthB && customMonthA !== customMonthB);

  const comparisonRangeLabel = comparisonRange === 'month'
    ? `${monthLabel(comparisonMonthKeys[0])} vs ${monthLabel(comparisonMonthKeys[1])}`
    : comparisonRange === 'custom'
      ? (customMonthA && customMonthB ? `${monthLabel(customMonthA)} vs ${monthLabel(customMonthB)}` : 'Select two months')
      : `Last ${comparisonRange} months through ${monthLabel(selectedMonth)}`;

  const paymentStats = useMemo(() => PAYMENT_METHODS.map(pm => {
    const matching = spendingExpenses.filter(exp => exp.paymentMethod === pm.id);
    const total = matching.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    return {
      ...pm,
      total,
      count: matching.length,
      percentage: totalSpent > 0 ? (total / totalSpent) * 100 : 0
    };
  }).sort((a, b) => b.total - a.total), [spendingExpenses, totalSpent]);

  const daysInCurrentMonth = 31;
  const dailySpendList = useMemo(() => {
    const dailySpendMap = {};
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      dailySpendMap[String(i).padStart(2, '0')] = 0;
    }
    monthlyExpenses.forEach(exp => {
      if (exp.date) {
        const day = exp.date.split('-')[2];
        if (day && dailySpendMap[day] !== undefined) {
          dailySpendMap[day] += exp.amount || 0;
        }
      }
    });
    return Object.entries(dailySpendMap).map(([day, amount]) => ({
      day: parseInt(day, 10),
      amount
    }));
  }, [monthlyExpenses]);

  const maxDailySpend = useMemo(
    () => Math.max(...dailySpendList.map(d => d.amount), 1),
    [dailySpendList]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '0 16px' }}>
      {/* Header */}
      <div className="glass-card" style={{ padding: '18px 20px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Financial Analytics & Breakdown</h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Detailed visual insights into where your money flows this month.
        </p>
      </div>

      <section className="glass-card" aria-labelledby="monthly-comparison-title" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <div>
            <h3 id="monthly-comparison-title" style={{ fontSize: '1rem', fontWeight: 700 }}>Monthly Spending Comparison</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 3 }}>{comparisonRangeLabel}</p>
          </div>
          <ChartTypeControl value={expenseChartType} onChange={setExpenseChartType} label="Monthly comparison chart type" />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {[
            { id: 'month', label: 'Month vs prior' },
            { id: '3', label: '3 months' },
            { id: '6', label: '6 months' },
            { id: '12', label: '12 months' },
            { id: 'custom', label: 'Custom' }
          ].map(option => (
            <button
              key={option.id}
              type="button"
              aria-pressed={comparisonRange === option.id}
              onClick={() => setComparisonRange(option.id)}
              className="btn"
              style={{
                padding: '7px 11px',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${comparisonRange === option.id ? 'var(--accent)' : 'var(--border-subtle)'}`,
                background: comparisonRange === option.id ? 'var(--accent-soft)' : 'var(--bg-input)',
                color: comparisonRange === option.id ? 'var(--accent)' : 'var(--text-secondary)',
                fontSize: '0.76rem'
              }}
            >
              {option.label}
            </button>
          ))}
        </div>

        {comparisonRange === 'custom' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'end', gap: 12, marginBottom: 16 }}>
            <label style={{ display: 'grid', gap: 5, fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              First month
              <input className="input" type="month" value={customMonthA} onChange={event => setCustomMonthA(event.target.value)} />
            </label>
            <label style={{ display: 'grid', gap: 5, fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Second month
              <input className="input" type="month" value={customMonthB} onChange={event => setCustomMonthB(event.target.value)} />
            </label>
          </div>
        )}

        {!customComparisonValid ? (
          <p role="status" style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            {customMonthA && customMonthB ? 'Choose two different months to compare.' : 'Choose both months to compare.'}
          </p>
        ) : (
          <>
            {comparisonDelta !== null && (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 14 }}>
                {comparisonDelta > 0 ? 'Spending increased' : comparisonDelta < 0 ? 'Spending decreased' : 'Spending was unchanged'} by{' '}
                <strong className="mono" style={{ color: comparisonDelta > 0 ? 'var(--danger)' : 'var(--success)' }}>
                  {currency.symbol}{Math.abs(comparisonDelta).toLocaleString()}
                </strong>
                {' '}from {monthLabel(comparisonMonthKeys[0])} to {monthLabel(comparisonMonthKeys[1])}.
              </p>
            )}
            <ExpenseChart
              data={comparisonStats}
              type={expenseChartType}
              currencySymbol={currency.symbol}
              centerLabel={comparisonRange === 'month' || comparisonRange === 'custom' ? 'Compared total' : `${comparisonRange} month total`}
              showLegend={expenseChartType === 'pie'}
            />
            <div style={{ marginTop: 22 }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 10 }}>Category-by-category comparison</h4>
              <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                <table aria-label="Category spending by month" style={{ width: '100%', minWidth: `${Math.max(440, 210 + comparisonStats.length * 92)}px`, borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                      <th scope="col" style={{ padding: '10px 12px', minWidth: 180 }}>Category</th>
                      {comparisonStats.map(month => (
                        <th key={month.id} scope="col" style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>{month.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {categoryComparisonRows.map(category => (
                      <tr key={category.id} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                        <th scope="row" style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600 }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                            <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: '50%', background: category.color, marginTop: 5, flex: '0 0 auto' }} />
                            <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                              {category.icon} {category.name}
                              {category.status && <span className="badge" style={{ marginLeft: 6, fontSize: '0.62rem' }}>{category.status}</span>}
                              {category.statusDetail && <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.68rem', fontWeight: 400 }}>{category.statusDetail}</span>}
                            </span>
                          </div>
                        </th>
                        {category.values.map((amount, index) => (
                          <td key={`${category.id}-${comparisonStats[index].id}`} className="mono" style={{ padding: '9px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            {currency.symbol}{amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid var(--border-medium)', fontWeight: 800 }}>
                      <th scope="row" style={{ padding: '10px 12px', textAlign: 'left' }}>Total</th>
                      {comparisonStats.map(month => (
                        <td key={`total-${month.id}`} className="mono" style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {currency.symbol}{month.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Two Column Grid: Donut Chart & Category Table */}
      <div className="analytics-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '16px'
      }}>
        {/* Interactive Donut Breakdown */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Category Distribution</h3>
            <ChartTypeControl value={expenseChartType} onChange={setExpenseChartType} label="Stats chart type" />
          </div>

          {categoryStats.length === 0 ? (
            <div style={{ padding: '40px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No expenses recorded to visualize.
            </div>
          ) : (
            <ExpenseChart
              data={categoryStats.map(category => ({ ...category, value: category.total }))}
              type={expenseChartType}
              currencySymbol={currency.symbol}
              centerLabel="Total This Month"
            />
          )}

          {expenseChartType !== 'bar' && categoryStats.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '14px' }}>
              {categoryStats.map(category => (
                <div key={category.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-subtle)', fontSize: '0.75rem' }}>
                  <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: category.color }} />
                  <span>{category.name}</span>
                  <span className="mono" style={{ fontWeight: 700, color: 'var(--text-muted)' }}>{category.percentage.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          )}
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
