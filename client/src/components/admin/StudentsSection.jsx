import { JOB_OPTIONS } from "./constants";
import Field from "./Field";

export default function StudentsSection({
  loading,
  students,
  search,
  onSearchChange,
  studentForm,
  onStudentFormChange,
  onSubmit,
  submitting,
  onDeleteStudent,
  deletingStudentId,
}) {
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
          <input
            required
            className="w-full rounded-lg bg-surface-container-highest border-none"
            value={studentForm.rollNumber}
            onChange={(e) => onStudentFormChange("rollNumber", e.target.value)}
          />
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
          <h3 className="font-headline text-xl font-bold text-primary">Students</h3>
          <input
            placeholder="Search name/roll"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="rounded-lg bg-surface-container-highest border-none text-sm"
          />
        </div>
        {loading ? (
          <p className="text-sm text-secondary">Loading...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-secondary border-b border-outline-variant/20">
                <th className="py-2 font-semibold">Name</th>
                <th className="py-2 font-semibold">Roll</th>
                <th className="py-2 font-semibold">Mother Job</th>
                <th className="py-2 font-semibold">Father Job</th>
                <th className="py-2 font-semibold">Travel</th>
                <th className="py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-b border-outline-variant/10">
                  <td className="py-2 font-medium">{s.firstName} {s.lastName}</td>
                  <td className="py-2 text-secondary">{s.rollNumber}</td>
                  <td className="py-2 text-secondary">{s.motherJob}</td>
                  <td className="py-2 text-secondary">{s.fatherJob}</td>
                  <td className="py-2 text-secondary">{s.travelTime}</td>
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
    </section>
  );
}
