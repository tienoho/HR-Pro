
import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { Users, AlertTriangle, CheckCircle, Clock, CalendarOff, PartyPopper, ChevronRight, ArrowUpRight } from 'lucide-react';
import { TimesheetRow, AttendanceStatus, Employee } from '../types';

interface DashboardProps {
    timesheetData: TimesheetRow[];
    employees: Employee[];
}

const COLORS = {
    valid: '#22c55e', // green-500
    late: '#eab308', // yellow-500
    absent: '#ef4444', // red-500
    off: '#94a3b8', // slate-400
    ot: '#3b82f6', // blue-500
    leave: '#a855f7', // purple-500
    holiday: '#ec4899', // pink-500
};

const StatCard = ({ title, value, subtext, icon: Icon, colorClass, gradient }: any) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 flex items-start justify-between group">
    <div>
      <p className="text-slate-500 text-sm font-semibold mb-2 uppercase tracking-wide">{title}</p>
      <h3 className="text-3xl font-bold text-slate-800 tracking-tight">{value}</h3>
      <p className="text-xs text-slate-400 mt-2 font-medium flex items-center gap-1">
          {subtext}
      </p>
    </div>
    <div className={`p-4 rounded-xl ${gradient} shadow-lg shadow-${colorClass}/20 group-hover:scale-110 transition-transform duration-300`}>
      <Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
    </div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ timesheetData, employees }) => {
  const today = new Date();
  const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // 1. Calculate Daily Stats (Today)
  const dailyStats = useMemo(() => {
      let late = 0;
      let absent = 0;
      let present = 0;
      let off = 0;
      let leave = 0;
      let holiday = 0;
      let missingPunch = 0;
      let lateList: {name: string, dept: string, minutes: number}[] = [];

      if (!timesheetData || !Array.isArray(timesheetData)) return { late, absent, present, off, leave, holiday, missingPunch, lateList };

      timesheetData.forEach(row => {
          if (!row || !row.records) return;
          const record = row.records[dateKey];
          if (!record) return;

          const isFullDayLeave = record.status.includes(AttendanceStatus.Leave) && !record.checkIn;
          const isHoliday = record.status.includes(AttendanceStatus.Holiday);

          if (isHoliday) {
              holiday++;
              // If they worked on holiday, we also count as present?
              if (record.checkIn) present++;
          } else if (isFullDayLeave) {
              leave++;
          } else {
              // If not full day leave and not holiday
              if (record.status.includes(AttendanceStatus.Absent)) absent++;
          }
          
          if (record.status.includes(AttendanceStatus.Late)) {
              late++;
              lateList.push({ name: row.employee?.name || 'Unknown', dept: row.employee?.department || 'Unknown', minutes: record.lateMinutes });
          }
          
          // Present includes Valid, Late, or Partial Leave (if they checked in)
          // Avoid double counting holiday workers if we already incremented above
          if (record.checkIn && !isHoliday) present++;

          if (record.status.includes(AttendanceStatus.Off) && !record.checkIn && !isHoliday) off++;
          if (record.status.includes(AttendanceStatus.MissingPunch)) missingPunch++;
      });

      return { late, absent, present, off, leave, holiday, missingPunch, lateList };
  }, [timesheetData, dateKey]);

  // 2. Prepare Chart Data (Last 7 Days)
  const barChartData = useMemo(() => {
      const data = [];
      if (!timesheetData || !Array.isArray(timesheetData)) return [];

      for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          
          let dayLate = 0;
          let dayOT = 0;
          
          timesheetData.forEach(row => {
              if (row && row.records) {
                  const rec = row.records[dKey];
                  if (rec) {
                      if (rec.status.includes(AttendanceStatus.Late)) dayLate++;
                      dayOT += rec.otHours;
                  }
              }
          });

          data.push({
              name: `${d.getDate()}/${d.getMonth()+1}`,
              late: dayLate,
              ot: parseFloat(dayOT.toFixed(1))
          });
      }
      return data;
  }, [timesheetData]);

  // 3. Pie Chart Data
  const pieData = useMemo(() => {
      let countLeave = 0;
      let countAbsent = 0;
      let countPresent = 0;
      let countOff = 0;
      let countHoliday = 0;

      if (!timesheetData || !Array.isArray(timesheetData)) return [];

      timesheetData.forEach(row => {
          if (!row || !row.records) return;
          const record = row.records[dateKey];
          if(!record) return;

          const hasCheckIn = !!record.checkIn;
          const isHoliday = record.status.includes(AttendanceStatus.Holiday);
          
          if (isHoliday) {
              countHoliday++;
          } else if (record.status.includes(AttendanceStatus.Leave) && !hasCheckIn) {
              countLeave++;
          } else if (record.status.includes(AttendanceStatus.Absent)) {
              countAbsent++;
          } else if (hasCheckIn) {
              countPresent++;
          } else if (record.status.includes(AttendanceStatus.Off)) {
              countOff++;
          }
      });

      return [
          { name: 'Hiện diện', value: countPresent, color: COLORS.valid },
          { name: 'Nghỉ lễ', value: countHoliday, color: COLORS.holiday },
          { name: 'Nghỉ phép', value: countLeave, color: COLORS.leave },
          { name: 'Vắng mặt', value: countAbsent, color: COLORS.absent },
          { name: 'Nghỉ chế độ', value: countOff, color: COLORS.off },
      ].filter(d => d.value > 0);
  }, [timesheetData, dateKey]);

  const activeEmployees = Array.isArray(employees) ? employees.filter(e => e.status === 'ACTIVE').length : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">Tổng quan hôm nay</h2>
            <p className="text-slate-500 text-sm mt-1">{new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex gap-2">
            <button className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 shadow-sm flex items-center gap-2">
                <CalendarOff size={16}/> Lịch nghỉ
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm shadow-blue-500/30 flex items-center gap-2">
                <ArrowUpRight size={16}/> Báo cáo nhanh
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard 
          title="Hiện diện" 
          value={dailyStats.present} 
          subtext={`${activeEmployees > 0 ? Math.round((dailyStats.present / activeEmployees) * 100) : 0}% Nhân sự`}
          icon={CheckCircle} 
          colorClass="green-500"
          gradient="bg-gradient-to-br from-green-400 to-green-600"
        />
        <StatCard 
          title="Đi muộn"
          value={dailyStats.late} 
          subtext={dailyStats.late > 0 ? "Cần nhắc nhở ngay" : "Không có ai đi muộn"}
          icon={Clock} 
          colorClass="yellow-500"
          gradient="bg-gradient-to-br from-yellow-400 to-yellow-600"
        />
        <StatCard 
          title="Nghỉ phép" 
          value={dailyStats.leave} 
          subtext="Đã được duyệt"
          icon={CalendarOff} 
          colorClass="purple-500"
          gradient="bg-gradient-to-br from-purple-400 to-purple-600"
        />
        {/* Dynamic Card based on Holiday status */}
        {dailyStats.holiday > 0 ? (
             <StatCard 
                title="Nghỉ Lễ" 
                value={dailyStats.holiday} 
                subtext="Ngày lễ trong năm" 
                icon={PartyPopper} 
                colorClass="pink-500"
                gradient="bg-gradient-to-br from-pink-400 to-pink-600"
            />
        ) : (
            <StatCard 
                title="Vắng mặt" 
                value={dailyStats.absent} 
                subtext={`Chưa rõ lý do`}
                icon={AlertTriangle} 
                colorClass="red-500"
                gradient="bg-gradient-to-br from-red-400 to-red-600"
            />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-1 flex flex-col hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-slate-800">Tỷ lệ chấm công</h3>
              <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded">Hôm nay</span>
          </div>
          <div className="h-72 flex-1">
            {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                    cornerRadius={4}
                    >
                    {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                        itemStyle={{fontSize: '12px', fontWeight: 600}}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '12px'}}/>
                </PieChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <Clock size={48} className="mb-2 opacity-50"/>
                    <p>Chưa có dữ liệu chấm công</p>
                </div>
            )}
          </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-6">
             <h3 className="text-lg font-bold text-slate-800">Xu hướng Đi muộn & OT</h3>
             <select className="text-xs border-slate-200 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500">
                 <option>7 ngày qua</option>
                 <option>30 ngày qua</option>
             </select>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barChartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                barGap={8}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} dy={10} />
                <YAxis yAxisId="left" orientation="left" stroke="transparent" tick={{fontSize: 12, fill: '#64748b'}} label={{ value: 'Số người', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#94a3b8' }}/>
                <YAxis yAxisId="right" orientation="right" stroke="transparent" tick={{fontSize: 12, fill: '#64748b'}} label={{ value: 'Giờ', angle: 90, position: 'insideRight', fontSize: 10, fill: '#94a3b8' }}/>
                <Tooltip
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}}/>
                <Bar yAxisId="left" dataKey="late" name="Số ca muộn" fill={COLORS.late} radius={[4, 4, 4, 4]} barSize={20} />
                <Bar yAxisId="right" dataKey="ot" name="Giờ OT" fill={COLORS.ot} radius={[4, 4, 4, 4]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Quick Actions / Recent Issues */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 text-yellow-600 rounded-lg">
                    <AlertTriangle size={20} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Cần chú ý hôm nay</h3>
                    <p className="text-xs text-slate-500">Danh sách nhân viên đi muộn hoặc vắng mặt</p>
                </div>
            </div>
            {dailyStats.lateList.length > 5 && (
                <button className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
                    Xem tất cả <ChevronRight size={16}/>
                </button>
            )}
        </div>
        <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto custom-scrollbar">
            {dailyStats.lateList.length > 0 ? dailyStats.lateList.map((item, i) => (
                <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm border border-slate-200">
                            {item.name.substring(0,2).toUpperCase()}
                        </div>
                        <div>
                            <p className="font-semibold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">{item.name}</p>
                            <p className="text-xs text-slate-500">{item.dept}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="text-right">
                             <span className="block text-sm font-bold text-red-600">+{item.minutes} phút</span>
                             <span className="text-[10px] text-slate-400">Thời gian trễ</span>
                        </div>
                        <button className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-md hover:bg-white bg-slate-50 text-slate-600 hover:text-blue-600 transition-all shadow-sm">
                            Gửi nhắc nhở
                        </button>
                    </div>
                </div>
            )) : (
                <div className="p-10 text-center text-slate-500 flex flex-col items-center">
                    <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle className="text-green-500" size={32} />
                    </div>
                    <p className="font-medium text-slate-800">Không có vi phạm!</p>
                    <p className="text-sm text-slate-400 mt-1">Hôm nay mọi người đều tuân thủ giờ giấc.</p>
                </div>
            )}
        </div>
    </div>
    </div>
  );
};

export default Dashboard;
