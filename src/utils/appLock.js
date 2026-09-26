export const APP_UNLOCKED_KEY = 'expense_tracker_unlocked';
export const APP_DEVICE_CREDENTIAL_KEY = 'expense_tracker_device_credential_id';
export const APP_LOCK_MODE_KEY = 'expense_tracker_lock_mode'; // 'biometric' | 'passcode' | 'none'
export const APP_PASSCODE_HASH_KEY = 'expense_tracker_passcode_hash';

export const getUnlockedKey = (userId) => userId ? `expense_tracker_${userId}_unlocked` : APP_UNLOCKED_KEY;
export const getLockModeKey = (userId) => userId ? `expense_tracker_${userId}_lock_mode` : APP_LOCK_MODE_KEY;
export const getPasscodeHashKey = (userId) => userId ? `expense_tracker_${userId}_passcode_hash` : APP_PASSCODE_HASH_KEY;
export const getDeviceCredKey = (userId) => userId ? `expense_tracker_${userId}_device_credential_id` : APP_DEVICE_CREDENTIAL_KEY;

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

export const hasCustomPasscode = (userId) => Boolean(localStorage.getItem(getPasscodeHashKey(userId)));

export const setCustomPasscode = async (passcode, userId) => {
  const cleaned = (passcode || '').trim();
  if (!/^\d{4}$/.test(cleaned)) {
    throw new Error('Passcode must be exactly 4 digits.');
  }
  const hash = await sha256Hex(cleaned);
  localStorage.setItem(getPasscodeHashKey(userId), hash);
  localStorage.setItem(getLockModeKey(userId), 'passcode');
  return hash;
};

export const removeCustomPasscode = (userId) => {
  localStorage.removeItem(getPasscodeHashKey(userId));
  if (localStorage.getItem(getLockModeKey(userId)) === 'passcode') {
    if (canUseDeviceLock()) {
      localStorage.setItem(getLockModeKey(userId), 'biometric');
    } else {
      localStorage.setItem(getLockModeKey(userId), 'none');
    }
  }
};

export const verifyCustomPasscode = async (enteredPasscode, userId) => {
  const storedHash = localStorage.getItem(getPasscodeHashKey(userId));
  if (!storedHash) return true;
  const enteredHash = await sha256Hex((enteredPasscode || '').trim());
  const isValid = timingSafeEqual(enteredHash, storedHash);
  if (isValid) {
    sessionStorage.setItem(getUnlockedKey(userId), 'true');
  }
  return isValid;
};

/**
 * Returns current lock mode for a specific user:
 * 'biometric' | 'passcode' | 'none'
 */
export const getLockMode = (userId) => {
  const explicit = localStorage.getItem(getLockModeKey(userId));
  if (explicit) return explicit;
  if (hasCustomPasscode(userId)) return 'passcode';
  if (canUseDeviceLock()) return 'biometric';
  return 'none';
};

export const setLockMode = (mode, userId) => {
  if (mode === 'biometric' || mode === 'passcode' || mode === 'none') {
    localStorage.setItem(getLockModeKey(userId), mode);
  }
};

export const isAppLockEnabled = (userId) => {
  const mode = getLockMode(userId);
  if (mode === 'none') return false;
  if (mode === 'passcode') return hasCustomPasscode(userId);
  if (mode === 'biometric') return canUseDeviceLock();
  return false;
};

export const isAppUnlocked = (userId) => {
  if (!isAppLockEnabled(userId)) return true;
  return sessionStorage.getItem(getUnlockedKey(userId)) === 'true';
};

export const lockApp = (userId) => {
  sessionStorage.removeItem(getUnlockedKey(userId));
  if (!userId) {
    sessionStorage.removeItem(APP_UNLOCKED_KEY);
  }
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
export const authenticateWithDeviceLock = async (userId) => {
  if (!canUseDeviceLock()) {
    throw new Error('Device authentication requires HTTPS and a supported device.');
  }

  const storedId = localStorage.getItem(getDeviceCredKey(userId));

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
        sessionStorage.setItem(getUnlockedKey(userId), 'true');
        return true;
      }
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        throw new Error('Authentication was cancelled. Tap to try again.');
      }
      console.warn('Stored credential verification failed, recreating credential:', err);
      localStorage.removeItem(getDeviceCredKey(userId));
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
          name: userId ? `user-${userId.slice(0, 10)}` : 'expense-tracker-user',
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
    localStorage.setItem(getDeviceCredKey(userId), credIdBase64);
    sessionStorage.setItem(getUnlockedKey(userId), 'true');
    return true;
  } catch (err) {
    if (err.name === 'NotAllowedError') {
      throw new Error('Authentication was cancelled or timed out. Tap to try again.');
    }
    throw err;
  }
};
