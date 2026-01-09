
import React, { useState } from 'react';
import { Shift } from '../types';
import { Clock, Plus, Trash2, Edit2, Moon, Sun, Save, CalendarCheck, Calendar, Hash } from 'lucide-react';

interface ShiftConfigProps {
  shifts: Shift[];
  onAddShift: (shift: Shift) => Promise<void>;
  onUpdateShift: (shift: Shift) => Promise<void>;
  onDeleteShift: (id: string) => Promise<void>;
}

const ShiftConfig: React.FC<ShiftConfigProps> = ({ shifts, onAddShift, onUpdateShift, onDeleteShift }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentShift, setCurrentShift] = useState<Partial<Shift>>({});

  const handleEdit = (shift: Shift) => {
    setCurrentShift({
        ...shift,
        workDays: shift.workDays || [1,2,3,4,5],
        isSaturdayHalfDay: shift.isSaturdayHalfDay || false,
        effectiveFrom: shift.effectiveFrom || `${new Date().getFullYear()}-01-01`,
        roundingMinutes: shift.roundingMinutes || 0
    });
    setIsEditing(true);
  };

  const handleCreate = () => {
    setCurrentShift({
      id: Date.now().toString(),
      code: '',
      name: '',
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
      effectiveFrom: `${new Date().getFullYear()}-01-01`
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (currentShift.id && currentShift.code && currentShift.name && currentShift.effectiveFrom) {
       setIsSaving(true);
       try {
           if (shifts.find(s => s.id === currentShift.id)) await onUpdateShift(currentShift as Shift);
           else await onAddShift(currentShift as Shift);
           setIsEditing(false);
       } catch (error) {
           console.error(error);
       } finally {
           setIsSaving(false);
       }
    } else alert("Vui lòng điền đầy đủ các thông tin bắt buộc.");
  };

  const dayLabels = [{ v: 1, l: 'T2' }, { v: 2, l: 'T3' }, { v: 3, l: 'T4' }, { v: 4, l: 'T5' }, { v: 5, l: 'T6' }, { v: 6, l: 'T7' }, { v: 0, l: 'CN' }];

  if (isEditing) {
    return (
      <div className="max-w-4xl mx-auto bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800">{currentShift.id && shifts.find(s => s.id === currentShift.id) ? 'Chỉnh sửa' : 'Thêm mới'} Ca</h2>
          <button onClick={() => setIsEditing(false)} className="text-slate-500 hover:text-slate-700">Hủy</button>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-700 border-b pb-2 flex items-center gap-2 text-sm uppercase tracking-wider">Thông tin chung</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mã ca *</label>
              <input type="text" value={currentShift.code} onChange={e => setCurrentShift({...currentShift, code: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="VD: HC" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tên ca *</label>
              <input type="text" value={currentShift.name} onChange={e => setCurrentShift({...currentShift, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="VD: Hành chính" />
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <label className="block text-sm font-bold text-blue-800 mb-2 flex items-center gap-2"><Calendar size={16}/> Ngày áp dụng hiệu lực *</label>
                <input type="date" value={currentShift.effectiveFrom} onChange={e => setCurrentShift({...currentShift, effectiveFrom: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
                <p className="text-[10px] text-blue-600 mt-2 font-medium">* Các bảng công trước ngày này sẽ không dùng cấu hình này.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Hệ số công</label>
                    <input type="number" step="0.1" value={currentShift.multiplier} onChange={e => setCurrentShift({...currentShift, multiplier: parseFloat(e.target.value)})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Cho phép trễ (phút)</label>
                    <input type="number" value={currentShift.toleranceMinutes} onChange={e => setCurrentShift({...currentShift, toleranceMinutes: parseInt(e.target.value)})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><Hash size={16}/> Làm tròn phút</label>
                <div className="flex items-center gap-3">
                    <input 
                        type="number" 
                        value={currentShift.roundingMinutes || 0} 
                        onChange={e => setCurrentShift({...currentShift, roundingMinutes: parseInt(e.target.value)})} 
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white" 
                        placeholder="VD: 15, 30..."
                    />
                    <div className="text-xs text-slate-500 w-48">
                        Thời gian làm việc sẽ được làm tròn xuống theo bội số của số phút này.
                    </div>
                </div>
            </div>
          </div>
          <div className="space-y-4">
             <h3 className="font-semibold text-slate-700 border-b pb-2 flex items-center gap-2 text-sm uppercase tracking-wider">Thời gian làm việc</h3>
             <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 mb-4"><Sun className="w-5 h-5 text-orange-500" /> <span className="font-medium">Khung giờ chính</span></div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">Bắt đầu</label>
                        <input type="time" value={currentShift.startTime} onChange={e => setCurrentShift({...currentShift, startTime: e.target.value})} className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div>
                        <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">Kết thúc</label>
                        <input type="time" value={currentShift.endTime} onChange={e => setCurrentShift({...currentShift, endTime: e.target.value})} className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                </div>
             </div>

             <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 mb-4"><Moon className="w-5 h-5 text-indigo-500" /> <span className="font-medium">Nghỉ trưa</span></div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">Bắt đầu nghỉ</label>
                        <input type="time" value={currentShift.breakStart} onChange={e => setCurrentShift({...currentShift, breakStart: e.target.value})} className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div>
                        <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">Kết thúc nghỉ</label>
                        <input type="time" value={currentShift.breakEnd} onChange={e => setCurrentShift({...currentShift, breakEnd: e.target.value})} className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                </div>
             </div>

             {/* Work Days Selector */}
             <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                <div className="flex items-center gap-2 mb-4"><CalendarCheck className="w-5 h-5 text-green-600" /> <span className="font-medium text-green-800">Ngày làm việc</span></div>
                <div className="flex flex-wrap gap-2">
                    {dayLabels.map(day => {
                        const isSelected = currentShift.workDays?.includes(day.v);
                        return (
                            <button
                                key={day.v}
                                type="button"
                                onClick={() => {
                                    const current = currentShift.workDays || [];
                                    const newDays = isSelected 
                                        ? current.filter(d => d !== day.v)
                                        : [...current, day.v].sort((a, b) => a - b);
                                    setCurrentShift({...currentShift, workDays: newDays});
                                }}
                                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                                    isSelected 
                                        ? 'bg-green-600 text-white shadow-md' 
                                        : 'bg-white text-slate-500 border border-slate-200 hover:border-green-300'
                                }`}
                            >
                                {day.l}
                            </button>
                        );
                    })}
                </div>
                <p className="text-[10px] text-green-700 mt-3 font-medium">Chọn các ngày trong tuần mà ca này áp dụng. Ngày không được chọn sẽ tự động tính là ngày nghỉ.</p>
             </div>

             {/* Saturday Half-day Toggle */}
             <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                        type="checkbox" 
                        checked={currentShift.isSaturdayHalfDay || false}
                        onChange={e => setCurrentShift({...currentShift, isSaturdayHalfDay: e.target.checked})}
                        className="w-5 h-5 rounded border-orange-300 text-orange-600 focus:ring-orange-500"
                    />
                    <div>
                        <span className="font-medium text-orange-800">Thứ 7 làm nửa ngày</span>
                        <p className="text-[10px] text-orange-600">Nếu bật, thứ 7 sẽ chỉ tính công đến 12:00 (hoặc breakStart)</p>
                    </div>
                </label>
             </div>
          </div>
        </div>
        <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-3">
            <button onClick={() => setIsEditing(false)} disabled={isSaving} className="px-4 py-2 text-slate-700 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200">Hủy</button>
            <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-bold shadow-md shadow-blue-200 disabled:opacity-70">
                {isSaving ? 'Đang lưu...' : <><Save size={18} /> Lưu cấu hình</>}
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Cấu hình Ca</h2>
                <p className="text-slate-500 text-sm">Thiết lập giờ giấc, làm tròn và các quy định chấm công.</p>
            </div>
            <button onClick={handleCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm font-medium hover:bg-blue-700 transition-colors"><Plus size={20} /> Thêm ca</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shifts.map(shift => (
                <div key={shift.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
                    <div className={`h-2 w-full ${shift.color?.split(' ')[0] || 'bg-blue-500'}`}></div>
                    <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-lg text-slate-800">{shift.name}</h3>
                                <div className="text-[10px] font-medium text-slate-400 mt-1 flex items-center gap-1">
                                    <Calendar size={10}/> Hiệu lực: {shift.effectiveFrom}
                                </div>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEdit(shift)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"><Edit2 size={16} /></button>
                                <button onClick={async () => {
                                    if (window.confirm(`Bạn có chắc chắn muốn xóa ca "${shift.name}"?\n\nHành động này không thể hoàn tác.`)) {
                                        await onDeleteShift(shift.id);
                                    }
                                }} className="p-2 text-red-600 hover:bg-red-50 rounded-full"><Trash2 size={16} /></button>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 text-slate-600">
                                <Clock size={18} className="text-slate-400" /> 
                                <span className="text-sm font-bold text-slate-800">{shift.startTime} - {shift.endTime}</span>
                            </div>
                            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                                <div className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                                    <Clock size={10}/> Trễ: {shift.toleranceMinutes}p
                                </div>
                                {shift.roundingMinutes > 0 && (
                                    <div className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded flex items-center gap-1">
                                        <Hash size={10}/> Làm tròn: {shift.roundingMinutes}p
                                    </div>
                                )}
                                <div className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                                    Hệ số: x{shift.multiplier}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
            {shifts.length === 0 && (
                <div className="col-span-full py-12 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 italic">
                    Chưa có cấu hình ca nào. Nhấn "Thêm ca" để bắt đầu.
                </div>
            )}
        </div>
    </div>
  );
};

export default ShiftConfig;
