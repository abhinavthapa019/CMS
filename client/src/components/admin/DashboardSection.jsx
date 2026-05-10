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

const CHART_COLORS = {
  present: "var(--color-primary)",
  absent: "var(--color-error)",
  neutral: "var(--color-outline-variant)",
  surface: "var(--color-surface-container-lowest)",
  surfaceBorder: "var(--color-outline-variant)",
  text: "var(--color-on-surface)",
  textSecondary: "var(--color-secondary)",
};

const PIE_COLORS = [CHART_COLORS.present, CHART_COLORS.absent];

function formatShortDateTick(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function piePercentLabel({ percent }) {
  return `${Math.round((percent || 0) * 100)}%`;
}

function prettyClass(item) {
  const batch = item.batch === "ELEVEN" ? "11" : item.batch === "TWELVE" ? "12" : item.batch;
  const faculty = item.faculty === "SCIENCE" ? "SCI" : item.faculty === "MANAGEMENT" ? "MGT" : item.faculty;
  return `${batch}-${faculty}-${item.section}`;
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
              <LineChart data={trend} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={CHART_COLORS.neutral} strokeDasharray="3 3" opacity={0.35} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatShortDateTick}
                  minTickGap={24}
                  tick={{ fill: CHART_COLORS.textSecondary, fontSize: 12 }}
                  axisLine={{ stroke: CHART_COLORS.surfaceBorder, opacity: 0.6 }}
                  tickLine={{ stroke: CHART_COLORS.surfaceBorder, opacity: 0.6 }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: CHART_COLORS.textSecondary, fontSize: 12 }}
                  axisLine={{ stroke: CHART_COLORS.surfaceBorder, opacity: 0.6 }}
                  tickLine={{ stroke: CHART_COLORS.surfaceBorder, opacity: 0.6 }}
                />
                <Tooltip
                  formatter={(value, name) => [value, name === "present" ? "Present" : "Absent"]}
                  contentStyle={{ backgroundColor: CHART_COLORS.surface, borderColor: CHART_COLORS.surfaceBorder, color: CHART_COLORS.text, borderRadius: 12 }}
                  itemStyle={{ color: CHART_COLORS.text }}
                  labelStyle={{ color: CHART_COLORS.textSecondary }}
                />
                <Legend wrapperStyle={{ color: CHART_COLORS.textSecondary, fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="present"
                  name="Present"
                  stroke={CHART_COLORS.present}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="absent"
                  name="Absent"
                  stroke={CHART_COLORS.absent}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/10">
          <h3 className="font-headline font-bold text-lg text-on-surface mb-4">Present vs Absent ({periodLabel})</h3>
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distribution}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={90}
                  label={piePercentLabel}
                  labelLine={false}
                >
                  {distribution.map((entry, index) => (
                    <Cell key={`${entry.name}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: CHART_COLORS.surface, borderColor: CHART_COLORS.surfaceBorder, color: CHART_COLORS.text, borderRadius: 12 }}
                  itemStyle={{ color: CHART_COLORS.text }}
                  labelStyle={{ color: CHART_COLORS.textSecondary }}
                />
                <Legend wrapperStyle={{ color: CHART_COLORS.textSecondary, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/10">
        <h3 className="font-headline font-bold text-lg text-on-surface mb-4">Class-wise Daily Attendance ({periodLabel})</h3>
        <div className="w-full h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={classDaily.map((item) => ({ ...item, classLabel: prettyClass(item) }))}
              margin={{ top: 10, right: 12, left: 0, bottom: 26 }}
              barGap={6}
              barCategoryGap={18}
            >
              <CartesianGrid stroke={CHART_COLORS.neutral} strokeDasharray="3 3" opacity={0.35} />
              <XAxis
                dataKey="classLabel"
                interval={0}
                angle={-25}
                height={44}
                textAnchor="end"
                tick={{ fill: CHART_COLORS.textSecondary, fontSize: 12 }}
                axisLine={{ stroke: CHART_COLORS.surfaceBorder, opacity: 0.6 }}
                tickLine={{ stroke: CHART_COLORS.surfaceBorder, opacity: 0.6 }}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: CHART_COLORS.textSecondary, fontSize: 12 }}
                axisLine={{ stroke: CHART_COLORS.surfaceBorder, opacity: 0.6 }}
                tickLine={{ stroke: CHART_COLORS.surfaceBorder, opacity: 0.6 }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: CHART_COLORS.surface, borderColor: CHART_COLORS.surfaceBorder, color: CHART_COLORS.text, borderRadius: 12 }}
                itemStyle={{ color: CHART_COLORS.text }}
                labelStyle={{ color: CHART_COLORS.textSecondary }}
              />
              <Legend wrapperStyle={{ color: CHART_COLORS.textSecondary, fontSize: 12 }} />
              <Bar dataKey="presentToday" fill={CHART_COLORS.present} name="Present" radius={[6, 6, 0, 0]} />
              <Bar dataKey="totalStudents" fill={CHART_COLORS.neutral} name="Total" radius={[6, 6, 0, 0]} />
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
