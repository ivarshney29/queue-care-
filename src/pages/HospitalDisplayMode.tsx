import React, { useState, useEffect } from 'react';
import {
  Monitor,
  Maximize2,
  Minimize2,
  Volume2,
  Clock,
  Activity,
  ArrowLeft,
  RefreshCw,
  Building2,
  CheckCircle2
} from 'lucide-react';
import { PatientToken, Department } from '../types';
import { subscribeToAllPatients } from '../services/queueService';
import { subscribeToDepartments } from '../services/adminService';

interface HospitalDisplayModeProps {
  onExit: () => void;
}

export const HospitalDisplayMode: React.FC<HospitalDisplayModeProps> = ({ onExit }) => {
  const [patients, setPatients] = useState<PatientToken[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Live Clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }));
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // Real-time subscriptions
  useEffect(() => {
    const unsubPatients = subscribeToAllPatients((all) => {
      setPatients(all);
    });

    const unsubDepts = subscribeToDepartments((depts) => {
      setDepartments(depts);
    });

    return () => {
      unsubPatients();
      unsubDepts();
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Filter patients by selected department
  const filteredPatients = selectedDept === 'All'
    ? patients
    : patients.filter((p) => p.department === selectedDept);

  // Currently Serving (Called or In-Consultation)
  const currentlyServing = filteredPatients.filter(
    (p) => p.status === 'called' || p.status === 'in-consultation'
  );

  // Next in Queue (Waiting, sorted by priority then arrival)
  const nextInQueue = filteredPatients
    .filter((p) => p.status === 'waiting')
    .sort((a, b) => {
      const pWeight = { urgent: 3, moderate: 2, routine: 1 };
      const diff = (pWeight[b.priority || 'routine'] || 1) - (pWeight[a.priority || 'routine'] || 1);
      if (diff !== 0) return diff;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    })
    .slice(0, 8);

  return (
    <div className="min-h-screen bg-[#071310] text-white flex flex-col justify-between p-4 sm:p-8 select-none overflow-x-hidden">
      {/* TOP HEADER BAR */}
      <header className="flex flex-col sm:flex-row items-center justify-between pb-6 border-b border-white/10 gap-4">
        {/* Brand & Mode */}
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-[#B4F481] text-[#071310] flex items-center justify-center font-black shadow-lg">
            <Activity className="w-7 h-7 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                QueueCare AI
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-[#B4F481] border border-[#B4F481]/40 text-xs font-bold uppercase tracking-wider">
                Waiting Room Live Display
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              Outpatient Department Call Monitor • Real-time Synchronization
            </p>
          </div>
        </div>

        {/* Live Clock & Fullscreen Controls */}
        <div className="flex items-center space-x-4">
          {/* Department Filter for Waiting Room */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-white/10 border border-white/20 text-xs font-bold text-white focus:outline-none cursor-pointer"
          >
            <option value="All" className="bg-[#071310]">All Departments</option>
            {departments.map((d) => (
              <option key={d.departmentId} value={d.name} className="bg-[#071310]">
                {d.name}
              </option>
            ))}
          </select>

          {/* Clock Display */}
          <div className="text-right hidden sm:block">
            <p className="text-xl font-black font-mono-num text-[#B4F481]">{currentTime}</p>
            <p className="text-[11px] text-stone-400 font-medium">{currentDate}</p>
          </div>

          {/* Fullscreen & Exit */}
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleFullscreen}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <button
              onClick={onExit}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-rose-900/60 text-stone-300 hover:text-white text-xs font-bold transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Exit Display</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN TWO-COLUMN DISPLAY LAYOUT */}
      <main className="my-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: CURRENTLY SERVING (HERO LARGE CARDS) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2.5">
              <span className="w-3 h-3 rounded-full bg-[#B4F481] animate-ping" />
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide uppercase">
                Now Serving
              </h2>
            </div>
            <span className="text-xs font-bold text-stone-400">
              {currentlyServing.length} Station{currentlyServing.length === 1 ? '' : 's'} Active
            </span>
          </div>

          {currentlyServing.length === 0 ? (
            <div className="rounded-3xl bg-white/5 border border-white/10 p-12 text-center">
              <Clock className="w-12 h-12 text-stone-500 mx-auto mb-3 animate-pulse" />
              <h3 className="text-xl font-bold text-white mb-1">Consultation Desks Ready</h3>
              <p className="text-xs text-stone-400">Next patients will appear momentarily as called by doctors.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {currentlyServing.map((item) => (
                <div
                  key={item.patientId}
                  className="rounded-3xl bg-gradient-to-br from-[#0D231E] to-[#12362E] p-6 sm:p-8 border-2 border-[#B4F481]/40 shadow-2xl relative overflow-hidden animate-pulse-glow"
                >
                  <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-[#B4F481]/15 rounded-full blur-xl pointer-events-none" />

                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold uppercase tracking-widest text-[#B4F481]">
                      {item.department}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white animate-pulse">
                      {item.status === 'called' ? 'CALLED' : 'IN SESSION'}
                    </span>
                  </div>

                  <div className="text-5xl sm:text-7xl font-black font-mono-num text-white tracking-tight mb-4">
                    #{item.tokenNumber}
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-stone-400">Proceed To</p>
                      <p className="text-sm sm:text-base font-extrabold text-[#B4F481] mt-0.5">
                        {item.counterOrRoom || 'Consultation Room 1'}
                      </p>
                    </div>
                    <span className="text-xs text-stone-400 font-mono">
                      {item.arrivalTime}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: NEXT UP IN QUEUE (TABLE / GRID OF TOKENS) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide uppercase">
              Next Tokens
            </h2>
            <span className="text-xs font-bold text-stone-400">
              {nextInQueue.length} Patient{nextInQueue.length === 1 ? '' : 's'} Waiting
            </span>
          </div>

          <div className="rounded-3xl bg-white/5 border border-white/10 p-5 divide-y divide-white/10">
            {nextInQueue.length === 0 ? (
              <p className="py-8 text-center text-xs text-stone-400">
                No patients currently waiting in line.
              </p>
            ) : (
              nextInQueue.map((item, idx) => (
                <div key={item.patientId} className="py-3.5 flex items-center justify-between first:pt-0 last:pb-0">
                  <div className="flex items-center space-x-3.5">
                    <span className="w-7 h-7 rounded-full bg-white/10 text-white font-mono-num font-bold flex items-center justify-center text-xs">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-xl font-black font-mono-num text-white">
                        #{item.tokenNumber}
                      </p>
                      <p className="text-[11px] text-stone-400 font-medium">
                        {item.department}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Est. ~{item.estimatedWaitingMinutes || 10}m
                    </span>
                    <p className="text-[10px] text-stone-400 mt-1 font-mono">
                      Arrived {item.arrivalTime}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* FOOTER TICKER */}
      <footer className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-400 gap-2">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-white">Public Privacy Notice: </span>
          <span>Patient names and confidential health records are protected. Please watch your token number.</span>
        </div>
        <div className="flex items-center space-x-3 text-[11px]">
          <span>Audio Call Prompts Active</span>
          <span>•</span>
          <span className="text-[#B4F481]">QueueCare AI Hospital Display</span>
        </div>
      </footer>
    </div>
  );
};
