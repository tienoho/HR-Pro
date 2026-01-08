
import { Employee, Shift, AttendanceLog, ShiftAssignment, AttendanceRequest, Holiday } from '../types';
import { MOCK_EMPLOYEES, MOCK_SHIFTS, MOCK_LOGS, MOCK_SCHEDULES } from '../constants';

// Keys
const KEYS = {
    EMPLOYEES: 'hr_pro_employees',
    SHIFTS: 'hr_pro_shifts',
    LOGS: 'hr_pro_logs',
    SCHEDULES: 'hr_pro_schedules',
    REQUESTS: 'hr_pro_requests',
    HOLIDAYS: 'hr_pro_holidays'
};

// Helper to simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class StorageService {
    // --- GENERIC HELPERS ---
    private load<T>(key: string, fallback: T): T {
        try {
            const item = localStorage.getItem(key);
            if (!item) return fallback;
            const parsed = JSON.parse(item);
            if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback;
            return parsed;
        } catch {
            return fallback;
        }
    }

    private save(key: string, data: any): void {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error("Storage save failed", e);
        }
    }

    // --- EMPLOYEES ---
    async getEmployees(): Promise<Employee[]> {
        await delay(300); // Simulate network
        return this.load<Employee[]>(KEYS.EMPLOYEES, MOCK_EMPLOYEES);
    }

    async saveEmployee(employee: Employee): Promise<Employee> {
        await delay(200);
        const list = this.load<Employee[]>(KEYS.EMPLOYEES, MOCK_EMPLOYEES);
        const index = list.findIndex(e => e.id === employee.id);
        
        let newList;
        if (index >= 0) {
            newList = [...list];
            newList[index] = employee;
        } else {
            newList = [...list, employee];
        }
        
        this.save(KEYS.EMPLOYEES, newList);
        return employee;
    }

    async deleteEmployee(id: string): Promise<void> {
        await delay(200);
        const list = this.load<Employee[]>(KEYS.EMPLOYEES, MOCK_EMPLOYEES);
        this.save(KEYS.EMPLOYEES, list.filter(e => e.id !== id));
    }

    // --- SHIFTS ---
    async getShifts(): Promise<Shift[]> {
        await delay(300);
        return this.load<Shift[]>(KEYS.SHIFTS, MOCK_SHIFTS);
    }

    async saveShift(shift: Shift): Promise<Shift> {
        await delay(200);
        const list = this.load<Shift[]>(KEYS.SHIFTS, MOCK_SHIFTS);
        const index = list.findIndex(s => s.id === shift.id);
        const newList = index >= 0 ? list.map(s => s.id === shift.id ? shift : s) : [...list, shift];
        this.save(KEYS.SHIFTS, newList);
        return shift;
    }

    async deleteShift(id: string): Promise<void> {
        await delay(200);
        const list = this.load<Shift[]>(KEYS.SHIFTS, MOCK_SHIFTS);
        this.save(KEYS.SHIFTS, list.filter(s => s.id !== id));
    }

    // --- LOGS ---
    async getLogs(): Promise<AttendanceLog[]> {
        // In real API, this would accept filters (date range) to avoid fetching millions of rows
        await delay(500); 
        return this.load<AttendanceLog[]>(KEYS.LOGS, MOCK_LOGS);
    }

    async saveLogs(newLogs: AttendanceLog[]): Promise<void> {
        await delay(500);
        const current = this.load<AttendanceLog[]>(KEYS.LOGS, MOCK_LOGS);
        // In real DB, we would use INSERT logic
        this.save(KEYS.LOGS, [...current, ...newLogs]);
    }
    
    async addSingleLog(log: AttendanceLog): Promise<AttendanceLog> {
        await delay(200);
        const current = this.load<AttendanceLog[]>(KEYS.LOGS, MOCK_LOGS);
        this.save(KEYS.LOGS, [...current, log]);
        return log;
    }

    // --- OTHERS ---
    async getSchedules(): Promise<ShiftAssignment[]> {
        return this.load<ShiftAssignment[]>(KEYS.SCHEDULES, MOCK_SCHEDULES);
    }

    async saveSchedules(schedules: ShiftAssignment[]): Promise<void> {
        await delay(300);
        this.save(KEYS.SCHEDULES, schedules);
    }

    async getRequests(): Promise<AttendanceRequest[]> {
        return this.load<AttendanceRequest[]>(KEYS.REQUESTS, []);
    }

    async saveRequests(requests: AttendanceRequest[]): Promise<void> {
        await delay(200);
        this.save(KEYS.REQUESTS, requests);
    }

    async getHolidays(): Promise<Holiday[]> {
        return this.load<Holiday[]>(KEYS.HOLIDAYS, []);
    }

    async saveHolidays(holidays: Holiday[]): Promise<void> {
        await delay(200);
        this.save(KEYS.HOLIDAYS, holidays);
    }

    // --- UTILS ---
    async clearAllData(): Promise<void> {
        await delay(1000);
        localStorage.clear();
        // Reload mock data
        localStorage.setItem(KEYS.SHIFTS, JSON.stringify(MOCK_SHIFTS));
        localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(MOCK_EMPLOYEES));
    }
}

export const storage = new StorageService();
