
import { Employee, Shift, AttendanceLog, ShiftAssignment, AttendanceRequest, Holiday } from '../types';
import { MOCK_EMPLOYEES, MOCK_SHIFTS, MOCK_LOGS, MOCK_SCHEDULES } from '../constants';

// --- HELPER: ENVIRONMENT VARIABLES ACCESSOR ---
// Hỗ trợ đọc env an toàn (tránh crash nếu chạy trong môi trường không phải Vite/Webpack)
const getEnv = (key: string, defaultValue: any) => {
    try {
        // @ts-ignore - Vite specific
        if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key] !== undefined) {
             // @ts-ignore
            return import.meta.env[key];
        }
        // Fallback for Create-React-App or process.env scenarios
        // @ts-ignore
        if (typeof process !== 'undefined' && process.env && process.env[key] !== undefined) {
             // @ts-ignore
            return process.env[key];
        }
    } catch (e) {
        // Ignore errors in restricted environments
    }
    return defaultValue;
};

// --- CẤU HÌNH HỆ THỐNG (SYSTEM CONFIGURATION) ---
export const APP_CONFIG = {
    // Đọc từ .env, nếu không có thì dùng giá trị mặc định
    API_BASE_URL: getEnv('VITE_API_BASE_URL', 'http://localhost:4000/api/v1'),
    
    // Lưu ý: Env thường trả về string, cần so sánh chính xác
    USE_SERVER_API: getEnv('VITE_USE_SERVER_API', 'false') === 'true', 

    API_TIMEOUT: Number(getEnv('VITE_API_TIMEOUT', 15000)),
    TOKEN_KEY: getEnv('VITE_AUTH_TOKEN_KEY', 'hr_pro_auth_token')
};

// Keys cho LocalStorage (Chế độ Demo)
const STORAGE_KEYS = {
    EMPLOYEES: 'hr_pro_employees',
    SHIFTS: 'hr_pro_shifts',
    LOGS: 'hr_pro_logs',
    SCHEDULES: 'hr_pro_schedules',
    REQUESTS: 'hr_pro_requests',
    HOLIDAYS: 'hr_pro_holidays'
};

