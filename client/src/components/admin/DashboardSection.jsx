import StatCard from "./StatCard";
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

const PIE_COLORS = ["#15803d", "#b91c1c"];

function piePercentLabel({ percent }) {
  return `${Math.round((percent || 0) * 100)}%`;
}

function prettyClass(item) {
  const batch = item.batch === "ELEVEN" ? "11" : item.batch === "TWELVE" ? "12" : item.batch;
  return `${batch}-${item.faculty}-${item.section}`;
}

export default function DashboardSection({ users, students, analytics, loading, onGoStudents, onGoTeachers }) {
  const periodLabel = analytics?.periodLabel || "Current Month";
  const recentStudents = [...students]
    .sort((a, b) => {
      const aTime = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (bTime !== aTime) return bTime - aTime;
      return (b?.id || 0) - (a?.id || 0);
    })
    .slice(0, 5);

  const kpis = analytics?.kpis || {
    totalStudents: students.length,
    attendancePercent: 0,
    dailyPresentCount: 0,
  };

  const classDaily = analytics?.classWiseDaily || [];
  const trend = analytics?.trend || [];
  const distribution = analytics?.distribution || [];

  return (
    <>
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="school" label="Total Students" value={kpis.totalStudents} tone="primary" />
        <StatCard icon="fact_check" label={`Attendance % (${periodLabel})`} value={`${kpis.attendancePercent}%`} tone="secondary" />
        <StatCard icon="today" label={`Present (Latest Day in ${periodLabel})`} value={kpis.dailyPresentCount} tone="tertiary" />
        <StatCard icon="group" label="Total Faculty" value={users.filter((u) => u.role === "TEACHER").length} tone="secondary" />
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <button
          onClick={onGoStudents}
          className="w-full bg-gradient-to-br from-primary to-primary-container text-on-primary py-4 px-6 rounded-xl font-semibold flex items-center justify-between shadow-lg shadow-primary/20"
        >
          <span className="flex items-center gap-3">
            <span className="material-symbols-outlined">person_add</span>
            Add New Student
          </span>
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
        <button
          onClick={onGoTeachers}
          className="w-full bg-surface-container-lowest text-primary border border-primary/10 py-4 px-6 rounded-xl font-semibold flex items-center justify-between"
        >
          <span className="flex items-center gap-3">
            <span className="material-symbols-outlined">person_search</span>
            Register Teacher
          </span>
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/10">
          <h3 className="font-headline font-bold text-lg text-on-surface mb-4">Global Daily Attendance Trend ({periodLabel})</h3>
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
          <h3 className="font-headline font-bold text-lg text-on-surface mb-4">Present vs Absent ({periodLabel})</h3>
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={distribution} dataKey="value" nameKey="name" outerRadius={90} label={piePercentLabel}>
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
        <h3 className="font-headline font-bold text-lg text-on-surface mb-4">Class-wise Daily Attendance ({periodLabel})</h3>
        <div className="w-full h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={classDaily.map((item) => ({ ...item, classLabel: prettyClass(item) }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="classLabel" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="presentToday" fill="#2563eb" name="Present Today" />
              <Bar dataKey="totalStudents" fill="#94a3b8" name="Total Students" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/10 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-headline font-bold text-lg text-on-surface">Recent Students</h3>
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Latest 5</span>
        </div>
        {loading ? (
          <p className="text-secondary text-sm">Loading...</p>
        ) : students.length === 0 ? (
          <p className="text-secondary text-sm">No students yet. Add your first student.</p>
        ) : (
          <div className="space-y-3">
            {recentStudents.map((s) => (
              <div key={s.id} className="flex items-center justify-between border-b border-outline-variant/20 pb-2">
                <p className="font-medium text-on-surface">{s.firstName} {s.lastName}</p>
                <p className="text-sm text-secondary">#{s.rollNumber}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
