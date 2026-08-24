import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export const AthleteRoute = () => {
  const { token, user } = useAuth();
  const location = useLocation();

  if (!token || !user || user.role !== 'ATHLETE') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
};
