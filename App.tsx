
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  CalendarClock, 
  UploadCloud, 
  Sheet, 
  Settings, 
  LogOut, 
  Menu,
  Bell,
  Users,
  Database,
  CalendarDays,
  FileText,
  Trash2,
  PartyPopper,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import ShiftConfig from './components/ShiftConfig';
import ImportWizard from './components/ImportWizard';
import TimesheetView from './components/TimesheetView';
import EmployeeManager from './components/EmployeeManager';
import RawDataView from './components/RawDataView';
import ShiftScheduler from './components/ShiftScheduler';
import RequestManager from './components/RequestManager';
import HolidayManager from './components/HolidayManager';
import Login from './components/Login';

import { Shift, Employee, AttendanceLog, ShiftAssignment, AttendanceRequest, Holiday } from './types';
import { calculateTimesheet } from './utils/attendanceEngine';
import { storage } from './services/storage';

// Simple navigation state
type View = 'dashboard' | 'employees' | 'shifts' | 'scheduler' | 'requests' | 'holidays' | 'import' | 'rawdata' | 'timesheet';

const App: React.FC = () => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Global Context State
  const [viewDate, setViewDate] = useState(new Date());

  // Central State Management
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [schedules, setSchedules] = useState<ShiftAssignment[]>([]);
  const [requests, setRequests] = useState<AttendanceRequest[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  // --- INITIAL DATA LOAD ---
  const fetchAllData = async () => {
      setIsLoadingData(true);
      try {
          const [e, s, l, sch, r, h] = await Promise.all([
              storage.getEmployees(),
              storage.getShifts(),
              storage.getLogs(),
              storage.getSchedules(),
              storage.getRequests(),
              storage.getHolidays()
          ]);
          
          setEmployees(e);
          setShifts(s);
          setLogs(l);
          setSchedules(sch);
          setRequests(r);
          setHolidays(h);
      } catch (error) {
          console.error("Failed to load initial data", error);
          alert("Lỗi tải dữ liệu hệ thống. Vui lòng thử lại.");
      } finally {
          setIsLoadingData(false);
      }
  };

  useEffect(() => {
      if (isAuthenticated) {
          fetchAllData();
      }
  }, [isAuthenticated]);

  // Derived State: Timesheet
  const timesheetData = useMemo(() => {
      try {
          if (isLoadingData) return [];
          return calculateTimesheet(employees, shifts, logs, schedules, requests, holidays, viewDate);
      } catch (error) {
          console.error("Timesheet Calc Error", error);
          return [];
      }
  }, [employees, shifts, logs, schedules, requests, holidays, viewDate, isLoadingData]);

  // Auth Handlers
  const handleLogin = (u: string, p: string) => {
      if (u === 'admin' && p === 'admin123') {
          setIsAuthenticated(true);
          return true;
      }
      return false;
  };

  const handleLogout = () => {
      setIsAuthenticated(false);
      setCurrentView('dashboard');
  };

  const handleResetData = async () => {
      if(window.confirm('CẢNH BÁO: Hành động này sẽ XÓA TOÀN BỘ dữ liệu hiện tại và khôi phục về dữ liệu mẫu ban đầu. \n\nBạn có chắc chắn không?')) {
          setIsLoadingData(true);
          await storage.clearAllData();
          await fetchAllData(); // Reload
      }
  };

  // --- ASYNC HANDLERS (Connect to StorageService) ---
  
  const handleAddShift = async (newShift: Shift) => {
      const saved = await storage.saveShift(newShift);
      setShifts(prev => [...prev, saved]);
  };
  const handleUpdateShift = async (updatedShift: Shift) => {
      await storage.saveShift(updatedShift);
      setShifts(prev => prev.map(s => s.id === updatedShift.id ? updatedShift : s));
  };
  const handleDeleteShift = async (id: string) => {
      await storage.deleteShift(id);
      setShifts(prev => prev.filter(s => s.id !== id));
  };

  const handleAddEmployee = async (emp: Employee) => {
      const saved = await storage.saveEmployee(emp);
      setEmployees(prev => [...prev, saved]);
  };
  const handleUpdateEmployee = async (emp: Employee) => {
      await storage.saveEmployee(emp);
      setEmployees(prev => prev.map(e => e.id === emp.id ? emp : e));
  };
  const handleDeleteEmployee = async (id: string) => {
      await storage.deleteEmployee(id);
      setEmployees(prev => prev.filter(e => e.id !== id));
  };

  const handleAddLog = async (log: AttendanceLog) => {
      await storage.addSingleLog(log);
      setLogs(prev => [...prev, log]);
  };
  
  const handleImportLogs = async (newLogs: AttendanceLog[]) => {
      setIsLoadingData(true); // Large operation
      await storage.saveLogs(newLogs);
      setLogs(prev => [...prev, ...newLogs]);
      setIsLoadingData(false);
  };
  
  const handleUpdateSchedule = async (newSchedules: ShiftAssignment[]) => {
      await storage.saveSchedules(newSchedules);
      setSchedules(newSchedules);
  };
  const handleUpdateRequests = async (newRequests: AttendanceRequest[]) => {
      await storage.saveRequests(newRequests);
      setRequests(newRequests);
  };
  const handleUpdateHolidays = async (newHolidays: Holiday[]) => {
      await storage.saveHolidays(newHolidays);
      setHolidays(newHolidays);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.value) {
          setViewDate(new Date(e.target.value + '-01'));
      }
  };

  // Render Content
  const renderContent = () => {
    if (isLoadingData) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4">
                <Loader2 size={48} className="animate-spin text-blue-600" />
                <p className="font-medium animate-pulse">Đang đồng bộ dữ liệu hệ thống...</p>
            </div>
        );
    }

    try {
        switch (currentView) {
        case 'dashboard':
            return <Dashboard timesheetData={timesheetData} employees={employees} />;
        case 'employees':
            return (
                <EmployeeManager 
                    employees={employees} 
                    shifts={shifts}
                    onAdd={handleAddEmployee}
                    onUpdate={handleUpdateEmployee}
                    onDelete={handleDeleteEmployee}
                />
            );
        case 'shifts':
            return (
            <ShiftConfig 
                shifts={shifts} 
                onAddShift={handleAddShift} 
                onUpdateShift={handleUpdateShift}
                onDeleteShift={handleDeleteShift}
            />
            );
        case 'scheduler':
            return (
                <ShiftScheduler 
                    employees={employees}
                    shifts={shifts}
                    schedules={schedules}
                    requests={requests}
                    holidays={holidays}
                    onUpdateSchedule={handleUpdateSchedule}
                />
            );
        case 'requests':
            return (
                <RequestManager 
                    requests={requests}
                    employees={employees}
                    onUpdateRequests={handleUpdateRequests}
                />
            );
        case 'holidays':
            return (
                <HolidayManager 
                    holidays={holidays}
                    onUpdateHolidays={handleUpdateHolidays}
                />
            );
        case 'import':
            // UPDATED: Pass employees prop for validation
            return <ImportWizard onImportLogs={handleImportLogs} employees={employees} />; 
        case 'rawdata':
            return (
                <RawDataView 
                    logs={logs}
                    employees={employees}
                    onAddLog={handleAddLog}
                />
            );
        case 'timesheet':
            return <TimesheetView data={timesheetData} />;
        default:
            return <Dashboard timesheetData={timesheetData} employees={employees} />;
        }
    } catch (err) {
        console.error("View Render Error:", err);
        return (
            <div className="p-10 text-center">
                <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-200 inline-block">
                    <AlertTriangle size={48} className="mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">Đã xảy ra lỗi hiển thị</h3>
                    <p>Vui lòng thử tải lại trang hoặc Reset dữ liệu nếu lỗi vẫn tiếp diễn.</p>
                </div>
            </div>
        );
    }
  };

  const monthInputValue = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}`;

  if (!isAuthenticated) {
      return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-900">
      <aside 
        className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 text-slate-300 flex flex-col transition-all duration-300 shadow-xl z-50`}
      >
        <div className="h-16 flex items-center justify-center border-b border-slate-700">
           {isSidebarOpen ? (
               <h1 className="text-xl font-bold text-white tracking-wider">HR<span className="text-blue-500">PRO</span></h1>
           ) : (
               <span className="font-bold text-blue-500">HP</span>
           )}
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto scrollbar-none">
            <NavItem icon={LayoutDashboard} label="Tổng quan" active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} collapsed={!isSidebarOpen}/>
            
            <div className={`mt-4 mb-2 text-xs font-semibold text-slate-500 uppercase px-3 ${!isSidebarOpen && 'hidden'}`}>Quản trị</div>
            
            <NavItem icon={Users} label="Nhân sự" active={currentView === 'employees'} onClick={() => setCurrentView('employees')} collapsed={!isSidebarOpen}/>
            <NavItem icon={CalendarClock} label="Cấu hình Ca" active={currentView === 'shifts'} onClick={() => setCurrentView('shifts')} collapsed={!isSidebarOpen}/>
            <NavItem icon={CalendarDays} label="Phân ca" active={currentView === 'scheduler'} onClick={() => setCurrentView('scheduler')} collapsed={!isSidebarOpen}/>
            <NavItem icon={PartyPopper} label="Ngày lễ" active={currentView === 'holidays'} onClick={() => setCurrentView('holidays')} collapsed={!isSidebarOpen}/>

            <div className={`mt-4 mb-2 text-xs font-semibold text-slate-500 uppercase px-3 ${!isSidebarOpen && 'hidden'}`}>Chấm công</div>

             <NavItem icon={FileText} label="Đơn từ/Phép" active={currentView === 'requests'} onClick={() => setCurrentView('requests')} collapsed={!isSidebarOpen}/>
             <NavItem icon={UploadCloud} label="Import Dữ liệu" active={currentView === 'import'} onClick={() => setCurrentView('import')} collapsed={!isSidebarOpen}/>
             <NavItem icon={Database} label="Dữ liệu thô" active={currentView === 'rawdata'} onClick={() => setCurrentView('rawdata')} collapsed={!isSidebarOpen}/>
             <NavItem icon={Sheet} label="Bảng công" active={currentView === 'timesheet'} onClick={() => setCurrentView('timesheet')} collapsed={!isSidebarOpen}/>
        </nav>

        <div className="p-4 border-t border-slate-700 space-y-2">
             <div className={`flex items-center gap-3 ${!isSidebarOpen && 'justify-center'}`}>
                 <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">A</div>
                 {isSidebarOpen && (
                     <div className="overflow-hidden flex-1">
                         <p className="text-sm font-medium text-white truncate">Admin User</p>
                         <p className="text-xs text-slate-500">HR Manager</p>
                     </div>
                 )}
                 <button 
                    onClick={handleLogout}
                    className="p-1.5 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors"
                    title="Đăng xuất"
                 >
                     <LogOut size={16} />
                 </button>
             </div>
             {isSidebarOpen && (
                 <button 
                    onClick={handleResetData}
                    className="w-full flex items-center justify-center gap-2 text-xs text-red-400 hover:text-red-300 py-2 border border-slate-700 rounded hover:bg-slate-800 transition-colors"
                 >
                     <Trash2 size={12}/> Reset Dữ liệu Demo
                 </button>
             )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-40">
            <div className="flex items-center gap-4">
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600">
                    <Menu size={20} />
                </button>
                <div className="flex flex-col">
                    <h2 className="text-lg font-semibold text-slate-800">
                        {currentView === 'dashboard' && 'Tổng quan hệ thống'}
                        {currentView === 'employees' && 'Quản lý Hồ sơ Nhân viên'}
                        {currentView === 'shifts' && 'Cấu hình Ca làm việc'}
                        {currentView === 'scheduler' && 'Lịch trình & Phân ca'}
                        {currentView === 'requests' && 'Quản lý Đơn từ & Phép'}
                        {currentView === 'holidays' && 'Cấu hình Ngày nghỉ Lễ'}
                        {currentView === 'import' && 'Import Dữ liệu'}
                        {currentView === 'rawdata' && 'Nhật ký quét (Raw Data)'}
                        {currentView === 'timesheet' && 'Bảng chấm công chi tiết'}
                    </h2>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="flex items-center bg-slate-100 rounded-lg px-3 py-1 border border-slate-200">
                    <span className="text-xs text-slate-500 font-bold mr-2 uppercase">Kỳ lương:</span>
                    <input 
                        type="month" 
                        value={monthInputValue}
                        onChange={handleMonthChange}
                        className="bg-transparent border-none text-sm font-medium text-slate-700 focus:ring-0 outline-none cursor-pointer"
                    />
                </div>
                
                <div className="h-8 w-px bg-slate-200 mx-2"></div>

                <button className="relative p-2 hover:bg-slate-100 rounded-full text-slate-600">
                    <Bell size={20} />
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                </button>
            </div>
        </header>

        <div className="flex-1 overflow-auto p-6 bg-slate-100/50">
            {renderContent()}
        </div>
      </main>
    </div>
  );
};

const NavItem = ({ icon: Icon, label, active, onClick, collapsed }: any) => (
    <button 
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all mb-1 ${
            active 
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        } ${collapsed ? 'justify-center' : ''}`}
        title={collapsed ? label : ''}
    >
        <Icon size={20} className={active ? 'text-white' : 'text-slate-400'} />
        {!collapsed && <span className="font-medium text-sm">{label}</span>}
    </button>
);

export default App;
