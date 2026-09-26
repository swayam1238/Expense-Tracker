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
  where, 
  orderBy, 
  serverTimestamp,
  deleteField
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

// Firestore Helpers (Per-user Isolation)
export const subscribeUserExpenses = (userId, callback) => {
  if (!db || !userId) return () => {};
  const q = query(
    collection(db, 'users', userId, 'expenses'),
    orderBy('date', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    const expenses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(expenses);
  }, (error) => {
    console.error('Error fetching expenses from Firestore:', error);
  });
};

export const addExpenseToCloud = async (userId, expenseData) => {
  if (!db || !userId) return null;
  const colRef = collection(db, 'users', userId, 'expenses');
  const docRef = await addDoc(colRef, {
    ...expenseData,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const updateExpenseInCloud = async (userId, expenseId, data) => {
  if (!db || !userId) return;
  const docRef = doc(db, 'users', userId, 'expenses', expenseId);
  return updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp()
  });
};

export const deleteExpenseFromCloud = async (userId, expenseId) => {
  if (!db || !userId) return;
  const docRef = doc(db, 'users', userId, 'expenses', expenseId);
  return deleteDoc(docRef);
};

export const subscribeUserSettings = (userId, callback) => {
  if (!db || !userId) return () => {};
  const docRef = doc(db, 'users', userId, 'settings', 'config');
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data());
    } else {
      callback(null);
    }
  });
};

export const saveUserSettingsToCloud = async (userId, settingsData) => {
  if (!db || !userId) return;
  const docRef = doc(db, 'users', userId, 'settings', 'config');
  return setDoc(docRef, {
    ...settingsData,
    updatedAt: serverTimestamp()
  }, { merge: true });
};

export { auth, db, deleteField };
