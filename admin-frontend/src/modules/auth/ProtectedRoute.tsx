import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export const ProtectedRoute = () => {
  const { token, user } = useAuth();
  const location = useLocation();

  if (!token || !user || user.role !== 'ADMIN') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
};
