import React, { useState, useEffect, useRef } from 'react';
import {
  Ticket,
  Clock,
  Users,
  Building,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  ArrowRight,
  LogOut,
  Bell,
  RefreshCw,
  XCircle,
  History,
  User as UserIcon,
  Activity,
  HeartPulse,
  Volume2,
  Smartphone,
  QrCode,
  Printer,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PatientToken, PriorityLevel, QueueStatus, Department, QueueRuleConfig } from '../types';
import {
  subscribeToUserTokens,
  generateNewToken,
  cancelToken,
  subscribeToAllPatients
} from '../services/queueService';
import {
  subscribeToDepartments,
  subscribeToQueueRules,
  DEFAULT_QUEUE_RULES
} from '../services/adminService';
import { calculateEstimatedWait, formatWaitTime } from '../utils/waitingTimeEngine';
import {
  isPushNotificationSupported,
  getPushPermission,
  requestPushPermission,
  sendDevicePushNotification,
  playChime
} from '../services/notificationService';
import { DigitalTokenCard } from '../components/DigitalTokenCard';

interface PatientDashboardProps {
  onSignOut: () => void;
  onOpenDisplayMode?: () => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

export const PatientDashboard: React.FC<PatientDashboardProps> = ({
  onSignOut,
  onOpenDisplayMode,
  onShowToast
}) => {
  const { currentUser, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'new-token' | 'history' | 'profile'>('overview');
  
  const [userTokens, setUserTokens] = useState<PatientToken[]>([]);
  const [allDepartmentPatients, setAllDepartmentPatients] = useState<PatientToken[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [queueRules, setQueueRules] = useState<QueueRuleConfig>(DEFAULT_QUEUE_RULES);
  const [isLoading, setIsLoading] = useState(true);

  // Digital Token Card Modal
  const [cardModalToken, setCardModalToken] = useState<PatientToken | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);

  // Push notification permission state
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(getPushPermission());

  // Ref to track last seen status to avoid re-triggering notifications on initial load
  const lastNotifiedStatusRef = useRef<Record<string, string>>({});
  const lastPatientsAheadRef = useRef<number | null>(null);

  // New Token Form State
  const [patientName, setPatientName] = useState(userProfile?.name || '');
  const [patientAge, setPatientAge] = useState(28);
  const [department, setDepartment] = useState('General Medicine');
  const [appointmentType, setAppointmentType] = useState('Routine Consultation');
  const [priority, setPriority] = useState<PriorityLevel>('routine');
  const [urgencyNotes, setUrgencyNotes] = useState('');
  const [isSubmittingToken, setIsSubmittingToken] = useState(false);

  // Subscribe to Departments & Queue Rules from Firestore
  useEffect(() => {
    const unsubDepts = subscribeToDepartments((depts) => {
      setDepartments(depts);
      if (depts.length > 0 && !depts.some((d) => d.name === department)) {
        setDepartment(depts[0].name);
      }
    });

    const unsubRules = subscribeToQueueRules((rules) => {
      setQueueRules(rules);
    });

    return () => {
      unsubDepts();
      unsubRules();
    };
  }, []);

  // Real-time listener for current user's tokens & all patients
  useEffect(() => {
    if (!currentUser) return;
    setIsLoading(true);

    const unsubUser = subscribeToUserTokens(currentUser.uid, (tokens) => {
      setUserTokens(tokens);
      setIsLoading(false);

      // Check active token for status transitions
      const active = tokens.find(t => t.status === 'waiting' || t.status === 'called' || t.status === 'in-consultation');
      if (active) {
        const prevStatus = lastNotifiedStatusRef.current[active.patientId];

        if (prevStatus && prevStatus !== active.status) {
          if (active.status === 'called') {
            if (queueRules.enableSoundAlerts) playChime('called');
            if (queueRules.enableDevicePush) {
              sendDevicePushNotification(`QueueCare AI: Token #${active.tokenNumber} is CALLED!`, {
                body: `Please report immediately to ${active.counterOrRoom || 'Consultation Room'}. Attending: ${active.calledByStaff || 'Doctor On Duty'}.`,
                tag: `called-${active.tokenNumber}`
              });
            }
            onShowToast('Token Called!', `Please report to ${active.counterOrRoom || 'Consultation Room'}`, 'success');
          } else if (active.status === 'in-consultation') {
            if (queueRules.enableSoundAlerts) playChime('next');
            if (queueRules.enableDevicePush) {
              sendDevicePushNotification(`QueueCare AI: Consultation Started`, {
                body: `You are now in consultation with ${active.calledByStaff || 'doctor'}.`,
                tag: `consulting-${active.tokenNumber}`
              });
            }
          } else if (active.status === 'completed') {
            if (queueRules.enableSoundAlerts) playChime('completed');
            if (queueRules.enableDevicePush) {
              sendDevicePushNotification(`QueueCare AI: Appointment Completed`, {
                body: `Your visit for Token #${active.tokenNumber} is finished. Take care!`,
                tag: `completed-${active.tokenNumber}`
              });
            }
          }
        }

        lastNotifiedStatusRef.current[active.patientId] = active.status;
      }
    });

    const unsubAll = subscribeToAllPatients((all) => {
      setAllDepartmentPatients(all);
    });

    return () => {
      unsubUser();
      unsubAll();
    };
  }, [currentUser, queueRules]);

  // Handle Push Permission Request
  const handleEnablePush = async () => {
    const res = await requestPushPermission();
    setPushPermission(res);
    if (res === 'granted') {
      sendDevicePushNotification('QueueCare AI Notifications Active', {
        body: 'You will receive real-time device push alerts when your token is called.'
      });
      playChime('next');
      onShowToast('Notifications Enabled', 'Device push alerts activated for your queue tokens', 'success');
    } else {
      onShowToast('Permission Denied', 'Browser notification permission was blocked or declined', 'error');
    }
  };

  const activeToken = userTokens.find(
    (t) => t.status === 'waiting' || t.status === 'called' || t.status === 'in-consultation'
  );

  const waitingInDept = allDepartmentPatients.filter(
    (p) => p.department === activeToken?.department && p.status === 'waiting'
  );

  const currentServingToken = allDepartmentPatients.find(
    (p) => p.department === activeToken?.department && (p.status === 'in-consultation' || p.status === 'called')
  );

  const matchedDept = departments.find((d) => d.name === activeToken?.department);

  const waitCalculation = activeToken
    ? calculateEstimatedWait(
        activeToken.department,
        activeToken.priority,
        waitingInDept,
        activeToken.tokenNumber,
        matchedDept,
        queueRules
      )
    : null;

  // Next in line notification alert
  useEffect(() => {
    if (activeToken && activeToken.status === 'waiting' && waitCalculation) {
      if (waitCalculation.patientsAhead === 1 && lastPatientsAheadRef.current !== 1) {
        if (queueRules.enableSoundAlerts) playChime('next');
        if (queueRules.enableDevicePush) {
          sendDevicePushNotification('QueueCare AI: You are next in line!', {
            body: `Token #${activeToken.tokenNumber}: Only 1 patient ahead in ${activeToken.department}. Please wait near the room.`,
            tag: `next-in-line-${activeToken.tokenNumber}`
          });
        }
      }
      lastPatientsAheadRef.current = waitCalculation.patientsAhead;
    }
  }, [waitCalculation?.patientsAhead, activeToken?.status]);

  const handleGenerateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) {
      onShowToast('Name Required', 'Please enter patient full name', 'error');
      return;
    }

    setIsSubmittingToken(true);
    try {
      const newToken = await generateNewToken({
        patientName: patientName.trim(),
        age: Number(patientAge),
        department,
        appointmentType,
        priority,
        urgencyNotes: urgencyNotes.trim()
      });

      onShowToast('Token Generated!', `Assigned Token #${newToken.tokenNumber}`, 'success');
      setActiveTab('overview');
      setUrgencyNotes('');
      // Automatically present digital pass with QR code
      setCardModalToken(newToken);
      setShowCardModal(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate token';
      onShowToast('Registration Error', msg, 'error');
    } finally {
      setIsSubmittingToken(false);
    }
  };

  const handleCancelToken = async (token: PatientToken) => {
    if (window.confirm(`Are you sure you want to cancel Token #${token.tokenNumber}?`)) {
      try {
        await cancelToken(token.patientId, 'Cancelled by patient');
        onShowToast('Token Cancelled', `Token #${token.tokenNumber} has been withdrawn`, 'info');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error cancelling token';
        onShowToast('Error', msg, 'error');
      }
    }
  };

  const getStatusBadge = (status: QueueStatus) => {
    switch (status) {
      case 'called':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500 text-white animate-pulse shadow-sm">
            <span className="w-2 h-2 rounded-full bg-white" />
            <span>CALLED — PROCEED NOW</span>
          </span>
        );
      case 'in-consultation':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-900 border border-teal-300">
            <Activity className="w-3 h-3 text-teal-700 animate-spin" />
            <span>In Consultation</span>
          </span>
        );
      case 'waiting':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <Clock className="w-3 h-3 text-amber-700" />
            <span>Waiting in Line</span>
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-700">
            <CheckCircle2 className="w-3 h-3 text-stone-600" />
            <span>Completed</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
            <XCircle className="w-3 h-3 text-rose-600" />
            <span>Cancelled</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBEE] text-[#0A1B17] flex flex-col md:flex-row">
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-64 bg-white border-r border-stone-200/80 p-5 flex flex-col justify-between shrink-0 shadow-sm">
        <div>
          {/* Brand */}
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-[#0D231E] flex items-center justify-center text-[#B4F481]">
              <Activity className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#0A1B17]">QueueCare AI</h2>
              <span className="text-[11px] font-semibold text-teal-700 uppercase tracking-wider">Patient Portal</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1 text-sm font-bold">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-2xl transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-[#0D231E] text-white shadow-md'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <Ticket className="w-4 h-4 text-[#B4F481]" />
              <span>My Active Token</span>
            </button>

            <button
              onClick={() => setActiveTab('new-token')}
              className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-2xl transition-all cursor-pointer ${
                activeTab === 'new-token'
                  ? 'bg-[#0D231E] text-white shadow-md'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <PlusCircle className="w-4 h-4 text-emerald-600" />
              <span>Register New Token</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-2xl transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-[#0D231E] text-white shadow-md'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <History className="w-4 h-4 text-stone-500" />
              <span>Token History</span>
              {userTokens.length > 0 && (
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-stone-200 text-stone-700">
                  {userTokens.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-2xl transition-all cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-[#0D231E] text-white shadow-md'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <UserIcon className="w-4 h-4 text-stone-500" />
              <span>Patient Profile</span>
            </button>
          </nav>

          {/* Quick link to Reception Display Mode */}
          {onOpenDisplayMode && (
            <div className="mt-6 pt-4 border-t border-stone-100">
              <button
                onClick={onOpenDisplayMode}
                className="w-full text-left px-3 py-2.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs font-bold hover:bg-teal-100 transition-colors flex items-center space-x-2"
              >
                <Building className="w-4 h-4 text-teal-700" />
                <span>Waiting Room Screen</span>
              </button>
            </div>
          )}
        </div>

        {/* User Card & Logout */}
        <div className="pt-6 border-t border-stone-100 mt-6">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-[#B4F481]/70 text-[#0D231E] font-black flex items-center justify-center text-sm shadow-inner">
              {userProfile?.name?.charAt(0).toUpperCase() || 'P'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-extrabold text-stone-900 truncate">{userProfile?.name || 'Patient'}</p>
              <p className="text-[11px] text-stone-400 truncate">{currentUser?.email}</p>
            </div>
          </div>
          <button
            onClick={onSignOut}
            className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl border border-stone-200 text-xs font-bold text-stone-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-4 sm:p-8 max-w-6xl overflow-y-auto">
        {/* TOP STATUS BAR */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 mb-6 border-b border-stone-200/60 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#0A1B17] tracking-tight">
              {activeTab === 'overview' && 'Live Queue Monitor'}
              {activeTab === 'new-token' && 'Generate Queue Token'}
              {activeTab === 'history' && 'Past Appointments & Tokens'}
              {activeTab === 'profile' && 'Patient Account Details'}
            </h1>
            <p className="text-xs text-stone-500 mt-0.5">
              Real-time synchronization with Hospital OPD Department
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Real-time Push Notification Status / Request */}
            {isPushNotificationSupported() && (
              pushPermission === 'granted' ? (
                <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-[#B4F481]/30 border border-[#B4F481]/60 text-[#0D231E] text-xs font-bold">
                  <Bell className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Push Alerts: Active</span>
                </div>
              ) : (
                <button
                  onClick={handleEnablePush}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-white border border-teal-300 text-teal-800 text-xs font-bold shadow-sm hover:bg-teal-50 transition-all cursor-pointer"
                >
                  <Smartphone className="w-3.5 h-3.5 text-teal-600" />
                  <span>Enable Push Alerts</span>
                </button>
              )
            )}

            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Live Firestore Stream</span>
            </div>
          </div>
        </header>

        {/* REAL-TIME DEVICE NOTIFICATION CALLOUT IF NOT GRANTED */}
        {pushPermission !== 'granted' && isPushNotificationSupported() && activeToken && (
          <div className="mb-6 p-4 rounded-2xl bg-teal-50 border border-teal-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4 animate-bounce" />
              </div>
              <div>
                <p className="font-extrabold text-teal-950">Receive Instant Push Alerts on Your Device</p>
                <p className="text-teal-700">
                  Get notified the exact second your token is called, even if you switch browser tabs.
                </p>
              </div>
            </div>
            <button
              onClick={handleEnablePush}
              className="px-4 py-2 rounded-xl bg-[#0D231E] text-[#B4F481] font-bold shrink-0 hover:bg-black transition-colors cursor-pointer"
            >
              Turn On Notifications
            </button>
          </div>
        )}

        {/* CALLED AUDIO-VISUAL ALERT BANNER */}
        {activeToken?.status === 'called' && (
          <div className="mb-6 p-6 rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-xl border border-emerald-400/40 animate-pulse-glow flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-white text-emerald-800 flex items-center justify-center shrink-0 shadow-lg">
                <Volume2 className="w-8 h-8 text-emerald-600 animate-bounce" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">Attention Patient</span>
                <h3 className="text-xl sm:text-2xl font-black tracking-tight">
                  Token #{activeToken.tokenNumber} is CALLED!
                </h3>
                <p className="text-xs sm:text-sm text-emerald-100 mt-0.5">
                  Please proceed immediately to <strong className="text-white underline">{activeToken.counterOrRoom || 'Consultation Room 1'}</strong>. Attending: {activeToken.calledByStaff || 'Doctor On Duty'}.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setCardModalToken(activeToken);
                  setShowCardModal(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-white/20 text-white font-bold text-xs hover:bg-white/30 transition-colors"
              >
                Show QR Pass
              </button>
              <button
                onClick={() => playChime('called')}
                className="px-4 py-2 rounded-xl bg-white text-emerald-900 font-extrabold text-xs shadow-md hover:bg-emerald-50 cursor-pointer"
              >
                Replay Chime
              </button>
            </div>
          </div>
        )}

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {activeToken ? (
              <>
                {/* PROMINENT PERSONAL TOKEN CARD */}
                <div className="relative rounded-3xl bg-[#0D231E] text-white p-6 sm:p-8 shadow-2xl border border-white/10 overflow-hidden">
                  <div className="absolute top-0 right-0 -mt-10 -mr-10 w-56 h-56 bg-[#B4F481]/15 rounded-full blur-2xl pointer-events-none" />
                  
                  <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-white/10">
                    <div>
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="text-xs font-mono font-bold text-[#B4F481] uppercase tracking-wider">
                          {activeToken.department}
                        </span>
                        <span className="text-white/30">•</span>
                        <span className="text-xs text-stone-300 font-medium">
                          {activeToken.appointmentType}
                        </span>
                      </div>
                      <div className="flex items-baseline space-x-3">
                        <span className="text-xs text-stone-400">Token</span>
                        <span className="text-4xl sm:text-6xl font-black font-mono-num text-white tracking-tight">
                          #{activeToken.tokenNumber}
                        </span>
                      </div>
                      <p className="text-xs text-stone-300 mt-1">
                        Patient: <strong>{activeToken.patientName}</strong> ({activeToken.age} yrs)
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <div>{getStatusBadge(activeToken.status)}</div>
                      <button
                        onClick={() => {
                          setCardModalToken(activeToken);
                          setShowCardModal(true);
                        }}
                        className="px-4 py-2 rounded-xl bg-[#B4F481] text-[#0D231E] text-xs font-extrabold hover:bg-[#a6ec70] transition-colors flex items-center space-x-1.5 shadow cursor-pointer"
                      >
                        <QrCode className="w-4 h-4" />
                        <span>Digital Pass & QR</span>
                      </button>
                      {activeToken.status === 'waiting' && (
                        <button
                          onClick={() => handleCancelToken(activeToken)}
                          className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-rose-900/60 text-stone-300 hover:text-white text-xs font-bold transition-colors border border-white/10 cursor-pointer"
                        >
                          Cancel Token
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 5-STAGE QUEUE PROGRESS TRACKER */}
                  <div className="relative z-10 pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                        Queue Journey Progress
                      </p>
                      <span className="text-xs text-[#B4F481] font-bold">
                        {waitCalculation?.patientsAhead ?? 0} Patients Ahead of You
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-2 text-center text-xs">
                      {[
                        { label: 'Registered', status: 'waiting' },
                        { label: 'In Queue', status: 'waiting' },
                        { label: 'Called', status: 'called' },
                        { label: 'Consultation', status: 'in-consultation' },
                        { label: 'Completed', status: 'completed' }
                      ].map((step, idx) => {
                        const statusOrder: Record<QueueStatus, number> = {
                          waiting: 1,
                          called: 2,
                          'in-consultation': 3,
                          completed: 4,
                          cancelled: -1
                        };
                        const currentRank = statusOrder[activeToken.status];
                        const isPast = currentRank >= idx;
                        const isCurrent = currentRank === idx;

                        return (
                          <div key={idx} className="flex flex-col items-center">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] mb-1.5 transition-all ${
                                isCurrent
                                  ? 'bg-[#B4F481] text-[#0D231E] ring-4 ring-[#B4F481]/30 font-black scale-110'
                                  : isPast
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-white/10 text-white/40'
                              }`}
                            >
                              {idx + 1}
                            </div>
                            <span className={`text-[10px] sm:text-xs font-semibold ${isPast ? 'text-white' : 'text-white/40'}`}>
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* METRICS ROW */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Metric 1 */}
                  <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-sm">
                    <div className="flex items-center space-x-3 text-stone-500 mb-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                        <Clock className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider">Estimated Wait Time</span>
                    </div>
                    <p className="text-2xl sm:text-3xl font-extrabold text-[#0A1B17] font-mono-num">
                      {activeToken.status === 'called' || activeToken.status === 'in-consultation'
                        ? 'Immediate'
                        : formatWaitTime(waitCalculation?.estimatedMinutes || activeToken.estimatedWaitingMinutes)}
                    </p>
                    <p className="text-xs text-stone-500 mt-1">
                      {waitCalculation?.explanation || 'Calculated dynamic estimate'}
                    </p>
                  </div>

                  {/* Metric 2 */}
                  <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-sm">
                    <div className="flex items-center space-x-3 text-stone-500 mb-2">
                      <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                        <Users className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider">Queue Position</span>
                    </div>
                    <p className="text-2xl sm:text-3xl font-extrabold text-[#0A1B17] font-mono-num">
                      {activeToken.status === 'called' || activeToken.status === 'in-consultation'
                        ? 'Your Turn!'
                        : `${waitCalculation?.patientsAhead ?? 0} Ahead`}
                    </p>
                    <p className="text-xs text-stone-500 mt-1">
                      In {activeToken.department} queue
                    </p>
                  </div>

                  {/* Metric 3 */}
                  <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-sm">
                    <div className="flex items-center space-x-3 text-stone-500 mb-2">
                      <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                        <Building className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider">Now Serving</span>
                    </div>
                    <p className="text-2xl sm:text-3xl font-extrabold text-[#0A1B17] font-mono-num">
                      {currentServingToken ? `#${currentServingToken.tokenNumber}` : 'Ready for next'}
                    </p>
                    <p className="text-xs text-stone-500 mt-1">
                      {currentServingToken?.counterOrRoom || 'Counter Active'}
                    </p>
                  </div>
                </div>

                {/* CLINICAL DETAILS & REFRESH NOTICE */}
                <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-extrabold text-[#0A1B17]">Arrival & Triage Information</h4>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Checked in at {activeToken.arrivalTime} • Priority: <span className="font-bold uppercase text-teal-800">{activeToken.priority}</span>
                      {activeToken.urgencyNotes && ` • Notes: "${activeToken.urgencyNotes}"`}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => {
                        setCardModalToken(activeToken);
                        setShowCardModal(true);
                      }}
                      className="text-xs font-bold text-teal-800 hover:underline flex items-center space-x-1"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Digital Pass</span>
                    </button>
                    <div className="text-xs text-stone-400 font-semibold flex items-center space-x-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-600" />
                      <span>Live synced via Firestore</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* EMPTY STATE */
              <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-stone-200/80 shadow-sm max-w-xl mx-auto">
                <div className="w-16 h-16 rounded-3xl bg-[#B4F481]/50 text-[#0D231E] flex items-center justify-center mx-auto mb-4">
                  <Ticket className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-[#0A1B17] mb-2">No Active Queue Token</h3>
                <p className="text-xs sm:text-sm text-stone-500 leading-relaxed mb-6">
                  You are not currently queued for any department. Issue a new digital token to reserve your spot and receive live wait time estimates.
                </p>
                <button
                  onClick={() => setActiveTab('new-token')}
                  className="px-6 py-3.5 rounded-full bg-[#0D231E] text-white font-bold text-sm hover:bg-[#13322B] transition-all inline-flex items-center space-x-2 shadow-md cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4 text-[#B4F481]" />
                  <span>Generate New Token</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* REGISTER NEW TOKEN TAB */}
        {activeTab === 'new-token' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-sm max-w-2xl">
            <h2 className="text-xl font-black text-[#0A1B17] mb-1">Hospital OPD Queue Registration</h2>
            <p className="text-xs text-stone-500 mb-6">
              Fill in patient particulars to receive an atomic token with waiting-time calculation and digital QR pass.
            </p>

            <form onSubmit={handleGenerateToken} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Patient Full Name</label>
                  <input
                    type="text"
                    required
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="e.g. Maya Sharma"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D231E] bg-stone-50/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Age</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    required
                    value={patientAge}
                    onChange={(e) => setPatientAge(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D231E] bg-stone-50/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Hospital Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D231E] bg-stone-50/50"
                  >
                    {departments.map((dept) => (
                      <option key={dept.departmentId} value={dept.name}>
                        {dept.name} (~{dept.averageServiceMinutes}m avg)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Appointment Type</label>
                  <select
                    value={appointmentType}
                    onChange={(e) => setAppointmentType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D231E] bg-stone-50/50"
                  >
                    <option value="Routine Consultation">Routine Consultation</option>
                    <option value="Follow-up Visit">Follow-up Visit</option>
                    <option value="Diagnostics / Lab">Diagnostics / Lab</option>
                    <option value="Prescription Refill">Prescription Refill</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Reported Condition / Urgency Level
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['routine', 'moderate', 'urgent'] as PriorityLevel[]).map((p) => (
                    <button
                      type="button"
                      key={p}
                      onClick={() => setPriority(p)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold capitalize transition-all ${
                        priority === p
                          ? p === 'urgent'
                            ? 'bg-rose-50 border-rose-500 text-rose-700 ring-2 ring-rose-300'
                            : p === 'moderate'
                            ? 'bg-amber-50 border-amber-500 text-amber-700 ring-2 ring-amber-300'
                            : 'bg-teal-50 border-teal-500 text-teal-800 ring-2 ring-teal-300'
                          : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-stone-400 mt-1">
                  * Note: Reported urgency helps calculate initial triage; clinical staff make final triage decisions.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Symptoms or Urgency Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={urgencyNotes}
                  onChange={(e) => setUrgencyNotes(e.target.value)}
                  placeholder="e.g. Mild headache, throat irritation for 2 days"
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D231E] bg-stone-50/50"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingToken}
                className="w-full py-3.5 rounded-xl bg-[#0D231E] text-white font-bold text-sm hover:bg-[#13322B] transition-all flex items-center justify-center space-x-2 shadow-md disabled:opacity-50 cursor-pointer"
              >
                <span>{isSubmittingToken ? 'Generating Token...' : 'Confirm & Generate Token'}</span>
                {!isSubmittingToken && <ArrowRight className="w-4 h-4 text-[#B4F481]" />}
              </button>
            </form>
          </div>
        )}

        {/* TOKEN HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-sm">
            <h2 className="text-xl font-black text-[#0A1B17] mb-4">Past Patient Appointments</h2>
            {userTokens.length === 0 ? (
              <p className="text-xs text-stone-500 py-8 text-center">No token history recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-stone-100 text-stone-400 uppercase tracking-wider font-semibold">
                      <th className="pb-3">Token #</th>
                      <th className="pb-3">Department</th>
                      <th className="pb-3">Patient</th>
                      <th className="pb-3">Arrival</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Digital Pass</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {userTokens.map((tok) => (
                      <tr key={tok.patientId} className="hover:bg-stone-50/50">
                        <td className="py-3.5 font-bold font-mono-num text-[#0A1B17]">#{tok.tokenNumber}</td>
                        <td className="py-3.5 font-semibold text-stone-700">{tok.department}</td>
                        <td className="py-3.5 text-stone-600">{tok.patientName}</td>
                        <td className="py-3.5 text-stone-500">{tok.arrivalTime}</td>
                        <td className="py-3.5">{getStatusBadge(tok.status)}</td>
                        <td className="py-3.5 text-right">
                          <button
                            onClick={() => {
                              setCardModalToken(tok);
                              setShowCardModal(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs inline-flex items-center space-x-1"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>View Pass</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-sm max-w-xl">
            <h2 className="text-xl font-black text-[#0A1B17] mb-6">Patient Profile Information</h2>
            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/60">
                <span className="text-stone-400 font-bold block mb-1">Full Name</span>
                <p className="text-sm font-bold text-stone-900">{userProfile?.name || 'Patient'}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/60">
                <span className="text-stone-400 font-bold block mb-1">Email Address</span>
                <p className="text-sm font-bold text-stone-900">{currentUser?.email}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/60">
                <span className="text-stone-400 font-bold block mb-1">Authorized Role</span>
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 font-extrabold text-[11px] uppercase">
                  {userProfile?.role || 'patient'}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/60">
                <span className="text-stone-400 font-bold block mb-1">Device Push Notifications</span>
                <p className="font-semibold text-stone-700">
                  {pushPermission === 'granted' ? 'Enabled (Receiving live alerts)' : 'Not Enabled'}
                </p>
                {pushPermission !== 'granted' && (
                  <button
                    onClick={handleEnablePush}
                    className="mt-2 text-teal-700 font-bold hover:underline cursor-pointer"
                  >
                    Enable Push Notifications Now
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* DIGITAL TOKEN CARD MODAL (QR CODE & PRINT PASS) */}
        {showCardModal && cardModalToken && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="relative max-w-lg w-full">
              <button
                onClick={() => setShowCardModal(false)}
                className="absolute -top-3 -right-3 z-10 p-2 rounded-full bg-white text-stone-800 shadow-lg hover:bg-stone-100 cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
              <DigitalTokenCard
                token={cardModalToken}
                onClose={() => setShowCardModal(false)}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
