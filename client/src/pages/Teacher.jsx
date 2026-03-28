import TeacherWorkspace from "../components/teacher/TeacherWorkspace";
import { useAuth } from "../state/auth.jsx";

export default function Teacher() {
  const { user, token, logout } = useAuth();

  if (user?.role === "ADMIN") {
    return (
      <div className="min-h-screen bg-background px-6 py-10 flex items-center justify-center">
        <div className="max-w-xl w-full rounded-2xl bg-surface-container-lowest border border-outline-variant/20 p-8 space-y-4">
          <h1 className="font-headline text-3xl font-extrabold text-primary">Admin Workspace</h1>
          <p className="text-secondary">You are signed in as ADMIN. Please use the admin dashboard route.</p>
        </div>
      </div>
    );
  }

  return <TeacherWorkspace user={user} token={token} onLogout={logout} />;
}
