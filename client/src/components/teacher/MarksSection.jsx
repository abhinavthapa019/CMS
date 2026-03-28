export default function MarksSection({
  students,
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
          <p className="text-xs text-secondary">Converted to /20: {marksForm.g1 === "" ? "-" : Math.round(Number(marksForm.g1) / 5)}</p>
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
          <p className="text-xs text-secondary">Converted to /20: {marksForm.g2 === "" ? "-" : Math.round(Number(marksForm.g2) / 5)}</p>
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

      <div className="lg:col-span-3 bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20 space-y-2">
        <h3 className="font-headline text-xl font-bold text-primary">Marks Help</h3>
        
      </div>
    </section>
  );
}
