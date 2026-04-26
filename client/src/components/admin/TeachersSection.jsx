import { useEffect, useMemo, useState } from "react";

const FILTERS_KEY = "adminTeacherFiltersV1";
const DEFAULT_FILTERS = {
  grade: "ELEVEN",
  department: "ALL",
  subjectId: "ALL",
  search: "",
};

const CURRICULUM = {
  ELEVEN: {
    SCIENCE: ["Physics", "Chemistry", "Mathematics"],
    MANAGEMENT: ["Accountancy", "Business Studies", "Economics"],
  },
  TWELVE: {
    SCIENCE: ["Biology", "Physics", "Chemistry"],
    MANAGEMENT: ["Accountancy", "Economics"],
  },
};

function normalizeName(name) {
  return String(name || "").toLowerCase().replace(/\s+/g, "").trim();
}

function formatGradeLabel(grade) {
  if (grade === "ELEVEN") return "11";
  if (grade === "TWELVE") return "12";
  return grade;
}

function uniqueBySubjectName(rows) {
  const map = new Map();
  for (const row of rows) {
    const key = normalizeName(row.name);
    if (!map.has(key)) map.set(key, row);
  }
  return [...map.values()];
}

function getSubjectCatalogFor(grade, department, subjects) {
  const scienceRows = subjects.filter((s) => s.faculty === "SCIENCE");
  const managementRows = subjects.filter((s) => s.faculty === "MANAGEMENT");
  const commonRows = subjects.filter((s) => s.faculty == null);

  const scienceNames = new Set(scienceRows.map((s) => normalizeName(s.name)));
  const managementNames = new Set(managementRows.map((s) => normalizeName(s.name)));
  const mutualNames = new Set([...scienceNames].filter((name) => managementNames.has(name)));

  const mutualRows = subjects.filter((s) => mutualNames.has(normalizeName(s.name)));

  if (department === "BOTH") {
    return uniqueBySubjectName([...commonRows, ...mutualRows]);
  }

  if (department === "SCIENCE") {
    return uniqueBySubjectName([...commonRows, ...scienceRows]);
  }

  if (department === "MANAGEMENT") {
    return uniqueBySubjectName([...commonRows, ...managementRows]);
  }

  // ALL: union of both departments + common.
  return uniqueBySubjectName([...commonRows, ...scienceRows, ...managementRows]);
}

function uniqueAssignments(assignments) {
  const map = new Map();
  for (const row of assignments) {
    const key = `${row.subjectId}:${row.batch || "ALL"}`;
    map.set(key, { subjectId: Number(row.subjectId), batch: row.batch || null });
  }
  return [...map.values()];
}

