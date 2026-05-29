import { useState } from "react";
import { BATCH_OPTIONS, FACULTY_OPTIONS, JOB_OPTIONS, SECTION_OPTIONS } from "./constants";
import Field from "./Field";

export default function StudentsSection({
  loading,
  allStudents,
  students,
  nextRollNumber,
  classFilter,
  onClassFilterChange,
  search,
  onSearchChange,
  studentForm,
  onStudentFormChange,
  onSubmit,
  submitting,
  onDeleteStudent,
  deletingStudentId,
  onUpdateStudentScores,
  updatingStudentId,
}) {
  const classSelected = classFilter.batch && classFilter.faculty && classFilter.section;
  const displayBatch = (batch) => (batch === "ELEVEN" ? "11" : batch === "TWELVE" ? "12" : batch);
  const renderEmail = (s) => s?.user?.email || "—";
  const [sortKey, setSortKey] = useState("roll");
  const [sortDir, setSortDir] = useState("asc");
  const [editingId, setEditingId] = useState(null);
  const [editScores, setEditScores] = useState({ grade8Score: "", grade9Score: "", grade10Score: "" });

  const sortByRoll = (a, b) => Number(a.rollNumber || 0) - Number(b.rollNumber || 0);
  const sortByScore = (key) => (a, b) => Number(a[key] || 0) - Number(b[key] || 0);
  const formatScore = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    return Number.isInteger(n) ? String(n) : n.toFixed(1);
  };

  function applySort(rows) {
    const sorted = [...rows];
    if (sortKey === "grade8Score") sorted.sort(sortByScore("grade8Score"));
    else if (sortKey === "grade9Score") sorted.sort(sortByScore("grade9Score"));
    else if (sortKey === "grade10Score") sorted.sort(sortByScore("grade10Score"));
    else sorted.sort(sortByRoll);
    if (sortDir === "desc") sorted.reverse();
    return sorted;
  }

  function beginEdit(student) {
    setEditingId(student.id);
    setEditScores({
      grade8Score: student.grade8Score ?? "",
      grade9Score: student.grade9Score ?? "",
      grade10Score: student.grade10Score ?? "",
    });
  }

  function canSaveScores() {
    if (editScores.grade8Score === "" || editScores.grade9Score === "" || editScores.grade10Score === "") {
      return false;
    }
    const g8 = Number(editScores.grade8Score);
    const g9 = Number(editScores.grade9Score);
    const g10 = Number(editScores.grade10Score);
    return [g8, g9, g10].every((n) => Number.isFinite(n) && n >= 0 && n <= 100);
  }

  return (
    <section className="grid lg:grid-cols-5 gap-4">
      <form onSubmit={onSubmit} className="lg:col-span-2 bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20 space-y-4">
        <h3 className="font-headline text-xl font-bold text-primary">Add Student</h3>
        <Field label="First Name">
          <input
            required
            className="w-full rounded-lg bg-surface-container-highest border-none"
            value={studentForm.firstName}
            onChange={(e) => onStudentFormChange("firstName", e.target.value)}
          />
        </Field>
        <Field label="Last Name">
          <input
            required
            className="w-full rounded-lg bg-surface-container-highest border-none"
            value={studentForm.lastName}
            onChange={(e) => onStudentFormChange("lastName", e.target.value)}
          />
        </Field>
        <Field label="Roll Number">
          <div className="w-full rounded-lg bg-surface-container-highest border border-outline-variant/20 px-3 py-2 text-sm text-secondary">
            Auto-assigned: #{nextRollNumber}
          </div>
        </Field>
        <Field label="Batch">
          <select
            className="w-full rounded-lg bg-surface-container-highest border-none"
            value={studentForm.batch}
            onChange={(e) => onStudentFormChange("batch", e.target.value)}
          >
            {BATCH_OPTIONS.map((b) => (
              <option key={b} value={b}>{displayBatch(b)}</option>
            ))}
          </select>
        </Field>
        <Field label="Faculty">
          <select
            className="w-full rounded-lg bg-surface-container-highest border-none"
            value={studentForm.faculty}
            onChange={(e) => onStudentFormChange("faculty", e.target.value)}
          >
            {FACULTY_OPTIONS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </Field>
        <Field label="Section">
          <select
            className="w-full rounded-lg bg-surface-container-highest border-none"
            value={studentForm.section}
            onChange={(e) => onStudentFormChange("section", e.target.value)}
          >
            {SECTION_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Mother Job">
          <select
            className="w-full rounded-lg bg-surface-container-highest border-none"
            value={studentForm.motherJob}
            onChange={(e) => onStudentFormChange("motherJob", e.target.value)}
          >
            {JOB_OPTIONS.map((j) => (
              <option key={j} value={j}>{j}</option>
            ))}
          </select>
        </Field>
        <Field label="Father Job">
          <select
            className="w-full rounded-lg bg-surface-container-highest border-none"
            value={studentForm.fatherJob}
            onChange={(e) => onStudentFormChange("fatherJob", e.target.value)}
          >
            {JOB_OPTIONS.map((j) => (
              <option key={j} value={j}>{j}</option>
            ))}
          </select>
        </Field>
        <Field label="Grade 8 Score">
          <input
            required
            type="number"
            min={0}
            max={100}
            step="0.1"
            className="w-full rounded-lg bg-surface-container-highest border-none"
            value={studentForm.grade8Score}
            onChange={(e) => onStudentFormChange("grade8Score", e.target.value)}
          />
        </Field>
        <Field label="Grade 9 Score">
          <input
            required
            type="number"
            min={0}
            max={100}
            step="0.1"
            className="w-full rounded-lg bg-surface-container-highest border-none"
            value={studentForm.grade9Score}
            onChange={(e) => onStudentFormChange("grade9Score", e.target.value)}
          />
        </Field>
        <Field label="Grade 10 Score">
          <input
            required
            type="number"
            min={0}
            max={100}
            step="0.1"
            className="w-full rounded-lg bg-surface-container-highest border-none"
            value={studentForm.grade10Score}
            onChange={(e) => onStudentFormChange("grade10Score", e.target.value)}
          />
        </Field>
        <Field label="Travel Time">
          <input
            required
            type="number"
            min={0}
            max={10}
            className="w-full rounded-lg bg-surface-container-highest border-none"
            value={studentForm.travelTime}
            onChange={(e) => onStudentFormChange("travelTime", e.target.value)}
          />
        </Field>
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-lg bg-primary text-on-primary font-semibold disabled:opacity-60"
        >
          {submitting ? "Saving..." : "Create Student"}
        </button>
      </form>

      <div className="lg:col-span-3 bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20 space-y-4 overflow-auto">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-headline text-xl font-bold text-primary">Students by Class</h3>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
              className="rounded-lg bg-surface-container-highest border-none text-sm"
            >
              <option value="roll">Sort: Roll</option>
              <option value="grade8Score">Sort: Grade 8</option>
              <option value="grade9Score">Sort: Grade 9</option>
              <option value="grade10Score">Sort: Grade 10</option>
            </select>
            <select
              value={sortDir}
              onChange={(e) => setSortDir(e.target.value)}
              className="rounded-lg bg-surface-container-highest border-none text-sm"
            >
              <option value="asc">Asc</option>
              <option value="desc">Desc</option>
            </select>
            <input
              placeholder="Search name/roll"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="rounded-lg bg-surface-container-highest border-none text-sm"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-2">
          <select
            className="rounded-lg bg-surface-container-highest border-none"
            value={classFilter.batch}
            onChange={(e) => onClassFilterChange("batch", e.target.value)}
          >
            <option value="">Select batch</option>
            {BATCH_OPTIONS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          <select
            className="rounded-lg bg-surface-container-highest border-none"
            value={classFilter.faculty}
            onChange={(e) => onClassFilterChange("faculty", e.target.value)}
          >
            <option value="">Select faculty</option>
            {FACULTY_OPTIONS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>

          <select
            className="rounded-lg bg-surface-container-highest border-none"
            value={classFilter.section}
            onChange={(e) => onClassFilterChange("section", e.target.value)}
          >
            <option value="">Select section</option>
            {SECTION_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {!classSelected ? (
          <div className="space-y-3">
            <p className="text-sm text-secondary">
              No class selected — showing all students (use filters above to narrow to a class).
            </p>

            {loading ? (
              <p className="text-sm text-secondary">Loading...</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-secondary border-b border-outline-variant/20">
                    <th className="py-2 font-semibold">Name</th>
                    <th className="py-2 font-semibold">Email</th>
                    <th className="py-2 font-semibold">Roll</th>
                    <th className="py-2 font-semibold">G8</th>
                    <th className="py-2 font-semibold">G9</th>
                    <th className="py-2 font-semibold">G10</th>
                    <th className="py-2 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {applySort(allStudents || []).map((s) => (
                    <tr key={s.id} className="border-b border-outline-variant/10">
                      <td className="py-2 font-medium">{s.firstName} {s.lastName}</td>
                      <td className="py-2 text-secondary">{renderEmail(s)}</td>
                      <td className="py-2 text-secondary">{s.rollNumber}</td>
                      <td className="py-2 text-secondary">{formatScore(s.grade8Score)}</td>
                      <td className="py-2 text-secondary">{formatScore(s.grade9Score)}</td>
                      <td className="py-2 text-secondary">{formatScore(s.grade10Score)}</td>
                      <td className="py-2">
                        <button
                          type="button"
                          onClick={() => onDeleteStudent(s)}
                          disabled={deletingStudentId === s.id}
                          className="px-3 py-1 rounded-md text-xs font-semibold bg-error-container text-error disabled:opacity-60"
                        >
                          {deletingStudentId === s.id ? "Deleting..." : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : null}

        {loading ? (
          <p className="text-sm text-secondary">Loading...</p>
        ) : classSelected ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-secondary border-b border-outline-variant/20">
                <th className="py-2 font-semibold">Name</th>
                <th className="py-2 font-semibold">Email</th>
                <th className="py-2 font-semibold">Roll</th>
                <th className="py-2 font-semibold">G8</th>
                <th className="py-2 font-semibold">G9</th>
                <th className="py-2 font-semibold">G10</th>
                <th className="py-2 font-semibold">Mother Job</th>
                <th className="py-2 font-semibold">Father Job</th>
                <th className="py-2 font-semibold">Travel</th>
                <th className="py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {applySort(students || []).map((s) => (
                <tr key={s.id} className="border-b border-outline-variant/10">
                  <td className="py-2 font-medium">{s.firstName} {s.lastName}</td>
                  <td className="py-2 text-secondary">{renderEmail(s)}</td>
                  <td className="py-2 text-secondary">{s.rollNumber}</td>
                  <td className="py-2 text-secondary">
                    {editingId === s.id ? (
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="0.1"
                        value={editScores.grade8Score}
                        onChange={(e) => setEditScores((prev) => ({ ...prev, grade8Score: e.target.value }))}
                        className="w-20 rounded-md bg-surface-container-highest border-none"
                      />
                    ) : (
                      formatScore(s.grade8Score)
                    )}
                  </td>
                  <td className="py-2 text-secondary">
                    {editingId === s.id ? (
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="0.1"
                        value={editScores.grade9Score}
                        onChange={(e) => setEditScores((prev) => ({ ...prev, grade9Score: e.target.value }))}
                        className="w-20 rounded-md bg-surface-container-highest border-none"
                      />
                    ) : (
                      formatScore(s.grade9Score)
                    )}
                  </td>
                  <td className="py-2 text-secondary">
                    {editingId === s.id ? (
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="0.1"
                        value={editScores.grade10Score}
                        onChange={(e) => setEditScores((prev) => ({ ...prev, grade10Score: e.target.value }))}
                        className="w-20 rounded-md bg-surface-container-highest border-none"
                      />
                    ) : (
                      formatScore(s.grade10Score)
                    )}
                  </td>
                  <td className="py-2 text-secondary">{s.motherJob}</td>
                  <td className="py-2 text-secondary">{s.fatherJob}</td>
                  <td className="py-2 text-secondary">{s.travelTime}</td>
                  <td className="py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {editingId === s.id ? (
                        <>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!canSaveScores()) return;
                              const ok = await onUpdateStudentScores(s.id, {
                                grade8Score: Number(editScores.grade8Score),
                                grade9Score: Number(editScores.grade9Score),
                                grade10Score: Number(editScores.grade10Score),
                              });
                              if (ok) setEditingId(null);
                            }}
                            disabled={updatingStudentId === s.id || !canSaveScores()}
                            className="px-3 py-1 rounded-md text-xs font-semibold bg-primary text-on-primary disabled:opacity-60"
                          >
                            {updatingStudentId === s.id ? "Saving..." : "Save"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            disabled={updatingStudentId === s.id}
                            className="px-3 py-1 rounded-md text-xs font-semibold bg-surface-container-high text-secondary disabled:opacity-60"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => beginEdit(s)}
                          className="px-3 py-1 rounded-md text-xs font-semibold bg-surface-container-high text-secondary"
                        >
                          Edit Scores
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onDeleteStudent(s)}
                        disabled={deletingStudentId === s.id}
                        className="px-3 py-1 rounded-md text-xs font-semibold bg-error-container text-error disabled:opacity-60"
                      >
                        {deletingStudentId === s.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </section>
  );
}
