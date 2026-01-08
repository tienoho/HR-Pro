
import React, { useMemo, useState, useEffect } from 'react';
import { TimesheetRow, AttendanceStatus, DailyRecord } from '../types';
import { Download, Search, Calendar, ChevronDown, Filter, Info } from 'lucide-react';
import * as XLSX from 'xlsx';

interface TimesheetViewProps {
  data: TimesheetRow[];
}

const formatDateKey = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const StatusCell = ({ record }: { record?: DailyRecord }) => {
    if (!record) return <div className="h-full w-full bg-slate-50/50 border-r border-b border-slate-100"></div>;

    const { status, checkIn, checkOut, lateMinutes, earlyMinutes, leaveHours } = record;
    
    let bgColor = 'bg-white';
    let textColor = 'text-slate-600';
    let label = '';
    
    // Improved Logic & Color Palette
    if (status.includes(AttendanceStatus.Leave)) {
        const isFullDay = !checkIn && !checkOut; 
        bgColor = 'bg-purple-50 hover:bg-purple-100';
        textColor = 'text-purple-700 font-medium';
        label = isFullDay ? `P\n${leaveHours}h` : `P.Giờ\n${checkIn?.substring(0,5)}-${checkOut?.substring(0,5)}`;
    } else if (status.includes(AttendanceStatus.Holiday)) {
        bgColor = 'bg-pink-50 hover:bg-pink-100';
        textColor = 'text-pink-600 font-medium';
        label = checkIn ? `Lễ (Làm)\n${checkIn.substring(0,5)}` : 'Lễ';
    } else if (status.includes(AttendanceStatus.Absent)) {
        bgColor = 'bg-red-50 hover:bg-red-100';
        textColor = 'text-red-600 font-bold';
        label = 'V';
    } else if (status.includes(AttendanceStatus.MissingPunch)) {
        bgColor = 'bg-orange-50 hover:bg-orange-100';
        textColor = 'text-orange-600';
        label = '?';
    } else if (status.includes(AttendanceStatus.Late) || status.includes(AttendanceStatus.EarlyLeave)) {
        bgColor = 'bg-yellow-50 hover:bg-yellow-100';
        textColor = 'text-yellow-700 font-medium';
        label = `${checkIn?.substring(0,5) || '--'} - ${checkOut?.substring(0,5) || '--'}`;
    } else {
        bgColor = 'bg-white hover:bg-blue-50';
        label = `${checkIn?.substring(0,5) || '--'} - ${checkOut?.substring(0,5) || '--'}`;
        if(status.includes(AttendanceStatus.Overtime)) {
             label += '\n+OT';
             textColor = 'text-blue-600 font-medium';
        }
    }

    return (
        <div className={`w-full h-full p-1 text-[10px] sm:text-[11px] leading-tight flex flex-col justify-center items-center border-r border-b border-slate-100 transition-colors ${bgColor} cursor-pointer group relative`}>
             <span className={`whitespace-pre-line text-center ${textColor}`}>{label}</span>
             {(lateMinutes > 0 || earlyMinutes > 0) && !status.includes(AttendanceStatus.Leave) && !status.includes(AttendanceStatus.Holiday) && (
                 <span className="text-[9px] text-red-500 font-bold mt-0.5">-{lateMinutes+earlyMinutes}p</span>
             )}
             
             {/* Enhanced Tooltip */}
             <div className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 hidden group-hover:block w-56 bg-white text-slate-700 text-xs rounded-lg p-3 z-[60] shadow-xl border border-slate-100 pointer-events-none animate-in fade-in zoom-in-95 duration-200">
                 <div className="font-bold border-b border-slate-100 pb-1 mb-2 text-slate-800 flex justify-between">
                     <span>{record.date}</span>
                     <span className="text-[10px] font-normal text-slate-400 bg-slate-50 px-1 rounded">{status.join(', ')}</span>
                 </div>
                 <div className="space-y-1">
                    <div className="flex justify-between"><span>Check In:</span> <span className="font-mono font-medium">{checkIn || '--:--'}</span></div>
                    <div className="flex justify-between"><span>Check Out:</span> <span className="font-mono font-medium">{checkOut || '--:--'}</span></div>
                    <div className="h-px bg-slate-100 my-1"></div>
                    <div className="flex justify-between"><span>Công:</span> <span className="font-medium text-blue-600">{record.workHours}h</span></div>
                    {record.otHours > 0 && <div className="flex justify-between"><span>Tăng ca:</span> <span className="font-medium text-blue-600">{record.otHours}h</span></div>}
                    {(lateMinutes > 0 || earlyMinutes > 0) && (
                        <div className="flex justify-between text-red-500">
                            <span>Vi phạm:</span>
                            <span>{lateMinutes + earlyMinutes} phút</span>
                        </div>
                    )}
                 </div>
                 {/* Triangle Arrow */}
                 <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 w-2 h-2 bg-white rotate-45 border-b border-r border-slate-100"></div>
             </div>
        </div>
    )
}

