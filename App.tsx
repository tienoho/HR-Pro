
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
  PartyPopper
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

import { MOCK_SHIFTS, MOCK_EMPLOYEES, MOCK_LOGS, MOCK_SCHEDULES } from './constants';
import { Shift, Employee, AttendanceLog, ShiftAssignment, AttendanceRequest, Holiday } from './types';
import { calculateTimesheet } from './utils/attendanceEngine';

// Simple navigation state
type View = 'dashboard' | 'employees' | 'shifts' | 'scheduler' | 'requests' | 'holidays' | 'import' | 'rawdata' | 'timesheet';

// --- STORAGE KEYS ---
const KEY_EMPLOYEES = 'hr_pro_employees';
const KEY_SHIFTS = 'hr_pro_shifts';
const KEY_LOGS = 'hr_pro_logs';
const KEY_SCHEDULES = 'hr_pro_schedules';
const KEY_REQUESTS = 'hr_pro_requests';
const KEY_HOLIDAYS = 'hr_pro_holidays';

// Helper to load data with fallback
const loadData = <T,>(key: string, fallback: T): T => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
    } catch (e) {
        console.error(`Error loading key ${key}`, e);
        return fallback;
    }
};

const App: React.FC = () => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Global Context State
  const [viewDate, setViewDate] = useState(new Date());

  // Central State Management with Persistence
  const [shifts, setShifts] = useState<Shift[]>(() => loadData(KEY_SHIFTS, MOCK_SHIFTS));
  const [employees, setEmployees] = useState<Employee[]>(() => loadData(KEY_EMPLOYEES, MOCK_EMPLOYEES));
  const [logs, setLogs] = useState<AttendanceLog[]>(() => loadData(KEY_LOGS, MOCK_LOGS));
  const [schedules, setSchedules] = useState<ShiftAssignment[]>(() => loadData(KEY_SCHEDULES, MOCK_SCHEDULES));
  const [requests, setRequests] = useState<AttendanceRequest[]>(() => loadData(KEY_REQUESTS, []));
  const [holidays, setHolidays] = useState<Holiday[]>(() => loadData(KEY_HOLIDAYS, []));

  // --- PERSISTENCE EFFECTS ---
  useEffect(() => { localStorage.setItem(KEY_SHIFTS, JSON.stringify(shifts)); }, [shifts]);
  useEffect(() => { localStorage.setItem(KEY_EMPLOYEES, JSON.stringify(employees)); }, [employees]);
  useEffect(() => { localStorage.setItem(KEY_LOGS, JSON.stringify(logs)); }, [logs]);
  useEffect(() => { localStorage.setItem(KEY_SCHEDULES, JSON.stringify(schedules)); }, [schedules]);
  useEffect(() => { localStorage.setItem(KEY_REQUESTS, JSON.stringify(requests)); }, [requests]);
  useEffect(() => { localStorage.setItem(KEY_HOLIDAYS, JSON.stringify(holidays)); }, [holidays]);

  // Derived State: Timesheet
  const timesheetData = useMemo(() => {
      return calculateTimesheet(employees, shifts, logs, schedules, requests, holidays, viewDate);
  }, [employees, shifts, logs, schedules, requests, holidays, viewDate]);

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
      setCurrentView('dashboard'); // Reset view
  };

  const handleResetData = () => {
      if(window.confirm('Bạn có chắc chắn muốn xóa toàn bộ dữ liệu và quay về mặc định? Hành động này không thể hoàn tác.')) {
          localStorage.clear();
          window.location.reload();
      }
  };

  // Handlers
  const handleAddShift = (newShift: Shift) => setShifts(prev => [...prev, newShift]);
  const handleUpdateShift = (updatedShift: Shift) => setShifts(prev => prev.map(s => s.id === updatedShift.id ? updatedShift : s));
  const handleDeleteShift = (id: string) => setShifts(prev => prev.filter(s => s.id !== id));

  const handleAddEmployee = (emp: Employee) => setEmployees(prev => [...prev, emp]);
  const handleUpdateEmployee = (emp: Employee) => setEmployees(prev => prev.map(e => e.id === emp.id ? emp : e));
  const handleDeleteEmployee = (id: string) => setEmployees(prev => prev.filter(e => e.id !== id));

  const handleAddLog = (log: AttendanceLog) => setLogs(prev => [...prev, log]);
  const handleImportLogs = (newLogs: AttendanceLog[]) => {
      setLogs(prev => [...prev, ...newLogs]);
  };
  
  const handleUpdateSchedule = (newSchedules: ShiftAssignment[]) => setSchedules(newSchedules);
  const handleUpdateRequests = (newRequests: AttendanceRequest[]) => setRequests(newRequests);
  const handleUpdateHolidays = (newHolidays: Holiday[]) => setHolidays(newHolidays);

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.value) {
          setViewDate(new Date(e.target.value + '-01'));
      }
  };

  const renderContent = () => {
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
        return <ImportWizard onImportLogs={handleImportLogs} />; 
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
  };

  const monthInputValue = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}`;

  // --- Render Login if not authenticated ---
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

      <main className="flex-1 flex flex-col overflow-hidden">
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

        <div className="flex-1 overflow-auto p-6">
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
