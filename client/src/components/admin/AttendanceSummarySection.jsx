export default function AttendanceSummarySection({ loading, summary, subjects, filter, onFilterChange }) {
  const visibleSummary = filter.subjectId ? summary.filter((s) => s.totalCount > 0) : summary;
  const atRisk = visibleSummary.filter((s) => s.attendancePercent < 40);

  const displayBatch = (batch) => (batch === "ELEVEN" ? "11" : batch === "TWELVE" ? "12" : batch);

  const filteredSubjects = subjects.filter((subject) => {
    if (filter.department === "BOTH") return true;
    if (filter.department === "COMMON") return !subject.faculty;
    return subject.faculty === filter.department;
  });

  return (
    <section className="grid lg:grid-cols-5 gap-4">
      <div className="lg:col-span-3 bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20 space-y-4 overflow-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-headline text-xl font-bold text-primary">Student Attendance Summary</h3>
          <span className="text-xs uppercase tracking-wider font-semibold text-secondary">All Dates</span>
        </div>

        <p className="text-xs text-secondary">
          Showing {visibleSummary.length} students for class {displayBatch(filter.batch)} / {filter.faculty} / {filter.section}
        </p>

        <div className="grid sm:grid-cols-5 gap-2">
          <select
            className="rounded-lg bg-surface-container-highest border-none"
            value={filter.batch}
            onChange={(e) => onFilterChange("batch", e.target.value)}
          >
            <option value="ELEVEN">11</option>
            <option value="TWELVE">12</option>
          </select>
          <select
            className="rounded-lg bg-surface-container-highest border-none"
            value={filter.faculty}
            onChange={(e) => onFilterChange("faculty", e.target.value)}
          >
            <option value="SCIENCE">SCIENCE</option>
            <option value="MANAGEMENT">MANAGEMENT</option>
          </select>
          <select
            className="rounded-lg bg-surface-container-highest border-none"
            value={filter.section}
            onChange={(e) => onFilterChange("section", e.target.value)}
          >
            {filter.faculty === "SCIENCE" ? (
              <>
                <option value="BIO">BIO</option>
                <option value="CS">CS</option>
              </>
            ) : (
              <>
                <option value="ECONOMICS">ECONOMICS</option>
                <option value="MARKETING">MARKETING</option>
              </>
            )}
          </select>
          <select
            className="rounded-lg bg-surface-container-highest border-none"
            value={filter.subjectId}
            onChange={(e) => onFilterChange("subjectId", e.target.value)}
          >
            <option value="">All Subjects</option>
            {filteredSubjects.map((subject) => (
              <option key={subject.id} value={subject.id}>{subject.name}</option>
            ))}
          </select>
          <select
            className="rounded-lg bg-surface-container-highest border-none"
            value={filter.department}
            onChange={(e) => onFilterChange("department", e.target.value)}
          >
            <option value="SCIENCE">SCIENCE</option>
            <option value="MANAGEMENT">MANAGEMENT</option>
            <option value="COMMON">COMMON</option>
            <option value="BOTH">BOTH</option>
          </select>
        </div>

        {loading ? (
          <p className="text-sm text-secondary">Loading...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-secondary border-b border-outline-variant/20">
                <th className="py-2 font-semibold">Student</th>
                <th className="py-2 font-semibold">Roll</th>
                <th className="py-2 font-semibold">Present</th>
                <th className="py-2 font-semibold">Total Dates</th>
                <th className="py-2 font-semibold">Attendance %</th>
              </tr>
            </thead>
            <tbody>
              {visibleSummary.map((item) => (
                <tr key={item.studentId} className="border-b border-outline-variant/10">
                  <td className="py-2 font-medium">{item.name}</td>
                  <td className="py-2 text-secondary">{item.rollNumber}</td>
                  <td className="py-2 text-secondary">{item.presentCount}</td>
                  <td className="py-2 text-secondary">{item.totalCount}</td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.attendancePercent < 40 ? "bg-error-container text-error" : "bg-secondary-container text-on-secondary-container"}`}>
                      {item.attendancePercent}%
                    </span>
                  </td>
                </tr>
              ))}
              {visibleSummary.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-3 text-secondary">No students/attendance records yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        )}
      </div>

      <div className="lg:col-span-2 bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20 space-y-4">
        <h3 className="font-headline text-xl font-bold text-primary">At Risk Students</h3>
        <p className="text-sm text-secondary">Attendance below 40%</p>

        {loading ? (
          <p className="text-sm text-secondary">Loading...</p>
        ) : atRisk.length === 0 ? (
          <p className="text-sm text-secondary">No students are below 40% attendance.</p>
        ) : (
          <div className="space-y-3">
            {atRisk.map((item) => (
              <div key={item.studentId} className="p-3 rounded-lg bg-error-container/60 border border-error/20">
                <p className="font-medium text-on-surface">{item.name}</p>
                <p className="text-xs text-secondary">{displayBatch(item.batch)} / {item.section}</p>
                <p className="text-sm font-semibold text-error">{item.attendancePercent}%</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
