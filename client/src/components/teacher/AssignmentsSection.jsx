import { useEffect, useMemo, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function authJson(path, token) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export default function AssignmentsSection({ token, classOptions = [] }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [classKey, setClassKey] = useState("");
  const [attachment, setAttachment] = useState(null);

  const [assignments, setAssignments] = useState([]);
  const [submissionMap, setSubmissionMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!classKey && classOptions.length > 0) {
      const first = classOptions[0];
      setClassKey(`${first.batch}|${first.faculty}|${first.section}`);
    }
  }, [classKey, classOptions]);

  async function loadAssignments() {
    setLoading(true);
    try {
      const res = await authJson("/api/assignments/teacher", token);
      setAssignments(res.assignments || []);
    } catch (e) {
      setError(e.message || "Failed to load assignments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    loadAssignments();
  }, [token]);

  async function handleCreate(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setNotice("");

    try {
      const [batch, faculty, section] = classKey.split("|");
      if (!batch || !faculty || !section) {
        throw new Error("Please choose class");
      }

      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("batch", batch);
      formData.append("faculty", faculty);
      formData.append("section", section);
      if (dueDate) formData.append("dueDate", new Date(`${dueDate}T00:00:00.000Z`).toISOString());
      if (attachment) formData.append("attachment", attachment);

      const res = await fetch(`${API_URL}/api/assignments`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to create assignment");

      setTitle("");
      setDescription("");
      setDueDate("");
      setAttachment(null);
      setNotice("Assignment posted successfully.");
      await loadAssignments();
    } catch (e) {
      setError(e.message || "Failed to create assignment");
    } finally {
      setSubmitting(false);
    }
  }

  async function loadSubmissions(assignmentId) {
    try {
      const res = await authJson(`/api/assignments/${assignmentId}/submissions`, token);
      setSubmissionMap((prev) => ({ ...prev, [assignmentId]: res.submissions || [] }));
    } catch (e) {
      setError(e.message || "Failed to load submissions");
    }
  }

  const assignmentRows = useMemo(() => assignments || [], [assignments]);

  return (
    <section className="space-y-6">
      <div className="rounded-xl border bg-surface-container-high p-4">
        <h3 className="text-lg font-semibold">Post Assignment</h3>
        <form className="mt-3 space-y-3" onSubmit={handleCreate}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Assignment title"
            className="w-full border rounded px-3 py-2"
            required
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description / instructions"
            className="w-full border rounded px-3 py-2"
            rows={4}
          />
          <div className="grid md:grid-cols-3 gap-3">
            <select value={classKey} onChange={(e) => setClassKey(e.target.value)} className="border rounded px-3 py-2" required>
              {classOptions.length === 0 ? <option value="">No classes assigned</option> : null}
              {classOptions.map((opt) => (
                <option key={`${opt.batch}|${opt.faculty}|${opt.section}`} value={`${opt.batch}|${opt.faculty}|${opt.section}`}>
                  {opt.label || `${opt.batch} / ${opt.faculty} / ${opt.section}`}
                </option>
              ))}
            </select>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="border rounded px-3 py-2" />
            <input type="file" onChange={(e) => setAttachment(e.target.files?.[0] || null)} className="border rounded px-3 py-2" />
          </div>

          {error ? <p className="text-sm text-error">{error}</p> : null}
          {notice ? <p className="text-sm text-green-700">{notice}</p> : null}

          <button disabled={submitting} className="px-4 py-2 rounded bg-primary text-on-primary text-sm font-semibold">
            {submitting ? "Posting..." : "Post Assignment"}
          </button>
        </form>
      </div>

      <div className="rounded-xl border bg-surface-container-high p-4">
        <h3 className="text-lg font-semibold">My Assignments</h3>
        {loading ? <p className="text-sm text-secondary mt-2">Loading assignments...</p> : null}
        {!loading && assignmentRows.length === 0 ? <p className="text-sm text-secondary mt-2">No assignments posted yet.</p> : null}

        <div className="space-y-3 mt-3">
          {assignmentRows.map((a) => (
            <div key={a.id} className="border rounded-lg p-3 bg-white/70">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-semibold">{a.title}</h4>
                  <p className="text-sm text-secondary whitespace-pre-wrap">{a.description || "No description"}</p>
                  <p className="text-xs text-secondary mt-1">
                    Class: {a.batch} / {a.faculty} / {a.section}
                  </p>
                  <p className="text-xs text-secondary">Due: {a.dueDate ? new Date(a.dueDate).toLocaleDateString() : "No due date"}</p>
                  {a.attachmentUrl ? (
                    <a className="text-xs text-primary underline" href={`${API_URL}${a.attachmentUrl}`} target="_blank" rel="noreferrer">
                      Attachment: {a.attachmentName || "Download"}
                    </a>
                  ) : null}
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">{a._count?.submissions || 0} submissions</div>
                  <button
                    className="mt-2 px-3 py-1 rounded border text-sm"
                    onClick={() => loadSubmissions(a.id)}
                    type="button"
                  >
                    View submissions
                  </button>
                </div>
              </div>

              {submissionMap[a.id] ? (
                <div className="mt-3 border-t pt-3 space-y-2">
                  {submissionMap[a.id].length === 0 ? <p className="text-xs text-secondary">No submissions yet.</p> : null}
                  {submissionMap[a.id].map((s) => (
                    <div key={s.id} className="text-sm bg-surface-container-high p-2 rounded">
                      <div className="font-medium">{s.student.firstName} {s.student.lastName} (#{s.student.rollNumber})</div>
                      <div className="text-xs text-secondary">Submitted: {new Date(s.submittedAt).toLocaleString()}</div>
                      {s.note ? <div className="mt-1">{s.note}</div> : null}
                      {s.attachmentUrl ? (
                        <a className="text-xs text-primary underline" href={`${API_URL}${s.attachmentUrl}`} target="_blank" rel="noreferrer">
                          Submission file: {s.attachmentName || "Download"}
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
