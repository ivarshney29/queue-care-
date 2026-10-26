import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Clock,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  PhoneCall,
  Play,
  Check,
  XCircle,
  Plus,
  RefreshCw,
  LogOut,
  Building,
  Shield,
  ArrowUpDown,
  Stethoscope,
  ChevronDown,
  Settings,
  Monitor
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PatientToken, PriorityLevel, QueueStatus, Department } from '../types';
import {
  subscribeToAllPatients,
  callPatient,
  startConsultation,
  completeConsultation,
  updatePatientPriority,
  cancelToken,
  generateNewToken,
  seedDemoQueueIfEmpty
} from '../services/queueService';
import { subscribeToDepartments } from '../services/adminService';
import { DEPARTMENT_DEFAULTS } from '../utils/waitingTimeEngine';

interface StaffDashboardProps {
  onSignOut: () => void;
  onNavigateAdmin?: () => void;
  onOpenDisplayMode?: () => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({
  onSignOut,
  onNavigateAdmin,
  onOpenDisplayMode,
  onShowToast
}) => {
  const { userProfile, currentUser, isAdmin } = useAuth();

  const [patients, setPatients] = useState<PatientToken[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All');
  const [selectedPriority, setSelectedPriority] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'arrival' | 'priority'>('arrival');

  // Modals & Action States
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [priorityModalPatient, setPriorityModalPatient] = useState<PatientToken | null>(null);

  // Walk-in form state
  const [walkinName, setWalkinName] = useState('');
  const [walkinAge, setWalkinAge] = useState(35);
  const [walkinDept, setWalkinDept] = useState('General Medicine');
  const [walkinPriority, setWalkinPriority] = useState<PriorityLevel>('routine');
  const [walkinNotes, setWalkinNotes] = useState('');

  // Priority change state
  const [newPriority, setNewPriority] = useState<PriorityLevel>('routine');
  const [priorityReason, setPriorityReason] = useState('Staff clinical evaluation');

  // Real-time Firestore subscriptions
  useEffect(() => {
    setIsLoading(true);
    const unsubscribePatients = subscribeToAllPatients((data) => {
      setPatients(data);
      setIsLoading(false);
    });

    const unsubscribeDepts = subscribeToDepartments((depts) => {
      setDepartments(depts);
      if (depts.length > 0 && !walkinDept) {
        setWalkinDept(depts[0].name);
      }
    });

    return () => {
      unsubscribePatients();
      unsubscribeDepts();
    };
  }, []);

  // Compute metrics dynamically from database
  const metrics = useMemo(() => {
    const totalRegistered = patients.length;
    const waitingPatients = patients.filter((p) => p.status === 'waiting');
    const inConsultation = patients.filter((p) => p.status === 'in-consultation');
    const completed = patients.filter((p) => p.status === 'completed');
    const urgent = patients.filter((p) => p.priority === 'urgent' && p.status !== 'completed' && p.status !== 'cancelled');

    const totalWait = waitingPatients.reduce((sum, p) => sum + (p.estimatedWaitingMinutes || 12), 0);
    const averageWaitTime = waitingPatients.length > 0 ? Math.round(totalWait / waitingPatients.length) : 10;

    return {
      totalRegistered,
      waitingCount: waitingPatients.length,
      inConsultationCount: inConsultation.length,
      completedCount: completed.length,
      urgentCount: urgent.length,
      averageWaitTime
    };
  }, [patients]);

  // Filtered and sorted patients
  const filteredPatients = useMemo(() => {
    let result = [...patients];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.patientName.toLowerCase().includes(q) ||
          p.tokenNumber.toLowerCase().includes(q)
      );
    }

    if (selectedDepartment !== 'All') {
      result = result.filter((p) => p.department === selectedDepartment);
    }

    if (selectedPriority !== 'All') {
      result = result.filter((p) => p.priority === selectedPriority);
    }

    if (selectedStatus !== 'All') {
      result = result.filter((p) => p.status === selectedStatus);
    }

    // Sort
    if (sortBy === 'priority') {
      const priorityWeights: Record<PriorityLevel, number> = {
        urgent: 3,
        moderate: 2,
        routine: 1
      };
      result.sort((a, b) => {
        const pA = priorityWeights[a.priority || 'routine'];
        const pB = priorityWeights[b.priority || 'routine'];
        if (pB !== pA) return pB - pA;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
    } else {
      // By arrival time
      result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }

    return result;
  }, [patients, searchQuery, selectedDepartment, selectedPriority, selectedStatus, sortBy]);

  // Action Handlers
  const handleCallNext = async (patient: PatientToken) => {
    setActionInProgress(patient.patientId);
    try {
      await callPatient(
        patient.patientId,
        userProfile?.name || 'Duty Medical Officer',
        'Consultation Room 1'
      );
      onShowToast('Patient Called', `Token #${patient.tokenNumber} notified to report`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to call patient';
      onShowToast('Action Error', msg, 'error');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleStartConsultation = async (patient: PatientToken) => {
    setActionInProgress(patient.patientId);
    try {
      await startConsultation(patient.patientId);
      onShowToast('Consultation Started', `Now consulting #${patient.tokenNumber}`, 'info');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error starting consultation';
      onShowToast('Action Error', msg, 'error');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleCompleteConsultation = async (patient: PatientToken) => {
    setActionInProgress(patient.patientId);
    try {
      await completeConsultation(patient.patientId);
      onShowToast('Consultation Completed', `Token #${patient.tokenNumber} marked finished`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error completing patient';
      onShowToast('Action Error', msg, 'error');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleCancel = async (patient: PatientToken) => {
    if (window.confirm(`Cancel token #${patient.tokenNumber} for ${patient.patientName}?`)) {
      setActionInProgress(patient.patientId);
      try {
        await cancelToken(patient.patientId, 'Cancelled by hospital staff');
        onShowToast('Token Cancelled', `Token #${patient.tokenNumber} dismissed`, 'info');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error cancelling token';
        onShowToast('Action Error', msg, 'error');
      } finally {
        setActionInProgress(null);
      }
    }
  };

  const handleSavePriority = async () => {
    if (!priorityModalPatient) return;
    try {
      await updatePatientPriority(priorityModalPatient.patientId, newPriority, priorityReason);
      onShowToast('Priority Updated', `Token #${priorityModalPatient.tokenNumber} set to ${newPriority}`, 'success');
      setPriorityModalPatient(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error updating priority';
      onShowToast('Action Error', msg, 'error');
    }
  };

  const handleAddWalkin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkinName.trim()) return;

    try {
      const newToken = await generateNewToken({
        patientName: walkinName.trim(),
        age: Number(walkinAge),
        department: walkinDept,
        appointmentType: 'Walk-in Triage',
        priority: walkinPriority,
        urgencyNotes: walkinNotes.trim()
      });
      onShowToast('Walk-in Added', `Issued Token #${newToken.tokenNumber}`, 'success');
      setIsAddPatientOpen(false);
      setWalkinName('');
      setWalkinNotes('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add walk-in';
      onShowToast('Error', msg, 'error');
    }
  };

  const handleSeedDemo = async () => {
    try {
      await seedDemoQueueIfEmpty();
      onShowToast('Demo Data Seeded', 'Sample patients loaded for clinical demonstration', 'info');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Seeding failed';
      onShowToast('Notice', msg, 'info');
    }
  };

  const getPriorityBadge = (priority: PriorityLevel) => {
    switch (priority) {
      case 'urgent':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-300">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
            <span>URGENT</span>
          </span>
        );
      case 'moderate':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
            Moderate
          </span>
        );
      case 'routine':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-stone-100 text-stone-700">
            Routine
          </span>
        );
    }
  };

  const getStatusBadge = (status: QueueStatus) => {
    switch (status) {
      case 'called':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-500 text-white animate-pulse">
            Called
          </span>
        );
      case 'in-consultation':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-100 text-teal-900 border border-teal-300">
            In Consultation
          </span>
        );
      case 'waiting':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
            Waiting
          </span>
        );
      case 'completed':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-stone-100 text-stone-600">
            Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-600">
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  const deptList = departments.length > 0 ? departments.map(d => d.name) : Object.keys(DEPARTMENT_DEFAULTS);

  return (
    <div className="min-h-screen bg-[#FBFBEE] text-[#0A1B17] flex flex-col md:flex-row">
      {/* STAFF SIDEBAR */}
      <aside className="w-full md:w-64 bg-[#0D231E] text-white p-5 flex flex-col justify-between shrink-0 shadow-xl">
        <div>
          {/* Brand & Badge */}
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-[#B4F481] flex items-center justify-center text-[#0D231E] shadow">
              <Stethoscope className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">QueueCare AI</h2>
              <span className="text-[10px] font-bold bg-white/10 text-[#B4F481] px-2 py-0.5 rounded-full uppercase tracking-wider">
                Staff Command
              </span>
            </div>
          </div>

          {/* Department Quick Filter in Sidebar */}
          <div className="mb-6">
            <p className="text-[11px] font-bold text-white/50 uppercase tracking-wider mb-2">Hospital Department</p>
            <div className="space-y-1">
              {['All', ...deptList].map((dept) => (
                <button
                  key={dept}
                  onClick={() => setSelectedDepartment(dept)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    selectedDepartment === dept
                      ? 'bg-[#B4F481] text-[#0D231E] shadow'
                      : 'text-stone-300 hover:bg-white/10'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>

          {/* Admin Switcher if authorized */}
          {isAdmin && onNavigateAdmin && (
            <div className="pt-2">
              <button
                onClick={onNavigateAdmin}
                className="w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-emerald-900 to-teal-900 border border-[#B4F481]/30 text-[#B4F481] text-xs font-extrabold hover:bg-emerald-800 transition-all shadow"
              >
                <Settings className="w-4 h-4 text-[#B4F481]" />
                <span>Admin Config Panel</span>
              </button>
            </div>
          )}
        </div>

        {/* Staff Identity & Sign Out */}
        <div className="pt-6 border-t border-white/10 mt-6 space-y-2">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-9 h-9 rounded-full bg-white/20 text-[#B4F481] font-black flex items-center justify-center text-xs">
              <Shield className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{userProfile?.name || 'Staff'}</p>
              <p className="text-[10px] text-white/50 truncate capitalize">Role: {userProfile?.role || 'staff'}</p>
            </div>
          </div>

          <button
            onClick={onSignOut}
            className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-white/10 text-xs font-bold text-stone-200 hover:bg-rose-900/60 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Exit Staff Console</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-4 sm:p-8 max-w-7xl overflow-y-auto">
        {/* HEADER BAR */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 mb-6 border-b border-stone-200/80 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#0A1B17] tracking-tight">
              Hospital Clinical Queue Console
            </h1>
            <p className="text-xs text-stone-500 mt-0.5">
              Real-time patient triage, room dispatching, and queue management
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {onOpenDisplayMode && (
              <button
                onClick={onOpenDisplayMode}
                className="px-3.5 py-2.5 rounded-xl border border-teal-300 text-teal-900 bg-teal-50 hover:bg-teal-100 text-xs font-bold shadow-sm flex items-center space-x-1.5 cursor-pointer"
              >
                <Monitor className="w-3.5 h-3.5 text-teal-700" />
                <span>Waiting Room Display</span>
              </button>
            )}

            {isAdmin && onNavigateAdmin && (
              <button
                onClick={onNavigateAdmin}
                className="px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-800 bg-white hover:bg-stone-50 text-xs font-bold shadow-sm flex items-center space-x-1.5"
              >
                <Settings className="w-3.5 h-3.5 text-teal-700" />
                <span>Admin Config</span>
              </button>
            )}

            {patients.length === 0 && (
              <button
                onClick={handleSeedDemo}
                className="px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-700 bg-white hover:bg-stone-50 text-xs font-bold shadow-sm"
              >
                Load Sample Queue
              </button>
            )}

            <button
              onClick={() => setIsAddPatientOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-[#0D231E] text-white font-bold text-xs hover:bg-[#13322B] transition-all flex items-center space-x-2 shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#B4F481]" />
              <span>Add Walk-in Patient</span>
            </button>
          </div>
        </header>

        {/* 6 OVERVIEW METRIC CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-8">
          <div className="bg-white p-4 rounded-3xl border border-stone-200/80 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
              Total Registered
            </span>
            <p className="text-2xl font-black text-[#0A1B17] font-mono-num">{metrics.totalRegistered}</p>
            <span className="text-[10px] text-stone-400">All departments</span>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-amber-200 bg-amber-50/20 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block mb-1">
              Waiting in Line
            </span>
            <p className="text-2xl font-black text-amber-900 font-mono-num">{metrics.waitingCount}</p>
            <span className="text-[10px] text-amber-700">Pending call</span>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-teal-200 bg-teal-50/20 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 block mb-1">
              In Consultation
            </span>
            <p className="text-2xl font-black text-teal-900 font-mono-num">{metrics.inConsultationCount}</p>
            <span className="text-[10px] text-teal-700">Doctors engaged</span>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-stone-200/80 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
              Completed
            </span>
            <p className="text-2xl font-black text-emerald-700 font-mono-num">{metrics.completedCount}</p>
            <span className="text-[10px] text-emerald-600">Discharged today</span>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-rose-200 bg-rose-50/20 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block mb-1">
              Urgent Triage
            </span>
            <p className="text-2xl font-black text-rose-800 font-mono-num">{metrics.urgentCount}</p>
            <span className="text-[10px] text-rose-600">Priority expedited</span>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-stone-200/80 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
              Avg Wait Time
            </span>
            <p className="text-2xl font-black text-[#0A1B17] font-mono-num">~{metrics.averageWaitTime}m</p>
            <span className="text-[10px] text-stone-400">Dynamic baseline</span>
          </div>
        </div>

        {/* CONTROLS BAR: SEARCH & FILTERS */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-stone-200/80 shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search by token # or patient name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-stone-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0D231E] bg-stone-50/50"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="px-3 py-2 rounded-xl border border-stone-200 text-xs font-semibold bg-stone-50/50 text-stone-700 focus:outline-none"
            >
              <option value="All">All Priorities</option>
              <option value="urgent">Urgent Only</option>
              <option value="moderate">Moderate</option>
              <option value="routine">Routine</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 rounded-xl border border-stone-200 text-xs font-semibold bg-stone-50/50 text-stone-700 focus:outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="waiting">Waiting</option>
              <option value="called">Called</option>
              <option value="in-consultation">In Consultation</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <button
              onClick={() => setSortBy(sortBy === 'arrival' ? 'priority' : 'arrival')}
              className="px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold text-stone-700 bg-white hover:bg-stone-50 flex items-center space-x-1.5"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Sort: {sortBy === 'arrival' ? 'Arrival Time' : 'Clinical Priority'}</span>
            </button>
          </div>
        </div>

        {/* LIVE QUEUE TABLE */}
        <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50/80 border-b border-stone-200/60 text-stone-500 uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3.5 px-5">Token #</th>
                  <th className="py-3.5 px-4">Patient Name</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Arrival</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Est. Wait</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-5 text-right">Clinical Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-stone-400">
                      No patients found matching the selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map((patient) => {
                    const isBusy = actionInProgress === patient.patientId;

                    return (
                      <tr key={patient.patientId} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-4 px-5 font-black font-mono-num text-sm text-[#0A1B17]">
                          #{patient.tokenNumber}
                        </td>

                        <td className="py-4 px-4">
                          <p className="font-bold text-stone-900">{patient.patientName}</p>
                          <p className="text-[11px] text-stone-400">{patient.age} yrs • {patient.appointmentType}</p>
                        </td>

                        <td className="py-4 px-4 font-semibold text-stone-700">
                          {patient.department}
                        </td>

                        <td className="py-4 px-4 text-stone-500 font-mono">
                          {patient.arrivalTime}
                        </td>

                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-1.5">
                            {getPriorityBadge(patient.priority)}
                            <button
                              onClick={() => {
                                setPriorityModalPatient(patient);
                                setNewPriority(patient.priority);
                              }}
                              title="Triage / Change Priority"
                              className="text-stone-400 hover:text-stone-700 p-1"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        <td className="py-4 px-4 font-mono font-medium text-stone-600">
                          {patient.status === 'completed' || patient.status === 'cancelled'
                            ? '—'
                            : `~${patient.estimatedWaitingMinutes || 10} min`}
                        </td>

                        <td className="py-4 px-4">
                          {getStatusBadge(patient.status)}
                        </td>

                        <td className="py-4 px-5 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {patient.status === 'waiting' && (
                              <button
                                disabled={isBusy}
                                onClick={() => handleCallNext(patient)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-1 transition-colors disabled:opacity-50"
                              >
                                <PhoneCall className="w-3 h-3" />
                                <span>Call Next</span>
                              </button>
                            )}

                            {patient.status === 'called' && (
                              <button
                                disabled={isBusy}
                                onClick={() => handleStartConsultation(patient)}
                                className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center space-x-1 transition-colors disabled:opacity-50"
                              >
                                <Play className="w-3 h-3" />
                                <span>Start Consultation</span>
                              </button>
                            )}

                            {patient.status === 'in-consultation' && (
                              <button
                                disabled={isBusy}
                                onClick={() => handleCompleteConsultation(patient)}
                                className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-[#B4F481] font-bold text-xs flex items-center space-x-1 transition-colors disabled:opacity-50"
                              >
                                <Check className="w-3 h-3" />
                                <span>Complete</span>
                              </button>
                            )}

                            {patient.status !== 'completed' && patient.status !== 'cancelled' && (
                              <button
                                disabled={isBusy}
                                onClick={() => handleCancel(patient)}
                                className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Cancel Token"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* WALK-IN PATIENT MODAL */}
        {isAddPatientOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-stone-200">
              <h3 className="text-xl font-black text-[#0A1B17] mb-1">Add Walk-In Patient</h3>
              <p className="text-xs text-stone-500 mb-6">
                Issue immediate on-the-spot token for reception walk-ins.
              </p>

              <form onSubmit={handleAddWalkin} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Patient Full Name</label>
                  <input
                    type="text"
                    required
                    value={walkinName}
                    onChange={(e) => setWalkinName(e.target.value)}
                    placeholder="e.g. David Miller"
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D231E]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Age</label>
                    <input
                      type="number"
                      required
                      value={walkinAge}
                      onChange={(e) => setWalkinAge(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D231E]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Department</label>
                    <select
                      value={walkinDept}
                      onChange={(e) => setWalkinDept(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D231E]"
                    >
                      {deptList.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Triage Priority</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['routine', 'moderate', 'urgent'] as PriorityLevel[]).map((p) => (
                      <button
                        type="button"
                        key={p}
                        onClick={() => setWalkinPriority(p)}
                        className={`py-2 rounded-xl border font-bold capitalize ${
                          walkinPriority === p
                            ? 'bg-[#0D231E] text-white'
                            : 'border-stone-200 text-stone-600'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Clinical Notes (Optional)</label>
                  <textarea
                    rows={2}
                    value={walkinNotes}
                    onChange={(e) => setWalkinNotes(e.target.value)}
                    placeholder="Chief complaint / urgency observation"
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D231E]"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddPatientOpen(false)}
                    className="px-4 py-2 rounded-xl border border-stone-200 font-bold text-stone-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#0D231E] text-white font-bold"
                  >
                    Issue Token
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* PRIORITY TRIAGE MODAL */}
        {priorityModalPatient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-stone-200">
              <h3 className="text-lg font-black text-[#0A1B17] mb-1">
                Triage Token #{priorityModalPatient.tokenNumber}
              </h3>
              <p className="text-xs text-stone-500 mb-4">
                Update priority for patient {priorityModalPatient.patientName}
              </p>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Select Priority</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['routine', 'moderate', 'urgent'] as PriorityLevel[]).map((p) => (
                      <button
                        type="button"
                        key={p}
                        onClick={() => setNewPriority(p)}
                        className={`py-2 rounded-xl border font-bold capitalize ${
                          newPriority === p
                            ? p === 'urgent'
                              ? 'bg-rose-600 text-white'
                              : 'bg-[#0D231E] text-white'
                            : 'border-stone-200 text-stone-600'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Reason for Audit Log</label>
                  <input
                    type="text"
                    value={priorityReason}
                    onChange={(e) => setPriorityReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setPriorityModalPatient(null)}
                    className="px-4 py-2 rounded-xl border border-stone-200 font-bold text-stone-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePriority}
                    className="px-4 py-2 rounded-xl bg-[#0D231E] text-white font-bold"
                  >
                    Save Triage
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
