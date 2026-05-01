import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import AttendanceSection from "./AttendanceSection";
import AssignmentsSection from "./AssignmentsSection";
import MarksSection from "./MarksSection";
import NoticesSection from "./NoticesSection";
import PredictionSection from "./PredictionSection";
import TeacherDashboardSection from "./TeacherDashboardSection";
import TeacherHeader from "./TeacherHeader";
import TeacherTabs from "./TeacherTabs";

export default function TeacherWorkspace({ user, token, onLogout }) {
  const [tab, setTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [notices, setNotices] = useState([]);
  const [loadingNotices, setLoadingNotices] = useState(false);

  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [classTeacherAssignments, setClassTeacherAssignments] = useState([]);
  const [attendanceStudents, setAttendanceStudents] = useState([]);
  const [attendanceTakenDates, setAttendanceTakenDates] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [actionLog, setActionLog] = useState([]);
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [predictionCount, setPredictionCount] = useState(0);

  const [submittingAttendance, setSubmittingAttendance] = useState(false);
  const [submittingMarks, setSubmittingMarks] = useState(false);
  const [submittingPrediction, setSubmittingPrediction] = useState(false);
  const [submittingPredictionBatch, setSubmittingPredictionBatch] = useState(false);

  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [attendanceMap, setAttendanceMap] = useState({});
  const [classFilters, setClassFilters] = useState({
    batch: "ELEVEN",
    faculty: "SCIENCE",
    section: "BIO",
  });
  const [attendanceClassFilters, setAttendanceClassFilters] = useState({
    batch: "",
    faculty: "",
    section: "",
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
  const [predictionBatchResult, setPredictionBatchResult] = useState(null);

  const allowedClassOptions = useMemo(() => {
    const map = new Map();
    for (const a of assignments) {
      const batches = a.batch ? [a.batch] : ["ELEVEN", "TWELVE"];

      let facultySectionPairs = [];
      if (a.subject?.faculty === "SCIENCE") {
        facultySectionPairs = [
          ["SCIENCE", "BIO"],
          ["SCIENCE", "CS"],
        ];
      } else if (a.subject?.faculty === "MANAGEMENT") {
        facultySectionPairs = [
          ["MANAGEMENT", "ECONOMICS"],
          ["MANAGEMENT", "MARKETING"],
        ];
      } else {
        facultySectionPairs = [
          ["SCIENCE", "BIO"],
          ["SCIENCE", "CS"],
          ["MANAGEMENT", "ECONOMICS"],
          ["MANAGEMENT", "MARKETING"],
        ];
      }

      for (const batch of batches) {
        for (const [faculty, section] of facultySectionPairs) {
          const key = `${batch}|${faculty}|${section}`;
            const batchLabel = batch === "ELEVEN" ? "11" : batch === "TWELVE" ? "12" : batch;
          if (!map.has(key)) {
            map.set(key, {
              batch,
              faculty,
              section,
                label: `${batchLabel} / ${faculty} / ${section}`,
            });
          }
        }
      }
    }
    return [...map.values()];
  }, [assignments]);

  const classKey = `${classFilters.batch}|${classFilters.faculty}|${classFilters.section}`;
  const attendanceClassKey = `${attendanceClassFilters.batch}|${attendanceClassFilters.faculty}|${attendanceClassFilters.section}`;

  function buildClassQuery(filters) {
    const q = new URLSearchParams();
    if (filters.batch) q.set("batch", filters.batch);
    if (filters.faculty) q.set("faculty", filters.faculty);
    if (filters.section) q.set("section", filters.section);
    const query = q.toString();
    return query ? `?${query}` : "";
  }

  const attendanceClassOptions = useMemo(() => {
    const map = new Map();
    for (const row of classTeacherAssignments) {
      const key = `${row.batch}|${row.faculty}|${row.section}`;
      const batchLabel = row.batch === "ELEVEN" ? "11" : row.batch === "TWELVE" ? "12" : row.batch;
      if (!map.has(key)) {
        map.set(key, {
          batch: row.batch,
          faculty: row.faculty,
          section: row.section,
          label: `${batchLabel} / ${row.faculty} / ${row.section}`,
        });
      }
    }
    return [...map.values()];
  }, [classTeacherAssignments]);

  const assignmentClassOptions = useMemo(() => {
    const map = new Map();
    for (const opt of allowedClassOptions) {
      map.set(`${opt.batch}|${opt.faculty}|${opt.section}`, opt);
    }
    for (const opt of attendanceClassOptions) {
      const key = `${opt.batch}|${opt.faculty}|${opt.section}`;
      if (!map.has(key)) {
        map.set(key, opt);
      }
    }
    return [...map.values()];
  }, [allowedClassOptions, attendanceClassOptions]);

  const hasClassTeacherRole = attendanceClassOptions.length > 0;
  const isEditingAttendanceDate = useMemo(
    () => attendanceTakenDates.includes(attendanceDate),
    [attendanceTakenDates, attendanceDate]
  );

  const selectedAttendanceAssignment = useMemo(
    () => classTeacherAssignments.find((row) => (
      row.batch === attendanceClassFilters.batch
      && row.faculty === attendanceClassFilters.faculty
      && row.section === attendanceClassFilters.section
    )),
    [classTeacherAssignments, attendanceClassFilters.batch, attendanceClassFilters.faculty, attendanceClassFilters.section]
  );

  const loadStudents = useCallback(async (filters) => {
    if (!token || user?.role !== "TEACHER") return;

    setLoading(true);
    setError("");
    try {
      const assignmentRes = await api("/api/teacher-subject-assignments", { token });
      const classTeacherRes = await api("/api/class-teacher-assignments", { token });

      setAssignments(assignmentRes.assignments || []);
      setClassTeacherAssignments(classTeacherRes.assignments || []);

      const assignmentRows = assignmentRes.assignments || [];
      const map = new Map();
      for (const a of assignmentRows) {
        const batches = a.batch ? [a.batch] : ["ELEVEN", "TWELVE"];
        let combos = [];
        if (a.subject?.faculty === "SCIENCE") combos = [["SCIENCE", "BIO"], ["SCIENCE", "CS"]];
        else if (a.subject?.faculty === "MANAGEMENT") combos = [["MANAGEMENT", "ECONOMICS"], ["MANAGEMENT", "MARKETING"]];
        else combos = [["SCIENCE", "BIO"], ["SCIENCE", "CS"], ["MANAGEMENT", "ECONOMICS"], ["MANAGEMENT", "MARKETING"]];
        for (const batch of batches) {
          for (const [faculty, section] of combos) {
            const key = `${batch}|${faculty}|${section}`;
            map.set(key, { batch, faculty, section });
          }
        }
      }

      const allowedNow = [...map.values()];
      if (allowedNow.length === 0) {
        setStudents([]);
        setAnalytics(null);
        return;
      }

      const requestedKey = `${filters.batch}|${filters.faculty}|${filters.section}`;
      const chosen = map.get(requestedKey) || allowedNow[0];
      if (chosen.batch !== filters.batch || chosen.faculty !== filters.faculty || chosen.section !== filters.section) {
        setClassFilters(chosen);
      }

      const query = buildClassQuery(chosen);
      const [studentRes, analyticsRes] = await Promise.all([
        api(`/api/students${query}`, { token }),
        api(`/api/analytics/teacher/${user.id}${query}`, { token }),
      ]);
      setStudents(studentRes.students || []);
      setAnalytics(analyticsRes || null);
    } catch (e) {
      setError(e.message || "Failed to load students.");
    } finally {
      setLoading(false);
    }
  }, [token, user?.role, user?.id]);

  const loadNotices = useCallback(async () => {
    if (!token) return;
    setLoadingNotices(true);
    try {
      const res = await api("/api/notices", { token });
      setNotices(res.notices || []);
    } catch (e) {
      setError(e.message || "Failed to load notices.");
    } finally {
      setLoadingNotices(false);
    }
  }, [token]);

  useEffect(() => {
    loadStudents({
      batch: classFilters.batch,
      faculty: classFilters.faculty,
      section: classFilters.section,
    });
  }, [loadStudents, classFilters.batch, classFilters.faculty, classFilters.section]);

  useEffect(() => {
    loadNotices();
  }, [loadNotices]);

  useEffect(() => {
    if (tab === "notices") {
      loadNotices();
    }
  }, [tab, loadNotices]);

  async function markNoticeRead(id) {
    try {
      await api(`/api/notices/${id}/read`, { token, method: "POST" });
      setNotices((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (e) {
      setError(e.message || "Failed to mark notice as read.");
    }
  }

  useEffect(() => {
    if (allowedClassOptions.length === 0) return;
    const exists = allowedClassOptions.some((opt) => `${opt.batch}|${opt.faculty}|${opt.section}` === classKey);
    if (!exists) {
      const first = allowedClassOptions[0];
      setClassFilters({ batch: first.batch, faculty: first.faculty, section: first.section });
    }
  }, [allowedClassOptions, classKey]);

  useEffect(() => {
    if (attendanceClassOptions.length === 0) {
      setAttendanceClassFilters({ batch: "", faculty: "", section: "" });
      setAttendanceStudents([]);
      setAttendanceTakenDates([]);
      return;
    }

    const exists = attendanceClassOptions.some((opt) => `${opt.batch}|${opt.faculty}|${opt.section}` === attendanceClassKey);
    if (!exists) {
      const first = attendanceClassOptions[0];
      setAttendanceClassFilters({ batch: first.batch, faculty: first.faculty, section: first.section });
    }
  }, [attendanceClassOptions, attendanceClassKey]);

  useEffect(() => {
    if (!hasClassTeacherRole && tab === "attendance") {
      setTab("dashboard");
    }
  }, [hasClassTeacherRole, tab]);

  const loadAttendanceStudents = useCallback(async (filters) => {
    if (!token || user?.role !== "TEACHER") return;
    if (!filters.batch || !filters.faculty || !filters.section) {
      setAttendanceStudents([]);
      setAttendanceTakenDates([]);
      return;
    }

    try {
      const query = buildClassQuery(filters);
      const queryWithDate = new URLSearchParams({
        batch: filters.batch,
        faculty: filters.faculty,
        section: filters.section,
        date: attendanceDate,
      }).toString();

      const [studentsRes, datesRes, classAttendanceRes] = await Promise.all([
        api(`/api/students${query}`, { token }),
        api(`/api/attendance/class-dates${query}`, { token }),
        api(`/api/attendance/class?${queryWithDate}`, { token }),
      ]);

      const rows = studentsRes.students || [];
      const existing = classAttendanceRes.attendance || [];

      setAttendanceStudents(rows);
      setAttendanceTakenDates(datesRes.dates || []);

      const existingByStudent = new Map(existing.map((row) => [row.studentId, row.present]));
      const nextMap = {};
      rows.forEach((student) => {
        nextMap[student.id] = existingByStudent.has(student.id) ? existingByStudent.get(student.id) : true;
      });
      setAttendanceMap(nextMap);
    } catch (e) {
      setError(e.message || "Failed to load attendance students.");
    }
  }, [token, user?.role, attendanceDate]);

  useEffect(() => {
    loadAttendanceStudents(attendanceClassFilters);
  }, [loadAttendanceStudents, attendanceClassFilters.batch, attendanceClassFilters.faculty, attendanceClassFilters.section, attendanceDate]);

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
        attendanceStudents.map((s) =>
          api(`/api/students/${s.id}/attendance`, {
            token,
            method: "POST",
            body: {
              present: attendanceMap[s.id] ?? true,
              date: isoDate,
              batch: attendanceClassFilters.batch || undefined,
              faculty: attendanceClassFilters.faculty || undefined,
              section: attendanceClassFilters.section || undefined,
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
        setNotice(
          isEditingAttendanceDate
            ? `Attendance updated for ${successCount} students.`
            : `Attendance saved for ${successCount} students.`
        );
      } else {
        setNotice(`Saved ${successCount} students. ${failCount} failed.`);
      }

      logAction("attendance", "Class attendance submitted", `${attendanceDate} - ${successCount} saved`);
      await loadAttendanceStudents(attendanceClassFilters);
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

  async function handlePredictClass() {
    if (students.length === 0) {
      setError("No students found in this class.");
      return;
    }

    setSubmittingPredictionBatch(true);
    setError("");
    setNotice("");
    try {
      const results = await Promise.allSettled(
        students.map((student) =>
          api("/api/predict-grade", {
            token,
            method: "POST",
            body: { studentId: student.id },
          }).then((res) => ({
            studentId: student.id,
            name: `${student.firstName} ${student.lastName}`,
            rollNumber: student.rollNumber,
            predictedGrade: res.predicted_grade,
          }))
        )
      );

      const successful = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
      const failed = results.filter((r) => r.status === "rejected").length;

      setPredictionBatchResult({
        total: students.length,
        successful,
        failed,
      });

      if (successful.length > 0) {
        setPredictionCount((v) => v + successful.length);
      }

      setNotice(`Class prediction complete: ${successful.length}/${students.length} successful.`);
      logAction(
        "prediction",
        "Class prediction completed",
        `${classFilters.batch} / ${classFilters.faculty} / ${classFilters.section}`
      );
    } catch (e) {
      setError(e.message || "Class prediction failed.");
    } finally {
      setSubmittingPredictionBatch(false);
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
        <TeacherTabs tab={tab} onChange={setTab} onRefresh={loadStudents} showAttendance={hasClassTeacherRole} />

        {error ? <p className="text-sm text-error bg-error-container px-4 py-2 rounded-lg">{error}</p> : null}
        {notice ? <p className="text-sm text-on-secondary-container bg-secondary-container px-4 py-2 rounded-lg">{notice}</p> : null}

        {loading ? <p className="text-sm text-secondary">Loading students...</p> : null}

        {tab === "dashboard" ? <TeacherDashboardSection students={students} actions={actionSummary} analytics={analytics} /> : null}

        {tab === "notices" ? (
          <NoticesSection
            notices={notices}
            loading={loadingNotices}
            error={error}
            onRefresh={loadNotices}
            onMarkRead={markNoticeRead}
          />
        ) : null}

        {tab === "attendance" ? (
          <AttendanceSection
            students={attendanceStudents}
            classOptions={attendanceClassOptions}
            classFilters={attendanceClassFilters}
            classTeacherName={selectedAttendanceAssignment?.teacher?.name || user?.name}
            onFilterChange={(field, value) => {
              if (field === "classKey") {
                const [batch, faculty, section] = value.split("|");
                setAttendanceClassFilters({ batch, faculty, section });
                return;
              }
              setAttendanceClassFilters((prev) => ({ ...prev, [field]: value }));
            }}
            attendanceDate={attendanceDate}
            attendanceMap={attendanceMap}
            onDateChange={setAttendanceDate}
            takenDates={attendanceTakenDates}
            isEditingExisting={isEditingAttendanceDate}
            onPickTakenDate={setAttendanceDate}
            onToggleStudent={(studentId, checked) =>
              setAttendanceMap((prev) => ({
                ...prev,
                [studentId]: checked,
              }))
            }
            onToggleAll={(checked) => {
              const all = {};
              attendanceStudents.forEach((s) => {
                all[s.id] = checked;
              });
              setAttendanceMap(all);
            }}
            onSubmit={handleAttendanceSubmit}
            submitting={submittingAttendance}
          />
        ) : null}

        {tab === "assignments" ? (
          <AssignmentsSection token={token} classOptions={assignmentClassOptions} />
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
            onPredictClass={handlePredictClass}
            submitting={submittingPrediction}
            submittingBatch={submittingPredictionBatch}
            result={predictionResult}
            batchResult={predictionBatchResult}
            classFilters={classFilters}
          />
        ) : null}
      </main>
    </div>
  );
}
