import { Navigate, useLocation } from 'react-router-dom';
import { isLoggedIn } from '../auth';

// Gate for everything behind the login screen. Without this, typing a route
// directly (or reloading after logout) drops you straight into the app.
export default function RequireAuth({ children }) {
  const location = useLocation();

  if (!isLoggedIn()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