function TeacherModal({
  open,
  mode,
  teacher,
  subjects,
  initialGrade,
  existingAssignments,
  submitting,
  onClose,
  onCreateTeacher,
  onUpdateTeacher,
}) {
  const [form, setForm] = useState(() => {
    if (mode === "edit" && teacher) {
      const rows = (existingAssignments || []).map((a) => ({
        grade: a.batch || initialGrade,
        department: a.department,
        subjectId: String(a.subjectId),
      }));
      return {
        name: teacher.name,
        email: teacher.email,
        password: "",
        assignments: rows.length > 0 ? rows : [{ grade: initialGrade, department: "", subjectId: "" }],
      };
    }

    return {
      name: "",
      email: "",
      password: "",
      assignments: [{ grade: initialGrade, department: "", subjectId: "" }],
    };
  });

  const canSubmit = useMemo(() => {
    if (!form.name.trim() || !form.email.trim()) return false;
    if (mode === "create" && form.password.length < 6) return false;
    if (mode === "edit" && form.password.length > 0 && form.password.length < 6) return false;
    if (form.assignments.length === 0) return false;
    return form.assignments.every((row) => row.grade && row.department && row.subjectId);
  }, [form, mode]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      subjectAssignments: uniqueAssignments(
        form.assignments.map((row) => ({
          subjectId: Number(row.subjectId),
          batch: row.grade === "BOTH" ? null : row.grade,
        }))
      ),
    };
    if (mode === "create") payload.password = form.password;
    if (mode === "edit" && form.password.trim()) payload.password = form.password.trim();

    const ok = mode === "create"
      ? await onCreateTeacher(payload)
      : await onUpdateTeacher(teacher.id, payload);
    if (ok) onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black/30 p-4 md:p-8 overflow-y-auto">
      <div className="max-w-3xl mx-auto bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-5 md:p-6 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-headline text-2xl font-bold text-primary">
            {mode === "create" ? "Add Teacher" : "Edit Teacher"}
          </h3>
          <button type="button" onClick={onClose} className="px-3 py-2 rounded-lg bg-surface-container-high text-secondary">
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <div className="grid md:grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs uppercase font-semibold tracking-wider text-secondary">Name</span>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-lg bg-surface-container-highest border-none"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs uppercase font-semibold tracking-wider text-secondary">Email</span>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                className="w-full rounded-lg bg-surface-container-highest border-none"
              />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-xs uppercase font-semibold tracking-wider text-secondary">
              Password {mode === "edit" ? "(optional for reset)" : ""}
            </span>
            <input
              required={mode === "create"}
              minLength={mode === "create" ? 6 : undefined}
              type="password"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              className="w-full rounded-lg bg-surface-container-highest border-none"
              placeholder={mode === "create" ? "Min 6 characters" : "Leave empty to keep current password"}
            />
          </label>

          <div className="space-y-3 rounded-xl border border-outline-variant/20 p-4 bg-surface-container-low">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-on-surface">Subject Assignments</p>
              <button
                type="button"
                onClick={() => setForm((prev) => ({
                  ...prev,
                  assignments: [...prev.assignments, { grade: initialGrade, department: "", subjectId: "" }],
                }))}
                className="px-3 py-2 rounded-lg bg-surface-container-high text-primary text-sm font-semibold"
              >
                + Add Subject
              </button>
            </div>

            {form.assignments.map((row, index) => {
              const departmentOptions = row.grade === "BOTH"
                ? ["BOTH", ...new Set(Object.values(CURRICULUM).flatMap((deptMap) => Object.keys(deptMap)))]
                : ["BOTH", ...Object.keys(CURRICULUM[row.grade] || {})];

              const subjectOptions = row.department
                ? getSubjectCatalogFor(row.grade, row.department, subjects)
                : [];

              return (
                <div key={`${index}-${row.grade}-${row.subjectId}`} className="grid md:grid-cols-4 gap-2 items-end">
                  <label className="block space-y-1">
                    <span className="text-xs uppercase font-semibold tracking-wider text-secondary">Grade</span>
                    <select
                      value={row.grade}
                      onChange={(e) => {
                        const grade = e.target.value;
                        setForm((prev) => ({
                          ...prev,
                          assignments: prev.assignments.map((item, idx) => idx === index
                            ? { ...item, grade, department: "", subjectId: "" }
                            : item),
                        }));
                      }}
                      className="w-full rounded-lg bg-surface-container-highest border-none"
                    >
                      <option value="ELEVEN">11</option>
                      <option value="TWELVE">12</option>
                    <option value="BOTH">Both (11 and 12)</option>
                    </select>
                  </label>

                  <label className="block space-y-1">
                    <span className="text-xs uppercase font-semibold tracking-wider text-secondary">Department</span>
                    <select
                      value={row.department}
                      disabled={!row.grade}
                      onChange={(e) => {
                        const department = e.target.value;
                        setForm((prev) => ({
                          ...prev,
                          assignments: prev.assignments.map((item, idx) => idx === index
                            ? { ...item, department, subjectId: "" }
                            : item),
                        }));
                      }}
                      className="w-full rounded-lg bg-surface-container-highest border-none disabled:opacity-50"
                    >
                      <option value="">Select department</option>
                      <option value="BOTH">BOTH</option>
                      {departmentOptions.map((dep) => (
                        dep === "BOTH" ? null :
                        <option key={dep} value={dep}>{dep}</option>
                      ))}
                    </select>
                  </label>

                  <label className="block space-y-1">
                    <span className="text-xs uppercase font-semibold tracking-wider text-secondary">Subject</span>
                    <select
                      value={row.subjectId}
                      disabled={!row.department}
                      onChange={(e) => {
                        const subjectId = e.target.value;
                        setForm((prev) => ({
                          ...prev,
                          assignments: prev.assignments.map((item, idx) => idx === index
                            ? { ...item, subjectId }
                            : item),
                        }));
                      }}
                      className="w-full rounded-lg bg-surface-container-highest border-none disabled:opacity-50"
                    >
                      <option value="">Select subject</option>
                      {subjectOptions.map((subject) => (
                        <option key={subject.id} value={subject.id}>{subject.name}</option>
                      ))}
                    </select>
                  </label>

                  <button
                    type="button"
                    disabled={form.assignments.length === 1}
                    onClick={() => setForm((prev) => ({
                      ...prev,
                      assignments: prev.assignments.filter((_, idx) => idx !== index),
                    }))}
                    className="h-10 px-3 rounded-lg bg-error-container text-error text-sm font-semibold disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className="px-4 py-2 rounded-lg bg-primary text-on-primary font-semibold disabled:opacity-60"
            >
              {submitting ? "Saving..." : mode === "create" ? "Create Teacher" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TeachersSection({
  loading,
  teachers,
  subjects,
  assignments,
  submitting,
  onCreateTeacher,
  onUpdateTeacher,
  onDeleteTeacher,
  deletingUserId,
}) {
  const [filters, setFilters] = useState(() => {
    try {
      const raw = localStorage.getItem(FILTERS_KEY);
      if (!raw) return DEFAULT_FILTERS;
      const parsed = JSON.parse(raw);
      return {
        grade: parsed.grade || DEFAULT_FILTERS.grade,
        department: parsed.department || DEFAULT_FILTERS.department,
        subjectId: parsed.subjectId || DEFAULT_FILTERS.subjectId,
        search: parsed.search || DEFAULT_FILTERS.search,
      };
    } catch {
      return DEFAULT_FILTERS;
    }
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [editingTeacher, setEditingTeacher] = useState(null);

  useEffect(() => {
    localStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
  }, [filters]);

  const teacherById = useMemo(() => {
    return new Map(teachers.map((teacher) => [teacher.id, teacher]));
  }, [teachers]);

  const normalizedAssignments = useMemo(() => {
    return assignments.map((assignment) => ({
      teacherId: assignment.teacherId,
      batch: assignment.batch || "BOTH",
      department: assignment.subject?.faculty || "COMMON",
      subjectId: assignment.subjectId,
      subjectName: assignment.subject?.name || "Unknown Subject",
    }));
  }, [assignments]);

  const assignmentsByTeacher = useMemo(() => {
    const map = new Map();
    for (const row of normalizedAssignments) {
      const list = map.get(row.teacherId) || [];
      list.push(row);
      map.set(row.teacherId, list);
    }
    return map;
  }, [normalizedAssignments]);

  const departmentOptions = useMemo(() => {
    const base = Object.keys(CURRICULUM[filters.grade] || {});
    const dynamic = new Set();
    for (const row of normalizedAssignments) {
      const inGrade = row.batch === filters.grade || row.batch === "BOTH";
      if (inGrade) dynamic.add(row.department);
    }
    return ["ALL", "BOTH", ...new Set([...base, ...dynamic].filter((d) => d !== "COMMON"))];
  }, [filters.grade, normalizedAssignments]);

  const subjectOptions = useMemo(() => {
    if (filters.department === "ALL") {
      return getSubjectCatalogFor(filters.grade, "ALL", subjects);
    }
    if (filters.department === "BOTH") {
      return getSubjectCatalogFor(filters.grade, "BOTH", subjects);
    }
    return getSubjectCatalogFor(filters.grade, filters.department, subjects);
  }, [filters.grade, filters.department, subjects]);

  const groupedData = useMemo(() => {
    const searchQuery = filters.search.trim().toLowerCase();
    const root = new Map();
    const visibleTeacherIds = new Set();

    for (const assignment of normalizedAssignments) {
      const teacher = teacherById.get(assignment.teacherId);
      if (!teacher) continue;

      const teacherText = `${teacher.name} ${teacher.email}`.toLowerCase();
      if (searchQuery && !teacherText.includes(searchQuery)) continue;

      const gradeMatch = assignment.batch === filters.grade || assignment.batch === "BOTH";
      if (!gradeMatch) continue;

      const departmentMatch = filters.department === "ALL"
        || (filters.department === "BOTH" && (assignment.department === "SCIENCE" || assignment.department === "MANAGEMENT" || assignment.department === "COMMON"))
        || assignment.department === filters.department;
      if (!departmentMatch) continue;

      const subjectMatch = filters.subjectId === "ALL" || String(assignment.subjectId) === String(filters.subjectId);
      if (!subjectMatch) continue;

      visibleTeacherIds.add(teacher.id);

      const gradeKey = filters.grade;
      const departmentKey = assignment.department;

      if (!root.has(gradeKey)) root.set(gradeKey, new Map());
      const departmentMap = root.get(gradeKey);
      if (!departmentMap.has(departmentKey)) departmentMap.set(departmentKey, new Map());
      const teacherMap = departmentMap.get(departmentKey);

      if (!teacherMap.has(teacher.id)) {
        teacherMap.set(teacher.id, {
          teacher,
          subjects: new Set(),
        });
      }
      teacherMap.get(teacher.id).subjects.add(assignment.subjectName);
    }

    return {
      grouped: root,
      count: visibleTeacherIds.size,
    };
  }, [normalizedAssignments, teacherById, filters]);

  const activeFiltersText = `Showing: Grade ${formatGradeLabel(filters.grade)} | Department: ${filters.department === "ALL" ? "All" : filters.department === "BOTH" ? "Both" : filters.department} | Subject: ${filters.subjectId === "ALL" ? "All" : (subjectOptions.find((s) => String(s.id) === String(filters.subjectId))?.name || "All")}`;

  function handleClearFilters() {
    setFilters(DEFAULT_FILTERS);
  }

  function openCreateModal() {
    setModalMode("create");
    setEditingTeacher(null);
    setModalOpen(true);
  }

  function openEditModal(teacher) {
    setModalMode("edit");
    setEditingTeacher(teacher);
    setModalOpen(true);
  }

  return (
    <section className="space-y-4">
      <div className="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/20 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1">
            <span className="text-xs uppercase font-semibold tracking-wider text-secondary">Grade</span>
            <select
              value={filters.grade}
              onChange={(e) => setFilters((prev) => ({ ...prev, grade: e.target.value, department: "ALL", subjectId: "ALL" }))}
              className="rounded-lg bg-surface-container-highest border-none"
            >
              <option value="ELEVEN">11</option>
              <option value="TWELVE">12</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs uppercase font-semibold tracking-wider text-secondary">Department</span>
            <select
              value={filters.department}
              onChange={(e) => setFilters((prev) => ({ ...prev, department: e.target.value, subjectId: "ALL" }))}
              className="rounded-lg bg-surface-container-highest border-none"
            >
              {departmentOptions.map((dep) => (
                <option key={dep} value={dep}>{dep === "ALL" ? "ALL" : dep}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs uppercase font-semibold tracking-wider text-secondary">Subject</span>
            <select
              value={filters.subjectId}
              onChange={(e) => setFilters((prev) => ({ ...prev, subjectId: e.target.value }))}
              className="rounded-lg bg-surface-container-highest border-none"
            >
              <option value="ALL">ALL</option>
              {subjectOptions.map((subject) => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1 flex-1 min-w-[220px]">
            <span className="text-xs uppercase font-semibold tracking-wider text-secondary">Search</span>
            <input
              placeholder="Search by name or email"
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              className="w-full rounded-lg bg-surface-container-highest border-none"
            />
          </label>

          <button
            type="button"
            onClick={handleClearFilters}
            className="px-3 py-2 rounded-lg bg-surface-container-high text-secondary font-semibold"
          >
            Clear Filters
          </button>

          <div className="ml-auto">
            <button
              type="button"
              onClick={openCreateModal}
              className="px-4 py-2 rounded-lg bg-primary text-on-primary font-semibold"
            >
              + Add Teacher
            </button>
          </div>
        </div>

        <div className="text-sm text-secondary">{activeFiltersText}</div>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-headline text-xl font-bold text-primary">Teacher Management</h3>
          <p className="text-sm text-secondary">Showing {groupedData.count} teachers</p>
        </div>

        {loading ? (
          <p className="text-sm text-secondary">Loading teachers...</p>
        ) : groupedData.count === 0 ? (
          <div className="rounded-xl border border-dashed border-outline-variant/40 p-6 text-center space-y-3">
            <p className="text-sm text-secondary">No teachers found for selected filters</p>
            <button
              type="button"
              onClick={openCreateModal}
              className="px-4 py-2 rounded-lg bg-primary text-on-primary font-semibold"
            >
              + Add Teacher
            </button>
          </div>
        ) : (
          [...groupedData.grouped.entries()].map(([grade, departmentMap]) => (
            <div key={grade} className="space-y-3">
              <h4 className="font-headline text-lg font-bold text-on-surface">Grade {formatGradeLabel(grade)}</h4>

              {[...departmentMap.entries()].map(([department, teacherMap]) => (
                <div key={`${grade}-${department}`} className="rounded-xl border border-outline-variant/20 overflow-hidden">
                  <div className="px-4 py-2 bg-surface-container-high text-sm font-semibold text-secondary">{department}</div>
                  <div className="divide-y divide-outline-variant/20">
                    {[...teacherMap.values()].map((entry) => (
                      <div key={`${grade}-${department}-${entry.teacher.id}`} className="px-4 py-3 flex flex-wrap items-center gap-3">
                        <div className="min-w-[220px]">
                          <p className="font-medium text-on-surface">{entry.teacher.name}</p>
                          <p className="text-sm text-secondary">{entry.teacher.email}</p>
                        </div>

                        <div className="flex-1">
                          <p className="text-xs uppercase tracking-wider font-semibold text-secondary">Subject(s)</p>
                          <p className="text-sm text-on-surface">{[...entry.subjects].join(", ")}</p>
                        </div>

                        <div className="flex items-center gap-2 ml-auto">
                          <button
                            type="button"
                            onClick={() => openEditModal(entry.teacher)}
                            className="px-3 py-1 rounded-md text-xs font-semibold bg-surface-container-high text-primary"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteTeacher(entry.teacher)}
                            disabled={deletingUserId === entry.teacher.id}
                            className="px-3 py-1 rounded-md text-xs font-semibold bg-error-container text-error disabled:opacity-60"
                          >
                            {deletingUserId === entry.teacher.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      <TeacherModal
        key={`${modalMode}-${editingTeacher?.id || "new"}-${filters.grade}-${modalOpen ? "open" : "closed"}`}
        open={modalOpen}
        mode={modalMode}
        teacher={editingTeacher}
        subjects={subjects}
        initialGrade={filters.grade}
        existingAssignments={editingTeacher ? (assignmentsByTeacher.get(editingTeacher.id) || []) : []}
        submitting={submitting}
        onClose={() => setModalOpen(false)}
        onCreateTeacher={onCreateTeacher}
        onUpdateTeacher={onUpdateTeacher}
      />
    </section>
  );
}
