import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { isFirebaseConfigured, saveUserSettingsToCloud } from '../firebase';
import { 
  Settings as SettingsIcon, 
  DollarSign, 
  Cloud, 
  Download, 
  Upload, 
  Trash2, 
  Smartphone, 
  ShieldCheck, 
  Check, 
  ExternalLink,
  Flame,
  Info,
  Lock,
  LogOut,
  KeyRound,
  Shield,
  ShieldOff,
  X
} from 'lucide-react';
import { 
  lockApp, 
  canUseDeviceLock, 
  getLockMode, 
  setLockMode, 
  hasCustomPasscode, 
  setCustomPasscode, 
  removeCustomPasscode 
} from '../utils/appLock';

const AVAILABLE_CURRENCIES = [
  { symbol: '₹', code: 'INR', name: 'Indian Rupee (₹)' },
  { symbol: '$', code: 'USD', name: 'US Dollar ($)' },
  { symbol: '€', code: 'EUR', name: 'Euro (€)' },
  { symbol: '£', code: 'GBP', name: 'British Pound (£)' },
  { symbol: 'C$', code: 'CAD', name: 'Canadian Dollar (C$)' },
  { symbol: 'A$', code: 'AUD', name: 'Australian Dollar (A$)' },
  { symbol: '¥', code: 'JPY', name: 'Japanese Yen (¥)' },
  { symbol: 'AED', code: 'AED', name: 'UAE Dirham (AED)' }
];

