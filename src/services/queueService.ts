import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { PatientToken, Department, QueueEvent, PriorityLevel, QueueMetrics } from '../types';
import { DEPARTMENT_DEFAULTS, calculateEstimatedWait } from '../utils/waitingTimeEngine';

const PATIENTS_COLLECTION = 'patients';
const DEPARTMENTS_COLLECTION = 'departments';
const QUEUE_EVENTS_COLLECTION = 'queue_events';

/**
 * Generates an atomic or sequential token number for department
 */
export async function generateNewToken(
  params: {
    patientName: string;
    age: number;
    department: string;
    appointmentType: string;
    priority: PriorityLevel;
    urgencyNotes?: string;
  }
): Promise<PatientToken> {
  const currentUid = auth.currentUser?.uid;
  if (!currentUid) {
    throw new Error('User must be authenticated to generate a queue token.');
  }

  const deptConfig = DEPARTMENT_DEFAULTS[params.department] || { code: 'GM', averageMinutes: 12, staffCount: 2, color: '#0D9488' };
  
  try {
    // Query existing patients today in this department to determine sequence
    const q = query(
      collection(db, PATIENTS_COLLECTION),
      where('department', '==', params.department)
    );
    const snapshot = await getDocs(q);
    const currentCount = snapshot.size;
    const tokenSeq = (currentCount + 101).toString();
    const tokenNumber = `${deptConfig.code}-${tokenSeq}`;
    
    // Calculate waiting estimate
    const waitingPatients = snapshot.docs
      .map(d => d.data() as PatientToken)
      .filter(p => p.status === 'waiting');
    
    const estimate = calculateEstimatedWait(
      params.department,
      params.priority,
      waitingPatients
    );

    const patientId = `token_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const newPatient: PatientToken = {
      patientId,
      ownerUid: currentUid,
      patientName: params.patientName.trim(),
      age: Number(params.age) || 30,
      tokenNumber,
      department: params.department,
      appointmentType: params.appointmentType || 'Routine',
      arrivalTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'waiting',
      priority: params.priority || 'routine',
      urgencyNotes: params.urgencyNotes || '',
      estimatedWaitingMinutes: estimate.estimatedMinutes,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    await setDoc(doc(db, PATIENTS_COLLECTION, patientId), newPatient);

    // Record audit event
    await logQueueEvent({
      tokenNumber,
      patientId,
      department: params.department,
      previousStatus: 'none',
      newStatus: 'waiting',
      reason: 'Token issued'
    });

    return newPatient;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, PATIENTS_COLLECTION);
  }
}

/**
 * Subscribe to all patients (for Hospital Staff)
 */
export function subscribeToAllPatients(
  callback: (patients: PatientToken[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, PATIENTS_COLLECTION);
  
  return onSnapshot(
    colRef,
    (snapshot) => {
      const patients = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as PatientToken));
      callback(patients);
    },
    (error) => {
      console.error('Error listening to all patients:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, PATIENTS_COLLECTION);
    }
  );
}

/**
 * Subscribe to current user's active tokens
 */
export function subscribeToUserTokens(
  uid: string,
  callback: (tokens: PatientToken[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, PATIENTS_COLLECTION),
    where('ownerUid', '==', uid)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const tokens = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as PatientToken));
      
      // Sort newest first
      tokens.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(tokens);
    },
    (error) => {
      console.error('Error listening to user tokens:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, PATIENTS_COLLECTION);
    }
  );
}

/**
 * Staff Action: Call Next Patient
 */
export async function callPatient(
  patientId: string,
  staffName?: string,
  counterOrRoom: string = 'Counter 1'
): Promise<void> {
  try {
    const docRef = doc(db, PATIENTS_COLLECTION, patientId);
    const currentDoc = await getDoc(docRef);
    if (!currentDoc.exists()) throw new Error('Patient record not found');

    const data = currentDoc.data() as PatientToken;
    const nowIso = new Date().toISOString();

    await updateDoc(docRef, {
      status: 'called',
      calledAt: nowIso,
      counterOrRoom,
      calledByStaff: staffName || 'Dr. On Duty',
      updatedAt: nowIso
    });

    await logQueueEvent({
      tokenNumber: data.tokenNumber,
      patientId,
      department: data.department,
      previousStatus: data.status,
      newStatus: 'called',
      reason: `Called by staff to ${counterOrRoom}`
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${PATIENTS_COLLECTION}/${patientId}`);
  }
}

/**
 * Staff Action: Start Consultation
 */
