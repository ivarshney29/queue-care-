import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import {
  UserProfile,
  UserRole
} from '../types';
import {
  syncUserProfile,
  registerWithEmail,
  loginWithEmail,
  loginWithGoogle,
  logout,
  sendPasswordReset,
  verifyStaffPrivilege,
  verifyAdminPrivilege
} from '../services/authService';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  role: UserRole;
  isAdmin: boolean;
  isStaff: boolean;
  isLoading: boolean;
  register: (name: string, email: string, pass: string) => Promise<UserProfile>;
  login: (email: string, pass: string) => Promise<UserProfile>;
  signInGoogle: () => Promise<UserProfile>;
  signOutUser: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  requestStaffAccess: (passcode: string) => Promise<boolean>;
  requestAdminAccess: (passcode: string) => Promise<boolean>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProfile = async () => {
    if (auth.currentUser) {
      try {
        const profile = await syncUserProfile(auth.currentUser);
        setUserProfile(profile);
      } catch (e) {
        console.error('Failed to sync user profile:', e);
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsLoading(true);
      setCurrentUser(user);
      if (user) {
        try {
          const profile = await syncUserProfile(user);
          setUserProfile(profile);
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      } else {
        setUserProfile(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleRegister = async (name: string, email: string, pass: string) => {
    const profile = await registerWithEmail(name, email, pass);
    setUserProfile(profile);
    return profile;
  };

  const handleLogin = async (email: string, pass: string) => {
    const profile = await loginWithEmail(email, pass);
    setUserProfile(profile);
    return profile;
  };

  const handleGoogleSignIn = async () => {
    const profile = await loginWithGoogle();
    setUserProfile(profile);
    return profile;
  };

  const handleSignOut = async () => {
    await logout();
    setUserProfile(null);
    setCurrentUser(null);
  };

  const handleStaffRequest = async (passcode: string): Promise<boolean> => {
    if (!currentUser) return false;
    const success = await verifyStaffPrivilege(currentUser.uid, passcode);
    if (success) {
      await refreshProfile();
    }
    return success;
  };

  const handleAdminRequest = async (passcode: string): Promise<boolean> => {
    if (!currentUser) return false;
    const success = await verifyAdminPrivilege(currentUser.uid, passcode);
    if (success) {
      await refreshProfile();
    }
    return success;
  };

  const role: UserRole = userProfile?.role || 'patient';
  const isAdmin = role === 'admin';
  const isStaff = role === 'staff' || role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        role,
        isAdmin,
        isStaff,
        isLoading,
        register: handleRegister,
        login: handleLogin,
        signInGoogle: handleGoogleSignIn,
        signOutUser: handleSignOut,
        resetPassword: sendPasswordReset,
        requestStaffAccess: handleStaffRequest,
        requestAdminAccess: handleAdminRequest,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
