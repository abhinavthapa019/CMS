import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import AdminHeader from "./AdminHeader";
import AdminTabs from "./AdminTabs";
import AttendanceSummarySection from "./AttendanceSummarySection";
import ClassTeachersSection from "./ClassTeachersSection";
import DashboardSection from "./DashboardSection";
import FeesSection from "./FeesSection";
import StudentsSection from "./StudentsSection";
import TeachersSection from "./TeachersSection";
import NoticesSection from "./NoticesSection";
import PredictionsSection from "./PredictionsSection";

export default function AdminWorkspace({ user, token, onLogout }) {
  const [tab, setTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [submittingTeacher, setSubmittingTeacher] = useState(false);
  const [submittingStudent, setSubmittingStudent] = useState(false);
  const [submittingFee, setSubmittingFee] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [deletingStudentId, setDeletingStudentId] = useState(null);
  const [updatingStudentId, setUpdatingStudentId] = useState(null);
  const [deletingClassTeacherId, setDeletingClassTeacherId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [users, setUsers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teacherAssignments, setTeacherAssignments] = useState([]);
  const [classTeacherAssignments, setClassTeacherAssignments] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [students, setStudents] = useState([]);
  const [fees, setFees] = useState([]);
  const [classFilter, setClassFilter] = useState({
    batch: "ELEVEN",
    faculty: "SCIENCE",
    section: "BIO",
  });
  const [attendanceFilter, setAttendanceFilter] = useState({
    batch: "ELEVEN",
    faculty: "SCIENCE",
    section: "BIO",
  });
  const [attendanceSummary, setAttendanceSummary] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [dashboardMonth, setDashboardMonth] = useState(() => new Date().getMonth() + 1);
  const [dashboardYear, setDashboardYear] = useState(() => new Date().getFullYear());
  

  const [studentForm, setStudentForm] = useState({
    firstName: "",
    lastName: "",
    batch: "ELEVEN",
    faculty: "SCIENCE",
    section: "BIO",
    grade8Score: "",
    grade9Score: "",
    grade10Score: "",
    motherJob: "teacher",
    fatherJob: "teacher",
    travelTime: 1,
  });

  const [feeForm, setFeeForm] = useState({
    studentId: "",
    title: "",
    amount: "",
    dueDate: "",
  });

  const loadAdminData = useCallback(async () => {
    if (!token || user?.role !== "ADMIN") return;

    setLoading(true);
    setError("");
    try {
      const analyticsQuery = new URLSearchParams({
        month: String(dashboardMonth),
        year: String(dashboardYear),
      }).toString();
      const [usersRes, attendanceRes, analyticsRes, teacherAssignmentRes, classTeacherRes, studentsRes, feeRes] = await Promise.all([
        api("/api/users", { token }),
        api("/api/subjects", { token }),
        api(`/api/analytics/admin/overview?${analyticsQuery}`, { token }),
        api("/api/teacher-subject-assignments", { token }),
        api("/api/class-teacher-assignments", { token }),
        api("/api/students", { token }),
        api("/api/fees", { token }),
      ]);
      setUsers(usersRes.users || []);
      const subjectRows = attendanceRes.subjects || [];
      setSubjects(subjectRows);
      setTeacherAssignments(teacherAssignmentRes.assignments || []);
      setClassTeacherAssignments(classTeacherRes.assignments || []);
      setAllStudents(studentsRes.students || []);
      setFees(feeRes.fees || []);

      setAnalytics(analyticsRes);
    } catch (e) {
      setError(e.message || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }, [token, user?.role, dashboardMonth, dashboardYear]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  useEffect(() => {
    if (!token || user?.role !== "ADMIN") return;
    const q = new URLSearchParams({
      batch: attendanceFilter.batch,
      faculty: attendanceFilter.faculty,
      section: attendanceFilter.section,
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

  const filteredAllStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return allStudents;
    return allStudents.filter((s) => {
      const hay = `${s.firstName} ${s.lastName} ${s.rollNumber} ${s.user?.email || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [allStudents, studentSearch]);

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

  const nextRollNumber = useMemo(() => {
    const classStudents = allStudents.filter((s) => (
      s.batch === studentForm.batch &&
      s.faculty === studentForm.faculty &&
      s.section === studentForm.section
    ));
    const maxRoll = classStudents.reduce((max, s) => {
      const n = Number(s.rollNumber);
      return Number.isFinite(n) && n > max ? n : max;
    }, 0);
    return String(maxRoll + 1);
  }, [allStudents, studentForm.batch, studentForm.faculty, studentForm.section]);

  async function handleCreateStudent(e) {
    e.preventDefault();
    setSubmittingStudent(true);
    setError("");
    setNotice("");
    const grade8Score = Number(studentForm.grade8Score);
    const grade9Score = Number(studentForm.grade9Score);
    const grade10Score = Number(studentForm.grade10Score);

    if (studentForm.grade8Score === "" || !Number.isFinite(grade8Score) || grade8Score < 0 || grade8Score > 100) {
      setError("Enter a valid Grade 8 score (0-100).");
      setSubmittingStudent(false);
      return;
    }
    if (studentForm.grade9Score === "" || !Number.isFinite(grade9Score) || grade9Score < 0 || grade9Score > 100) {
      setError("Enter a valid Grade 9 score (0-100).");
      setSubmittingStudent(false);
      return;
    }
    if (studentForm.grade10Score === "" || !Number.isFinite(grade10Score) || grade10Score < 0 || grade10Score > 100) {
      setError("Enter a valid Grade 10 score (0-100).");
      setSubmittingStudent(false);
      return;
    }
    try {
      const res = await api("/api/students", {
        token,
        method: "POST",
        body: {
          ...studentForm,
          grade8Score,
          grade9Score,
          grade10Score,
          travelTime: Number(studentForm.travelTime),
        },
      });
      const createdStudent = res.student;
      if (createdStudent) {
        setAllStudents((prev) => [createdStudent, ...prev]);
        if (
          createdStudent.batch === classFilter.batch &&
          createdStudent.faculty === classFilter.faculty &&
          createdStudent.section === classFilter.section
        ) {
          setStudents((prev) => [createdStudent, ...prev]);
        }
      }
      setNotice("Student created successfully.");
      setStudentForm({
        firstName: "",
        lastName: "",
        batch: "ELEVEN",
        faculty: "SCIENCE",
        section: "BIO",
        grade8Score: "",
        grade9Score: "",
        grade10Score: "",
        motherJob: "teacher",
        fatherJob: "teacher",
        travelTime: 1,
      });
      setTab("students");
    } catch (e) {
      setError(e.message || "Unable to create student");
    } finally {
      setSubmittingStudent(false);
    }
  }

  async function handleUpdateStudentScores(studentId, payload) {
    setUpdatingStudentId(studentId);
    setError("");
    setNotice("");
    try {
      const res = await api(`/api/students/${studentId}`, {
        token,
        method: "PUT",
        body: payload,
      });
      const updated = res.student;
      if (updated) {
        setAllStudents((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        setStudents((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      }
      setNotice("Student scores updated successfully.");
      return true;
    } catch (e) {
      setError(e.message || "Unable to update student scores");
      return false;
    } finally {
      setUpdatingStudentId(null);
    }
  }

  async function handleCreateFee(e) {
    e.preventDefault();
    setSubmittingFee(true);
    setError("");
    setNotice("");

    const studentId = Number(feeForm.studentId);
    const amount = Number(feeForm.amount);
    const title = feeForm.title.trim();
    if (!Number.isInteger(studentId)) {
      setError("Select a student to assign the fee.");
      setSubmittingFee(false);
      return;
    }
    if (!title) {
      setError("Enter a fee title.");
      setSubmittingFee(false);
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid fee amount.");
      setSubmittingFee(false);
      return;
    }

    try {
      await api("/api/fees", {
        token,
        method: "POST",
        body: {
          studentId,
          title,
          amount,
          dueDate: feeForm.dueDate || null,
        },
      });
      setNotice("Fee created successfully.");
      setFeeForm({ studentId: "", title: "", amount: "", dueDate: "" });
      await loadAdminData();
      setTab("fees");
    } catch (e) {
      setError(e.message || "Unable to create fee");
    } finally {
      setSubmittingFee(false);
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

  async function handleAssignClassTeacher(payload) {
    setSubmittingTeacher(true);
    setError("");
    setNotice("");
    try {
      await api("/api/class-teacher-assignments", {
        token,
        method: "PUT",
        body: payload,
      });
      setNotice("Class teacher assigned successfully.");
      await loadAdminData();
    } catch (e) {
      setError(e.message || "Unable to assign class teacher");
    } finally {
      setSubmittingTeacher(false);
    }
  }

  async function handleRemoveClassTeacher(assignment) {
    const ok = window.confirm(`Remove class teacher for ${assignment.batch} / ${assignment.faculty} / ${assignment.section}?`);
    if (!ok) return;

    setDeletingClassTeacherId(assignment.id);
    setError("");
    setNotice("");
    try {
      await api(`/api/class-teacher-assignments/${assignment.id}`, {
        token,
        method: "DELETE",
      });
      setNotice("Class teacher assignment removed.");
      await loadAdminData();
    } catch (e) {
      setError(e.message || "Unable to remove class teacher assignment");
    } finally {
      setDeletingClassTeacherId(null);
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
            students={allStudents}
            analytics={analytics}
            loading={loading}
            month={dashboardMonth}
            year={dashboardYear}
            onPeriodChange={(nextMonth, nextYear) => {
              setDashboardMonth(nextMonth);
              setDashboardYear(nextYear);
            }}
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
            classTeacherAssignments={classTeacherAssignments}
            submitting={submittingTeacher}
            onCreateTeacher={handleCreateTeacher}
            onUpdateTeacher={handleUpdateTeacher}
            onDeleteTeacher={handleDeleteUser}
            deletingUserId={deletingUserId}
          />
        ) : null}

        {tab === "class-teachers" ? (
          <ClassTeachersSection
            teachers={teacherUsers}
            assignments={classTeacherAssignments}
            submitting={submittingTeacher}
            deletingAssignmentId={deletingClassTeacherId}
            onAssign={handleAssignClassTeacher}
            onRemove={handleRemoveClassTeacher}
          />
        ) : null}

        {tab === "students" ? (
          <StudentsSection
            loading={loading}
            allStudents={filteredAllStudents}
            students={filteredStudents}
            nextRollNumber={nextRollNumber}
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
            onUpdateStudentScores={handleUpdateStudentScores}
            updatingStudentId={updatingStudentId}
          />
        ) : null}

        {tab === "fees" ? (
          <FeesSection
            fees={fees}
            students={allStudents}
            feeForm={feeForm}
            onFeeFormChange={(field, value) => setFeeForm((prev) => ({ ...prev, [field]: value }))}
            onGenerateMonthly={async (payload) => {
              setSubmittingFee(true);
              setError("");
              setNotice("");
              const month = Number(payload.month);
              const year = Number(payload.year);
              const amount = payload.amount ? Number(payload.amount) : undefined;
              if (!Number.isInteger(month) || month < 1 || month > 12) {
                setError("Select a valid month.");
                setSubmittingFee(false);
                return;
              }
              if (!Number.isInteger(year) || year < 2000 || year > 2100) {
                setError("Select a valid year.");
                setSubmittingFee(false);
                return;
              }
              if (payload.amount && (!Number.isFinite(amount) || amount <= 0)) {
                setError("Enter a valid monthly amount.");
                setSubmittingFee(false);
                return;
              }

              try {
                const res = await api("/api/fees/monthly/generate", {
                  token,
                  method: "POST",
                  body: {
                    month,
                    year,
                    amount,
                    title: payload.title?.trim() || undefined,
                  },
                });
                setNotice(`Monthly fees generated for ${res.month}/${res.year}: ${res.created} created, ${res.skipped} skipped.`);
                await loadAdminData();
                setTab("fees");
              } catch (e) {
                setError(e.message || "Unable to generate monthly fees");
              } finally {
                setSubmittingFee(false);
              }
            }}
            onSubmit={handleCreateFee}
            submitting={submittingFee}
          />
        ) : null}

        {tab === "attendance" ? (
          <AttendanceSummarySection
            loading={loading}
            summary={attendanceSummary}
            filter={attendanceFilter}
            onFilterChange={(field, value) => {
              setAttendanceFilter((prev) => {
                if (field === "faculty") {
                  const nextSection = value === "SCIENCE" ? "BIO" : "ECONOMICS";
                  return {
                    ...prev,
                    faculty: value,
                    section: nextSection,
                  };
                }
                return { ...prev, [field]: value };
              });
            }}
          />
        ) : null}
        {tab === "notices" ? (
          <NoticesSection token={token} users={users} students={allStudents} onCreated={loadAdminData} />
        ) : null}

        {tab === "predictions" ? (
          <PredictionsSection token={token} />
        ) : null}
      </main>
    </div>
  );
}
