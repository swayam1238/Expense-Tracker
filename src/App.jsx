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
import {
  APP_UNLOCKED_KEY,
  isAppLockEnabled,
  getLockMode,
  hasCustomPasscode,
  verifyCustomPasscode,
  canUseDeviceLock,
  authenticateWithDeviceLock,
} from './utils/appLock';

const AppLock = ({ onUnlock }) => {
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [autoPromptAttempted, setAutoPromptAttempted] = useState(false);
  const [enteredPasscode, setEnteredPasscode] = useState('');

  const lockMode = getLockMode();
  const hasPasscode = hasCustomPasscode();
  const deviceSupported = canUseDeviceLock();

  // Active view: 'biometric' or 'passcode'
  const [activeView, setActiveView] = useState(() => {
    if (lockMode === 'passcode' && hasPasscode) return 'passcode';
    if (lockMode === 'biometric' && deviceSupported) return 'biometric';
    if (hasPasscode) return 'passcode';
    return 'biometric';
  });

  const handleBiometricUnlock = async () => {
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

  const handlePasscodeSubmit = async (e) => {
    e.preventDefault();
    if (!enteredPasscode.trim() || isBusy) return;
    setIsBusy(true);
    setErrorMessage('');
    try {
      const isValid = await verifyCustomPasscode(enteredPasscode);
      if (isValid) {
        onUnlock();
      } else {
        setErrorMessage('Incorrect passcode. Please try again.');
        setEnteredPasscode('');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Verification error.');
    } finally {
      setIsBusy(false);
    }
  };

  // Automatically trigger phone's lock/biometric prompt immediately if on biometric view
  useEffect(() => {
    if (activeView !== 'biometric' || !deviceSupported || autoPromptAttempted) return;
    setAutoPromptAttempted(true);
    handleBiometricUnlock().catch(() => {
      // If browser requires explicit user gesture, user can tap the button
    });
  }, [activeView, deviceSupported, autoPromptAttempted]);

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
        {activeView === 'biometric' ? (
          <>
            {/* Animated Biometric / Device Lock Icon */}
            <div 
              onClick={deviceSupported && !isBusy ? handleBiometricUnlock : undefined}
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
                  ? "Use your phone's fingerprint, Face ID, PIN, pattern, or password."
                  : "Device lock requires HTTPS and a supported device."}
              </p>
            </div>

            {deviceSupported ? (
              <button
                type="button"
                onClick={handleBiometricUnlock}
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
                  marginTop: 6
                }}
              >
                {isBusy ? <span>Verifying with Device…</span> : <span>Unlock with Phone Lock</span>}
              </button>
            ) : (
              <button
                type="button"
                onClick={onUnlock}
                className="btn btn-secondary"
                style={{ width: '100%', padding: '12px', marginTop: 6 }}
              >
                Continue to App
              </button>
            )}

            {hasPasscode && (
              <button
                type="button"
                onClick={() => { setActiveView('passcode'); setErrorMessage(''); }}
                className="btn-ghost"
                style={{ fontSize: '0.82rem', color: 'var(--accent)', cursor: 'pointer', marginTop: 4 }}
              >
                🔢 Enter Custom Passcode Instead
              </button>
            )}
          </>
        ) : (
          <>
            {/* Custom Passcode Form */}
            <div 
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'rgba(99, 102, 241, 0.15)',
                border: '2px solid var(--border-subtle)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <div style={{ fontSize: '2.5rem', userSelect: 'none' }}>
                🔢
              </div>
            </div>

            <div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 6, letterSpacing: '-0.02em' }}>
                Enter Passcode
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.45, maxWidth: 280 }}>
                Enter your custom app passcode to unlock.
              </p>
            </div>

            <form onSubmit={handlePasscodeSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                type="password"
                inputMode="numeric"
                autoFocus
                value={enteredPasscode}
                onChange={(e) => { setEnteredPasscode(e.target.value); setErrorMessage(''); }}
                placeholder="Passcode"
                className="input mono"
                style={{
                  textAlign: 'center',
                  letterSpacing: '0.35em',
                  fontSize: '1.25rem',
                  padding: '12px'
                }}
                aria-label="Enter passcode"
              />

              <button
                type="submit"
                disabled={isBusy || !enteredPasscode.trim()}
                className="btn btn-accent"
                style={{ width: '100%', padding: '12px', fontWeight: 700 }}
              >
                {isBusy ? 'Checking…' : 'Unlock'}
              </button>
            </form>

            {deviceSupported && (
              <button
                type="button"
                onClick={() => { setActiveView('biometric'); setErrorMessage(''); }}
                className="btn-ghost"
                style={{ fontSize: '0.82rem', color: 'var(--accent)', cursor: 'pointer', marginTop: 4 }}
              >
                🛡️ Unlock with Phone Lock / Biometrics
              </button>
            )}
          </>
        )}

        {errorMessage && (
          <p style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>
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
          <span>🔒 Secured Expense Tracker</span>
        </div>
      </div>
    </div>
  );
};

const AppShell = () => {
  const {
    activeTab,
    user,
    isAuthLoading,
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
    !isAppLockEnabled() || sessionStorage.getItem(APP_UNLOCKED_KEY) === 'true'
  ));

  if (isAppLockEnabled() && !isUnlocked) {
    return <AppLock onUnlock={() => setIsUnlocked(true)} />;
  }

  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
