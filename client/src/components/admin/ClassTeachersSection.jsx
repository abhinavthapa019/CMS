import { useMemo, useState } from "react";
import { BATCH_OPTIONS, FACULTY_OPTIONS, SECTION_OPTIONS } from "./constants";

function formatBatch(batch) {
  return batch === "ELEVEN" ? "11" : batch === "TWELVE" ? "12" : batch;
}

function classLabel(row) {
  return `${formatBatch(row.batch)} / ${row.faculty} / ${row.section}`;
}

function orderedClassCombos() {
  const rows = [];
  for (const batch of BATCH_OPTIONS) {
    for (const faculty of FACULTY_OPTIONS) {
      const sections = SECTION_OPTIONS.filter((section) => (
        faculty === "SCIENCE"
          ? (section === "BIO" || section === "CS")
          : (section === "ECONOMICS" || section === "MARKETING")
      ));
      for (const section of sections) {
        rows.push({ batch, faculty, section });
      }
    }
  }
  return rows;
}

export default function ClassTeachersSection({
  teachers,
  assignments,
  submitting,
  deletingAssignmentId,
  onAssign,
  onRemove,
}) {
  const classCombos = useMemo(() => orderedClassCombos(), []);
  const teachersSorted = useMemo(
    () => [...teachers].sort((a, b) => a.name.localeCompare(b.name)),
    [teachers]
  );

  const assignmentByKey = useMemo(() => {
    const map = new Map();
    for (const row of assignments) {
      map.set(`${row.batch}|${row.faculty}|${row.section}`, row);
    }
    return map;
  }, [assignments]);

  const assignedTeacherIds = useMemo(() => {
    return new Set((assignments || []).map((row) => row.teacherId));
  }, [assignments]);

  const [selectedByClass, setSelectedByClass] = useState({});

  return (
    <section className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20 space-y-4">
      <div className="space-y-1">
        <h3 className="font-headline text-xl font-bold text-primary">Class Teacher Assignment</h3>
        <p className="text-sm text-secondary">
          Attendance is class-level only. Each class can have exactly one assigned class teacher.
        </p>
      </div>

      <div className="overflow-auto border border-outline-variant/20 rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-secondary bg-surface-container-low">
              <th className="py-3 px-3 font-semibold">Class</th>
              <th className="py-3 px-3 font-semibold">Assigned Teacher</th>
              <th className="py-3 px-3 font-semibold">Change To</th>
              <th className="py-3 px-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {classCombos.map((combo) => {
              const key = `${combo.batch}|${combo.faculty}|${combo.section}`;
              const assignment = assignmentByKey.get(key);
              const selectedTeacherId = selectedByClass[key] || "";
              const currentTeacherId = assignment?.teacherId;

              const availableTeachers = teachersSorted.filter((teacher) => {
                if (teacher.id === currentTeacherId) return true;
                return !assignedTeacherIds.has(teacher.id);
              });

              return (
                <tr key={key} className="border-t border-outline-variant/10">
                  <td className="py-2 px-3 font-medium">{classLabel(combo)}</td>
                  <td className="py-2 px-3 text-secondary">
                    {assignment?.teacher ? (
                      <>
                        <span className="font-medium text-on-surface">{assignment.teacher.name}</span>
                        <span className="ml-2 text-xs">({assignment.teacher.email})</span>
                      </>
                    ) : (
                      <span className="text-error">Not assigned</span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    <select
                      value={selectedTeacherId}
                      onChange={(e) => setSelectedByClass((prev) => ({ ...prev, [key]: e.target.value }))}
                      className="w-full rounded-lg bg-surface-container-highest border-none"
                    >
                      <option value="">Select teacher</option>
                      {availableTeachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onAssign({
                          teacherId: Number(selectedTeacherId),
                          batch: combo.batch,
                          faculty: combo.faculty,
                          section: combo.section,
                        })}
                        disabled={submitting || !selectedTeacherId}
                        className="px-3 py-1 rounded-md text-xs font-semibold bg-primary text-on-primary disabled:opacity-60"
                      >
                        {assignment ? "Reassign" : "Assign"}
                      </button>

                      {assignment ? (
                        <button
                          type="button"
                          onClick={() => onRemove(assignment)}
                          disabled={submitting || deletingAssignmentId === assignment.id}
                          className="px-3 py-1 rounded-md text-xs font-semibold bg-error-container text-error disabled:opacity-60"
                        >
                          {deletingAssignmentId === assignment.id ? "Removing..." : "Remove"}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
