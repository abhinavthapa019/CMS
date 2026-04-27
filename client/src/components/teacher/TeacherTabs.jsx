const TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "attendance", label: "Attendance" },
  { id: "marks", label: "Marks" },
  { id: "prediction", label: "Prediction" },
];

export default function TeacherTabs({ tab, onChange, onRefresh, showAttendance }) {
  const visibleTabs = TABS.filter((item) => showAttendance || item.id !== "attendance");

  return (
    <section className="flex flex-wrap gap-2">
      {visibleTabs.map((item) => (
        <button
          key={item.id}
          onClick={() => onChange(item.id)}
          className={`px-4 py-2 rounded-full text-sm font-semibold ${
            tab === item.id ? "bg-primary text-on-primary" : "bg-surface-container-high text-secondary"
          }`}
        >
          {item.label}
        </button>
      ))}
      <button
        onClick={onRefresh}
        className="px-4 py-2 rounded-full text-sm font-semibold bg-surface-container-high text-secondary"
      >
        Refresh Students
      </button>
    </section>
  );
}
