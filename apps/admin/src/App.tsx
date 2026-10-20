import { lazy, Suspense, useEffect, type ComponentType, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { Layout } from './components/Layout';
import { connectFirebaseEmulators } from './config/firebase';
import { useAuth } from './context/AuthContext';

function lazyNamed<T extends Record<string, ComponentType>>(loader: () => Promise<T>, name: keyof T) {
  return lazy(async () => ({ default: (await loader())[name] }));
}

const AuditLogsPage = lazyNamed(() => import('./pages/AuditLogsPage'), 'AuditLogsPage');
const CompetitionsAdminsPage = lazyNamed(() => import('./pages/CompetitionsAdminsPage'), 'CompetitionsAdminsPage');
const DashboardPage = lazyNamed(() => import('./pages/DashboardPage'), 'DashboardPage');
const DepartmentsPage = lazyNamed(() => import('./pages/DepartmentsPage'), 'DepartmentsPage');
const EventsPage = lazyNamed(() => import('./pages/EventsPage'), 'EventsPage');
const HodsPage = lazyNamed(() => import('./pages/HodsPage'), 'HodsPage');
const LoginPage = lazyNamed(() => import('./pages/LoginPage'), 'LoginPage');
const StudentsPage = lazyNamed(() => import('./pages/StudentsPage'), 'StudentsPage');
const SuperAdminPage = lazyNamed(() => import('./pages/SuperAdminPage'), 'SuperAdminPage');
const VerificationLogsPage = lazyNamed(() => import('./pages/VerificationLogsPage'), 'VerificationLogsPage');
const SystemHealthPage = lazyNamed(() => import('./pages/SystemHealthPage'), 'SystemHealthPage');
const ActiveUsersPage = lazyNamed(() => import('./pages/ActiveUsersPage'), 'ActiveUsersPage');
const TechPulsePage = lazyNamed(() => import('./pages/TechPulsePage'), 'TechPulsePage');
const DailySparksPage = lazyNamed(() => import('./pages/DailySparksPage'), 'DailySparksPage');
const OpeningSpotlightsPage = lazyNamed(() => import('./pages/OpeningSpotlightsPage'), 'OpeningSpotlightsPage');

function RequireAdmin({ children }: { children: ReactNode }) {
  const { profile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="login-page">
        <p>Loading…</p>
      </div>
    );
  }

  if (!profile || !['ADMIN', 'SUPER_ADMIN'].includes(profile.role)) {
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
        <Route path="competitions-admins" element={<CompetitionsAdminsPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="tech-pulse" element={<TechPulsePage />} />
        <Route path="daily-sparks" element={<DailySparksPage />} />
        <Route path="opening-spotlight" element={<OpeningSpotlightsPage />} />
        <Route path="audit-logs" element={<AuditLogsPage />} />
        <Route path="verification-logs" element={<VerificationLogsPage />} />
        <Route path="health" element={<SystemHealthPage />} />
        <Route path="active-users" element={<ActiveUsersPage />} />
        <Route path="super-admin" element={<SuperAdminPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  useEffect(() => {
    connectFirebaseEmulators();
  }, []);

  return <Suspense fallback={<div className="login-page"><p>Loading…</p></div>}><AppRoutes /></Suspense>;
}
