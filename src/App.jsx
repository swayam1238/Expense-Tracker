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
import { isFirebaseConfigured, saveUserSettingsToCloud } from './firebase';
import {
  isAppLockEnabled,
  isAppUnlocked,
  getLockMode,
  hasCustomPasscode,
  setCustomPasscode,
  verifyCustomPasscode,
  canUseDeviceLock,
  authenticateWithDeviceLock,
} from './utils/appLock';

const AppLock = ({ onUnlock, userId }) => {
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [autoPromptAttempted, setAutoPromptAttempted] = useState(false);
  const [enteredPasscode, setEnteredPasscode] = useState('');

  // Setup mode state (when user wants to create a new passcode from lock screen)
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupPasscode, setSetupPasscode] = useState('');
  const [setupConfirm, setSetupConfirm] = useState('');
  const [setupError, setSetupError] = useState('');

  const lockMode = getLockMode(userId);
  const hasPasscode = hasCustomPasscode(userId);
  const deviceSupported = canUseDeviceLock();

  // Start on biometric if device supports it, otherwise passcode
  const [activeView, setActiveView] = useState(() => {
    if (lockMode === 'passcode' && hasPasscode) return 'passcode';
    if (deviceSupported) return 'biometric';
    if (hasPasscode) return 'passcode';
    return 'biometric';
  });

  const handleBiometricUnlock = async () => {
    if (isBusy) return;
    setIsBusy(true);
    setErrorMessage('');
    try {
      const success = await authenticateWithDeviceLock(userId);
      if (success) onUnlock();
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
      const isValid = await verifyCustomPasscode(enteredPasscode, userId);
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

  const handleSetupPasscode = async (e) => {
    e.preventDefault();
    setSetupError('');
    const clean = setupPasscode.trim();
    const cleanConfirm = setupConfirm.trim();
    if (!/^\d{4}$/.test(clean)) {
      setSetupError('Passcode must be exactly 4 digits.');
      return;
    }
    if (clean !== cleanConfirm) {
      setSetupError('Passcodes do not match.');
      return;
    }
    try {
      const hash = await setCustomPasscode(clean, userId);
      // Sync to Firestore so it works across devices
      if (userId && isFirebaseConfigured()) {
        saveUserSettingsToCloud(userId, { lockMode: 'passcode', passcodeHash: hash }).catch(console.error);
      }
      // Mark session as unlocked — they just set it up, no need to re-enter
      sessionStorage.setItem(
        userId ? `expense_tracker_${userId}_unlocked` : 'expense_tracker_unlocked',
        'true'
      );
      onUnlock();
    } catch (err) {
      setSetupError(err.message || 'Failed to set passcode.');
    }
  };

  // Auto-trigger biometric prompt on first render if on biometric view
  useEffect(() => {
    if (activeView !== 'biometric' || !deviceSupported || autoPromptAttempted) return;
    setAutoPromptAttempted(true);
    handleBiometricUnlock().catch(() => {});
  }, [activeView, deviceSupported, autoPromptAttempted]);

  // ─── Setup Passcode Screen ────────────────────────────────────────────────
  if (isSettingUp) {
    return (
      <div style={{
        minHeight: '100vh', display: 'grid', placeItems: 'center',
        padding: 24, background: 'var(--bg-base)'
      }}>
        <div className="glass-card" style={{
          width: '100%', maxWidth: 360, padding: '32px 28px',
          textAlign: 'center', display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 16
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'rgba(99, 102, 241, 0.15)',
            border: '2px solid var(--border-subtle)',
            display: 'grid', placeItems: 'center'
          }}>
            <div style={{ fontSize: '2.2rem' }}>🔢</div>
          </div>

          <div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 6 }}>Set Up Passcode</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.45 }}>
              Create a 4-digit passcode to unlock the app.
            </p>
          </div>

          {setupError && (
            <p style={{ color: 'var(--danger)', fontSize: '0.8rem', margin: 0 }}>{setupError}</p>
          )}

          <form onSubmit={handleSetupPasscode} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              autoFocus
              required
              placeholder="New 4-digit passcode"
              value={setupPasscode}
              onChange={(e) => setSetupPasscode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="input mono"
              style={{ textAlign: 'center', letterSpacing: '0.45em', fontSize: '1.4rem', padding: '12px' }}
            />
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              required
              placeholder="Confirm passcode"
              value={setupConfirm}
              onChange={(e) => setSetupConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="input mono"
              style={{ textAlign: 'center', letterSpacing: '0.45em', fontSize: '1.4rem', padding: '12px' }}
            />
            <button type="submit" className="btn btn-accent" style={{ width: '100%', padding: '13px', fontWeight: 700 }}>
              Save Passcode & Unlock
            </button>
          </form>

          {deviceSupported && (
            <button
              type="button"
              onClick={() => { setIsSettingUp(false); setActiveView('biometric'); }}
              style={{ fontSize: '0.82rem', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              ← Back to Phone Lock
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── Main Lock Screen ─────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh', display: 'grid', placeItems: 'center',
      padding: 24, background: 'var(--bg-base)', position: 'relative'
    }}>
      <div className="glass-card" style={{
        width: '100%', maxWidth: 380, padding: '36px 28px',
        textAlign: 'center', display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 16
      }}>
        {activeView === 'biometric' ? (
          <>
            {/* Biometric / Device Lock */}
            <div
              onClick={deviceSupported && !isBusy ? handleBiometricUnlock : undefined}
              style={{
                width: 80, height: 80, borderRadius: '50%',
                background: isBusy ? 'rgba(56, 189, 248, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                border: isBusy ? '2px solid var(--accent)' : '2px solid var(--border-subtle)',
                display: 'grid', placeItems: 'center', cursor: deviceSupported ? 'pointer' : 'default',
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
                  ? "Use your phone's fingerprint, Face ID, PIN or password to unlock."
                  : "Device lock not available. Use passcode instead."}
              </p>
            </div>

            {deviceSupported && (
              <button
                type="button"
                onClick={handleBiometricUnlock}
                disabled={isBusy}
                className="btn btn-accent"
                style={{
                  width: '100%', padding: '14px', fontSize: '0.95rem',
                  fontWeight: 700, borderRadius: 'var(--radius-md)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4
                }}
              >
                {isBusy ? <span>Verifying…</span> : <span>🛡️ Unlock with Phone Lock</span>}
              </button>
            )}

            {/* Passcode fallback — always visible */}
            <div style={{ width: '100%', borderTop: '1px solid var(--border-subtle)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {hasPasscode ? (
                <button
                  type="button"
                  onClick={() => { setActiveView('passcode'); setErrorMessage(''); }}
                  className="btn btn-secondary"
                  style={{ width: '100%', padding: '11px', fontSize: '0.88rem' }}
                >
                  🔢 Use Passcode Instead
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { setIsSettingUp(true); setSetupError(''); }}
                  className="btn btn-secondary"
                  style={{ width: '100%', padding: '11px', fontSize: '0.88rem' }}
                >
                  🔢 Set Up a Passcode Instead
                </button>
              )}
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>
                {hasPasscode
                  ? "Phone lock not working? Enter your 4-digit passcode."
                  : "Prefer a passcode? Set one up and use it to unlock."}
              </p>
            </div>
          </>
        ) : (
          <>
            {/* Passcode Entry */}
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.15)',
              border: '2px solid var(--border-subtle)',
              display: 'grid', placeItems: 'center',
            }}>
              <div style={{ fontSize: '2.5rem', userSelect: 'none' }}>🔢</div>
            </div>

            <div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 6, letterSpacing: '-0.02em' }}>
                Enter Passcode
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.45, maxWidth: 280 }}>
                Enter your 4-digit passcode to unlock.
              </p>
            </div>

            <form onSubmit={handlePasscodeSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                autoFocus
                value={enteredPasscode}
                onChange={(e) => { setEnteredPasscode(e.target.value.replace(/\D/g, '').slice(0, 4)); setErrorMessage(''); }}
                placeholder="••••"
                className="input mono"
                style={{ textAlign: 'center', letterSpacing: '0.45em', fontSize: '1.4rem', padding: '12px' }}
                aria-label="Enter passcode"
              />
              <button
                type="submit"
                disabled={isBusy || enteredPasscode.length < 4}
                className="btn btn-accent"
                style={{ width: '100%', padding: '13px', fontWeight: 700 }}
              >
                {isBusy ? 'Checking…' : 'Unlock'}
              </button>
            </form>

            {/* Back to biometric if supported */}
            {deviceSupported && (
              <button
                type="button"
                onClick={() => { setActiveView('biometric'); setErrorMessage(''); setAutoPromptAttempted(false); }}
                className="btn btn-secondary"
                style={{ width: '100%', padding: '11px', fontSize: '0.88rem' }}
              >
                🛡️ Use Phone Lock Instead
              </button>
            )}
          </>
        )}

        {errorMessage && (
          <p style={{ color: activeView === 'passcode' ? 'var(--danger)' : 'var(--text-muted)', fontSize: '0.8rem', marginTop: 2 }}>
            {errorMessage}
          </p>
        )}

        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
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
    isSettingsLoaded,
  } = useApp();

  // Local lock state — initialized only once user and settings are ready
  // null = not yet determined, true/false = known
  const [isUnlocked, setIsUnlocked] = useState(null);

  useEffect(() => {
    if (user?.uid) {
      if (isSettingsLoaded) {
        setIsUnlocked(isAppUnlocked(user.uid));
      }
    } else {
      // Logged out — reset
      setIsUnlocked(null);
    }
  }, [user?.uid, isSettingsLoaded]);

  // Step 1: Auth loading
  if (isAuthLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--text-muted)', background: 'var(--bg-base)' }}>
        Loading account…
      </div>
    );
  }

  // Step 2: Not logged in — show login FIRST, never the lock screen
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--bg-base)' }}>
        <AuthModal embedded={true} />
      </div>
    );
  }

  // Step 3: User logged in but settings or lock state not yet determined
  if (!isSettingsLoaded || isUnlocked === null) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--text-muted)', background: 'var(--bg-base)' }}>
        Loading…
      </div>
    );
  }

  // Step 4: Logged in, lock enabled, not yet unlocked — show lock screen
  if (isAppLockEnabled(user.uid) && !isUnlocked) {
    return (
      <AppLock
        onUnlock={() => setIsUnlocked(true)}
        userId={user.uid}
      />
    );
  }

  // Step 5: Logged in and unlocked (or no lock) — show the app
  return (
    <>
      <Header />

      <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minWidth: 0 }}>
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'transactions' && <TransactionsView />}
        {activeTab === 'analytics' && <AnalyticsView />}
        {activeTab === 'categories' && <CategoriesView />}
        {activeTab === 'settings' && <SettingsView onLock={() => setIsUnlocked(false)} />}
      </main>

      <BottomNav />
      <AddExpenseModal />
      <AuthModal />
    </>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
