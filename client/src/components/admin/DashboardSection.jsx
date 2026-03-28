import StatCard from "./StatCard";

export default function DashboardSection({ users, students, loading, onGoStudents, onGoTeachers }) {
  return (
    <>
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="school" label="Total Students" value={students.length} tone="primary" />
        <StatCard icon="group" label="Total Faculty" value={users.filter((u) => u.role === "TEACHER").length} tone="secondary" />
        <StatCard icon="shield_person" label="Admins" value={users.filter((u) => u.role === "ADMIN").length} tone="tertiary" />
        <StatCard icon="analytics" label="Pending Reports" value="14" tone="error" />
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
            {students.slice(0, 5).map((s) => (
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
