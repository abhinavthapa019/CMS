export default function AttendanceSection({
  students,
  attendanceDate,
  attendanceMap,
  onDateChange,
  onToggleStudent,
  onToggleAll,
  onSubmit,
  submitting,
}) {
  const allPresent = students.length > 0 && students.every((s) => attendanceMap[s.id] === true);

  return (
    <section className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-headline text-xl font-bold text-primary">Take Attendance</h3>
          <p className="text-sm text-secondary">Mark attendance for the whole class on one date.</p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="block space-y-1">
            <span className="text-xs uppercase font-semibold tracking-wider text-secondary">Attendance Date</span>
            <input
              required
              type="date"
              className="rounded-lg bg-surface-container-highest border-none"
              value={attendanceDate}
              onChange={(e) => onDateChange(e.target.value)}
            />
          </label>

          <label className="inline-flex items-center gap-2 text-sm text-on-surface">
            <input
              type="checkbox"
              checked={allPresent}
              onChange={(e) => onToggleAll(e.target.checked)}
            />
            Mark all present
          </label>

          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting || students.length === 0}
            className="px-4 py-2 rounded-lg bg-primary text-on-primary font-semibold disabled:opacity-60"
          >
            {submitting ? "Saving..." : "Save Attendance"}
          </button>
        </div>
      </div>

      <div className="overflow-auto border border-outline-variant/20 rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-secondary bg-surface-container-low">
              <th className="py-3 px-3 font-semibold">Student</th>
              <th className="py-3 px-3 font-semibold">Roll</th>
              <th className="py-3 px-3 font-semibold">Present</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-t border-outline-variant/10">
                <td className="py-2 px-3 font-medium">{s.firstName} {s.lastName}</td>
                <td className="py-2 px-3 text-secondary">{s.rollNumber}</td>
                <td className="py-2 px-3">
                  <input
                    type="checkbox"
                    checked={attendanceMap[s.id] ?? true}
                    onChange={(e) => onToggleStudent(s.id, e.target.checked)}
                  />
                </td>
              </tr>
            ))}
            {students.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-4 px-3 text-secondary">No students found. Ask admin to add students first.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-secondary">
        This saves one attendance record per student for the selected date. Ticked means present, unticked means absent.
      </p>
    </section>
  );
}
