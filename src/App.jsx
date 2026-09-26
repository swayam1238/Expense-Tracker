import React, { useEffect, useState } from 'react';
import './index.css';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { DashboardView } from './components/DashboardView';
import { TransactionsView } from './components/TransactionsView';
import { AnalyticsView } from './components/AnalyticsView';
import { CategoriesView } from './components/CategoriesView';
import { SettingsView } from './components/SettingsView';
import { AddExpenseModal } from './components/AddExpenseModal';
import { AuthModal } from './components/AuthModal';
import { isFirebaseConfigured } from './firebase';
import {
  APP_UNLOCKED_KEY,
  isDeviceLockEnabled,
  canUseDeviceLock,
  authenticateWithDeviceLock,
} from './utils/appLock';

const AppLock = ({ onUnlock }) => {
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [autoPromptAttempted, setAutoPromptAttempted] = useState(false);
  const deviceSupported = canUseDeviceLock();

  const handleUnlock = async () => {
    if (isBusy) return;
    setIsBusy(true);
    setErrorMessage('');
    try {
      const success = await authenticateWithDeviceLock();
      if (success) {
        onUnlock();
      }
    } catch (err) {
      console.warn('Device unlock:', err);
      setErrorMessage(err.message || 'Unlock was cancelled or failed.');
    } finally {
      setIsBusy(false);
    }
  };

  // Automatically trigger phone's lock/biometric prompt immediately on mount
  useEffect(() => {
    if (!deviceSupported || autoPromptAttempted) return;
    setAutoPromptAttempted(true);
    handleUnlock().catch(() => {
      // If browser requires explicit user gesture, user can tap the button
    });
  }, [deviceSupported, autoPromptAttempted]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      padding: 24,
      background: 'var(--bg-base)',
      position: 'relative'
    }}>
      <div 
        className="glass-card" 
        style={{
          width: '100%',
          maxWidth: 380,
          padding: '36px 28px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16
        }}
      >
        {/* Animated Biometric / Device Lock Icon */}
        <div 
          onClick={deviceSupported && !isBusy ? handleUnlock : undefined}
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: isBusy ? 'rgba(56, 189, 248, 0.15)' : 'rgba(99, 102, 241, 0.15)',
            border: isBusy ? '2px solid var(--accent)' : '2px solid var(--border-subtle)',
            display: 'grid',
            placeItems: 'center',
            cursor: deviceSupported ? 'pointer' : 'default',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: isBusy ? 'scale(1.08)' : 'scale(1)',
            boxShadow: isBusy ? '0 0 24px rgba(99, 102, 241, 0.4)' : 'none',
          }}
          title="Tap to verify device lock"
        >
          <div style={{ fontSize: '2.5rem', userSelect: 'none' }}>
            {isBusy ? '✨' : '🛡️'}
          </div>
        </div>

        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 6, letterSpacing: '-0.02em' }}>
            Expense Tracker
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.45, maxWidth: 280 }}>
            {deviceSupported 
              ? "Use your phone's fingerprint, Face ID, PIN, pattern, or password to unlock."
              : "Device lock requires HTTPS and a supported device."}
          </p>
        </div>

        {deviceSupported ? (
          <button
            type="button"
            onClick={handleUnlock}
            disabled={isBusy}
            className="btn btn-accent"
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '0.95rem',
              fontWeight: 700,
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginTop: 8
            }}
          >
            {isBusy ? (
              <span>Verifying with Device...</span>
            ) : (
              <span>Unlock with Phone Lock</span>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={onUnlock}
            className="btn btn-secondary"
            style={{ width: '100%', padding: '12px', marginTop: 8 }}
          >
            Continue to App
          </button>
        )}

        {errorMessage && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 4 }}>
            {errorMessage}
          </p>
        )}

        <div style={{
          fontSize: '0.72rem',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginTop: 6
        }}>
          <span>🔒 Secured by Phone Screen Lock & Biometrics</span>
        </div>
      </div>
    </div>
  );
};

const AppShell = () => {
  const {
    activeTab,
    user,
    authError,
    isAuthLoading,
    setIsAuthModalOpen,
  } = useApp();

  if (isAuthLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--text-muted)', background: 'var(--bg-base)' }}>
        Loading account…
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--bg-base)' }}>
        <AuthModal embedded={true} />
      </div>
    );
  }

  return (
    <>
      <Header />

      <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minWidth: 0 }}>
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'transactions' && <TransactionsView />}
        {activeTab === 'analytics' && <AnalyticsView />}
        {activeTab === 'categories' && <CategoriesView />}
        {activeTab === 'settings' && <SettingsView />}
      </main>

      <BottomNav />
      <AddExpenseModal />
      <AuthModal />
    </>
  );
};

export default function App() {
  const [isUnlocked, setIsUnlocked] = useState(() => (
    !isDeviceLockEnabled() || sessionStorage.getItem(APP_UNLOCKED_KEY) === 'true'
  ));

  if (isDeviceLockEnabled() && !isUnlocked) {
    return <AppLock onUnlock={() => setIsUnlocked(true)} />;
  }

  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
