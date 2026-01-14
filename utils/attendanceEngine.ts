
import { Employee, Shift, AttendanceLog, ShiftAssignment, TimesheetRow, DailyRecord, AttendanceStatus, AttendanceRequest, RequestStatus, RequestType, Holiday } from '../types';

const parseLogTime = (timestamp: any): Date => {
    if (!timestamp || typeof timestamp !== 'string') return new Date();
    const isoString = timestamp.trim().replace(' ', 'T');
    const date = new Date(isoString);
    return isNaN(date.getTime()) ? new Date() : date;
};

const formatTime = (date: Date): string => {
    return date.toTimeString().substring(0, 5);
};

const timeToMinutes = (timeStr: any): number => {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const parts = timeStr.split(':');
    if (parts.length < 2) return 0;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
};

const getShiftDurationHours = (shift: Shift): number => {
    if (!shift || !shift.startTime || !shift.endTime) return 0;
    
    let start = timeToMinutes(shift.startTime);
    let end = timeToMinutes(shift.endTime);
    if (end < start) end += 24 * 60; 
    
    let durationMins = end - start;

    if (shift.breakStart && shift.breakEnd) {
        let bStart = timeToMinutes(shift.breakStart);
        let bEnd = timeToMinutes(shift.breakEnd);
        
        if (shift.isOvernight && bStart < start) {
             bStart += 24 * 60;
             bEnd += 24 * 60;
        } else if (bEnd < bStart) {
             bEnd += 24 * 60;
        }
        
        if (bStart >= start && bEnd <= end) {
            durationMins -= (bEnd - bStart);
        }
    }
    
    return parseFloat((durationMins / 60).toFixed(2));
};

