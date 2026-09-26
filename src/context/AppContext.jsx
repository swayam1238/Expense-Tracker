import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  DEFAULT_CATEGORIES,
  normalizePaymentMethod
} from '../constants';
import { 
  isFirebaseConfigured, 
  listenToAuth, 
  subscribeUserExpenses, 
  addExpenseToCloud, 
  updateExpenseInCloud, 
  deleteExpenseFromCloud,
  subscribeUserSettings,
  saveUserSettingsToCloud,
  logoutUser,
  isAllowedUser
} from '../firebase';
import {
  lockApp,
  getLockModeKey,
  getPasscodeHashKey
} from '../utils/appLock';

const AppContext = createContext();

const LOCAL_STORAGE_EXPENSES_KEY = 'spendflow_expenses_v1';
const LOCAL_STORAGE_CATEGORIES_KEY = 'spendflow_categories_v1';
const LOCAL_STORAGE_CATEGORY_MONTHS_KEY = 'spendflow_categories_by_month_v1';
const LOCAL_STORAGE_BUDGET_KEY = 'spendflow_budget_v1';
const LOCAL_STORAGE_CURRENCY_KEY = 'spendflow_currency_v1';
const LOCAL_STORAGE_THEME_KEY = 'spendflow_theme_v1';
const LEGACY_DEFAULT_CATEGORY_IDS = new Set([
  'cat-food',
  'cat-groceries',
  'cat-transport',
  'cat-shopping',
  'cat-bills',
  'cat-entertainment',
  'cat-health',
  'cat-work',
  'cat-misc',
  'cat-savings'
]);

const cloneCategoryList = (categoriesList = []) => categoriesList.map(cat => ({ ...cat }));

const migrateSavedCategorySnapshots = (categoryMap) => Object.fromEntries(
  Object.entries(categoryMap || {}).map(([monthKey, monthCategories]) => {
    const hasOnlyLegacyDefaults = Array.isArray(monthCategories)
      && monthCategories.length > 0
      && monthCategories.every(category => LEGACY_DEFAULT_CATEGORY_IDS.has(category.id));

    return [monthKey, hasOnlyLegacyDefaults ? cloneCategoryList(DEFAULT_CATEGORIES) : monthCategories];
  })
);

const getLatestCategoriesSnapshot = (categoryMap, monthKey) => {
  const monthKeys = Object.keys(categoryMap || {}).filter(key => key <= monthKey).sort();
  const fallbackKey = monthKeys[monthKeys.length - 1];
  return fallbackKey ? cloneCategoryList(categoryMap[fallbackKey]) : cloneCategoryList(DEFAULT_CATEGORIES);
};

