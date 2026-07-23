import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

const ProtectedRoute = ({ allowedRoles }) => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/signin" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/signin" replace />;
  }
  return <Outlet />;
};

export default ProtectedRoute;