const TimesheetView: React.FC<TimesheetViewProps> = ({ data }) => {
    const today = new Date();
    // Initial State based on today
    const [startDate, setStartDate] = useState(formatDateKey(new Date(today.getFullYear(), today.getMonth(), 1)));
    const [endDate, setEndDate] = useState(formatDateKey(new Date(today.getFullYear(), today.getMonth() + 1, 0)));
    
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<AttendanceStatus | 'ALL'>('ALL');
    const [deptFilter, setDeptFilter] = useState<string>('ALL');

    // Sync Date Range when data updates (implying global month view changed)
    useEffect(() => {
        if (data.length > 0) {
            // Find the first date available in the data records
            const sampleRecords = data[0].records;
            const dates = Object.keys(sampleRecords).sort();
            if (dates.length > 0) {
                const first = dates[0];
                const last = dates[dates.length - 1];
                setStartDate(first);
                setEndDate(last);
            }
        }
    }, [data]);

    const days = useMemo(() => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const daysArr = [];
        const MAX_DAYS = 62;
        let count = 0;
        
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            daysArr.push(new Date(d));
            count++;
            if (count > MAX_DAYS) break;
        }
        return daysArr;
    }, [startDate, endDate]);

    // Extract unique departments
    const departments = useMemo(() => {
        const depts = new Set(data.map(r => r.employee.department));
        return Array.from(depts).sort();
    }, [data]);

    const filteredRows = useMemo(() => {
        return data.filter(row => {
            // Search
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch = row.employee.name.toLowerCase().includes(searchLower) || 
                                  row.employee.id.toLowerCase().includes(searchLower);
            if (!matchesSearch) return false;

            // Dept Filter
            if (deptFilter !== 'ALL' && row.employee.department !== deptFilter) return false;

            // Status Filter
            if (statusFilter === 'ALL') return true;

            return days.some(d => {
                const dateStr = formatDateKey(d);
                const record = row.records[dateStr];
                return record?.status.includes(statusFilter);
            });
        });
    }, [data, searchQuery, statusFilter, deptFilter, days]);

    const stats = useMemo(() => {
        let totalLate = 0;
        let totalAbsent = 0;
        let totalOT = 0;
        let totalLeaves = 0;
        let totalHolidays = 0;
        
        filteredRows.forEach(row => {
             days.forEach(d => {
                 const dateStr = formatDateKey(d);
                 const record = row.records[dateStr];
                 if (record) {
                     if (record.status.includes(AttendanceStatus.Late)) totalLate++;
                     if (record.status.includes(AttendanceStatus.Absent)) totalAbsent++;
                     if (record.status.includes(AttendanceStatus.Overtime)) totalOT++;
                     if (record.status.includes(AttendanceStatus.Leave)) totalLeaves++;
                     if (record.status.includes(AttendanceStatus.Holiday)) totalHolidays++;
                 }
             });
        });
        return { totalLate, totalAbsent, totalOT, totalLeaves, totalHolidays };
    }, [filteredRows, days]);

    const handleExport = () => {
        if (filteredRows.length === 0) return;

        const header = [
            "Mã NV",
            "Họ tên",
            "Phòng ban",
            ...days.map(d => formatDateKey(d)), 
            "Tổng Công (h)",
            "Số lần Trễ",
            "Ngày Vắng",
            "Giờ Phép",
            "Giờ OT"
        ];

        const body = filteredRows.map(row => {
            const dailyData = days.map(d => {
                const dateKey = formatDateKey(d);
                const record = row.records[dateKey];
                if (!record) return "";
                
                if (record.status.includes(AttendanceStatus.Leave) && !record.checkIn) return "P";
                if (record.status.includes(AttendanceStatus.Holiday)) return "Lễ";
                if (record.status.includes(AttendanceStatus.Absent)) return "V";
                
                let text = "";
                if (record.checkIn && record.checkOut) {
                    text = `${record.checkIn} - ${record.checkOut}`;
                } else if (record.checkIn) {
                    text = `${record.checkIn} - ?`;
                }

                if (record.lateMinutes > 0) text += ` (Trễ ${record.lateMinutes}p)`;
                if (record.earlyMinutes > 0) text += ` (Sớm ${record.earlyMinutes}p)`;
                if (record.status.includes(AttendanceStatus.Overtime)) text += ` (OT)`;
                if (record.leaveHours > 0) text += ` (P ${record.leaveHours}h)`;
                
                return text;
            });

            let w = 0, l = 0, a = 0, ot = 0, leH = 0;
            days.forEach(d => {
                const rec = row.records[formatDateKey(d)];
                if(rec) {
                    w += rec.workHours;
                    ot += rec.otHours;
                    leH += rec.leaveHours;
                    if(rec.status.includes(AttendanceStatus.Late)) l++;
                    if(rec.status.includes(AttendanceStatus.Absent)) a++;
                }
            });

            return [
                row.employee.id,
                row.employee.name,
                row.employee.department,
                ...dailyData,
                w,
                l,
                a,
                leH,
                ot
            ];
        });

        const finalData = [header, ...body];
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(finalData);
        XLSX.utils.book_append_sheet(wb, ws, "BangCong");
        XLSX.writeFile(wb, `BangCong_${startDate}_${endDate}.xlsx`);
    };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
        <div className="flex flex-col border-b border-slate-200 bg-white p-4 gap-4">
            <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
                <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto">
                    {/* Search */}
                    <div className="relative flex-1 md:w-56 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-blue-500 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Tìm nhân viên..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-full transition-all"
                        />
                    </div>
                    
                    {/* Date Picker */}
                    <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 overflow-hidden transition-all">
                        <div className="pl-3 pr-2 text-slate-400 border-r border-slate-100 h-full flex items-center bg-slate-50">
                            <Calendar size={16}/>
                        </div>
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border-none focus:ring-0 text-sm py-2 px-2 w-32 outline-none bg-transparent font-medium text-slate-700" />
                        <span className="text-slate-400">to</span>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border-none focus:ring-0 text-sm py-2 px-2 w-32 outline-none bg-transparent font-medium text-slate-700" />
                    </div>

                    {/* Department Filter */}
                    <div className="relative md:w-40 group">
                         <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors"><Filter size={14}/></div>
                        <select 
                            value={deptFilter}
                            onChange={(e) => setDeptFilter(e.target.value)}
                            className="appearance-none pl-9 pr-8 py-2 w-full border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all cursor-pointer hover:bg-slate-50"
                        >
                            <option value="ALL">Tất cả Phòng ban</option>
                            {departments.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                    </div>

                    {/* Status Filter */}
                    <div className="relative md:w-40 group">
                        <select 
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as AttendanceStatus | 'ALL')}
                            className="appearance-none pl-3 pr-8 py-2 w-full border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all cursor-pointer hover:bg-slate-50"
                        >
                            <option value="ALL">Tất cả Trạng thái</option>
                            <option value={AttendanceStatus.Valid}>Hiện diện</option>
                            <option value={AttendanceStatus.Leave}>Nghỉ phép</option>
                            <option value={AttendanceStatus.Holiday}>Nghỉ lễ</option>
                            <option value={AttendanceStatus.Late}>Đi muộn</option>
                            <option value={AttendanceStatus.Absent}>Vắng mặt</option>
                            <option value={AttendanceStatus.Overtime}>Tăng ca</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                    </div>
                </div>
                
                <div className="flex items-center gap-4 self-end xl:self-auto w-full xl:w-auto justify-between xl:justify-end">
                    <div className="hidden lg:flex items-center gap-4 text-xs font-medium text-slate-600 bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
                         <div className="flex items-center gap-1.5" title="Vắng mặt"><div className="w-2 h-2 bg-red-500 rounded-full"></div> {stats.totalAbsent}</div>
                         <div className="w-px h-3 bg-slate-300"></div>
                         <div className="flex items-center gap-1.5" title="Nghỉ phép"><div className="w-2 h-2 bg-purple-500 rounded-full"></div> {stats.totalLeaves}</div>
                         <div className="w-px h-3 bg-slate-300"></div>
                         <div className="flex items-center gap-1.5" title="Đi muộn"><div className="w-2 h-2 bg-yellow-500 rounded-full"></div> {stats.totalLate}</div>
                    </div>
                    <button 
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 shadow-sm shadow-emerald-500/20 transition-all active:scale-95"
                    >
                        <Download size={16} /> Xuất Excel
                    </button>
                </div>
            </div>
        </div>

        <div className="flex-1 overflow-auto relative scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-50">
            {filteredRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                        <Search size={32} className="text-slate-400" />
                    </div>
                    <p className="font-medium text-slate-700">Không tìm thấy dữ liệu</p>
                    <p className="text-sm">Vui lòng thử lại với bộ lọc khác.</p>
                </div>
            ) : (
                <table className="border-collapse w-full min-w-max">
                    <thead className="bg-slate-50 text-slate-700 sticky top-0 z-40 shadow-sm">
                        <tr>
                            <th className="sticky left-0 top-0 z-50 bg-slate-50 p-3 text-left text-xs font-bold uppercase tracking-wider border-r border-b border-slate-200 w-56 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                Nhân viên ({filteredRows.length})
                            </th>
                            {days.map(d => {
                                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                return (
                                    <th key={d.toString()} className={`p-2 text-center text-xs font-semibold border-r border-b border-slate-200 min-w-[90px] ${isWeekend ? 'bg-slate-100 text-slate-800' : ''}`}>
                                        <div>{d.getDate()}</div>
                                        <div className="text-[10px] text-slate-500 font-normal uppercase">{['CN','T2','T3','T4','T5','T6','T7'][d.getDay()]}</div>
                                    </th>
                                )
                            })}
                            <th className="p-3 text-center text-xs font-bold uppercase border-b border-slate-200 w-28 bg-slate-50 sticky right-0 z-40 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)]">Tổng hợp</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredRows.map((row) => (
                            <tr key={row.employee.id} className="hover:bg-slate-50 group transition-colors">
                                <td className="sticky left-0 z-30 bg-white group-hover:bg-slate-50 p-3 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                    <div>
                                        <div className="font-semibold text-slate-800 text-sm">{row.employee.name}</div>
                                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                            <span className="font-mono bg-slate-100 px-1 rounded text-[10px]">{row.employee.id}</span>
                                            <span>•</span>
                                            <span className="truncate max-w-[100px]">{row.employee.department}</span>
                                        </div>
                                    </div>
                                </td>
                                {days.map(d => {
                                    const dateStr = formatDateKey(d);
                                    return (
                                        <td key={dateStr} className="p-0 border-r border-slate-100 h-16 relative">
                                            <StatusCell record={row.records[dateStr]} />
                                        </td>
                                    )
                                })}
                                <td className="sticky right-0 z-30 bg-slate-50 p-2 border-l border-slate-200 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)] text-xs">
                                    {(() => {
                                        let w = 0, l = 0, a = 0, leH = 0;
                                        days.forEach(d => {
                                            const rec = row.records[formatDateKey(d)];
                                            if(rec) {
                                                w += rec.workHours;
                                                leH += rec.leaveHours;
                                                if(rec.status.includes(AttendanceStatus.Late)) l++;
                                                if(rec.status.includes(AttendanceStatus.Absent)) a++;
                                            }
                                        })
                                        return (
                                            <div className="space-y-1.5">
                                                <div className="flex justify-between items-center"><span className="text-slate-500">Công:</span> <span className="font-bold text-slate-800">{w}h</span></div>
                                                <div className="w-full h-px bg-slate-200"></div>
                                                <div className="flex justify-between text-purple-600"><span>Phép:</span> <span className="font-medium">{leH}h</span></div>
                                                <div className="flex justify-between text-yellow-600"><span>Trễ:</span> <span>{l}</span></div>
                                            </div>
                                        )
                                    })()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    </div>
  );
};

export default TimesheetView;
