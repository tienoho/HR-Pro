
import React, { useState, useMemo } from 'react';
import { Upload, ArrowRight, CheckCircle, AlertTriangle, X, ChevronDown, Sparkles, Wand2, RotateCcw, AlertCircle, FileWarning } from 'lucide-react';
import * as XLSX from 'xlsx';
import { AttendanceLog, Employee } from '../types';

const STEPS = ['Upload File', 'Map Columns', 'Validate', 'Complete'];

interface ImportWizardProps {
  onImportLogs: (logs: AttendanceLog[]) => void;
  employees: Employee[]; // Added to perform validation
}

interface ValidationSummary {
    total: number;
    valid: number;
    invalid: number;
    unknownEmployees: number; // IDs not found in system
    invalidDates: number;
    errors: string[];
}

const ImportWizard: React.FC<ImportWizardProps> = ({ onImportLogs, employees }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  
  // State for parsed file data
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [fileData, setFileData] = useState<any[][]>([]); 
  const [previewRows, setPreviewRows] = useState<any[][]>([]);

  // Mapping stores column INDEX as string
  const [mapping, setMapping] = useState({
    empId: '', // Represents Timekeeping ID in raw data
    date: '',
    checkIn: '',
    checkOut: ''
  });

  // Validation State
  const [validationSummary, setValidationSummary] = useState<ValidationSummary | null>(null);
  const [validLogs, setValidLogs] = useState<AttendanceLog[]>([]);

  // Helper to suggest column based on keywords
  const getSuggestedIndex = (fieldKey: keyof typeof mapping, headers: string[] = fileHeaders) => {
    if (headers.length === 0) return '';
    
    const keywords: Record<keyof typeof mapping, string[]> = {
        empId: ['id', 'mã', 'code', 'enroll', 'staff', 'nhân viên'],
        date: ['date', 'ngày', 'time', 'giờ', 'timestamp', 'thời gian', 'check'],
        checkIn: ['in', 'vào', 'start', 'bắt đầu'],
        checkOut: ['out', 'ra', 'end', 'kết thúc']
    };
    
    const targetKeywords = keywords[fieldKey] || [];
    const idx = headers.findIndex(h => targetKeywords.some(k => h.toLowerCase().includes(k)));
    return idx !== -1 ? String(idx) : '';
  };

  const handleAutoMap = () => {
    const newMapping = {
        empId: getSuggestedIndex('empId', fileHeaders),
        date: getSuggestedIndex('date', fileHeaders),
        checkIn: getSuggestedIndex('checkIn', fileHeaders),
        checkOut: getSuggestedIndex('checkOut', fileHeaders)
    };
    setMapping(newMapping);
  };

  const handleClearMap = () => {
    setMapping({ empId: '', date: '', checkIn: '', checkOut: '' });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setValidationSummary(null);

      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target?.result;
        if (bstr) {
            try {
                const wb = XLSX.read(bstr, { type: 'binary', cellDates: true, dateNF: 'yyyy-mm-dd hh:mm:ss' });
                const wsName = wb.SheetNames[0];
                const ws = wb.Sheets[wsName];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' }) as any[][];
                
                if (data && data.length > 0) {
                    const headers = data[0].map(h => String(h));
                    const allRows = data.slice(1);
                    setFileData(allRows);
                    setFileHeaders(headers);
                    setPreviewRows(allRows.slice(0, 5));

                    const newMapping = {
                        empId: getSuggestedIndex('empId', headers),
                        date: getSuggestedIndex('date', headers),
                        checkIn: getSuggestedIndex('checkIn', headers),
                        checkOut: getSuggestedIndex('checkOut', headers)
                    };
                    setMapping(newMapping);
                }
            } catch (error) {
                console.error("Error parsing file:", error);
                alert("Lỗi đọc file. Vui lòng đảm bảo file không bị lỗi.");
            }
        }
      };
      reader.readAsBinaryString(selectedFile);
    }
    e.target.value = '';
  };

  // Perform Validation Logic
  const performValidation = () => {
      const empIdIdx = parseInt(mapping.empId);
      const dateIdx = parseInt(mapping.date);
      
      let validCount = 0;
      let invalidCount = 0;
      let unknownEmpCount = 0;
      let invalidDateCount = 0;
      const errors: string[] = [];
      const logsToImport: AttendanceLog[] = [];

      // Create a Set for faster lookup
      const existingTimekeepingIds = new Set(employees.map(e => e.timekeepingId));

      fileData.forEach((row, index) => {
          const rawId = row[empIdIdx] ? String(row[empIdIdx]).trim() : '';
          const rawDate = row[dateIdx] ? String(row[dateIdx]).trim() : '';

          if (!rawId || !rawDate) {
              invalidCount++;
              return; // Skip empty rows
          }

          // Check 1: Orphaned Data (Employee not found)
          if (!existingTimekeepingIds.has(rawId)) {
              invalidCount++;
              unknownEmpCount++;
              if (errors.length < 5) errors.push(`Dòng ${index + 2}: Mã máy "${rawId}" không tồn tại trong hệ thống.`);
              return;
          }

          // Check 2: Date Format
          // Simple check if it looks like a date string or timestamp
          if (rawDate.length < 8) {
              invalidCount++;
              invalidDateCount++;
              if (errors.length < 5) errors.push(`Dòng ${index + 2}: Định dạng ngày giờ không hợp lệ "${rawDate}".`);
              return;
          }

          logsToImport.push({
              id: `imp-${Date.now()}-${index}`,
              timekeepingId: rawId,
              timestamp: rawDate,
              source: 'IMPORT',
              isIgnored: false
          });
          validCount++;
      });

      if (unknownEmpCount > 5) errors.push(`...và ${unknownEmpCount - 5} lỗi mã nhân viên khác.`);

      setValidationSummary({
          total: fileData.length,
          valid: validCount,
          invalid: invalidCount,
          unknownEmployees: unknownEmpCount,
          invalidDates: invalidDateCount,
          errors
      });
      setValidLogs(logsToImport);
      setCurrentStep(3);
  };

  const processImport = () => {
      if (validLogs.length > 0) {
          onImportLogs(validLogs);
          setCurrentStep(4);
      }
  };

  const nextStep = () => {
    if (currentStep === 2) {
        performValidation();
    } else if (currentStep === 3) {
        processImport();
    } else if (currentStep < 4) {
        setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  // Helper to get sample values for a column
  const getColumnSamples = (colIdxStr: string) => {
      if (colIdxStr === '' || previewRows.length === 0) return [];
      const colIdx = parseInt(colIdxStr);
      return previewRows.map(row => row[colIdx]).filter(val => val !== undefined && val !== null && val !== '').slice(0, 3);
  };

  const renderMappingField = (label: string, fieldKey: keyof typeof mapping, required = true) => {
      const selectedColIdx = mapping[fieldKey];
      const samples = getColumnSamples(selectedColIdx);
      const suggestedIdx = getSuggestedIndex(fieldKey);
      const isSuggestedMatch = selectedColIdx === suggestedIdx && suggestedIdx !== '';

      return (
        <div className={`bg-white p-4 rounded-lg border shadow-sm transition-all hover:shadow-md group ${isSuggestedMatch ? 'border-purple-300 ring-1 ring-purple-100 bg-purple-50/10' : 'border-slate-200'}`}>
            <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-bold text-slate-700 flex items-center gap-2">
                    {label} {required && <span className="text-red-500">*</span>}
                    {isSuggestedMatch && (
                         <div className="flex items-center gap-1 text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium animate-in fade-in">
                             <Sparkles size={10} className="fill-purple-300" /> Auto
                        </div>
                    )}
                </label>
                {selectedColIdx !== '' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium flex items-center gap-1">
                        <CheckCircle size={10} /> Đã chọn
                    </span>
                )}
            </div>
            
            <div className="relative">
                <select 
                    value={selectedColIdx}
                    onChange={(e) => setMapping({...mapping, [fieldKey]: e.target.value})}
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm appearance-none focus:ring-2 focus:ring-blue-500 outline-none transition-colors cursor-pointer pr-8
                    ${selectedColIdx === '' ? 'border-slate-300 text-slate-500 bg-white' : 
                      isSuggestedMatch ? 'border-purple-300 bg-purple-50 text-purple-900 font-bold' : 
                      'border-blue-300 bg-blue-50 text-blue-900 font-medium'}`}
                >
                    <option value="">-- Chọn cột --</option>
                    {fileHeaders.map((header, idx) => (
                        <option key={idx} value={idx}>
                            {idx + 1}. {header}
                        </option>
                    ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronDown size={16} />
                </div>
            </div>
            
            {suggestedIdx !== '' && selectedColIdx !== suggestedIdx && (
                 <button 
                    onClick={() => setMapping({...mapping, [fieldKey]: suggestedIdx})}
                    className="mt-2 text-xs flex items-center gap-2 px-3 py-2 w-full text-left bg-purple-50 border border-purple-100 rounded-md text-purple-700 cursor-pointer hover:bg-purple-100 transition-colors group/btn"
                 >
                     <Wand2 size={12} className="group-hover/btn:rotate-12 transition-transform"/>
                     <span>Gợi ý: <strong>{fileHeaders[parseInt(suggestedIdx)]}</strong></span>
                 </button>
            )}
            
            <div className="mt-3">
                {selectedColIdx !== '' ? (
                    <div className="bg-slate-50/50 rounded-md p-2 border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Dữ liệu mẫu</span>
                        <div className="flex gap-2 flex-wrap">
                            {samples.length > 0 ? samples.map((s, i) => (
                                <div key={i} className="px-2 py-1 bg-white text-slate-700 text-xs rounded border border-slate-200 shadow-sm font-mono min-w-[40px] text-center truncate max-w-[150px]">
                                    {String(s)}
                                </div>
                            )) : <span className="text-slate-400 italic text-xs">Trống hoặc không hợp lệ</span>}
                        </div>
                    </div>
                ) : (
                    suggestedIdx === '' && (
                         <div className="flex items-center gap-2 text-xs text-slate-400 italic bg-slate-50 p-2 rounded border border-dashed border-slate-200">
                             <ArrowRight size={12}/> Vui lòng chọn cột tương ứng
                         </div>
                    )
                )}
            </div>
        </div>
      );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
            <div className="bg-blue-100 p-4 rounded-full mb-4">
              <Upload className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-medium text-slate-800 mb-2">Tải file Chấm công</h3>
            <p className="text-slate-500 mb-6 text-sm">Hỗ trợ định dạng .xls, .xlsx. Tối đa 5MB.</p>
            <input 
                type="file" 
                id="file-upload" 
                className="hidden" 
                accept=".xls,.xlsx"
                onChange={handleFileChange}
            />
            <label 
                htmlFor="file-upload" 
                className="cursor-pointer bg-white border border-slate-300 text-slate-700 px-6 py-2 rounded-lg font-medium hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
            >
                {file ? 'Đổi file khác' : 'Chọn file từ máy'}
            </label>
            {file && (
                <div className="mt-6 flex flex-col items-center animate-in fade-in zoom-in duration-300">
                    <div className="flex items-center gap-2 text-green-600 font-medium bg-green-50 px-4 py-2 rounded-full border border-green-200">
                        <CheckCircle size={16}/> {file.name}
                    </div>
                    <p className="text-xs text-slate-400 mt-2">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
            )}
          </div>
        );
      case 2:
        return (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-end mb-6">
                 <div>
                    <h3 className="text-lg font-bold text-slate-800">Khớp cột dữ liệu</h3>
                    <p className="text-slate-500 text-sm">Chọn cột trong file Excel tương ứng với dữ liệu hệ thống.</p>
                 </div>
                 {fileHeaders.length > 0 && (
                     <div className="flex gap-2">
                         <button 
                            onClick={handleClearMap}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded hover:bg-slate-50"
                         >
                             <RotateCcw size={14} /> Reset
                         </button>
                         <button 
                            onClick={handleAutoMap}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-purple-600 border border-purple-600 rounded hover:bg-purple-700 shadow-sm"
                         >
                             <Wand2 size={14} /> Quick Map
                         </button>
                     </div>
                 )}
            </div>
            
            {!fileHeaders.length ? (
                 <div className="text-center p-8 bg-red-50 text-red-600 rounded-lg border border-red-200">
                     <AlertTriangle className="mx-auto mb-2" size={24}/>
                     <p>Không thể đọc tiêu đề cột. Vui lòng kiểm tra lại file Excel.</p>
                 </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {renderMappingField("Mã Chấm công (Machine ID)", "empId")}
                    {renderMappingField("Thời gian (Ngày giờ)", "date")}
                </div>
            )}
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
             <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-800">Kết quả Kiểm tra Dữ liệu</h3>
                <span className="text-sm text-slate-500">Hệ thống tự động loại bỏ các dòng không hợp lệ.</span>
             </div>
             
             {validationSummary && (
                 <div className="grid grid-cols-3 gap-4">
                     <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
                         <p className="text-sm text-blue-600 mb-1">Tổng số dòng</p>
                         <p className="text-2xl font-bold text-blue-800">{validationSummary.total}</p>
                     </div>
                     <div className="bg-green-50 border border-green-100 p-4 rounded-xl">
                         <p className="text-sm text-green-600 mb-1">Hợp lệ (Sẵn sàng)</p>
                         <p className="text-2xl font-bold text-green-800">{validationSummary.valid}</p>
                     </div>
                     <div className={`border p-4 rounded-xl ${validationSummary.invalid > 0 ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                         <p className={`text-sm mb-1 ${validationSummary.invalid > 0 ? 'text-red-600' : 'text-slate-500'}`}>Không hợp lệ</p>
                         <p className={`text-2xl font-bold ${validationSummary.invalid > 0 ? 'text-red-800' : 'text-slate-700'}`}>{validationSummary.invalid}</p>
                     </div>
                 </div>
             )}

             {validationSummary && validationSummary.invalid > 0 && (
                 <div className="bg-red-50 border border-red-100 rounded-lg p-4">
                     <h4 className="font-bold text-red-800 text-sm mb-2 flex items-center gap-2"><AlertCircle size={16}/> Chi tiết lỗi</h4>
                     <ul className="list-disc list-inside text-xs text-red-700 space-y-1">
                         {validationSummary.unknownEmployees > 0 && <li>Có <strong>{validationSummary.unknownEmployees}</strong> mã chấm công không tồn tại trong hệ thống.</li>}
                         {validationSummary.invalidDates > 0 && <li>Có <strong>{validationSummary.invalidDates}</strong> dòng sai định dạng ngày tháng.</li>}
                         <li className="mt-2 font-semibold text-red-900 border-t border-red-200 pt-2">Log chi tiết (5 lỗi đầu tiên):</li>
                         {validationSummary.errors.map((err, i) => (
                             <li key={i} className="pl-4">{err}</li>
                         ))}
                     </ul>
                 </div>
             )}

            {validationSummary && validationSummary.valid === 0 && (
                <div className="text-center p-8 border border-dashed border-red-300 rounded-lg bg-red-50 text-red-600">
                    <FileWarning className="mx-auto mb-2" size={32}/>
                    <p className="font-medium">Không có dữ liệu hợp lệ để Import.</p>
                    <p className="text-sm opacity-80 mt-1">Vui lòng kiểm tra lại file hoặc cấu hình nhân viên.</p>
                </div>
            )}
          </div>
        );
      case 4:
         return (
             <div className="flex flex-col items-center justify-center py-12 text-center">
                 <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 shadow-sm">
                     <CheckCircle className="w-8 h-8 text-green-600" />
                 </div>
                 <h2 className="text-2xl font-bold text-slate-800 mb-2">Import Thành công!</h2>
                 <p className="text-slate-600 mb-6 max-w-md">
                     Đã thêm <strong>{validLogs.length}</strong> dòng nhật ký chấm công vào hệ thống.
                 </p>
                 <button onClick={() => { setFile(null); setCurrentStep(1); setValidationSummary(null); }} className="text-blue-600 font-medium hover:text-blue-800 underline underline-offset-4">Import file khác</button>
             </div>
         )
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[600px] flex flex-col">
      {/* Header Stepper */}
      <div className="bg-slate-50 border-b border-slate-200 px-8 py-6">
        <div className="flex items-center justify-between relative max-w-3xl mx-auto">
           <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 -z-0"></div>
           {STEPS.map((step, index) => {
               const stepNum = index + 1;
               const isActive = stepNum === currentStep;
               const isCompleted = stepNum < currentStep;

               return (
                   <div key={step} className="relative z-10 flex flex-col items-center bg-slate-50 px-2">
                       <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 shadow-sm ${
                           isActive ? 'bg-blue-600 text-white scale-110 ring-4 ring-blue-100' : 
                           isCompleted ? 'bg-green-500 text-white' : 'bg-slate-300 text-slate-600'
                       }`}>
                           {isCompleted ? <CheckCircle size={16}/> : stepNum}
                       </div>
                       <span className={`text-xs font-bold mt-2 uppercase tracking-wide ${isActive ? 'text-blue-700' : 'text-slate-400'}`}>{step}</span>
                   </div>
               )
           })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        {renderStepContent()}
      </div>

      {/* Footer Controls */}
      {currentStep < 4 && (
        <div className="p-6 border-t border-slate-100 flex justify-between bg-white">
            <button 
                onClick={prevStep} 
                disabled={currentStep === 1}
                className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
            >
                Quay lại
            </button>
            <div className="flex gap-3">
                <button 
                    onClick={nextStep}
                    disabled={
                        (currentStep === 1 && !file) || 
                        (currentStep === 2 && (!mapping.empId || !mapping.date)) ||
                        (currentStep === 3 && (!validationSummary || validationSummary.valid === 0))
                    }
                    className="px-6 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 flex items-center gap-2 transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                    {currentStep === 3 ? 'Xác nhận Import' : 'Tiếp tục'} <ArrowRight size={18}/>
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default ImportWizard;
