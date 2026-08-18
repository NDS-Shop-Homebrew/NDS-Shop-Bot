import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { UIProvider } from "./context/UIContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Overview from "./pages/Overview";
import Tickets from "./pages/Tickets";
import Requests from "./pages/Requests";
import Announcements from "./pages/Announcements";
import Users from "./pages/Users";
import Permissions from "./pages/Permissions";
import Messages from "./pages/Messages";
import Send from "./pages/Send";
import Logs from "./pages/Logs";
import Settings from "./pages/Settings";
import Commands from "./pages/Commands";
import Leaderboard from "./pages/Leaderboard";
import NotFound from "./pages/NotFound";

function AnimatedOutlet() {
  const location = useLocation();
  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Outlet />
    </motion.div>
  );
}

function ProtectedRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">…</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Layout />;
}

export default function App() {
  return (
    <UIProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoutes />}>
              <Route element={<AnimatedOutlet />}>
                <Route path="/overview" element={<Overview />} />
                <Route path="/tickets" element={<Tickets />} />
                <Route path="/requests" element={<Requests />} />
                <Route path="/announcements" element={<Announcements />} />
                <Route path="/users" element={<Users />} />
                <Route path="/permissions" element={<Permissions />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/send" element={<Send />} />
                <Route path="/logs" element={<Logs />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/commands" element={<Commands />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/" element={<Navigate to="/overview" replace />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </UIProvider>
  );
}
