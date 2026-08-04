import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

const PublicRoute = () => {
  const { user } = useAuth();

  if (user) {
    switch (user.role) {
      case 'admin':   return <Navigate to="/admin/dashboard" replace />;
      case 'mentor':  return <Navigate to="/mentor/dashboard" replace />;
      case 'student': return <Navigate to="/student/dashboard" replace />;
      default:        return <Navigate to="/signin" replace />;
    }
  }

  return <Outlet />;
};

export default PublicRoute;