import React from 'react';
import { Clock, Users, Activity, ShieldCheck, Sparkles, ChevronRight, CheckCircle2 } from 'lucide-react';

export const HeroVisual: React.FC = () => {
  return (
    <div className="relative w-full max-w-5xl mx-auto min-h-[580px] flex items-center justify-center select-none overflow-visible">
      {/* Central Flowing Queue Ribbon (SVG styled inspired by ribbon flow) */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
        viewBox="0 0 800 650"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="ribbonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0D231E" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#0A1B17" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#134E4A" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="limeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#B4F481" />
            <stop offset="100%" stopColor="#5EEAD4" />
          </linearGradient>
          <filter id="shadowBlur" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#0D231E" floodOpacity="0.12" />
          </filter>
        </defs>

        {/* Outer Ribbon Path */}
        <path
          d="M 400 0 C 405 100, 370 180, 420 280 C 470 380, 380 480, 410 650"
          stroke="#E2E7DA"
          strokeWidth="28"
          strokeLinecap="round"
          strokeDasharray="6 8"
          fill="none"
        />

        {/* Braided / Woven Inner Stream */}
        <path
          d="M 400 0 C 415 110, 365 190, 425 290 C 485 390, 375 490, 405 650"
          stroke="url(#ribbonGrad)"
          strokeWidth="10"
          strokeLinecap="round"
          fill="none"
          filter="url(#shadowBlur)"
        />

        {/* Pulse Flow Accent */}
        <path
          d="M 400 20 C 415 110, 365 190, 425 290 C 485 390, 375 490, 405 650"
          stroke="url(#limeGrad)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray="18 40"
          fill="none"
          className="animate-pulse"
        />

        {/* Queue Node Checkpoints */}
        <circle cx="400" cy="90" r="9" fill="#B4F481" stroke="#0D231E" strokeWidth="4" />
        <circle cx="395" cy="220" r="9" fill="#FFFFFF" stroke="#0D231E" strokeWidth="4" />
        <circle cx="435" cy="340" r="9" fill="#5EEAD4" stroke="#0D231E" strokeWidth="4" />
        <circle cx="395" cy="490" r="9" fill="#B4F481" stroke="#0D231E" strokeWidth="4" />
      </svg>

      {/* Floating Card 1: Top Left - Built to Scale / Live Queue */}
      <div className="absolute -top-4 left-4 md:left-12 lg:left-20 z-10 animate-float-1">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-stone-200/80 flex items-center space-x-3.5 hover:shadow-2xl transition-all duration-300">
          <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center text-violet-700 shadow-inner">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Live Status</span>
            </div>
            <p className="text-sm font-extrabold text-[#0A1B17]">Live Queue — 12 Patients</p>
            <p className="text-[11px] text-stone-400">General OPD & Pediatrics</p>
          </div>
        </div>
      </div>

      {/* Floating Card 2: Top Right - Priority Care */}
      <div className="absolute top-2 right-4 md:right-12 lg:right-24 z-10 animate-float-2">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-stone-200/80 flex items-center space-x-3.5 hover:shadow-2xl transition-all duration-300">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800 shadow-inner">
            <Activity className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Triage Radar</span>
            </div>
            <p className="text-sm font-extrabold text-[#0A1B17]">Priority Care — Active</p>
            <p className="text-[11px] text-stone-400">Emergency auto-escalation</p>
          </div>
        </div>
      </div>

      {/* Floating Card 3: Mid Left - Your Token */}
      <div className="absolute top-1/2 -translate-y-8 left-2 md:left-6 lg:left-14 z-10 animate-float-3">
        <div className="bg-[#0D231E] text-white rounded-2xl p-4.5 shadow-2xl border border-white/10 flex items-center space-x-3.5 hover:border-[#B4F481]/50 transition-all duration-300">
          <div className="w-12 h-12 rounded-xl bg-[#B4F481] flex items-center justify-center text-[#0D231E] font-black text-lg font-mono-num shadow-lg">
            #
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#B4F481] uppercase tracking-wider">Assigned Pass</div>
            <p className="text-base font-extrabold text-white font-mono-num">Token #024</p>
            <p className="text-[11px] text-stone-300">Room 3 • Dr. Mitchell</p>
          </div>
        </div>
      </div>

      {/* Floating Card 4: Mid Right - Estimated Wait */}
      <div className="absolute top-1/2 translate-y-6 right-2 md:right-8 lg:right-16 z-10 animate-float-4">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-stone-200/80 flex items-center space-x-3.5 hover:shadow-2xl transition-all duration-300">
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shadow-inner">
            <Clock className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Wait Time Engine</div>
            <p className="text-sm font-extrabold text-[#0A1B17]">Estimated Wait — 18 min</p>
            <p className="text-[11px] text-emerald-600 font-semibold">2 patients ahead of you</p>
          </div>
        </div>
      </div>

      {/* Floating Card 5: Bottom Left - Queue Status Updating */}
      <div className="absolute bottom-6 left-6 md:left-20 lg:left-32 z-10 animate-float-2">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl px-4 py-3 shadow-lg border border-stone-200/80 flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center text-teal-700">
            <Sparkles className="w-4 h-4 text-teal-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#0A1B17]">Queue Status — Updating</p>
            <p className="text-[10px] text-stone-400">Zero page refresh required</p>
          </div>
        </div>
      </div>

      {/* Floating Card 6: Bottom Right - Mutex / Zero Collisions */}
      <div className="absolute bottom-4 right-4 md:right-16 lg:right-28 z-10 animate-float-1">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl px-4 py-3 shadow-lg border border-stone-200/80 flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#B4F481]/50 flex items-center justify-center text-emerald-900">
            <ShieldCheck className="w-4 h-4 text-emerald-800" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#0A1B17]">Zero Collision Tokens</p>
            <p className="text-[10px] text-stone-400">Atomic ticket numbering</p>
          </div>
        </div>
      </div>
    </div>
  );
};
