
import React, { useState } from 'react';
import { AttendanceRequest, Employee, RequestStatus, RequestType } from '../types';
import { Search, Plus, CheckCircle, XCircle, Clock, FileText, Check, X, Calendar, ArrowRight } from 'lucide-react';

interface RequestManagerProps {
    requests: AttendanceRequest[];
    employees: Employee[];
    onAdd: (req: AttendanceRequest) => Promise<void>;
    onUpdate: (req: AttendanceRequest) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}

const RequestManager: React.FC<RequestManagerProps> = ({ requests, employees, onAdd, onUpdate, onDelete }) => {
    const [filterStatus, setFilterStatus] = useState<RequestStatus | 'ALL'>('ALL');
    const [showModal, setShowModal] = useState(false);
    
    // Form State
    const [newReqEmpId, setNewReqEmpId] = useState('');
    const [newReqType, setNewReqType] = useState<RequestType>(RequestType.Leave);
    
    const [newReqStartDate, setNewReqStartDate] = useState('');
    const [newReqEndDate, setNewReqEndDate] = useState('');
    const [isFullDay, setIsFullDay] = useState(true);
    const [newReqStartTime, setNewReqStartTime] = useState('');
    const [newReqEndTime, setNewReqEndTime] = useState('');

    const [newReqReason, setNewReqReason] = useState('');

    const handleCreate = () => {
        if(!newReqEmpId || !newReqStartDate) {
            alert("Vui lòng nhập đầy đủ thông tin nhân viên và ngày bắt đầu.");
            return;
        }
        
        const finalEndDate = newReqEndDate || newReqStartDate;

        // 1. Basic Logic Validation
        if (newReqStartDate > finalEndDate) {
            alert("Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.");
            return;
        }

        if (!isFullDay && (!newReqStartTime || !newReqEndTime)) {
            alert("Vui lòng nhập giờ bắt đầu và kết thúc cho đơn nghỉ theo giờ.");
            return;
        }
        
        // 2. Overlap Validation
        // Check if there is any EXISTING request for this employee that is NOT Rejected
        // and overlaps with the new date range.
        const hasOverlap = requests.some(req => {
            if (req.employeeId !== newReqEmpId) return false;
            if (req.status === RequestStatus.Rejected) return false; // Ignore rejected
            
            // Current Request Range
            const existingStart = req.startDate;
            const existingEnd = req.endDate || req.startDate;

            // Check Date Overlap: (StartA <= EndB) and (EndA >= StartB)
            // New Range: newReqStartDate to finalEndDate
            const dateOverlap = (newReqStartDate <= existingEnd) && (finalEndDate >= existingStart);
            
            if (!dateOverlap) return false;

            // If Dates overlap, check Time overlap (if both are partial)
            // If one is Full Day, then they definitively overlap
            if (req.isFullDay || isFullDay) return true;

            // If both are partial on same day (Simplified: assumes single day partial for now)
            // New StartTime < Existing EndTime AND New EndTime > Existing StartTime
            if (newReqStartTime && newReqEndTime && req.startTime && req.endTime) {
                return (newReqStartTime < req.endTime) && (newReqEndTime > req.startTime);
            }
            
            return true;
        });

        if (hasOverlap) {
            alert("LỖI: Đã tồn tại đơn từ (Nghỉ phép/OT) trùng với khoảng thời gian này. Vui lòng kiểm tra lại.");
            return;
        }

        const newReq: AttendanceRequest = {
            id: `REQ-${Date.now()}`,
            employeeId: newReqEmpId,
            type: newReqType,
            startDate: newReqStartDate,
            endDate: finalEndDate,
            isFullDay: isFullDay,
            startTime: !isFullDay ? newReqStartTime : undefined,
            endTime: !isFullDay ? newReqEndTime : undefined,
            reason: newReqReason,
            status: RequestStatus.Pending
        };

        onAdd(newReq);
        setShowModal(false);
        resetForm();
    };

    const resetForm = () => {
        setNewReqReason('');
        setNewReqStartDate('');
        setNewReqEndDate('');
        setIsFullDay(true);
        setNewReqStartTime('');
        setNewReqEndTime('');
    };

    const handleStatusChange = (id: string, status: RequestStatus) => {
        const req = requests.find(r => r.id === id);
        if (req) {
            onUpdate({ ...req, status });
        }
    };

    const filtered = requests.filter(r => filterStatus === 'ALL' || r.status === filterStatus);

    const getStatusColor = (status: RequestStatus) => {
        switch(status) {
            case RequestStatus.Approved: return 'bg-green-100 text-green-700 border-green-200';
            case RequestStatus.Rejected: return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-yellow-50 text-yellow-700 border-yellow-200';
        }
    };

    const handleTypeChange = (type: RequestType) => {
        setNewReqType(type);
        if (type === RequestType.Explanation) {
            setIsFullDay(false); 
        } else {
            setIsFullDay(true);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                 <div>
                    <h2 className="text-2xl font-bold text-slate-800">Quản lý Đơn từ</h2>
                    <p className="text-slate-500 text-sm">Nghỉ phép, Giải trình đi muộn, Đăng ký OT</p>
                 </div>
                 <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium shadow-sm">
                     <Plus size={18} /> Tạo đơn mới
                 </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden min-h-[500px] flex flex-col">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex gap-4">
                     <button 
                        onClick={() => setFilterStatus('ALL')} 
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filterStatus === 'ALL' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:bg-white'}`}
                    >
                        Tất cả
                     </button>
                     <button 
                        onClick={() => setFilterStatus(RequestStatus.Pending)} 
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filterStatus === RequestStatus.Pending ? 'bg-white shadow text-yellow-600' : 'text-slate-500 hover:bg-white'}`}
                    >
                        Chờ duyệt
                     </button>
                     <button 
                        onClick={() => setFilterStatus(RequestStatus.Approved)} 
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filterStatus === RequestStatus.Approved ? 'bg-white shadow text-green-600' : 'text-slate-500 hover:bg-white'}`}
                    >
                        Đã duyệt
                     </button>
                </div>

                <div className="flex-1 overflow-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-100 text-slate-700 font-medium">
                            <tr>
                                <th className="px-6 py-3">Loại đơn</th>
                                <th className="px-6 py-3">Nhân viên</th>
                                <th className="px-6 py-3">Thời gian</th>
                                <th className="px-6 py-3">Chi tiết</th>
                                <th className="px-6 py-3">Lý do</th>
                                <th className="px-6 py-3">Trạng thái</th>
                                <th className="px-6 py-3 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.map(req => {
                                const emp = employees.find(e => e.id === req.employeeId);
                                const isSingleDay = req.startDate === req.endDate;
                                
                                return (
                                    <tr key={req.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-3">
                                            <span className={`px-2 py-1 rounded text-xs font-bold border 
                                                ${req.type === RequestType.Leave ? 'bg-purple-50 text-purple-700 border-purple-100' : 
                                                  req.type === RequestType.Overtime ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                                                  'bg-orange-50 text-orange-700 border-orange-100'}
                                            `}>
                                                {req.type === RequestType.Leave ? 'Nghỉ phép' : req.type === RequestType.Overtime ? 'Làm thêm' : 'Giải trình'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="font-medium">{emp?.name || 'Unknown'}</div>
                                            <div className="text-xs text-slate-500">{emp?.code}</div>
                                        </td>
                                        <td className="px-6 py-3 text-slate-700">
                                            {isSingleDay ? (
                                                <div className="flex items-center gap-1"><Calendar size={14} className="text-slate-400"/> {req.startDate}</div>
                                            ) : (
                                                <div className="flex flex-col">
                                                    <span className="flex items-center gap-1 text-xs text-slate-500">Từ: <span className="text-slate-700 font-medium">{req.startDate}</span></span>
                                                    <span className="flex items-center gap-1 text-xs text-slate-500">Đến: <span className="text-slate-700 font-medium">{req.endDate}</span></span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-3">
                                            {req.isFullDay ? (
                                                <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded">Cả ngày</span>
                                            ) : (
                                                <div className="flex items-center gap-1 text-xs font-medium text-slate-700 bg-yellow-50 px-2 py-1 rounded border border-yellow-100">
                                                    <Clock size={12} /> {req.startTime} - {req.endTime}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-3 text-slate-600 max-w-xs truncate" title={req.reason}>{req.reason}</td>
                                        <td className="px-6 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getStatusColor(req.status)} flex items-center gap-1 w-fit`}>
                                                {req.status === RequestStatus.Pending && <Clock size={12}/>}
                                                {req.status === RequestStatus.Approved && <CheckCircle size={12}/>}
                                                {req.status === RequestStatus.Rejected && <XCircle size={12}/>}
                                                {req.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            {req.status === RequestStatus.Pending && (
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => handleStatusChange(req.id, RequestStatus.Approved)} className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors" title="Duyệt">
                                                        <Check size={16}/>
                                                    </button>
                                                    <button onClick={() => handleStatusChange(req.id, RequestStatus.Rejected)} className="p-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors" title="Từ chối">
                                                        <X size={16}/>
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                            {filtered.length === 0 && (
                                <tr><td colSpan={7} className="text-center py-10 text-slate-500">Không có dữ liệu</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                     <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 animate-in fade-in zoom-in duration-200">
                         <div className="flex justify-between items-center mb-4">
                             <h3 className="font-bold text-lg text-slate-800">Tạo đơn từ hành chính</h3>
                             <button onClick={() => setShowModal(false)}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
                         </div>
                         
                         <div className="space-y-4">
                             {/* Loại và Nhân viên */}
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                     <label className="block text-sm font-medium mb-1 text-slate-700">Loại đơn</label>
                                     <select 
                                        className="w-full border border-slate-300 p-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white" 
                                        value={newReqType} 
                                        onChange={e => handleTypeChange(e.target.value as RequestType)}
                                    >
                                         <option value={RequestType.Leave}>Nghỉ phép</option>
                                         <option value={RequestType.Overtime}>Đăng ký OT</option>
                                         <option value={RequestType.Explanation}>Giải trình chấm công</option>
                                     </select>
                                </div>
                                <div>
                                     <label className="block text-sm font-medium mb-1 text-slate-700">Nhân viên <span className="text-red-500">*</span></label>
                                     <select 
                                        className="w-full border border-slate-300 p-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white" 
                                        value={newReqEmpId} 
                                        onChange={e => setNewReqEmpId(e.target.value)}
                                     >
                                         <option value="">-- Chọn nhân viên --</option>
                                         {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.code})</option>)}
                                     </select>
                                </div>
                             </div>

                             {/* Toggle Full Day / Hourly */}
                             <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                 <div className="flex items-center gap-4 mb-3">
                                     <label className="flex items-center gap-2 cursor-pointer">
                                         <input 
                                            type="radio" 
                                            name="timeType" 
                                            checked={isFullDay} 
                                            onChange={() => setIsFullDay(true)} 
                                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                         />
                                         <span className="text-sm font-medium text-slate-700">Cả ngày / Nhiều ngày</span>
                                     </label>
                                     <label className="flex items-center gap-2 cursor-pointer">
                                         <input 
                                            type="radio" 
                                            name="timeType" 
                                            checked={!isFullDay} 
                                            onChange={() => setIsFullDay(false)} 
                                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                         />
                                         <span className="text-sm font-medium text-slate-700">Theo giờ (Trong ngày)</span>
                                     </label>
                                 </div>

                                 {isFullDay ? (
                                     <div className="grid grid-cols-2 gap-4">
                                        <div>
                                             <label className="block text-xs font-medium mb-1 text-slate-500 uppercase">Từ ngày</label>
                                             <input 
                                                type="date" 
                                                className="w-full border border-slate-300 p-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                                                value={newReqStartDate} 
                                                onChange={e => setNewReqStartDate(e.target.value)} 
                                             />
                                        </div>
                                        <div>
                                             <label className="block text-xs font-medium mb-1 text-slate-500 uppercase">Đến ngày</label>
                                             <input 
                                                type="date" 
                                                className="w-full border border-slate-300 p-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                                                value={newReqEndDate} 
                                                onChange={e => setNewReqEndDate(e.target.value)}
                                                min={newReqStartDate} // Min date is start date
                                                placeholder={!newReqEndDate ? newReqStartDate : ''}
                                             />
                                             <p className="text-[10px] text-slate-400 mt-1">Để trống nếu chỉ nghỉ 1 ngày</p>
                                        </div>
                                     </div>
                                 ) : (
                                     <div className="space-y-3 animate-in fade-in slide-in-from-top-1">
                                        <div>
                                             <label className="block text-xs font-medium mb-1 text-slate-500 uppercase">Ngày</label>
                                             <input 
                                                type="date" 
                                                className="w-full border border-slate-300 p-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                                                value={newReqStartDate} 
                                                onChange={e => setNewReqStartDate(e.target.value)} 
                                             />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                 <label className="block text-xs font-medium mb-1 text-slate-500 uppercase">Từ giờ</label>
                                                 <input 
                                                    type="time" 
                                                    className="w-full border border-slate-300 p-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                                                    value={newReqStartTime} 
                                                    onChange={e => setNewReqStartTime(e.target.value)} 
                                                 />
                                            </div>
                                            <div>
                                                 <label className="block text-xs font-medium mb-1 text-slate-500 uppercase">Đến giờ</label>
                                                 <input 
                                                    type="time" 
                                                    className="w-full border border-slate-300 p-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                                                    value={newReqEndTime} 
                                                    onChange={e => setNewReqEndTime(e.target.value)} 
                                                 />
                                            </div>
                                        </div>
                                     </div>
                                 )}
                             </div>

                             <div>
                                 <label className="block text-sm font-medium mb-1 text-slate-700">Lý do</label>
                                 <textarea 
                                    className="w-full border border-slate-300 p-2 rounded-lg h-20 outline-none focus:ring-2 focus:ring-blue-500" 
                                    value={newReqReason} 
                                    onChange={e => setNewReqReason(e.target.value)} 
                                    placeholder="Nhập lý do chi tiết..."
                                 ></textarea>
                             </div>
                         </div>
                         <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                             <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600">Hủy</button>
                             <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm font-medium">Lưu Đơn</button>
                         </div>
                     </div>
                </div>
            )}
        </div>
    );
};

export default RequestManager;
