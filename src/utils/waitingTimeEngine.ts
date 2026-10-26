import { PatientToken, Department, PriorityLevel, QueueRuleConfig } from '../types';

export interface WaitEstimateResult {
  estimatedMinutes: number;
  patientsAhead: number;
  activeCounters: number;
  averageServiceMinutes: number;
  priorityAdjustmentMinutes: number;
  isAutoEscalated?: boolean;
  explanation: string;
}

// Department baseline average consultation times in minutes
export const DEPARTMENT_DEFAULTS: Record<string, { averageMinutes: number; staffCount: number; code: string; color: string }> = {
  'General Medicine': { averageMinutes: 12, staffCount: 3, code: 'GM', color: '#0D9488' },
  'Pediatrics': { averageMinutes: 15, staffCount: 2, code: 'PED', color: '#6366F1' },
  'Cardiology': { averageMinutes: 20, staffCount: 2, code: 'CARD', color: '#EF4444' },
  'Orthopedics': { averageMinutes: 18, staffCount: 2, code: 'ORTHO', color: '#F59E0B' },
  'Dermatology': { averageMinutes: 14, staffCount: 1, code: 'DERM', color: '#EC4899' },
  'Diagnostics': { averageMinutes: 8, staffCount: 2, code: 'DIAG', color: '#10B981' }
};

/**
 * Calculates waiting time based on queue depth, available counters, and configurable priority weighting.
 */
export function calculateEstimatedWait(
  departmentName: string,
  patientPriority: PriorityLevel,
  waitingPatientsInDepartment: PatientToken[],
  targetPatientToken?: string,
  departmentInfo?: Department,
  rules?: QueueRuleConfig
): WaitEstimateResult {
  const deptConfig = DEPARTMENT_DEFAULTS[departmentName] || {
    averageMinutes: 12,
    staffCount: 2,
    code: 'GEN',
    color: '#0D9488'
  };

  const avgMinutes = departmentInfo?.averageServiceMinutes || deptConfig.averageMinutes;
  const activeCounters = Math.max(1, departmentInfo?.activeStaffCount || deptConfig.staffCount);

  // Configurable priority deductions (defaults: 60% urgent, 25% moderate)
  const urgentPercent = (rules?.urgentWaitDeductionPercent ?? 60) / 100;
  const moderatePercent = (rules?.moderateWaitDeductionPercent ?? 25) / 100;
  const autoEscalateMins = rules?.autoEscalateAfterMinutes ?? 40;

  // Sort queue by priority weight (urgent first) then arrival time
  const priorityWeight: Record<PriorityLevel, number> = {
    urgent: 3,
    moderate: 2,
    routine: 1
  };

  const sortedQueue = [...waitingPatientsInDepartment].sort((a, b) => {
    const pA = priorityWeight[a.priority || 'routine'];
    const pB = priorityWeight[b.priority || 'routine'];
    if (pB !== pA) return pB - pA;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  let patientsAhead = 0;
  let targetPatient: PatientToken | undefined;
  if (targetPatientToken) {
    const index = sortedQueue.findIndex(p => p.tokenNumber === targetPatientToken);
    patientsAhead = index >= 0 ? index : sortedQueue.length;
    targetPatient = sortedQueue.find(p => p.tokenNumber === targetPatientToken);
  } else {
    patientsAhead = sortedQueue.length;
  }

  // Base calculation: (patients ahead * avg service time) / active counters
  let baseWait = Math.round((patientsAhead * avgMinutes) / activeCounters);

  // Check if patient has been waiting longer than autoEscalateAfterMinutes
  let isAutoEscalated = false;
  if (targetPatient?.createdAt) {
    const minutesWaiting = (Date.now() - new Date(targetPatient.createdAt).getTime()) / 60000;
    if (minutesWaiting >= autoEscalateMins && targetPatient.priority === 'routine') {
      isAutoEscalated = true;
    }
  }

  // Configured priority adjustment
  let priorityAdjustmentMinutes = 0;
  if (patientPriority === 'urgent') {
    priorityAdjustmentMinutes = -Math.min(baseWait, Math.round(baseWait * urgentPercent));
    baseWait = Math.max(3, baseWait + priorityAdjustmentMinutes);
  } else if (patientPriority === 'moderate' || isAutoEscalated) {
    priorityAdjustmentMinutes = -Math.min(baseWait, Math.round(baseWait * moderatePercent));
    baseWait = Math.max(6, baseWait + priorityAdjustmentMinutes);
  } else {
    baseWait = Math.max(5, baseWait);
  }

  const explanation = patientsAhead === 0 
    ? 'You are next in line! Expected to be called shortly.'
    : `~${baseWait} min (${patientsAhead} ahead across ${activeCounters} counter${activeCounters === 1 ? '' : 's'})`;

  return {
    estimatedMinutes: baseWait,
    patientsAhead,
    activeCounters,
    averageServiceMinutes: avgMinutes,
    priorityAdjustmentMinutes,
    isAutoEscalated,
    explanation
  };
}

/**
 * Format minutes into readable time representation
 */
export function formatWaitTime(minutes: number): string {
  if (minutes <= 0) return 'Immediate';
  if (minutes < 60) return `~${minutes} min`;
  const hrs = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return `~${hrs}h ${remainingMins > 0 ? `${remainingMins}m` : ''}`.trim();
}
