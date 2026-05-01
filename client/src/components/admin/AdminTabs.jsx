const TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "students", label: "Students" },
  { id: "teachers", label: "Teachers" },
  { id: "notices", label: "Notices" },
  { id: "class-teachers", label: "Class Teachers" },
  { id: "attendance", label: "Attendance" },
  { id: "predictions", label: "Predictions" },
];

export default function AdminTabs({ tab, onChange, onRefresh }) {
  return (
    <section className="flex flex-wrap gap-2">
      {TABS.map((item) => (
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
        Refresh
      </button>
    </section>
  );
}
