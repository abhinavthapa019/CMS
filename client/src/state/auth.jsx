import { useState, useEffect } from "react";
import { api } from "../api";
import { AuthCtx } from "./authContext.jsx";

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
