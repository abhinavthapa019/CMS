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

function formatShortDateTick(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function piePercentLabel({ percent }) {
  return `${Math.round((percent || 0) * 100)}%`;
}

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

const PIE_COLORS = [CHART_COLORS.present, CHART_COLORS.absent];

export default function TeacherDashboardSection({ students, actions, analytics }) {
  const periodLabel = analytics?.periodLabel || "Current Month";

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
        <TeacherStat label={`Attendance % (${periodLabel})`} value={`${kpis.attendancePercent}%`} icon="query_stats" tone="secondary" />
        <TeacherStat label={`Present (Latest Day in ${periodLabel})`} value={kpis.dailyPresentCount} icon="today" tone="tertiary" />
        <TeacherStat label="Attendance Entries" value={actions.attendanceCount} icon="fact_check" tone="secondary" />
        <TeacherStat label="Predictions Run" value={actions.predictionCount} icon="insights" tone="primary" />
        <TeacherStat label="Low Attendance Alerts" value={lowAttendance.length} icon="warning" tone="tertiary" />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/10">
          <h3 className="font-headline font-bold text-lg text-on-surface mb-4">Attendance Trend ({periodLabel})</h3>
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
        <h3 className="font-headline font-bold text-lg text-on-surface mb-4">Student Attendance % ({periodLabel})</h3>
        <div className="w-full h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={studentPercentages.slice(0, 20).map((row) => ({
                name: row.name,
                attendancePercent: row.attendancePercent,
              }))}
              margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
            >
              <CartesianGrid stroke={CHART_COLORS.neutral} strokeDasharray="3 3" opacity={0.35} />
              <XAxis dataKey="name" hide />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fill: CHART_COLORS.textSecondary, fontSize: 12 }}
                axisLine={{ stroke: CHART_COLORS.surfaceBorder, opacity: 0.6 }}
                tickLine={{ stroke: CHART_COLORS.surfaceBorder, opacity: 0.6 }}
              />
              <Tooltip
                formatter={(value) => [`${value}%`, "Attendance"]}
                labelFormatter={(label) => `Student: ${label}`}
                contentStyle={{ backgroundColor: CHART_COLORS.surface, borderColor: CHART_COLORS.surfaceBorder, color: CHART_COLORS.text, borderRadius: 12 }}
                itemStyle={{ color: CHART_COLORS.text }}
                labelStyle={{ color: CHART_COLORS.textSecondary }}
              />
              <Legend wrapperStyle={{ color: CHART_COLORS.textSecondary, fontSize: 12 }} />
              <Bar dataKey="attendancePercent" name="Attendance %" fill={CHART_COLORS.present} radius={[6, 6, 0, 0]} />
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
