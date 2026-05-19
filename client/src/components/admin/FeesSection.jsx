import { useMemo, useState } from "react";
import { BATCH_OPTIONS, FACULTY_OPTIONS, SECTION_OPTIONS } from "./constants";
import Field from "./Field";

function displayBatch(batch) {
  if (batch === "ELEVEN") return "11";
  if (batch === "TWELVE") return "12";
  return batch || "-";
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

export default function FeesSection({
  fees,
  students,
  feeForm,
  onFeeFormChange,
  onGenerateMonthly,
  onSubmit,
  submitting,
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [studentQuery, setStudentQuery] = useState("");
  const [classFilter, setClassFilter] = useState({
    batch: "ELEVEN",
    faculty: "SCIENCE",
    section: "BIO",
  });
  const [monthlyForm, setMonthlyForm] = useState(() => {
    const now = new Date();
    return {
      month: String(now.getMonth() + 1),
      year: String(now.getFullYear()),
      amount: "",
      title: "",
    };
  });

  const classFilteredStudents = useMemo(() => {
    return (students || []).filter((s) => {
      if (classFilter.batch && s.batch !== classFilter.batch) return false;
      if (classFilter.faculty && s.faculty !== classFilter.faculty) return false;
      if (classFilter.section && s.section !== classFilter.section) return false;
      return true;
    });
  }, [students, classFilter]);

  const latestFeeByStudent = useMemo(() => {
    const map = new Map();
    for (const fee of fees || []) {
      if (!fee.studentId) continue;
      const existing = map.get(fee.studentId);
      if (!existing) {
        map.set(fee.studentId, fee);
        continue;
      }
      const existingTime = new Date(existing.createdAt || 0).getTime();
      const nextTime = new Date(fee.createdAt || 0).getTime();
      if (nextTime >= existingTime) {
        map.set(fee.studentId, fee);
      }
    }
    return map;
  }, [fees]);

  const feeRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return classFilteredStudents
      .slice()
      .sort((a, b) => Number(a.rollNumber || 0) - Number(b.rollNumber || 0))
      .filter((student) => {
      const fee = latestFeeByStudent.get(student.id);
      const status = fee?.status || "PENDING";
      if (statusFilter !== "ALL" && status !== statusFilter) return false;
      if (!q) return true;
      const hay = `${fee?.title || ""} ${student.firstName || ""} ${student.lastName || ""} ${student.rollNumber || ""}`.toLowerCase();
      return hay.includes(q);
      })
      .map((student) => ({
        student,
        fee: latestFeeByStudent.get(student.id) || null,
      }));
  }, [classFilteredStudents, latestFeeByStudent, query, statusFilter]);

  const filteredStudents = useMemo(() => {
    const q = studentQuery.trim().toLowerCase();
    return classFilteredStudents.filter((s) => {
      if (!q) return true;
      const hay = `${s.firstName} ${s.lastName} ${s.rollNumber} ${s.user?.email || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [classFilteredStudents, studentQuery]);

  function handleMonthlyChange(field, value) {
    setMonthlyForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleMonthlySubmit(event) {
    event.preventDefault();
    if (!onGenerateMonthly) return;
    onGenerateMonthly({
      month: monthlyForm.month,
      year: monthlyForm.year,
      amount: monthlyForm.amount,
      title: monthlyForm.title,
    });
  }

  return (
    <section className="grid lg:grid-cols-5 gap-4">
      <form
        onSubmit={onSubmit}
        className="lg:col-span-2 bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20 space-y-4"
      >
        <div className="space-y-4">
          <div>
            <h3 className="font-headline text-xl font-bold text-primary">Generate Monthly Fees</h3>
            <p className="text-xs text-secondary mt-1">Create monthly fee entries for all students.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Month">
              <select
                value={monthlyForm.month}
                onChange={(e) => handleMonthlyChange("month", e.target.value)}
                className="w-full rounded-lg bg-surface-container-highest border-none"
              >
                {Array.from({ length: 12 }, (_, idx) => {
                  const value = String(idx + 1);
                  return (
                    <option key={value} value={value}>{value}</option>
                  );
                })}
              </select>
            </Field>
            <Field label="Year">
              <input
                type="number"
                min={2000}
                max={2100}
                value={monthlyForm.year}
                onChange={(e) => handleMonthlyChange("year", e.target.value)}
                className="w-full rounded-lg bg-surface-container-highest border-none"
              />
            </Field>
          </div>

          <Field label="Title (Optional)">
            <input
              value={monthlyForm.title}
              onChange={(e) => handleMonthlyChange("title", e.target.value)}
              placeholder="Monthly Fee"
              className="w-full rounded-lg bg-surface-container-highest border-none"
            />
          </Field>

          <Field label="Amount (Optional)">
            <input
              type="number"
              min={1}
              step={1}
              value={monthlyForm.amount}
              onChange={(e) => handleMonthlyChange("amount", e.target.value)}
              placeholder="Use default monthly fee"
              className="w-full rounded-lg bg-surface-container-highest border-none"
            />
          </Field>

          <button
            type="button"
            onClick={handleMonthlySubmit}
            className="w-full py-3 rounded-lg bg-secondary-container text-on-secondary-container font-semibold"
          >
            Generate Monthly Fees
          </button>
        </div>

        <hr className="border-outline-variant/20" />

        <div>
          <h3 className="font-headline text-xl font-bold text-primary">Create Fee</h3>
          <p className="text-xs text-secondary mt-1">Assign a manual fee to a specific student.</p>
        </div>

        <Field label="Student">
          <input
            value={studentQuery}
            onChange={(e) => setStudentQuery(e.target.value)}
            placeholder="Search by name, roll, email"
            className="w-full rounded-lg bg-surface-container-highest border-none text-sm"
          />
          <select
            required
            className="w-full rounded-lg bg-surface-container-highest border-none mt-2"
            value={feeForm.studentId}
            onChange={(e) => onFeeFormChange("studentId", e.target.value)}
          >
            <option value="">Select a student</option>
            {filteredStudents.map((s) => (
              <option key={s.id} value={s.id}>
                {s.firstName} {s.lastName} • #{s.rollNumber} • {displayBatch(s.batch)}-{s.faculty}-{s.section}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Title">
          <input
            required
            className="w-full rounded-lg bg-surface-container-highest border-none"
            value={feeForm.title}
            onChange={(e) => onFeeFormChange("title", e.target.value)}
            placeholder="Monthly Fee - 2026-05"
          />
        </Field>

        <Field label="Amount">
          <input
            required
            type="number"
            min={1}
            step={1}
            className="w-full rounded-lg bg-surface-container-highest border-none"
            value={feeForm.amount}
            onChange={(e) => onFeeFormChange("amount", e.target.value)}
            placeholder="5000"
          />
        </Field>

        <Field label="Due Date (Optional)">
          <input
            type="date"
            className="w-full rounded-lg bg-surface-container-highest border-none"
            value={feeForm.dueDate}
            onChange={(e) => onFeeFormChange("dueDate", e.target.value)}
          />
        </Field>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-lg bg-primary text-on-primary font-semibold disabled:opacity-60"
        >
          {submitting ? "Saving..." : "Create Fee"}
        </button>
      </form>

      <div className="lg:col-span-3 bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20 space-y-4 overflow-auto">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-headline text-xl font-bold text-primary">Fees</h3>
            <p className="text-xs text-secondary">Review, search, and verify fee status.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              placeholder="Search fee or student"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="rounded-lg bg-surface-container-highest border-none text-sm"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg bg-surface-container-highest border-none text-sm"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-2">
          <label className="text-xs text-secondary">
            Batch
            <select
              className="mt-1 w-full rounded-lg bg-surface-container-highest border-none"
              value={classFilter.batch}
              onChange={(e) => setClassFilter((prev) => ({ ...prev, batch: e.target.value }))}
            >
              {BATCH_OPTIONS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-secondary">
            Department
            <select
              className="mt-1 w-full rounded-lg bg-surface-container-highest border-none"
              value={classFilter.faculty}
              onChange={(e) => setClassFilter((prev) => ({ ...prev, faculty: e.target.value }))}
            >
              {FACULTY_OPTIONS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-secondary">
            Subject
            <select
              className="mt-1 w-full rounded-lg bg-surface-container-highest border-none"
              value={classFilter.section}
              onChange={(e) => setClassFilter((prev) => ({ ...prev, section: e.target.value }))}
            >
              {SECTION_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
        {feeRows.length === 0 ? (
          <p className="text-sm text-secondary">No fees found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-secondary border-b border-outline-variant/20">
                <th className="py-2 font-semibold">Student</th>
                <th className="py-2 font-semibold">Status</th>
                <th className="py-2 font-semibold">Paid Info</th>
              </tr>
            </thead>
            <tbody>
              {feeRows.map(({ student, fee }) => {
                const status = fee?.status || "PENDING";
                return (
                  <tr key={student.id} className="border-b border-outline-variant/10">
                    <td className="py-2 font-medium">
                      {student.firstName} {student.lastName}
                      <div className="text-xs text-secondary">#{student.rollNumber}</div>
                    </td>
                    <td className="py-2">
                      <div className={status === "PAID" ? "text-primary font-semibold" : "text-secondary"}>
                        {status === "PAID" ? "PAID" : "PENDING"}
                      </div>
                    </td>
                    <td className="py-2">
                      <div className="text-xs text-secondary">Paid: {formatDate(fee?.paidAt)}</div>
                      {fee?.paymentRef ? (
                        <div className="text-xs text-secondary">Ref: {fee.paymentRef}</div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
