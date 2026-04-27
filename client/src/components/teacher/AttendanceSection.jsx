import { useEffect, useMemo, useState } from "react";

function parseYmd(ymd) {
  if (!ymd) return new Date();
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function toYmd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function monthLabel(date) {
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export default function AttendanceSection({
  students,
  classOptions,
  classFilters,
  classTeacherName,
  onFilterChange,
  attendanceDate,
  attendanceMap,
  onDateChange,
  takenDates,
  isEditingExisting,
  onPickTakenDate,
  onToggleStudent,
  onToggleAll,
  onSubmit,
  submitting,
}) {
  const allPresent = students.length > 0 && students.every((s) => attendanceMap[s.id] === true);
  const today = toYmd(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const selected = parseYmd(attendanceDate);
    return new Date(selected.getFullYear(), selected.getMonth(), 1);
  });

  const takenSet = useMemo(() => new Set(takenDates || []), [takenDates]);

  useEffect(() => {
    const selected = parseYmd(attendanceDate);
    setVisibleMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
  }, [attendanceDate]);

  const calendarCells = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const weekdayOffset = (firstDay.getDay() + 6) % 7;

    const cells = [];
    for (let i = 0; i < weekdayOffset; i += 1) {
      cells.push(null);
    }
    for (let d = 1; d <= daysInMonth; d += 1) {
      cells.push(new Date(year, month, d));
    }
    while (cells.length % 7 !== 0) {
      cells.push(null);
    }
    return cells;
  }, [visibleMonth]);

  function shiftMonth(delta) {
    const next = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + delta, 1);
    setVisibleMonth(next);
  }

  function pickDate(date) {
    const ymd = toYmd(date);
    if (ymd > today) return;
    if (onPickTakenDate) {
      onPickTakenDate(ymd);
      setShowCalendar(false);
      return;
    }
    onDateChange(ymd);
    setShowCalendar(false);
  }

  return (
    <section className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-headline text-xl font-bold text-primary">Take Attendance</h3>
          <p className="text-sm text-secondary">Attendance is class-level and can only be taken by the assigned class teacher.</p>
          {classTeacherName ? (
            <p className="text-xs text-secondary mt-1">Assigned Class Teacher: {classTeacherName}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="block space-y-1">
            <span className="text-xs uppercase font-semibold tracking-wider text-secondary">Class</span>
            <select
              className="rounded-lg bg-surface-container-highest border-none"
              value={`${classFilters.batch}|${classFilters.faculty}|${classFilters.section}`}
              onChange={(e) => onFilterChange("classKey", e.target.value)}
            >
              {classOptions.length === 0 ? (
                <option value="||">No class teacher assignment</option>
              ) : null}
              {classOptions.map((opt) => (
                <option key={opt.label} value={`${opt.batch}|${opt.faculty}|${opt.section}`}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-xs uppercase font-semibold tracking-wider text-secondary">Attendance Date</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCalendar((prev) => !prev)}
                className="px-3 py-2 rounded-lg bg-surface-container-highest text-on-surface font-semibold"
              >
                {attendanceDate}
              </button>
              <button
                type="button"
                onClick={() => setShowCalendar((prev) => !prev)}
                className="px-3 py-2 rounded-lg bg-surface-container-high text-secondary text-sm"
              >
                {showCalendar ? "Hide Calendar" : "Open Calendar"}
              </button>
            </div>
            {isEditingExisting ? (
              <p className="text-xs font-semibold text-on-surface mt-1">Editing attendance for selected date</p>
            ) : null}
          </label>

          <label className="inline-flex items-center gap-2 text-sm text-on-surface">
            <input
              type="checkbox"
              checked={allPresent}
              onChange={(e) => onToggleAll(e.target.checked)}
            />
            Mark all present
          </label>

          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting || students.length === 0}
            className="px-4 py-2 rounded-lg bg-primary text-on-primary font-semibold disabled:opacity-60"
          >
            {submitting ? "Saving..." : "Save Attendance"}
          </button>
        </div>
      </div>

      {showCalendar ? (
      <div className="rounded-xl border border-outline-variant/20 p-3 space-y-3 bg-surface-container-low">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-on-surface">Attendance Calendar</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="px-2 py-1 rounded-md bg-surface-container-high text-secondary"
            >
              Prev
            </button>
            <p className="text-sm font-semibold text-on-surface min-w-[140px] text-center">{monthLabel(visibleMonth)}</p>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="px-2 py-1 rounded-md bg-surface-container-high text-secondary"
            >
              Next
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs uppercase font-semibold text-secondary">
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
          <span>Sun</span>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {calendarCells.map((cell, idx) => {
            if (!cell) {
              return <div key={`empty-${idx}`} className="h-9 rounded-md bg-transparent" />;
            }

            const ymd = toYmd(cell);
            const isFuture = ymd > today;
            const isSelected = ymd === attendanceDate;
            const isTaken = takenSet.has(ymd);

            let cls = "h-9 rounded-md text-sm font-semibold border transition-colors ";
            if (isSelected) {
              cls += "bg-primary text-on-primary border-primary ";
            } else if (isTaken) {
              cls += "bg-on-surface text-surface-container-lowest border-on-surface ";
            } else {
              cls += "bg-surface-container-high text-on-surface border-outline-variant/30 ";
            }
            if (isFuture) {
              cls += "opacity-40 cursor-not-allowed ";
            }

            return (
              <button
                key={ymd}
                type="button"
                disabled={isFuture}
                onClick={() => pickDate(cell)}
                className={cls}
                title={isTaken ? "Attendance already taken" : "No attendance yet"}
              >
                {cell.getDate()}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-secondary">
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-on-surface" /> Already taken
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-primary" /> Selected
          </span>
        </div>
      </div>
      ) : null}

      <div className="overflow-auto border border-outline-variant/20 rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-secondary bg-surface-container-low">
              <th className="py-3 px-3 font-semibold">Student</th>
              <th className="py-3 px-3 font-semibold">Roll</th>
              <th className="py-3 px-3 font-semibold">Present</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-t border-outline-variant/10">
                <td className="py-2 px-3 font-medium">{s.firstName} {s.lastName}</td>
                <td className="py-2 px-3 text-secondary">{s.rollNumber}</td>
                <td className="py-2 px-3">
                  <input
                    type="checkbox"
                    checked={attendanceMap[s.id] ?? true}
                    onChange={(e) => onToggleStudent(s.id, e.target.checked)}
                  />
                </td>
              </tr>
            ))}
            {students.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-4 px-3 text-secondary">No students found. Ask admin to add students first.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-secondary">
        This saves one class attendance record per student for the selected date. Ticked means present, unticked means absent.
      </p>
    </section>
  );
}