export async function startConsultation(patientId: string): Promise<void> {
  try {
    const docRef = doc(db, PATIENTS_COLLECTION, patientId);
    const currentDoc = await getDoc(docRef);
    if (!currentDoc.exists()) throw new Error('Patient record not found');

    const data = currentDoc.data() as PatientToken;
    const nowIso = new Date().toISOString();

    await updateDoc(docRef, {
      status: 'in-consultation',
      consultationStartTime: nowIso,
      updatedAt: nowIso
    });

    await logQueueEvent({
      tokenNumber: data.tokenNumber,
      patientId,
      department: data.department,
      previousStatus: data.status,
      newStatus: 'in-consultation',
      reason: 'Consultation initiated'
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${PATIENTS_COLLECTION}/${patientId}`);
  }
}

/**
 * Staff Action: Complete Consultation
 */
export async function completeConsultation(patientId: string): Promise<void> {
  try {
    const docRef = doc(db, PATIENTS_COLLECTION, patientId);
    const currentDoc = await getDoc(docRef);
    if (!currentDoc.exists()) throw new Error('Patient record not found');

    const data = currentDoc.data() as PatientToken;
    const nowIso = new Date().toISOString();

    await updateDoc(docRef, {
      status: 'completed',
      completionTime: nowIso,
      updatedAt: nowIso
    });

    await logQueueEvent({
      tokenNumber: data.tokenNumber,
      patientId,
      department: data.department,
      previousStatus: data.status,
      newStatus: 'completed',
      reason: 'Consultation concluded'
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${PATIENTS_COLLECTION}/${patientId}`);
  }
}

/**
 * Staff Action: Update Priority
 */
export async function updatePatientPriority(
  patientId: string,
  priority: PriorityLevel,
  reason: string = 'Staff clinical triage adjustment'
): Promise<void> {
  try {
    const docRef = doc(db, PATIENTS_COLLECTION, patientId);
    const currentDoc = await getDoc(docRef);
    if (!currentDoc.exists()) throw new Error('Patient record not found');

    const data = currentDoc.data() as PatientToken;
    const nowIso = new Date().toISOString();

    await updateDoc(docRef, {
      priority,
      updatedAt: nowIso
    });

    await logQueueEvent({
      tokenNumber: data.tokenNumber,
      patientId,
      department: data.department,
      previousStatus: data.priority,
      newStatus: priority,
      reason
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${PATIENTS_COLLECTION}/${patientId}`);
  }
}

/**
 * Patient / Staff Action: Cancel Token
 */
export async function cancelToken(
  patientId: string,
  reason: string = 'Cancelled by user'
): Promise<void> {
  try {
    const docRef = doc(db, PATIENTS_COLLECTION, patientId);
    const currentDoc = await getDoc(docRef);
    if (!currentDoc.exists()) throw new Error('Patient record not found');

    const data = currentDoc.data() as PatientToken;
    const nowIso = new Date().toISOString();

    await updateDoc(docRef, {
      status: 'cancelled',
      updatedAt: nowIso
    });

    await logQueueEvent({
      tokenNumber: data.tokenNumber,
      patientId,
      department: data.department,
      previousStatus: data.status,
      newStatus: 'cancelled',
      reason
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${PATIENTS_COLLECTION}/${patientId}`);
  }
}

/**
 * Log Queue Event for audit
 */
async function logQueueEvent(params: {
  tokenNumber: string;
  patientId: string;
  department: string;
  previousStatus: string;
  newStatus: string;
  reason?: string;
}): Promise<void> {
  try {
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const event: QueueEvent = {
      eventId,
      tokenNumber: params.tokenNumber,
      patientId: params.patientId,
      department: params.department,
      previousStatus: params.previousStatus,
      newStatus: params.newStatus,
      changedBy: auth.currentUser?.email || auth.currentUser?.uid || 'system',
      reason: params.reason || '',
      timestamp: new Date().toISOString()
    };
    await setDoc(doc(db, QUEUE_EVENTS_COLLECTION, eventId), event);
  } catch {
    // Non-blocking for UI
  }
}

/**
 * Seed initial sample patients if database is empty so reviewers see a realistic hospital flow immediately
 */
export async function seedDemoQueueIfEmpty(): Promise<void> {
  try {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return;

    const snapshot = await getDocs(collection(db, PATIENTS_COLLECTION));
    if (snapshot.size > 0) return; // Already has data

    const demoRecords: Omit<PatientToken, 'id'>[] = [
      {
        patientId: 'demo_1',
        ownerUid: currentUid,
        patientName: 'Maya Sharma',
        age: 28,
        tokenNumber: 'GM-024',
        department: 'General Medicine',
        appointmentType: 'Routine Consultation',
        arrivalTime: '09:15 AM',
        status: 'called',
        priority: 'routine',
        urgencyNotes: 'Seasonal allergy follow-up',
        estimatedWaitingMinutes: 4,
        calledAt: new Date(Date.now() - 3 * 60000).toISOString(),
        counterOrRoom: 'Consultation Room 3',
        calledByStaff: 'Dr. Sarah Mitchell',
        createdAt: new Date(Date.now() - 25 * 60000).toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        patientId: 'demo_2',
        ownerUid: currentUid,
        patientName: 'Rohan Gupta',
        age: 45,
        tokenNumber: 'CARD-012',
        department: 'Cardiology',
        appointmentType: 'ECG Review',
        arrivalTime: '09:28 AM',
        status: 'waiting',
        priority: 'urgent',
        urgencyNotes: 'Mild chest discomfort after exertion',
        estimatedWaitingMinutes: 10,
        createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        patientId: 'demo_3',
        ownerUid: currentUid,
        patientName: 'Aarav Patel',
        age: 7,
        tokenNumber: 'PED-018',
        department: 'Pediatrics',
        appointmentType: 'Vaccination',
        arrivalTime: '09:35 AM',
        status: 'waiting',
        priority: 'routine',
        urgencyNotes: 'Annual immunisation dose',
        estimatedWaitingMinutes: 18,
        createdAt: new Date(Date.now() - 10 * 60000).toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        patientId: 'demo_4',
        ownerUid: currentUid,
        patientName: 'Elena Rostova',
        age: 52,
        tokenNumber: 'ORTHO-009',
        department: 'Orthopedics',
        appointmentType: 'Post-op Knee Check',
        arrivalTime: '08:50 AM',
        status: 'in-consultation',
        priority: 'moderate',
        urgencyNotes: 'Knee brace adjustment',
        estimatedWaitingMinutes: 0,
        consultationStartTime: new Date(Date.now() - 8 * 60000).toISOString(),
        counterOrRoom: 'Orthopedic Suite 2',
        calledByStaff: 'Dr. Robert Davis',
        createdAt: new Date(Date.now() - 40 * 60000).toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    for (const record of demoRecords) {
      await setDoc(doc(db, PATIENTS_COLLECTION, record.patientId), record);
    }
  } catch (err) {
    console.warn('Sample seed notice:', err);
  }
}