// Helper mô phỏng độ trễ mạng cho chế độ Demo
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class StorageService {
    
    // --- PRIVATE: CORE API HANDLER ---
    // Hàm xử lý gọi API thực tế, tự động đính kèm Token
    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        if (!APP_CONFIG.USE_SERVER_API) {
            throw new Error("Hàm request() chỉ được gọi khi USE_SERVER_API = true");
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), APP_CONFIG.API_TIMEOUT);
        
        try {
            const token = localStorage.getItem(APP_CONFIG.TOKEN_KEY);
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...options.headers as Record<string, string>,
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${APP_CONFIG.API_BASE_URL}${endpoint}`, {
                ...options,
                headers,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                // Xử lý lỗi 401 (Unauthorized) nếu cần logout
                if (response.status === 401) {
                    console.warn("Session expired");
                    // window.location.href = '/login'; 
                }
                const errorBody = await response.json().catch(() => ({}));
                throw new Error(errorBody.message || `API Error: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            console.error(`API Call Failed [${endpoint}]:`, error);
            throw error;
        }
    }

    // --- PRIVATE: LOCAL STORAGE HELPERS ---
    private loadLocal<T>(key: string, fallback: T): T {
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

    private saveLocal(key: string, data: any): void {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error("Storage save failed", e);
        }
    }

    // =========================================================================
    // DATA METHODS (Hybrid Implementation)
    // =========================================================================

    // --- EMPLOYEES ---
    async getEmployees(): Promise<Employee[]> {
        if (APP_CONFIG.USE_SERVER_API) {
            return this.request<Employee[]>('/employees');
        }
        await delay(300);
        return this.loadLocal<Employee[]>(STORAGE_KEYS.EMPLOYEES, MOCK_EMPLOYEES);
    }

    async saveEmployee(employee: Employee): Promise<Employee> {
        if (APP_CONFIG.USE_SERVER_API) {
            // Nếu có ID -> Update (PUT), chưa có -> Create (POST)
            const method = employee.id && !employee.id.startsWith('new') ? 'PUT' : 'POST';
            const url = method === 'PUT' ? `/employees/${employee.id}` : '/employees';
            return this.request<Employee>(url, { method, body: JSON.stringify(employee) });
        }

        await delay(200);
        const list = this.loadLocal<Employee[]>(STORAGE_KEYS.EMPLOYEES, MOCK_EMPLOYEES);
        const index = list.findIndex(e => e.id === employee.id);
        
        let newList;
        if (index >= 0) {
            newList = [...list];
            newList[index] = employee;
        } else {
            newList = [...list, employee];
        }
        
        this.saveLocal(STORAGE_KEYS.EMPLOYEES, newList);
        return employee;
    }

    async deleteEmployee(id: string): Promise<void> {
        if (APP_CONFIG.USE_SERVER_API) {
            return this.request<void>(`/employees/${id}`, { method: 'DELETE' });
        }
        await delay(200);
        const list = this.loadLocal<Employee[]>(STORAGE_KEYS.EMPLOYEES, MOCK_EMPLOYEES);
        this.saveLocal(STORAGE_KEYS.EMPLOYEES, list.filter(e => e.id !== id));
    }

    // --- SHIFTS ---
    async getShifts(): Promise<Shift[]> {
        if (APP_CONFIG.USE_SERVER_API) return this.request<Shift[]>('/shifts');
        await delay(300);
        return this.loadLocal<Shift[]>(STORAGE_KEYS.SHIFTS, MOCK_SHIFTS);
    }

    async saveShift(shift: Shift): Promise<Shift> {
        if (APP_CONFIG.USE_SERVER_API) {
             const method = shift.id && !shift.id.startsWith('new') ? 'PUT' : 'POST';
             const url = method === 'PUT' ? `/shifts/${shift.id}` : '/shifts';
             return this.request<Shift>(url, { method, body: JSON.stringify(shift) });
        }
        await delay(200);
        const list = this.loadLocal<Shift[]>(STORAGE_KEYS.SHIFTS, MOCK_SHIFTS);
        const index = list.findIndex(s => s.id === shift.id);
        const newList = index >= 0 ? list.map(s => s.id === shift.id ? shift : s) : [...list, shift];
        this.saveLocal(STORAGE_KEYS.SHIFTS, newList);
        return shift;
    }

    async deleteShift(id: string): Promise<void> {
        if (APP_CONFIG.USE_SERVER_API) return this.request<void>(`/shifts/${id}`, { method: 'DELETE' });
        await delay(200);
        const list = this.loadLocal<Shift[]>(STORAGE_KEYS.SHIFTS, MOCK_SHIFTS);
        this.saveLocal(STORAGE_KEYS.SHIFTS, list.filter(s => s.id !== id));
    }

    // --- LOGS (ATTENDANCE) ---
    async getLogs(): Promise<AttendanceLog[]> {
        if (APP_CONFIG.USE_SERVER_API) {
            // Trong thực tế, nên truyền thêm params ?startDate=...&endDate=...
            return this.request<AttendanceLog[]>('/attendance/logs');
        }
        await delay(500); 
        return this.loadLocal<AttendanceLog[]>(STORAGE_KEYS.LOGS, MOCK_LOGS);
    }

    async saveLogs(newLogs: AttendanceLog[]): Promise<void> {
        if (APP_CONFIG.USE_SERVER_API) {
            // Bulk insert API
            return this.request<void>('/attendance/logs/bulk', { 
                method: 'POST', 
                body: JSON.stringify({ logs: newLogs }) 
            });
        }
        await delay(500);
        const current = this.loadLocal<AttendanceLog[]>(STORAGE_KEYS.LOGS, MOCK_LOGS);
        this.saveLocal(STORAGE_KEYS.LOGS, [...current, ...newLogs]);
    }
    
    async addSingleLog(log: AttendanceLog): Promise<AttendanceLog> {
        if (APP_CONFIG.USE_SERVER_API) {
            return this.request<AttendanceLog>('/attendance/logs', { 
                method: 'POST', 
                body: JSON.stringify(log) 
            });
        }
        await delay(200);
        const current = this.loadLocal<AttendanceLog[]>(STORAGE_KEYS.LOGS, MOCK_LOGS);
        this.saveLocal(STORAGE_KEYS.LOGS, [...current, log]);
        return log;
    }

    // --- SCHEDULE ASSIGNMENTS ---
    async getSchedules(): Promise<ShiftAssignment[]> {
        if (APP_CONFIG.USE_SERVER_API) return this.request<ShiftAssignment[]>('/schedules');
        return this.loadLocal<ShiftAssignment[]>(STORAGE_KEYS.SCHEDULES, MOCK_SCHEDULES);
    }

    async saveSchedules(schedules: ShiftAssignment[]): Promise<void> {
        if (APP_CONFIG.USE_SERVER_API) {
            // API nên hỗ trợ Bulk Update cho lịch làm việc
            return this.request<void>('/schedules/bulk', { 
                method: 'POST', 
                body: JSON.stringify({ schedules }) 
            });
        }
        await delay(300);
        this.saveLocal(STORAGE_KEYS.SCHEDULES, schedules);
    }

    // --- REQUESTS (LEAVE/OT) ---
    async getRequests(): Promise<AttendanceRequest[]> {
        if (APP_CONFIG.USE_SERVER_API) return this.request<AttendanceRequest[]>('/requests');
        return this.loadLocal<AttendanceRequest[]>(STORAGE_KEYS.REQUESTS, []);
    }

    async saveRequests(requests: AttendanceRequest[]): Promise<void> {
        if (APP_CONFIG.USE_SERVER_API) {
            // Lưu ý: Logic Frontend hiện tại đang gửi TOÀN BỘ danh sách mỗi khi update.
            // Khi chuyển sang API, nên refactor để chỉ gửi request MỚI hoặc request bị SỬA.
            // Tạm thời dùng endpoint sync.
            return this.request<void>('/requests/sync', { 
                method: 'POST', 
                body: JSON.stringify(requests) 
            });
        }
        await delay(200);
        this.saveLocal(STORAGE_KEYS.REQUESTS, requests);
    }

    // --- HOLIDAYS ---
    async getHolidays(): Promise<Holiday[]> {
        if (APP_CONFIG.USE_SERVER_API) return this.request<Holiday[]>('/holidays');
        return this.loadLocal<Holiday[]>(STORAGE_KEYS.HOLIDAYS, []);
    }

    async saveHolidays(holidays: Holiday[]): Promise<void> {
        if (APP_CONFIG.USE_SERVER_API) {
             return this.request<void>('/holidays/sync', { 
                method: 'POST', 
                body: JSON.stringify(holidays) 
            });
        }
        await delay(200);
        this.saveLocal(STORAGE_KEYS.HOLIDAYS, holidays);
    }

    // --- SYSTEM UTILS ---
    async clearAllData(): Promise<void> {
        // Chỉ hoạt động ở chế độ Demo
        if (!APP_CONFIG.USE_SERVER_API) {
            await delay(1000);
            localStorage.clear();
            localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(MOCK_SHIFTS));
            localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(MOCK_EMPLOYEES));
        } else {
            console.warn("Clear All Data is disabled in Production Mode");
        }
    }
}

export const storage = new StorageService();
