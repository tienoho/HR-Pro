
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
  
  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
      key: 'timestamp',
      direction: 'desc'
  });

  // Form State
  const [newLogEmpId, setNewLogEmpId] = useState('');
  const [newLogDate, setNewLogDate] = useState('');
  const [newLogTime, setNewLogTime] = useState('');

  const getEmpByMachineId = (mid: string) => employees.find(e => e.timekeepingId === mid);

  // Simple duplicate detection for UI visualization
  // We keep the map here but remove the hardcoded sort, as we will sort dynamically later
  const processedLogs = useMemo(() => {
    return logs.map((log, idx, arr) => {
        const isDuplicate = arr.some((l, i) => i !== idx && l.timekeepingId === log.timekeepingId && l.timestamp === log.timestamp);
        return { ...log, isDuplicate };
    });
  }, [logs]);

  // Filter Logic
  const filtered = useMemo(() => {
    return processedLogs.filter(l => {
        const emp = getEmpByMachineId(l.timekeepingId);
        const matchesEmp = !filterEmp || (emp && emp.name.toLowerCase().includes(filterEmp.toLowerCase())) || l.timekeepingId.includes(filterEmp);
        const matchesDate = !filterDate || l.timestamp.startsWith(filterDate);
        return matchesEmp && matchesDate;
    });
  }, [processedLogs, filterEmp, filterDate, employees]);

  // Sort Logic
  const sortedLogs = useMemo(() => {
      const sorted = [...filtered];
      sorted.sort((a, b) => {
          let valA: string = '';
          let valB: string = '';

          switch (sortConfig.key) {
              case 'timestamp':
                  valA = a.timestamp;
                  valB = b.timestamp;
                  break;
              case 'timekeepingId':
                  valA = a.timekeepingId;
                  valB = b.timekeepingId;
                  break;
              case 'employeeName':
                  valA = getEmpByMachineId(a.timekeepingId)?.name || '';
                  valB = getEmpByMachineId(b.timekeepingId)?.name || '';
                  break;
              case 'source':
                  valA = a.source;
                  valB = b.source;
                  break;
              case 'status':
                  valA = a.isDuplicate ? 'Duplicate' : 'Valid';
                  valB = b.isDuplicate ? 'Duplicate' : 'Valid';
                  break;
              default:
                  return 0;
          }

          if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
          if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
      });
      return sorted;
  }, [filtered, sortConfig, employees]);

  const handleSort = (key: SortKey) => {
      setSortConfig(current => ({
          key,
          direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
      }));
  };

  const handleManualSubmit = () => {
      if(!newLogEmpId || !newLogDate || !newLogTime) return;
      
      const timestamp = `${newLogDate} ${newLogTime}:00`;
      
      onAddLog({
          id: `manual-${Date.now()}`,
          timekeepingId: newLogEmpId,
          timestamp: timestamp,
          source: 'MANUAL',
          isIgnored: false
      });

      setIsModalOpen(false);
      setNewLogEmpId('');
      setNewLogDate('');
      setNewLogTime('');
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
      if (sortConfig.key !== column) return <ArrowUpDown size={14} className="text-slate-300 opacity-50 group-hover:opacity-100" />;
      return sortConfig.direction === 'asc' 
          ? <ArrowUp size={14} className="text-blue-600" /> 
          : <ArrowDown size={14} className="text-blue-600" />;
  };

  const renderSortableHeader = (label: string, column: SortKey) => (
      <th 
          className="px-6 py-3 cursor-pointer hover:bg-slate-200 transition-colors group select-none"
          onClick={() => handleSort(column)}
      >
          <div className="flex items-center gap-2">
              {label}
              <SortIcon column={column} />
          </div>
      </th>
  );

  return (
    <div className="space-y-6 relative">
        <div className="flex justify-between items-center">
             <div>
                <h2 className="text-2xl font-bold text-slate-800">Dữ liệu Công thô</h2>
                <p className="text-slate-500 text-sm">Nhật ký quét từ máy chấm công & Import</p>
             </div>
             <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 text-sm font-medium shadow-sm"
             >
                 <Plus size={18} /> Thêm Log thủ công
             </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[600px]">
             {/* Toolbar */}
             <div className="p-4 border-b border-slate-200 bg-slate-50 flex gap-4 items-center flex-wrap">
                  <div className="flex items-center gap-2 bg-white px-3 py-2 border border-slate-300 rounded-lg">
                      <Search size={16} className="text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Lọc theo Tên hoặc Mã máy..." 
                        value={filterEmp}
                        onChange={e => setFilterEmp(e.target.value)}
                        className="text-sm outline-none w-56"
                      />
                  </div>
                   <div className="flex items-center gap-2 bg-white px-3 py-2 border border-slate-300 rounded-lg">
                      <span className="text-xs text-slate-500 font-medium">Ngày:</span>
                      <input 
                        type="date" 
                        value={filterDate}
                        onChange={e => setFilterDate(e.target.value)}
                        className="text-sm outline-none"
                      />
                  </div>
                  <div className="ml-auto text-xs text-slate-500 flex items-center gap-2">
                      <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> Hợp lệ</span>
                      <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-300"></div> Trùng lặp (Bỏ qua)</span>
                  </div>
             </div>

             {/* Table */}
             <div className="flex-1 overflow-auto">
                 <table className="w-full text-left text-sm">
                     <thead className="bg-slate-100 text-slate-700 font-medium sticky top-0 z-10 shadow-sm">
                         <tr>
                             {renderSortableHeader("Thời gian quét", "timestamp")}
                             {renderSortableHeader("Mã máy", "timekeepingId")}
                             {renderSortableHeader("Nhân viên (Mapping)", "employeeName")}
                             {renderSortableHeader("Nguồn", "source")}
                             <th className="px-6 py-3">Loại</th>
                             {renderSortableHeader("Trạng thái", "status")}
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                         {sortedLogs.map(log => {
                             const emp = getEmpByMachineId(log.timekeepingId);
                             return (
                                 <tr key={log.id} className={`hover:bg-slate-50 transition-colors ${log.isDuplicate ? 'bg-slate-50 opacity-60' : ''}`}>
                                     <td className="px-6 py-3 font-mono font-medium text-slate-700">
                                         {log.timestamp}
                                     </td>
                                     <td className="px-6 py-3 font-mono text-slate-500">{log.timekeepingId}</td>
                                     <td className="px-6 py-3">
                                         {emp ? (
                                             <div className="flex items-center gap-2">
                                                 <span className="font-medium text-blue-700">{emp.name}</span>
                                                 <span className="text-xs bg-slate-100 px-1 rounded text-slate-500">{emp.code}</span>
                                             </div>
                                         ) : (
                                             <span className="text-red-500 flex items-center gap-1 italic text-xs"><AlertTriangle size={12}/> Chưa map</span>
                                         )}
                                     </td>
                                     <td className="px-6 py-3">
                                         <span className={`px-2 py-0.5 rounded text-xs border ${log.source === 'MACHINE' ? 'bg-purple-50 text-purple-700 border-purple-100' : log.source === 'MANUAL' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>
                                             {log.source}
                                         </span>
                                     </td>
                                     <td className="px-6 py-3 text-slate-500">Check</td>
                                     <td className="px-6 py-3">
                                         {log.isDuplicate ? (
                                             <span className="text-slate-400 text-xs font-medium">Duplicate</span>
                                         ) : (
                                             <span className="text-green-600 text-xs font-bold">Valid</span>
                                         )}
                                     </td>
                                 </tr>
                             )
                         })}
                     </tbody>
                 </table>
             </div>
        </div>

        {/* Manual Entry Modal */}
        {isModalOpen && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h3 className="font-bold text-lg text-slate-800">Thêm dữ liệu thủ công</h3>
                        <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nhân viên</label>
                            <select 
                                value={newLogEmpId}
                                onChange={e => setNewLogEmpId(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">-- Chọn nhân viên --</option>
                                {employees.map(e => (
                                    <option key={e.id} value={e.timekeepingId}>{e.name} (ID: {e.timekeepingId})</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Ngày</label>
                                <input 
                                    type="date"
                                    value={newLogDate}
                                    onChange={e => setNewLogDate(e.target.value)}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Giờ</label>
                                <input 
                                    type="time"
                                    value={newLogTime}
                                    onChange={e => setNewLogTime(e.target.value)}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" 
                                />
                            </div>
                        </div>
                        <div className="bg-blue-50 p-3 rounded text-xs text-blue-700">
                            Lưu ý: Dữ liệu thêm thủ công sẽ được ghi nhận với nguồn là "MANUAL" để phục vụ Audit Log.
                        </div>
                    </div>
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                        <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-white rounded-lg">Hủy</button>
                        <button 
                            onClick={handleManualSubmit}
                            disabled={!newLogEmpId || !newLogDate || !newLogTime}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                        >
                            Thêm Log
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default RawDataView;
