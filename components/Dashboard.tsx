
import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { Users, AlertTriangle, CheckCircle, Clock, CalendarOff, PartyPopper } from 'lucide-react';
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

const StatCard = ({ title, value, subtext, icon: Icon, color }: any) => (
  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
    <div>
      <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
      <p className="text-xs text-slate-400 mt-1">{subtext}</p>
    </div>
    <div className={`p-3 rounded-lg ${color}`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ timesheetData, employees }) => {
  const today = new Date();
  const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const [sentReminders, setSentReminders] = useState<Set<string>>(new Set());

  const handleRemind = (id: string) => {
    setSentReminders((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  // 1. Calculate Daily Stats (Today)
  const dailyStats = useMemo(() => {
      let late = 0;
      let absent = 0;
      let present = 0;
      let off = 0;
      let leave = 0;
      let holiday = 0;
      let missingPunch = 0;
      let lateList: {id: string, name: string, dept: string, minutes: number}[] = [];

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
              lateList.push({
                id: row.employee?.id || 'unknown',
                name: row.employee?.name || 'Unknown',
                dept: row.employee?.department || 'Unknown',
                minutes: record.lateMinutes
              });
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
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Hiện diện" 
          value={dailyStats.present} 
          subtext={`${activeEmployees > 0 ? Math.round((dailyStats.present / activeEmployees) * 100) : 0}% Quân số`} 
          icon={CheckCircle} 
          color="bg-green-600" 
        />
        <StatCard 
          title="Đi muộn hôm nay" 
          value={dailyStats.late} 
          subtext={dailyStats.late > 0 ? "Cần nhắc nhở" : "Rất tốt!"} 
          icon={Clock} 
          color="bg-yellow-500" 
        />
        <StatCard 
          title="Nghỉ phép" 
          value={dailyStats.leave} 
          subtext="Đã duyệt" 
          icon={CalendarOff} 
          color="bg-purple-500" 
        />
        {/* Dynamic Card based on Holiday status */}
        {dailyStats.holiday > 0 ? (
             <StatCard 
                title="Nghỉ Lễ" 
                value={dailyStats.holiday} 
                subtext="Ngày lễ trong năm" 
                icon={PartyPopper} 
                color="bg-pink-500" 
            />
        ) : (
            <StatCard 
                title="Vắng mặt" 
                value={dailyStats.absent} 
                subtext={`Cần kiểm tra`} 
                icon={AlertTriangle} 
                color="bg-red-500" 
            />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie Chart */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-1 flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-2">Tỷ lệ hôm nay ({dateKey})</h3>
          <div className="h-64 flex-1">
            {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    >
                    {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <Clock size={48} className="mb-2 opacity-50"/>
                    <p>Chưa có dữ liệu chấm công hôm nay</p>
                </div>
            )}
          </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Xu hướng 7 ngày qua</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barChartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 12}} />
                <YAxis yAxisId="left" orientation="left" stroke={COLORS.late} label={{ value: 'Số người muộn', angle: -90, position: 'insideLeft', fontSize: 10 }}/>
                <YAxis yAxisId="right" orientation="right" stroke={COLORS.ot} label={{ value: 'Giờ OT', angle: 90, position: 'insideRight', fontSize: 10 }}/>
                <Tooltip cursor={{fill: '#f8fafc'}} />
                <Legend />
                <Bar yAxisId="left" dataKey="late" name="Số ca muộn" fill={COLORS.late} radius={[4, 4, 0, 0]} barSize={30} />
                <Bar yAxisId="right" dataKey="ot" name="Giờ OT" fill={COLORS.ot} radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Quick Actions / Recent Issues */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-yellow-600"/>
                <h3 className="text-lg font-bold text-slate-800">Danh sách Đi muộn hôm nay</h3>
            </div>
            <span className="text-sm font-medium bg-red-100 text-red-700 px-2 py-1 rounded-full">{dailyStats.lateList.length} trường hợp</span>
        </div>
        <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
            {dailyStats.lateList.length > 0 ? dailyStats.lateList.map((item, i) => (
                <div key={i} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs">
                            {item.name.substring(0,2).toUpperCase()}
                        </div>
                        <div>
                            <p className="font-medium text-slate-800 text-sm">{item.name}</p>
                            <p className="text-xs text-slate-500">{item.dept}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-bold text-red-600">Trễ {item.minutes} phút</span>
                        <button
                            onClick={() => handleRemind(item.id)}
                            disabled={sentReminders.has(item.id)}
                            aria-label={sentReminders.has(item.id) ? `Đã gửi nhắc nhở cho ${item.name}` : `Gửi nhắc nhở cho ${item.name}`}
                            className={`px-3 py-1 text-xs border rounded transition-colors flex items-center gap-1 ${
                                sentReminders.has(item.id)
                                ? "bg-green-50 text-green-600 border-green-200 cursor-default"
                                : "border-slate-300 hover:bg-white bg-slate-50 text-slate-700"
                            }`}
                        >
                            {sentReminders.has(item.id) ? (
                                <>
                                    <CheckCircle size={12} /> Đã gửi
                                </>
                            ) : "Gửi nhắc nhở"}
                        </button>
                    </div>
                </div>
            )) : (
                <div className="p-8 text-center text-slate-500">
                    <CheckCircle className="mx-auto mb-2 text-green-500" size={32} />
                    <p>Tuyệt vời! Hôm nay không có ai đi muộn.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
