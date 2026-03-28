import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import AttendanceSection from "./AttendanceSection";
import MarksSection from "./MarksSection";
import PredictionSection from "./PredictionSection";
import TeacherDashboardSection from "./TeacherDashboardSection";
import TeacherHeader from "./TeacherHeader";
import TeacherTabs from "./TeacherTabs";

export default function TeacherWorkspace({ user, token, onLogout }) {
  const [tab, setTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [actionLog, setActionLog] = useState([]);
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [predictionCount, setPredictionCount] = useState(0);

  const [submittingAttendance, setSubmittingAttendance] = useState(false);
  const [submittingMarks, setSubmittingMarks] = useState(false);
  const [submittingPrediction, setSubmittingPrediction] = useState(false);

  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [attendanceMap, setAttendanceMap] = useState({});
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [classFilters, setClassFilters] = useState({
    batch: "ELEVEN",
    faculty: "SCIENCE",
    section: "BIO",
  });

  const [marksForm, setMarksForm] = useState({
    studentId: "",
    g1: "",
    g2: "",
    finalGrade: "",
    activities: false,
  });

  const [predictionStudentId, setPredictionStudentId] = useState("");
  const [predictionResult, setPredictionResult] = useState(null);

  function buildClassQuery(filters) {
    const q = new URLSearchParams();
    if (filters.batch) q.set("batch", filters.batch);
    if (filters.faculty) q.set("faculty", filters.faculty);
    if (filters.section) q.set("section", filters.section);
    const query = q.toString();
    return query ? `?${query}` : "";
  }

  async function loadStudents(filters = classFilters) {
    if (!token || user?.role !== "TEACHER") return;

    setLoading(true);
    setError("");
    try {
      const query = buildClassQuery(filters);
      const [studentRes, analyticsRes, subjectRes] = await Promise.all([
        api(`/api/students${query}`, { token }),
        api(`/api/analytics/teacher/${user.id}${query}`, { token }),
        api("/api/subjects", { token }),
      ]);
      setStudents(studentRes.students || []);
      setAnalytics(analyticsRes || null);
      setSubjects(subjectRes.subjects || []);
    } catch (e) {
      setError(e.message || "Failed to load students.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStudents();
  }, [token, user?.role, user?.id]);

  useEffect(() => {
    loadStudents(classFilters);
  }, [classFilters.batch, classFilters.faculty, classFilters.section]);

  useEffect(() => {
    if (students.length === 0) return;
    setAttendanceMap((prev) => {
      const next = {};
      students.forEach((s) => {
        next[s.id] = prev[s.id] ?? true;
      });
      return next;
    });
  }, [students]);

  function logAction(kind, title, meta) {
    setActionLog((prev) => [{ kind, title, meta }, ...prev].slice(0, 8));
  }

  async function handleAttendanceSubmit() {
    if (!attendanceDate) {
      setError("Please select attendance date.");
      return;
    }

    setSubmittingAttendance(true);
    setError("");
    setNotice("");

    try {
      const isoDate = new Date(`${attendanceDate}T00:00:00.000Z`).toISOString();
      const results = await Promise.allSettled(
        students.map((s) =>
          api(`/api/students/${s.id}/attendance`, {
            token,
            method: "POST",
            body: {
              present: attendanceMap[s.id] ?? true,
              date: isoDate,
              batch: classFilters.batch || undefined,
              faculty: classFilters.faculty || undefined,
              section: classFilters.section || undefined,
              subjectId: selectedSubjectId ? Number(selectedSubjectId) : undefined,
            },
          })
        )
      );

      const successCount = results.filter((r) => r.status === "fulfilled").length;
      const failCount = results.length - successCount;

      if (successCount > 0) {
        setAttendanceCount((v) => v + successCount);
      }

      if (failCount === 0) {
        setNotice(`Attendance saved for ${successCount} students.`);
      } else {
        setNotice(`Saved ${successCount} students. ${failCount} failed (possibly already marked for this date).`);
      }

      logAction("attendance", "Class attendance submitted", `${attendanceDate} - ${successCount} saved`);
      await loadStudents(classFilters);
    } catch (e) {
      setError(e.message || "Failed to record attendance.");
    } finally {
      setSubmittingAttendance(false);
    }
  }

  async function handleMarksSubmit(e) {
    e.preventDefault();
    setSubmittingMarks(true);
    setError("");
    setNotice("");
    try {
      const studentId = Number(marksForm.studentId);

      const g1OutOf20 = Math.max(0, Math.min(20, Math.round(Number(marksForm.g1) / 5)));
      const g2OutOf20 = Math.max(0, Math.min(20, Math.round(Number(marksForm.g2) / 5)));

      const payload = {
        g1: g1OutOf20,
        g2: g2OutOf20,
        activities: marksForm.activities,
      };
      if (marksForm.finalGrade !== "") {
        payload.finalGrade = Number(marksForm.finalGrade);
      }

      await api(`/api/students/${studentId}/marks`, {
        token,
        method: "POST",
        body: payload,
      });

      setNotice("Marks saved successfully.");
      const student = students.find((s) => s.id === studentId);
      logAction("marks", "Marks updated", `${student?.firstName || "Student"} ${student?.lastName || ""}`.trim());
    } catch (e) {
      setError(e.message || "Failed to save marks.");
    } finally {
      setSubmittingMarks(false);
    }
  }

  async function handlePredict(e) {
    e.preventDefault();
    setSubmittingPrediction(true);
    setError("");
    setNotice("");
    try {
      const studentId = Number(predictionStudentId);
      const res = await api("/api/predict-grade", {
        token,
        method: "POST",
        body: { studentId },
      });

      setPredictionResult({ studentId, predictedGrade: res.predicted_grade });
      setPredictionCount((v) => v + 1);
      setNotice("Prediction completed.");

      const student = students.find((s) => s.id === studentId);
      logAction(
        "prediction",
        "Final grade predicted",
        `${student?.firstName || "Student"} ${student?.lastName || ""}`.trim()
      );
      await loadStudents(classFilters);
    } catch (e) {
      setError(e.message || "Prediction failed.");
    } finally {
      setSubmittingPrediction(false);
    }
  }

  const actionSummary = useMemo(
    () => ({
      attendanceCount,
      predictionCount,
      recent: actionLog,
    }),
    [attendanceCount, predictionCount, actionLog]
  );

  return (
    <div className="min-h-screen bg-background text-on-surface pb-16">
      <TeacherHeader user={user} onLogout={onLogout} />

      <main className="max-w-6xl mx-auto px-5 py-6 space-y-6">
        <TeacherTabs tab={tab} onChange={setTab} onRefresh={loadStudents} />

        {error ? <p className="text-sm text-error bg-error-container px-4 py-2 rounded-lg">{error}</p> : null}
        {notice ? <p className="text-sm text-on-secondary-container bg-secondary-container px-4 py-2 rounded-lg">{notice}</p> : null}

        {loading ? <p className="text-sm text-secondary">Loading students...</p> : null}

        {tab === "dashboard" ? <TeacherDashboardSection students={students} actions={actionSummary} analytics={analytics} /> : null}

        {tab === "attendance" ? (
          <AttendanceSection
            students={students}
            subjects={subjects}
            classFilters={classFilters}
            onFilterChange={(field, value) => setClassFilters((prev) => ({ ...prev, [field]: value }))}
            selectedSubjectId={selectedSubjectId}
            onSubjectChange={setSelectedSubjectId}
            attendanceDate={attendanceDate}
            attendanceMap={attendanceMap}
            onDateChange={setAttendanceDate}
            onToggleStudent={(studentId, checked) =>
              setAttendanceMap((prev) => ({
                ...prev,
                [studentId]: checked,
              }))
            }
            onToggleAll={(checked) => {
              const all = {};
              students.forEach((s) => {
                all[s.id] = checked;
              });
              setAttendanceMap(all);
            }}
            onSubmit={handleAttendanceSubmit}
            submitting={submittingAttendance}
          />
        ) : null}

        {tab === "marks" ? (
          <MarksSection
            students={students}
            marksForm={marksForm}
            onMarksChange={(field, value) => setMarksForm((prev) => ({ ...prev, [field]: value }))}
            onSubmit={handleMarksSubmit}
            submitting={submittingMarks}
          />
        ) : null}

        {tab === "prediction" ? (
          <PredictionSection
            students={students}
            predictionStudentId={predictionStudentId}
            onPredictionStudentChange={setPredictionStudentId}
            onPredict={handlePredict}
            submitting={submittingPrediction}
            result={predictionResult}
          />
        ) : null}
      </main>
    </div>
  );
}
