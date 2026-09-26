export const APP_UNLOCKED_KEY = 'expense_tracker_unlocked';
export const APP_DEVICE_CREDENTIAL_KEY = 'expense_tracker_device_credential_id';
export const APP_DEVICE_LOCK_DISABLED_KEY = 'expense_tracker_device_lock_disabled';

// Checks if the browser & device support WebAuthn platform authenticators (fingerprint, face, PIN, pattern)
export const canUseDeviceLock = () => Boolean(
  typeof window !== 'undefined'
  && window.PublicKeyCredential
  && navigator.credentials
  && window.isSecureContext
);

// Check if device lock is active (default is true if device supports it)
export const isDeviceLockEnabled = () => {
  if (!canUseDeviceLock()) return false;
  return localStorage.getItem(APP_DEVICE_LOCK_DISABLED_KEY) !== 'true';
};

export const setDeviceLockEnabled = (enabled) => {
  if (enabled) {
    localStorage.removeItem(APP_DEVICE_LOCK_DISABLED_KEY);
  } else {
    localStorage.setItem(APP_DEVICE_LOCK_DISABLED_KEY, 'true');
  }
};

export const isAppUnlocked = () => {
  if (!isDeviceLockEnabled()) return true;
  return sessionStorage.getItem(APP_UNLOCKED_KEY) === 'true';
};

export const lockApp = () => {
  sessionStorage.removeItem(APP_UNLOCKED_KEY);
};

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

/**
 * Triggers the phone's native lock screen / biometric verification
 * (Fingerprint, Face ID, Phone PIN, Pattern, or Password).
 */
export const authenticateWithDeviceLock = async () => {
  if (!canUseDeviceLock()) {
    throw new Error('Device authentication requires HTTPS and a supported device.');
  }

  const storedId = localStorage.getItem(APP_DEVICE_CREDENTIAL_KEY);

  // If a credential was already registered on this device, verify with it first
  if (storedId) {
    try {
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: createChallenge(),
          allowCredentials: [{ id: fromBase64Url(storedId), type: 'public-key' }],
          userVerification: 'required',
          timeout: 60000
        }
      });
      if (assertion) {
        sessionStorage.setItem(APP_UNLOCKED_KEY, 'true');
        return true;
      }
    } catch (err) {
      // If user cancelled, don't delete stored credential
      if (err.name === 'NotAllowedError') {
        throw new Error('Authentication was cancelled. Tap to try again.');
      }
      // If credential not found or device changed, clear and fall through to registration
      console.warn('Stored credential verification failed, recreating credential:', err);
      localStorage.removeItem(APP_DEVICE_CREDENTIAL_KEY);
    }
  }

  // Register device lock credential (prompts phone's native screen lock / biometric sheet)
  try {
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: createChallenge(),
        rp: { name: 'Expense Tracker' },
        user: {
          id: createChallenge(),
          name: 'expense-tracker-user',
          displayName: 'Device Owner'
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },   // ES256 (standard)
          { type: 'public-key', alg: -257 }  // RS256 (fallback)
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

    if (!credential) {
      throw new Error('Device authentication was cancelled.');
    }

    const credIdBase64 = toBase64Url(new Uint8Array(credential.rawId));
    localStorage.setItem(APP_DEVICE_CREDENTIAL_KEY, credIdBase64);
    sessionStorage.setItem(APP_UNLOCKED_KEY, 'true');
    return true;
  } catch (err) {
    if (err.name === 'NotAllowedError') {
      throw new Error('Authentication was cancelled or timed out. Tap to try again.');
    }
    throw err;
  }
};
