
import { Shift, Employee, AttendanceLog, ShiftAssignment } from './types';

export const MOCK_SHIFTS: Shift[] = [
  {
    id: '1',
    code: 'HC',
    name: 'Hành chính (Nghỉ T7, CN)',
    startTime: '08:00',
    endTime: '17:00',
    breakStart: '12:00',
    breakEnd: '13:00',
    toleranceMinutes: 5,
    isOvernight: false,
    multiplier: 1.0,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    roundingMinutes: 15,
    workDays: [1, 2, 3, 4, 5], 
    isSaturdayHalfDay: false,
    effectiveFrom: '2020-01-01'
  },
  {
    id: '2',
    code: 'SX',
    name: 'Sản xuất (Full tuần)',
    startTime: '07:30',
    endTime: '16:30',
    breakStart: '11:30',
    breakEnd: '12:30',
    toleranceMinutes: 10,
    isOvernight: false,
    multiplier: 1.0,
    color: 'bg-green-100 text-green-800 border-green-200',
    roundingMinutes: 15,
    workDays: [1, 2, 3, 4, 5, 6], 
    isSaturdayHalfDay: false,
    effectiveFrom: '2020-01-01'
  },
  {
    id: '3',
    code: 'LX',
    name: 'Lái xe (T7 nửa ngày)',
    startTime: '08:00',
    endTime: '17:00',
    breakStart: '12:00',
    breakEnd: '13:00',
    toleranceMinutes: 0,
    isOvernight: false,
    multiplier: 1.0,
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    roundingMinutes: 30,
    workDays: [1, 2, 3, 4, 5, 6], 
    isSaturdayHalfDay: true,
    effectiveFrom: '2020-01-01'
  }
];

export const MOCK_EMPLOYEES: Employee[] = [
  { 
      id: '1', code: 'NV001', timekeepingId: '1001', name: 'Nguyễn Văn An', department: 'IT', position: 'Developer', joinDate: '2023-01-01', status: 'ACTIVE', 
      defaultShiftId: '1' 
  },
  { 
      id: '2', code: 'NV002', timekeepingId: '1002', name: 'Trần Thị Bình', department: 'HR', position: 'Manager', joinDate: '2022-05-15', status: 'ACTIVE', 
      defaultShiftId: '1' 
  },
  { 
      id: '3', code: 'NV003', timekeepingId: '1003', name: 'Lê Văn Cường', department: 'Kho', position: 'Staff', joinDate: '2023-08-01', status: 'ACTIVE', 
      defaultShiftId: '2' 
  },
  { 
      id: '4', code: 'NV004', timekeepingId: '1004', name: 'Phạm Minh Dũng', department: 'Vận chuyển', position: 'Driver', joinDate: '2023-08-01', status: 'ACTIVE', 
      defaultShiftId: '3' 
  },
  { 
      id: '5', code: 'NV005', timekeepingId: '1005', name: 'Hoàng Thùy Linh', department: 'Sale', position: 'Executive', joinDate: '2024-01-10', status: 'ACTIVE', 
      defaultShiftId: '1' 
  },
];

export const MOCK_LOGS: AttendanceLog[] = [];
export const MOCK_SCHEDULES: ShiftAssignment[] = [];

const today = new Date();
const year = today.getFullYear();
const month = today.getMonth();
const daysInMonth = new Date(year, month + 1, 0).getDate();

MOCK_EMPLOYEES.forEach(emp => {
    for(let i=1; i<=daysInMonth; i++) {
        const date = new Date(year, month, i);
        const dayOfWeek = date.getDay();
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        
        const shift = MOCK_SHIFTS.find(s => s.id === emp.defaultShiftId);
        if (!shift) continue;
        if (!shift.workDays.includes(dayOfWeek)) continue;

        const rand = Math.random();
        
        if (rand < 0.8) {
            let start = shift.startTime;
            let end = shift.endTime;
            
            if (dayOfWeek === 6 && shift.isSaturdayHalfDay) {
                end = '12:00';
            }

            MOCK_LOGS.push({ id: Math.random().toString(), timekeepingId: emp.timekeepingId, timestamp: `${dateStr} ${start}:00`, source: 'MACHINE' });
            MOCK_LOGS.push({ id: Math.random().toString(), timekeepingId: emp.timekeepingId, timestamp: `${dateStr} ${end}:00`, source: 'MACHINE' });
        } 
    }
});
