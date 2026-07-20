import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

const RoleGuard = ({ role }) => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/signin" replace />;
  if (user.role !== role) return <Navigate to="/signin" replace />;

  return <Outlet />;
};

export default RoleGuard;