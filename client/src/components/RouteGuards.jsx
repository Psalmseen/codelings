import { Navigate, useLocation } from 'react-router';
import { homePath, useAuth } from '../context/AuthContext';
import { PageLoader } from './ui';

export function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  return <Navigate to={user ? homePath(user) : '/login'} replace />;
}

export function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  return user ? <Navigate to={homePath(user)} replace /> : children;
}

export function RequireAuth({ roles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!roles.includes(user.role)) return <Navigate to={homePath(user)} replace />;
  // Accounts created with an emailed temporary password must set their own first
  if (user.mustChangePassword && location.pathname !== '/change-password') return <Navigate to="/change-password" replace />;
  return children;
}
