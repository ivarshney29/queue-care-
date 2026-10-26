export type UserRole = 'patient' | 'staff' | 'admin';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  role: UserRole;
  department?: string;
  createdAt: string;
}

export type QueueStatus = 'waiting' | 'called' | 'in-consultation' | 'completed' | 'cancelled';
export type PriorityLevel = 'routine' | 'moderate' | 'urgent';

export interface PatientToken {
  id?: string;
  patientId: string;
  ownerUid: string;
  patientName: string;
  age: number;
  tokenNumber: string;
  department: string;
  appointmentType: string;
  arrivalTime: string;
  status: QueueStatus;
  priority: PriorityLevel;
  urgencyNotes?: string;
  estimatedWaitingMinutes: number;
  calledAt?: string;
  consultationStartTime?: string;
  completionTime?: string;
  counterOrRoom?: string;
  calledByStaff?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  id?: string;
  departmentId: string;
  name: string;
  code: string;
  serviceCapacity: number;
  averageServiceMinutes: number;
  activeStaffCount: number;
  color?: string;
  currentServingToken?: string;
  waitingCount?: number;
}

export interface QueueRuleConfig {
  configId: string;
  urgentWaitDeductionPercent: number; // e.g. 60%
  moderateWaitDeductionPercent: number; // e.g. 25%
  autoEscalateAfterMinutes: number; // e.g. 40 mins
  maxPatientsPerCounter: number; // e.g. 15
  enableSoundAlerts: boolean;
  enableDevicePush: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface QueueEvent {
  id?: string;
  eventId: string;
  tokenNumber: string;
  patientId: string;
  department: string;
  previousStatus: string;
  newStatus: string;
  changedBy: string;
  reason?: string;
  timestamp: string;
}

export interface QueueMetrics {
  totalRegistered: number;
  waitingCount: number;
  inConsultationCount: number;
  completedCount: number;
  urgentCount: number;
  averageWaitTimeMinutes: number;
}
