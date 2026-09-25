import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  loginWithGoogle, 
  loginWithEmail, 
  registerWithEmail, 
  isFirebaseConfigured,
  isAllowedUser,
  logoutUser,
  ALLOWED_EMAIL
} from '../firebase';
import { 
  X, 
  Mail, 
  Lock, 
  Cloud, 
  AlertCircle, 
  CheckCircle2, 
  ExternalLink,
  Flame,
  ArrowRight
} from 'lucide-react';

export const AuthModal = () => {
  const { isAuthModalOpen, setIsAuthModalOpen, syncLocalDataToCloud } = useApp();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfigHelper, setShowConfigHelper] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleClose = () => {
    setIsAuthModalOpen(false);
    setError('');
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let credential;
      if (isSignUp) {
        credential = await registerWithEmail(email, password);
      } else {
        credential = await loginWithEmail(email, password);
      }
      if (!isAllowedUser(credential.user)) {
        await logoutUser();
        throw new Error(email.toLowerCase() === ALLOWED_EMAIL
          ? 'Check your email and verify the account before signing in.'
          : `Only ${ALLOWED_EMAIL} can access this app.`);
      }
      await syncLocalDataToCloud(credential.user);
      handleClose();
    } catch (err) {
      setError(err.code === 'auth/invalid-credential'
        ? 'Sign-in failed. Check the email and password.'
        : (err.message || 'Authentication failed.'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError('');
    setLoading(true);
    try {
      const credential = await loginWithGoogle();
      if (!isAllowedUser(credential.user)) {
        await logoutUser();
        throw new Error(`Only ${ALLOWED_EMAIL} can access this app.`);
      }
      await syncLocalDataToCloud(credential.user);
      handleClose();
    } catch (err) {
      setError(err.message || 'Google Sign-In failed.');
    } finally {
      setLoading(false);
    }
  };

  const isConfigured = isFirebaseConfigured();

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '460px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff'
            }}>
              <Flame size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                {isConfigured ? (isSignUp ? 'Create Cloud Account' : 'Sign in to Cloud') : 'Firebase Cloud Setup'}
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {isConfigured ? 'Sync expenses across all your devices' : 'Enable free real-time cloud sync & mobile access'}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="btn btn-ghost btn-icon">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: 'var(--color-danger)',
            fontSize: '0.82rem',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {!isConfigured ? (
          <div>
            <div style={{
              background: 'var(--bg-primary)',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              marginBottom: '16px',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              lineHeight: '1.6'
            }}>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                🚀 Ready for Free Cloud Sync?
              </p>
              <p style={{ marginBottom: '8px' }}>
                Your app already works <strong>100% offline right now</strong> using local storage! To connect real-time sync between your phone and laptop:
              </p>
              <ol style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li>Go to <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>Firebase Console</a> (100% free, no credit card).</li>
                <li>Click <strong>Add Project</strong> &gt; enable <strong>Authentication</strong> (Google / Email) and <strong>Cloud Firestore</strong>.</li>
                <li>Copy your config keys into your <code>.env</code> file (or provide them to the assistant).</li>
              </ol>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={handleClose} className="btn btn-primary" style={{ width: '100%' }}>
                Got it, Continue in Local Mode
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Google Sign In Button */}
            <button
              onClick={handleGoogleAuth}
              disabled={loading}
              className="btn btn-secondary"
              style={{ width: '100%', padding: '12px', fontSize: '0.9rem', marginBottom: '14px', display: 'flex', gap: '10px' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.9c2.28-2.1 3.6-5.2 3.6-9.15z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.9-3.05c-1.08.72-2.45 1.16-4.03 1.16-3.1 0-5.74-2.1-6.68-4.93H1.28v3.15C3.26 21.36 7.34 24 12 24z"/>
                <path fill="#FBBC05" d="M5.32 14.27c-.24-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.28C.46 8.21 0 10.05 0 12s.46 3.79 1.28 5.42l4.04-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.28 6.58l4.04 3.15c.94-2.83 3.58-4.98 6.68-4.98z"/>
              </svg>
              <span>Continue with Google</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '14px 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>OR EMAIL</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
            </div>

            <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
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
                    style={{ paddingLeft: '36px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
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
                    style={{ paddingLeft: '36px' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '6px', padding: '12px' }}
              >
                {loading ? 'Please wait...' : (isSignUp ? 'Create Cloud Account' : 'Sign In')}
              </button>

              <div style={{ textAlign: 'center', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="btn-ghost"
                  style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', cursor: 'pointer' }}
                >
                  {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
