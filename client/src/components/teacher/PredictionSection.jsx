export default function PredictionSection({
  students,
  predictionStudentId,
  onPredictionStudentChange,
  onPredict,
  submitting,
  result,
}) {
  return (
    <section className="grid lg:grid-cols-5 gap-4">
      <form onSubmit={onPredict} className="lg:col-span-2 bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20 space-y-4">
        <h3 className="font-headline text-xl font-bold text-primary">Predict Final Grade</h3>

        <label className="block space-y-1">
          <span className="text-xs uppercase font-semibold tracking-wider text-secondary">Student</span>
          <select
            required
            className="w-full rounded-lg bg-surface-container-highest border-none"
            value={predictionStudentId}
            onChange={(e) => onPredictionStudentChange(e.target.value)}
          >
            <option value="">Select student</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.firstName} {s.lastName} (#{s.rollNumber})</option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-lg bg-gradient-to-br from-primary to-primary-container text-on-primary font-semibold disabled:opacity-60"
        >
          {submitting ? "Predicting..." : "Predict Final Grade"}
        </button>
      </form>

      <div className="lg:col-span-3 bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20 space-y-3">
        <h3 className="font-headline text-xl font-bold text-primary">Prediction Output</h3>
        {!result ? (
          <p className="text-sm text-secondary">Run a prediction after adding attendance and marks data.</p>
        ) : (
          <>
            <p className="text-sm text-secondary">Student ID: {result.studentId}</p>
            <p className="text-4xl font-headline font-extrabold text-primary">{result.predictedGrade}</p>
            <p className="text-sm text-secondary">Predicted final grade from backend aggregation and ML service/fallback logic.</p>
          </>
        )}
      </div>
    </section>
  );
}
