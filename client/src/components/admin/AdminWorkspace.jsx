import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import AdminHeader from "./AdminHeader";
import AdminTabs from "./AdminTabs";
import AttendanceSummarySection from "./AttendanceSummarySection";
import DashboardSection from "./DashboardSection";
import StudentsSection from "./StudentsSection";
import TeachersSection from "./TeachersSection";

export default function AdminWorkspace({ user, token, onLogout }) {
  const [tab, setTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [submittingTeacher, setSubmittingTeacher] = useState(false);
  const [submittingStudent, setSubmittingStudent] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [deletingStudentId, setDeletingStudentId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [users, setUsers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teacherAssignments, setTeacherAssignments] = useState([]);
  const [students, setStudents] = useState([]);
  const [classFilter, setClassFilter] = useState({ batch: "", faculty: "", section: "" });
  const [attendanceFilter, setAttendanceFilter] = useState({
    batch: "ELEVEN",
    faculty: "SCIENCE",
    section: "BIO",
    department: "SCIENCE",
    subjectId: "",
  });
  const [attendanceSummary, setAttendanceSummary] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [studentSearch, setStudentSearch] = useState("");

  const [studentForm, setStudentForm] = useState({
    firstName: "",
    lastName: "",
    rollNumber: "",
    batch: "ELEVEN",
    faculty: "SCIENCE",
    section: "BIO",
    motherJob: "teacher",
    fatherJob: "teacher",
    travelTime: 1,
  });

  const loadAdminData = useCallback(async () => {
    if (!token || user?.role !== "ADMIN") return;

    setLoading(true);
    setError("");
    try {
      const [usersRes, attendanceRes, analyticsRes, teacherAssignmentRes] = await Promise.all([
        api("/api/users", { token }),
        api("/api/subjects", { token }),
        api("/api/analytics/admin/overview", { token }),
        api("/api/teacher-subject-assignments", { token }),
      ]);
      setUsers(usersRes.users || []);
      const subjectRows = attendanceRes.subjects || [];
      setSubjects(subjectRows);
      setTeacherAssignments(teacherAssignmentRes.assignments || []);

      setAnalytics(analyticsRes);
    } catch (e) {
      setError(e.message || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }, [token, user?.role]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  useEffect(() => {
    if (!token || user?.role !== "ADMIN") return;
    const q = new URLSearchParams({
      batch: attendanceFilter.batch,
      faculty: attendanceFilter.faculty,
      section: attendanceFilter.section,
      ...(attendanceFilter.subjectId ? { subjectId: attendanceFilter.subjectId } : {}),
    }).toString();

    api(`/api/students/attendance-summary?${q}`, { token })
      .then((res) => setAttendanceSummary(res.summary || []))
      .catch((e) => setError(e.message || "Failed to load attendance summary"));
  }, [
    token,
    user?.role,
    attendanceFilter.batch,
    attendanceFilter.faculty,
    attendanceFilter.section,
    attendanceFilter.subjectId,
  ]);

  useEffect(() => {
    if (!token || user?.role !== "ADMIN") return;
    const classBatch = classFilter.batch;
    const classFaculty = classFilter.faculty;
    const classSection = classFilter.section;
    if (!classBatch || !classFaculty || !classSection) {
      setStudents([]);
      return;
    }

    const q = new URLSearchParams({
      batch: classBatch,
      faculty: classFaculty,
      section: classSection,
    }).toString();
    api(`/api/students?${q}`, { token })
      .then((res) => setStudents(res.students || []))
      .catch((e) => setError(e.message || "Failed to load class students"));
  }, [token, user?.role, classFilter.batch, classFilter.faculty, classFilter.section]);

  const teacherUsers = useMemo(() => users.filter((u) => u.role === "TEACHER"), [users]);

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => (`${s.firstName} ${s.lastName} ${s.rollNumber}`).toLowerCase().includes(q));
  }, [students, studentSearch]);

  async function handleCreateTeacher(payload) {
    setSubmittingTeacher(true);
    setError("");
    setNotice("");
    try {
      await api("/api/users", {
        token,
        method: "POST",
        body: {
          ...payload,
          role: "TEACHER",
        },
      });
      setNotice("Teacher account created successfully.");
      await loadAdminData();
      return true;
    } catch (e) {
      setError(e.message || "Unable to create teacher");
      return false;
    } finally {
      setSubmittingTeacher(false);
    }
  }

  async function handleUpdateTeacher(teacherId, payload) {
    setSubmittingTeacher(true);
    setError("");
    setNotice("");
    try {
      await api(`/api/users/${teacherId}`, {
        token,
        method: "PUT",
        body: payload,
      });
      setNotice("Teacher updated successfully.");
      await loadAdminData();
      return true;
    } catch (e) {
      setError(e.message || "Unable to update teacher");
      return false;
    } finally {
      setSubmittingTeacher(false);
    }
  }

  async function handleCreateStudent(e) {
    e.preventDefault();
    setSubmittingStudent(true);
    setError("");
    setNotice("");
    try {
      await api("/api/students", {
        token,
        method: "POST",
        body: {
          ...studentForm,
          travelTime: Number(studentForm.travelTime),
        },
      });
      setNotice("Student created successfully.");
      setStudentForm({
        firstName: "",
        lastName: "",
        rollNumber: "",
        batch: "ELEVEN",
        faculty: "SCIENCE",
        section: "BIO",
        motherJob: "teacher",
        fatherJob: "teacher",
        travelTime: 1,
      });
      await loadAdminData();
      setTab("students");
    } catch (e) {
      setError(e.message || "Unable to create student");
    } finally {
      setSubmittingStudent(false);
    }
  }

  async function handleDeleteUser(userRow) {
    const ok = window.confirm(`Delete Teacher: ${userRow.name}?`);
    if (!ok) return;

    setDeletingUserId(userRow.id);
    setError("");
    setNotice("");
    try {
      await api(`/api/users/${userRow.id}`, {
        token,
        method: "DELETE",
      });
      setNotice(`Deleted user ${userRow.name}.`);
      await loadAdminData();
    } catch (e) {
      setError(e.message || "Unable to delete user");
    } finally {
      setDeletingUserId(null);
    }
  }

  async function handleDeleteStudent(studentRow) {
    const ok = window.confirm(`Delete student ${studentRow.firstName} ${studentRow.lastName} (#${studentRow.rollNumber})?`);
    if (!ok) return;

    setDeletingStudentId(studentRow.id);
    setError("");
    setNotice("");
    try {
      await api(`/api/students/${studentRow.id}`, {
        token,
        method: "DELETE",
      });
      setNotice(`Deleted student ${studentRow.firstName} ${studentRow.lastName}.`);
      await loadAdminData();
    } catch (e) {
      setError(e.message || "Unable to delete student");
    } finally {
      setDeletingStudentId(null);
    }
  }

  return (
    <div className="min-h-screen bg-background text-on-surface pb-16">
      <AdminHeader user={user} onLogout={onLogout} />

      <main className="max-w-6xl mx-auto px-5 py-6 space-y-6">
        <AdminTabs tab={tab} onChange={setTab} onRefresh={loadAdminData} />

        {error ? <p className="text-sm text-error bg-error-container px-4 py-2 rounded-lg">{error}</p> : null}
        {notice ? <p className="text-sm text-on-secondary-container bg-secondary-container px-4 py-2 rounded-lg">{notice}</p> : null}

        {tab === "dashboard" ? (
          <DashboardSection
            users={users}
            students={students}
            analytics={analytics}
            loading={loading}
            onGoStudents={() => setTab("students")}
            onGoTeachers={() => setTab("teachers")}
          />
        ) : null}

        {tab === "teachers" ? (
          <TeachersSection
            loading={loading}
            teachers={teacherUsers}
            subjects={subjects}
            assignments={teacherAssignments}
            submitting={submittingTeacher}
            onCreateTeacher={handleCreateTeacher}
            onUpdateTeacher={handleUpdateTeacher}
            onDeleteTeacher={handleDeleteUser}
            deletingUserId={deletingUserId}
          />
        ) : null}

        {tab === "students" ? (
          <StudentsSection
            loading={loading}
            students={filteredStudents}
            classFilter={classFilter}
            onClassFilterChange={(field, value) => setClassFilter((prev) => ({ ...prev, [field]: value }))}
            search={studentSearch}
            onSearchChange={setStudentSearch}
            studentForm={studentForm}
            onStudentFormChange={(field, value) => setStudentForm((prev) => ({ ...prev, [field]: value }))}
            onSubmit={handleCreateStudent}
            submitting={submittingStudent}
            onDeleteStudent={handleDeleteStudent}
            deletingStudentId={deletingStudentId}
          />
        ) : null}

        {tab === "attendance" ? (
          <AttendanceSummarySection
            loading={loading}
            summary={attendanceSummary}
            subjects={subjects}
            filter={attendanceFilter}
            onFilterChange={(field, value) => {
              setAttendanceFilter((prev) => {
                if (field === "faculty") {
                  const nextSection = value === "SCIENCE" ? "BIO" : "ECONOMICS";
                  return {
                    ...prev,
                    faculty: value,
                    section: nextSection,
                    department: value,
                    subjectId: "",
                  };
                }
                if (field === "department") {
                  return {
                    ...prev,
                    department: value,
                    subjectId: "",
                  };
                }
                return { ...prev, [field]: value };
              });
            }}
          />
        ) : null}
      </main>
    </div>
  );
}
