import { useEffect, useMemo, useState } from "react";
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
  const [students, setStudents] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState([]);
  const [teacherSearch, setTeacherSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");

  const [teacherForm, setTeacherForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "TEACHER",
  });

  const [studentForm, setStudentForm] = useState({
    firstName: "",
    lastName: "",
    rollNumber: "",
    motherJob: "teacher",
    fatherJob: "teacher",
    travelTime: 1,
  });

  async function loadAdminData() {
    if (!token || user?.role !== "ADMIN") return;

    setLoading(true);
    setError("");
    try {
      const [usersRes, studentsRes, attendanceRes] = await Promise.all([
        api("/api/users", { token }),
        api("/api/students", { token }),
        api("/api/students/attendance-summary", { token }),
      ]);
      setUsers(usersRes.users || []);
      setStudents(studentsRes.students || []);
      setAttendanceSummary(attendanceRes.summary || []);
    } catch (e) {
      setError(e.message || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAdminData();
  }, [token, user?.role]);

  const filteredUsers = useMemo(() => {
    const q = teacherSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => (`${u.name} ${u.email} ${u.role}`).toLowerCase().includes(q));
  }, [users, teacherSearch]);

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => (`${s.firstName} ${s.lastName} ${s.rollNumber}`).toLowerCase().includes(q));
  }, [students, studentSearch]);

  async function handleCreateTeacher(e) {
    e.preventDefault();
    setSubmittingTeacher(true);
    setError("");
    setNotice("");
    try {
      await api("/api/users", {
        token,
        method: "POST",
        body: teacherForm,
      });
      setNotice("Teacher account created successfully.");
      setTeacherForm({ name: "", email: "", password: "", role: "TEACHER" });
      await loadAdminData();
      setTab("teachers");
    } catch (e) {
      setError(e.message || "Unable to create teacher");
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
    const ok = window.confirm(`Delete user ${userRow.name} (${userRow.email})?`);
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
            loading={loading}
            onGoStudents={() => setTab("students")}
            onGoTeachers={() => setTab("teachers")}
          />
        ) : null}

        {tab === "teachers" ? (
          <TeachersSection
            loading={loading}
            users={filteredUsers}
            search={teacherSearch}
            onSearchChange={setTeacherSearch}
            teacherForm={teacherForm}
            onTeacherFormChange={(field, value) => setTeacherForm((prev) => ({ ...prev, [field]: value }))}
            onSubmit={handleCreateTeacher}
            submitting={submittingTeacher}
            onDeleteUser={handleDeleteUser}
            deletingUserId={deletingUserId}
          />
        ) : null}

        {tab === "students" ? (
          <StudentsSection
            loading={loading}
            students={filteredStudents}
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
          <AttendanceSummarySection loading={loading} summary={attendanceSummary} />
        ) : null}
      </main>
    </div>
  );
}
