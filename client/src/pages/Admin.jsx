import AdminWorkspace from "../components/admin/AdminWorkspace";
import { useAuth } from "../state/useAuth.jsx";

export default function Admin() {
  const { user, token, logout } = useAuth();

  return <AdminWorkspace user={user} token={token} onLogout={logout} />;
}
