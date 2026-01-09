
import { Employee, Shift, AttendanceLog, ShiftAssignment, AttendanceRequest, Holiday } from '../types';
import { MOCK_SHIFTS, MOCK_EMPLOYEES, MOCK_LOGS, MOCK_SCHEDULES } from '../constants';

/**
 * Cấu hình ứng dụng
 */
export const APP_CONFIG = {
    // Tự động nhận diện URL backend dựa trên môi trường
    API_BASE_URL: window.location.hostname === 'localhost' ? 'http://localhost:3000/api/v1' : '/api/v1',
    USE_SERVER_API: false, // Để false để vẫn dùng LocalStorage cho demo cho đến khi bạn code xong Backend DB
    API_TIMEOUT: 15000,
    TOKEN_KEY: 'hr_pro_auth_token'
};

const KEYS = {
  EMPLOYEES: 'hr_employees',
  SHIFTS: 'hr_shifts',
  LOGS: 'hr_logs',
  SCHEDULES: 'hr_schedules',
  REQUESTS: 'hr_requests',
  HOLIDAYS: 'hr_holidays',
};

const getFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (error) {
    console.error(`Error reading from storage key ${key}`, error);
    return defaultValue;
  }
};

const saveToStorage = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving to storage key ${key}`, error);
  }
};

export const storage = {
  getEmployees: async (): Promise<Employee[]> => {
    return getFromStorage(KEYS.EMPLOYEES, MOCK_EMPLOYEES);
  },
  saveEmployee: async (emp: Employee): Promise<Employee> => {
    const employees = await storage.getEmployees();
    const index = employees.findIndex(e => e.id === emp.id);
    if (index !== -1) {
      employees[index] = emp;
    } else {
      employees.push(emp);
    }
    saveToStorage(KEYS.EMPLOYEES, employees);
    return emp;
  },
  deleteEmployee: async (id: string): Promise<void> => {
    const employees = await storage.getEmployees();
    saveToStorage(KEYS.EMPLOYEES, employees.filter(e => e.id !== id));
  },

  getShifts: async (): Promise<Shift[]> => {
    return getFromStorage(KEYS.SHIFTS, MOCK_SHIFTS);
  },
  saveShift: async (shift: Shift): Promise<Shift> => {
    const shifts = await storage.getShifts();
    const index = shifts.findIndex(s => s.id === shift.id);
    if (index !== -1) {
      shifts[index] = shift;
    } else {
      shifts.push(shift);
    }
    saveToStorage(KEYS.SHIFTS, shifts);
    return shift;
  },
  deleteShift: async (id: string): Promise<void> => {
    const shifts = await storage.getShifts();
    saveToStorage(KEYS.SHIFTS, shifts.filter(s => s.id !== id));
  },

  getLogs: async (): Promise<AttendanceLog[]> => {
    return getFromStorage(KEYS.LOGS, MOCK_LOGS);
  },
  addSingleLog: async (log: AttendanceLog): Promise<void> => {
    const logs = await storage.getLogs();
    logs.push(log);
    saveToStorage(KEYS.LOGS, logs);
  },
  saveLogs: async (newLogs: AttendanceLog[]): Promise<void> => {
    const logs = await storage.getLogs();
    saveToStorage(KEYS.LOGS, [...logs, ...newLogs]);
  },

  getSchedules: async (): Promise<ShiftAssignment[]> => {
    return getFromStorage(KEYS.SCHEDULES, MOCK_SCHEDULES);
  },
  saveSchedules: async (schedules: ShiftAssignment[]): Promise<void> => {
    saveToStorage(KEYS.SCHEDULES, schedules);
  },

  getRequests: async (): Promise<AttendanceRequest[]> => {
    return getFromStorage(KEYS.REQUESTS, []);
  },
  saveRequests: async (requests: AttendanceRequest[]): Promise<void> => {
    saveToStorage(KEYS.REQUESTS, requests);
  },

  getHolidays: async (): Promise<Holiday[]> => {
    return getFromStorage(KEYS.HOLIDAYS, []);
  },
  saveHolidays: async (holidays: Holiday[]): Promise<void> => {
    saveToStorage(KEYS.HOLIDAYS, holidays);
  },

  clearAllData: async (): Promise<void> => {
    localStorage.removeItem(KEYS.EMPLOYEES);
    localStorage.removeItem(KEYS.SHIFTS);
    localStorage.removeItem(KEYS.LOGS);
    localStorage.removeItem(KEYS.SCHEDULES);
    localStorage.removeItem(KEYS.REQUESTS);
    localStorage.removeItem(KEYS.HOLIDAYS);
  }
};
