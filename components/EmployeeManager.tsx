
import React, { useState, useRef } from 'react';
import { Employee, Shift } from '../types';
import { Search, Plus, Filter, Edit2, Trash2, User, FileSpreadsheet, Download, Calendar, Check, Briefcase, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface EmployeeManagerProps {
  employees: Employee[];
  shifts: Shift[];
  onAdd: (emp: Employee) => void;
  onUpdate: (emp: Employee) => void;
  onDelete: (id: string) => void;
}

const EmployeeManager: React.FC<EmployeeManagerProps> = ({ employees, shifts, onAdd, onUpdate, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [currentEmp, setCurrentEmp] = useState<Partial<Employee>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleEdit = (emp: Employee) => {
    const defaultShiftId = emp.defaultShiftId || shifts[0]?.id || '';
    setCurrentEmp({ ...emp, defaultShiftId });
    setIsEditing(true);
  };

  const confirmDelete = (emp: Employee) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa nhân viên ${emp.name}? Hành động này không thể hoàn tác.`)) {
      onDelete(emp.id);
    }
  };

  const handleCreate = () => {
    setCurrentEmp({
      id: Date.now().toString(),
      code: '',
      timekeepingId: '',
      name: '',
      department: 'Phòng ban',
      position: 'Nhân viên',
      joinDate: new Date().toISOString().split('T')[0],
      status: 'ACTIVE',
      defaultShiftId: shifts[0]?.id || ''
    });
    setIsEditing(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentEmp.code && currentEmp.name && currentEmp.timekeepingId && currentEmp.defaultShiftId) {
       const exists = employees.find(e => e.id === currentEmp.id);
       if (exists) {
         onUpdate(currentEmp as Employee);
       } else {
         onAdd(currentEmp as Employee);
       }
       setIsEditing(false);
    }
  };

  // --- Import Logic ---
  const parseExcelDate = (val: any): string => {
    if (!val) return new Date().toISOString().split('T')[0];
    if (typeof val === 'number') {
        const date = new Date(Math.round((val - 25569) * 86400 * 1000));
        return date.toISOString().split('T')[0];
    }
    return String(val);
  };

  const handleDownloadTemplate = () => {
      const headers = ['Mã nhân viên (*)', 'Mã chấm công (*)', 'Họ và tên (*)', 'Phòng ban', 'Chức danh', 'Ngày vào làm (YYYY-MM-DD)', 'Mã Ca Mặc Định'];
      const sample = ['NV099', '1099', 'Nguyễn Văn Mẫu', 'Kinh doanh', 'Nhân viên', '2024-01-01', 'HC'];
      
      const ws = XLSX.utils.aoa_to_sheet([headers, sample]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Template_NhanSu");
      XLSX.writeFile(wb, "Mau_Import_NhanSu.xlsx");
  };

  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onload = async (evt) => {
              const bstr = evt.target?.result;
              if (bstr) {
                  try {
                      const wb = XLSX.read(bstr, { type: 'binary' });
                      const wsName = wb.SheetNames[0];
                      const ws = wb.Sheets[wsName];
                      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
                      
                      const fallbackShiftId = shifts[0]?.id || '';
                      const toAdd: Employee[] = [];
                      const toUpdate: Employee[] = [];
                      const skipped: string[] = [];

                      // Skip header row
                      const rows = data.slice(1);
                      
                      // Create lookup maps for faster searching
                      const codeToEmployeeMap = new Map<string, Employee>(employees.map(e => [e.code, e]));
                      const timekeepingIdToEmployeeMap = new Map<string, Employee>(employees.map(e => [e.timekeepingId, e]));

                      rows.forEach(row => {
                          const code = row[0] ? String(row[0]).trim() : '';
                          const timekeepingId = row[1] ? String(row[1]).trim() : '';
                          const name = row[2] ? String(row[2]).trim() : '';
                          
                          if(code && name && timekeepingId) {
                              // Identify if employee already exists by code or machine ID
                              const existing = codeToEmployeeMap.get(code) || timekeepingIdToEmployeeMap.get(timekeepingId);
                              
                              let shiftId = fallbackShiftId;
                              if (row[6]) {
                                  const foundShift = shifts.find(s => s.code === String(row[6]).trim());
                                  if (foundShift) shiftId = foundShift.id;
                              }

                              const empData: Employee = {
                                  id: existing ? existing.id : (Date.now().toString() + Math.random().toString().slice(2,8)),
                                  code: code,
                                  timekeepingId: timekeepingId,
                                  name: name,
                                  department: row[3] ? String(row[3]) : (existing?.department || ''),
                                  position: row[4] ? String(row[4]) : (existing?.position || ''),
                                  joinDate: parseExcelDate(row[5]),
                                  status: 'ACTIVE',
                                  defaultShiftId: shiftId
                              };

                              if (existing) {
                                  toUpdate.push(empData);
                              } else {
                                  toAdd.push(empData);
                              }
                          } else if (code || name || timekeepingId) {
                              skipped.push(name || code || "Dòng trống");
                          }
                      });

                      let shouldUpdate = false;
                      if (toUpdate.length > 0) {
                          shouldUpdate = window.confirm(
                            `Phát hiện ${toUpdate.length} nhân viên đã tồn tại (khớp Mã NV hoặc Mã máy).\n\n` +
                            `BẠN CÓ MUỐN CẬP NHẬT THÔNG TIN CHO HỌ KHÔNG?\n\n` +
                            `- Chọn OK để Cập nhật (Ghi đè).\n` +
                            `- Chọn Cancel để Bỏ qua và chỉ thêm mới.`
                          );
                      }

                      // Execute additions
                      toAdd.forEach(emp => onAdd(emp));
                      
                      // Execute updates if confirmed
                      if (shouldUpdate) {
                          toUpdate.forEach(emp => onUpdate(emp));
                      }

                      const totalProcessed = toAdd.length + (shouldUpdate ? toUpdate.length : 0);
                      const totalSkipped = skipped.length + (!shouldUpdate ? toUpdate.length : 0);

                      alert(
                          `KẾT QUẢ IMPORT:\n` +
                          `--------------------------\n` +
                          `✅ Đã thêm mới: ${toAdd.length}\n` +
                          `🔄 Đã cập nhật: ${shouldUpdate ? toUpdate.length : 0}\n` +
                          `⚠️ Đã bỏ qua: ${totalSkipped}\n\n` +
                          `Hoàn tất xử lý dữ liệu.`
                      );

                  } catch (error) {
                      console.error("Import error:", error);
                      alert("Lỗi đọc file. Vui lòng kiểm tra định dạng Excel.");
                  }
              }
          };
          reader.readAsBinaryString(file);
      }
      // Reset input to allow re-upload of same file
      e.target.value = '';
  };

  const filtered = employees.filter(e => 
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      e.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
            <h2 className="text-2xl font-bold text-slate-800">Quản lý Nhân sự</h2>
            <p className="text-slate-500 text-sm">Quản lý hồ sơ nhân viên và gán ca làm việc mặc định.</p>
         </div>
         <div className="flex gap-2 w-full md:w-auto">
             <input 
                 type="file" 
                 ref={fileInputRef} 
                 onChange={handleFileChange} 
                 accept=".xls,.xlsx" 
                 className="hidden" 
             />
             <button 
                onClick={handleDownloadTemplate}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-600 hover:text-blue-600 hover:border-blue-300 text-sm font-medium shadow-sm transition-colors"
                title="Tải file mẫu nhập liệu"
                aria-label="Tải file mẫu nhập liệu"
             >
                 <Download size={18} /> <span className="hidden sm:inline">File Mẫu</span>
             </button>
             <button 
                onClick={handleImportClick}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-sm font-medium shadow-sm"
             >
                 <FileSpreadsheet size={18} /> Import Excel
             </button>
             <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium shadow-sm">
                 <Plus size={18} /> Thêm nhân viên
             </button>
         </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input 
                      type="text" 
                      placeholder="Tìm theo Tên, Mã NV, Phòng ban..." 
                      aria-label="Tìm kiếm nhân viên"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
              </div>
          </div>

          <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-700 font-medium border-b border-slate-200">
                  <tr>
                      <th className="px-6 py-3">Nhân viên</th>
                      <th className="px-6 py-3">Mã Chấm công</th>
                      <th className="px-6 py-3">Vị trí / Phòng ban</th>
                      <th className="px-6 py-3">Ca mặc định</th>
                      <th className="px-6 py-3 text-center">Trạng thái</th>
                      <th className="px-6 py-3 text-right">Thao tác</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                  {filtered.length > 0 ? filtered.map((emp) => {
                      const shift = shifts.find(s => s.id === emp.defaultShiftId);
                      return (
                        <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                                        {emp.name.split(' ').pop()?.substring(0,2).toUpperCase() || '??'}
                                    </div>
                                    <div>
                                        <div className="font-medium text-slate-800">{emp.name}</div>
                                        <div className="text-xs text-slate-500">{emp.code}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-3 font-mono text-slate-600">{emp.timekeepingId}</td>
                            <td className="px-6 py-3">
                                <div className="text-slate-800">{emp.position}</div>
                                <div className="text-xs text-slate-500">{emp.department}</div>
                            </td>
                            <td className="px-6 py-3">
                                {shift ? (
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${shift.color}`}>
                                        {shift.code} ({shift.startTime}-{shift.endTime})
                                    </span>
                                ) : (
                                    <span className="text-slate-400 text-xs italic">Chưa gán</span>
                                )}
                            </td>
                            <td className="px-6 py-3 text-center">
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${emp.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {emp.status === 'ACTIVE' ? 'Đang làm' : 'Đã nghỉ'}
                                </span>
                            </td>
                            <td className="px-6 py-3 text-right">
                                <button
                                    onClick={() => handleEdit(emp)}
                                    className="text-blue-600 hover:text-blue-800 mr-3 p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Sửa thông tin"
                                    aria-label={`Sửa nhân viên ${emp.name}`}
                                >
                                    <Edit2 size={16}/>
                                </button>
                                <button
                                    onClick={() => confirmDelete(emp)}
                                    className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Xóa nhân viên"
                                    aria-label={`Xóa nhân viên ${emp.name}`}
                                >
                                    <Trash2 size={16}/>
                                </button>
                            </td>
                        </tr>
                      );
                  }) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                        Không tìm thấy nhân viên nào phù hợp.
                      </td>
                    </tr>
                  )}
              </tbody>
          </table>
      </div>

      {/* Edit Modal */}
      {isEditing && (
          <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
              <form
                onSubmit={handleSave}
                className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200"
              >
                  <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center sticky top-0 z-10">
                      <h3 id="modal-title" className="font-bold text-lg text-slate-800">
                          {currentEmp.id && employees.find(e => e.id === currentEmp.id) ? 'Cập nhật Nhân sự' : 'Thêm mới Nhân sự'}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="text-slate-500 hover:text-slate-700 p-1 hover:bg-slate-100 rounded"
                        aria-label="Đóng"
                      >
                        <Plus className="rotate-45" size={24}/>
                      </button>
                  </div>
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Section 1: Basic Info */}
                      <div className="md:col-span-2">
                          <h4 className="font-bold text-slate-700 border-b pb-2 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider"><User size={16}/> Thông tin cá nhân</h4>
                      </div>
                      <div>
                          <label htmlFor="emp-code" className="block text-sm font-medium text-slate-700 mb-1">Mã nhân viên (Human ID) <span className="text-red-500">*</span></label>
                          <input
                            id="emp-code"
                            required
                            type="text"
                            value={currentEmp.code}
                            onChange={e => setCurrentEmp({...currentEmp, code: e.target.value})}
                            className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="NV001"
                          />
                      </div>
                      <div>
                          <label htmlFor="emp-tkid" className="block text-sm font-medium text-slate-700 mb-1">Mã chấm công (Machine ID) <span className="text-red-500">*</span></label>
                          <input
                            id="emp-tkid"
                            required
                            type="text"
                            value={currentEmp.timekeepingId}
                            onChange={e => setCurrentEmp({...currentEmp, timekeepingId: e.target.value})}
                            className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="101"
                          />
                      </div>
                      <div className="md:col-span-2">
                          <label htmlFor="emp-name" className="block text-sm font-medium text-slate-700 mb-1">Họ và tên <span className="text-red-500">*</span></label>
                          <input
                            id="emp-name"
                            required
                            type="text"
                            value={currentEmp.name}
                            onChange={e => setCurrentEmp({...currentEmp, name: e.target.value})}
                            className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Nguyễn Văn A"
                          />
                      </div>
                      <div>
                          <label htmlFor="emp-dept" className="block text-sm font-medium text-slate-700 mb-1">Phòng ban</label>
                          <select
                            id="emp-dept"
                            value={currentEmp.department}
                            onChange={e => setCurrentEmp({...currentEmp, department: e.target.value})}
                            className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          >
                              <option value="IT">IT</option>
                              <option value="HR">HR</option>
                              <option value="Kho">Kho</option>
                              <option value="Sale">Sale</option>
                              <option value="Accounting">Accounting</option>
                              <option value="Kinh doanh">Kinh doanh</option>
                              <option value="Sản xuất">Sản xuất</option>
                              <option value="Vận chuyển">Vận chuyển</option>
                          </select>
                      </div>
                       <div>
                          <label htmlFor="emp-pos" className="block text-sm font-medium text-slate-700 mb-1">Chức danh</label>
                          <input
                            id="emp-pos"
                            type="text"
                            value={currentEmp.position}
                            onChange={e => setCurrentEmp({...currentEmp, position: e.target.value})}
                            className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                          />
                      </div>
                      <div>
                          <label htmlFor="emp-join" className="block text-sm font-medium text-slate-700 mb-1">Ngày vào làm</label>
                          <input
                            id="emp-join"
                            type="date"
                            value={currentEmp.joinDate}
                            onChange={e => setCurrentEmp({...currentEmp, joinDate: e.target.value})}
                            className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                          />
                      </div>
                      <div>
                          <label htmlFor="emp-status" className="block text-sm font-medium text-slate-700 mb-1">Trạng thái</label>
                          <select
                            id="emp-status"
                            value={currentEmp.status}
                            onChange={e => setCurrentEmp({...currentEmp, status: e.target.value as any})}
                            className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          >
                              <option value="ACTIVE">Đang làm việc</option>
                              <option value="INACTIVE">Đã nghỉ việc</option>
                          </select>
                      </div>
                      
                      {/* Section 2: Shift Info */}
                      <div className="md:col-span-2 mt-4">
                          <h4 className="font-bold text-slate-700 border-b pb-2 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider"><Briefcase size={16}/> Cấu hình Chấm công</h4>
                          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                               <label htmlFor="emp-shift" className="block text-sm font-bold text-slate-700 mb-2">Ca làm việc mặc định <span className="text-red-500">*</span></label>
                               <select 
                                    id="emp-shift"
                                    required
                                    value={currentEmp.defaultShiftId} 
                                    onChange={e => setCurrentEmp({...currentEmp, defaultShiftId: e.target.value})}
                                    className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
                               >
                                   <option value="">-- Chọn ca mặc định --</option>
                                   {shifts.map(s => (
                                       <option key={s.id} value={s.id}>{s.name} ({s.code}: {s.startTime}-{s.endTime})</option>
                                   ))}
                               </select>
                               <p className="text-[11px] text-blue-600 mt-2 font-medium flex items-center gap-1">
                                   <AlertCircle size={12}/> Ca này sẽ tự động áp dụng khi không có lịch phân ca cụ thể.
                               </p>
                          </div>
                      </div>
                  </div>
                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0 z-10">
                      <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 text-slate-600 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200">Hủy</button>
                      <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold flex items-center gap-2 shadow-md shadow-blue-200"><Check size={18}/> Lưu Hồ Sơ</button>
                  </div>
              </form>
          </div>
      )}
    </div>
  );
};

export default EmployeeManager;
