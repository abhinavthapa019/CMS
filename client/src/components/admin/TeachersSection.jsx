import Field from "./Field";

export default function TeachersSection({
  loading,
  users,
  search,
  onSearchChange,
  teacherForm,
  onTeacherFormChange,
  onSubmit,
  submitting,
  onDeleteUser,
  deletingUserId,
}) {
  return (
    <section className="grid lg:grid-cols-5 gap-4">
      <form onSubmit={onSubmit} className="lg:col-span-2 bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20 space-y-4">
        <h3 className="font-headline text-xl font-bold text-primary">Register Teacher</h3>
        <Field label="Name">
          <input
            required
            className="w-full rounded-lg bg-surface-container-highest border-none"
            value={teacherForm.name}
            onChange={(e) => onTeacherFormChange("name", e.target.value)}
          />
        </Field>
        <Field label="Email">
          <input
            required
            type="email"
            className="w-full rounded-lg bg-surface-container-highest border-none"
            value={teacherForm.email}
            onChange={(e) => onTeacherFormChange("email", e.target.value)}
          />
        </Field>
        <Field label="Password">
          <input
            required
            minLength={6}
            type="password"
            className="w-full rounded-lg bg-surface-container-highest border-none"
            value={teacherForm.password}
            onChange={(e) => onTeacherFormChange("password", e.target.value)}
          />
        </Field>
        <Field label="Role">
          <select
            className="w-full rounded-lg bg-surface-container-highest border-none"
            value={teacherForm.role}
            onChange={(e) => onTeacherFormChange("role", e.target.value)}
          >
            <option value="TEACHER">TEACHER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </Field>
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-lg bg-primary text-on-primary font-semibold disabled:opacity-60"
        >
          {submitting ? "Saving..." : "Create User"}
        </button>
      </form>

      <div className="lg:col-span-3 bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20 space-y-4 overflow-auto">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-headline text-xl font-bold text-primary">Users</h3>
          <input
            placeholder="Search name/email"
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
                <th className="py-2 font-semibold">Email</th>
                <th className="py-2 font-semibold">Role</th>
                <th className="py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-outline-variant/10">
                  <td className="py-2 font-medium">{u.name}</td>
                  <td className="py-2 text-secondary">{u.email}</td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${u.role === "ADMIN" ? "bg-tertiary-fixed text-on-tertiary-fixed-variant" : "bg-secondary-container text-on-secondary-container"}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-2">
                    <button
                      type="button"
                      onClick={() => onDeleteUser(u)}
                      disabled={deletingUserId === u.id}
                      className="px-3 py-1 rounded-md text-xs font-semibold bg-error-container text-error disabled:opacity-60"
                    >
                      {deletingUserId === u.id ? "Deleting..." : "Delete"}
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
