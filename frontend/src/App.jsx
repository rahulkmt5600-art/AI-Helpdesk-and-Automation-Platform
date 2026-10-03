import { Routes, Route } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import PrivateRoute from "./components/PrivateRoute";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import UserDashboard from "./pages/UserDashboard";
import AgentDashboard from "./pages/AgentDashboard";
import TeamLeadDashboard from "./pages/TeamLeadDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ManageTeams from "./pages/ManageTeams";
import ManageUsers from "./pages/ManageUsers";
import TicketDetail from "./pages/TicketDetail";
import KnowledgeBase from "./pages/KnowledgeBase";

// The "/" route renders a different dashboard component depending on role.
function Home() {
  const { user } = useAuth();

  if (user.role === "admin") return <AdminDashboard />;
  if (user.role === "teamLead") return <TeamLeadDashboard />;
  if (user.role === "agent") return <AgentDashboard />;

  return <UserDashboard />;
}

export default function App() {
  return (
    <Routes>
      {/* Auth pages */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Everything else requires authentication */}
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <DashboardShell />
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

function DashboardShell() {
  return (
    <div className="app-shell">
      <Navbar />

      <main className="app-main">
        <Routes>
          {/* Dashboard */}
          <Route path="/" element={<Home />} />

          {/* Ticket details */}
          <Route
            path="/tickets/:id"
            element={<TicketDetail />}
          />

          {/* Knowledge Base */}
          <Route
            path="/knowledge"
            element={<KnowledgeBase />}
          />

          {/* Admin - Manage Teams */}
          <Route
            path="/teams"
            element={
              <PrivateRoute roles={["admin"]}>
                <ManageTeams />
              </PrivateRoute>
            }
          />

          {/* Admin - Manage Users */}
          <Route
            path="/users"
            element={
              <PrivateRoute roles={["admin"]}>
                <ManageUsers />
              </PrivateRoute>
            }
          />
        </Routes>
      </main>
    </div>
  );
}