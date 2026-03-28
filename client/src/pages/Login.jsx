import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../state/auth.jsx";

export default function Login() {
  const { login, token, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!token || !user) return;
    if (user.role === "ADMIN") navigate("/admin", { replace: true });
    if (user.role === "TEACHER") navigate("/teacher", { replace: true });
  }, [token, user, navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await login(email, password);
      const role = res?.user?.role;
      if (role === "ADMIN") navigate("/admin", { replace: true });
      else if (role === "TEACHER") navigate("/teacher", { replace: true });
      else navigate("/login", { replace: true });
    } catch (e) {
      setErr(e.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fef9f0] flex flex-col">
      <header className="w-full px-6 py-8 md:px-20 md:py-12 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary flex items-center justify-center rounded-xl shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-white">school</span>
          </div>
          <h1 className="font-headline font-extrabold text-2xl tracking-tight text-primary">CollegeAdmin</h1>
        </div>
        <p className="hidden md:block font-label text-sm font-semibold uppercase tracking-[0.2em] text-secondary opacity-60">
          Registrar Portal
        </p>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 pb-20">
        <div className="relative w-full max-w-md">
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-secondary/20 rounded-full blur-3xl -z-10" />
          <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-primary/5 rounded-full blur-2xl -z-10" />
          <div className="bg-white p-8 md:p-10 rounded-2xl shadow-[0_24px_48px_rgba(0,0,0,0.04)] border border-outline-variant/10">
            <div className="mb-10 text-center">
              <h2 className="font-headline text-3xl font-bold text-on-surface mb-2 tracking-tight">Welcome back</h2>
              <p className="text-secondary font-medium">Please enter your credentials.</p>
              <div className="mt-4 inline-flex items-center gap-2 text-secondary text-sm font-medium bg-surface-container-high px-3 py-2 rounded-full">
                <span className="material-symbols-outlined text-[18px] text-primary">login</span>
                <span>Sign in to continue</span>
              </div>
            </div>
            <form className="space-y-6" onSubmit={onSubmit}>
              <div className="space-y-2">
                <label className="block font-label text-xs font-bold uppercase tracking-wider text-secondary px-1">
                  Institutional Email
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-secondary/50 group-focus-within:text-primary transition-colors">
                    <span className="material-symbols-outlined text-[20px]">alternate_email</span>
                  </div>
                  <input
                    className="block w-full pl-11 pr-12 py-4 bg-surface-container-highest border-none rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-white text-on-surface placeholder-secondary/40 transition-all duration-300"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="name@university.edu"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block font-label text-xs font-bold uppercase tracking-wider text-secondary px-1">
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-secondary/50 group-focus-within:text-primary transition-colors">
                    <span className="material-symbols-outlined text-[20px]">lock</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-secondary/60 hover:text-primary transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                  <input
                    className="block w-full pl-11 pr-12 py-4 bg-surface-container-highest border-none rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-white text-on-surface placeholder-secondary/40 transition-all duration-300"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {err && <p className="text-sm text-red-600">{err}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 bg-gradient-to-br from-[#7c3aed] to-[#a855f7] text-white font-headline font-bold text-lg rounded-full shadow-lg shadow-purple-400/30 hover:shadow-xl hover:scale-[1.01] active:scale-[0.98] transition-all duration-200 disabled:opacity-60"
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[22px]">
                    {loading ? "progress_activity" : "arrow_forward"}
                  </span>
                  <span>{loading ? "Signing in..." : "Sign in"}</span>
                </div>
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}