export const calculateTimesheet = (
  employees: Employee[],
  shifts: Shift[],
  logs: AttendanceLog[],
  schedules: ShiftAssignment[],
  requests: AttendanceRequest[],
  holidays: Holiday[], 
  viewMonth: Date 
): TimesheetRow[] => {
  if (!Array.isArray(employees) || !Array.isArray(shifts) || !Array.isArray(logs) || !Array.isArray(schedules) || !Array.isArray(requests) || !Array.isArray(holidays)) {
      return [];
  }

  const validEmployees = employees.filter(e => e && e.id);
  const validShifts = shifts.filter(s => s && s.id);
  const validLogs = logs.filter(l => l && l.timestamp);
  const validSchedules = schedules.filter(s => s && s.employeeId);
  const validRequests = requests.filter(r => r && r.employeeId);
  const validHolidays = holidays.filter(h => h && h.date);

  const year = viewMonth.getFullYear();
  const monthIdx = viewMonth.getMonth(); 
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();

  const processedLogs = validLogs
    .filter(l => !l.isIgnored && l.timestamp)
    .map(l => ({ ...l, dateObj: parseLogTime(l.timestamp) }))
    .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

  // Optimization: Create a lookup map for schedules to avoid O(N) search inside loops
  const scheduleMap = new Map<string, ShiftAssignment>();
  validSchedules.forEach(s => {
      scheduleMap.set(`${s.employeeId}_${s.date}`, s);
  });

  const getShiftForDate = (emp: Employee, dateStr: string, dateObj: Date): Shift | null => {
    let rawShift: Shift | undefined;
    const dayOfWeek = dateObj.getDay(); 

    const assignment = scheduleMap.get(`${emp.id}_${dateStr}`);
    
    if (assignment) {
      if (assignment.shiftId === 'OFF') return null;
      rawShift = validShifts.find(s => s.id === assignment.shiftId);
    } else {
      if (emp.defaultShiftId) {
          const defaultShift = validShifts.find(s => s.id === emp.defaultShiftId);
          if (defaultShift) {
              const workDays = defaultShift.workDays || [1,2,3,4,5];
              if (workDays.includes(dayOfWeek)) {
                  rawShift = defaultShift;
              }
          }
      }
    }

    if (!rawShift) return null;

    // NEW: VALIDATE EFFECTIVE DATE
    // If the date being calculated is BEFORE the shift's effective date, ignore this shift.
    if (rawShift.effectiveFrom && dateStr < rawShift.effectiveFrom) {
        return null;
    }

    if (dayOfWeek === 6 && rawShift.isSaturdayHalfDay && rawShift.startTime) {
        const startMins = timeToMinutes(rawShift.startTime);
        const noonMins = timeToMinutes('12:00');

        if (startMins < noonMins) {
             return {
                ...rawShift,
                endTime: '12:00', 
                breakStart: '12:00', 
                breakEnd: '12:00',
                name: (rawShift.name || '') + ' (1/2)'
            };
        } else {
            if (assignment) return rawShift;
            return null;
        }
    }

    return rawShift; 
  };

  return validEmployees.map(emp => {
    const records: { [date: string]: DailyRecord } = {};
    const summary = { totalWorkHours: 0, totalOT: 0, totalLate: 0, totalAbsent: 0, totalLeaves: 0, totalLeaveHours: 0, totalHolidays: 0 };

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDayDate = new Date(year, monthIdx, day);
      const dateStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      const shift = getShiftForDate(emp, dateStr, currentDayDate);
      const isHoliday = validHolidays.some(h => h.date === dateStr);
      const approvedRequests = validRequests.filter(r => 
        r.employeeId === emp.id && 
        r.status === RequestStatus.Approved && 
        dateStr >= r.startDate && 
        dateStr <= (r.endDate || r.startDate)
      );

      const approvedLeave = approvedRequests.find(r => r.type === RequestType.Leave);
      const approvedExplanation = approvedRequests.find(r => r.type === RequestType.Explanation);

      const record: DailyRecord = {
        date: dateStr,
        shiftId: shift ? shift.id : '',
        status: [],
        workHours: 0,
        otHours: 0,
        leaveHours: 0,
        lateMinutes: 0,
        earlyMinutes: 0,
        checkIn: undefined,
        checkOut: undefined
      };

      if (isHoliday) {
          record.status.push(AttendanceStatus.Holiday);
          summary.totalHolidays++;
      }

      if (approvedLeave && approvedLeave.isFullDay) {
          if (!isHoliday) {
              record.status.push(AttendanceStatus.Leave);
              summary.totalLeaves++;
              if (shift) record.leaveHours = getShiftDurationHours(shift);
              else record.leaveHours = 8;
              summary.totalLeaveHours += record.leaveHours;
              records[dateStr] = record;
              continue; 
          }
      }
      
      if (approvedLeave && !approvedLeave.isFullDay && !isHoliday) {
          record.status.push(AttendanceStatus.Leave);
          if (approvedLeave.startTime && approvedLeave.endTime) {
              const start = timeToMinutes(approvedLeave.startTime);
              const end = timeToMinutes(approvedLeave.endTime);
              const duration = Math.max(0, end - start) / 60;
              record.leaveHours = parseFloat(duration.toFixed(2));
              summary.totalLeaveHours += record.leaveHours;
              summary.totalLeaves++;
          }
      }

      let windowStart = new Date(currentDayDate);
      let windowEnd = new Date(currentDayDate);

      if (shift && shift.startTime && shift.endTime) {
          const sTimeParts = shift.startTime.split(':');
          const eTimeParts = shift.endTime.split(':');
          
          if (sTimeParts.length >= 2 && eTimeParts.length >= 2) {
              const sH = parseInt(sTimeParts[0], 10);
              const sM = parseInt(sTimeParts[1], 10);
              const eH = parseInt(eTimeParts[0], 10);
              const eM = parseInt(eTimeParts[1], 10);
              
              const shiftStartDateTime = new Date(currentDayDate);
              shiftStartDateTime.setHours(sH, sM, 0, 0);

              const shiftEndDateTime = new Date(currentDayDate);
              if (shift.isOvernight || (eH < sH)) {
                   shiftEndDateTime.setDate(shiftEndDateTime.getDate() + 1);
              }
              shiftEndDateTime.setHours(eH, eM, 0, 0);

              windowStart = new Date(shiftStartDateTime.getTime() - 4 * 60 * 60 * 1000);
              windowEnd = new Date(shiftEndDateTime.getTime() + 4 * 60 * 60 * 1000);

              const relevantLogs = processedLogs.filter(l => 
                  l.timekeepingId === emp.timekeepingId &&
                  l.dateObj >= windowStart &&
                  l.dateObj <= windowEnd
              );

              if (relevantLogs.length === 0) {
                  if (approvedExplanation && approvedExplanation.isFullDay) {
                       record.status.push(AttendanceStatus.Valid); 
                  } else if (isHoliday) {
                  } else if (!record.status.includes(AttendanceStatus.Leave)) {
                       record.status.push(AttendanceStatus.Absent);
                       summary.totalAbsent++;
                  }
              } else {
                  const inLog = relevantLogs[0];
                  const outLog = relevantLogs[relevantLogs.length - 1];
                  record.checkIn = formatTime(inLog.dateObj);
                  
                  const diffInMs = inLog.dateObj.getTime() - shiftStartDateTime.getTime();
                  const diffInMins = Math.floor(diffInMs / 60000);

                  if (diffInMins > shift.toleranceMinutes && !isHoliday) {
                      let isExcused = !!approvedExplanation;
                      if (!isExcused && approvedLeave && !approvedLeave.isFullDay && approvedLeave.startTime && approvedLeave.endTime) {
                           const leaveStartMins = timeToMinutes(approvedLeave.startTime);
                           const leaveEndMins = timeToMinutes(approvedLeave.endTime);
                           const shiftStartMins = timeToMinutes(shift.startTime);
                           if (leaveStartMins <= shiftStartMins && leaveEndMins >= shiftStartMins) isExcused = true;
                      }
                      if (!isExcused) {
                        record.status.push(AttendanceStatus.Late);
                        record.lateMinutes = diffInMins;
                        summary.totalLate++;
                      }
                  } else if (!isHoliday) {
                      record.status.push(AttendanceStatus.Valid);
                  }

                  const sessionDurationMs = outLog.dateObj.getTime() - inLog.dateObj.getTime();
                  const isDoubleTap = sessionDurationMs < 5 * 60 * 1000; 

                  if (relevantLogs.length > 1 && !isDoubleTap) {
                      record.checkOut = formatTime(outLog.dateObj);
                      const earlyMs = shiftEndDateTime.getTime() - outLog.dateObj.getTime();
                      const earlyMins = Math.floor(earlyMs / 60000);

                      if (earlyMins > shift.toleranceMinutes && !isHoliday) {
                           let isExcusedEarly = !!approvedExplanation;
                           if (!isExcusedEarly && approvedLeave && !approvedLeave.isFullDay && approvedLeave.startTime && approvedLeave.endTime) {
                               const leaveStartMins = timeToMinutes(approvedLeave.startTime);
                               const leaveEndMins = timeToMinutes(approvedLeave.endTime);
                               const shiftEndMins = timeToMinutes(shift.endTime);
                               if (leaveEndMins >= shiftEndMins && leaveStartMins <= shiftEndMins) isExcusedEarly = true;
                           }
                           if (!isExcusedEarly) {
                              record.status.push(AttendanceStatus.EarlyLeave);
                              record.earlyMinutes = earlyMins;
                           }
                      }

                      let workMs = sessionDurationMs;
                      let breakMs = 0;
                      if (shift.breakStart && shift.breakEnd) {
                          const bsParts = shift.breakStart.split(':');
                          const beParts = shift.breakEnd.split(':');
                          if (bsParts.length >= 2 && beParts.length >= 2) {
                              const bsH = parseInt(bsParts[0], 10);
                              const bsM = parseInt(bsParts[1], 10);
                              const beH = parseInt(beParts[0], 10);
                              const beM = parseInt(beParts[1], 10);
                              let breakStart = new Date(shiftStartDateTime);
                              breakStart.setHours(bsH, bsM, 0, 0);
                              let breakEnd = new Date(shiftStartDateTime);
                              breakEnd.setHours(beH, beM, 0, 0);
                              if (shift.isOvernight && (bsH * 60 + bsM) < (sH * 60 + sM)) {
                                  breakStart.setDate(breakStart.getDate() + 1);
                                  breakEnd.setDate(breakEnd.getDate() + 1);
                              } else if ((beH * 60 + beM) < (bsH * 60 + bsM)) {
                                  breakEnd.setDate(breakEnd.getDate() + 1);
                              }
                              const overlapStart = new Date(Math.max(inLog.dateObj.getTime(), breakStart.getTime()));
                              const overlapEnd = new Date(Math.min(outLog.dateObj.getTime(), breakEnd.getTime()));
                              if (overlapEnd > overlapStart) breakMs = overlapEnd.getTime() - overlapStart.getTime();
                          }
                      }
                      workMs = Math.max(0, workMs - breakMs);
                      if (shift.roundingMinutes && shift.roundingMinutes > 0) {
                          const totalMins = Math.floor(workMs / 60000);
                          const roundedMins = Math.floor(totalMins / shift.roundingMinutes) * shift.roundingMinutes;
                          workMs = roundedMins * 60000;
                      }
                      const workHrs = parseFloat((workMs / (1000 * 60 * 60)).toFixed(2));
                      record.workHours = workHrs;
                      if (isHoliday) {
                          record.status.push(AttendanceStatus.Overtime);
                          record.otHours = workHrs;
                          summary.totalOT += workHrs;
                          summary.totalWorkHours += workHrs;
                      } else {
                          summary.totalWorkHours += record.workHours;
                          const otThreshold = 30;
                          const otMs = outLog.dateObj.getTime() - shiftEndDateTime.getTime();
                          const otMins = Math.floor(otMs / 60000);
                          if (otMins > otThreshold) {
                              record.status.push(AttendanceStatus.Overtime);
                              record.otHours = parseFloat((otMins / 60).toFixed(2));
                              summary.totalOT += record.otHours;
                          }
                      }
                  } else {
                       if (approvedExplanation) record.status.push(AttendanceStatus.Valid);
                       else if (!isHoliday) record.status.push(AttendanceStatus.MissingPunch);
                  }
              }
          }
      } else {
          windowStart.setHours(4, 0, 0, 0);
          windowEnd.setDate(windowEnd.getDate() + 1); 
          windowEnd.setHours(3, 59, 59, 0);
          const relevantLogs = processedLogs.filter(l => 
            l.timekeepingId === emp.timekeepingId &&
            l.dateObj >= windowStart &&
            l.dateObj <= windowEnd
          );
          if (relevantLogs.length > 0) {
              const inLog = relevantLogs[0];
              const outLog = relevantLogs[relevantLogs.length - 1];
              record.checkIn = formatTime(inLog.dateObj);
              if (relevantLogs.length > 1 && (outLog.dateObj.getTime() - inLog.dateObj.getTime() > 5 * 60 * 1000)) {
                  record.checkOut = formatTime(outLog.dateObj);
                  const workMs = outLog.dateObj.getTime() - inLog.dateObj.getTime();
                  record.workHours = parseFloat((workMs / (1000 * 60 * 60)).toFixed(2));
                  record.status.push(AttendanceStatus.Overtime);
                  record.otHours = record.workHours;
                  summary.totalOT += record.otHours;
                  summary.totalWorkHours += record.workHours;
              } else {
                  record.status.push(AttendanceStatus.MissingPunch); 
              }
          } else {
              if (!isHoliday) record.status.push(AttendanceStatus.Off);
          }
      }
      records[dateStr] = record;
    }
    return { employee: emp, records, summary };
  });
};
