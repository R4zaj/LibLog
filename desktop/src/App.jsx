import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Literatures from './pages/Literatures';
import Borrowing from './pages/Borrowing';
import Attendance from './pages/Attendance';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';

import { ThemeProvider } from './components/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="literatures" element={<Literatures />} />
            <Route path="borrowing" element={<Borrowing />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
            <Route path="notifications" element={<Notifications />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
