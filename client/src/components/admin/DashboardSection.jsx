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

function groupAtRiskStudents(rows) {
  const groups = {
    SCIENCE: { ELEVEN: [], TWELVE: [] },
    MANAGEMENT: { ELEVEN: [], TWELVE: [] },
  };

  for (const row of rows) {
    if (groups[row.faculty]?.[row.batch]) {
      groups[row.faculty][row.batch].push(row);
    }
  }

  for (const faculty of Object.keys(groups)) {
    for (const batch of Object.keys(groups[faculty])) {
      groups[faculty][batch].sort((a, b) => (a.attendancePercent ?? 0) - (b.attendancePercent ?? 0));
    }
  }

  return groups;
}

const MONTH_OPTIONS = [
  { value: 1, label: "Jan" },
  { value: 2, label: "Feb" },
  { value: 3, label: "Mar" },
  { value: 4, label: "Apr" },
  { value: 5, label: "May" },
  { value: 6, label: "Jun" },
  { value: 7, label: "Jul" },
  { value: 8, label: "Aug" },
  { value: 9, label: "Sep" },
  { value: 10, label: "Oct" },
  { value: 11, label: "Nov" },
  { value: 12, label: "Dec" },
];

export default function DashboardSection({
  users,
  students,
  analytics,
  loading,
  month,
  year,
  onPeriodChange,
  onGoStudents,
  onGoTeachers,
}) {
  const periodLabel = analytics?.periodLabel || "Current Month";
  const atRiskGroups = groupAtRiskStudents(analytics?.lowAttendance || []);
  const atRiskCount = Object.values(atRiskGroups).reduce(
    (total, batchGroup) => total + Object.values(batchGroup).reduce((acc, list) => acc + list.length, 0),
    0
  );

  const kpis = analytics?.kpis || {
    totalStudents: students.length,
    attendancePercent: 0,
    dailyPresentCount: 0,
  };

  const classDaily = analytics?.classWiseDaily || [];
  const trend = analytics?.trend || [];
  const distribution = analytics?.distribution || [];
  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1].filter(
    (value, index, self) => self.indexOf(value) === index
  );

  return (
    <>
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Attendance Overview</h2>
          <p className="text-xs text-secondary">Use the month selector to navigate chart data.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={(event) => onPeriodChange(Number(event.target.value), year)}
            className="rounded-lg bg-surface-container-highest border-none text-sm"
          >
            {MONTH_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(event) => onPeriodChange(month, Number(event.target.value))}
            className="rounded-lg bg-surface-container-highest border-none text-sm"
          >
            {yearOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
      </section>

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
          <h3 className="font-headline font-bold text-lg text-on-surface">At-Risk Students</h3>
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Low Attendance</span>
        </div>
        {loading ? (
          <p className="text-secondary text-sm">Loading...</p>
        ) : atRiskCount === 0 ? (
          <p className="text-secondary text-sm">No at-risk students for the selected month.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { key: "SCIENCE", label: "Science" },
              { key: "MANAGEMENT", label: "Management" },
            ].map((faculty) => (
              <div key={faculty.key} className="space-y-3">
                <div className="text-sm font-semibold text-secondary uppercase tracking-wider">{faculty.label}</div>
                {[
                  { key: "ELEVEN", label: "Class 11" },
                  { key: "TWELVE", label: "Class 12" },
                ].map((batch) => (
                  <div key={`${faculty.key}-${batch.key}`} className="rounded-xl border border-outline-variant/20 p-3 space-y-2">
                    <div className="text-xs font-semibold text-secondary uppercase tracking-wider">{batch.label}</div>
                    {atRiskGroups[faculty.key][batch.key].length === 0 ? (
                      <p className="text-xs text-secondary">No students flagged.</p>
                    ) : (
                      atRiskGroups[faculty.key][batch.key].map((student) => (
                        <div key={student.studentId} className="flex items-center justify-between border-b border-outline-variant/15 pb-2">
                          <div>
                            <p className="font-medium text-on-surface">{student.name}</p>
                            <p className="text-xs text-secondary">#{student.rollNumber} • {student.section}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-error">{student.attendancePercent}%</p>
                            <p className="text-xs text-secondary">attendance</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
