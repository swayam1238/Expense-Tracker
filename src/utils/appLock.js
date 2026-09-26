export const APP_UNLOCKED_KEY = 'expense_tracker_unlocked';
export const APP_DEVICE_CREDENTIAL_KEY = 'expense_tracker_device_credential_id';
export const APP_LOCK_MODE_KEY = 'expense_tracker_lock_mode'; // 'biometric' | 'passcode' | 'none'
export const APP_PASSCODE_HASH_KEY = 'expense_tracker_passcode_hash';

// Checks if the browser & device support WebAuthn platform authenticators (fingerprint, face, PIN, pattern)
export const canUseDeviceLock = () => Boolean(
  typeof window !== 'undefined'
  && window.PublicKeyCredential
  && navigator.credentials
  && window.isSecureContext
);

const sha256Hex = async (value) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const timingSafeEqual = (left, right) => {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
};

export const hasCustomPasscode = () => Boolean(localStorage.getItem(APP_PASSCODE_HASH_KEY));

export const setCustomPasscode = async (passcode) => {
  const cleaned = (passcode || '').trim();
  if (cleaned.length < 4) {
    throw new Error('Passcode must be at least 4 digits.');
  }
  const hash = await sha256Hex(cleaned);
  localStorage.setItem(APP_PASSCODE_HASH_KEY, hash);
  localStorage.setItem(APP_LOCK_MODE_KEY, 'passcode');
  return true;
};

export const removeCustomPasscode = () => {
  localStorage.removeItem(APP_PASSCODE_HASH_KEY);
  if (localStorage.getItem(APP_LOCK_MODE_KEY) === 'passcode') {
    if (canUseDeviceLock()) {
      localStorage.setItem(APP_LOCK_MODE_KEY, 'biometric');
    } else {
      localStorage.setItem(APP_LOCK_MODE_KEY, 'none');
    }
  }
};

export const verifyCustomPasscode = async (enteredPasscode) => {
  const storedHash = localStorage.getItem(APP_PASSCODE_HASH_KEY);
  if (!storedHash) return true;
  const enteredHash = await sha256Hex((enteredPasscode || '').trim());
  const isValid = timingSafeEqual(enteredHash, storedHash);
  if (isValid) {
    sessionStorage.setItem(APP_UNLOCKED_KEY, 'true');
  }
  return isValid;
};

/**
 * Returns current lock mode:
 * 'biometric' | 'passcode' | 'none'
 */
export const getLockMode = () => {
  const explicit = localStorage.getItem(APP_LOCK_MODE_KEY);
  if (explicit) return explicit;
  if (hasCustomPasscode()) return 'passcode';
  if (canUseDeviceLock()) return 'biometric';
  return 'none';
};

export const setLockMode = (mode) => {
  if (mode === 'biometric' || mode === 'passcode' || mode === 'none') {
    localStorage.setItem(APP_LOCK_MODE_KEY, mode);
  }
};

export const isAppLockEnabled = () => {
  const mode = getLockMode();
  if (mode === 'none') return false;
  if (mode === 'passcode') return hasCustomPasscode();
  if (mode === 'biometric') return canUseDeviceLock();
  return false;
};

export const isAppUnlocked = () => {
  if (!isAppLockEnabled()) return true;
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
      if (err.name === 'NotAllowedError') {
        throw new Error('Authentication was cancelled. Tap to try again.');
      }
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
