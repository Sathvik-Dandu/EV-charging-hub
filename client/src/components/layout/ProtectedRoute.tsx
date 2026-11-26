import { Navigate, Outlet, useLocation } from 'react-router';
import { useAppSelector } from '../../app/store';
import { canOpen } from '../../config/navigation';

export default function ProtectedRoute() {
  const user = useAppSelector((s) => s.auth.user);
  const location = useLocation();

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!canOpen(user.role, location.pathname)) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
