import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  loginWithGoogle, 
  loginWithEmail, 
  isFirebaseConfigured,
  isAllowedUser,
  logoutUser
} from '../firebase';
import { 
  X, 
  Mail, 
  Lock, 
  AlertCircle, 
  Flame
} from 'lucide-react';

export const AuthModal = ({ embedded = false }) => {
  const { isAuthModalOpen, setIsAuthModalOpen } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!embedded && !isAuthModalOpen) return null;

  const handleClose = () => {
    setIsAuthModalOpen(false);
    setError('');
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);

    try {
      const credential = await loginWithEmail(email.trim(), password);
      if (!isAllowedUser(credential.user)) {
        await logoutUser();
        throw new Error('Access denied. User not authorized.');
      }
      handleClose();
    } catch (err) {
      console.warn('Sign-in error:', err);
      let msg = 'Sign-in failed. Please check your email and password.';
      if (
        err.code === 'auth/invalid-credential' || 
        err.code === 'auth/user-not-found' || 
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-email'
      ) {
        msg = 'Incorrect email or password. Please verify your credentials.';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Too many attempts. Please try again in a few minutes.';
      } else if (err.code === 'auth/network-request-failed') {
        msg = 'Network connection failed. Please check your internet connection.';
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      const credential = await loginWithGoogle();
      if (!isAllowedUser(credential.user)) {
        await logoutUser();
        throw new Error('Access denied. User not authorized.');
      }
      handleClose();
    } catch (err) {
      console.warn('Google Sign-In error:', err);
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        // User closed or dismissed popup, no error needed
      } else if (err.code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Please allow popups or sign in with email.');
      } else {
        setError(err.message || 'Google Sign-In failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const isConfigured = isFirebaseConfigured();

  const cardContent = (
    <div 
      className="glass-card" 
      onClick={(e) => e.stopPropagation()}
      style={{
        width: '100%',
        maxWidth: '420px',
        padding: '32px 28px',
        position: 'relative'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
          }}>
            <Flame size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Sign In to Cloud
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Access your personal expenses & budgets
            </p>
          </div>
        </div>
        {!embedded && (
          <button onClick={handleClose} className="btn btn-ghost btn-icon" style={{ borderRadius: '50%' }}>
            <X size={20} />
          </button>
        )}
      </div>

      {error && (
        <div style={{
          padding: '10px 14px',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: 'var(--color-danger)',
          fontSize: '0.82rem',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {!isConfigured ? (
        <div style={{
          background: 'var(--bg-primary)',
          padding: '16px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)'
        }}>
          <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
            Firebase Not Configured
          </p>
          <p style={{ fontSize: '0.8rem', lineHeight: 1.5 }}>
            Please add your Firebase keys to your environment configuration to enable sign-in.
          </p>
        </div>
      ) : (
        <div>
          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={loading}
            className="btn btn-secondary"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '0.9rem',
              fontWeight: 600,
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.9c2.28-2.1 3.6-5.2 3.6-9.15z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.9-3.05c-1.08.72-2.45 1.16-4.03 1.16-3.1 0-5.74-2.1-6.68-4.93H1.28v3.15C3.26 21.36 7.34 24 12 24z"/>
              <path fill="#FBBC05" d="M5.32 14.27c-.24-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.28C.46 8.21 0 10.05 0 12s.46 3.79 1.28 5.42l4.04-3.15z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.28 6.58l4.04 3.15c.94-2.83 3.58-4.98 6.68-4.98z"/>
            </svg>
            <span>Continue with Google</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '14px 0 18px' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>OR SIGN IN WITH EMAIL</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
          </div>

          <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px', display: 'block' }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  style={{ paddingLeft: '36px', width: '100%' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px', display: 'block' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  style={{ paddingLeft: '36px', width: '100%' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '6px', padding: '12px', fontWeight: 700 }}
            >
              {loading ? 'Signing In…' : 'Sign In'}
            </button>
          </form>

          <p style={{
            fontSize: '0.74rem',
            color: 'var(--text-muted)',
            textAlign: 'center',
            marginTop: '16px',
            lineHeight: 1.4
          }}>
            🔒 Only authorized accounts set up in Firebase can access this private tracker.
          </p>
        </div>
      )}
    </div>
  );

  if (embedded) {
    return cardContent;
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      {cardContent}
    </div>
  );
};
