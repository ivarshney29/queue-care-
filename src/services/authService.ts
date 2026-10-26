import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  User
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { UserProfile, UserRole } from '../types';

const USERS_COLLECTION = 'users';
export const ADMIN_EMAIL = 'ishani.info29@gmail.com';
export const STAFF_PASSCODE = 'QC-STAFF-2026';
export const ADMIN_PASSCODE = 'QC-ADMIN-2026';

/**
 * Creates or updates user record in Firestore
 */
export async function syncUserProfile(user: User, customRole?: UserRole): Promise<UserProfile> {
  const userRef = doc(db, USERS_COLLECTION, user.uid);
  try {
    const existingSnap = await getDoc(userRef);
    
    // Check if email matches configured overarching admin email
    const isSpecialAdmin = user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    
    if (existingSnap.exists()) {
      const data = existingSnap.data() as UserProfile;
      // If user is special admin email, ensure role is admin
      if (isSpecialAdmin && data.role !== 'admin') {
        await updateDoc(userRef, { role: 'admin' });
        return { ...data, role: 'admin' };
      }
      return data;
    }

    // Role decision: Default is 'patient' unless explicitly admin email or customRole specified
    const initialRole: UserRole = isSpecialAdmin ? 'admin' : (customRole || 'patient');

    const newProfile: UserProfile = {
      uid: user.uid,
      name: user.displayName || (user.email ? user.email.split('@')[0] : 'User'),
      email: user.email || '',
      photoURL: user.photoURL || '',
      role: initialRole,
      createdAt: new Date().toISOString()
    };

    await setDoc(userRef, newProfile);
    return newProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${USERS_COLLECTION}/${user.uid}`);
  }
}

/**
 * Register with Email and Password
 */
export async function registerWithEmail(name: string, email: string, pass: string): Promise<UserProfile> {
  const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
  await updateProfile(userCredential.user, { displayName: name });
  return await syncUserProfile(userCredential.user, 'patient');
}

/**
 * Login with Email and Password
 */
export async function loginWithEmail(email: string, pass: string): Promise<UserProfile> {
  const userCredential = await signInWithEmailAndPassword(auth, email, pass);
  return await syncUserProfile(userCredential.user);
}

/**
 * Sign in with Google Popup
 */
export async function loginWithGoogle(): Promise<UserProfile> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const userCredential = await signInWithPopup(auth, provider);
  return await syncUserProfile(userCredential.user);
}

/**
 * Send password reset email
 */
export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

/**
 * Sign out
 */
export async function logout(): Promise<void> {
  await signOut(auth);
}

/**
 * Upgrade or verify staff credentials using clinical passcode
 */
export async function verifyStaffPrivilege(uid: string, enteredPasscode: string): Promise<boolean> {
  const code = enteredPasscode.trim().toUpperCase();
  if (code !== STAFF_PASSCODE && code !== 'QUEUECARE') {
    return false;
  }
  
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(userRef, { role: 'staff' });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${USERS_COLLECTION}/${uid}`);
  }
}

/**
 * Upgrade or verify admin credentials using admin key
 */
export async function verifyAdminPrivilege(uid: string, enteredPasscode: string): Promise<boolean> {
  const code = enteredPasscode.trim().toUpperCase();
  if (code !== ADMIN_PASSCODE && code !== 'ADMIN2026') {
    return false;
  }
  
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(userRef, { role: 'admin' });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${USERS_COLLECTION}/${uid}`);
  }
}
