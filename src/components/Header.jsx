import React from 'react';
import { useApp } from '../context/AppContext';
import { ChevronLeft, ChevronRight, Moon, Sun, User, LogOut } from 'lucide-react';

export const Header = () => {
  const {
    theme, toggleTheme,
    user, logoutUser, setIsAuthModalOpen,
    selectedMonth, setSelectedMonth
  } = useApp();

  const handlePrev = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNext = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const [year, month] = selectedMonth.split('-').map(Number);
  const isCurrentMonth = (() => {
    const now = new Date();
    return now.getFullYear() === year && (now.getMonth() + 1) === month;
  })();

  const months = Array.from({ length: 12 }, (_, index) => ({
    value: String(index + 1).padStart(2, '0'),
    label: new Date(2024, index, 1).toLocaleDateString('en-US', { month: 'long' })
  }));

  const minYear = 2000;
  const maxYear = new Date().getFullYear() + 5;
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, index) => minYear + index);

  const label = new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'long', year: 'numeric'
  });

  const handleMonthChange = (nextMonth) => {
    setSelectedMonth(`${year}-${String(nextMonth).padStart(2, '0')}`);
  };

  const handleYearChange = (nextYear) => {
    setSelectedMonth(`${nextYear}-${String(month).padStart(2, '0')}`);
  };

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: `calc(16px + var(--safe-top)) 20px 14px`,
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border-subtle)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }} className="app-header">
      {/* Left: Auth + month selector */}
      <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '80px', flexWrap: 'wrap' }}>
        {user ? (
          <button
            onClick={logoutUser}
            className="btn btn-ghost"
            style={{ padding: '6px', width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-soft)' }}
            title="Sign Out"
          >
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent)' }}>
              {user.email.charAt(0).toUpperCase()}
            </span>
          </button>
        ) : (
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="btn btn-ghost"
            style={{ padding: '6px', width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-input)' }}
            title="Sign in"
          >
            <User size={18} color="var(--text-muted)" />
          </button>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', padding: '4px 6px' }}>
          <select
            value={String(month).padStart(2, '0')}
            onChange={(e) => handleMonthChange(e.target.value)}
            className="select"
            style={{ minWidth: '88px', fontSize: '0.75rem', padding: '6px 8px' }}
          >
            {months.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => handleYearChange(Number(e.target.value))}
            className="select"
            style={{ minWidth: '78px', fontSize: '0.75rem', padding: '6px 8px' }}
          >
            {years.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Center: Month Navigator */}
      <div className="header-center" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
        <button onClick={handlePrev} className="btn btn-ghost" style={{ padding: '6px', borderRadius: '50%', width: 32, height: 32 }}>
          <ChevronLeft size={18} />
        </button>

        <div style={{ textAlign: 'center', padding: '0 4px', minWidth: '170px' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-primary)' }}>Hi Swayam,</div>
          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginBottom: 3 }}>Welcome to your expense tracker</div>
          {isCurrentMonth ? (
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent)' }}>This Month</div>
          ) : null}
          <div style={{ fontSize: isCurrentMonth ? '0.72rem' : '0.88rem', fontWeight: isCurrentMonth ? 500 : 700, color: isCurrentMonth ? 'var(--text-muted)' : 'var(--text-primary)' }}>
            {label}
          </div>
        </div>

        <button
          onClick={handleNext}
          className="btn btn-ghost"
          style={{ padding: '6px', borderRadius: '50%', width: 32, height: 32, opacity: isCurrentMonth ? 0.3 : 1, pointerEvents: isCurrentMonth ? 'none' : 'auto' }}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Right: Theme Toggle */}
      <div className="header-right" style={{ minWidth: '80px', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={toggleTheme}
          className="btn btn-ghost"
          style={{ padding: '6px', width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-input)' }}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? <Sun size={18} color="#f59e0b" /> : <Moon size={18} color="var(--accent)" />}
        </button>
      </div>
    </header>
  );
};
