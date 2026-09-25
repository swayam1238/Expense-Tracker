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

const APP_ACCESS_CODE = '1997';
const APP_UNLOCKED_KEY = 'expense_tracker_unlocked';
const APP_BIOMETRIC_KEY = 'expense_tracker_biometric_id';

const toBase64Url = (bytes) => {
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromBase64Url = (value) => {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
};

const createChallenge = () => crypto.getRandomValues(new Uint8Array(32));

const canUseBiometrics = () => Boolean(
  window.PublicKeyCredential
  && navigator.credentials
  && window.isSecureContext
);

const registerBiometric = async () => {
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: createChallenge(),
      rp: { name: 'Expense Tracker' },
      user: {
        id: createChallenge(),
        name: 'expense-tracker-user',
        displayName: 'Swayam'
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 }
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred'
      },
      timeout: 60000,
      attestation: 'none'
    }
  });

  if (!credential) throw new Error('Biometric setup was cancelled.');
  localStorage.setItem(APP_BIOMETRIC_KEY, toBase64Url(new Uint8Array(credential.rawId)));
};

const verifyBiometric = async () => {
  const storedId = localStorage.getItem(APP_BIOMETRIC_KEY);
  if (!storedId) return false;

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: createChallenge(),
      allowCredentials: [{ id: fromBase64Url(storedId), type: 'public-key' }],
      userVerification: 'required',
      timeout: 60000
    }
  });

  return Boolean(assertion);
};

const AppLock = ({ onUnlock }) => {
  const [code, setCode] = useState('');
  const [hasError, setHasError] = useState(false);
  const [isBiometricBusy, setIsBiometricBusy] = useState(false);
  const [biometricError, setBiometricError] = useState('');
  const biometricId = localStorage.getItem(APP_BIOMETRIC_KEY);
  const biometricAvailable = canUseBiometrics();

  const unlockWithBiometric = async () => {
    setIsBiometricBusy(true);
    setBiometricError('');
    try {
      if (biometricId) {
        if (await verifyBiometric()) onUnlock();
      } else {
        await registerBiometric();
        onUnlock();
      }
    } catch (error) {
      setBiometricError('Biometric unlock was cancelled or unavailable. Use your code instead.');
    } finally {
      setIsBiometricBusy(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (code === APP_ACCESS_CODE) {
      sessionStorage.setItem(APP_UNLOCKED_KEY, 'true');
      onUnlock();
      return;
    }
    setCode('');
    setHasError(true);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--bg-base)' }}>
      <form onSubmit={handleSubmit} className="glass-card" style={{ width: '100%', maxWidth: 360, padding: 28, textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: 10 }}>🔒</div>
        <h1 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: 6 }}>Expense Tracker</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 20 }}>Enter your access code to continue.</p>
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={code}
          onChange={(event) => { setCode(event.target.value); setHasError(false); }}
          placeholder="Access code"
          className="input mono"
          style={{ textAlign: 'center', letterSpacing: '0.3em', marginBottom: 10 }}
          aria-label="Access code"
        />
        {hasError && <p style={{ color: 'var(--danger)', fontSize: '0.78rem', marginBottom: 10 }}>Incorrect code.</p>}
        <button type="submit" className="btn btn-accent" style={{ width: '100%', padding: 12 }}>Unlock</button>
        {biometricAvailable && (
          <button
            type="button"
            onClick={unlockWithBiometric}
            disabled={isBiometricBusy}
            className="btn btn-secondary"
            style={{ width: '100%', padding: 12, marginTop: 10 }}
          >
            {isBiometricBusy ? 'Waiting for device...' : (biometricId ? 'Unlock with fingerprint / Face ID' : 'Set up fingerprint / Face ID')}
          </button>
        )}
        {biometricError && <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 10 }}>{biometricError}</p>}
        {!biometricAvailable && <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: 10 }}>Biometric unlock requires HTTPS and device support.</p>}
      </form>
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

  useEffect(() => {
    if (!isAuthLoading && !user && isFirebaseConfigured()) {
      setIsAuthModalOpen(true);
    }
  }, [isAuthLoading, user, setIsAuthModalOpen]);

  if (isAuthLoading) {
    return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--text-muted)' }}>Loading secure account...</div>;
  }

  if (!user) {
    return (
      <>
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--bg-base)' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: 420, padding: 28, textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: 10 }}>🔐</div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 8 }}>{authError ? 'Access denied' : 'Private Expense Tracker'}</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: 20 }}>
              {authError || 'Sign in with your Firebase account to access your private expenses. Your data is protected by per-user Firestore rules.'}
            </p>
            {!authError && !isFirebaseConfigured() && (
              <p style={{ color: 'var(--warning)', fontSize: '0.78rem', lineHeight: 1.4, marginBottom: 14 }}>
                Firebase is not configured yet. Add the Firebase values to a root `.env` file, then restart the app.
              </p>
            )}
            {!authError && (
              <button onClick={() => setIsAuthModalOpen(true)} className="btn btn-accent" style={{ width: '100%', padding: 12 }}>
                Sign in securely
              </button>
            )}
          </div>
        </div>
        <AuthModal />
      </>
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
  const [isUnlocked, setIsUnlocked] = useState(() => sessionStorage.getItem(APP_UNLOCKED_KEY) === 'true');

  if (!isUnlocked) {
    return <AppLock onUnlock={() => setIsUnlocked(true)} />;
  }

  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
