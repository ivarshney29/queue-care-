import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { Department, QueueRuleConfig, UserProfile, UserRole } from '../types';
import { DEPARTMENT_DEFAULTS } from '../utils/waitingTimeEngine';

const DEPARTMENTS_COLLECTION = 'departments';
const SYSTEM_CONFIG_COLLECTION = 'system_config';
const USERS_COLLECTION = 'users';

export const DEFAULT_QUEUE_RULES: QueueRuleConfig = {
  configId: 'queue_rules',
  urgentWaitDeductionPercent: 60,
  moderateWaitDeductionPercent: 25,
  autoEscalateAfterMinutes: 40,
  maxPatientsPerCounter: 15,
  enableSoundAlerts: true,
  enableDevicePush: true,
  updatedAt: new Date().toISOString(),
  updatedBy: 'system'
};

/**
 * Subscribe to departments in real time
 */
export function subscribeToDepartments(
  callback: (departments: Department[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, DEPARTMENTS_COLLECTION);
  return onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        // Bootstrap defaults if empty
        await bootstrapDefaultDepartments();
        return;
      }
      const depts = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() } as Department)
      );
      callback(depts);
    },
    (err) => {
      console.error('Error fetching departments:', err);
      if (onError) onError(err);
      handleFirestoreError(err, OperationType.GET, DEPARTMENTS_COLLECTION);
    }
  );
}

/**
 * Bootstrap default departments into Firestore if empty
 */
export async function bootstrapDefaultDepartments(): Promise<Department[]> {
  const bootstrapped: Department[] = [];
  try {
    for (const [name, conf] of Object.entries(DEPARTMENT_DEFAULTS)) {
      const deptId = `dept_${conf.code.toLowerCase()}`;
      const newDept: Department = {
        departmentId: deptId,
        name,
        code: conf.code,
        averageServiceMinutes: conf.averageMinutes,
        activeStaffCount: conf.staffCount,
        serviceCapacity: conf.staffCount * 12,
        color: conf.color
      };
      await setDoc(doc(db, DEPARTMENTS_COLLECTION, deptId), newDept);
      bootstrapped.push(newDept);
    }
  } catch (err) {
    console.warn('Bootstrap notice:', err);
  }
  return bootstrapped;
}

/**
 * Add or Update Department
 */
export async function saveDepartment(dept: Department): Promise<void> {
  const deptId = dept.departmentId || `dept_${dept.code.toLowerCase()}_${Date.now()}`;
  try {
    const docRef = doc(db, DEPARTMENTS_COLLECTION, deptId);
    await setDoc(docRef, {
      ...dept,
      departmentId: deptId
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${DEPARTMENTS_COLLECTION}/${deptId}`);
  }
}

/**
 * Delete a Department
 */
export async function removeDepartment(departmentId: string): Promise<void> {
  try {
    const docRef = doc(db, DEPARTMENTS_COLLECTION, departmentId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${DEPARTMENTS_COLLECTION}/${departmentId}`);
  }
}

/**
 * Subscribe to Queue Rules configuration
 */
export function subscribeToQueueRules(
  callback: (rules: QueueRuleConfig) => void
): Unsubscribe {
  const docRef = doc(db, SYSTEM_CONFIG_COLLECTION, 'queue_rules');
  return onSnapshot(
    docRef,
    async (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as QueueRuleConfig);
      } else {
        // Initialize default rules
        try {
          await setDoc(docRef, DEFAULT_QUEUE_RULES);
          callback(DEFAULT_QUEUE_RULES);
        } catch {
          callback(DEFAULT_QUEUE_RULES);
        }
      }
    },
    (err) => {
      console.warn('Queue rules read notice:', err);
      callback(DEFAULT_QUEUE_RULES);
    }
  );
}

/**
 * Save Queue Rules configuration
 */
export async function saveQueueRules(rules: Partial<QueueRuleConfig>): Promise<void> {
  try {
    const docRef = doc(db, SYSTEM_CONFIG_COLLECTION, 'queue_rules');
    const updated: QueueRuleConfig = {
      ...DEFAULT_QUEUE_RULES,
      ...rules,
      configId: 'queue_rules',
      updatedAt: new Date().toISOString(),
      updatedBy: auth.currentUser?.email || auth.currentUser?.uid || 'admin'
    };
    await setDoc(docRef, updated, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${SYSTEM_CONFIG_COLLECTION}/queue_rules`);
  }
}

/**
 * Fetch all users (for Admin User Management)
 */
export async function fetchAllUsers(): Promise<UserProfile[]> {
  try {
    const snap = await getDocs(collection(db, USERS_COLLECTION));
    return snap.docs.map((d) => d.data() as UserProfile);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, USERS_COLLECTION);
  }
}

/**
 * Update user role (Admin action)
 */
export async function setUserRole(targetUid: string, newRole: UserRole): Promise<void> {
  try {
    const docRef = doc(db, USERS_COLLECTION, targetUid);
    await updateDoc(docRef, { role: newRole });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${USERS_COLLECTION}/${targetUid}`);
  }
}
