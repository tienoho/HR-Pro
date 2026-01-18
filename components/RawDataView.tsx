
import React, { useState, useMemo } from 'react';
import { AttendanceLog, Employee } from '../types';
import { Search, Filter, AlertTriangle, Database, Plus, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface RawDataViewProps {
  logs: AttendanceLog[];
  employees: Employee[];
  onAddLog: (log: AttendanceLog) => void;
}

type SortKey = 'timestamp' | 'timekeepingId' | 'employeeName' | 'source' | 'status';

const RawDataView: React.FC<RawDataViewProps> = ({ logs, employees, onAddLog }) => {
  const [filterEmp, setFilterEmp] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'timestamp', direction: 'desc' });

  // Form State
  const [newLogEmpId, setNewLogEmpId] = useState('');
  const [newLogDate, setNewLogDate] = useState('');
  const [newLogTime, setNewLogTime] = useState('');

  const employeeMap = useMemo(() => {
    const map = new Map<string, Employee>();
    employees.forEach(e => map.set(e.timekeepingId, e));
    return map;
  }, [employees]);

  const getEmpByMachineId = (mid: string) => employeeMap.get(mid);

  // FIXED: Logic nhận diện trùng lặp thông minh hơn
  // Nếu cùng 1 nhân viên quét 2 lần cách nhau dưới 60 giây -> Đánh dấu là trùng
  const processedLogs = useMemo(() => {
    const lastTapMap = new Map<string, number>();
    
    // Phải sắp xếp theo thời gian trước khi check trùng lặp theo interval
    const sortedOriginal = [...logs].sort((a,b) => a.timestamp.localeCompare(b.timestamp));
    
    const logsWithDupFlag = sortedOriginal.map((log) => {
        const timeMs = new Date(log.timestamp.replace(' ', 'T')).getTime();
        const key = log.timekeepingId;
        const lastTime = lastTapMap.get(key);
        
        let isDuplicate = false;
        if (lastTime && (timeMs - lastTime) < 60000) { // 60 giây
            isDuplicate = true;
        } else {
            lastTapMap.set(key, timeMs);
        }
        
        return { ...log, isDuplicate };
    });

    return logsWithDupFlag;
  }, [logs]);

  const filtered = useMemo(() => {
    return processedLogs.filter(l => {
        const emp = getEmpByMachineId(l.timekeepingId);
        const matchesEmp = !filterEmp || (emp && emp.name.toLowerCase().includes(filterEmp.toLowerCase())) || l.timekeepingId.includes(filterEmp);
        const matchesDate = !filterDate || l.timestamp.startsWith(filterDate);
        return matchesEmp && matchesDate;
    });
  }, [processedLogs, filterEmp, filterDate, employeeMap]);

  const sortedLogs = useMemo(() => {
      const sorted = [...filtered];
      sorted.sort((a, b) => {
          let valA: string = '', valB: string = '';
          if (sortConfig.key === 'timestamp') { valA = a.timestamp; valB = b.timestamp; }
          else if (sortConfig.key === 'timekeepingId') { valA = a.timekeepingId; valB = b.timekeepingId; }
          else if (sortConfig.key === 'employeeName') { valA = getEmpByMachineId(a.timekeepingId)?.name || ''; valB = getEmpByMachineId(b.timekeepingId)?.name || ''; }
          
          if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
          if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
      });
      return sorted;
  }, [filtered, sortConfig, employeeMap]);

  const handleManualSubmit = () => {
      if(!newLogEmpId || !newLogDate || !newLogTime) return;
      onAddLog({ id: `manual-${Date.now()}`, timekeepingId: newLogEmpId, timestamp: `${newLogDate} ${newLogTime}:00`, source: 'MANUAL' });
      setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 relative">
        <div className="flex justify-between items-center">
             <div><h2 className="text-2xl font-bold text-slate-800">Dữ liệu Công thô</h2><p className="text-slate-500 text-sm">Nhật ký máy chấm công (Đã lọc nhiễu 60s)</p></div>
             <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg shadow-sm"><Plus size={18} /> Thêm thủ công</button>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[600px]">
             <div className="p-4 border-b border-slate-200 bg-slate-50 flex gap-4 items-center">
                  <div className="flex items-center gap-2 bg-white px-3 py-2 border rounded-lg"><Search size={16} className="text-slate-400" /><input type="text" placeholder="Tìm kiếm..." value={filterEmp} onChange={e => setFilterEmp(e.target.value)} className="text-sm outline-none" /></div>
                  <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="text-sm border rounded-lg p-2" />
                  <div className="ml-auto flex items-center gap-3 text-xs"><span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> Hợp lệ</span><span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Trùng lặp</span></div>
             </div>
             <div className="flex-1 overflow-auto">
                 <table className="w-full text-left text-sm">
                     <thead className="bg-slate-100 text-slate-700 font-medium sticky top-0 z-10 shadow-sm">
                         <tr>
                             <th className="px-6 py-3 cursor-pointer" onClick={() => setSortConfig({key:'timestamp', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'})}>Thời gian</th>
                             <th className="px-6 py-3">Nhân viên</th>
                             <th className="px-6 py-3">Nguồn</th>
                             <th className="px-6 py-3">Trạng thái</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                         {sortedLogs.map(log => {
                             const emp = getEmpByMachineId(log.timekeepingId);
                             return (
                                 <tr key={log.id} className={`hover:bg-slate-50 transition-colors ${log.isDuplicate ? 'bg-slate-50 text-slate-400' : ''}`}>
                                     <td className="px-6 py-3 font-mono">{log.timestamp}</td>
                                     <td className="px-6 py-3">{emp?.name || 'Chưa map'}</td>
                                     <td className="px-6 py-3"><span className="px-2 py-0.5 rounded text-[10px] border">{log.source}</span></td>
                                     <td className="px-6 py-3">{log.isDuplicate ? <span className="text-orange-500 text-xs font-medium italic">Duplicate (Ignored)</span> : <span className="text-green-700 font-bold">Valid</span>}</td>
                                 </tr>
                             )
                         })}
                     </tbody>
                 </table>
             </div>
        </div>
        {isModalOpen && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl w-full max-w-md p-6">
                    <h3 className="font-bold text-lg mb-4">Thêm dữ liệu thủ công</h3>
                    <div className="space-y-4">
                        <select value={newLogEmpId} onChange={e => setNewLogEmpId(e.target.value)} className="w-full border rounded-lg p-2"><option value="">-- Nhân viên --</option>{employees.map(e => <option key={e.id} value={e.timekeepingId}>{e.name}</option>)}</select>
                        <div className="grid grid-cols-2 gap-4"><input type="date" value={newLogDate} onChange={e => setNewLogDate(e.target.value)} className="border rounded-lg p-2" /><input type="time" value={newLogTime} onChange={e => setNewLogTime(e.target.value)} className="border rounded-lg p-2" /></div>
                    </div>
                    <div className="mt-6 flex justify-end gap-3"><button onClick={() => setIsModalOpen(false)} className="px-4 py-2">Hủy</button><button onClick={handleManualSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Lưu</button></div>
                </div>
            </div>
        )}
    </div>
  );
};

export default RawDataView;
