import { createContext, useContext, useState, useEffect } from "react";
import { api } from "../api";

const AuthCtx = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!token) return;
    api("/api/auth/me", { token })
      .then((d) => setUser(d.user))
      .catch(() => {
        setToken("");
        localStorage.removeItem("token");
      });
  }, [token]);

  const login = async (email, password) => {
    const d = await api("/api/auth/login", { method: "POST", body: { email, password } });
    setToken(d.token);
    localStorage.setItem("token", d.token);
    setUser(d.user);
    return d;
  };

  const logout = () => {
    setToken("");
    setUser(null);
    localStorage.removeItem("token");
  };

  return <AuthCtx.Provider value={{ token, user, login, logout }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
