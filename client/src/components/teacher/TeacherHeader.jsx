export default function TeacherHeader({ user, onLogout }) {
  return (
    <header className="sticky top-0 z-30 bg-surface-container-low/90 backdrop-blur border-b border-outline-variant/20">
      <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-secondary text-on-primary grid place-items-center">
            <span className="material-symbols-outlined">menu_book</span>
          </div>
          <div>
            <p className="font-headline text-xl md:text-2xl font-extrabold tracking-tight text-primary">Teacher Console</p>
            <p className="text-xs text-secondary uppercase tracking-wider">Academic Operations</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-secondary hidden md:block">{user?.name || "Teacher"}</p>
          <button
            onClick={onLogout}
            className="px-4 py-2 rounded-lg bg-surface-container-high text-secondary hover:text-primary transition"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
