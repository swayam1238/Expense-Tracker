import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { POPULAR_EMOJIS, CATEGORY_COLORS } from '../constants';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Tag, 
  Check, 
  X, 
  Target, 
  Sparkles,
  AlertCircle
} from 'lucide-react';

export const CategoriesView = () => {
  const { 
    categories, 
    addCategory, 
    updateCategory, 
    deleteCategory, 
    expenses, 
    currency, 
    selectedMonth 
  } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🍔');
  const [color, setColor] = useState('#f97316');
  const [budget, setBudget] = useState('5000');

  // Filter current month expenses
  const monthlyExpenses = expenses.filter(exp => exp.date && exp.date.startsWith(selectedMonth));

  const handleOpenAdd = () => {
    setEditingCatId(null);
    setName('');
    setIcon('✨');
    setColor(CATEGORY_COLORS[0]);
    setBudget('5000');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat) => {
    setEditingCatId(cat.id);
    setName(cat.name);
    setIcon(cat.icon);
    setColor(cat.color);
    setBudget(cat.budget ? cat.budget.toString() : '0');
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const data = {
      name: name.trim(),
      icon,
      color,
      budget: parseFloat(budget) || 0
    };

    if (editingCatId) {
      updateCategory(editingCatId, data);
    } else {
      addCategory(data);
    }

    setIsModalOpen(false);
  };

  const handleDelete = (catId, catName) => {
    const count = expenses.filter(e => e.categoryId === catId).length;
    let message = `Are you sure you want to delete category "${catName}"?`;
    if (count > 0) {
      message += ` It is currently used in ${count} expenses (they will be reassigned to Miscellaneous).`;
    }
    if (window.confirm(message)) {
      deleteCategory(catId);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '0 16px' }}>
      {/* Header */}
      <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Customizable Categories</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Organize your spending with your own personalized tags, emojis, and budgets.
          </p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="btn btn-primary"
          style={{ fontSize: '0.85rem', padding: '8px 16px' }}
        >
          <Plus size={16} />
          <span>New Category</span>
        </button>
      </div>

      {/* Categories Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '14px'
      }}>
        {categories.map((cat) => {
          const spentThisMonth = monthlyExpenses
            .filter(e => e.categoryId === cat.id)
            .reduce((acc, curr) => acc + (curr.amount || 0), 0);

          const percent = cat.budget > 0 ? Math.min(Math.round((spentThisMonth / cat.budget) * 100), 100) : 0;
          const isOver = cat.budget > 0 && spentThisMonth > cat.budget;

          return (
            <div 
              key={cat.id} 
              className="glass-card"
              style={{
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                position: 'relative',
                borderLeft: `4px solid ${cat.color}`
              }}
            >
              {/* Top row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: `${cat.color}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.4rem'
                  }}>
                    {cat.icon}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {cat.name}
                    </h3>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Budget: {cat.budget > 0 ? `${currency.symbol}${cat.budget.toLocaleString()}` : 'No limit'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '4px' }}>
                  <button 
                    onClick={() => handleOpenEdit(cat)}
                    className="btn btn-ghost btn-icon"
                    style={{ width: '32px', height: '32px' }}
                    title="Edit category"
                  >
                    <Edit3 size={15} />
                  </button>
                  <button 
                    onClick={() => handleDelete(cat.id, cat.name)}
                    className="btn btn-ghost btn-icon"
                    style={{ width: '32px', height: '32px', color: 'var(--color-danger)' }}
                    title="Delete category"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Progress towards category budget */}
              {cat.budget > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                    <span style={{ color: isOver ? 'var(--color-danger)' : 'var(--text-muted)' }}>
                      {isOver ? 'Exceeded Budget' : `${percent}% used`}
                    </span>
                    <span className="mono" style={{ fontWeight: 600 }}>
                      {currency.symbol}{spentThisMonth.toLocaleString()} / {currency.symbol}{cat.budget.toLocaleString()}
                    </span>
                  </div>

                  <div style={{ height: '6px', background: 'var(--bg-primary)', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${percent}%`,
                      height: '100%',
                      background: isOver ? 'var(--color-danger)' : cat.color,
                      borderRadius: '99px',
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add / Edit Category Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div 
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '480px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.5rem' }}>{icon}</span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                  {editingCatId ? 'Edit Category' : 'Create Custom Category'}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="btn btn-ghost btn-icon">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Category Name */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gaming, Gym, Crypto, Coffee"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input"
                  autoFocus
                />
              </div>

              {/* Monthly Budget Target */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                  Monthly Budget Limit ({currency.symbol})
                </label>
                <input
                  type="number"
                  placeholder="e.g. 5000"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="input mono"
                />
              </div>

              {/* Emoji Selector */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                  Choose Emoji Icon
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(8, 1fr)',
                  gap: '6px',
                  maxHeight: '140px',
                  overflowY: 'auto',
                  background: 'var(--bg-primary)',
                  padding: '8px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)'
                }}>
                  {POPULAR_EMOJIS.map(em => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setIcon(em)}
                      style={{
                        background: icon === em ? 'var(--accent-primary)' : 'transparent',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '1.25rem',
                        padding: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Palette Selector */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                  Choose Color Accent
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    title="Choose any color"
                    style={{ width: '48px', height: '36px', padding: '2px', border: '1px solid var(--border-subtle)', borderRadius: '8px', background: 'transparent', cursor: 'pointer' }}
                  />
                  <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{color.toUpperCase()}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {CATEGORY_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: c,
                        border: color === c ? '3px solid #ffffff' : 'none',
                        boxShadow: color === c ? `0 0 12px ${c}` : 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {color === c && <Check size={14} color="#fff" strokeWidth={3} />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                >
                  <Check size={16} />
                  <span>{editingCatId ? 'Save Changes' : 'Create Category'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
