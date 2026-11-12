import { Navigate, useLocation } from 'react-router-dom';
import { homePath, useAuth } from '../context/AuthContext';
import { FullPageSpinner } from '../components/ui';

// Frontend guard for UX only. The server enforces authorization on every API call.
export default function ProtectedRoute({ roles, permission, children }) {
  const { user, loading, hasPermission } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homePath(user.role)} replace />;
  if (permission && !hasPermission(permission)) return <Navigate to="/unauthorized" replace />;
  return children;
}
