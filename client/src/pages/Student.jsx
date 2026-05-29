import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../state/useAuth.jsx";
import { api } from "../api";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const CHART_COLORS = {
  present: "var(--color-primary)",
  absent: "var(--color-error)",
  neutral: "var(--color-outline-variant)",
  surface: "var(--color-surface-container-lowest)",
  surfaceBorder: "var(--color-outline-variant)",
  text: "var(--color-on-surface)",
  textSecondary: "var(--color-secondary)",
};

const PIE_COLORS = [CHART_COLORS.present, CHART_COLORS.absent];

function formatShortDateTick(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function piePercentLabel({ percent }) {
  return `${Math.round((percent || 0) * 100)}%`;
}

export default function Student() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("notices");
  const [notices, setNotices] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [fees, setFees] = useState([]);
  const [studentProfile, setStudentProfile] = useState(null);
  const [marks, setMarks] = useState([]);
  const [attendanceAnalytics, setAttendanceAnalytics] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [performanceLoading, setPerformanceLoading] = useState(true);
  const [performanceError, setPerformanceError] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [submittingAssignmentId, setSubmittingAssignmentId] = useState(null);
  const [notesByAssignment, setNotesByAssignment] = useState({});
  const [filesByAssignment, setFilesByAssignment] = useState({});

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      api("/api/notices", { token }),
      api("/api/assignments/student", { token }),
      api("/api/fees/student", { token }),
      api("/api/students/me", { token }),
      api("/api/students/me/marks", { token }),
    ])
      .then(([noticeRes, assignmentRes, feeRes, studentRes, marksRes]) => {
        setNotices(noticeRes.notices || []);
        setAssignments(assignmentRes.assignments || []);
        setFees(feeRes.fees || []);
        setStudentProfile(studentRes.student || null);
        setMarks(marksRes.marks || []);
      })
      .catch((e) => setError(e.message || "Failed to load student data"))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const query = new URLSearchParams();
    if (selectedMonth && selectedYear) {
      query.set("month", String(selectedMonth));
      query.set("year", String(selectedYear));
    }
    const path = query.toString()
      ? `/api/analytics/student/overview?${query}`
      : "/api/analytics/student/overview";

    setPerformanceLoading(true);
    setPerformanceError("");
    api(path, { token })
      .then((res) => setAttendanceAnalytics(res))
      .catch((e) => setPerformanceError(e.message || "Failed to load analytics"))
      .finally(() => setPerformanceLoading(false));
  }, [token, selectedMonth, selectedYear]);

  async function markRead(id) {
    try {
      await api(`/api/notices/${id}/read`, { token, method: "POST" });
      setNotices((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (e) {
      setError(e.message || "Failed to mark read");
    }
  }

  async function submitAssignment(assignmentId) {
    setSubmittingAssignmentId(assignmentId);
    setError("");
    try {
      const formData = new FormData();
      formData.append("note", notesByAssignment[assignmentId] || "");
      const selectedFile = filesByAssignment[assignmentId];
      if (selectedFile) formData.append("attachment", selectedFile);

      const res = await fetch(`${API_URL}/api/assignments/${assignmentId}/submission`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to submit assignment");

      const refreshed = await api("/api/assignments/student", { token });
      setAssignments(refreshed.assignments || []);
    } catch (e) {
      setError(e.message || "Failed to submit assignment");
    } finally {
      setSubmittingAssignmentId(null);
    }
  }

  function payFee(feeId) {
    setError("");
    navigate(`/student/fees/pay/${feeId}`);
  }

  const periodLabel = attendanceAnalytics?.periodLabel || "Current Month";
  const attendanceKpis = attendanceAnalytics?.kpis || {
    attendancePercent: 0,
    totalPresent: 0,
    totalAbsent: 0,
    totalDays: 0,
  };
  const attendanceTrend = attendanceAnalytics?.trend || [];
  const attendanceDistribution = attendanceAnalytics?.distribution || [];
  const recentAttendance = attendanceAnalytics?.recentAttendance || [];

  const monthOptions = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];
  const yearOptions = [selectedYear - 1, selectedYear, selectedYear + 1];
  const latestMark = marks[0] || null;

  return (
    <div className="min-h-screen bg-background text-on-surface pb-16">
      <div className="max-w-3xl mx-auto px-5 py-6">
        <div className="flex items-center justify-between mb-6 bg-surface-container-high rounded-xl p-4 border">
          <div>
            <h1 className="text-2xl font-bold">Student Dashboard</h1>
            <div className="text-sm text-secondary">Signed in as {user?.name}</div>
          </div>
          <button onClick={logout} className="px-3 py-2 rounded-lg bg-primary text-on-primary text-sm font-medium">Logout</button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="rounded-xl border bg-surface-container-high p-4">
            <div className="text-xs uppercase text-secondary">Total Notices</div>
            <div className="text-2xl font-bold mt-1">{notices.length}</div>
          </div>
          <div className="rounded-xl border bg-surface-container-high p-4">
            <div className="text-xs uppercase text-secondary">Assignments</div>
            <div className="text-2xl font-bold mt-1">{assignments.length}</div>
          </div>
          <div className="rounded-xl border bg-surface-container-high p-4">
            <div className="text-xs uppercase text-secondary">Fees</div>
            <div className="text-2xl font-bold mt-1">{fees.length}</div>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setTab("notices")}
            className={`px-4 py-2 rounded-full text-sm font-semibold ${tab === "notices" ? "bg-primary text-on-primary" : "bg-surface-container-high text-secondary"}`}
          >
            Notices
          </button>
          <button
            type="button"
            onClick={() => setTab("assignments")}
            className={`px-4 py-2 rounded-full text-sm font-semibold ${tab === "assignments" ? "bg-primary text-on-primary" : "bg-surface-container-high text-secondary"}`}
          >
            Assignments
          </button>
          <button
            type="button"
            onClick={() => setTab("fees")}
            className={`px-4 py-2 rounded-full text-sm font-semibold ${tab === "fees" ? "bg-primary text-on-primary" : "bg-surface-container-high text-secondary"}`}
          >
            Fees
          </button>
          <button
            type="button"
            onClick={() => setTab("performance")}
            className={`px-4 py-2 rounded-full text-sm font-semibold ${tab === "performance" ? "bg-primary text-on-primary" : "bg-surface-container-high text-secondary"}`}
          >
            Performance
          </button>
        </div>

        {error ? <p className="text-sm text-error">{error}</p> : null}

        {loading ? <p className="text-secondary">Loading notices...</p> : null}
        {!loading && notices.length === 0 ? <p className="text-secondary">No notices.</p> : null}

        {tab === "notices" ? <ul className="space-y-4">
          {notices.map((n) => (
            <li key={n.id} className="p-4 bg-surface-container-high rounded-lg border">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{n.title}</h3>
                  <p className="text-sm text-secondary mt-1 whitespace-pre-wrap">{n.body}</p>
                  <div className="text-xs text-secondary mt-2">From: {n.author?.name || "Admin"} • {new Date(n.createdAt).toLocaleString()}</div>
                </div>
                <div className="ml-4">
                  {n.read ? (
                    <span className="text-xs text-secondary">Read</span>
                  ) : (
                    <button onClick={() => markRead(n.id)} className="px-3 py-1 rounded bg-primary text-on-primary text-sm">Mark read</button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul> : null}

        {tab === "assignments" ? (
          <div className="space-y-4">
            {!loading && assignments.length === 0 ? <p className="text-secondary">No assignments for your class yet.</p> : null}
            {assignments.map((a) => (
              <div key={a.id} className="p-4 bg-surface-container-high rounded-lg border">
                <h3 className="font-semibold text-lg">{a.title}</h3>
                <p className="text-sm text-secondary mt-1 whitespace-pre-wrap">{a.description || "No description"}</p>
                <div className="text-xs text-secondary mt-2">Due: {a.dueDate ? new Date(a.dueDate).toLocaleDateString() : "No due date"}</div>
                <div className="text-xs text-secondary">Posted by: {a.createdBy?.name || "Teacher"}</div>
                {a.attachmentUrl ? (
                  <a className="text-xs text-primary underline" href={`${API_URL}${a.attachmentUrl}`} target="_blank" rel="noreferrer">
                    Download assignment file ({a.attachmentName || "attachment"})
                  </a>
                ) : null}

                <div className="mt-3 border-t pt-3 space-y-2">
                  <textarea
                    value={notesByAssignment[a.id] || ""}
                    onChange={(e) => setNotesByAssignment((prev) => ({ ...prev, [a.id]: e.target.value }))}
                    placeholder="Write your submission note (optional)"
                    rows={3}
                    className="w-full border rounded px-3 py-2"
                  />
                  <input
                    type="file"
                    onChange={(e) => setFilesByAssignment((prev) => ({ ...prev, [a.id]: e.target.files?.[0] || null }))}
                    className="w-full border rounded px-3 py-2"
                  />
                  <button
                    type="button"
                    onClick={() => submitAssignment(a.id)}
                    disabled={submittingAssignmentId === a.id}
                    className="px-4 py-2 rounded bg-primary text-on-primary text-sm"
                  >
                    {submittingAssignmentId === a.id ? "Submitting..." : a.submission ? "Update Submission" : "Submit Assignment"}
                  </button>

                  {a.submission ? (
                    <div className="text-xs text-secondary">
                      Submitted: {new Date(a.submission.submittedAt).toLocaleString()}
                      {a.submission.attachmentUrl ? (
                        <div>
                          <a className="text-primary underline" href={`${API_URL}${a.submission.attachmentUrl}`} target="_blank" rel="noreferrer">
                            View submitted file ({a.submission.attachmentName || "file"})
                          </a>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {tab === "fees" ? (
          <div className="space-y-4">
            {!loading && fees.length === 0 ? <p className="text-secondary">No fees assigned yet.</p> : null}
            {fees.map((fee) => (
              <div key={fee.id} className="p-4 bg-surface-container-high rounded-lg border">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-lg">{fee.title}</h3>
                    <div className="text-sm text-secondary mt-1">Amount: {fee.amount}</div>
                    <div className="text-xs text-secondary mt-1">
                      Due: {fee.dueDate ? new Date(fee.dueDate).toLocaleDateString() : "No due date"}
                    </div>
                    <div className="text-xs text-secondary">
                      Status: {fee.status}
                      {fee.paidAt ? ` • Paid ${new Date(fee.paidAt).toLocaleDateString()}` : ""}
                    </div>
                    {fee.paymentStatus ? (
                      <div className="text-xs text-secondary">Payment: {fee.paymentStatus}</div>
                    ) : null}
                    {fee.paymentRef ? (
                      <div className="text-xs text-secondary">Reference: {fee.paymentRef}</div>
                    ) : null}
                  </div>
                  {fee.status === "PENDING" ? (
                    <button
                      type="button"
                      onClick={() => payFee(fee.id)}
                      className="px-3 py-2 rounded bg-primary text-on-primary text-sm"
                    >
                      Pay Fee
                    </button>
                  ) : (
                    <span className="text-xs text-secondary">Paid</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {tab === "performance" ? (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold">Attendance & Grades</h2>
                <p className="text-sm text-secondary">Track your monthly attendance and recent grades at a glance.</p>
                {studentProfile ? (
                  <p className="text-xs text-secondary mt-1">
                    Class: {studentProfile.batch} {studentProfile.faculty} {studentProfile.section} • Roll: {studentProfile.rollNumber}
                  </p>
                ) : null}
              </div>
              <div className="flex gap-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="border rounded-lg px-3 py-2 text-sm bg-surface-container-high"
                >
                  {monthOptions.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="border rounded-lg px-3 py-2 text-sm bg-surface-container-high"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {performanceError ? <p className="text-sm text-error">{performanceError}</p> : null}
            {performanceLoading ? <p className="text-secondary">Loading analytics...</p> : null}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border bg-surface-container-high p-4">
                <div className="text-xs uppercase text-secondary">Attendance %</div>
                <div className="text-2xl font-bold mt-1">{attendanceKpis.attendancePercent}%</div>
                <div className="text-xs text-secondary mt-1">{periodLabel}</div>
              </div>
              <div className="rounded-xl border bg-surface-container-high p-4">
                <div className="text-xs uppercase text-secondary">Present Days</div>
                <div className="text-2xl font-bold mt-1">{attendanceKpis.totalPresent}</div>
              </div>
              <div className="rounded-xl border bg-surface-container-high p-4">
                <div className="text-xs uppercase text-secondary">Absent Days</div>
                <div className="text-2xl font-bold mt-1">{attendanceKpis.totalAbsent}</div>
              </div>
              <div className="rounded-xl border bg-surface-container-high p-4">
                <div className="text-xs uppercase text-secondary">Total Days</div>
                <div className="text-2xl font-bold mt-1">{attendanceKpis.totalDays}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 rounded-2xl border bg-surface-container-high p-5">
                <h3 className="font-semibold text-lg mb-4">Attendance Trend ({periodLabel})</h3>
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={attendanceTrend} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke={CHART_COLORS.neutral} strokeDasharray="3 3" opacity={0.35} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatShortDateTick}
                        minTickGap={24}
                        tick={{ fill: CHART_COLORS.textSecondary, fontSize: 12 }}
                        axisLine={{ stroke: CHART_COLORS.surfaceBorder, opacity: 0.6 }}
                        tickLine={{ stroke: CHART_COLORS.surfaceBorder, opacity: 0.6 }}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: CHART_COLORS.textSecondary, fontSize: 12 }}
                        axisLine={{ stroke: CHART_COLORS.surfaceBorder, opacity: 0.6 }}
                        tickLine={{ stroke: CHART_COLORS.surfaceBorder, opacity: 0.6 }}
                      />
                      <Tooltip
                        formatter={(value, name) => [value, name === "present" ? "Present" : "Absent"]}
                        contentStyle={{ backgroundColor: CHART_COLORS.surface, borderColor: CHART_COLORS.surfaceBorder, color: CHART_COLORS.text, borderRadius: 12 }}
                        itemStyle={{ color: CHART_COLORS.text }}
                        labelStyle={{ color: CHART_COLORS.textSecondary }}
                      />
                      <Legend wrapperStyle={{ color: CHART_COLORS.textSecondary, fontSize: 12 }} />
                      <Line type="monotone" dataKey="present" name="Present" stroke={CHART_COLORS.present} strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="absent" name="Absent" stroke={CHART_COLORS.absent} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-2xl border bg-surface-container-high p-5">
                <h3 className="font-semibold text-lg mb-4">Present vs Absent</h3>
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={attendanceDistribution}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={48}
                        outerRadius={90}
                        label={piePercentLabel}
                        labelLine={false}
                      >
                        {attendanceDistribution.map((entry, index) => (
                          <Cell key={`${entry.name}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: CHART_COLORS.surface, borderColor: CHART_COLORS.surfaceBorder, color: CHART_COLORS.text, borderRadius: 12 }}
                        itemStyle={{ color: CHART_COLORS.text }}
                        labelStyle={{ color: CHART_COLORS.textSecondary }}
                      />
                      <Legend wrapperStyle={{ color: CHART_COLORS.textSecondary, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-secondary mt-2">Use the month selector to update the chart.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-2xl border bg-surface-container-high p-5">
                <h3 className="font-semibold text-lg mb-4">Recent Attendance</h3>
                {recentAttendance.length === 0 ? (
                  <p className="text-sm text-secondary">No attendance recorded for this month yet.</p>
                ) : (
                  <div className="space-y-3">
                    {recentAttendance.map((row, idx) => (
                      <div key={`${row.date}-${idx}`} className="flex items-center justify-between border-b pb-2">
                        <span className="text-sm">{new Date(row.date).toLocaleDateString()}</span>
                        <span className={`text-xs font-semibold ${row.present ? "text-primary" : "text-error"}`}>
                          {row.present ? "Present" : "Absent"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="rounded-2xl border bg-surface-container-high p-5">
                <h3 className="font-semibold text-lg mb-4">Latest Grade</h3>
                {!latestMark ? (
                  <p className="text-sm text-secondary">No grades recorded yet. Your teachers will update this section.</p>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-secondary">Recorded</div>
                      <div className="text-sm">{new Date(latestMark.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="rounded-lg border bg-surface-container-low p-3">
                        <div className="text-xs text-secondary">Subject</div>
                        <div className="text-lg font-semibold">{latestMark.subject?.name || "-"}</div>
                      </div>
                      <div className="rounded-lg border bg-surface-container-low p-3">
                        <div className="text-xs text-secondary">Midterm</div>
                        <div className="text-lg font-semibold">{latestMark.g1 !== undefined && latestMark.g1 !== null ? (Number(latestMark.g1) * 5).toFixed(1) : "-"}</div>
                      </div>
                      <div className="rounded-lg border bg-surface-container-low p-3">
                        <div className="text-xs text-secondary">Pre-Board</div>
                        <div className="text-lg font-semibold">{latestMark.g2 !== undefined && latestMark.g2 !== null ? (Number(latestMark.g2) * 5).toFixed(1) : "-"}</div>
                      </div>
                    </div>
                    <div className="text-xs text-secondary">Teacher: {latestMark.teacher?.name || "Unknown"}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border bg-surface-container-high p-5">
              <h3 className="font-semibold text-lg mb-4">Grade History</h3>
              {marks.length === 0 ? (
                <p className="text-sm text-secondary">No grades recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {marks.slice(0, 6).map((mark) => (
                    <div key={mark.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-2">
                      <div>
                        <div className="font-medium">{new Date(mark.createdAt).toLocaleDateString()}</div>
                        <div className="text-xs text-secondary">Teacher: {mark.teacher?.name || "Unknown"}</div>
                      </div>
                      <div className="flex gap-3 text-sm mt-2 sm:mt-0">
                        <span>Subject: {mark.subject?.name || "-"}</span>
                        <span>Midterm: {mark.g1 !== undefined && mark.g1 !== null ? (Number(mark.g1) * 5).toFixed(1) : "-"}</span>
                        <span>Pre-Board: {mark.g2 !== undefined && mark.g2 !== null ? (Number(mark.g2) * 5).toFixed(1) : "-"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
