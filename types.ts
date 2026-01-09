
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
  roundingMinutes: number; 
  effectiveFrom: string; // NEW: YYYY-MM-DD
  
  workDays: number[]; 
  isSaturdayHalfDay: boolean; 
}

export interface Employee {
  id: string; 
  code: string; 
  timekeepingId: string; 
  name: string;
  department: string;
  position: string;
  joinDate: string; 
  status: 'ACTIVE' | 'INACTIVE';
  
  defaultShiftId: string;
}

export interface AttendanceLog {
  id: string;
  timekeepingId: string; 
  timestamp: string; 
  source: 'MACHINE' | 'IMPORT' | 'MANUAL';
  isIgnored?: boolean; 
}

export interface ShiftAssignment {
  employeeId: string;
  date: string; 
  shiftId: string; 
}

export interface Holiday {
  id: string;
  date: string; 
  name: string;
}

export enum RequestType {
  Leave = 'LEAVE',
  Overtime = 'OT', 
  Explanation = 'EXPLANATION' 
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
  startDate: string; 
  endDate: string;   
  isFullDay: boolean;
  startTime?: string; 
  endTime?: string;   
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
  Holiday = 'HOLIDAY'
}

export interface DailyRecord {
  date: string; 
  checkIn?: string; 
  checkOut?: string; 
  shiftId: string;
  status: AttendanceStatus[];
  workHours: number;
  otHours: number;
  leaveHours: number; 
  lateMinutes: number;
  earlyMinutes: number;
  requestStatus?: RequestStatus; 
}

export interface TimesheetRow {
  employee: Employee;
  records: { [date: string]: DailyRecord };
  summary: {
    totalWorkHours: number;
    totalOT: number;
    totalLate: number; 
    totalAbsent: number; 
    totalLeaves: number; 
    totalLeaveHours: number;
    totalHolidays: number; 
  };
}
