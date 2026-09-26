import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { isFirebaseConfigured } from '../firebase';
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
  LogOut
} from 'lucide-react';
import { lockApp, canUseDeviceLock, isDeviceLockEnabled } from '../utils/appLock';

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

export const SettingsView = () => {
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

      {/* Device Screen Lock & Biometrics */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={20} style={{ color: '#10b981' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Phone Screen Lock & Biometrics</h3>
          </div>
          <span className="badge" style={{
            background: canUseDeviceLock() ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)',
            color: canUseDeviceLock() ? 'var(--color-success)' : 'var(--text-muted)'
          }}>
            {canUseDeviceLock() ? 'Active' : 'Unavailable'}
          </span>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '16px' }}>
          Your app is secured using your phone's native security: <strong>Fingerprint, Face ID, PIN, pattern, or password</strong>. The old static code 1997 has been removed.
        </p>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => {
              lockApp();
              window.location.reload();
            }}
            className="btn btn-secondary"
            style={{ fontSize: '0.85rem' }}
          >
            <Lock size={15} />
            <span>Lock App Now</span>
          </button>
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
    </div>
  );
};
