
import React, { useState, useRef } from 'react';
import { Holiday } from '../types';
import { Plus, Trash2, Calendar, Download, Upload, Copy, Save, X } from 'lucide-react';
import * as XLSX from 'xlsx';

interface HolidayManagerProps {
  holidays: Holiday[];
  onUpdateHolidays: (holidays: Holiday[]) => void;
}

const HolidayManager: React.FC<HolidayManagerProps> = ({ holidays, onUpdateHolidays }) => {
  const [newDate, setNewDate] = useState('');
  const [newName, setNewName] = useState('');
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredHolidays = holidays
    .filter(h => new Date(h.date).getFullYear() === yearFilter)
    .sort((a, b) => a.date.localeCompare(b.date));

  const handleAdd = () => {
    if (!newDate || !newName) return;
    const exists = holidays.some(h => h.date === newDate);
    if (exists) {
        alert('Ngày này đã được thiết lập là ngày lễ.');
        return;
    }

    const newHoliday: Holiday = {
      id: Date.now().toString(),
      date: newDate,
      name: newName
    };
    onUpdateHolidays([...holidays, newHoliday]);
    setNewDate('');
    setNewName('');
  };

  const handleDelete = (id: string) => {
    if(window.confirm('Bạn có chắc chắn muốn xóa ngày lễ này?')) {
        onUpdateHolidays(holidays.filter(h => h.id !== id));
    }
  };

  const handleCopyFromPreviousYear = () => {
    const prevYear = yearFilter - 1;
    const prevHolidays = holidays.filter(h => new Date(h.date).getFullYear() === prevYear);
    
    if (prevHolidays.length === 0) {
        alert(`Không tìm thấy dữ liệu ngày lễ của năm ${prevYear}.`);
        return;
    }

    if (!window.confirm(`Tìm thấy ${prevHolidays.length} ngày lễ từ năm ${prevYear}. Bạn có muốn sao chép sang năm ${yearFilter}?`)) return;

    const newHolidays: Holiday[] = [];
    let count = 0;

    prevHolidays.forEach(h => {
        const d = new Date(h.date);
        d.setFullYear(yearFilter);
        const newDateStr = d.toISOString().split('T')[0];

        // Check duplicate in current year
        const exists = holidays.some(ex => ex.date === newDateStr);
        if (!exists) {
            newHolidays.push({
                id: Date.now().toString() + Math.random(),
                date: newDateStr,
                name: h.name
            });
            count++;
        }
    });

    onUpdateHolidays([...holidays, ...newHolidays]);
    alert(`Đã sao chép thành công ${count} ngày lễ.`);
  };

  // Import Logic
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
                      // Use proper dateNF reading to ensure dates are parsed correctly
                      const wb = XLSX.read(bstr, { type: 'binary', cellDates: true, dateNF: 'yyyy-mm-dd' });
                      const wsName = wb.SheetNames[0];
                      const ws = wb.Sheets[wsName];
                      // Use raw: false to get strings
                      const data = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' }) as any[][];

                      // Assuming format: [Date, Name]
                      // Skip header row
                      const newItems: Holiday[] = [];
                      let count = 0;

                      data.slice(1).forEach(row => {
                          let dateStr = '';
                          const rawDate = row[0];
                          
                          if (rawDate) {
                               // If raw:false worked, it should be a string. 
                               // If it's still weird, we try to parse it.
                               if (String(rawDate).match(/^\d{4}-\d{2}-\d{2}$/)) {
                                   dateStr = String(rawDate);
                               } else {
                                   // Try to parse Date object if cellDates: true returned a Date (though raw: false usually returns formatted string)
                                   // In some edge cases with XLSX, checking if it's a Date object
                                   const d = new Date(rawDate);
                                   if (!isNaN(d.getTime())) {
                                       dateStr = d.toISOString().split('T')[0];
                                   }
                               }
                          }

                          const name = row[1] ? String(row[1]).trim() : 'Ngày lễ';

                          if (dateStr && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                              if (!holidays.some(h => h.date === dateStr)) {
                                  newItems.push({
                                      id: `imp-${Date.now()}-${count}`,
                                      date: dateStr,
                                      name: name
                                  });
                                  count++;
                              }
                          }
                      });

                      if (count > 0) {
                          onUpdateHolidays([...holidays, ...newItems]);
                          alert(`Đã import thành công ${count} ngày lễ.`);
                      } else {
                          alert('Không tìm thấy dữ liệu hợp lệ hoặc dữ liệu đã tồn tại. Vui lòng kiểm tra định dạng ngày (YYYY-MM-DD).');
                      }

                  } catch (error) {
                      console.error("Import error", error);
                      alert("Lỗi đọc file Excel.");
                  }
              }
          };
          reader.readAsBinaryString(file);
      }
      e.target.value = '';
  };

  const handleDownloadTemplate = () => {
      const headers = ['Ngày (YYYY-MM-DD)', 'Tên ngày lễ'];
      const data = [headers, [`${yearFilter}-01-01`, 'Tết Dương Lịch'], [`${yearFilter}-04-30`, 'Giải phóng Miền Nam']];
      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Template_NgayLe");
      XLSX.writeFile(wb, "Mau_Import_NgayLe.xlsx");
  };

  return (
    <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
             <div>
                <h2 className="text-2xl font-bold text-slate-800">Cấu hình Ngày lễ</h2>
                <p className="text-slate-500 text-sm">Thiết lập các ngày nghỉ lễ trong năm để tính công chính xác.</p>
             </div>
             <div className="flex gap-2">
                 <input 
                     type="file" 
                     ref={fileInputRef}
                     onChange={handleFileChange}
                     accept=".xls,.xlsx"
                     className="hidden"
                 />
                 <button onClick={handleDownloadTemplate} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-600 text-sm font-medium hover:text-blue-600">
                     <Download size={16}/> Mẫu Import
                 </button>
                 <button onClick={handleImportClick} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-600 text-sm font-medium hover:bg-slate-50">
                     <Upload size={16}/> Import
                 </button>
             </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Add New & Controls */}
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Plus size={18} className="text-blue-600"/> Thêm thủ công
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Ngày</label>
                            <input 
                                type="date" 
                                value={newDate} 
                                onChange={e => setNewDate(e.target.value)} 
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tên ngày lễ</label>
                            <input 
                                type="text" 
                                value={newName} 
                                onChange={e => setNewName(e.target.value)} 
                                placeholder="VD: Quốc Khánh"
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <button 
                            onClick={handleAdd}
                            disabled={!newDate || !newName}
                            className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            Thêm
                        </button>
                    </div>
                </div>

                <div className="bg-purple-50 p-6 rounded-xl border border-purple-100">
                     <h3 className="font-bold text-purple-900 mb-2 flex items-center gap-2">
                         <Copy size={18}/> Sao chép dữ liệu
                     </h3>
                     <p className="text-sm text-purple-700 mb-4">
                         Sao chép danh sách ngày lễ từ năm <strong>{yearFilter - 1}</strong> sang năm <strong>{yearFilter}</strong>.
                     </p>
                     <button 
                        onClick={handleCopyFromPreviousYear}
                        className="w-full bg-white border border-purple-200 text-purple-700 py-2 rounded-lg font-medium hover:bg-purple-100 transition-colors shadow-sm"
                     >
                         Sao chép từ {yearFilter - 1}
                     </button>
                </div>
            </div>

            {/* Right: List */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col min-h-[500px]">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Calendar size={18} className="text-slate-500"/> 
                        Danh sách năm {yearFilter}
                    </h3>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setYearFilter(y => y - 1)} className="p-1 hover:bg-slate-200 rounded"><span className="text-xs font-bold">&lt;</span></button>
                        <span className="font-mono font-bold text-lg">{yearFilter}</span>
                        <button onClick={() => setYearFilter(y => y + 1)} className="p-1 hover:bg-slate-200 rounded"><span className="text-xs font-bold">&gt;</span></button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto">
                    {filteredHolidays.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <Calendar size={48} className="mb-4 opacity-50"/>
                            <p>Chưa có ngày lễ nào trong năm {yearFilter}</p>
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-100 text-slate-700 font-medium">
                                <tr>
                                    <th className="px-6 py-3 w-40">Ngày</th>
                                    <th className="px-6 py-3">Tên ngày lễ</th>
                                    <th className="px-6 py-3 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredHolidays.map(h => (
                                    <tr key={h.id} className="hover:bg-slate-50 group">
                                        <td className="px-6 py-3 font-medium text-slate-700">{h.date}</td>
                                        <td className="px-6 py-3 text-slate-800">{h.name}</td>
                                        <td className="px-6 py-3 text-right">
                                            <button 
                                                onClick={() => handleDelete(h.id)}
                                                className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <Trash2 size={16}/>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

export default HolidayManager;
