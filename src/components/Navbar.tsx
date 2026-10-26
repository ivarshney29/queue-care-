import React, { useState } from 'react';
import { Activity, Shield, ShieldCheck, ArrowRight, User as UserIcon, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  onOpenAuth: (view: 'login' | 'signup' | 'staff' | 'admin') => void;
  onNavigateDashboard: () => void;
  onScrollToFeatures?: () => void;
  onScrollToHowItWorks?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAuth,
  onNavigateDashboard,
  onScrollToFeatures,
  onScrollToHowItWorks
}) => {
  const { currentUser, userProfile, role, isAdmin, signOutUser } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-[#FBFBEE]/90 backdrop-blur-md border-b border-stone-200/60 px-4 md:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="w-10 h-10 rounded-xl bg-[#0D231E] flex items-center justify-center text-[#B4F481] shadow-md border border-[#B4F481]/30">
            <Activity className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xl font-extrabold tracking-tight text-[#0A1B17]">
              QueueCare<span className="text-teal-600 font-black">.AI</span>
            </span>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#B4F481]/40 text-[#0D231E] border border-[#B4F481]/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1 animate-pulse" />
              v2.4 Active
            </span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center space-x-7 text-sm font-semibold text-stone-600">
          <button
            onClick={onScrollToFeatures}
            className="hover:text-[#0A1B17] transition-colors cursor-pointer"
          >
            Features
          </button>
          <button
            onClick={onScrollToHowItWorks}
            className="hover:text-[#0A1B17] transition-colors cursor-pointer"
          >
            How It Works
          </button>
          <a
            href="#live-preview"
            className="hover:text-[#0A1B17] transition-colors flex items-center space-x-1"
          >
            <span>Live Monitor</span>
            <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-1.5 py-0.2 rounded">Realtime</span>
          </a>
        </div>

        {/* Right CTA Actions */}
        <div className="hidden md:flex items-center space-x-3.5">
          {currentUser ? (
            <div className="flex items-center space-x-3">
              <button
                onClick={onNavigateDashboard}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#0D231E] text-white font-semibold text-sm hover:bg-[#13322B] transition-all shadow-sm cursor-pointer"
              >
                <span>
                  Launch {isAdmin ? 'Admin Console' : role === 'staff' ? 'Staff Console' : 'Patient Portal'}
                </span>
                <ArrowRight className="w-4 h-4 text-[#B4F481]" />
              </button>
              <div className="flex items-center space-x-2 pl-2 border-l border-stone-200">
                <div className="w-8 h-8 rounded-full bg-[#B4F481]/60 text-[#0D231E] font-bold flex items-center justify-center text-xs">
                  {userProfile?.name?.charAt(0).toUpperCase() || <UserIcon className="w-4 h-4" />}
                </div>
                <button
                  onClick={() => signOutUser()}
                  className="text-xs font-semibold text-stone-500 hover:text-stone-900 cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={() => onOpenAuth('login')}
                className="px-3.5 py-2 text-sm font-semibold text-stone-700 hover:text-stone-950 transition-colors cursor-pointer"
              >
                Patient Login
              </button>

              <button
                onClick={() => onOpenAuth('staff')}
                className="px-3.5 py-2 text-sm font-semibold text-teal-800 hover:text-teal-950 transition-colors flex items-center space-x-1 cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Staff Login</span>
              </button>

              <button
                onClick={() => onOpenAuth('admin')}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors flex items-center space-x-1 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                <span>Admin</span>
              </button>

              <button
                onClick={() => onOpenAuth('signup')}
                className="flex items-center space-x-1.5 px-5 py-2.5 rounded-full bg-[#B4F481] text-[#0A1B17] font-bold text-sm hover:bg-[#a6ec70] transition-all shadow-sm hover:shadow active:scale-95 cursor-pointer"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-stone-700 hover:bg-stone-200/50"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden pt-4 pb-3 border-t border-stone-200/60 mt-3 space-y-3">
          <div className="flex flex-col space-y-2 text-sm font-semibold px-2">
            <button
              onClick={() => {
                onScrollToFeatures?.();
                setMobileMenuOpen(false);
              }}
              className="text-left py-2 text-stone-700"
            >
              Features
            </button>
            <button
              onClick={() => {
                onScrollToHowItWorks?.();
                setMobileMenuOpen(false);
              }}
              className="text-left py-2 text-stone-700"
            >
              How It Works
            </button>
          </div>

          <div className="pt-2 border-t border-stone-200 flex flex-col space-y-2 px-2">
            {currentUser ? (
              <>
                <button
                  onClick={() => {
                    onNavigateDashboard();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#0D231E] text-white font-bold text-sm text-center"
                >
                  Open {isAdmin ? 'Admin' : role === 'staff' ? 'Staff' : 'Patient'} Console
                </button>
                <button
                  onClick={() => {
                    signOutUser();
                    setMobileMenuOpen(false);
                  }}
                  className="text-sm text-stone-500 py-1.5 text-center"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    onOpenAuth('login');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 rounded-xl bg-white border border-stone-200 font-bold text-sm text-stone-800"
                >
                  Patient Login
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      onOpenAuth('staff');
                      setMobileMenuOpen(false);
                    }}
                    className="py-2 rounded-xl bg-teal-50 border border-teal-200 font-bold text-xs text-teal-800 text-center"
                  >
                    Staff Portal
                  </button>
                  <button
                    onClick={() => {
                      onOpenAuth('admin');
                      setMobileMenuOpen(false);
                    }}
                    className="py-2 rounded-xl bg-stone-100 border border-stone-300 font-bold text-xs text-stone-800 text-center"
                  >
                    Admin Console
                  </button>
                </div>
                <button
                  onClick={() => {
                    onOpenAuth('signup');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#B4F481] text-[#0A1B17] font-bold text-sm"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
