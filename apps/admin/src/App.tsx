import { useEffect, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { Layout } from './components/Layout';
import { connectFirebaseEmulators } from './config/firebase';
import { useAuth } from './context/AuthContext';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { DashboardPage } from './pages/DashboardPage';
import { DepartmentsPage } from './pages/DepartmentsPage';
import { HodsPage } from './pages/HodsPage';
import { LoginPage } from './pages/LoginPage';
import { ODPassesPage } from './pages/ODPassesPage';
import { ODRequestsPage } from './pages/ODRequestsPage';
import { StudentsPage } from './pages/StudentsPage';
import { VerificationLogsPage } from './pages/VerificationLogsPage';

function RequireAdmin({ children }: { children: ReactNode }) {
  const { profile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="login-page">
        <p>Loading…</p>
      </div>
    );
  }

  if (!profile || profile.role !== 'ADMIN') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAdmin>
            <Layout />
          </RequireAdmin>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="departments" element={<DepartmentsPage />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="hods" element={<HodsPage />} />
        <Route path="od-requests" element={<ODRequestsPage />} />
        <Route path="od-passes" element={<ODPassesPage />} />
        <Route path="audit-logs" element={<AuditLogsPage />} />
        <Route path="verification-logs" element={<VerificationLogsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  useEffect(() => {
    connectFirebaseEmulators();
  }, []);

  return <AppRoutes />;
}
