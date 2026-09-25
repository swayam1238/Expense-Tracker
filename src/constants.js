export const DEFAULT_CATEGORIES = [
  { id: 'cat-savings', name: 'Savings', icon: '🐷', color: '#10b981', budget: 0 },
  { id: 'cat-travel', name: 'Travel', icon: '🚕', color: '#3b82f6', budget: 5000 },
  { id: 'cat-groceries', name: 'Groceries', icon: '🛒', color: '#10b981', budget: 6000 },
  { id: 'cat-rent-bills', name: 'Rent, Utilities and Bills', icon: '⚡', color: '#eab308', budget: 12000 },
  { id: 'cat-food', name: 'Food', icon: '🍔', color: '#f97316', budget: 8000 },
  { id: 'cat-entertainment', name: 'Entertainment and Outings', icon: '🎬', color: '#8b5cf6', budget: 4000 },
  { id: 'cat-misc', name: 'Miscellaneous', icon: '📦', color: '#64748b', budget: 2000 },
];

export const normalizePaymentMethod = (method) => {
  const value = String(method || '').toLowerCase();
  if (!value) return 'upi';
  if (['card', 'credit', 'debit', 'credit-card', 'creditcard', 'debit-card'].includes(value)) return 'credit-card';
  if (['cash', 'cashpayment'].includes(value)) return 'cash';
  return 'upi';
};

export const PAYMENT_METHODS = [
  { id: 'upi', name: 'UPI', icon: '📱', color: '#8b5cf6' },
  { id: 'credit-card', name: 'Credit Card', icon: '💳', color: '#3b82f6' },
  { id: 'cash', name: 'Cash', icon: '💵', color: '#10b981' }
];

export const POPULAR_EMOJIS = [
  '🍔', '🍕', '☕', '🍜', '🛒', '🚕', '✈️', '⛽', '🛍️', '👕', 
  '⚡', '📱', '🏠', '🎬', '🎮', '🎵', '💊', '🏋️', '📚', '💻', 
  '📈', '💰', '🎁', '🐶', '🚂', '🍺', '💇', '🎨', '📦', '🌟'
];

export const CATEGORY_COLORS = [
  '#f97316', '#ef4444', '#ec4899', '#8b5cf6', '#6366f1', 
  '#3b82f6', '#06b6d4', '#14b8a6', '#10b981', '#84cc16', 
  '#eab308', '#f59e0b', '#64748b', '#78716c'
];

