import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import LoginPage from "./pages/login/Login";
import AdminPage from "./pages/admin/Admin";
import StudentHome from "./pages/student/Home";
import SupplierHome from "./pages/supplier/Home";
import { AppBar, Box, Button, Toolbar, Typography } from "@mui/material";
import { AuthProvider, useAuth } from "./auth/AuthContext";

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}

function Shell() {
  const { user, loading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const onLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };
  const title = user ? `${user.role}` : "GenAI Word App";
  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>{title}</Typography>
          {user ? <Button color="inherit" onClick={onLogout}>Logout</Button> : null}
        </Toolbar>
      </AppBar>
      <Routes>
        <Route path="/login" element={<LoginGate />} />
        <Route path="/Admin/*" element={<RequireRole roles={["ADMIN"]}><AdminPage /></RequireRole>} />
        <Route path="/Student/*" element={<RequireRole roles={["STUDENT"]}><StudentHome /></RequireRole>} />
        <Route path="/Supplier/*" element={<RequireRole roles={["SUPPLIER"]}><SupplierHome /></RequireRole>} />
        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Box>
  );
}

function LoginGate() {
  const { user, loading } = useAuth();
  if (loading) return <Box p={4}>Loading...</Box>;
  if (user) return <Navigate to={`/${capitalize(user.role)}`} replace />;
  return <LoginPage />;
}

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <Box p={4}>Loading...</Box>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={`/${capitalize(user.role)}`} replace />;
}

function RequireRole({ roles, children }: { roles: ("ADMIN"|"SUPPLIER"|"STUDENT")[]; children: any }) {
  const { user, loading } = useAuth();
  if (loading) return <Box p={4}>Loading...</Box>;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={`/${capitalize(user.role)}`} replace />;
  return children;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

