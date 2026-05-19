export default function MarksSection({
  students,
  latestMarks,
  marksForm,
  onMarksChange,
  onSubmit,
  submitting,
}) {
  return (
    <section className="grid lg:grid-cols-5 gap-4">
      <form onSubmit={onSubmit} className="lg:col-span-2 bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20 space-y-4">
        <h3 className="font-headline text-xl font-bold text-primary">Enter Marks</h3>

        <label className="block space-y-1">
          <span className="text-xs uppercase font-semibold tracking-wider text-secondary">Student</span>
          <select
            required
            className="w-full rounded-lg bg-surface-container-highest border-none"
            value={marksForm.studentId}
            onChange={(e) => onMarksChange("studentId", e.target.value)}
          >
            <option value="">Select student</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.firstName} {s.lastName} (#{s.rollNumber})</option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-xs uppercase font-semibold tracking-wider text-secondary">Mid term (out of 100)</span>
          <input
            required
            min={0}
            max={100}
            type="number"
            className="w-full rounded-lg bg-surface-container-highest border-none"
            value={marksForm.g1}
            onChange={(e) => onMarksChange("g1", e.target.value)}
          />
          <p className="text-xs text-secondary">Stored as /20 internally for prediction.</p>
        </label>

        <label className="block space-y-1">
          <span className="text-xs uppercase font-semibold tracking-wider text-secondary">Pre board (out of 100)</span>
          <input
            required
            min={0}
            max={100}
            type="number"
            className="w-full rounded-lg bg-surface-container-highest border-none"
            value={marksForm.g2}
            onChange={(e) => onMarksChange("g2", e.target.value)}
          />
          <p className="text-xs text-secondary">Stored as /20 internally for prediction.</p>
        </label>

        {/* <label className="block space-y-1">
          <span className="text-xs uppercase font-semibold tracking-wider text-secondary">Final Grade (optional)</span>
          <input
            min={0}
            max={20}
            type="number"
            className="w-full rounded-lg bg-surface-container-highest border-none"
            value={marksForm.finalGrade}
            onChange={(e) => onMarksChange("finalGrade", e.target.value)}
          />
        </label> */}

        <label className="inline-flex items-center gap-2 text-sm text-on-surface">
          <input
            type="checkbox"
            checked={marksForm.activities}
            onChange={(e) => onMarksChange("activities", e.target.checked)}
          />
          Extracurricular activities
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-lg bg-primary text-on-primary font-semibold disabled:opacity-60"
        >
          {submitting ? "Saving..." : "Save Marks"}
        </button>
      </form>

      <div className="lg:col-span-3 bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20 space-y-3">
        <h3 className="font-headline text-xl font-bold text-primary">Class Marks</h3>
        {!latestMarks || latestMarks.length === 0 ? (
          <p className="text-sm text-secondary">No marks recorded yet for this class.</p>
        ) : (
          <div className="border border-outline-variant/20 rounded-xl overflow-auto max-h-96">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-secondary bg-surface-container-low">
                  <th className="py-2 px-3 font-semibold">Student</th>
                  <th className="py-2 px-3 font-semibold">Roll</th>
                  <th className="py-2 px-3 font-semibold">Mid Term</th>
                  <th className="py-2 px-3 font-semibold">Pre Board</th>
                  <th className="py-2 px-3 font-semibold">Activities</th>
                </tr>
              </thead>
              <tbody>
                {[...latestMarks]
                  .sort((a, b) => Number(a.student.rollNumber || 0) - Number(b.student.rollNumber || 0))
                  .map(({ student, mark }) => (
                    <tr key={student.id} className="border-t border-outline-variant/10">
                      <td className="py-2 px-3 font-medium">{student.firstName} {student.lastName}</td>
                      <td className="py-2 px-3 text-secondary">#{student.rollNumber}</td>
                      <td className="py-2 px-3 text-secondary">{mark?.g1 != null ? mark.g1 * 5 : "-"}</td>
                      <td className="py-2 px-3 text-secondary">{mark?.g2 != null ? mark.g2 * 5 : "-"}</td>
                      <td className="py-2 px-3 text-secondary">{mark?.activities ? "Yes" : "No"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
