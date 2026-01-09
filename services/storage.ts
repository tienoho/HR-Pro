/**
 * Storage Service for HR-Pro
 * Provides data access layer - can switch between localStorage and API
 */

import { Employee, Shift, AttendanceLog, ShiftAssignment, AttendanceRequest, Holiday } from '../types';
import { 
  ApiResponse, 
  PaginatedResponse,
  EmployeeApiModel,
  ShiftApiModel,
  AttendanceLogApiModel,
  HolidayApiModel,
  BulkImportResult,
  CreateEmployeeRequest,
  CreateShiftRequest,
  CreateAttendanceLogRequest,
  CreateHolidayRequest,
  ScheduleAssignmentApiModel,
  AttendanceRequestApiModel
} from '../types/api';
import { apiClient } from './apiClient';
import { MOCK_SHIFTS, MOCK_EMPLOYEES, MOCK_LOGS, MOCK_SCHEDULES } from '../constants';

// ============ Configuration ============

export const APP_CONFIG = {
  // Set to true to use real API, false to use localStorage for development
  // Logic: Use server API unless VITE_USE_MOCK_DATA is explicitly set to 'true'
  USE_SERVER_API: import.meta.env.VITE_USE_MOCK_DATA !== 'true',
};

// ============ LocalStorage Keys (Fallback) ============

const KEYS = {
  EMPLOYEES: 'hr_employees',
  SHIFTS: 'hr_shifts',
  LOGS: 'hr_logs',
  SCHEDULES: 'hr_schedules',
  REQUESTS: 'hr_requests',
  HOLIDAYS: 'hr_holidays',
};

// ============ LocalStorage Helpers (Fallback) ============

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

// ============ Type Mappers ============

const mapApiEmployeeToLocal = (emp: EmployeeApiModel): Employee => ({
  id: emp.id,
  code: emp.code,
  timekeepingId: emp.timekeepingId,
  name: emp.name,
  department: emp.department,
  position: emp.position,
  joinDate: emp.joinDate,
  status: emp.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
  defaultShiftId: emp.defaultShiftId || '',
});

const mapApiShiftToLocal = (shift: ShiftApiModel): Shift => ({
  id: shift.id,
  code: shift.code,
  name: shift.name,
  startTime: shift.startTime,
  endTime: shift.endTime,
  breakStart: shift.breakStart || '12:00',
  breakEnd: shift.breakEnd || '13:00',
  toleranceMinutes: shift.toleranceMinutes,
  isOvernight: shift.isOvernight,
  multiplier: shift.multiplier,
  color: shift.color || 'bg-blue-100 text-blue-800 border-blue-200',
  roundingMinutes: shift.roundingMinutes,
  effectiveFrom: shift.effectiveFrom,
  workDays: shift.workDays,
  isSaturdayHalfDay: shift.isSaturdayHalfDay,
});

const mapApiLogToLocal = (log: AttendanceLogApiModel): AttendanceLog => ({
  id: log.id,
  timekeepingId: log.timekeepingId,
  timestamp: log.timestamp,
  source: log.source,
  isIgnored: log.isIgnored,
});

const mapApiHolidayToLocal = (holiday: HolidayApiModel): Holiday => ({
  id: holiday.id,
  date: holiday.date,
  name: holiday.name,
});

const mapApiRequestToLocal = (req: AttendanceRequestApiModel): AttendanceRequest => {
  // Cast string to Enum as values match
  return {
    id: req.id,
    employeeId: req.employeeId,
    type: req.type as any,
    startDate: req.startDate,
    endDate: req.endDate || req.startDate,
    isFullDay: req.isFullDay,
    startTime: req.startTime,
    endTime: req.endTime,
    reason: req.reason,
    status: req.status as any,
  };
};

// ============ Storage Service ============

