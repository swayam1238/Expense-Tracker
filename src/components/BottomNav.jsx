import React from 'react';
import { useApp } from '../context/AppContext';
import { LayoutDashboard, List, PieChart, Tag, Plus } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Home', Icon: LayoutDashboard },
  { id: 'transactions', label: 'History', Icon: List },
  { id: 'add', isAction: true },
  { id: 'analytics', label: 'Stats', Icon: PieChart },
  { id: 'categories', label: 'Categories', Icon: Tag },
];

export const BottomNav = () => {
  const { activeTab, setActiveTab, setIsAddModalOpen, setEditingExpense } = useApp();

  return (
    <>
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        margin: '0 auto',
        width: 'min(100%, 480px)',
        maxWidth: 480,
        boxSizing: 'border-box',
        overflow: 'hidden',
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: `10px 8px calc(10px + var(--safe-bottom))`,
        zIndex: 700,
        gap: 0,
      }}>
        {NAV_ITEMS.map((item) => {
          if (item.isAction) {
            return (
              <button
                key="add"
                onClick={() => { setEditingExpense(null); setIsAddModalOpen(true); }}
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: '50%',
                  background: 'var(--accent-gradient)',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 18px rgba(91,94,244,0.45)',
                  transform: 'translateY(-8px)',
                  flexShrink: 0,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseDown={e => e.currentTarget.style.transform = 'translateY(-6px) scale(0.95)'}
                onMouseUp={e => e.currentTarget.style.transform = 'translateY(-8px) scale(1)'}
                aria-label="Add expense"
              >
                <Plus size={26} color="#ffffff" strokeWidth={2.5} />
              </button>
            );
          }

          const { id, label, Icon } = item;
          const isActive = activeTab === id;

          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                padding: '4px 0',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                transition: 'color 0.2s',
              }}
            >
              <div style={{
                width: 36,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 10,
                background: isActive ? 'var(--accent-soft)' : 'transparent',
                transition: 'background 0.2s',
              }}>
                <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
              </div>
              <span style={{ fontSize: '0.64rem', fontWeight: isActive ? 700 : 500, letterSpacing: '0.1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                {label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Spacer so content isn't behind nav */}
      <div style={{ height: 'calc(var(--nav-height) + var(--safe-bottom))' }} />
    </>
  );
};
