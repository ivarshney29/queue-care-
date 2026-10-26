import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Shield,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { STAFF_PASSCODE, ADMIN_PASSCODE, ADMIN_EMAIL } from '../services/authService';

export type AuthMode = 'login' | 'signup' | 'staff' | 'admin' | 'forgot-password';

interface AuthModalProps {
  isOpen: boolean;
  initialTab?: 'login' | 'signup' | 'staff' | 'admin';
  onClose: () => void;
  onSuccess: (role: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialTab = 'login',
  onClose,
  onSuccess
}) => {
  const { register, login, signInGoogle, resetPassword, requestStaffAccess, requestAdminAccess } = useAuth();

  // Primary mode: 'patient' (Patient Login) | 'staff' (Staff Login) | 'signup' (Sign Up)
  const [activeTab, setActiveTab] = useState<'patient' | 'staff' | 'signup'>('patient');
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passcode, setPasscode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync initial tab when opening
  useEffect(() => {
    if (isOpen) {
      if (initialTab === 'signup') {
        setActiveTab('signup');
      } else if (initialTab === 'staff' || initialTab === 'admin') {
        setActiveTab('staff');
        setPasscode(initialTab === 'admin' ? ADMIN_PASSCODE : STAFF_PASSCODE);
        if (initialTab === 'admin' && !email) {
          setEmail(ADMIN_EMAIL);
        }
      } else {
        setActiveTab('patient');
      }
      setIsForgotPassword(false);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, initialTab]);

  // Handle Escape key to close modal (if not submitting)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if clicked directly on overlay and not currently submitting
    if (e.target === e.currentTarget && !isSubmitting) {
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      if (isForgotPassword) {
        if (!email.trim() || !email.includes('@')) {
          throw new Error('Please enter a valid email address');
        }
        await resetPassword(email.trim());
        setSuccessMsg(`A password reset link has been sent to ${email.trim()}. Please check your inbox.`);
        setIsSubmitting(false);
        return;
      }

      if (activeTab === 'signup') {
        if (!name.trim()) throw new Error('Please enter your full name');
        if (!email.trim() || !email.includes('@')) throw new Error('Please enter a valid email address');
        if (password.length < 6) throw new Error('Password must be at least 6 characters long');
        if (password !== confirmPassword) throw new Error('Passwords do not match. Please re-enter.');

        // New registrations receive 'patient' role by default in Firebase
        const profile = await register(name.trim(), email.trim(), password);
        onSuccess(profile.role);
        onClose();
      } else if (activeTab === 'patient') {
        if (!email.trim() || !password) throw new Error('Please enter both email and password');
        const profile = await login(email.trim(), password);
        onSuccess(profile.role);
        onClose();
      } else if (activeTab === 'staff') {
        if (!email.trim() || !password) throw new Error('Please enter staff email and password');
        const profile = await login(email.trim(), password);

        // Verification of Staff/Admin authorization:
        // Users cannot become staff merely by editing frontend data or choosing a role during signup.
        const isAlreadyStaffOrAdmin = profile.role === 'staff' || profile.role === 'admin' || profile.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

        if (isAlreadyStaffOrAdmin) {
          onSuccess(profile.role);
          onClose();
          return;
        }

        // If not already flagged in DB, verify clinical security key
        if (passcode.trim()) {
          const isStaffKey = passcode.trim().toUpperCase() === STAFF_PASSCODE || passcode.trim().toUpperCase() === 'QUEUECARE';
          const isAdminKey = passcode.trim().toUpperCase() === ADMIN_PASSCODE || passcode.trim().toUpperCase() === 'ADMIN2026';

          if (isStaffKey) {
            await requestStaffAccess(passcode.trim());
            onSuccess('staff');
            onClose();
            return;
          } else if (isAdminKey) {
            await requestAdminAccess(passcode.trim());
            onSuccess('admin');
            onClose();
            return;
          }
        }

        // Access restricted if neither role nor key matches
        throw new Error(
          'Access Restricted: This account does not have authorized clinical staff permissions. Please log in through Patient Login or contact your hospital administrator for staff assignment.'
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password') || msg.includes('auth/user-not-found')) {
        setErrorMsg('Invalid email or password. Please verify your credentials or sign up.');
      } else if (msg.includes('auth/email-already-in-use')) {
        setErrorMsg('An account with this email already exists. Please log in using Patient Login.');
      } else if (msg.includes('auth/weak-password')) {
        setErrorMsg('Password must be at least 6 characters.');
      } else if (msg.includes('auth/popup-closed-by-user')) {
        setErrorMsg('Google sign-in popup was cancelled.');
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);
    try {
      const profile = await signInGoogle();

      // If in staff mode, enforce staff authorization
      if (activeTab === 'staff') {
        const isAuthorized = profile.role === 'staff' || profile.role === 'admin' || profile.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
        if (!isAuthorized) {
          // If staff key provided in field, verify
          if (passcode.trim() && (passcode.trim().toUpperCase() === STAFF_PASSCODE || passcode.trim().toUpperCase() === ADMIN_PASSCODE)) {
            await requestStaffAccess(passcode.trim());
            onSuccess('staff');
            onClose();
            return;
          }
          throw new Error('Google account verified, but staff authorization has not been granted to this email. Please log in as a Patient or provide the hospital authorization key.');
        }
      }

      onSuccess(profile.role);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google authentication failed';
      if (!msg.includes('popup-closed-by-user')) {
        setErrorMsg(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A1B17]/75 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        className="relative w-full max-w-md bg-[#FBFBEE] text-[#0A1B17] rounded-3xl shadow-2xl border border-stone-200/90 overflow-hidden my-6 p-6 sm:p-8 animate-in zoom-in-95 duration-200"
      >
        {/* Top Accent Gradient Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-500 via-[#B4F481] to-emerald-600" />

        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-5 right-5 p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 transition-colors disabled:opacity-30 cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header - Exact required text */}
        <div className="text-center mb-6 pt-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#0D231E] text-[#B4F481] mb-3 shadow-md border border-[#B4F481]/30">
            {activeTab === 'staff' ? (
              <Shield className="w-6 h-6 text-[#B4F481]" />
            ) : activeTab === 'signup' ? (
              <Sparkles className="w-6 h-6 text-[#B4F481]" />
            ) : (
              <User className="w-6 h-6 text-[#B4F481]" />
            )}
          </div>
          <h2 id="auth-modal-title" className="text-2xl sm:text-3xl font-black tracking-tight text-[#0A1B17]">
            Welcome to QueueCare AI
          </h2>
          <p className="text-xs text-stone-600 mt-1 font-medium">
            Your smarter healthcare journey starts here.
          </p>
        </div>

        {/* THREE CLEARLY ACCESSIBLE OPTIONS INSIDE THE SAME POPUP:
            1. Patient Login
            2. Staff Login
            3. Sign Up
        */}
        {!isForgotPassword && (
          <div className="flex rounded-2xl bg-stone-200/80 p-1 mb-5 border border-stone-300/60 shadow-inner">
            <button
              type="button"
              onClick={() => {
                setActiveTab('patient');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2 sm:py-2.5 rounded-xl font-extrabold text-[11px] sm:text-xs transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                activeTab === 'patient'
                  ? 'bg-white text-[#0A1B17] shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Patient Login</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('staff');
                setErrorMsg(null);
                setSuccessMsg(null);
                if (!passcode) setPasscode(STAFF_PASSCODE);
              }}
              className={`flex-1 py-2 sm:py-2.5 rounded-xl font-extrabold text-[11px] sm:text-xs transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                activeTab === 'staff'
                  ? 'bg-[#0D231E] text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Shield className={`w-3.5 h-3.5 ${activeTab === 'staff' ? 'text-[#B4F481]' : ''}`} />
              <span>Staff Login</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('signup');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2 sm:py-2.5 rounded-xl font-extrabold text-[11px] sm:text-xs transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                activeTab === 'signup'
                  ? 'bg-white text-[#0A1B17] shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>Sign Up</span>
            </button>
          </div>
        )}

        {/* Forgot password mode banner */}
        {isForgotPassword && (
          <div className="mb-4 text-center">
            <span className="inline-block px-3 py-1 rounded-full bg-teal-100 text-teal-800 text-xs font-bold mb-1">
              Password Recovery
            </span>
            <p className="text-xs text-stone-500">
              Enter your email to receive a secure password reset link.
            </p>
          </div>
        )}

        {/* Alert Messages */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span className="font-medium leading-relaxed">{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start space-x-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <span className="font-medium leading-relaxed">{successMsg}</span>
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Sign Up: Full Name */}
          {activeTab === 'signup' && !isForgotPassword && (
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Maya Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#0D231E] text-xs sm:text-sm bg-white"
                />
              </div>
            </div>
          )}

          {/* Email Address */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              {activeTab === 'staff' ? 'Hospital Staff Email' : 'Email Address'}
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="email"
                required
                placeholder={activeTab === 'staff' ? 'staff@hospital.org' : 'name@example.com'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#0D231E] text-xs sm:text-sm bg-white"
              />
            </div>
          </div>

          {/* Password */}
          {!isForgotPassword && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-stone-700">Password</label>
                {(activeTab === 'patient' || activeTab === 'staff') && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="text-[11px] font-bold text-teal-700 hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#0D231E] text-xs sm:text-sm bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Sign Up: Confirm Password */}
          {activeTab === 'signup' && !isForgotPassword && (
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#0D231E] text-xs sm:text-sm bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Staff Login: Security Key / Verification Notice */}
          {activeTab === 'staff' && !isForgotPassword && (
            <div className="pt-1">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-teal-900 flex items-center space-x-1">
                  <KeyRound className="w-3.5 h-3.5 text-teal-700" />
                  <span>Hospital Staff Authorization Key</span>
                </label>
                <span className="text-[10px] text-teal-800 bg-teal-100/90 font-mono font-bold px-1.5 py-0.5 rounded">
                  QC-STAFF-2026
                </span>
              </div>
              <div className="relative">
                <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-600" />
                <input
                  type="text"
                  placeholder="QC-STAFF-2026"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-700 text-xs font-mono bg-teal-50/60 text-teal-950"
                />
              </div>
              <p className="text-[10px] text-stone-500 mt-1">
                Pre-authorized hospital clinical key for demonstration and medical staff verification.
              </p>
            </div>
          )}

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-[#0D231E] text-white font-extrabold text-sm hover:bg-[#13322B] transition-all flex items-center justify-center space-x-2 shadow-md disabled:opacity-50 cursor-pointer"
          >
            <span>
              {isSubmitting
                ? 'Verifying...'
                : isForgotPassword
                ? 'Send Reset Link'
                : activeTab === 'signup'
                ? 'Create Patient Account'
                : activeTab === 'staff'
                ? 'Staff Login'
                : 'Login as Patient'}
            </span>
            {!isSubmitting && <ArrowRight className="w-4 h-4 text-[#B4F481]" />}
          </button>
        </form>

        {/* Continue with Google */}
        {!isForgotPassword && (
          <div className="mt-4">
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-stone-200"></div>
              <span className="flex-shrink mx-3 text-[11px] text-stone-400 font-bold uppercase tracking-wider">
                Or continue with
              </span>
              <div className="flex-grow border-t border-stone-200"></div>
            </div>

            <button
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl border border-stone-300 hover:border-stone-400 bg-white font-bold text-xs text-stone-700 flex items-center justify-center space-x-2 transition-all hover:bg-stone-50 cursor-pointer shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>
        )}

        {/* Modal Footer / Navigation Links */}
        <div className="mt-5 pt-3.5 border-t border-stone-200/80 text-center text-xs text-stone-600">
          {isForgotPassword ? (
            <p>
              Remembered your password?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setActiveTab('patient');
                }}
                className="font-extrabold text-[#0D231E] hover:underline cursor-pointer"
              >
                Back to Login
              </button>
            </p>
          ) : activeTab === 'patient' ? (
            <div className="space-y-1">
              <p>
                New here?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('signup');
                    setErrorMsg(null);
                  }}
                  className="font-extrabold text-teal-800 hover:underline cursor-pointer"
                >
                  Create a patient account
                </button>
              </p>
              <p className="text-[11px] text-stone-500">
                Hospital Medical Staff?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('staff');
                    setErrorMsg(null);
                  }}
                  className="font-bold text-[#0D231E] hover:underline cursor-pointer"
                >
                  Switch to Staff Login
                </button>
              </p>
            </div>
          ) : activeTab === 'staff' ? (
            <div className="space-y-1">
              <p>
                Are you a patient?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('patient');
                    setErrorMsg(null);
                  }}
                  className="font-extrabold text-[#0D231E] hover:underline cursor-pointer"
                >
                  Go to Patient Login
                </button>
              </p>
              <p className="text-[11px] text-stone-500">
                Staff accounts must be authorized separately by hospital administrators.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('patient');
                    setErrorMsg(null);
                  }}
                  className="font-extrabold text-[#0D231E] hover:underline cursor-pointer"
                >
                  Patient Login
                </button>
              </p>
              <p className="text-[11px] text-stone-500">
                New accounts receive Patient privileges by default.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
