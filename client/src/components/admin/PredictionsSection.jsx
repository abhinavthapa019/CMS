import { useEffect, useMemo, useState } from "react";
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
import { api } from "../../api";

export default function PredictionsSection({ token }) {
  const [filter, setFilter] = useState({ batch: "", faculty: "", section: "" });
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [rows, setRows] = useState([]);
  const [distribution, setDistribution] = useState([
    { grade: "A", count: 0 },
    { grade: "B", count: 0 },
    { grade: "C", count: 0 },
    { grade: "D", count: 0 },
    { grade: "F", count: 0 },
  ]);
  const [avgConfidence, setAvgConfidence] = useState(null);

  function buildQuery() {
    const q = new URLSearchParams();
    if (filter.batch) q.set("batch", filter.batch);
    if (filter.faculty) q.set("faculty", filter.faculty);
    if (filter.section) q.set("section", filter.section);
    const s = q.toString();
    return s ? `?${s}` : "";
  }

  async function load() {
    if (!token) return;
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const res = await api(`/api/predictions/admin${buildQuery()}`, { token });
      setRows(res.predictions || []);
      setDistribution(res.distribution || []);
      setAvgConfidence(typeof res.avgConfidence === "number" ? res.avgConfidence : null);
    } catch (e) {
      setError(e.message || "Failed to load predictions");
    } finally {
      setLoading(false);
    }
  }

  async function generateForClass() {
    if (!token) return;
    setError("");
    setNotice("");

    if (!filter.batch || !filter.faculty || !filter.section) {
      setError("Select batch, faculty, and section to generate predictions.");
      return;
    }

    setGenerating(true);
    try {
      const q = new URLSearchParams({
        batch: filter.batch,
        faculty: filter.faculty,
        section: filter.section,
      }).toString();

      const studentsRes = await api(`/api/students?${q}`, { token });
      const students = studentsRes.students || [];
      if (students.length === 0) {
        setError("No students found for this class.");
        return;
      }

      const results = await Promise.allSettled(
        students.map((s) =>
          api("/api/predict-grade", {
            token,
            method: "POST",
            body: { studentId: s.id },
          })
        )
      );

      const okCount = results.filter((r) => r.status === "fulfilled").length;
      const failCount = results.length - okCount;
      setNotice(`Generated predictions: ${okCount}/${results.length} successful${failCount ? `, ${failCount} failed` : ""}.`);

      await load();
    } catch (e) {
      setError(e.message || "Failed to generate predictions");
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, filter.batch, filter.faculty, filter.section]);

  const avgConfidencePct = useMemo(() => {
    if (typeof avgConfidence !== "number" || !Number.isFinite(avgConfidence)) return null;
    return Math.round(avgConfidence * 100);
  }, [avgConfidence]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Predictions</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={generateForClass}
            disabled={generating}
            className="px-4 py-2 rounded-full text-sm font-semibold bg-surface-container-high text-primary disabled:opacity-60"
          >
            {generating ? "Generating..." : "Generate for Class"}
          </button>

          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="px-4 py-2 rounded-full text-sm font-semibold bg-surface-container-high text-secondary disabled:opacity-60"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={filter.batch}
          onChange={(e) => setFilter((p) => ({ ...p, batch: e.target.value }))}
          className="p-2 border rounded bg-surface-container-high"
        >
          <option value="">All Batches</option>
          <option value="ELEVEN">ELEVEN</option>
          <option value="TWELVE">TWELVE</option>
        </select>

        <select
          value={filter.faculty}
          onChange={(e) => {
            const faculty = e.target.value;
            setFilter((p) => {
              const next = { ...p, faculty };
              if (!faculty) next.section = "";
              else if (p.section && faculty === "SCIENCE" && !["BIO", "CS"].includes(p.section)) next.section = "BIO";
              else if (p.section && faculty === "MANAGEMENT" && !["ECONOMICS", "MARKETING"].includes(p.section)) next.section = "ECONOMICS";
              return next;
            });
          }}
          className="p-2 border rounded bg-surface-container-high"
        >
          <option value="">All Faculties</option>
          <option value="SCIENCE">SCIENCE</option>
          <option value="MANAGEMENT">MANAGEMENT</option>
        </select>

        <select
          value={filter.section}
          onChange={(e) => setFilter((p) => ({ ...p, section: e.target.value }))}
          className="p-2 border rounded bg-surface-container-high"
          disabled={!filter.faculty}
        >
          <option value="">All Sections</option>
          {filter.faculty === "SCIENCE" ? (
            <>
              <option value="BIO">BIO</option>
              <option value="CS">CS</option>
            </>
          ) : null}
          {filter.faculty === "MANAGEMENT" ? (
            <>
              <option value="ECONOMICS">ECONOMICS</option>
              <option value="MARKETING">MARKETING</option>
            </>
          ) : null}
        </select>
      </div>

      {error ? <p className="text-sm text-error bg-error-container px-4 py-2 rounded-lg">{error}</p> : null}
      {notice ? <p className="text-sm text-secondary bg-surface-container-high px-4 py-2 rounded-lg">{notice}</p> : null}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20">
          <h3 className="font-headline font-bold text-lg text-on-surface mb-2">Grade Distribution</h3>
          <div className="w-full h-72">
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
          <p className="text-xs text-secondary mt-2">
            Average confidence: {avgConfidencePct === null ? "n/a" : `${avgConfidencePct}%`}
          </p>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20">
          <h3 className="font-headline font-bold text-lg text-on-surface mb-2">Latest Predictions (per student)</h3>
          {loading ? <p className="text-sm text-secondary">Loading predictions...</p> : null}
          {!loading && rows.length === 0 ? <p className="text-sm text-secondary">No predictions yet.</p> : null}

          <div className="border border-outline-variant/20 rounded-xl overflow-auto max-h-72">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-secondary bg-surface-container-low">
                  <th className="py-2 px-3 font-semibold">Student</th>
                  <th className="py-2 px-3 font-semibold">Class</th>
                  <th className="py-2 px-3 font-semibold">Grade</th>
                  <th className="py-2 px-3 font-semibold">Conf.</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-outline-variant/10">
                    <td className="py-2 px-3 font-medium">
                      {r.student?.firstName} {r.student?.lastName} (#{r.student?.rollNumber})
                    </td>
                    <td className="py-2 px-3 text-secondary">
                      {r.student?.batch}/{r.student?.faculty}/{r.student?.section}
                    </td>
                    <td className="py-2 px-3 text-primary font-semibold">{r.predictedGrade}</td>
                    <td className="py-2 px-3 text-secondary">
                      {typeof r.confidence === "number" && Number.isFinite(r.confidence)
                        ? `${Math.round(r.confidence * 100)}%`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
