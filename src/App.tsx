import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LandingPage } from './pages/LandingPage';
import { PatientDashboard } from './pages/PatientDashboard';
import { StaffDashboard } from './pages/StaffDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { HospitalDisplayMode } from './pages/HospitalDisplayMode';
import { AuthModal } from './components/AuthModal';
import { ToastContainer, ToastMessage } from './components/Toast';

const AppContent: React.FC = () => {
  const { currentUser, role, isAdmin, isStaff, signOutUser, isLoading } = useAuth();

  // Navigation states: 'landing' | 'patient-dashboard' | 'staff-dashboard' | 'admin-dashboard' | 'hospital-display'
  const [currentView, setCurrentView] = useState<'landing' | 'patient-dashboard' | 'staff-dashboard' | 'admin-dashboard' | 'hospital-display'>('landing');

  // Auth modal state: NEVER opened automatically on initial load!
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'signup' | 'staff' | 'admin'>('login');

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (title: string, description?: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, title, description, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleOpenAuth = (tab: 'login' | 'signup' | 'staff' | 'admin') => {
    setAuthModalTab(tab);
    setAuthModalOpen(true);
  };

  const handleAuthSuccess = (userRole: string) => {
    showToast('Signed In', `Welcome to QueueCare AI`, 'success');
    if (userRole === 'admin') {
      setCurrentView('admin-dashboard');
    } else if (userRole === 'staff') {
      setCurrentView('staff-dashboard');
    } else {
      setCurrentView('patient-dashboard');
    }
  };

  const handleLaunchDashboard = () => {
    if (isAdmin) {
      setCurrentView('admin-dashboard');
    } else if (isStaff) {
      setCurrentView('staff-dashboard');
    } else {
      setCurrentView('patient-dashboard');
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
    setCurrentView('landing');
    showToast('Signed Out', 'You have been returned to the public homepage', 'info');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FBFBEE] flex flex-col items-center justify-center text-[#0A1B17]">
        <div className="w-12 h-12 rounded-2xl bg-[#0D231E] flex items-center justify-center text-[#B4F481] mb-4 shadow-lg animate-bounce">
          <span className="text-xl font-black">QC</span>
        </div>
        <p className="text-sm font-bold tracking-tight text-stone-700">Connecting to QueueCare AI...</p>
        <span className="text-xs text-stone-400 mt-1">Verifying encrypted session</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFBEE] text-[#0A1B17]">
      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Auth Modal with side-by-side Login | Sign Up tabs */}
      <AuthModal
        isOpen={authModalOpen}
        initialTab={authModalTab}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Conditional View Routing */}
      {currentView === 'landing' && (
        <>
          <Navbar
            onOpenAuth={handleOpenAuth}
            onNavigateDashboard={handleLaunchDashboard}
            onScrollToFeatures={() => {
              document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
            onScrollToHowItWorks={() => {
              document.getElementById('how-it-works-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
          />
          <LandingPage
            onOpenAuth={handleOpenAuth}
            onLaunchDashboard={handleLaunchDashboard}
            onOpenDisplayMode={() => setCurrentView('hospital-display')}
            isAuthenticated={!!currentUser}
            userRole={role}
          />
        </>
      )}

      {currentView === 'hospital-display' && (
        <HospitalDisplayMode onExit={() => setCurrentView('landing')} />
      )}

      {currentView === 'patient-dashboard' && (
        currentUser ? (
          <PatientDashboard
            onSignOut={handleSignOut}
            onOpenDisplayMode={() => setCurrentView('hospital-display')}
            onShowToast={showToast}
          />
        ) : (
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="text-center bg-white p-8 rounded-3xl border border-stone-200 shadow-xl max-w-md">
              <h3 className="text-lg font-black text-[#0A1B17] mb-2">Patient Authentication Required</h3>
              <p className="text-xs text-stone-500 mb-6">
                Please sign in to access your digital token passes, wait time radar, and live position.
              </p>
              <div className="flex items-center justify-center space-x-3">
                <button
                  onClick={() => setCurrentView('landing')}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-bold text-xs"
                >
                  Return to Home
                </button>
                <button
                  onClick={() => handleOpenAuth('login')}
                  className="px-6 py-2.5 rounded-xl bg-[#0D231E] text-white font-bold text-xs shadow"
                >
                  Sign In
                </button>
              </div>
            </div>
          </div>
        )
      )}

      {currentView === 'staff-dashboard' && (
        currentUser && isStaff ? (
          <StaffDashboard
            onSignOut={handleSignOut}
            onNavigateAdmin={() => setCurrentView('admin-dashboard')}
            onOpenDisplayMode={() => setCurrentView('hospital-display')}
            onShowToast={showToast}
          />
        ) : (
          <div className="min-h-screen flex items-center justify-center p-4 text-center">
            <div className="max-w-md bg-white p-8 rounded-3xl border border-stone-200 shadow-xl">
              <h3 className="text-lg font-black text-rose-700 mb-2">Staff Authorization Required</h3>
              <p className="text-xs text-stone-600 mb-6 leading-relaxed">
                You must be an authorized medical officer or hospital staff member to access the Clinical Command Console.
              </p>
              <div className="flex items-center justify-center space-x-3">
                <button
                  onClick={() => setCurrentView('landing')}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-xs font-bold text-stone-600"
                >
                  Return to Home
                </button>
                <button
                  onClick={() => handleOpenAuth('staff')}
                  className="px-5 py-2 rounded-xl bg-[#0D231E] text-white text-xs font-bold"
                >
                  Enter Staff Portal
                </button>
              </div>
            </div>
          </div>
        )
      )}

      {currentView === 'admin-dashboard' && (
        currentUser && isAdmin ? (
          <AdminDashboard
            onSignOut={handleSignOut}
            onNavigateStaff={() => setCurrentView('staff-dashboard')}
            onShowToast={showToast}
          />
        ) : (
          <div className="min-h-screen flex items-center justify-center p-4 text-center">
            <div className="max-w-md bg-white p-8 rounded-3xl border border-stone-200 shadow-xl">
              <h3 className="text-lg font-black text-rose-700 mb-2">Administrator Access Required</h3>
              <p className="text-xs text-stone-600 mb-6 leading-relaxed">
                The Administrative Configuration Panel is restricted to system administrators with overarching governance privileges.
              </p>
              <div className="flex items-center justify-center space-x-3">
                <button
                  onClick={() => setCurrentView('landing')}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-xs font-bold text-stone-600"
                >
                  Return to Home
                </button>
                <button
                  onClick={() => handleOpenAuth('admin')}
                  className="px-5 py-2 rounded-xl bg-[#0D231E] text-white text-xs font-bold"
                >
                  Admin Login
                </button>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
