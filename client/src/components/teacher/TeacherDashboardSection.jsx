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

export default function TeacherDashboardSection({ students, actions }) {
  return (
    <>
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <TeacherStat label="Tracked Students" value={students.length} icon="school" tone="primary" />
        <TeacherStat label="Attendance Entries" value={actions.attendanceCount} icon="fact_check" tone="secondary" />
        <TeacherStat label="Predictions Run" value={actions.predictionCount} icon="insights" tone="tertiary" />
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
