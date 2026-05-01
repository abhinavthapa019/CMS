import { useEffect, useState } from "react";
import { api } from "../../api";

export default function NoticesSection({ token, users, students, onCreated }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [scope, setScope] = useState("ALL");
  const [batch, setBatch] = useState("ELEVEN");
  const [faculty, setFaculty] = useState("SCIENCE");
  const [section, setSection] = useState("BIO");
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState("");

  async function loadHistory() {
    if (!token) return;
    setLoadingHistory(true);
    setHistoryError("");
    try {
      const res = await api("/api/notices/admin", { token });
      setHistory(res.notices || []);
    } catch (e) {
      setHistoryError(e.message || "Failed to load past notices");
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    // reset recipients when scope changes
    setSelectedUsers(new Set());
  }, [scope]);

  function toggleUser(id) {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const bodyPayload = { title, body, scope };
      if (scope === "CLASS") {
        bodyPayload.batch = batch;
        bodyPayload.faculty = faculty;
        bodyPayload.section = section;
      }
      if (scope === "INDIVIDUAL") {
        bodyPayload.recipientIds = Array.from(selectedUsers);
      }
      await api("/api/notices", { token, method: "POST", body: bodyPayload });
      setTitle(""); setBody(""); setScope("ALL");
      if (onCreated) onCreated();
      await loadHistory();
    } catch (e) {
      setError(e.message || "Failed to create notice");
    } finally {
      setSubmitting(false);
    }
  }

  const studentUsers = students.filter((s) => s.userId).map((s) => ({ id: s.userId, label: `${s.firstName} ${s.lastName} (${s.batch}-${s.section}-${s.rollNumber})` }));
  const teacherUsers = users.filter((u) => u.role === "TEACHER").map((u) => ({ id: u.id, label: `${u.name} (T)` }));

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Create Notice</h2>
      {error ? <p className="text-sm text-error">{error}</p> : null}
      <form onSubmit={handleSubmit} className="space-y-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full p-2 border rounded" />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Body" className="w-full p-2 border rounded" />

        <div className="flex gap-2 items-center">
          <label className="text-sm">Scope:</label>
          <select value={scope} onChange={(e) => setScope(e.target.value)} className="p-2 border rounded">
            <option value="ALL">All (students & teachers)</option>
            <option value="CLASS">Class</option>
            <option value="INDIVIDUAL">Individual (select recipients)</option>
          </select>
        </div>

        {scope === "CLASS" ? (
          <div className="flex gap-2">
            <select value={batch} onChange={(e) => setBatch(e.target.value)} className="p-2 border rounded">
              <option value="ELEVEN">ELEVEN</option>
              <option value="TWELVE">TWELVE</option>
            </select>
            <select value={faculty} onChange={(e) => setFaculty(e.target.value)} className="p-2 border rounded">
              <option value="SCIENCE">SCIENCE</option>
              <option value="MANAGEMENT">MANAGEMENT</option>
            </select>
            <select value={section} onChange={(e) => setSection(e.target.value)} className="p-2 border rounded">
              <option value="BIO">BIO</option>
              <option value="CS">CS</option>
              <option value="ECONOMICS">ECONOMICS</option>
              <option value="MARKETING">MARKETING</option>
            </select>
          </div>
        ) : null}

        {scope === "INDIVIDUAL" ? (
          <div className="max-h-40 overflow-auto border p-2 rounded grid grid-cols-2 gap-2">
            {[...studentUsers, ...teacherUsers].map((u) => (
              <label key={u.id} className="text-sm flex items-center gap-2">
                <input type="checkbox" checked={selectedUsers.has(u.id)} onChange={() => toggleUser(u.id)} />
                <span>{u.label}</span>
              </label>
            ))}
          </div>
        ) : null}

        <div>
          <button disabled={submitting} className="px-4 py-2 bg-primary text-on-primary rounded">Create Notice</button>
        </div>
      </form>

      <div className="pt-4 border-t">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Past Notices</h3>
          <button
            type="button"
            onClick={loadHistory}
            className="px-3 py-2 rounded-lg bg-surface-container-high text-secondary text-sm font-semibold"
            disabled={loadingHistory}
          >
            {loadingHistory ? "Loading..." : "Refresh"}
          </button>
        </div>

        {historyError ? <p className="text-sm text-error mt-2">{historyError}</p> : null}
        {!loadingHistory && history.length === 0 ? <p className="text-sm text-secondary mt-2">No past notices yet.</p> : null}

        <ul className="space-y-3 mt-3">
          {history.map((n) => (
            <li key={n.id} className="p-4 bg-surface-container-high rounded-lg border">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h4 className="font-semibold truncate">{n.title}</h4>
                  <p className="text-sm text-secondary mt-1 whitespace-pre-wrap">{n.body}</p>
                  <div className="text-xs text-secondary mt-2">
                    Scope: {n.scope}
                    {n.scope === "CLASS" ? ` • ${n.batch}-${n.faculty}-${n.section}` : ""}
                    {n.scope === "INDIVIDUAL" ? " • Individual" : ""}
                    {n.scope === "ALL" ? " • All users" : ""}
                    {" "}• {new Date(n.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="text-xs text-secondary whitespace-nowrap">
                  Read: {n.readCount}/{n.recipientsCount}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
