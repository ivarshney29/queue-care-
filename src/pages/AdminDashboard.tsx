import React, { useState, useEffect } from 'react';
import {
  Building2,
  Sliders,
  Users,
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
  Save,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  RefreshCw,
  LogOut,
  Bell,
  Volume2,
  Layers,
  ChevronRight,
  Search
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Department, QueueRuleConfig, UserProfile, UserRole } from '../types';
import {
  subscribeToDepartments,
  saveDepartment,
  removeDepartment,
  subscribeToQueueRules,
  saveQueueRules,
  fetchAllUsers,
  setUserRole,
  DEFAULT_QUEUE_RULES
} from '../services/adminService';
import { ADMIN_EMAIL } from '../services/authService';

interface AdminDashboardProps {
  onSignOut: () => void;
  onNavigateStaff: () => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onSignOut,
  onNavigateStaff,
  onShowToast
}) => {
  const { userProfile, currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'departments' | 'rules' | 'users'>('departments');

  // Departments State
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  // Department Form fields
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptAvgMinutes, setDeptAvgMinutes] = useState(15);
  const [deptStaffCount, setDeptStaffCount] = useState(2);
  const [deptCapacity, setDeptCapacity] = useState(25);
  const [deptColor, setDeptColor] = useState('#0D9488');

  // Queue Rules State
  const [rules, setRules] = useState<QueueRuleConfig>(DEFAULT_QUEUE_RULES);
  const [isSavingRules, setIsSavingRules] = useState(false);

  // Users Management State
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Subscribe to Departments & Queue Rules
  useEffect(() => {
    const unsubDepts = subscribeToDepartments((depts) => {
      setDepartments(depts);
    });

    const unsubRules = subscribeToQueueRules((config) => {
      setRules(config);
    });

    return () => {
      unsubDepts();
      unsubRules();
    };
  }, []);

  // Fetch users when switching to users tab
  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    }
  }, [activeTab]);

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const all = await fetchAllUsers();
      setUsersList(all);
    } catch (err: unknown) {
      console.warn('Could not fetch users list:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const openAddDepartment = () => {
    setEditingDept(null);
    setDeptName('');
    setDeptCode('');
    setDeptAvgMinutes(12);
    setDeptStaffCount(2);
    setDeptCapacity(25);
    setDeptColor('#0D9488');
    setIsDeptModalOpen(true);
  };

  const openEditDepartment = (dept: Department) => {
    setEditingDept(dept);
    setDeptName(dept.name);
    setDeptCode(dept.code);
    setDeptAvgMinutes(dept.averageServiceMinutes);
    setDeptStaffCount(dept.activeStaffCount);
    setDeptCapacity(dept.serviceCapacity || 25);
    setDeptColor(dept.color || '#0D9488');
    setIsDeptModalOpen(true);
  };

  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim() || !deptCode.trim()) {
      onShowToast('Missing Fields', 'Department name and code are required', 'error');
      return;
    }

    try {
      const deptData: Department = {
        departmentId: editingDept?.departmentId || `dept_${deptCode.toLowerCase().trim()}`,
        name: deptName.trim(),
        code: deptCode.toUpperCase().trim(),
        averageServiceMinutes: Number(deptAvgMinutes),
        activeStaffCount: Number(deptStaffCount),
        serviceCapacity: Number(deptCapacity),
        color: deptColor
      };

      await saveDepartment(deptData);
      onShowToast('Department Saved', `${deptData.name} configuration updated`, 'success');
      setIsDeptModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save department';
      onShowToast('Error', msg, 'error');
    }
  };

  const handleDeleteDepartment = async (dept: Department) => {
    if (window.confirm(`Are you sure you want to remove the ${dept.name} department?`)) {
      try {
        await removeDepartment(dept.departmentId);
        onShowToast('Department Deleted', `${dept.name} removed from registry`, 'info');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to delete department';
        onShowToast('Error', msg, 'error');
      }
    }
  };

  const handleSaveRulesConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingRules(true);
    try {
      await saveQueueRules(rules);
      onShowToast('Rules Updated', 'Priority policies and triage parameters saved to Firestore', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save rules';
      onShowToast('Error', msg, 'error');
    } finally {
      setIsSavingRules(false);
    }
  };

  const handleUpdateUserRole = async (targetUser: UserProfile, newRole: UserRole) => {
    if (targetUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() && newRole !== 'admin') {
      onShowToast('Restricted', 'Master administrator role cannot be demoted', 'error');
      return;
    }

    try {
      await setUserRole(targetUser.uid, newRole);
      setUsersList((prev) =>
        prev.map((u) => (u.uid === targetUser.uid ? { ...u, role: newRole } : u))
      );
      onShowToast('Role Assigned', `${targetUser.name || targetUser.email} is now ${newRole}`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update user role';
      onShowToast('Error', msg, 'error');
    }
  };

  const filteredUsers = usersList.filter(
    (u) =>
      u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#FBFBEE] text-[#0A1B17] flex flex-col md:flex-row">
      {/* ADMIN SIDEBAR */}
      <aside className="w-full md:w-64 bg-[#081714] text-white p-5 flex flex-col justify-between shrink-0 shadow-2xl border-r border-white/5">
        <div>
          {/* Brand & Badge */}
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#B4F481] to-teal-400 flex items-center justify-center text-[#081714] font-black shadow-lg">
              <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">QueueCare AI</h2>
              <span className="text-[10px] font-black bg-[#B4F481]/20 text-[#B4F481] px-2 py-0.5 rounded-full uppercase tracking-wider border border-[#B4F481]/30">
                Admin Console
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5 text-xs font-bold">
            <button
              onClick={() => setActiveTab('departments')}
              className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-2xl transition-all cursor-pointer ${
                activeTab === 'departments'
                  ? 'bg-white/15 text-white border border-white/10 shadow'
                  : 'text-stone-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4 text-[#B4F481]" />
              <span>Hospital Departments</span>
            </button>

            <button
              onClick={() => setActiveTab('rules')}
              className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-2xl transition-all cursor-pointer ${
                activeTab === 'rules'
                  ? 'bg-white/15 text-white border border-white/10 shadow'
                  : 'text-stone-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Sliders className="w-4 h-4 text-teal-400" />
              <span>Queue Priority Rules</span>
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-2xl transition-all cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-white/15 text-white border border-white/10 shadow'
                  : 'text-stone-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4 text-indigo-400" />
              <span>Roles & Access Control</span>
            </button>
          </nav>
        </div>

        {/* Footer Actions */}
        <div className="pt-6 border-t border-white/10 mt-6 space-y-2">
          <button
            onClick={onNavigateStaff}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl bg-teal-900/60 text-[#B4F481] text-xs font-bold hover:bg-teal-900 border border-teal-700/50 transition-colors"
          >
            <span>Open Staff Queue</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onSignOut}
            className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-white/5 text-xs font-bold text-stone-300 hover:bg-rose-900/60 hover:text-white transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN ADMIN CONTENT */}
      <main className="flex-1 p-4 sm:p-8 max-w-6xl overflow-y-auto">
        {/* TOP BANNER */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 mb-6 border-b border-stone-200/80 gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <h1 className="text-2xl sm:text-3xl font-black text-[#0A1B17] tracking-tight">
                {activeTab === 'departments' && 'Hospital Departments Registry'}
                {activeTab === 'rules' && 'Queue Priority & Triage Engine Configuration'}
                {activeTab === 'users' && 'Role-Based Access Control (RBAC)'}
              </h1>
            </div>
            <p className="text-xs text-stone-500">
              {activeTab === 'departments' && 'Configure consultation durations, capacity, and active counter quotas.'}
              {activeTab === 'rules' && 'Calibrate triage multipliers, wait time deductions, and auto-escalation thresholds.'}
              {activeTab === 'users' && 'Authorize clinical staff and hospital administrators.'}
            </p>
          </div>

          {activeTab === 'departments' && (
            <button
              onClick={openAddDepartment}
              className="px-4 py-2.5 rounded-xl bg-[#0D231E] text-white font-bold text-xs hover:bg-[#13322B] transition-all flex items-center space-x-2 shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#B4F481]" />
              <span>Add Department</span>
            </button>
          )}

          {activeTab === 'users' && (
            <button
              onClick={loadUsers}
              className="px-3.5 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-xs font-bold text-stone-700 flex items-center space-x-1.5 shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Users</span>
            </button>
          )}
        </header>

        {/* TAB 1: DEPARTMENTS */}
        {activeTab === 'departments' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {departments.map((dept) => (
                <div
                  key={dept.departmentId}
                  className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono-num font-black text-xs px-2.5 py-1 rounded-lg bg-stone-100 text-stone-800">
                        {dept.code}
                      </span>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => openEditDepartment(dept)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition-colors"
                          title="Edit Department"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDepartment(dept)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Department"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-base font-extrabold text-[#0A1B17] mb-1">{dept.name}</h3>
                    <p className="text-xs text-stone-400 mb-4">ID: {dept.departmentId}</p>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-stone-100">
                        <span className="text-stone-500 font-medium">Avg Consultation Duration:</span>
                        <span className="font-black font-mono-num text-[#0A1B17]">
                          ~{dept.averageServiceMinutes} min
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-stone-100">
                        <span className="text-stone-500 font-medium">Active Doctor Counters:</span>
                        <span className="font-bold text-stone-800">{dept.activeStaffCount} counters</span>
                      </div>

                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-stone-100">
                        <span className="text-stone-500 font-medium">Max Service Capacity:</span>
                        <span className="font-bold text-stone-800">{dept.serviceCapacity || 30} patients</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
                    <span className="flex items-center space-x-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dept.color || '#0D9488' }} />
                      <span>Color Token</span>
                    </span>
                    <button
                      onClick={() => openEditDepartment(dept)}
                      className="text-teal-700 font-bold hover:underline"
                    >
                      Configure Settings
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: QUEUE PRIORITY RULES */}
        {activeTab === 'rules' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-sm max-w-3xl">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-[#B4F481]/50 text-[#0D231E] flex items-center justify-center">
                <Sliders className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h2 className="text-xl font-black text-[#0A1B17]">Triage Multipliers & Estimation Rules</h2>
                <p className="text-xs text-stone-500">
                  Settings directly influence the dynamic waiting-time engine across patient and staff dashboards.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveRulesConfig} className="space-y-6 text-xs">
              {/* Urgent Priority Deduction */}
              <div className="p-5 rounded-2xl bg-stone-50/70 border border-stone-200/70">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-extrabold text-sm text-stone-900">
                    Urgent Case Wait Time Deduction (%)
                  </label>
                  <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-800 font-black font-mono-num text-xs">
                    {rules.urgentWaitDeductionPercent}% Reduction
                  </span>
                </div>
                <p className="text-stone-500 text-[11px] mb-3">
                  Urgent and critical medical patients receive accelerated queue scheduling.
                </p>
                <input
                  type="range"
                  min="20"
                  max="90"
                  step="5"
                  value={rules.urgentWaitDeductionPercent}
                  onChange={(e) =>
                    setRules({ ...rules, urgentWaitDeductionPercent: Number(e.target.value) })
                  }
                  className="w-full accent-rose-600 cursor-pointer"
                />
              </div>

              {/* Moderate Priority Deduction */}
              <div className="p-5 rounded-2xl bg-stone-50/70 border border-stone-200/70">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-extrabold text-sm text-stone-900">
                    Moderate Priority Deduction (%)
                  </label>
                  <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 font-black font-mono-num text-xs">
                    {rules.moderateWaitDeductionPercent}% Reduction
                  </span>
                </div>
                <p className="text-stone-500 text-[11px] mb-3">
                  Moderate symptoms (e.g. high fever, elderly, severe pain) receive balanced prioritization.
                </p>
                <input
                  type="range"
                  min="10"
                  max="50"
                  step="5"
                  value={rules.moderateWaitDeductionPercent}
                  onChange={(e) =>
                    setRules({ ...rules, moderateWaitDeductionPercent: Number(e.target.value) })
                  }
                  className="w-full accent-amber-600 cursor-pointer"
                />
              </div>

              {/* Auto Escalation Threshold */}
              <div className="p-5 rounded-2xl bg-stone-50/70 border border-stone-200/70">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-extrabold text-sm text-stone-900">
                    Auto-Escalate Delay Threshold (Minutes)
                  </label>
                  <span className="px-3 py-1 rounded-full bg-teal-100 text-teal-800 font-black font-mono-num text-xs">
                    {rules.autoEscalateAfterMinutes} minutes
                  </span>
                </div>
                <p className="text-stone-500 text-[11px] mb-3">
                  If a routine patient waits longer than this threshold, the algorithm automatically elevates their priority.
                </p>
                <input
                  type="range"
                  min="15"
                  max="90"
                  step="5"
                  value={rules.autoEscalateAfterMinutes}
                  onChange={(e) =>
                    setRules({ ...rules, autoEscalateAfterMinutes: Number(e.target.value) })
                  }
                  className="w-full accent-teal-600 cursor-pointer"
                />
              </div>

              {/* System Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-stone-200 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-stone-900">Synthesizer Audio Chimes</p>
                    <p className="text-[11px] text-stone-400">Play tone when patient token is called</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={rules.enableSoundAlerts}
                    onChange={(e) => setRules({ ...rules, enableSoundAlerts: e.target.checked })}
                    className="w-5 h-5 accent-[#0D231E] rounded cursor-pointer"
                  />
                </div>

                <div className="p-4 rounded-2xl border border-stone-200 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-stone-900">Device Push Notifications</p>
                    <p className="text-[11px] text-stone-400">Send web notifications to patient devices</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={rules.enableDevicePush}
                    onChange={(e) => setRules({ ...rules, enableDevicePush: e.target.checked })}
                    className="w-5 h-5 accent-[#0D231E] rounded cursor-pointer"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingRules}
                  className="px-6 py-3 rounded-xl bg-[#0D231E] text-white font-extrabold text-sm hover:bg-[#13322B] transition-all flex items-center space-x-2 shadow-md disabled:opacity-50"
                >
                  <Save className="w-4 h-4 text-[#B4F481]" />
                  <span>{isSavingRules ? 'Saving Rules...' : 'Save Queue Rules'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: USER ROLES (RBAC) */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
              <div>
                <h2 className="text-xl font-black text-[#0A1B17]">Role-Based Access Control (RBAC)</h2>
                <p className="text-xs text-stone-500">
                  Assign Patients, Hospital Staff, and System Administrators with overarching control.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search user by name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0D231E]"
                />
              </div>
            </div>

            {isLoadingUsers ? (
              <div className="py-12 text-center text-xs text-stone-400">Loading user directory...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-12 text-center text-xs text-stone-400">No users found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 border-b border-stone-200/60 text-stone-500 uppercase font-bold">
                    <tr>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Current Role</th>
                      <th className="py-3 px-4 text-right">Role Assignment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredUsers.map((u) => {
                      const isMasterAdmin = u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

                      return (
                        <tr key={u.uid} className="hover:bg-stone-50/50">
                          <td className="py-3.5 px-4 font-bold text-stone-900">{u.name || 'Unnamed'}</td>
                          <td className="py-3.5 px-4 font-mono text-stone-600 text-[11px]">{u.email}</td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                u.role === 'admin'
                                  ? 'bg-[#0D231E] text-[#B4F481]'
                                  : u.role === 'staff'
                                  ? 'bg-teal-100 text-teal-800'
                                  : 'bg-stone-100 text-stone-700'
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {isMasterAdmin ? (
                              <span className="text-[10px] font-bold text-stone-400 italic">
                                Master Admin
                              </span>
                            ) : (
                              <select
                                value={u.role}
                                onChange={(e) => handleUpdateUserRole(u, e.target.value as UserRole)}
                                className="px-2.5 py-1.5 rounded-xl border border-stone-200 text-xs font-bold text-stone-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#0D231E]"
                              >
                                <option value="patient">Patient</option>
                                <option value="staff">Hospital Staff</option>
                                <option value="admin">Administrator</option>
                              </select>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* DEPARTMENT ADD/EDIT MODAL */}
        {isDeptModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-stone-200">
              <h3 className="text-xl font-black text-[#0A1B17] mb-1">
                {editingDept ? 'Edit Department' : 'Add New Department'}
              </h3>
              <p className="text-xs text-stone-500 mb-6">
                Define consultation service benchmarks and staffing counters.
              </p>

              <form onSubmit={handleSaveDepartment} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Department Name</label>
                  <input
                    type="text"
                    required
                    value={deptName}
                    onChange={(e) => setDeptName(e.target.value)}
                    placeholder="e.g. Neurology"
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D231E]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Code Prefix</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={deptCode}
                      onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
                      placeholder="e.g. NEURO"
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0D231E]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      Avg Consultation (min)
                    </label>
                    <input
                      type="number"
                      required
                      min="3"
                      max="120"
                      value={deptAvgMinutes}
                      onChange={(e) => setDeptAvgMinutes(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D231E]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Active Counters</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="20"
                      value={deptStaffCount}
                      onChange={(e) => setDeptStaffCount(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D231E]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Max Capacity</label>
                    <input
                      type="number"
                      required
                      min="5"
                      max="150"
                      value={deptCapacity}
                      onChange={(e) => setDeptCapacity(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D231E]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Theme Tag Color</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={deptColor}
                      onChange={(e) => setDeptColor(e.target.value)}
                      className="w-10 h-10 rounded-xl border border-stone-200 cursor-pointer"
                    />
                    <span className="font-mono text-stone-600">{deptColor}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsDeptModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-stone-200 font-bold text-stone-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#0D231E] text-white font-bold"
                  >
                    Save Department
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
