import React, { useState } from 'react';

const CHART_OPTIONS = [
  { id: 'pie', label: 'Pie' },
  { id: 'bar', label: 'Bar' },
  { id: 'line', label: 'Line' }
];

const CHART_WIDTH = 600;
const CHART_HEIGHT = 250;
const CHART_PADDING = { top: 20, right: 24, bottom: 48, left: 42 };
const PIE_RADIUS = 78;
const PIE_CIRCUMFERENCE = 2 * Math.PI * PIE_RADIUS;

const formatAmount = (amount) => Number(amount || 0).toLocaleString(undefined, {
  maximumFractionDigits: 2
});

export const ChartTypeControl = ({ value, onChange, label = 'Chart type' }) => (
  <div
    role="group"
    aria-label={label}
    style={{
      display: 'inline-flex',
      gap: 3,
      padding: 3,
      background: 'var(--bg-input)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)'
    }}
  >
    {CHART_OPTIONS.map(option => (
      <button
        key={option.id}
        type="button"
        aria-pressed={value === option.id}
        onClick={() => onChange(option.id)}
        style={{
          border: 0,
          borderRadius: 'var(--radius-sm)',
          padding: '6px 10px',
          background: value === option.id ? 'var(--bg-surface)' : 'transparent',
          color: value === option.id ? 'var(--text-primary)' : 'var(--text-secondary)',
          boxShadow: value === option.id ? 'var(--shadow-xs)' : 'none',
          font: 'inherit',
          fontSize: '0.76rem',
          fontWeight: 700,
          cursor: 'pointer'
        }}
      >
        {option.label}
      </button>
    ))}
  </div>
);

export const ExpenseChart = ({
  data = [],
  type = 'pie',
  currencySymbol = '₹',
  centerLabel = '',
  centerFooter = '',
  showLegend = false
}) => {
  const [hoveredId, setHoveredId] = useState(null);
  const chartData = data.map(item => ({ ...item, value: Number(item.value) || 0 }));
  const total = chartData.reduce((sum, item) => sum + item.value, 0);
  const maximum = Math.max(...chartData.map(item => item.value), 1);
  const hoveredItem = chartData.find(item => item.id === hoveredId);

  if (type === 'bar') {
    return (
      <div style={{ width: '100%', display: 'grid', gap: 12 }}>
        {chartData.map(item => (
          <div key={item.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(100px, 1fr) minmax(90px, 2fr) auto', alignItems: 'center', gap: 10 }}>
            <span title={item.name} style={{ minWidth: 0, overflowWrap: 'anywhere', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {item.icon ? `${item.icon} ` : ''}{item.name}
            </span>
            <div style={{ height: 10, background: 'var(--bg-input)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ width: `${(item.value / maximum) * 100}%`, height: '100%', background: item.color, borderRadius: 99, transition: 'width 0.25s ease' }} />
            </div>
            <span className="mono" style={{ fontSize: '0.76rem', fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap' }}>
              {currencySymbol}{formatAmount(item.value)}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'line') {
    const plotWidth = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
    const plotHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;
    const points = chartData.map((item, index) => ({
      ...item,
      x: CHART_PADDING.left + (chartData.length > 1 ? index * plotWidth / (chartData.length - 1) : plotWidth / 2),
      y: CHART_PADDING.top + plotHeight - item.value / maximum * plotHeight
    }));

    return (
      <div style={{ width: '100%', minWidth: 0 }}>
        <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} role="img" aria-label="Expense amounts line chart" style={{ display: 'block', width: '100%', height: 'auto', overflow: 'visible' }}>
          {[0, 0.5, 1].map(fraction => {
            const y = CHART_PADDING.top + plotHeight * fraction;
            return <line key={fraction} x1={CHART_PADDING.left} x2={CHART_WIDTH - CHART_PADDING.right} y1={y} y2={y} stroke="var(--border-subtle)" />;
          })}
          {points.length > 1 && (
            <polyline
              points={points.map(point => `${point.x},${point.y}`).join(' ')}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
          {points.map(point => (
            <g key={point.id}>
              <circle cx={point.x} cy={point.y} r="5" fill={point.color || 'var(--accent)'} stroke="var(--bg-surface)" strokeWidth="2">
                <title>{`${point.name}: ${currencySymbol}${formatAmount(point.value)}`}</title>
              </circle>
              <text x={point.x} y={CHART_HEIGHT - 16} textAnchor="middle" fill="var(--text-muted)" fontSize="11">
                {point.name.length > 10 ? `${point.name.slice(0, 9)}…` : point.name}
              </text>
            </g>
          ))}
        </svg>
      </div>
    );
  }

  const slices = chartData.map((item, index) => {
    const percent = total > 0 ? item.value / total * 100 : 0;
    const offset = chartData.slice(0, index).reduce((sum, previous) => (
      sum + (total > 0 ? previous.value / total * PIE_CIRCUMFERENCE : 0)
    ), 0);
    return { ...item, percent, offset };
  }).filter(slice => slice.value > 0);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ position: 'relative', width: 'min(220px, 100%)', aspectRatio: '1' }}>
        <svg viewBox="0 0 200 200" role="img" aria-label="Expense distribution pie chart" style={{ display: 'block', width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
          <circle cx="100" cy="100" r={PIE_RADIUS} fill="none" stroke="var(--bg-input)" strokeWidth="24" />
          {slices.map(slice => (
            <circle
              key={slice.id}
              cx="100"
              cy="100"
              r={PIE_RADIUS}
              fill="none"
              stroke={slice.color}
              strokeWidth={hoveredId === slice.id ? 30 : 24}
              strokeDasharray={`${slice.percent / 100 * PIE_CIRCUMFERENCE} ${PIE_CIRCUMFERENCE}`}
              strokeDashoffset={-slice.offset}
              style={{ cursor: 'pointer', opacity: hoveredId && hoveredId !== slice.id ? 0.4 : 1, transition: 'stroke-width 0.2s, opacity 0.2s' }}
              onMouseEnter={() => setHoveredId(slice.id)}
              onMouseLeave={() => setHoveredId(null)}
              onTouchStart={() => setHoveredId(slice.id)}
            >
              <title>{`${slice.name}: ${currencySymbol}${formatAmount(slice.value)}`}</title>
            </circle>
          ))}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', pointerEvents: 'none', padding: 18 }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.2 }}>
            {hoveredItem?.name || centerLabel}
          </span>
          <span className="mono" style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: 2 }}>
            {currencySymbol}{formatAmount(hoveredItem?.value ?? total)}
          </span>
          {centerFooter && !hoveredItem && <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 3 }}>{centerFooter}</span>}
        </div>
      </div>
      {showLegend && (
        <div style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px 14px', marginTop: 12 }}>
          {chartData.map(item => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: '0.78rem' }}>
              <span title={item.name} style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flex: '0 0 auto' }} />
                <span style={{ overflowWrap: 'anywhere' }}>{item.name}</span>
              </span>
              <span className="mono" style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{currencySymbol}{formatAmount(item.value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};