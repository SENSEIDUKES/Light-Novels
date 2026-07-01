// Mock for firebase/app
export const initializeApp = (...args: any[]) => ({});
export const getApp = (...args: any[]) => ({});

// Mock for firebase/auth
export const getAuth = (...args: any[]) => ({
  currentUser: null,
  onAuthStateChanged: (cb: any) => () => {},
  signOut: async () => {},
  signInWithPopup: async () => ({ user: null })
});
export const onAuthStateChanged = (...args: any[]) => { 
  if (args[1]) args[1](null); 
  return () => {}; 
};
export const signInWithPopup = async (...args: any[]) => ({ user: null });
export const signOut = async (...args: any[]) => {};
export class GoogleAuthProvider {}

// Mock for firebase/firestore
export const initializeFirestore = (...args: any[]) => ({});
export const getFirestore = (...args: any[]) => ({});
export const doc = (...args: any[]) => ({ id: 'mock-id', path: 'mock-path' });
export const collection = (...args: any[]) => ({ id: 'mock-col', path: 'mock-col-path' });
export const setDoc = async (...args: any[]) => {};
export const getDoc = async (...args: any[]) => ({ exists: () => false, data: (): any => ({}) });
export const getDocs = async (...args: any[]) => ({ empty: true, docs: [], forEach: (cb: any) => {} });
export const addDoc = async (...args: any[]) => ({ id: 'mock-id' });
export const updateDoc = async (...args: any[]) => {};
export const deleteDoc = async (...args: any[]) => {};
export const onSnapshot = (...args: any[]) => () => {};
export const query = (...args: any[]) => ({});
export const where = (...args: any[]) => ({});
export const orderBy = (...args: any[]) => ({});
export const limit = (...args: any[]) => ({});
export const increment = (...args: any[]) => 1;
export const serverTimestamp = (...args: any[]) => new Date();
