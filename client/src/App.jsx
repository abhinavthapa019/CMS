import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import Teacher from "./pages/Teacher";
import Student from "./pages/Student";
import FeePayment from "./pages/FeePayment";
import FeePaymentSuccess from "./pages/FeePaymentSuccess";
import { AuthProvider } from "./state/auth.jsx";
import { useAuth } from "./state/useAuth.jsx";

function Protected({ children, roles }) {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/admin"
            element={
              <Protected roles={["ADMIN"]}>
                <Admin />
              </Protected>
            }
          />
          <Route
            path="/teacher"
            element={
              <Protected roles={["TEACHER"]}>
                <Teacher />
              </Protected>
            }
          />
          <Route
            path="/student"
            element={
              <Protected roles={["STUDENT"]}>
                <Student />
              </Protected>
            }
          />
          <Route
            path="/student/fees/pay/:feeId"
            element={
              <Protected roles={["STUDENT"]}>
                <FeePayment />
              </Protected>
            }
          />
          <Route
            path="/student/fees/success"
            element={
              <Protected roles={["STUDENT"]}>
                <FeePaymentSuccess />
              </Protected>
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}