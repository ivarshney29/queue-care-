import React from 'react';
import {
  ArrowRight,
  Shield,
  Activity,
  Clock,
  Sparkles,
  Zap,
  Users,
  CheckCircle2,
  Calendar,
  Layers,
  HeartPulse,
  Monitor,
  ChevronRight
} from 'lucide-react';
import { HeroVisual } from '../components/HeroVisual';
import { DEPARTMENT_DEFAULTS } from '../utils/waitingTimeEngine';

interface LandingPageProps {
  onOpenAuth: (view: 'login' | 'signup' | 'staff' | 'admin') => void;
  onLaunchDashboard: () => void;
  onOpenDisplayMode?: () => void;
  isAuthenticated: boolean;
  userRole?: string;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenAuth,
  onLaunchDashboard,
  onOpenDisplayMode,
  isAuthenticated,
  userRole
}) => {
  const scrollToFeatures = () => {
    document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToHowItWorks = () => {
    document.getElementById('how-it-works-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#FBFBEE] text-[#0A1B17] pt-24 pb-16 overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none opacity-60">
        <div className="absolute top-12 left-1/4 w-96 h-96 bg-[#B4F481]/20 rounded-full blur-3xl" />
        <div className="absolute top-24 right-1/4 w-96 h-96 bg-teal-200/20 rounded-full blur-3xl" />
      </div>

      {/* HERO SECTION */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 text-center pt-6 pb-12 sm:pb-20">
        {/* Top Tagline Pill */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/80 border border-stone-200 shadow-sm text-xs font-bold text-stone-700 mb-8 backdrop-blur-md">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Next-Generation Clinical Queue Intelligence</span>
          <span className="text-stone-300">•</span>
          <span className="text-teal-700 font-extrabold">QueueCare AI</span>
        </div>

        {/* Oversized Typography Headline */}
        <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight leading-[1.05] text-[#0A1B17] mb-6">
          Healthcare,
          <br />
          <span className="bg-gradient-to-r from-[#0D231E] via-teal-900 to-[#134E4A] bg-clip-text text-transparent">
            Without the Wait.
          </span>
        </h1>

        {/* Supporting text exactly matching prompt requirement */}
        <p className="max-w-3xl mx-auto text-base sm:text-lg text-stone-600 font-normal leading-relaxed mb-10">
          Smart tokens. Real-time queue updates. Intelligent waiting-time estimates. A smoother hospital experience for everyone.
        </p>

        {/* Hero CTA Button Group */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mb-8">
          {isAuthenticated ? (
            <button
              onClick={onLaunchDashboard}
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-[#B4F481] text-[#0A1B17] font-extrabold text-base hover:bg-[#a5f06b] transition-all shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 active:scale-95 cursor-pointer"
            >
              <span>
                Launch {userRole === 'admin' ? 'Admin' : userRole === 'staff' ? 'Staff' : 'Patient'} Dashboard
              </span>
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <>
              {/* Primary CTA: Get Started -> opens popup modal with Sign Up tab */}
              <button
                onClick={() => onOpenAuth('signup')}
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-[#B4F481] text-[#0A1B17] font-extrabold text-base hover:bg-[#a5f06b] transition-all shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 active:scale-95 cursor-pointer"
              >
                <span>Get Started</span>
                <ArrowRight className="w-5 h-5 text-[#0A1B17]" />
              </button>

              {/* Secondary CTA: Explore Features -> scrolls to features */}
              <button
                onClick={scrollToFeatures}
                className="w-full sm:w-auto px-6 py-4 rounded-full bg-white text-stone-800 font-bold text-sm border border-stone-200/90 hover:bg-stone-50 transition-all shadow-sm flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>Explore Features</span>
              </button>

              {/* Patient Login CTA -> opens popup modal with Patient Login tab */}
              <button
                onClick={() => onOpenAuth('login')}
                className="w-full sm:w-auto px-6 py-4 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-900 font-bold text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer border border-stone-200"
              >
                <Users className="w-4 h-4 text-stone-700" />
                <span>Patient Login</span>
              </button>

              {/* Staff Login CTA -> opens popup modal with Staff tab */}
              <button
                onClick={() => onOpenAuth('staff')}
                className="w-full sm:w-auto px-6 py-4 rounded-full bg-teal-950 text-white font-bold text-sm hover:bg-teal-900 transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-sm"
              >
                <Shield className="w-4 h-4 text-[#B4F481]" />
                <span>Staff Login</span>
              </button>
            </>
          )}
        </div>

        {/* Technical Badges */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-semibold text-stone-500">
          <span className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Atomic Concurrency</span>
          </span>
          <span className="text-stone-300">•</span>
          <span className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Priority Triage Radar</span>
          </span>
          <span className="text-stone-300">•</span>
          <span className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Real-time Sync</span>
          </span>
        </div>

        {/* Hero Visual: Floating 3D Cards + Central Flowing Queue Ribbon */}
        <div className="mt-8">
          <HeroVisual />
        </div>
      </section>

      {/* LIVE DEPARTMENT PREVIEW & RECEPTION MONITOR LINK */}
      <section id="live-preview" className="max-w-6xl mx-auto px-4 sm:px-6 my-16">
        <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-sm">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-stone-100 gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <h3 className="text-lg font-extrabold text-[#0A1B17]">Live Hospital Department Status</h3>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">Real-time consultation monitor updated in sub-seconds</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {onOpenDisplayMode && (
                <button
                  onClick={onOpenDisplayMode}
                  className="px-3.5 py-2 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 font-bold text-xs hover:bg-teal-100 transition-colors flex items-center space-x-1.5 cursor-pointer"
                >
                  <Monitor className="w-3.5 h-3.5 text-teal-700" />
                  <span>Reception Display Mode</span>
                </button>
              )}
              <button
                onClick={() => onOpenAuth('signup')}
                className="px-4 py-2 rounded-xl bg-[#0D231E] text-white font-bold text-xs hover:bg-[#13322B] transition-colors cursor-pointer"
              >
                Join Queue
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-6">
            {Object.entries(DEPARTMENT_DEFAULTS).map(([name, conf]) => (
              <div
                key={name}
                className="p-3.5 rounded-2xl bg-stone-50/70 border border-stone-200/60 hover:border-teal-400 hover:bg-white transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black font-mono-num px-2 py-0.5 rounded-md bg-stone-200 text-stone-700">
                    {conf.code}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                    Active
                  </span>
                </div>
                <h4 className="text-xs font-extrabold text-[#0A1B17] line-clamp-1 mb-1">{name}</h4>
                <div className="text-[11px] text-stone-500 flex items-center justify-between">
                  <span>Avg: ~{conf.averageMinutes}m</span>
                  <span className="font-semibold text-stone-700">{conf.staffCount} docs</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPACT FEATURE CARDS SECTION */}
      <section id="features-section" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 scroll-mt-24">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-bold mb-3 border border-teal-200/60">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>Intelligent Queuing Suite</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0A1B17]">
            Engineered to eliminate hospital waiting room bottlenecks.
          </h2>
          <p className="text-sm text-stone-600 mt-2">
            Every layer built with clinical throughput, patient dignity, and live synchronization at the core.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Feature 1: Live Queue Tracking */}
          <div className="p-7 rounded-3xl bg-white border border-stone-200/80 shadow-sm hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-2xl bg-teal-100 flex items-center justify-center text-teal-700 mb-5">
              <Activity className="w-6 h-6 stroke-[2.2]" />
            </div>
            <h3 className="text-lg font-bold text-[#0A1B17] mb-2">Live Queue Tracking</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Patients observe their live queue position, numbers ahead, and active room calls in real time without refreshing.
            </p>
          </div>

          {/* Feature 2: Smart Token Generation */}
          <div className="p-7 rounded-3xl bg-white border border-stone-200/80 shadow-sm hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-2xl bg-[#B4F481]/50 flex items-center justify-center text-[#0D231E] mb-5">
              <Zap className="w-6 h-6 stroke-[2.2]" />
            </div>
            <h3 className="text-lg font-bold text-[#0A1B17] mb-2">Smart Token Generation</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Instant department-prefixed token issuance with digital QR code passes and atomic database collision prevention.
            </p>
          </div>

          {/* Feature 3: Waiting-Time Estimation */}
          <div className="p-7 rounded-3xl bg-white border border-stone-200/80 shadow-sm hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700 mb-5">
              <Clock className="w-6 h-6 stroke-[2.2]" />
            </div>
            <h3 className="text-lg font-bold text-[#0A1B17] mb-2">Waiting-Time Estimation</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Transparent prediction engine adjusting for patients ahead, historical consultation times, and active doctors.
            </p>
          </div>

          {/* Feature 4: Priority Management */}
          <div className="p-7 rounded-3xl bg-white border border-stone-200/80 shadow-sm hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-700 mb-5">
              <HeartPulse className="w-6 h-6 stroke-[2.2]" />
            </div>
            <h3 className="text-lg font-bold text-[#0A1B17] mb-2">Priority Management</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Authorized clinical triage allowing hospital staff to escalate urgent cases with full audit traceability.
            </p>
          </div>

          {/* Feature 5: Real-Time Updates */}
          <div className="p-7 rounded-3xl bg-white border border-stone-200/80 shadow-sm hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-700 mb-5">
              <Layers className="w-6 h-6 stroke-[2.2]" />
            </div>
            <h3 className="text-lg font-bold text-[#0A1B17] mb-2">Real-Time Updates</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Instant device push alerts and harmonic audio call chimes when your token moves from Waiting to Called.
            </p>
          </div>

          {/* Feature 6: Hospital Staff Queue Controls */}
          <div className="p-7 rounded-3xl bg-white border border-stone-200/80 shadow-sm hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-2xl bg-[#0D231E] flex items-center justify-center text-[#B4F481] mb-5">
              <Shield className="w-6 h-6 stroke-[2.2]" />
            </div>
            <h3 className="text-lg font-bold text-[#0A1B17] mb-2">Staff Queue Controls</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              One-click patient calling, consultation timers, walk-in registration, and full reception display mode.
            </p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section id="how-it-works-section" className="max-w-5xl mx-auto px-4 sm:px-6 py-16 scroll-mt-24">
        <div className="text-center max-w-xl mx-auto mb-14">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-stone-100 text-stone-700 text-xs font-bold mb-3">
            <span>Seamless Patient Journey</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0A1B17]">
            How QueueCare AI Works
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-2">
            A frictionless three-step flow connecting patient arrival with clinical care.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          <div className="bg-white p-7 rounded-3xl border border-stone-200/80 shadow-sm relative">
            <div className="w-10 h-10 rounded-xl bg-[#0D231E] text-[#B4F481] font-mono-num font-black flex items-center justify-center text-base mb-4 shadow">
              01
            </div>
            <h3 className="text-base font-extrabold text-[#0A1B17] mb-2">Register & Receive Token</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Select department, enter details, and receive your digital ticket with unique sequential token and QR pass.
            </p>
          </div>

          <div className="bg-white p-7 rounded-3xl border border-stone-200/80 shadow-sm relative">
            <div className="w-10 h-10 rounded-xl bg-[#0D231E] text-[#B4F481] font-mono-num font-black flex items-center justify-center text-base mb-4 shadow">
              02
            </div>
            <h3 className="text-base font-extrabold text-[#0A1B17] mb-2">Track Position & Wait Time</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Watch real-time countdown, live count of patients ahead, and dynamic wait times calculated per department.
            </p>
          </div>

          <div className="bg-white p-7 rounded-3xl border border-stone-200/80 shadow-sm relative">
            <div className="w-10 h-10 rounded-xl bg-[#0D231E] text-[#B4F481] font-mono-num font-black flex items-center justify-center text-base mb-4 shadow">
              03
            </div>
            <h3 className="text-base font-extrabold text-[#0A1B17] mb-2">Get Called When Ready</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Receive clear audio and visual call prompts with your assigned consultation room and attending doctor name.
            </p>
          </div>
        </div>
      </section>

      {/* FINAL CTA BANNER */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 my-16">
        <div className="relative rounded-3xl bg-[#0D231E] text-white p-8 sm:p-14 overflow-hidden shadow-2xl border border-white/10 text-center">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-[#B4F481]/15 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 max-w-2xl mx-auto">
            <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-[#B4F481] text-xs font-bold mb-4">
              Modern Hospital Queue Automation
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-4">
              A Better Queue Starts Here.
            </h2>
            <p className="text-sm text-stone-300 mb-8 leading-relaxed">
              Empower your clinical staff with automated triage and provide patients with the predictability they deserve.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => onOpenAuth('signup')}
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-[#B4F481] text-[#0A1B17] font-extrabold text-sm hover:bg-[#a6ec70] transition-all shadow-lg flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onOpenAuth('login')}
                className="w-full sm:w-auto px-6 py-4 rounded-full bg-white/10 text-white font-bold text-sm hover:bg-white/20 transition-all border border-white/20 cursor-pointer"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 border-t border-stone-200/70 text-xs text-stone-500">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#0D231E] flex items-center justify-center text-[#B4F481]">
              <Activity className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <p className="font-extrabold text-stone-900 text-sm">QueueCare AI</p>
              <p className="text-[11px] text-stone-400">Smart Patient Queue Management System</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 font-semibold">
            <button onClick={() => onOpenAuth('login')} className="hover:text-stone-900 transition-colors cursor-pointer">
              Patient Login
            </button>
            <button onClick={() => onOpenAuth('staff')} className="hover:text-stone-900 transition-colors cursor-pointer">
              Staff Login
            </button>
            <button onClick={() => onOpenAuth('signup')} className="hover:text-stone-900 transition-colors cursor-pointer">
              Sign Up
            </button>
            {onOpenDisplayMode && (
              <button onClick={onOpenDisplayMode} className="hover:text-stone-900 transition-colors text-teal-800 cursor-pointer">
                Hospital Display
              </button>
            )}
            <span className="hover:text-stone-900 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-stone-900 cursor-pointer">Terms of Use</span>
          </div>
        </div>

        <div className="pt-6 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-stone-400 gap-2">
          <p>© {new Date().getFullYear()} QueueCare AI. Healthcare, Without the Wait. All rights reserved.</p>
          <p className="flex items-center space-x-1">
            <span>Powered by Firebase Enterprise Firestore & Real-Time Sync</span>
          </p>
        </div>
      </footer>
    </div>
  );
};