export const SettingsView = ({ onLock }) => {
  const { 
    currency, 
    setCurrency, 
    user, 
    cloudSynced, 
    setIsAuthModalOpen,
    logoutUser,
    exportToJSON, 
    exportToCSV, 
    importFromJSON, 
    clearAllData,
    expenses,
    categories
  } = useApp();

  const fileInputRef = useRef(null);
  const [importStatus, setImportStatus] = useState(null);

  // App Lock & Passcode State (isolated per user)
  const [currentLockMode, setCurrentLockMode] = useState(() => getLockMode(user?.uid));
  const [passcodeSet, setPasscodeSet] = useState(() => hasCustomPasscode(user?.uid));
  const [isPasscodeModalOpen, setIsPasscodeModalOpen] = useState(false);
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [passcodeSuccess, setPasscodeSuccess] = useState('');

  useEffect(() => {
    if (user?.uid) {
      setCurrentLockMode(getLockMode(user.uid));
      setPasscodeSet(hasCustomPasscode(user.uid));
    }
  }, [user?.uid]);

  const handleSelectLockMode = async (mode) => {
    if (mode === 'passcode' && !hasCustomPasscode(user?.uid)) {
      setIsPasscodeModalOpen(true);
      return;
    }
    setLockMode(mode, user?.uid);
    setCurrentLockMode(mode);
    if (user?.uid && isFirebaseConfigured()) {
      saveUserSettingsToCloud(user.uid, { lockMode: mode }).catch(console.error);
    }
  };

  const handleSavePasscode = async (e) => {
    e.preventDefault();
    setPasscodeError('');
    const cleanPasscode = newPasscode.trim();
    const cleanConfirm = confirmPasscode.trim();

    if (!/^\d{4}$/.test(cleanPasscode)) {
      setPasscodeError('Passcode must be exactly 4 digits (numbers only).');
      return;
    }
    if (cleanPasscode !== cleanConfirm) {
      setPasscodeError('Passcodes do not match. Please verify.');
      return;
    }

    try {
      const hash = await setCustomPasscode(cleanPasscode, user?.uid);
      setPasscodeSet(true);
      setCurrentLockMode('passcode');
      if (user?.uid && isFirebaseConfigured()) {
        saveUserSettingsToCloud(user.uid, { lockMode: 'passcode', passcodeHash: hash }).catch(console.error);
      }
      setPasscodeSuccess('4-digit passcode set successfully!');
      setTimeout(() => {
        setIsPasscodeModalOpen(false);
        setNewPasscode('');
        setConfirmPasscode('');
        setPasscodeSuccess('');
      }, 700);
    } catch (err) {
      setPasscodeError(err.message || 'Failed to save passcode.');
    }
  };

  const handleRemovePasscode = () => {
    if (window.confirm('Are you sure you want to remove your custom passcode?')) {
      removeCustomPasscode(user?.uid);
      setPasscodeSet(false);
      const nextMode = getLockMode(user?.uid);
      setCurrentLockMode(nextMode);
      if (user?.uid && isFirebaseConfigured()) {
        saveUserSettingsToCloud(user.uid, { lockMode: nextMode, passcodeHash: null }).catch(console.error);
      }
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = importFromJSON(event.target.result);
      if (result.success) {
        setImportStatus({ type: 'success', message: `Imported ${result.count} expenses successfully!` });
      } else {
        setImportStatus({ type: 'error', message: `Failed to import: ${result.error}` });
      }
      setTimeout(() => setImportStatus(null), 4000);
    };
    reader.readAsText(file);
  };

  const handleWipe = () => {
    if (window.confirm('Are you sure you want to clear all expenses? This cannot be undone unless you have a JSON backup.')) {
      clearAllData();
      alert('All local expenses have been cleared.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '0 16px' }}>
      {/* Header */}
      <div className="glass-card" style={{ padding: '18px 20px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Settings & Cloud Sync</h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Manage your currency, cloud database connection, backups, and mobile installation.
        </p>
      </div>

      {/* Currency Preferences */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <DollarSign size={20} style={{ color: 'var(--accent-primary)' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Default Currency</h3>
        </div>

        <div className="settings-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '10px'
        }}>
          {AVAILABLE_CURRENCIES.map(curr => {
            const isSelected = currency.code === curr.code;
            return (
              <button
                key={curr.code}
                onClick={() => setCurrency(curr)}
                style={{
                  background: isSelected ? 'var(--accent-primary)' : 'var(--bg-primary)',
                  color: isSelected ? '#ffffff' : 'var(--text-primary)',
                  border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem'
                }}
              >
                <span>{curr.name}</span>
                {isSelected && <Check size={16} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cloud Database (Firebase) Status */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Flame size={20} style={{ color: '#f59e0b' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Firebase Cloud Database & Sync</h3>
          </div>
          <span className="badge" style={{
            background: user ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)',
            color: user ? 'var(--color-success)' : 'var(--text-muted)'
          }}>
            {user ? 'Cloud Active' : 'Offline / Local'}
          </span>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '16px' }}>
          {user ? (
            <>You are logged in as <strong>{user.email}</strong>. All your expenses, custom categories, and budgets are automatically synced in real-time to your secure Cloud Firestore database.</>
          ) : (
            <>You are currently using <strong>Local Storage mode</strong>. Your data is stored safely in this browser on your device. Connect to Firebase to sync seamlessly between your phone and laptop.</>
          )}
        </p>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {!user ? (
            <button 
              onClick={() => setIsAuthModalOpen(true)}
              className="btn btn-primary"
              style={{ fontSize: '0.85rem' }}
            >
              <Cloud size={16} />
              <span>Connect Firebase Account</span>
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--color-success)' }}>
                <ShieldCheck size={18} />
                <span>Cloud Firestore Security Rules active (per-user private database)</span>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to sign out of ${user.email}?`)) {
                      logoutUser();
                    }
                  }}
                  className="btn btn-secondary"
                  style={{
                    fontSize: '0.85rem',
                    padding: '9px 16px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    borderColor: 'var(--danger)',
                    color: 'var(--danger)',
                    cursor: 'pointer'
                  }}
                >
                  <LogOut size={16} />
                  <span>Sign Out ({user.email})</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile App Installation Guide (PWA) */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Smartphone size={20} style={{ color: '#38bdf8' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Install as App on Your Phone</h3>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Expense Tracker is a Progressive Web App (PWA). Once deployed, you can install it on your iPhone or Android phone with <strong>zero app store hassle</strong>:
        </p>

        <div className="settings-install-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
          <div style={{ background: 'var(--bg-primary)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>📱 On iPhone (iOS Safari):</h4>
            <ol style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', paddingLeft: '18px', lineHeight: '1.6' }}>
              <li>Open your deployed Expense Tracker URL in Safari.</li>
              <li>Tap the <strong>Share</strong> button (box with upward arrow) at the bottom.</li>
              <li>Scroll down and tap <strong>"Add to Home Screen"</strong>.</li>
            </ol>
          </div>

          <div style={{ background: 'var(--bg-primary)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>🤖 On Android (Chrome / Brave):</h4>
            <ol style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', paddingLeft: '18px', lineHeight: '1.6' }}>
              <li>Open your deployed Expense Tracker URL in Chrome.</li>
              <li>Tap the three dots (⋮) menu in the top right.</li>
              <li>Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</li>
            </ol>
          </div>
        </div>
      </div>

      {/* App Security & Lock Options */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={20} style={{ color: currentLockMode !== 'none' ? '#10b981' : 'var(--text-muted)' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>App Security & Lock</h3>
          </div>
          <span className="badge" style={{
            background: currentLockMode !== 'none' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)',
            color: currentLockMode !== 'none' ? 'var(--color-success)' : 'var(--text-muted)'
          }}>
            {currentLockMode === 'biometric' ? 'Phone Lock Active' : (currentLockMode === 'passcode' ? 'Custom Passcode Active' : 'Lock Disabled')}
          </span>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '16px' }}>
          Choose how you prefer to secure your expense tracker:
        </p>

        {/* Security Options Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px', marginBottom: '16px' }}>
          {/* Option 1: Phone Screen Lock & Biometrics */}
          <div 
            onClick={() => handleSelectLockMode('biometric')}
            style={{
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              background: currentLockMode === 'biometric' ? 'var(--accent-soft)' : 'var(--bg-primary)',
              border: `1.5px solid ${currentLockMode === 'biometric' ? 'var(--accent)' : 'var(--border-subtle)'}`,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.9rem' }}>
                <Shield size={16} color="var(--accent)" />
                <span>Phone Screen Lock / Biometrics</span>
              </div>
              {currentLockMode === 'biometric' && <Check size={16} color="var(--accent)" />}
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              Uses your phone's native Fingerprint, Face ID, PIN, pattern, or device password.
            </p>
          </div>

          {/* Option 2: Custom Passcode */}
          <div 
            onClick={() => handleSelectLockMode('passcode')}
            style={{
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              background: currentLockMode === 'passcode' ? 'var(--accent-soft)' : 'var(--bg-primary)',
              border: `1.5px solid ${currentLockMode === 'passcode' ? 'var(--accent)' : 'var(--border-subtle)'}`,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.9rem' }}>
                <KeyRound size={16} color="var(--accent)" />
                <span>Custom Passcode / PIN</span>
              </div>
              {currentLockMode === 'passcode' && <Check size={16} color="var(--accent)" />}
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              Create your own personal 4-6 digit passcode to unlock the app.
            </p>
          </div>

          {/* Option 3: No Lock */}
          <div 
            onClick={() => handleSelectLockMode('none')}
            style={{
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              background: currentLockMode === 'none' ? 'var(--accent-soft)' : 'var(--bg-primary)',
              border: `1.5px solid ${currentLockMode === 'none' ? 'var(--accent)' : 'var(--border-subtle)'}`,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.9rem' }}>
                <ShieldOff size={16} color="var(--text-muted)" />
                <span>No Lock (Disabled)</span>
              </div>
              {currentLockMode === 'none' && <Check size={16} color="var(--accent)" />}
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              App opens immediately without asking for biometric or passcode unlock.
            </p>
          </div>
        </div>

        {/* Passcode Management Buttons */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', paddingTop: '6px', borderTop: '1px solid var(--border-subtle)' }}>
          <button 
            type="button"
            onClick={() => {
              setNewPasscode('');
              setConfirmPasscode('');
              setPasscodeError('');
              setPasscodeSuccess('');
              setIsPasscodeModalOpen(true);
            }}
            className="btn btn-secondary"
            style={{ fontSize: '0.85rem' }}
          >
            <KeyRound size={15} />
            <span>{passcodeSet ? 'Change Custom Passcode' : 'Set Up Custom Passcode'}</span>
          </button>

          {passcodeSet && (
            <button 
              type="button"
              onClick={handleRemovePasscode}
              className="btn btn-ghost"
              style={{ fontSize: '0.85rem', color: 'var(--danger)' }}
            >
              <span>Remove Passcode</span>
            </button>
          )}

          {currentLockMode !== 'none' && (
            <button 
              type="button"
              onClick={() => {
                lockApp(user?.uid);
                if (onLock) onLock();
              }}
              className="btn btn-secondary"
              style={{ fontSize: '0.85rem', marginLeft: 'auto' }}
            >
              <Lock size={15} />
              <span>Lock App Now</span>
            </button>
          )}
        </div>
      </div>

      {/* Data Backup & Restore */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px' }}>Data Management & Backups</h3>

        {importStatus && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '14px',
            fontSize: '0.85rem',
            background: importStatus.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            color: importStatus.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)'
          }}>
            {importStatus.message}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            onClick={exportToJSON}
            className="btn btn-secondary"
            style={{ fontSize: '0.85rem' }}
          >
            <Download size={16} />
            <span>Download Backup (JSON)</span>
          </button>

          <button 
            onClick={exportToCSV}
            className="btn btn-secondary"
            style={{ fontSize: '0.85rem' }}
          >
            <Download size={16} />
            <span>Export Expenses (CSV)</span>
          </button>

          <button 
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-secondary"
            style={{ fontSize: '0.85rem' }}
          >
            <Upload size={16} />
            <span>Restore from Backup (JSON)</span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".json" 
            style={{ display: 'none' }} 
          />

          <button 
            onClick={handleWipe}
            className="btn btn-danger"
            style={{ fontSize: '0.85rem' }}
          >
            <Trash2 size={16} />
            <span>Wipe Local Data</span>
          </button>
        </div>
      </div>

      {/* Set Up Custom Passcode Modal */}
      {isPasscodeModalOpen && (
        <div className="modal-overlay" onClick={() => setIsPasscodeModalOpen(false)}>
          <div 
            className="glass-card" 
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '380px', padding: '28px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <KeyRound size={20} color="var(--accent)" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                  {passcodeSet ? 'Change Passcode' : 'Set Up Passcode'}
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setIsPasscodeModalOpen(false)}
                className="btn btn-ghost btn-icon"
                style={{ borderRadius: '50%' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.4 }}>
              Choose a 4-digit passcode to protect your expenses. Each user has their own private passcode and lock settings.
            </p>

            {passcodeError && (
              <div style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(239, 68, 68, 0.15)',
                color: 'var(--color-danger)',
                fontSize: '0.8rem',
                marginBottom: '14px'
              }}>
                {passcodeError}
              </div>
            )}

            {passcodeSuccess && (
              <div style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--color-success)',
                fontSize: '0.8rem',
                marginBottom: '14px'
              }}>
                {passcodeSuccess}
              </div>
            )}

            <form onSubmit={handleSavePasscode} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                  New 4-Digit Passcode
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  autoFocus
                  required
                  placeholder="••••"
                  value={newPasscode}
                  onChange={(e) => setNewPasscode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="input mono"
                  style={{ textAlign: 'center', letterSpacing: '0.4em', fontSize: '1.4rem', padding: '10px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                  Confirm 4-Digit Passcode
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  required
                  placeholder="••••"
                  value={confirmPasscode}
                  onChange={(e) => setConfirmPasscode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="input mono"
                  style={{ textAlign: 'center', letterSpacing: '0.4em', fontSize: '1.4rem', padding: '10px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsPasscodeModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '10px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '10px', fontWeight: 700 }}
                >
                  Save Passcode
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
