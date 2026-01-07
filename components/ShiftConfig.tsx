
import React, { useState } from 'react';
import { Shift } from '../types';
import { Clock, Plus, Trash2, Edit2, Moon, Sun, Save, CalendarCheck } from 'lucide-react';

interface ShiftConfigProps {
  shifts: Shift[];
  onAddShift: (shift: Shift) => void;
  onUpdateShift: (shift: Shift) => void;
  onDeleteShift: (id: string) => void;
}

const ShiftConfig: React.FC<ShiftConfigProps> = ({ shifts, onAddShift, onUpdateShift, onDeleteShift }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentShift, setCurrentShift] = useState<Partial<Shift>>({});

  const handleEdit = (shift: Shift) => {
    // Ensure new fields exist for old data
    const updatedShift = {
        ...shift,
        workDays: shift.workDays || [1,2,3,4,5],
        isSaturdayHalfDay: shift.isSaturdayHalfDay || false
    };
    setCurrentShift(updatedShift);
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
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      roundingMinutes: 15,
      workDays: [1, 2, 3, 4, 5], // Default Mon-Fri
      isSaturdayHalfDay: false
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    if (currentShift.id && currentShift.code && currentShift.name) {
       const exists = shifts.find(s => s.id === currentShift.id);
       if (exists) {
         onUpdateShift(currentShift as Shift);
       } else {
         onAddShift(currentShift as Shift);
       }
       setIsEditing(false);
    }
  };

  const toggleDay = (day: number) => {
      let days = currentShift.workDays || [];
      if (days.includes(day)) {
          days = days.filter(d => d !== day);
      } else {
          days = [...days, day];
      }
      setCurrentShift({ ...currentShift, workDays: days });
  };

  const dayLabels = [
      { v: 1, l: 'T2' }, { v: 2, l: 'T3' }, { v: 3, l: 'T4' },
      { v: 4, l: 'T5' }, { v: 5, l: 'T6' }, { v: 6, l: 'T7' }, { v: 0, l: 'CN' }
  ];

  if (isEditing) {
    return (
      <div className="max-w-4xl mx-auto bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800">
            {shifts.find(s => s.id === currentShift.id) ? 'Chỉnh sửa Ca làm việc' : 'Thêm mới Ca làm việc'}
          </h2>
          <button onClick={() => setIsEditing(false)} className="text-slate-500 hover:text-slate-700">Hủy bỏ</button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column: Basic Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-700 border-b pb-2">Thông tin chung</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mã ca</label>
              <input 
                type="text" 
                value={currentShift.code || ''}
                onChange={(e) => setCurrentShift({...currentShift, code: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="VD: HC, SX, LX..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tên ca</label>
              <input 
                type="text" 
                value={currentShift.name || ''}
                onChange={(e) => setCurrentShift({...currentShift, name: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="VD: Hành chính, Ca Lái xe..."
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Hệ số công</label>
                    <input 
                        type="number" 
                        step="0.1"
                        value={currentShift.multiplier || 1.0}
                        onChange={(e) => setCurrentShift({...currentShift, multiplier: parseFloat(e.target.value)})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Cho phép trễ (phút)</label>
                    <input 
                        type="number" 
                        value={currentShift.toleranceMinutes || 0}
                        onChange={(e) => setCurrentShift({...currentShift, toleranceMinutes: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
                <input 
                    type="checkbox" 
                    id="isOvernight"
                    checked={currentShift.isOvernight || false}
                    onChange={(e) => setCurrentShift({...currentShift, isOvernight: e.target.checked})}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="isOvernight" className="text-sm text-slate-700 select-none">Ca qua đêm (vắt qua ngày sau)</label>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Làm tròn công (phút)</label>
                <select 
                    value={currentShift.roundingMinutes || 0}
                    onChange={(e) => setCurrentShift({...currentShift, roundingMinutes: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                    <option value={0}>Không làm tròn</option>
                    <option value={5}>5 phút</option>
                    <option value={10}>10 phút</option>
                    <option value={15}>15 phút</option>
                    <option value={30}>30 phút</option>
                    <option value={60}>60 phút</option>
                </select>
            </div>
          </div>

          {/* Right Column: Time & Schedule */}
          <div className="space-y-4">
             <h3 className="font-semibold text-slate-700 border-b pb-2">Thời gian & Lịch trình</h3>
             
             {/* Weekly Schedule */}
             <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <div className="flex items-center gap-2 mb-3">
                    <CalendarCheck className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-slate-700">Ngày làm việc trong tuần</span>
                </div>
                <div className="flex justify-between gap-1">
                    {dayLabels.map(d => {
                        const isSelected = (currentShift.workDays || []).includes(d.v);
                        return (
                            <button 
                                key={d.v}
                                onClick={() => toggleDay(d.v)}
                                className={`w-8 h-8 rounded text-xs font-bold transition-all ${isSelected ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-200'}`}
                            >
                                {d.l}
                            </button>
                        )
                    })}
                </div>
                <div className="mt-4 flex items-center gap-2">
                    <input 
                        type="checkbox" 
                        id="halfSat"
                        disabled={!(currentShift.workDays || []).includes(6)}
                        checked={currentShift.isSaturdayHalfDay || false}
                        onChange={(e) => setCurrentShift({...currentShift, isSaturdayHalfDay: e.target.checked})}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="halfSat" className={`text-sm select-none ${!(currentShift.workDays || []).includes(6) ? 'text-slate-400' : 'text-slate-700'}`}>
                        Thứ 7 chỉ làm nửa ngày (Kết thúc 12:00)
                    </label>
                </div>
             </div>

             <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 mb-4">
                    <Sun className="w-5 h-5 text-orange-500" />
                    <span className="font-medium text-slate-700">Giờ làm việc</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-slate-500 uppercase">Bắt đầu</label>
                        <input 
                            type="time" 
                            value={currentShift.startTime || ''}
                            onChange={(e) => setCurrentShift({...currentShift, startTime: e.target.value})}
                            className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-md"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 uppercase">Kết thúc</label>
                        <input 
                            type="time" 
                            value={currentShift.endTime || ''}
                            onChange={(e) => setCurrentShift({...currentShift, endTime: e.target.value})}
                            className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-md"
                        />
                    </div>
                </div>
             </div>

             <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 mb-4">
                    <Moon className="w-5 h-5 text-indigo-500" />
                    <span className="font-medium text-slate-700">Nghỉ trưa</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-slate-500 uppercase">Bắt đầu nghỉ</label>
                        <input 
                            type="time" 
                            value={currentShift.breakStart || ''}
                            onChange={(e) => setCurrentShift({...currentShift, breakStart: e.target.value})}
                            className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-md"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 uppercase">Kết thúc nghỉ</label>
                        <input 
                            type="time" 
                            value={currentShift.breakEnd || ''}
                            onChange={(e) => setCurrentShift({...currentShift, breakEnd: e.target.value})}
                            className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-md"
                        />
                    </div>
                </div>
             </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
            <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-slate-700 hover:bg-white border border-transparent hover:border-slate-300 rounded-lg transition-all">Hủy</button>
            <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-sm">
                <Save size={18} /> Lưu thay đổi
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-slate-800">Danh sách Ca làm việc</h2>
            <button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm">
                <Plus size={20} /> Thêm ca mới
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shifts.map((shift) => (
                <div key={shift.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                    <div className={`h-2 w-full ${(shift.color || 'bg-blue-500').split(' ')[0].replace('bg-', 'bg-')}`}></div>
                    <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-lg text-slate-800">{shift.name}</h3>
                                <span className="text-xs font-semibold px-2 py-1 rounded bg-slate-100 text-slate-600">{shift.code}</span>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEdit(shift)} className="p-2 hover:bg-slate-100 rounded-full text-blue-600"><Edit2 size={16} /></button>
                                <button onClick={() => onDeleteShift(shift.id)} className="p-2 hover:bg-slate-100 rounded-full text-red-600"><Trash2 size={16} /></button>
                            </div>
                        </div>
                        
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 text-slate-600">
                                <Clock size={18} className="text-slate-400" />
                                <span className="text-sm">Làm việc: <span className="font-medium text-slate-900">{shift.startTime} - {shift.endTime}</span></span>
                            </div>
                            
                            {/* Visual Week Indicators */}
                            <div className="flex gap-1 mt-2">
                                {dayLabels.map(d => {
                                    // Handle missing workDays property (for migration from old data)
                                    // Use explicit check to prevent crash on undefined
                                    const workDaysSafe = Array.isArray(shift.workDays) ? shift.workDays : [1,2,3,4,5];
                                    const isActive = workDaysSafe.includes(d.v);
                                    const isHalfDay = d.v === 6 && shift.isSaturdayHalfDay && isActive;
                                    return (
                                        <div key={d.v} className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold ${isActive ? (isHalfDay ? 'bg-orange-100 text-orange-600 border border-orange-200' : 'bg-blue-100 text-blue-600 border border-blue-200') : 'bg-slate-50 text-slate-300'}`}>
                                            {d.l}
                                        </div>
                                    )
                                })}
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-4">
                                <span className="text-xs text-slate-500">Hệ số: x{shift.multiplier}</span>
                                {shift.isSaturdayHalfDay && <span className="text-xs font-bold text-orange-600">Thứ 7: 1/2 ngày</span>}
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};

export default ShiftConfig;
