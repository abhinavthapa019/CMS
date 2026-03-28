import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function TeacherStat({ label, value, icon, tone = "primary" }) {
  const toneMap = {
    primary: "bg-primary-fixed text-primary",
    secondary: "bg-secondary-container text-on-secondary-container",
    tertiary: "bg-tertiary-fixed text-on-tertiary-fixed-variant",
  };

  return (
    <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm border border-outline-variant/10 space-y-3">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${toneMap[tone] || toneMap.primary}`}>
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div>
        <p className="font-label uppercase tracking-widest text-[10px] font-semibold text-secondary">{label}</p>
        <p className="text-2xl font-bold font-headline text-on-surface">{value}</p>
      </div>
    </div>
  );
}

const PIE_COLORS = ["#15803d", "#b91c1c"];

export default function TeacherDashboardSection({ students, actions, analytics }) {
  const kpis = analytics?.kpis || {
    trackedStudents: students.length,
    attendancePercent: 0,
    dailyPresentCount: 0,
  };

  const studentPercentages = analytics?.studentPercentages || [];
  const trend = analytics?.trend || [];
  const distribution = analytics?.distribution || [];
  const lowAttendance = analytics?.lowAttendance || [];

  return (
    <>
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <TeacherStat label="Tracked Students" value={kpis.trackedStudents} icon="school" tone="primary" />
        <TeacherStat label="Attendance %" value={`${kpis.attendancePercent}%`} icon="query_stats" tone="secondary" />
        <TeacherStat label="Present Today" value={kpis.dailyPresentCount} icon="today" tone="tertiary" />
        <TeacherStat label="Attendance Entries" value={actions.attendanceCount} icon="fact_check" tone="secondary" />
        <TeacherStat label="Predictions Run" value={actions.predictionCount} icon="insights" tone="primary" />
        <TeacherStat label="Low Attendance Alerts" value={lowAttendance.length} icon="warning" tone="tertiary" />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/10">
          <h3 className="font-headline font-bold text-lg text-on-surface mb-4">Attendance Trend</h3>
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="present" stroke="#2563eb" strokeWidth={2} />
                <Line type="monotone" dataKey="absent" stroke="#dc2626" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/10">
          <h3 className="font-headline font-bold text-lg text-on-surface mb-4">Present vs Absent</h3>
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={distribution} dataKey="value" nameKey="name" outerRadius={90} label>
                  {distribution.map((entry, index) => (
                    <Cell key={`${entry.name}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/10">
        <h3 className="font-headline font-bold text-lg text-on-surface mb-4">Student Attendance %</h3>
        <div className="w-full h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={studentPercentages.slice(0, 20).map((row) => ({
                name: row.name,
                attendancePercent: row.attendancePercent,
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" hide />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="attendancePercent" name="Attendance %" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/10 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-headline font-bold text-lg text-on-surface">Low Attendance Alert (&lt; 75%)</h3>
        </div>
        {lowAttendance.length === 0 ? (
          <p className="text-sm text-secondary">No students currently below 75% attendance.</p>
        ) : (
          <div className="space-y-3">
            {lowAttendance.slice(0, 10).map((student) => (
              <div key={student.studentId} className="border-b border-outline-variant/20 pb-2 flex items-center justify-between">
                <p className="font-medium text-on-surface">{student.name}</p>
                <p className="text-xs text-error font-semibold">{student.attendancePercent}%</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/10 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-headline font-bold text-lg text-on-surface">Recent Classroom Actions</h3>
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Session</span>
        </div>
        {actions.recent.length === 0 ? (
          <p className="text-sm text-secondary">No teacher actions yet. Start with attendance or marks.</p>
        ) : (
          <div className="space-y-3">
            {actions.recent.map((item, idx) => (
              <div key={`${item.kind}-${idx}`} className="border-b border-outline-variant/20 pb-2">
                <p className="font-medium text-on-surface">{item.title}</p>
                <p className="text-xs text-secondary">{item.meta}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
