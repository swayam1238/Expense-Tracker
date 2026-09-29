import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { 
  DEFAULT_CATEGORIES,
  normalizePaymentMethod
} from '../constants';
import { 
  isFirebaseConfigured, 
  listenToAuth, 
  subscribeUserExpenses, 
  addExpenseToCloud,
  addExpensesToCloudBatch,
  updateExpenseInCloud, 
  deleteExpenseFromCloud,
  deleteAllUserExpensesFromCloud,
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
const LEGACY_LOCAL_STORAGE_BUDGET_KEY = 'spendflow_budget_v1';
const LOCAL_STORAGE_CURRENCY_KEY = 'spendflow_currency_v1';
const LOCAL_STORAGE_THEME_KEY = 'spendflow_theme_v1';
const LOCAL_STORAGE_EXPENSE_CHART_TYPE_KEY = 'spendflow_expense_chart_type_v1';
const DEFAULT_CURRENCY = { symbol: '₹', code: 'INR', name: 'Indian Rupee' };
const CHART_TYPES = new Set(['pie', 'bar', 'line']);

const cloneCategoryList = (categoriesList = []) => categoriesList.map(cat => ({ ...cat }));

const readStoredValue = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const readStoredJson = (key, fallback) => {
  try {
    const stored = readStoredValue(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
};

const currentMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const migrateSavedCategorySnapshots = (categoryMap) => Object.fromEntries(
  Object.entries(categoryMap || {}).map(([monthKey, monthCategories]) => [
    monthKey,
    Array.isArray(monthCategories)
      ? monthCategories
        .filter(category => category && typeof category.id === 'string' && typeof category.name === 'string')
        .map(category => ({
          ...category,
          icon: typeof category.icon === 'string' ? category.icon : '📦',
          color: typeof category.color === 'string' ? category.color : '#64748b',
          budget: Number.isFinite(Number(category.budget)) ? Number(category.budget) : 0
        }))
      : cloneCategoryList(DEFAULT_CATEGORIES)
  ])
);

const getLatestCategoriesSnapshot = (categoryMap, monthKey) => {
  const monthKeys = Object.keys(categoryMap || {}).filter(key => key <= monthKey).sort();
  const fallbackKey = monthKeys[monthKeys.length - 1];
  return fallbackKey ? cloneCategoryList(categoryMap[fallbackKey]) : cloneCategoryList(DEFAULT_CATEGORIES);
};

const serializeSettings = (categoriesByMonth, currency, expenseChartType) => JSON.stringify({
  categoriesByMonth,
  currency,
  expenseChartType
});

export const AppProvider = ({ children }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isMagicNoteOpen, setIsMagicNoteOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);

  const [theme, setTheme] = useState(() => {
    return readStoredValue(LOCAL_STORAGE_THEME_KEY) || 'light';
  });

  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [cloudSynced, setCloudSynced] = useState(false);
  const [expenseSyncError, setExpenseSyncError] = useState('');
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);
  const [settingsLoadError, setSettingsLoadError] = useState('');
  const [settingsSyncError, setSettingsSyncError] = useState('');
  const [settingsRetryVersion, setSettingsRetryVersion] = useState(0);
  const currency = DEFAULT_CURRENCY;
  const [expenseChartType, setExpenseChartTypeState] = useState(() => {
    const saved = readStoredValue(LOCAL_STORAGE_EXPENSE_CHART_TYPE_KEY);
    return CHART_TYPES.has(saved) ? saved : 'pie';
  });
  const pendingExpenseChartTypeRef = useRef(null);
  const setExpenseChartType = useCallback((chartType) => {
    const nextChartType = CHART_TYPES.has(chartType) ? chartType : 'pie';
    pendingExpenseChartTypeRef.current = nextChartType;
    setExpenseChartTypeState(nextChartType);
  }, []);

  const [categoriesByMonth, setCategoriesByMonth] = useState(() => {
    const saved = readStoredValue(LOCAL_STORAGE_CATEGORY_MONTHS_KEY);
    if (saved) {
      try {
        return migrateSavedCategorySnapshots(JSON.parse(saved));
      } catch (error) {
        console.warn('Failed to parse saved month categories:', error);
      }
    }

    return { [currentMonthKey()]: cloneCategoryList(DEFAULT_CATEGORIES) };
  });

  const [expenses, setExpenses] = useState(() => {
    const parsed = readStoredJson(LOCAL_STORAGE_EXPENSES_KEY, []);
    return Array.isArray(parsed) ? parsed.filter(exp => exp && typeof exp === 'object').map(exp => ({
      ...exp,
      amount: Number(exp.amount) || 0,
      paymentMethod: normalizePaymentMethod(exp.paymentMethod)
    })) : [];
  });

  const lastPersistedSettingsRef = useRef('');
  const selectedMonthRef = useRef(selectedMonth);
  const categoriesByMonthRef = useRef(categoriesByMonth);
  selectedMonthRef.current = selectedMonth;
  categoriesByMonthRef.current = categoriesByMonth;

  const categories = categoriesByMonth[selectedMonth] || DEFAULT_CATEGORIES;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(LOCAL_STORAGE_THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const applyLocalGuestDefaults = useCallback(() => {
    const initialMonth = currentMonthKey();
    setCloudSynced(false);
    setExpenseSyncError('');
    setIsSettingsLoaded(false);
    setExpenses([]);
    setCategoriesByMonth({ [initialMonth]: cloneCategoryList(DEFAULT_CATEGORIES) });
  }, []);

  useEffect(() => {
    localStorage.removeItem(LEGACY_LOCAL_STORAGE_BUDGET_KEY);
  }, []);

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

  useEffect(() => {
    if (!user) {
      pendingExpenseChartTypeRef.current = null;
      applyLocalGuestDefaults();
      return;
    }

    pendingExpenseChartTypeRef.current = null;
    lastPersistedSettingsRef.current = '';
    setSettingsLoadError('');
    setSettingsSyncError('');
    setIsSettingsLoaded(false);
    setCloudSynced(false);
    setExpenseSyncError('');
    setExpenses([]);

    const unsubExpenses = subscribeUserExpenses(user.uid, (cloudExpenses, error) => {
      setExpenseSyncError(error?.message || '');
      setExpenses((cloudExpenses || []).map(exp => ({
        ...exp,
        amount: Number(exp.amount) || 0,
        paymentMethod: normalizePaymentMethod(exp.paymentMethod)
      })));
      setCloudSynced(true);
    });

    const unsubSettings = subscribeUserSettings(user.uid, (cloudSettings, error) => {
      if (error) {
        setSettingsLoadError(error.message || 'Could not load settings from Firestore.');
        setIsSettingsLoaded(true);
        return;
      }
      setSettingsLoadError('');

      const pendingChartType = pendingExpenseChartTypeRef.current;
      if (pendingChartType && cloudSettings?.expenseChartType !== pendingChartType) {
        setIsSettingsLoaded(true);
        return;
      }
      if (pendingChartType) pendingExpenseChartTypeRef.current = null;

      const monthKey = selectedMonthRef.current;
      let nextCategoriesByMonth = categoriesByMonthRef.current;
      let nextExpenseChartType = 'pie';

      if (cloudSettings) {
        if (cloudSettings.categoriesByMonth && typeof cloudSettings.categoriesByMonth === 'object') {
          nextCategoriesByMonth = migrateSavedCategorySnapshots(cloudSettings.categoriesByMonth);
        } else if (cloudSettings.categories && Array.isArray(cloudSettings.categories)) {
          nextCategoriesByMonth = migrateSavedCategorySnapshots({
            ...categoriesByMonthRef.current,
            [monthKey]: cloudSettings.categories
          });
        }
        if (CHART_TYPES.has(cloudSettings.expenseChartType)) {
          nextExpenseChartType = cloudSettings.expenseChartType;
        }

        if (cloudSettings.lockMode) {
          localStorage.setItem(getLockModeKey(user.uid), cloudSettings.lockMode);
        }
        if (cloudSettings.passcodeHash) {
          localStorage.setItem(getPasscodeHashKey(user.uid), cloudSettings.passcodeHash);
        } else {
          localStorage.removeItem(getPasscodeHashKey(user.uid));
        }
      } else {
        nextCategoriesByMonth = { [currentMonthKey()]: cloneCategoryList(DEFAULT_CATEGORIES) };
      }

      const incoming = serializeSettings(nextCategoriesByMonth, currency, nextExpenseChartType);
      if (incoming !== lastPersistedSettingsRef.current) {
        lastPersistedSettingsRef.current = incoming;
        setCategoriesByMonth(nextCategoriesByMonth);
        setExpenseChartTypeState(nextExpenseChartType);
      }

      setIsSettingsLoaded(true);
    });

    return () => {
      unsubExpenses();
      unsubSettings();
    };
  }, [user?.uid, applyLocalGuestDefaults]);

  useEffect(() => {
    if (!user && !isFirebaseConfigured()) {
      localStorage.setItem(LOCAL_STORAGE_EXPENSES_KEY, JSON.stringify(expenses));
    }
  }, [expenses, user]);

  useEffect(() => {
    const monthKey = selectedMonth;
    setCategoriesByMonth(prev => {
      if (prev[monthKey]) return prev;
      return { ...prev, [monthKey]: getLatestCategoriesSnapshot(prev, monthKey) };
    });
  }, [selectedMonth]);

  useEffect(() => {
    if (!user && !isFirebaseConfigured()) {
      localStorage.setItem(LOCAL_STORAGE_CATEGORIES_KEY, JSON.stringify(categories));
      localStorage.setItem(LOCAL_STORAGE_CATEGORY_MONTHS_KEY, JSON.stringify(categoriesByMonth));
      localStorage.removeItem(LEGACY_LOCAL_STORAGE_BUDGET_KEY);
      localStorage.setItem(LOCAL_STORAGE_CURRENCY_KEY, JSON.stringify(currency));
      localStorage.setItem(LOCAL_STORAGE_EXPENSE_CHART_TYPE_KEY, expenseChartType);
      return;
    }

    if (!user || !isFirebaseConfigured() || !isSettingsLoaded || settingsLoadError) return;

    const serialized = serializeSettings(categoriesByMonth, currency, expenseChartType);
    if (serialized === lastPersistedSettingsRef.current) return;

    let isActive = true;
    const timeoutId = setTimeout(() => {
      saveUserSettingsToCloud(user.uid, { categoriesByMonth, currency, expenseChartType })
        .then(() => {
          if (!isActive) return;
          if (pendingExpenseChartTypeRef.current === expenseChartType) {
            pendingExpenseChartTypeRef.current = null;
          }
          lastPersistedSettingsRef.current = serialized;
          setSettingsSyncError('');
        })
        .catch(error => {
          if (!isActive) return;
          console.error('Failed to save settings to Firestore:', error);
          setSettingsSyncError(error.message || 'Could not save settings. Check your connection and retry.');
        });
    }, 400);

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
    };
  }, [categoriesByMonth, currency, expenseChartType, user, isSettingsLoaded, settingsLoadError, settingsRetryVersion]);

  const retrySettingsSync = useCallback(() => {
    setSettingsRetryVersion(version => version + 1);
  }, []);

  const addExpense = useCallback(async (expenseData) => {
    const newExpense = {
      ...expenseData,
      paymentMethod: normalizePaymentMethod(expenseData.paymentMethod),
      id: 'exp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
      amount: parseFloat(expenseData.amount) || 0,
      createdAt: new Date().toISOString()
    };

    if (user && isFirebaseConfigured()) {
      const cloudId = await addExpenseToCloud(user.uid, newExpense);
      if (cloudId) newExpense.id = cloudId;
    }

    setExpenses(prev => prev.some(exp => exp.id === newExpense.id) ? prev : [newExpense, ...prev]);
    return newExpense;
  }, [user]);

  const batchAddExpenses = useCallback(async (expensesList) => {
    const prepared = expensesList.map(item => ({
      ...item,
      paymentMethod: normalizePaymentMethod(item.paymentMethod),
      id: 'exp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
      amount: parseFloat(item.amount) || 0,
      createdAt: new Date().toISOString()
    }));

    if (user && isFirebaseConfigured()) {
      const cloudIds = await addExpensesToCloudBatch(user.uid, prepared);
      cloudIds.forEach((id, index) => {
        if (id) prepared[index].id = id;
      });
    }

    setExpenses(prev => {
      const existingIds = new Set(prev.map(exp => exp.id));
      return [...prepared.filter(item => !existingIds.has(item.id)), ...prev];
    });
    return prepared.length;
  }, [user]);

  const updateExpense = useCallback(async (id, updatedData) => {
    const nextData = {
      ...updatedData,
      ...(updatedData.paymentMethod != null
        ? { paymentMethod: normalizePaymentMethod(updatedData.paymentMethod) }
        : {})
    };

    if (user && isFirebaseConfigured()) {
      await updateExpenseInCloud(user.uid, id, nextData);
    }

    setExpenses(prev => prev.map(exp => exp.id === id ? {
      ...exp,
      ...nextData,
      paymentMethod: normalizePaymentMethod(nextData.paymentMethod || exp.paymentMethod)
    } : exp));
  }, [user]);

  const deleteExpense = useCallback(async (id) => {
    if (user && isFirebaseConfigured()) {
      await deleteExpenseFromCloud(user.uid, id);
    }
    setExpenses(prev => prev.filter(exp => exp.id !== id));
  }, [user]);

  const addCategory = useCallback((categoryData) => {
    const newCategory = {
      ...categoryData,
      id: 'cat-' + Date.now(),
      budget: parseFloat(categoryData.budget) || 0
    };

    setCategoriesByMonth(prev => {
      const currentMonthCategories = prev[selectedMonth] || cloneCategoryList(DEFAULT_CATEGORIES);
      return {
        ...prev,
        [selectedMonth]: [...currentMonthCategories, newCategory]
      };
    });
  }, [selectedMonth]);

  const updateCategory = useCallback((id, updatedData) => {
    setCategoriesByMonth(prev => {
      const currentMonthCategories = prev[selectedMonth] || cloneCategoryList(DEFAULT_CATEGORIES);
      return {
        ...prev,
        [selectedMonth]: currentMonthCategories.map(cat => cat.id === id ? { ...cat, ...updatedData } : cat)
      };
    });
  }, [selectedMonth]);

  const deleteCategory = useCallback((id) => {
    const currentCategories = categoriesByMonth[selectedMonth] || DEFAULT_CATEGORIES;
    const fallbackCatId = currentCategories.find(c => c.id !== id)?.id || 'cat-misc';

    setExpenses(prev => {
      const next = prev.map(exp => {
        const isSameMonth = exp.date && exp.date.startsWith(selectedMonth);
        return isSameMonth && exp.categoryId === id ? { ...exp, categoryId: fallbackCatId } : exp;
      });

      if (user && isFirebaseConfigured()) {
        next.forEach((exp, index) => {
          if (prev[index] && prev[index].categoryId !== exp.categoryId) {
            updateExpenseInCloud(user.uid, exp.id, { categoryId: fallbackCatId }).catch(console.error);
          }
        });
      }

      return next;
    });

    setCategoriesByMonth(prev => {
      const next = { ...prev };

      Object.keys(next).forEach(monthKey => {
        if (monthKey >= selectedMonth) {
          next[monthKey] = (next[monthKey] || []).filter(cat => cat.id !== id);
        }
      });

      return next;
    });
  }, [categoriesByMonth, selectedMonth, user]);

  const syncLocalDataToCloud = useCallback(async (signedInUser = user) => {
    if (!signedInUser || !isFirebaseConfigured()) return;
    const localExpenses = JSON.parse(localStorage.getItem(LOCAL_STORAGE_EXPENSES_KEY) || '[]');
    const localCategoriesByMonth = JSON.parse(localStorage.getItem(LOCAL_STORAGE_CATEGORY_MONTHS_KEY) || 'null');
    if (localExpenses.length > 0) {
      await addExpensesToCloudBatch(signedInUser.uid, localExpenses);
    }
    await saveUserSettingsToCloud(signedInUser.uid, {
      categoriesByMonth: localCategoriesByMonth || categoriesByMonth,
      currency,
      expenseChartType
    });
    localStorage.removeItem(LOCAL_STORAGE_EXPENSES_KEY);
    localStorage.removeItem(LOCAL_STORAGE_CATEGORIES_KEY);
    localStorage.removeItem(LOCAL_STORAGE_CATEGORY_MONTHS_KEY);
    localStorage.removeItem(LEGACY_LOCAL_STORAGE_BUDGET_KEY);
    localStorage.removeItem(LOCAL_STORAGE_CURRENCY_KEY);
    setCloudSynced(true);
  }, [user, categoriesByMonth, currency, expenseChartType]);

  const exportToCSV = useCallback(() => {
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
  }, [expenses, categories, currency]);

  const exportToJSON = useCallback(() => {
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      currency,
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
  }, [currency, categories, categoriesByMonth, expenses]);

  const importFromJSON = useCallback(async (jsonString) => {
    try {
      const parsed = JSON.parse(jsonString);
      const nextExpenses = Array.isArray(parsed.expenses)
        ? parsed.expenses
          .filter(expense => expense && typeof expense === 'object')
          .map(expense => ({
            ...expense,
            amount: Number(expense.amount) || 0,
            paymentMethod: normalizePaymentMethod(expense.paymentMethod)
          }))
        : expenses;
      const nextCategoriesByMonth = parsed.categoriesByMonth && typeof parsed.categoriesByMonth === 'object'
        ? parsed.categoriesByMonth
        : (parsed.categories && Array.isArray(parsed.categories)
          ? { ...categoriesByMonth, [selectedMonth]: parsed.categories }
          : categoriesByMonth);
      const nextCurrency = currency;

      setExpenses(nextExpenses);
      setCategoriesByMonth(nextCategoriesByMonth);

      if (user && isFirebaseConfigured()) {
        if (Array.isArray(parsed.expenses)) {
          await addExpensesToCloudBatch(user.uid, parsed.expenses);
        }
        await saveUserSettingsToCloud(user.uid, {
          categoriesByMonth: nextCategoriesByMonth,
          currency: nextCurrency,
          expenseChartType
        });
      }

      return { success: true, count: parsed.expenses?.length || 0 };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, [expenses, categoriesByMonth, selectedMonth, currency, expenseChartType, user]);

  const handleLogout = useCallback(async () => {
    try {
      if (user?.uid) {
        lockApp(user.uid);
      }
      await logoutUser();
      setUser(null);
      applyLocalGuestDefaults();
      localStorage.removeItem(LOCAL_STORAGE_EXPENSES_KEY);
      localStorage.removeItem(LOCAL_STORAGE_CATEGORIES_KEY);
      localStorage.removeItem(LOCAL_STORAGE_CATEGORY_MONTHS_KEY);
    } catch (err) {
      console.error('Logout error:', err);
    }
  }, [user, applyLocalGuestDefaults]);

  const clearAllData = useCallback(async () => {
    if (user && isFirebaseConfigured()) {
      await deleteAllUserExpensesFromCloud(user.uid);
    }
    setExpenses([]);
  }, [user]);

  const value = useMemo(() => ({
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
    expenseSyncError,
    settingsLoadError,
    settingsSyncError,
    retrySettingsSync,
    currency,
    expenseChartType,
    setExpenseChartType,
    categories,
    categoriesByMonth,
    expenses,
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
    clearAllData,
    logoutUser: handleLogout
  }), [
    activeTab, isAddModalOpen, isMagicNoteOpen, isAuthModalOpen, editingExpense,
    searchQuery, selectedMonth, theme, toggleTheme, user, authError, isAuthLoading,
    isSettingsLoaded, cloudSynced, expenseSyncError, settingsLoadError, settingsSyncError, retrySettingsSync, currency, expenseChartType, setExpenseChartType, categories, categoriesByMonth,
    expenses, addExpense, batchAddExpenses, updateExpense, deleteExpense, addCategory,
    updateCategory, deleteCategory, syncLocalDataToCloud, exportToCSV, exportToJSON,
    importFromJSON, handleLogout, clearAllData
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
