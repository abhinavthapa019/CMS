import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function PredictionSection({
  students,
  subjects,
  predictionStudentId,
  onPredictionStudentChange,
  predictionSubjectId,
  onPredictionSubjectChange,
  onPredict,
  onPredictClass,
  submitting,
  submittingBatch,
  result,
  batchResult,
  classFilters,
}) {
  const batchLabel =
    classFilters?.batch === "ELEVEN" ? "11" : classFilters?.batch === "TWELVE" ? "12" : classFilters?.batch;

  const distribution = useMemo(() => {
    const grades = ["A", "B", "C", "D", "F"];
    const counts = Object.fromEntries(grades.map((g) => [g, 0]));
    const items = batchResult?.successful || [];
    for (const item of items) {
      const g = String(item.predictedGrade || "").toUpperCase();
      if (counts[g] !== undefined) counts[g] += 1;
    }
    return grades.map((g) => ({ grade: g, count: counts[g] }));
  }, [batchResult]);


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

        <label className="block space-y-1">
          <span className="text-xs uppercase font-semibold tracking-wider text-secondary">Subject</span>
          <select
            required
            className="w-full rounded-lg bg-surface-container-highest border-none"
            value={predictionSubjectId}
            onChange={(e) => onPredictionSubjectChange(e.target.value)}
          >
            <option value="">Select subject</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
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

        <button
          type="button"
          onClick={onPredictClass}
          disabled={submittingBatch || students.length === 0}
          className="w-full py-3 rounded-lg bg-surface-container-high text-primary font-semibold disabled:opacity-60"
        >
          {submittingBatch ? "Predicting Class..." : "Predict Whole Class"}
        </button>

        <p className="text-xs text-secondary">
          Runs prediction for all students currently loaded for {batchLabel} / {classFilters?.faculty} / {classFilters?.section}.
        </p>
      </form>

      <div className="lg:col-span-3 bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20 space-y-3">
        <h3 className="font-headline text-xl font-bold text-primary">Prediction Output</h3>
        {!result ? (
          <p className="text-sm text-secondary">Run a prediction after adding attendance and marks data.</p>
        ) : (
          <>
            <p className="text-sm text-secondary">Student ID: {result.studentId}</p>
            <p className="text-4xl font-headline font-extrabold text-primary">
              {typeof result.predictedScore === "number" ? `${result.predictedScore.toFixed(2)}%` : "-"}
            </p>
            {typeof result.predictedScore === "number" ? (
              <p className="text-sm text-secondary">Predicted final percentage (0-100 scale)</p>
            ) : null}
            <p className="text-sm text-secondary">Predicted final grade from backend aggregation and ML service/fallback logic.</p>

          </>
        )}

        {batchResult ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-secondary">
              Class run summary: {batchResult.successful.length}/{batchResult.total} successful, {batchResult.failed} failed.
            </p>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/20">
                <h4 className="font-semibold text-on-surface mb-2">Grade Distribution</h4>
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={distribution} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="grade" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" name="Students" fill="#2563eb" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-secondary mt-2">Average confidence: n/a</p>
              </div>

              <div className="border border-outline-variant/20 rounded-xl overflow-auto max-h-72">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-secondary bg-surface-container-low">
                      <th className="py-2 px-3 font-semibold">Student</th>
                      <th className="py-2 px-3 font-semibold">Roll</th>
                      <th className="py-2 px-3 font-semibold">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchResult.successful.map((item) => (
                      <tr key={item.studentId} className="border-t border-outline-variant/10">
                        <td className="py-2 px-3 font-medium">{item.name}</td>
                        <td className="py-2 px-3 text-secondary">{item.rollNumber}</td>
                        <td className="py-2 px-3 text-primary font-semibold">{item.predictedGrade}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
