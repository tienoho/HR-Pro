
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

  const daysInMonth = useMemo(() => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const days = new Date(year, month + 1, 0).getDate();
      return Array.from({length: days}, (_, i) => new Date(year, month, i + 1));
  }, [currentDate]);

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const getShiftForCell = (empId: string, date: Date) => {
      const dateStr = toLocalISODate(date); // FIXED: Use Local ISO Date
      const day = date.getDay();
      
      const assignment = safeSchedules.find(s => s.employeeId === empId && s.date === dateStr);
      
      let rawShiftId = '';
      if (assignment) {
          rawShiftId = assignment.shiftId;
      } else {
          const emp = safeEmployees.find(e => e.id === empId);
          if (emp && emp.defaultShiftId) {
              const shift = safeShifts.find(s => s.id === emp.defaultShiftId);
              if (shift) {
                  const workDays = shift.workDays || [1,2,3,4,5];
                  if (workDays.includes(day)) {
                      rawShiftId = shift.id;
                  }
              }
          }
      }

      if (!rawShiftId || rawShiftId === 'OFF') return '';
      const shiftObj = safeShifts.find(s => s.id === rawShiftId);
      if (shiftObj && day === 6 && shiftObj.isSaturdayHalfDay) return shiftObj.id + '_HALF';
      return rawShiftId;
  };

  const getShiftColor = (shiftIdRaw: string) => {
      if (!shiftIdRaw || shiftIdRaw === 'OFF') return 'bg-slate-50 text-slate-300';
      const shiftId = shiftIdRaw.replace('_HALF', '');
      const shift = safeShifts.find(s => s.id === shiftId);
      let baseColor = shift?.color || 'bg-slate-100 text-slate-800';
      return shiftIdRaw.includes('_HALF') ? baseColor + ' border-dashed border-2' : baseColor;
  };

  const getShiftCode = (shiftIdRaw: string) => {
      if (!shiftIdRaw || shiftIdRaw === 'OFF') return '-';
      const shiftId = shiftIdRaw.replace('_HALF', '');
      const shift = safeShifts.find(s => s.id === shiftId);
      return (shift?.code || '?') + (shiftIdRaw.includes('_HALF') ? ' (1/2)' : '');
  };

  const getApprovedRequest = (empId: string, date: Date) => {
      const dateStr = toLocalISODate(date); // FIXED
      return requests.find(r => 
          r.employeeId === empId && 
          r.status === RequestStatus.Approved && 
          dateStr >= r.startDate &&
          dateStr <= (r.endDate || r.startDate)
      );
  };
  
  const getHoliday = (date: Date) => {
      const dateStr = toLocalISODate(date); // FIXED
      return holidays.find(h => h.date === dateStr);
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

  // Fix: Added handleFileChange to resolve the "Cannot find name 'handleFileChange'" error
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
                      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
                      console.log("Imported schedule data:", data);
                      alert("Tính năng Import lịch làm việc đang được phát triển.");
                  } catch (error) {
                      console.error("Import error:", error);
                      alert("Lỗi đọc file.");
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
