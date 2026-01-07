
import React, { useState, useMemo, useRef } from 'react';
import { Employee, Shift, ShiftAssignment, AttendanceRequest, RequestStatus, RequestType, Holiday } from '../types';
import { ChevronLeft, ChevronRight, Calendar, Save, Copy, Check, Download, FileSpreadsheet, Upload, AlertCircle, Coffee, RotateCcw } from 'lucide-react';
import * as XLSX from 'xlsx';

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
  
  // Get days in current month
  const daysInMonth = useMemo(() => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const days = new Date(year, month + 1, 0).getDate();
      return Array.from({length: days}, (_, i) => new Date(year, month, i + 1));
  }, [currentDate]);

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const getShiftForCell = (empId: string, date: Date) => {
      const dateStr = date.toISOString().split('T')[0];
      const day = date.getDay();
      
      // 1. Check Manual Assignment
      const assignment = schedules.find(s => s.employeeId === empId && s.date === dateStr);
      
      let rawShiftId = '';
      
      if (assignment) {
          rawShiftId = assignment.shiftId;
      } else {
          // 2. Check Default
          const emp = employees.find(e => e.id === empId);
          if (emp && emp.defaultShiftId) {
              const shift = shifts.find(s => s.id === emp.defaultShiftId);
              if (shift) {
                  const workDays = shift.workDays || [1,2,3,4,5];
                  if (workDays.includes(day)) {
                      rawShiftId = shift.id;
                  }
              }
          }
      }

      if (!rawShiftId || rawShiftId === 'OFF') return '';

      // 3. Apply Half Day Visual Logic (Unified)
      const shiftObj = shifts.find(s => s.id === rawShiftId);
      if (shiftObj && day === 6 && shiftObj.isSaturdayHalfDay) {
          return shiftObj.id + '_HALF';
      }

      return rawShiftId;
  };

  const getShiftColor = (shiftIdRaw: string) => {
      if (!shiftIdRaw || shiftIdRaw === 'OFF') return 'bg-slate-50 text-slate-300';
      
      const shiftId = shiftIdRaw.replace('_HALF', '');
      const shift = shifts.find(s => s.id === shiftId);
      
      // Defensive check for shift.color availability
      let baseColor = 'bg-white';
      if (shift && shift.color && typeof shift.color === 'string') {
          baseColor = shift.color.replace('bg-', 'bg-').replace('text-', 'text-');
      } else if (shift) {
          baseColor = 'bg-slate-100 text-slate-800'; // Fallback if no color
      }

      if (shiftIdRaw.includes('_HALF')) {
          // Add some visual flair for half day
          return baseColor + ' border-dashed border-2'; 
      }
      return baseColor;
  };

  const getShiftCode = (shiftIdRaw: string) => {
      if (!shiftIdRaw || shiftIdRaw === 'OFF') return '-';
      
      const shiftId = shiftIdRaw.replace('_HALF', '');
      const shift = shifts.find(s => s.id === shiftId);
      
      let code = shift && shift.code ? shift.code : '?';
      if (shiftIdRaw.includes('_HALF')) {
          return code + ' (1/2)';
      }
      return code;
  };

  // Helper to find APPROVED request for specific cell (Date Range Check)
  const getApprovedRequest = (empId: string, date: Date) => {
      const dateStr = date.toISOString().split('T')[0];
      return requests.find(r => 
          r.employeeId === empId && 
          r.status === RequestStatus.Approved && 
          dateStr >= r.startDate &&
          dateStr <= (r.endDate || r.startDate)
      );
  };
  
  const getHoliday = (date: Date) => {
      const dateStr = date.toISOString().split('T')[0];
      return holidays.find(h => h.date === dateStr);
  };

  const handleCellClick = (empId: string, date: Date) => {
      if (!shifts || shifts.length === 0) {
          alert("Vui lòng cấu hình ít nhất một ca làm việc trước khi phân ca.");
          return;
      }

      const dateStr = date.toISOString().split('T')[0];
      const currentShiftIdRaw = getShiftForCell(empId, date);
      const currentShiftId = currentShiftIdRaw.replace('_HALF', '');
      
      let nextShiftId = '';
      if (!currentShiftId || currentShiftId === 'OFF') {
          // Default to first shift if current is empty/OFF
          nextShiftId = shifts[0].id; 
      } else {
          const idx = shifts.findIndex(s => s.id === currentShiftId);
          // If current shift is last in list or not found (deleted?), go to OFF
          if (idx === -1 || idx === shifts.length - 1) nextShiftId = 'OFF';
          else nextShiftId = shifts[idx + 1].id;
      }

      // Update parent state
      const newEntry: ShiftAssignment = { employeeId: empId, date: dateStr, shiftId: nextShiftId };
      const otherSchedules = schedules.filter(s => !(s.employeeId === empId && s.date === dateStr));
      onUpdateSchedule([...otherSchedules, newEntry]);
  };

  const handleResetMonth = () => {
      const monthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}`;
      if (!window.confirm(`Bạn có chắc chắn muốn xóa toàn bộ phân ca thủ công trong tháng ${monthStr}?\n\nHệ thống sẽ quay về sử dụng Lịch làm việc mặc định của từng nhân viên.`)) return;

      // Keep assignments that DO NOT start with this month string
      const newAssignments = schedules.filter(s => !s.date.startsWith(monthStr));
      onUpdateSchedule(newAssignments);
      alert("Đã đặt lại lịch về mặc định.");
  };

  const handleSave = () => {
      setShowSavedToast(true);
      setTimeout(() => setShowSavedToast(false), 3000);
  };

  const handleDownloadTemplate = () => {
    const dateHeaders = daysInMonth.map(d => d.toISOString().split('T')[0]);
    const headers = ['Mã NV', 'Tên NV', ...dateHeaders];
    const body = employees.map(emp => {
        const rowData = [emp.code, emp.name];
        dateHeaders.forEach(dateStr => {
            const shiftId = getShiftForCell(emp.id, new Date(dateStr));
            rowData.push(getShiftCode(shiftId));
        });
        return rowData;
    });

    const finalData = [headers, ...body];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(finalData);
    XLSX.utils.book_append_sheet(wb, ws, `PhanCa_${currentDate.getMonth()+1}_${currentDate.getFullYear()}`);
    XLSX.writeFile(wb, `Template_PhanCa_T${currentDate.getMonth()+1}.xlsx`);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

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

                    if (data.length < 2) return;

                    const headers = data[0];
                    const newAssignments: ShiftAssignment[] = [...schedules];
                    let count = 0;

                    data.slice(1).forEach(row => {
                        const empCode = row[0];
                        const emp = employees.find(e => e.code === String(empCode).trim());
                        
                        if (emp) {
                            for (let i = 2; i < row.length; i++) {
                                const dateStr = headers[i];
                                const shiftCodeRaw = row[i];
                                if (dateStr && shiftCodeRaw) {
                                    if (!String(dateStr).match(/^\d{4}-\d{2}-\d{2}$/)) continue;
                                    const shiftCode = String(shiftCodeRaw).trim().toUpperCase();
                                    let shiftId = '';

                                    if (shiftCode === 'OFF' || shiftCode === '-') {
                                        shiftId = 'OFF';
                                    } else {
                                        // Remove (1/2) suffix if present during import matching
                                        const cleanCode = shiftCode.replace(' (1/2)', '').trim();
                                        const shift = shifts.find(s => s.code.toUpperCase() === cleanCode);
                                        if (shift) shiftId = shift.id;
                                    }

                                    if (shiftId) {
                                        const existingIdx = newAssignments.findIndex(s => s.employeeId === emp.id && s.date === dateStr);
                                        if (existingIdx >= 0) {
                                            newAssignments[existingIdx] = { ...newAssignments[existingIdx], shiftId };
                                        } else {
                                            newAssignments.push({ employeeId: emp.id, date: String(dateStr), shiftId });
                                        }
                                        count++;
                                    }
                                }
                            }
                        }
                    });

                    onUpdateSchedule(newAssignments);
                    alert(`Đã nhập thành công ${count} ca làm việc!`);

                } catch (error) {
                    console.error("Import error", error);
                    alert("Lỗi đọc file Excel. Vui lòng kiểm tra định dạng.");
                }
            }
        };
        reader.readAsBinaryString(file);
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-6 h-full flex flex-col relative">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
             <div>
                <h2 className="text-2xl font-bold text-slate-800">Phân ca làm việc</h2>
                <p className="text-slate-500 text-sm">Xếp lịch làm việc chi tiết cho nhân viên</p>
             </div>
             <div className="flex flex-wrap gap-2 w-full md:w-auto">
                 <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".xls,.xlsx"
                    className="hidden"
                 />
                 
                 <button onClick={handleDownloadTemplate} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-600 hover:text-blue-600 hover:border-blue-300 text-sm font-medium shadow-sm transition-colors">
                     <Download size={16} /> <span className="hidden sm:inline">Tải Mẫu</span>
                 </button>
                 <button onClick={handleImportClick} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-sm font-medium shadow-sm">
                     <Upload size={16} /> <span className="hidden sm:inline">Import Excel</span>
                 </button>
                 <div className="w-px h-8 bg-slate-300 mx-1 hidden md:block"></div>
                 <button 
                    onClick={handleResetMonth}
                    className="flex items-center gap-2 px-3 py-2 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-100 text-sm font-medium shadow-sm"
                    title="Xóa tất cả phân ca thủ công trong tháng này"
                 >
                     <RotateCcw size={16} /> <span className="hidden sm:inline">Reset Tháng</span>
                 </button>
                 <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm shadow-sm font-medium">
                     <Save size={16} /> Lưu
                 </button>
             </div>
        </div>

        {showSavedToast && (
            <div className="absolute top-12 right-0 bg-green-600 text-white px-4 py-2 rounded shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 z-50">
                <Check size={16}/> Đã lưu lịch làm việc thành công!
            </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex-1 flex flex-col overflow-hidden">
             {/* Calendar Header Control */}
             <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                 <div className="flex items-center gap-4">
                     <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-200 rounded"><ChevronLeft /></button>
                     <h3 className="text-lg font-bold text-slate-800 w-48 text-center">
                         Tháng {currentDate.getMonth() + 1}, {currentDate.getFullYear()}
                     </h3>
                     <button onClick={handleNextMonth} className="p-1 hover:bg-slate-200 rounded"><ChevronRight /></button>
                 </div>
                 <div className="hidden md:flex gap-4 text-xs">
                     {shifts.map(s => (
                         <div key={s.id} className="flex items-center gap-1">
                             <div className={`w-3 h-3 rounded ${s.color ? s.color.split(' ')[0] : 'bg-slate-200'}`}></div>
                             <span>{s.code}: {s.startTime}-{s.endTime}</span>
                         </div>
                     ))}
                     <div className="flex items-center gap-1">
                         <div className="w-3 h-3 rounded bg-slate-200"></div>
                         <span>OFF: Nghỉ</span>
                     </div>
                     <div className="flex items-center gap-1">
                         <div className="w-3 h-3 rounded bg-purple-100 border border-purple-200"></div>
                         <span>P: Đã duyệt Nghỉ</span>
                     </div>
                     <div className="flex items-center gap-1">
                         <div className="w-3 h-3 rounded bg-pink-100 border border-pink-200"></div>
                         <span>Lễ</span>
                     </div>
                 </div>
             </div>

             {/* Matrix */}
             <div className="flex-1 overflow-auto relative">
                 <table className="border-collapse w-full min-w-max">
                     <thead className="bg-white sticky top-0 z-20 shadow-sm text-slate-700 text-xs font-semibold">
                         <tr>
                             <th className="sticky left-0 top-0 z-30 bg-slate-50 border-r border-b border-slate-300 p-2 w-48 text-left">Nhân viên</th>
                             {daysInMonth.map(d => {
                                 const holiday = getHoliday(d);
                                 return (
                                     <th key={d.toString()} className={`p-1 border-r border-b border-slate-300 min-w-[40px] text-center ${d.getDay() === 0 || d.getDay() === 6 ? 'bg-slate-50 text-red-500' : ''} ${holiday ? 'bg-pink-50 text-pink-700' : ''}`}>
                                         <div>{d.getDate()}</div>
                                         <div className="font-normal opacity-70">{['CN','T2','T3','T4','T5','T6','T7'][d.getDay()]}</div>
                                         {holiday && <div className="text-[9px] truncate max-w-[40px]" title={holiday.name}>{holiday.name}</div>}
                                     </th>
                                 )
                             })}
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 text-xs">
                         {employees.map(emp => (
                             <tr key={emp.id}>
                                 <td className="sticky left-0 z-10 bg-white border-r border-slate-200 p-2 font-medium text-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                     <div>{emp.name}</div>
                                     <div className="text-[10px] text-slate-500">{emp.code}</div>
                                 </td>
                                 {daysInMonth.map(d => {
                                     const shiftIdRaw = getShiftForCell(emp.id, d);
                                     const shiftId = shiftIdRaw.replace('_HALF', '');
                                     const color = getShiftColor(shiftIdRaw);
                                     const code = getShiftCode(shiftIdRaw);
                                     
                                     // Retrieve Approved Request for visual indication
                                     const request = getApprovedRequest(emp.id, d);
                                     const isFullDayLeave = request?.type === RequestType.Leave && request.isFullDay;
                                     const isPartialLeave = request?.type === RequestType.Leave && !request.isFullDay;
                                     const isExplanation = request?.type === RequestType.Explanation;
                                     
                                     const holiday = getHoliday(d);

                                     return (
                                         <td 
                                            key={d.toString()} 
                                            onClick={() => handleCellClick(emp.id, d)}
                                            className={`p-0 border-r border-b border-slate-100 h-10 cursor-pointer hover:brightness-95 transition-all relative ${holiday ? 'bg-pink-50/30' : ''}`}
                                         >
                                             {/* If Full Day Leave, override content completely with 'P' */}
                                             {isFullDayLeave ? (
                                                 <div className="w-full h-full flex items-center justify-center font-bold bg-purple-100 text-purple-700 relative" title={`Nghỉ phép: ${request.reason}`}>
                                                     P
                                                 </div>
                                             ) : (
                                                 <div className={`w-full h-full flex items-center justify-center font-medium ${holiday ? 'text-pink-600' : color} relative`}>
                                                     {code}
                                                     
                                                     {/* Indicator for Partial Leave or Explanation */}
                                                     {(isPartialLeave || isExplanation) && (
                                                         <div className="absolute top-0 right-0 p-0.5 z-20">
                                                              <div 
                                                                className={`${isPartialLeave ? 'bg-purple-500' : 'bg-orange-500'} text-white rounded-full w-3 h-3 flex items-center justify-center shadow-sm`} 
                                                                title={`Đã duyệt: ${isPartialLeave ? 'Nghỉ theo giờ' : 'Giải trình'}`}
                                                              >
                                                                  {isPartialLeave ? <Coffee size={8} /> : <AlertCircle size={8} />}
                                                              </div>
                                                         </div>
                                                     )}
                                                     {holiday && !isPartialLeave && !isExplanation && (
                                                          <div className="absolute top-0 right-0 p-0.5 z-10">
                                                              <div className="bg-pink-500 rounded-full w-2 h-2"></div>
                                                          </div>
                                                     )}
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
