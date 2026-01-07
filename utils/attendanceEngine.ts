
import { Employee, Shift, AttendanceLog, ShiftAssignment, TimesheetRow, DailyRecord, AttendanceStatus, AttendanceRequest, RequestStatus, RequestType, Holiday } from '../types';

// Helper to parse "YYYY-MM-DD HH:mm:ss" to Date object
const parseLogTime = (timestamp: any): Date => {
    if (!timestamp || typeof timestamp !== 'string') return new Date();
    // Convert SQL style "YYYY-MM-DD HH:mm:ss" to ISO "YYYY-MM-DDTHH:mm:ss"
    const isoString = timestamp.trim().replace(' ', 'T');
    const date = new Date(isoString);
    // Return date if valid, otherwise return current date to prevent crash
    return isNaN(date.getTime()) ? new Date() : date;
};

// Helper to format Date to "HH:mm"
const formatTime = (date: Date): string => {
    return date.toTimeString().substring(0, 5);
};

// Helper: Convert "HH:mm" string to minutes from midnight
const timeToMinutes = (timeStr: any): number => {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const parts = timeStr.split(':');
    if (parts.length < 2) return 0;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
};

// Helper: Calculate standard hours of a shift (excluding break)
const getShiftDurationHours = (shift: Shift): number => {
    if (!shift || !shift.startTime || !shift.endTime) return 0;
    
    let start = timeToMinutes(shift.startTime);
    let end = timeToMinutes(shift.endTime);
    if (end < start) end += 24 * 60; // Overnight
    
    let durationMins = end - start;

    // Deduct break
    if (shift.breakStart && shift.breakEnd) {
        let bStart = timeToMinutes(shift.breakStart);
        let bEnd = timeToMinutes(shift.breakEnd);
        if (bEnd < bStart) bEnd += 24 * 60;
        
        // Try to fit break into shift window
        if (bStart < start) {
            // Potential next day break (e.g. Break 02:00, Shift Start 22:00)
            if (bStart + 1440 <= end) {
                 bStart += 1440;
                 bEnd += 1440;
            }
        }

        // Check if break is within shift
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
  const year = viewMonth.getFullYear();
  const monthIdx = viewMonth.getMonth(); // 0-indexed
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();

  // Pre-process logs
  const processedLogs = logs
    .filter(l => !l.isIgnored && l.timestamp)
    .map(l => ({ ...l, dateObj: parseLogTime(l.timestamp) }))
    .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

  // REFACTORED: Centralized Logic to determine Shift
  const getShiftForDate = (emp: Employee, dateStr: string, dateObj: Date): Shift | null => {
    let rawShift: Shift | undefined;
    const dayOfWeek = dateObj.getDay(); // 0=Sun, 6=Sat

    // 1. Check for specific assignment override (Manual Schedule)
    const assignment = schedules.find(s => s.employeeId === emp.id && s.date === dateStr);
    
    if (assignment) {
      if (assignment.shiftId === 'OFF') return null;
      rawShift = shifts.find(s => s.id === assignment.shiftId);
    } else {
      // 2. Fallback to Default Shift based on WorkDays config
      if (emp.defaultShiftId) {
          const defaultShift = shifts.find(s => s.id === emp.defaultShiftId);
          if (defaultShift) {
              const workDays = defaultShift.workDays || [1,2,3,4,5]; // Fallback
              // Only apply workDays filter if it's a default assignment
              if (workDays.includes(dayOfWeek)) {
                  rawShift = defaultShift;
              }
          }
      }
    }

    if (!rawShift) return null;

    // 3. UNIFIED: Handle Saturday Half Day Logic
    // This now applies to BOTH Manual Assignments and Default Shifts
    if (dayOfWeek === 6 && rawShift.isSaturdayHalfDay && rawShift.startTime) {
        // Logic: Only apply 12:00 cutoff if the shift starts in the morning.
        const startMins = timeToMinutes(rawShift.startTime);
        const noonMins = timeToMinutes('12:00');

        if (startMins < noonMins) {
             return {
                ...rawShift,
                endTime: '12:00', // Cutoff at noon
                breakStart: '12:00', // Remove break overlap effectively
                breakEnd: '12:00',
                name: (rawShift.name || '') + ' (1/2)'
            };
        } else {
            // Afternoon shift on a "Half Day Saturday" config -> Implicitly OFF
            // UNLESS it was manually assigned. If manually assigned, we trust manual assignment.
            if (assignment) {
                return rawShift;
            }
            return null;
        }
    }

    return rawShift; 
  };

  return employees.map(emp => {
    const records: { [date: string]: DailyRecord } = {};
    const summary = { totalWorkHours: 0, totalOT: 0, totalLate: 0, totalAbsent: 0, totalLeaves: 0, totalLeaveHours: 0, totalHolidays: 0 };

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDayDate = new Date(year, monthIdx, day);
      const dateStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      const shift = getShiftForDate(emp, dateStr, currentDayDate);
      
      // Check Holiday
      const isHoliday = holidays.some(h => h.date === dateStr);

      // Range Check for Requests
      const approvedRequests = requests.filter(r => 
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

      // 1. Handle Full Day Leave 
      if (approvedLeave && approvedLeave.isFullDay) {
          if (!isHoliday) {
              record.status.push(AttendanceStatus.Leave);
              summary.totalLeaves++;
              
              if (shift) {
                  record.leaveHours = getShiftDurationHours(shift);
              } else {
                  record.leaveHours = 8;
              }
              summary.totalLeaveHours += record.leaveHours;

              records[dateStr] = record;
              continue; 
          }
      }
      
      // 2. Handle Partial Leave
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

      // Define Log Search Window
      let windowStart = new Date(currentDayDate);
      let windowEnd = new Date(currentDayDate);

      // Ensure shift has valid times before processing
      if (shift && shift.startTime && typeof shift.startTime === 'string' && shift.endTime && typeof shift.endTime === 'string') {
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
                       // Valid (Holiday off) - Do nothing
                  } else if (!record.status.includes(AttendanceStatus.Leave)) {
                       record.status.push(AttendanceStatus.Absent);
                       summary.totalAbsent++;
                  }
              } else {
                  const inLog = relevantLogs[0];
                  const outLog = relevantLogs[relevantLogs.length - 1];

                  record.checkIn = formatTime(inLog.dateObj);
                  
                  // Standard Shift Logic
                  const diffInMs = inLog.dateObj.getTime() - shiftStartDateTime.getTime();
                  const diffInMins = Math.floor(diffInMs / 60000);

                  if (diffInMins > shift.toleranceMinutes && !isHoliday) {
                      let isExcused = false;
                      if (approvedExplanation) isExcused = true;
                      if (!isExcused && approvedLeave && !approvedLeave.isFullDay && approvedLeave.startTime && approvedLeave.endTime) {
                           const leaveStartMins = timeToMinutes(approvedLeave.startTime);
                           const leaveEndMins = timeToMinutes(approvedLeave.endTime);
                           const shiftStartMins = timeToMinutes(shift.startTime);
                           if (leaveStartMins <= shiftStartMins && leaveEndMins >= shiftStartMins) {
                               isExcused = true;
                           }
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
                           let isExcusedEarly = false;
                           if (approvedExplanation) isExcusedEarly = true;
                           if (!isExcusedEarly && approvedLeave && !approvedLeave.isFullDay && approvedLeave.startTime && approvedLeave.endTime) {
                               const leaveStartMins = timeToMinutes(approvedLeave.startTime);
                               const leaveEndMins = timeToMinutes(approvedLeave.endTime);
                               const shiftEndMins = timeToMinutes(shift.endTime);
                               if (leaveEndMins >= shiftEndMins && leaveStartMins <= shiftEndMins) {
                                   isExcusedEarly = true;
                               }
                           }

                           if (!isExcusedEarly) {
                              record.status.push(AttendanceStatus.EarlyLeave);
                              record.earlyMinutes = earlyMins;
                           }
                      }

                      let workMs = sessionDurationMs;
                      let breakMs = 0;
                      
                      // Calculate break if applicable
                      if (shift.breakStart && shift.breakEnd && typeof shift.breakStart === 'string' && typeof shift.breakEnd === 'string') {
                          const bsParts = shift.breakStart.split(':');
                          const beParts = shift.breakEnd.split(':');
                          
                          if (bsParts.length >= 2 && beParts.length >= 2) {
                              const bsH = parseInt(bsParts[0], 10);
                              const bsM = parseInt(bsParts[1], 10);
                              const beH = parseInt(beParts[0], 10);
                              const beM = parseInt(beParts[1], 10);
                              
                              const breakStart = new Date(shiftStartDateTime);
                              breakStart.setHours(bsH, bsM, 0, 0);
                              
                              const breakEnd = new Date(shiftStartDateTime);
                              breakEnd.setHours(beH, beM, 0, 0);
                              
                              if (breakEnd < breakStart) breakEnd.setDate(breakEnd.getDate() + 1);
                              else if (shift.isOvernight && bsH < sH) {
                                   breakStart.setDate(breakStart.getDate() + 1);
                                   breakEnd.setDate(breakEnd.getDate() + 1);
                              }

                              const overlapStart = new Date(Math.max(inLog.dateObj.getTime(), breakStart.getTime()));
                              const overlapEnd = new Date(Math.min(outLog.dateObj.getTime(), breakEnd.getTime()));

                              if (overlapEnd > overlapStart) {
                                  breakMs = overlapEnd.getTime() - overlapStart.getTime();
                              }
                          }
                      }

                      workMs = workMs - breakMs;
                      if (workMs < 0) workMs = 0;

                      if (shift.roundingMinutes && shift.roundingMinutes > 0) {
                          const totalMins = Math.floor(workMs / 60000);
                          const roundedMins = Math.floor(totalMins / shift.roundingMinutes) * shift.roundingMinutes;
                          workMs = roundedMins * 60000;
                      }

                      // If Holiday, all work hours are effectively OT
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
                       // Missing Punch
                       if (approvedExplanation) {
                           record.status.push(AttendanceStatus.Valid);
                       } else if (!isHoliday) {
                           record.status.push(AttendanceStatus.MissingPunch);
                       }
                  }
              }
          }

      } else {
          // OFF DAY or Holiday logic (no shift assigned)
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
              if (!isHoliday) {
                  record.status.push(AttendanceStatus.Off);
              }
          }
      }

      records[dateStr] = record;
    }

    return {
      employee: emp,
      records,
      summary
    };
  });
};
