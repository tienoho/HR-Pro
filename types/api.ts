/**
 * API Types for HR-Pro
 */

// ============ Common Types ============

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Array<{
    field?: string;
    message: string;
  }>;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============ Auth Types ============

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface User {
  id: string;
  username: string;
  email?: string;
  fullName?: string;
  role: "ADMIN" | "HR" | "USER";
}

// ============ Employee Types ============

export interface EmployeeApiModel {
  id: string;
  code: string;
  timekeepingId: string;
  name: string;
  department: string;
  position: string;
  joinDate: string;
  status: "ACTIVE" | "INACTIVE" | "ON_LEAVE" | "TERMINATED";
  defaultShiftId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateEmployeeRequest {
  code: string;
  timekeepingId: string;
  name: string;
  department: string;
  position: string;
  joinDate: string;
  status?: string;
  defaultShiftId?: string;
}

// ============ Shift Types ============

export interface ShiftApiModel {
  id: string;
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
  toleranceMinutes: number;
  roundingMinutes: number;
  multiplier: number;
  effectiveFrom: string;
  workDays: number[];
  isSaturdayHalfDay: boolean;
  isOvernight: boolean;
  color?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateShiftRequest {
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
  toleranceMinutes?: number;
  roundingMinutes?: number;
  multiplier?: number;
  effectiveFrom: string;
  workDays: number[];
  isSaturdayHalfDay?: boolean;
  isOvernight?: boolean;
  color?: string;
}

export interface ShiftAssignmentRequest {
  employeeId: string;
  shiftId: string;
  startDate: string;
  endDate?: string;
}

// ============ Attendance Types ============

export interface AttendanceLogApiModel {
  id: string;
  timekeepingId: string;
  timestamp: string;
  source: "MACHINE" | "MANUAL" | "IMPORT";
  note?: string;
  isIgnored?: boolean;
  createdAt?: string;
}

export interface CreateAttendanceLogRequest {
  timekeepingId: string;
  timestamp: string;
  note?: string;
}

export interface BulkImportLogsRequest {
  logs: Array<{
    timekeepingId: string;
    timestamp: string;
  }>;
}

export interface BulkImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
}

// ============ Holiday Types ============

export interface HolidayApiModel {
  id: string;
  date: string;
  name: string;
  isActive?: boolean;
  createdAt?: string;
}

export interface CreateHolidayRequest {
  date: string;
  name: string;
}

// ============ Request Types (Đơn từ) ============
// NOTE: These endpoints need to be added to backend

export interface AttendanceRequestApiModel {
  id: string;
  employeeId: string;
  type: "LEAVE" | "OT" | "EXPLANATION";
  startDate: string;
  endDate?: string;
  isFullDay: boolean;
  startTime?: string;
  endTime?: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAttendanceRequestRequest {
  employeeId: string;
  type: "LEAVE" | "OT" | "EXPLANATION";
  startDate: string;
  endDate?: string;
  isFullDay: boolean;
  startTime?: string;
  endTime?: string;
  reason: string;
}

// ============ Schedule Types ============

export interface ScheduleAssignmentApiModel {
  employeeId: string;
  date: string;
  shiftId: string;
}

export interface BulkScheduleRequest {
  assignments: ScheduleAssignmentApiModel[];
}

// ============ Timesheet Types ============

export interface TimesheetQueryParams {
  month: number;
  year: number;
  departmentId?: string;
  employeeId?: string;
}

export interface TimesheetApiResponse {
  success: boolean;
  data: {
    employees: Array<{
      employee: EmployeeApiModel;
      records: Record<
        string,
        {
          date: string;
          checkIn?: string;
          checkOut?: string;
          shiftId: string;
          status: string[];
          workHours: number;
          otHours: number;
          leaveHours: number;
          lateMinutes: number;
          earlyMinutes: number;
        }
      >;
      summary: {
        totalWorkHours: number;
        totalOT: number;
        totalLate: number;
        totalAbsent: number;
        totalLeaves: number;
        totalLeaveHours: number;
        totalHolidays: number;
      };
    }>;
  };
}
