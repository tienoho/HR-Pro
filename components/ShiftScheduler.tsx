
import React, { useState, useMemo, useRef } from 'react';
import { Employee, Shift, ShiftAssignment, AttendanceRequest, RequestStatus, RequestType, Holiday } from '../types';
import { ChevronLeft, ChevronRight, Calendar, Save, Copy, Check, Download, FileSpreadsheet, Upload, AlertCircle, Coffee, RotateCcw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toLocalISODate } from '../utils/dateUtils';

interface ShiftSchedulerProps {
  employees: Employee[];
  shifts: Shift[];
  schedules: ShiftAssignment[];
  requests?: AttendanceRequest[];
  holidays?: Holiday[];
  onUpdateSchedule: (newSchedules: ShiftAssignment[]) => void;
}

const ShiftScheduler: React.FC<ShiftSchedulerProps> = ({ employees, shifts, schedules, requests = [], holidays = [], onUpdateSchedule }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showSavedToast, setShowSavedToast] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const safeEmployees = useMemo(() => Array.isArray(employees) ? employees.filter(e => e && e.id) : [], [employees]);
  const safeShifts = useMemo(() => Array.isArray(shifts) ? shifts.filter(s => s && s.id) : [], [shifts]);
  const safeSchedules = useMemo(() => Array.isArray(schedules) ? schedules.filter(s => s && s.employeeId) : [], [schedules]);

  // OPTIMIZATION: Create HashMaps for O(1) lookups
  const shiftMap = useMemo(() => {
      const map = new Map<string, Shift>();
      safeShifts.forEach(s => map.set(s.id, s));
      return map;
  }, [safeShifts]);

  const scheduleMap = useMemo(() => {
      const map = new Map<string, ShiftAssignment>();
      safeSchedules.forEach(s => map.set(`${s.employeeId}_${s.date}`, s));
      return map;
  }, [safeSchedules]);

  const requestMap = useMemo(() => {
     // Map key: `${empId}_${date}` -> Request
     // Simplified for "Approved" requests only for now since we only visual approved ones
     // For range dates, this is tricky. We keep a list or specialized interval tree. 
     // For N=1000, simple iteration might be OK, but cell logic calls this N*30 times.
     // Let's create a "Day Map".
     const map = new Map<string, AttendanceRequest>();
     requests.forEach(r => {
         if (r.status === RequestStatus.Approved) {
             let d = new Date(r.startDate);
             const end = new Date(r.endDate || r.startDate);
             while (d <= end) {
                 const key = `${r.employeeId}_${toLocalISODate(d)}`;
                 // LIFO or FIFO? Latest request overrides?
                 map.set(key, r);
                 d.setDate(d.getDate() + 1);
             }
         }
     });
     return map;
  }, [requests]);

  const holidayMap = useMemo(() => {
      const map = new Map<string, Holiday>();
      holidays.forEach(h => map.set(h.date, h));
      return map;
  }, [holidays]);

  const daysInMonth = useMemo(() => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const days = new Date(year, month + 1, 0).getDate();
      return Array.from({length: days}, (_, i) => new Date(year, month, i + 1));
  }, [currentDate]);

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const getShiftForCell = (empId: string, date: Date) => {
      const dateStr = toLocalISODate(date);
      const day = date.getDay();
      
      // O(1) Lookup
      const assignment = scheduleMap.get(`${empId}_${dateStr}`);
      
      let rawShiftId = '';
      if (assignment) {
          rawShiftId = assignment.shiftId;
      } else {
          // Fallback to default shift
          const emp = safeEmployees.find(e => e.id === empId); // Consider optimizing employee lookup too if needed, but safeEmployees is usually small enough (or map it)
          if (emp && emp.defaultShiftId) {
              const shift = shiftMap.get(emp.defaultShiftId);
              if (shift) {
                  const workDays = shift.workDays || [1,2,3,4,5];
                  if (workDays.includes(day)) {
                      rawShiftId = shift.id;
                  }
              }
          }
      }

      if (!rawShiftId || rawShiftId === 'OFF') return '';
      const shiftObj = shiftMap.get(rawShiftId);
      if (shiftObj && day === 6 && shiftObj.isSaturdayHalfDay) return shiftObj.id + '_HALF';
      return rawShiftId;
  };

  const getShiftColor = (shiftIdRaw: string) => {
      if (!shiftIdRaw || shiftIdRaw === 'OFF') return 'bg-slate-50 text-slate-300';
      const shiftId = shiftIdRaw.replace('_HALF', '');
      const shift = shiftMap.get(shiftId);
      let baseColor = shift?.color || 'bg-slate-100 text-slate-800';
      return shiftIdRaw.includes('_HALF') ? baseColor + ' border-dashed border-2' : baseColor;
  };

  const getShiftCode = (shiftIdRaw: string) => {
      if (!shiftIdRaw || shiftIdRaw === 'OFF') return '-';
      const shiftId = shiftIdRaw.replace('_HALF', '');
      const shift = shiftMap.get(shiftId);
      return (shift?.code || '?') + (shiftIdRaw.includes('_HALF') ? ' (1/2)' : '');
  };

  const getApprovedRequest = (empId: string, date: Date) => {
      const dateStr = toLocalISODate(date);
      return requestMap.get(`${empId}_${dateStr}`);
  };
  
  const getHoliday = (date: Date) => {
      const dateStr = toLocalISODate(date); 
      return holidayMap.get(dateStr);
  };

  const handleCellClick = (empId: string, date: Date) => {
      if (!safeShifts.length) return;
      const dateStr = toLocalISODate(date); // FIXED
      const currentShiftIdRaw = getShiftForCell(empId, date);
      const currentShiftId = currentShiftIdRaw.replace('_HALF', '');
      
      let nextShiftId = '';
      if (!currentShiftId || currentShiftId === 'OFF') {
          nextShiftId = safeShifts[0].id; 
      } else {
          const idx = safeShifts.findIndex(s => s.id === currentShiftId);
          nextShiftId = (idx === -1 || idx === safeShifts.length - 1) ? 'OFF' : safeShifts[idx + 1].id;
      }

      const newEntry: ShiftAssignment = { employeeId: empId, date: dateStr, shiftId: nextShiftId };
      const otherSchedules = safeSchedules.filter(s => !(s.employeeId === empId && s.date === dateStr));
      onUpdateSchedule([...otherSchedules, newEntry]);
  };

  const handleResetMonth = () => {
      const monthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}`;
      if (window.confirm(`Reset tháng ${monthStr}?`)) {
          onUpdateSchedule(safeSchedules.filter(s => !s.date.startsWith(monthStr)));
      }
  };

  const handleSave = () => {
      setShowSavedToast(true);
      setTimeout(() => setShowSavedToast(false), 3000);
  };

  // Import schedule from Excel
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onload = (evt) => {
              const bstr = evt.target?.result;
              if (bstr) {
                  try {
                      const wb = XLSX.read(bstr, { type: 'binary' });
                      const wsName = wb.SheetNames[0];
                      const ws = wb.Sheets[wsName];
                      const data = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' }) as any[][];
                      
                      if (data.length < 2) {
                          alert('File không có dữ liệu hoặc sai định dạng.');
                          return;
                      }

                      // First row is headers: [Mã NV, Tên NV, Date1, Date2, ...]
                      const headers = data[0];
                      const dateHeaders = headers.slice(2); // Skip 'Mã NV' and 'Tên NV'
                      
                      // Create shift code to ID map
                      const shiftCodeMap = new Map<string, string>();
                      safeShifts.forEach(s => shiftCodeMap.set(s.code.toUpperCase(), s.id));
                      shiftCodeMap.set('OFF', 'OFF');
                      shiftCodeMap.set('P', 'OFF'); // Leave/Phép treated as OFF
                      
                      // Create employee code to ID map
                      const empCodeMap = new Map<string, string>();
                      safeEmployees.forEach(e => empCodeMap.set(e.code.toUpperCase(), e.id));
                      
                      const newAssignments: ShiftAssignment[] = [];
                      let importedCount = 0;
                      let skippedCount = 0;
                      const errors: string[] = [];
                      
                      // Process data rows
                      data.slice(1).forEach((row, rowIdx) => {
                          const empCode = String(row[0] || '').trim().toUpperCase();
                          const empId = empCodeMap.get(empCode);
                          
                          if (!empId) {
                              if (empCode) {
                                  errors.push(`Dòng ${rowIdx + 2}: Mã NV "${empCode}" không tồn tại`);
                                  skippedCount++;
                              }
                              return;
                          }
                          
                          // Process each date column
                          dateHeaders.forEach((dateHeader, colIdx) => {
                              const cellValue = String(row[colIdx + 2] || '').trim().toUpperCase();
                              if (!cellValue) return;
                              
                              // Parse date from header (expected format: YYYY-MM-DD)
                              let dateStr = '';
                              if (String(dateHeader).match(/^\d{4}-\d{2}-\d{2}$/)) {
                                  dateStr = dateHeader;
                              } else {
                                  // Try to parse other date formats
                                  const d = new Date(dateHeader);
                                  if (!isNaN(d.getTime())) {
                                      dateStr = toLocalISODate(d);
                                  }
                              }
                              
                              if (!dateStr) return;
                              
                              // Map cell value to shift ID
                              let shiftId = shiftCodeMap.get(cellValue);
                              if (!shiftId) {
                                  // Try partial match
                                  for (const [code, id] of shiftCodeMap) {
                                      if (cellValue.includes(code) || code.includes(cellValue)) {
                                          shiftId = id;
                                          break;
                                      }
                                  }
                              }
                              
                              if (shiftId) {
                                  newAssignments.push({
                                      employeeId: empId,
                                      date: dateStr,
                                      shiftId: shiftId
                                  });
                                  importedCount++;
                              }
                          });
                      });
                      
                      if (importedCount > 0) {
                          // Merge with existing schedules (overwrite duplicates)
                          const existingMap = new Map<string, ShiftAssignment>();
                          safeSchedules.forEach(s => existingMap.set(`${s.employeeId}_${s.date}`, s));
                          newAssignments.forEach(s => existingMap.set(`${s.employeeId}_${s.date}`, s));
                          
                          onUpdateSchedule(Array.from(existingMap.values()));
                          
                          let msg = `Import thành công ${importedCount} lịch phân ca.`;
                          if (skippedCount > 0) {
                              msg += `\nBỏ qua ${skippedCount} dòng lỗi.`;
                          }
                          if (errors.length > 0 && errors.length <= 5) {
                              msg += '\n\nChi tiết lỗi:\n' + errors.join('\n');
                          }
                          alert(msg);
                      } else {
                          alert('Không tìm thấy dữ liệu hợp lệ để import.\n\nVui lòng kiểm tra:\n- Cột đầu tiên là Mã NV\n- Hàng đầu tiên là ngày (YYYY-MM-DD)\n- Giá trị trong ô là mã ca (HC, CD, ...) hoặc OFF');
                      }
                  } catch (error) {
                      console.error("Import error:", error);
                      alert("Lỗi đọc file Excel. Vui lòng kiểm tra định dạng file.");
                  }
              }
          };
          reader.readAsBinaryString(file);
      }
      e.target.value = '';
  };

  const handleDownloadTemplate = () => {
    const dateHeaders = daysInMonth.map(d => toLocalISODate(d)); // FIXED
    const headers = ['Mã NV', 'Tên NV', ...dateHeaders];
    const body = safeEmployees.map(emp => [
        emp.code, emp.name, 
        ...dateHeaders.map(dateStr => getShiftCode(getShiftForCell(emp.id, new Date(dateStr))))
    ]);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...body]);
    XLSX.utils.book_append_sheet(wb, ws, `PhanCa`);
    XLSX.writeFile(wb, `PhanCa_T${currentDate.getMonth()+1}.xlsx`);
  };

  return (
    <div className="space-y-6 h-full flex flex-col relative">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
             <div>
                <h2 className="text-2xl font-bold text-slate-800">Phân ca làm việc</h2>
                <p className="text-slate-500 text-sm">Xếp lịch làm việc chi tiết cho nhân viên</p>
             </div>
             <div className="flex flex-wrap gap-2 w-full md:w-auto">
                 <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xls,.xlsx" className="hidden" />
                 <button onClick={handleDownloadTemplate} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-600 hover:text-blue-600 text-sm font-medium shadow-sm"><Download size={16} /> Mẫu</button>
                 <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-sm font-medium shadow-sm"><Upload size={16} /> Import</button>
                 <button onClick={handleResetMonth} className="px-3 py-2 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-100 text-sm font-medium shadow-sm"><RotateCcw size={16} /></button>
                 <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm shadow-sm font-medium"><Save size={16} /> Lưu</button>
             </div>
        </div>

        {showSavedToast && (
            <div className="absolute top-12 right-0 bg-green-600 text-white px-4 py-2 rounded shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 z-50">
                <Check size={16}/> Đã lưu thành công!
            </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex-1 flex flex-col overflow-hidden">
             <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                 <div className="flex items-center gap-4">
                     <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-200 rounded"><ChevronLeft /></button>
                     <h3 className="text-lg font-bold text-slate-800 w-48 text-center">T{currentDate.getMonth() + 1}/{currentDate.getFullYear()}</h3>
                     <button onClick={handleNextMonth} className="p-1 hover:bg-slate-200 rounded"><ChevronRight /></button>
                 </div>
                 <div className="hidden md:flex gap-4 text-xs">
                     {safeShifts.map(s => (
                         <div key={s.id} className="flex items-center gap-1">
                             <div className={`w-3 h-3 rounded ${s.color?.split(' ')[0] || 'bg-slate-200'}`}></div>
                             <span>{s.code}</span>
                         </div>
                     ))}
                 </div>
             </div>

             <div className="flex-1 overflow-auto relative">
                 <table className="border-collapse w-full min-w-max">
                     <thead className="bg-white sticky top-0 z-20 shadow-sm text-slate-700 text-xs font-semibold">
                         <tr>
                             <th className="sticky left-0 top-0 z-30 bg-slate-50 border-r border-b border-slate-300 p-2 w-48 text-left">Nhân viên</th>
                             {daysInMonth.map(d => {
                                 const holiday = getHoliday(d);
                                 return (
                                     <th key={d.toString()} className={`p-1 border-r border-b border-slate-300 min-w-[40px] text-center ${d.getDay() === 0 ? 'bg-slate-50 text-red-500' : ''} ${holiday ? 'bg-pink-50 text-pink-700' : ''}`}>
                                         <div>{d.getDate()}</div>
                                         <div className="font-normal opacity-70">{['CN','T2','T3','T4','T5','T6','T7'][d.getDay()]}</div>
                                     </th>
                                 )
                             })}
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 text-xs">
                         {safeEmployees.map(emp => (
                             <tr key={emp.id}>
                                 <td className="sticky left-0 z-10 bg-white border-r border-slate-200 p-2 font-medium text-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                     <div>{emp.name}</div>
                                     <div className="text-[10px] text-slate-500">{emp.code}</div>
                                 </td>
                                 {daysInMonth.map(d => {
                                     const shiftIdRaw = getShiftForCell(emp.id, d);
                                     const color = getShiftColor(shiftIdRaw);
                                     const code = getShiftCode(shiftIdRaw);
                                     const request = getApprovedRequest(emp.id, d);
                                     const isFullDayLeave = request?.type === RequestType.Leave && request.isFullDay;
                                     const holiday = getHoliday(d);

                                     return (
                                         <td key={d.toString()} onClick={() => handleCellClick(emp.id, d)} className={`p-0 border-r border-b border-slate-100 h-10 cursor-pointer hover:brightness-95 transition-all relative ${holiday ? 'bg-pink-50/30' : ''}`}>
                                             {isFullDayLeave ? (
                                                 <div className="w-full h-full flex items-center justify-center font-bold bg-purple-100 text-purple-700" title="Nghỉ phép">P</div>
                                             ) : (
                                                 <div className={`w-full h-full flex items-center justify-center font-medium ${holiday ? 'text-pink-600' : color}`}>
                                                     {code}
                                                 </div>
                                             )}
                                         </td>
                                     )
                                 })}
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
        </div>
    </div>
  );
};

export default ShiftScheduler;