export const storage = {
  // ============ EMPLOYEES ============

  getEmployees: async (): Promise<Employee[]> => {
    if (!APP_CONFIG.USE_SERVER_API) {
      return getFromStorage(KEYS.EMPLOYEES, MOCK_EMPLOYEES);
    }

    try {
      const response = await apiClient.get<PaginatedResponse<EmployeeApiModel>>('/employees?limit=1000');
      return response.data.map(mapApiEmployeeToLocal);
    } catch (error) {
      console.error('Failed to fetch employees from API', error);
      return getFromStorage(KEYS.EMPLOYEES, MOCK_EMPLOYEES);
    }
  },

  saveEmployee: async (emp: Employee): Promise<Employee> => {
    if (!APP_CONFIG.USE_SERVER_API) {
      const employees = await storage.getEmployees();
      const index = employees.findIndex(e => e.id === emp.id);
      if (index !== -1) {
        employees[index] = emp;
      } else {
        employees.push(emp);
      }
      saveToStorage(KEYS.EMPLOYEES, employees);
      return emp;
    }

    try {
      // Check if employee exists (update) or is new (create)
      const isNew = !emp.id || emp.id.startsWith(Date.now().toString().slice(0, 5));
      
      if (isNew) {
        const createData: CreateEmployeeRequest = {
          code: emp.code,
          timekeepingId: emp.timekeepingId,
          name: emp.name,
          department: emp.department,
          position: emp.position,
          joinDate: emp.joinDate,
          status: emp.status,
          defaultShiftId: emp.defaultShiftId,
        };
        const response = await apiClient.post<ApiResponse<EmployeeApiModel>>('/employees', createData);
        return mapApiEmployeeToLocal(response.data);
      } else {
        const response = await apiClient.put<ApiResponse<EmployeeApiModel>>(`/employees/${emp.id}`, emp);
        return mapApiEmployeeToLocal(response.data);
      }
    } catch (error) {
      console.error('Failed to save employee', error);
      throw error;
    }
  },

  deleteEmployee: async (id: string): Promise<void> => {
    if (!APP_CONFIG.USE_SERVER_API) {
      const employees = await storage.getEmployees();
      saveToStorage(KEYS.EMPLOYEES, employees.filter(e => e.id !== id));
      return;
    }

    await apiClient.delete(`/employees/${id}`);
  },

  // ============ SHIFTS ============

  getShifts: async (): Promise<Shift[]> => {
    if (!APP_CONFIG.USE_SERVER_API) {
      return getFromStorage(KEYS.SHIFTS, MOCK_SHIFTS);
    }

    try {
      const response = await apiClient.get<PaginatedResponse<ShiftApiModel>>('/shifts?limit=100');
      return response.data.map(mapApiShiftToLocal);
    } catch (error) {
      console.error('Failed to fetch shifts from API', error);
      return getFromStorage(KEYS.SHIFTS, MOCK_SHIFTS);
    }
  },

  saveShift: async (shift: Shift): Promise<Shift> => {
    if (!APP_CONFIG.USE_SERVER_API) {
      const shifts = await storage.getShifts();
      const index = shifts.findIndex(s => s.id === shift.id);
      if (index !== -1) {
        shifts[index] = shift;
      } else {
        shifts.push(shift);
      }
      saveToStorage(KEYS.SHIFTS, shifts);
      return shift;
    }

    try {
      const isNew = !shift.id || shift.id.startsWith(Date.now().toString().slice(0, 5));
      
      if (isNew) {
        const createData: CreateShiftRequest = {
          code: shift.code,
          name: shift.name,
          startTime: shift.startTime,
          endTime: shift.endTime,
          breakStart: shift.breakStart,
          breakEnd: shift.breakEnd,
          toleranceMinutes: shift.toleranceMinutes,
          roundingMinutes: shift.roundingMinutes,
          multiplier: shift.multiplier,
          effectiveFrom: shift.effectiveFrom,
          workDays: shift.workDays,
          isSaturdayHalfDay: shift.isSaturdayHalfDay,
          isOvernight: shift.isOvernight,
          color: shift.color,
        };
        const response = await apiClient.post<ApiResponse<ShiftApiModel>>('/shifts', createData);
        return mapApiShiftToLocal(response.data);
      } else {
        const response = await apiClient.put<ApiResponse<ShiftApiModel>>(`/shifts/${shift.id}`, shift);
        return mapApiShiftToLocal(response.data);
      }
    } catch (error) {
      console.error('Failed to save shift', error);
      throw error;
    }
  },

  deleteShift: async (id: string): Promise<void> => {
    if (!APP_CONFIG.USE_SERVER_API) {
      const shifts = await storage.getShifts();
      saveToStorage(KEYS.SHIFTS, shifts.filter(s => s.id !== id));
      return;
    }

    await apiClient.delete(`/shifts/${id}`);
  },

  // ============ ATTENDANCE LOGS ============

  getLogs: async (): Promise<AttendanceLog[]> => {
    if (!APP_CONFIG.USE_SERVER_API) {
      return getFromStorage(KEYS.LOGS, MOCK_LOGS);
    }

    try {
      const response = await apiClient.get<PaginatedResponse<AttendanceLogApiModel>>('/attendance/logs?limit=10000');
      return response.data.map(mapApiLogToLocal);
    } catch (error) {
      console.error('Failed to fetch logs from API', error);
      return getFromStorage(KEYS.LOGS, MOCK_LOGS);
    }
  },

  addSingleLog: async (log: AttendanceLog): Promise<void> => {
    if (!APP_CONFIG.USE_SERVER_API) {
      const logs = await storage.getLogs();
      logs.push(log);
      saveToStorage(KEYS.LOGS, logs);
      return;
    }

    const createData: CreateAttendanceLogRequest = {
      timekeepingId: log.timekeepingId,
      timestamp: log.timestamp,
    };
    await apiClient.post('/attendance/logs', createData);
  },

  saveLogs: async (newLogs: AttendanceLog[]): Promise<void> => {
    if (!APP_CONFIG.USE_SERVER_API) {
      const logs = await storage.getLogs();
      saveToStorage(KEYS.LOGS, [...logs, ...newLogs]);
      return;
    }

    const bulkData = {
      logs: newLogs.map(log => ({
        timekeepingId: log.timekeepingId,
        timestamp: log.timestamp,
      })),
    };
    await apiClient.post<ApiResponse<BulkImportResult>>('/attendance/logs/bulk-json', bulkData);
  },

  // ============ SCHEDULES ============

  getSchedules: async (): Promise<ShiftAssignment[]> => {
    if (!APP_CONFIG.USE_SERVER_API) {
      return getFromStorage(KEYS.SCHEDULES, MOCK_SCHEDULES);
    }

    // API requires getting per-employee, so we'll use localStorage as cache
    // In production, this should be a dedicated endpoint
    try {
      // For now, try to get from a bulk endpoint if it exists
      const response = await apiClient.get<ApiResponse<ScheduleAssignmentApiModel[]>>('/schedules');
      return response.data.map(s => ({
        employeeId: s.employeeId,
        date: s.date,
        shiftId: s.shiftId,
      }));
    } catch {
      // Fallback to localStorage
      return getFromStorage(KEYS.SCHEDULES, MOCK_SCHEDULES);
    }
  },

  saveSchedules: async (schedules: ShiftAssignment[]): Promise<void> => {
    if (!APP_CONFIG.USE_SERVER_API) {
      saveToStorage(KEYS.SCHEDULES, schedules);
      return;
    }

    try {
      // OpenAPI Spec: POST /shifts/assign (Individual)
      // Frontend uses bulk assignment "Create Schedule".
      // We must loop and call assign API for each item.
      // Optimization: use Promise.all
      const promises = schedules.map(s => 
        apiClient.post('/shifts/assign', {
            employeeId: s.employeeId,
            shiftId: s.shiftId,
            startDate: s.date,
            endDate: s.date // Single day assignment
        })
      );
      
      await Promise.all(promises);
    } catch (error) {
       console.error("Failed to save schedules", error);
       // Fallback or re-throw? 
       // If partial failure, state is inconsistent. 
       // For now, re-throw to notify user.
       throw error;
    }
  },

  // ============ REQUESTS (Đơn từ/Phép) ============
  // Note: Backend API for requests may not exist yet

  getRequests: async (): Promise<AttendanceRequest[]> => {
    if (!APP_CONFIG.USE_SERVER_API) {
      return getFromStorage(KEYS.REQUESTS, []);
    }

    try {
      const response = await apiClient.get<PaginatedResponse<AttendanceRequestApiModel>>('/requests?limit=1000');
      return response.data.map(mapApiRequestToLocal);
    } catch {
      // Fallback to localStorage if endpoint not available
      return getFromStorage(KEYS.REQUESTS, []);
    }
  },

  saveRequests: async (requests: AttendanceRequest[]): Promise<void> => {
    // Legacy support for bulk update (local storage only)
    if (!APP_CONFIG.USE_SERVER_API) {
      saveToStorage(KEYS.REQUESTS, requests);
      return;
    }
    // For API, we don't support bulk overwrite effectively.
    // UI should switch to single item operations.
    // If we must implementation:
     console.warn("Bulk saveRequests not supported fully on API mode. Use saveRequest instead.");
  },

  saveRequest: async (req: AttendanceRequest): Promise<AttendanceRequest> => {
    if (!APP_CONFIG.USE_SERVER_API) {
      const requests = await storage.getRequests();
      const index = requests.findIndex(r => r.id === req.id);
      if (index !== -1) {
        requests[index] = req;
      } else {
        requests.push(req);
      }
      saveToStorage(KEYS.REQUESTS, requests);
      return req;
    }

    try {
      const isNew = !req.id || req.id.startsWith('REQ-'); // ID generated by frontend
      
      const payload: any = {
          employeeId: req.employeeId,
          type: req.type,
          startDate: req.startDate,
          endDate: req.endDate,
          isFullDay: req.isFullDay,
          startTime: req.startTime,
          endTime: req.endTime,
          reason: req.reason,
          status: req.status
      };

      if (isNew) {
        const response = await apiClient.post<ApiResponse<AttendanceRequestApiModel>>('/requests', payload);
        return mapApiRequestToLocal(response.data);
      } else {
        const response = await apiClient.put<ApiResponse<AttendanceRequestApiModel>>(`/requests/${req.id}`, payload);
        return mapApiRequestToLocal(response.data);
      }
    } catch (error) {
      console.error('Failed to save request', error);
      throw error;
    }
  },

  deleteRequest: async (id: string): Promise<void> => {
      if (!APP_CONFIG.USE_SERVER_API) {
          const requests = await storage.getRequests();
          saveToStorage(KEYS.REQUESTS, requests.filter(r => r.id !== id));
          return;
      }
      await apiClient.delete(`/requests/${id}`);
  },

  reviewRequest: async (id: string, status: 'APPROVED' | 'REJECTED'): Promise<void> => {
      if (!APP_CONFIG.USE_SERVER_API) {
          const requests = await storage.getRequests();
          const req = requests.find(r => r.id === id);
          if (req) {
              req.status = status as any;
              saveToStorage(KEYS.REQUESTS, requests);
          }
          return;
      }
      // OpenAPI Spec: POST /requests/{id}/review
      await apiClient.post(`/requests/${id}/review`, { status });
  },

  // ============ HOLIDAYS ============

  getHolidays: async (): Promise<Holiday[]> => {
    if (!APP_CONFIG.USE_SERVER_API) {
      return getFromStorage(KEYS.HOLIDAYS, []);
    }

    try {
      const response = await apiClient.get<PaginatedResponse<HolidayApiModel>>('/holidays?limit=100');
      return response.data.map(mapApiHolidayToLocal);
    } catch (error) {
      console.error('Failed to fetch holidays from API', error);
      return getFromStorage(KEYS.HOLIDAYS, []);
    }
  },

  saveHolidays: async (holidays: Holiday[]): Promise<void> => {
    if (!APP_CONFIG.USE_SERVER_API) {
      saveToStorage(KEYS.HOLIDAYS, holidays);
      return;
    }
    // Legacy bulk save - warn on API usage
    console.warn("Bulk saveHolidays not supported fully on API mode. Use saveHoliday instead.");
  },

  saveHoliday: async (holiday: Holiday): Promise<Holiday> => {
    if (!APP_CONFIG.USE_SERVER_API) {
      const holidays = await storage.getHolidays();
      const index = holidays.findIndex(h => h.id === holiday.id);
      if (index !== -1) {
        holidays[index] = holiday;
      } else {
        holidays.push(holiday);
      }
      saveToStorage(KEYS.HOLIDAYS, holidays);
      return holiday;
    }

    try {
      const isNew = !holiday.id || holiday.id.startsWith(Date.now().toString().slice(0, 5));
      
      if (isNew) {
        const createData: CreateHolidayRequest = {
          date: holiday.date,
          name: holiday.name,
        };
        const response = await apiClient.post<ApiResponse<HolidayApiModel>>('/holidays', createData);
        return mapApiHolidayToLocal(response.data);
      } else {
        const response = await apiClient.put<ApiResponse<HolidayApiModel>>(`/holidays/${holiday.id}`, holiday);
        return mapApiHolidayToLocal(response.data);
      }
    } catch (error) {
      console.error('Failed to save holiday', error);
      throw error;
    }
  },

  deleteHoliday: async (id: string): Promise<void> => {
    if (!APP_CONFIG.USE_SERVER_API) {
      const holidays = await storage.getHolidays();
      saveToStorage(KEYS.HOLIDAYS, holidays.filter(h => h.id !== id));
      return;
    }

    await apiClient.delete(`/holidays/${id}`);
  },

  // ============ UTILITY ============

  clearAllData: async (): Promise<void> => {
    localStorage.removeItem(KEYS.EMPLOYEES);
    localStorage.removeItem(KEYS.SHIFTS);
    localStorage.removeItem(KEYS.LOGS);
    localStorage.removeItem(KEYS.SCHEDULES);
    localStorage.removeItem(KEYS.REQUESTS);
    localStorage.removeItem(KEYS.HOLIDAYS);
    // Note: This only clears localStorage, not server data
  },
};
