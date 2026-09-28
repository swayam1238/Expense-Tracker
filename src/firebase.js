import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendEmailVerification,
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  deleteField,
  writeBatch,
  getDocs
} from 'firebase/firestore';

// Reads credentials from Vite environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
};

// Allow all users authenticated via Firebase Auth
export const ALLOWED_EMAIL = null;

export const isAllowedUser = (user) => Boolean(user && user.uid);

// Check if credentials are supplied
export const isFirebaseConfigured = () => {
  return Boolean(
    firebaseConfig.apiKey && 
    firebaseConfig.projectId && 
    firebaseConfig.appId &&
    firebaseConfig.authDomain &&
    firebaseConfig.apiKey !== 'YOUR_FIREBASE_API_KEY'
  );
};

let app = null;
let auth = null;
let db = null;

if (isFirebaseConfigured()) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (err) {
    console.warn('Firebase initialization error:', err);
  }
}

// Authentication Helpers
export const loginWithGoogle = async () => {
  if (!auth) throw new Error('Firebase is not configured yet. Configure your keys in Settings.');
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
};

export const loginWithEmail = async (email, password) => {
  if (!auth) throw new Error('Firebase is not configured yet. Configure your keys in Settings.');
  return signInWithEmailAndPassword(auth, email, password);
};

export const registerWithEmail = async (email, password) => {
  if (!auth) throw new Error('Firebase is not configured yet. Configure your keys in Settings.');
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(credential.user);
  return credential;
};

export const logoutUser = async () => {
  if (!auth) return;
  return signOut(auth);
};

export const listenToAuth = (callback) => {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
};

const toPlainValue = (value) => {
  if (value && typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }
  return value;
};

const mapExpenseDoc = (expenseDoc) => {
  const data = expenseDoc.data() || {};
  return {
    id: expenseDoc.id,
    ...data,
    amount: Number(data.amount) || 0,
    createdAt: toPlainValue(data.createdAt),
    updatedAt: toPlainValue(data.updatedAt)
  };
};

const sanitizeForFirestore = (data = {}) => {
  const clean = {};
  Object.entries(data).forEach(([key, value]) => {
    if (key !== 'id' && value !== undefined) clean[key] = value;
  });
  return clean;
};

const sortExpensesByDate = (expenses) =>
  [...expenses].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

// Firestore Helpers (Per-user Isolation)
export const subscribeUserExpenses = (userId, callback) => {
  if (!db || !userId) {
    callback([], new Error('Firestore is not initialized. Check the Firebase configuration.'));
    return () => {};
  }
  const colRef = collection(db, 'users', userId, 'expenses');
  let activeUnsubscribe = () => {};

  const listen = (targetQuery, mapSnapshot) => {
    activeUnsubscribe();
    activeUnsubscribe = onSnapshot(targetQuery, (snapshot) => {
      callback(mapSnapshot(snapshot));
    }, (error) => {
      console.error('Error fetching expenses from Firestore:', error);
      if (targetQuery !== colRef) {
        listen(colRef, (snapshot) => sortExpensesByDate(snapshot.docs.map(mapExpenseDoc)));
      } else {
        callback([], error);
      }
    });
  };

  listen(
    query(colRef, orderBy('date', 'desc')),
    (snapshot) => snapshot.docs.map(mapExpenseDoc)
  );

  return () => activeUnsubscribe();
};

export const addExpenseToCloud = async (userId, expenseData) => {
  if (!db || !userId) throw new Error('Firestore is not initialized. Check the Firebase configuration.');
  const colRef = collection(db, 'users', userId, 'expenses');
  const docRef = await addDoc(colRef, {
    ...sanitizeForFirestore(expenseData),
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const addExpensesToCloudBatch = async (userId, expensesList = []) => {
  if (!db || !userId) throw new Error('Firestore is not initialized. Check the Firebase configuration.');
  if (expensesList.length === 0) return [];
  const colRef = collection(db, 'users', userId, 'expenses');
  const ids = [];

  for (let i = 0; i < expensesList.length; i += 450) {
    const chunk = expensesList.slice(i, i + 450);
    const batch = writeBatch(db);
    chunk.forEach((item) => {
      const docRef = doc(colRef);
      batch.set(docRef, {
        ...sanitizeForFirestore(item),
        createdAt: serverTimestamp()
      });
      ids.push(docRef.id);
    });
    await batch.commit();
  }

  return ids;
};

export const updateExpenseInCloud = async (userId, expenseId, data) => {
  if (!db || !userId) throw new Error('Firestore is not initialized. Check the Firebase configuration.');
  const docRef = doc(db, 'users', userId, 'expenses', expenseId);
  return updateDoc(docRef, {
    ...sanitizeForFirestore(data),
    updatedAt: serverTimestamp()
  });
};

export const deleteExpenseFromCloud = async (userId, expenseId) => {
  if (!db || !userId) throw new Error('Firestore is not initialized. Check the Firebase configuration.');
  const docRef = doc(db, 'users', userId, 'expenses', expenseId);
  return deleteDoc(docRef);
};

export const deleteAllUserExpensesFromCloud = async (userId) => {
  if (!db || !userId) throw new Error('Firestore is not initialized. Check the Firebase configuration.');
  const snapshot = await getDocs(collection(db, 'users', userId, 'expenses'));
  for (let index = 0; index < snapshot.docs.length; index += 450) {
    const batch = writeBatch(db);
    snapshot.docs.slice(index, index + 450).forEach(expenseDoc => batch.delete(expenseDoc.ref));
    await batch.commit();
  }
};

export const subscribeUserSettings = (userId, callback) => {
  if (!db || !userId) {
    callback(undefined, new Error('Firestore is not initialized. Check the Firebase configuration.'));
    return () => {};
  }
  const docRef = doc(db, 'users', userId, 'settings', 'config');
  return onSnapshot(docRef, (docSnap) => {
    callback(docSnap.exists() ? docSnap.data() : null);
  }, (error) => {
    console.error('Error fetching settings from Firestore:', error);
    callback(undefined, error);
  });
};

export const saveUserSettingsToCloud = async (userId, settingsData) => {
  if (!db || !userId) throw new Error('Firestore is not initialized. Check the Firebase configuration.');
  const docRef = doc(db, 'users', userId, 'settings', 'config');
  return setDoc(docRef, {
    ...sanitizeForFirestore(settingsData),
    updatedAt: serverTimestamp()
  }, { merge: true });
};

export { auth, db, deleteField };
