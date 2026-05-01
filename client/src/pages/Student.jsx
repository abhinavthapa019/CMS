import { useEffect, useState } from "react";
import { useAuth } from "../state/useAuth.jsx";
import { api } from "../api";

export default function Student() {
  const { user, token, logout } = useAuth();
  const [tab, setTab] = useState("notices");
  const [notices, setNotices] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submittingAssignmentId, setSubmittingAssignmentId] = useState(null);
  const [notesByAssignment, setNotesByAssignment] = useState({});
  const [filesByAssignment, setFilesByAssignment] = useState({});

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([api("/api/notices", { token }), api("/api/assignments/student", { token })])
      .then(([noticeRes, assignmentRes]) => {
        setNotices(noticeRes.notices || []);
        setAssignments(assignmentRes.assignments || []);
      })
      .catch((e) => setError(e.message || "Failed to load student data"))
      .finally(() => setLoading(false));
  }, [token]);

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

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="rounded-xl border bg-surface-container-high p-4">
            <div className="text-xs uppercase text-secondary">Total Notices</div>
            <div className="text-2xl font-bold mt-1">{notices.length}</div>
          </div>
          <div className="rounded-xl border bg-surface-container-high p-4">
            <div className="text-xs uppercase text-secondary">Assignments</div>
            <div className="text-2xl font-bold mt-1">{assignments.length}</div>
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
      </div>
    </div>
  );
}