export const AppProvider = ({ children }) => {
  // Navigation & UI state
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isMagicNoteOpen, setIsMagicNoteOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Theme
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem(LOCAL_STORAGE_THEME_KEY) || 'light';
  });

  // Auth & Cloud State
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [cloudSynced, setCloudSynced] = useState(false);
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);

  // Currency
  const [currency, setCurrency] = useState(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_CURRENCY_KEY);
    return saved ? JSON.parse(saved) : { symbol: '₹', code: 'INR', name: 'Indian Rupee' };
  });

  // Overall Monthly Budget
  const [monthlyBudget, setMonthlyBudget] = useState(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_BUDGET_KEY);
    return saved ? Number(saved) : 35000;
  });

  // Categories, tracked per month so the category setup can continue forward while previous months remain visible in history.
  const [categoriesByMonth, setCategoriesByMonth] = useState(() => {
    const saved = isFirebaseConfigured() ? null : localStorage.getItem(LOCAL_STORAGE_CATEGORY_MONTHS_KEY);
    if (saved) {
      try {
        return migrateSavedCategorySnapshots(JSON.parse(saved));
      } catch (error) {
        console.warn('Failed to parse saved month categories:', error);
      }
    }

    const initialMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    return { [initialMonth]: cloneCategoryList(DEFAULT_CATEGORIES) };
  });

  const categories = categoriesByMonth[selectedMonth] || getLatestCategoriesSnapshot(categoriesByMonth, selectedMonth);

  // Expenses
  const [expenses, setExpenses] = useState(() => {
    const saved = isFirebaseConfigured() ? null : localStorage.getItem(LOCAL_STORAGE_EXPENSES_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed.map(exp => ({
      ...exp,
      paymentMethod: normalizePaymentMethod(exp.paymentMethod)
    })) : [];
  });

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(LOCAL_STORAGE_THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Auth Listener
  useEffect(() => {
    const unsubscribe = listenToAuth((currentUser) => {
      if (currentUser && !isAllowedUser(currentUser)) {
        setAuthError('Authentication failed. Please sign in again.');
        setUser(null);
        logoutUser().catch(console.error);
        setIsAuthLoading(false);
        return;
      }

      if (currentUser) setAuthError('');
      setUser(currentUser);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Sync with Firestore when user is logged in (strictly isolated per user.uid)
  useEffect(() => {
    const initialMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

    if (!user) {
      setCloudSynced(false);
      setIsSettingsLoaded(false);
      setExpenses([]);
      setCategoriesByMonth({ [initialMonth]: cloneCategoryList(DEFAULT_CATEGORIES) });
      setMonthlyBudget(35000);
      setCurrency({ symbol: '₹', code: 'INR', name: 'Indian Rupee' });
      return;
    }

    // Immediately clear any prior user's data while new user's cloud data loads
    setIsSettingsLoaded(false);
    setExpenses([]);
    setCategoriesByMonth({ [initialMonth]: cloneCategoryList(DEFAULT_CATEGORIES) });

    // Subscribe to real-time expenses from Firestore for this specific user.uid
    const unsubExpenses = subscribeUserExpenses(user.uid, (cloudExpenses) => {
      setExpenses(cloudExpenses || []);
      setCloudSynced(true);
    });

    // Fallback timer so offline/slow connections don't hang
    const settingsTimeout = setTimeout(() => {
      setIsSettingsLoaded(true);
    }, 2000);

    // Subscribe to user settings (budget, categories, currency) for this specific user.uid
    const unsubSettings = subscribeUserSettings(user.uid, (cloudSettings) => {
      clearTimeout(settingsTimeout);
      if (cloudSettings) {
        if (cloudSettings.categoriesByMonth && typeof cloudSettings.categoriesByMonth === 'object') {
          setCategoriesByMonth(migrateSavedCategorySnapshots(cloudSettings.categoriesByMonth));
        } else if (cloudSettings.categories && Array.isArray(cloudSettings.categories)) {
          setCategoriesByMonth(prev => ({ ...prev, [selectedMonth]: cloudSettings.categories }));
        }
        if (cloudSettings.monthlyBudget) setMonthlyBudget(Number(cloudSettings.monthlyBudget));
        if (cloudSettings.currency) setCurrency(cloudSettings.currency);
        if (cloudSettings.lockMode) {
          localStorage.setItem(getLockModeKey(user.uid), cloudSettings.lockMode);
        }
        if (cloudSettings.passcodeHash) {
          localStorage.setItem(getPasscodeHashKey(user.uid), cloudSettings.passcodeHash);
        } else {
          localStorage.removeItem(getPasscodeHashKey(user.uid));
        }
      } else {
        // Brand new user: initialize clean default settings
        setCategoriesByMonth({ [initialMonth]: cloneCategoryList(DEFAULT_CATEGORIES) });
        setMonthlyBudget(35000);
        setCurrency({ symbol: '₹', code: 'INR', name: 'Indian Rupee' });
      }
      setIsSettingsLoaded(true);
    });

    return () => {
      clearTimeout(settingsTimeout);
      unsubExpenses();
      unsubSettings();
    };
  }, [user?.uid, selectedMonth]);

  // Save to local storage for offline / guest use
  useEffect(() => {
    if (!user && !isFirebaseConfigured()) {
      localStorage.setItem(LOCAL_STORAGE_EXPENSES_KEY, JSON.stringify(expenses));
    }
  }, [expenses, user]);

  useEffect(() => {
    const monthKey = selectedMonth;
    setCategoriesByMonth(prev => {
      if (prev[monthKey]) return prev;
      const nextCategories = getLatestCategoriesSnapshot(prev, monthKey);
      return { ...prev, [monthKey]: nextCategories };
    });
  }, [selectedMonth]);

  useEffect(() => {
    if (!user && !isFirebaseConfigured()) {
      localStorage.setItem(LOCAL_STORAGE_CATEGORIES_KEY, JSON.stringify(categories));
      localStorage.setItem(LOCAL_STORAGE_CATEGORY_MONTHS_KEY, JSON.stringify(categoriesByMonth));
    } else if (user && isFirebaseConfigured() && isSettingsLoaded) {
      saveUserSettingsToCloud(user.uid, { categories, categoriesByMonth }).catch(console.error);
    }
  }, [categories, categoriesByMonth, user, isSettingsLoaded]);

  useEffect(() => {
    if (!user && !isFirebaseConfigured()) {
      localStorage.setItem(LOCAL_STORAGE_BUDGET_KEY, monthlyBudget.toString());
    } else if (user && isFirebaseConfigured() && isSettingsLoaded) {
      saveUserSettingsToCloud(user.uid, { monthlyBudget }).catch(console.error);
    }
  }, [monthlyBudget, user, isSettingsLoaded]);

  useEffect(() => {
    if (!user && !isFirebaseConfigured()) {
      localStorage.setItem(LOCAL_STORAGE_CURRENCY_KEY, JSON.stringify(currency));
    } else if (user && isFirebaseConfigured() && isSettingsLoaded) {
      saveUserSettingsToCloud(user.uid, { currency }).catch(console.error);
    }
  }, [currency, user, isSettingsLoaded]);

  // Add Expense
  const addExpense = async (expenseData) => {
    const newExpense = {
      ...expenseData,
      paymentMethod: normalizePaymentMethod(expenseData.paymentMethod),
      id: 'exp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
      amount: parseFloat(expenseData.amount) || 0,
      createdAt: new Date().toISOString()
    };

    if (user && isFirebaseConfigured()) {
      try {
        const cloudId = await addExpenseToCloud(user.uid, newExpense);
        if (cloudId) newExpense.id = cloudId;
      } catch (err) {
        console.error('Failed to save to cloud, saving locally', err);
      }
    }

    setExpenses(prev => [newExpense, ...prev]);
    return newExpense;
  };

  // Batch Add (from Magic Notes Parser)
  const batchAddExpenses = async (expensesList) => {
    const prepared = expensesList.map(item => ({
      ...item,
      paymentMethod: normalizePaymentMethod(item.paymentMethod),
      id: 'exp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
      amount: parseFloat(item.amount) || 0,
      createdAt: new Date().toISOString()
    }));

    if (user && isFirebaseConfigured()) {
      for (const item of prepared) {
        try {
          await addExpenseToCloud(user.uid, item);
        } catch (err) {
          console.error(err);
        }
      }
    }

    setExpenses(prev => [...prepared, ...prev]);
    return prepared.length;
  };

  // Update Expense
  const updateExpense = async (id, updatedData) => {
    if (user && isFirebaseConfigured()) {
      try {
        await updateExpenseInCloud(user.uid, id, updatedData);
      } catch (err) {
        console.error(err);
      }
    }
    setExpenses(prev => prev.map(exp => exp.id === id ? {
      ...exp,
      ...updatedData,
      paymentMethod: normalizePaymentMethod(updatedData.paymentMethod || exp.paymentMethod)
    } : exp));
  };

  // Delete Expense
  const deleteExpense = async (id) => {
    if (user && isFirebaseConfigured()) {
      try {
        await deleteExpenseFromCloud(user.uid, id);
      } catch (err) {
        console.error(err);
      }
    }
    setExpenses(prev => prev.filter(exp => exp.id !== id));
  };

  // Category Management
  const addCategory = (categoryData) => {
    const newCategory = {
      ...categoryData,
      id: 'cat-' + Date.now(),
      budget: parseFloat(categoryData.budget) || 0
    };

    setCategoriesByMonth(prev => {
      const currentMonthCategories = prev[selectedMonth] || cloneCategoryList(categories);
      return {
        ...prev,
        [selectedMonth]: [...currentMonthCategories, newCategory]
      };
    });
  };

  const updateCategory = (id, updatedData) => {
    setCategoriesByMonth(prev => {
      const currentMonthCategories = prev[selectedMonth] || cloneCategoryList(categories);
      return {
        ...prev,
        [selectedMonth]: currentMonthCategories.map(cat => cat.id === id ? { ...cat, ...updatedData } : cat)
      };
    });
  };

  const deleteCategory = (id) => {
    const fallbackCatId = categories.find(c => c.id !== id)?.id || 'cat-misc';
    setExpenses(prev => prev.map(exp => {
      const isSameMonth = exp.date && exp.date.startsWith(selectedMonth);
      return isSameMonth && exp.categoryId === id ? { ...exp, categoryId: fallbackCatId } : exp;
    }));

    setCategoriesByMonth(prev => {
      const next = { ...prev };

      Object.keys(next).forEach(monthKey => {
        if (monthKey >= selectedMonth) {
          next[monthKey] = next[monthKey].filter(cat => cat.id !== id);
        }
      });

      const currentMonthCategories = next[selectedMonth] || cloneCategoryList(categories);
      next[selectedMonth] = currentMonthCategories.filter(cat => cat.id !== id);
      return next;
    });
  };

  // Sync local data to newly signed-in Firebase user
  const syncLocalDataToCloud = async (signedInUser = user) => {
    if (!signedInUser || !isFirebaseConfigured()) return;
    const localExpenses = JSON.parse(localStorage.getItem(LOCAL_STORAGE_EXPENSES_KEY) || '[]');
    const localCategoriesByMonth = JSON.parse(localStorage.getItem(LOCAL_STORAGE_CATEGORY_MONTHS_KEY) || 'null');
    if (localExpenses.length > 0) {
      for (const exp of localExpenses) {
        try {
          await addExpenseToCloud(signedInUser.uid, exp);
        } catch (e) {
          console.error('Failed syncing local expense:', e);
        }
      }
    }
    await saveUserSettingsToCloud(signedInUser.uid, {
      categories,
      categoriesByMonth: localCategoriesByMonth || categoriesByMonth,
      monthlyBudget,
      currency
    });
    localStorage.removeItem(LOCAL_STORAGE_EXPENSES_KEY);
    localStorage.removeItem(LOCAL_STORAGE_CATEGORIES_KEY);
    localStorage.removeItem(LOCAL_STORAGE_CATEGORY_MONTHS_KEY);
    localStorage.removeItem(LOCAL_STORAGE_BUDGET_KEY);
    localStorage.removeItem(LOCAL_STORAGE_CURRENCY_KEY);
    setCloudSynced(true);
  };

  // Export Data to CSV
  const exportToCSV = () => {
    const headers = ['Date', 'Title', 'Amount', 'Currency', 'Category', 'Payment Method', 'Notes', 'Recurring'];
    const rows = expenses.map(exp => {
      const cat = categories.find(c => c.id === exp.categoryId)?.name || 'Other';
      return [
        exp.date,
        `"${(exp.title || '').replace(/"/g, '""')}"`,
        exp.amount,
        currency.code,
        `"${cat}"`,
        exp.paymentMethod || 'Other',
        `"${(exp.notes || '').replace(/"/g, '""')}"`,
        exp.isRecurring ? 'Yes' : 'No'
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Expense_Tracker_Expenses_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Data to JSON
  const exportToJSON = () => {
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      currency,
      monthlyBudget,
      categories,
      categoriesByMonth,
      expenses
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `Expense_Tracker_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import JSON Backup
  const importFromJSON = (jsonString) => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.expenses && Array.isArray(parsed.expenses)) {
        setExpenses(parsed.expenses);
      }
      if (parsed.categoriesByMonth && typeof parsed.categoriesByMonth === 'object') {
        setCategoriesByMonth(parsed.categoriesByMonth);
      } else if (parsed.categories && Array.isArray(parsed.categories)) {
        setCategoriesByMonth(prev => ({ ...prev, [selectedMonth]: parsed.categories }));
      }
      if (parsed.monthlyBudget) {
        setMonthlyBudget(Number(parsed.monthlyBudget));
      }
      if (parsed.currency) {
        setCurrency(parsed.currency);
      }
      return { success: true, count: parsed.expenses?.length || 0 };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Clean logout: resets all in-memory state so no user data ever bleeds over
  const handleLogout = async () => {
    try {
      if (user?.uid) {
        lockApp(user.uid);
      }
      await logoutUser();
      setUser(null);
      setExpenses([]);
      const initialMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      setCategoriesByMonth({ [initialMonth]: cloneCategoryList(DEFAULT_CATEGORIES) });
      setMonthlyBudget(35000);
      setCurrency({ symbol: '₹', code: 'INR', name: 'Indian Rupee' });
      setCloudSynced(false);
      localStorage.removeItem(LOCAL_STORAGE_EXPENSES_KEY);
      localStorage.removeItem(LOCAL_STORAGE_CATEGORIES_KEY);
      localStorage.removeItem(LOCAL_STORAGE_CATEGORY_MONTHS_KEY);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <AppContext.Provider value={{
      // State
      activeTab,
      setActiveTab,
      isAddModalOpen,
      setIsAddModalOpen,
      isMagicNoteOpen,
      setIsMagicNoteOpen,
      isAuthModalOpen,
      setIsAuthModalOpen,
      editingExpense,
      setEditingExpense,
      searchQuery,
      setSearchQuery,
      selectedMonth,
      setSelectedMonth,
      theme,
      toggleTheme,
      user,
      authError,
      isAuthLoading,
      isSettingsLoaded,
      cloudSynced,
      currency,
      setCurrency,
      monthlyBudget,
      setMonthlyBudget,
      categories,
      categoriesByMonth,
      expenses,
      
      // Actions
      addExpense,
      batchAddExpenses,
      updateExpense,
      deleteExpense,
      addCategory,
      updateCategory,
      deleteCategory,
      syncLocalDataToCloud,
      exportToCSV,
      exportToJSON,
      importFromJSON,
      clearAllData: handleLogout,
      logoutUser: handleLogout
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
