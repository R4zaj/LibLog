import { HashRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import MainLayout from './MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Literatures from './pages/Literatures';
import Borrowing from './pages/Borrowing';
import Attendance from './pages/Attendance';
import Settings from './pages/Settings';
import StudentActivities from './pages/StudentActivities';

import RequireAuth from './components/RequireAuth';

// Reports is the only page that needs xlsx, jspdf and html2canvas. Loading it
// on demand keeps roughly half the bundle out of the initial download.
const Reports = lazy(() => import('./pages/Reports'));
import ReportsSkeleton from './components/ReportsSkeleton';

import { ThemeProvider } from './components/ThemeContext';
import { NetworkProvider } from './contexts/NetworkContext';

function App() {
  return (
    <ThemeProvider>
      <NetworkProvider>
        <HashRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <RequireAuth>
                  <MainLayout />
                </RequireAuth>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="literatures" element={<Literatures />} />
              <Route path="borrowing" element={<Borrowing />} />
              <Route path="attendance" element={<Attendance />} />
              <Route path="student-activities" element={<StudentActivities />} />
              <Route
                path="reports"
                element={
                  <Suspense fallback={<ReportsSkeleton />}>
                    <Reports />
                  </Suspense>
                }
              />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </HashRouter>
      </NetworkProvider>
    </ThemeProvider>
  );
}

export default App;
