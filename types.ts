
export enum ShiftType {
  Administrative = 'ADMINISTRATIVE',
  Shift = 'SHIFT',
}

export interface Shift {
  id: string;
  code: string;
  name: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  breakStart: string; // HH:mm
  breakEnd: string; // HH:mm
  toleranceMinutes: number;
  isOvernight: boolean;
  multiplier: number;
  color: string;
  roundingMinutes: number; // e.g. 15, 30
  
  // NEW: Work Schedule Configuration within Shift
  workDays: number[]; // Array of days: 0 (Sun) - 6 (Sat). E.g., [1,2,3,4,5]
  isSaturdayHalfDay: boolean; // If true, Saturday ends at 12:00 (or breakStart)
}

export interface Employee {
  id: string; // UUID
  code: string; // NV001 - Human readable ID
  timekeepingId: string; // 101 - Machine ID
  name: string;
  department: string;
  position: string;
  joinDate: string; // YYYY-MM-DD
  status: 'ACTIVE' | 'INACTIVE';
  
  defaultShiftId: string;
}

export interface AttendanceLog {
  id: string;
  timekeepingId: string; // Links to Employee.timekeepingId
  timestamp: string; // ISO String or YYYY-MM-DD HH:mm:ss
  source: 'MACHINE' | 'IMPORT' | 'MANUAL';
  isIgnored?: boolean; // For duplicates
}

export interface ShiftAssignment {
  employeeId: string;
  date: string; // YYYY-MM-DD
  shiftId: string; // Shift ID or 'OFF'
}

// --- NEW: Holiday ---
export interface Holiday {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
}

// --- NEW: Request Types ---
export enum RequestType {
  Leave = 'LEAVE', // Nghỉ phép
  Overtime = 'OT', // Đăng ký OT
  Explanation = 'EXPLANATION' // Giải trình quên chấm
}

export enum RequestStatus {
  Pending = 'PENDING',
  Approved = 'APPROVED',
  Rejected = 'REJECTED'
}

export interface AttendanceRequest {
  id: string;
  employeeId: string;
  type: RequestType;
  
  // Changed from single 'date' to Range
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  
  // Time specific options
  isFullDay: boolean;
  startTime?: string; // HH:mm (Optional, if !isFullDay)
  endTime?: string;   // HH:mm (Optional, if !isFullDay)

  reason: string;
  status: RequestStatus;
  meta?: any; 
}

export enum AttendanceStatus {
  Valid = 'VALID',
  Late = 'LATE',
  EarlyLeave = 'EARLY_LEAVE',
  MissingPunch = 'MISSING_PUNCH',
  Absent = 'ABSENT',
  Overtime = 'OVERTIME',
  Off = 'OFF',
  Leave = 'LEAVE',
  Holiday = 'HOLIDAY' // New status
}

export interface DailyRecord {
  date: string; // YYYY-MM-DD
  checkIn?: string; // HH:mm
  checkOut?: string; // HH:mm
  shiftId: string;
  status: AttendanceStatus[];
  workHours: number;
  otHours: number;
  leaveHours: number; 
  lateMinutes: number;
  earlyMinutes: number;
  requestStatus?: RequestStatus; // To show if there is a pending request
}

export interface TimesheetRow {
  employee: Employee;
  records: { [date: string]: DailyRecord };
  summary: {
    totalWorkHours: number;
    totalOT: number;
    totalLate: number; // count
    totalAbsent: number; // count
    totalLeaves: number; // count
    totalLeaveHours: number;
    totalHolidays: number; // New field
  };
}
