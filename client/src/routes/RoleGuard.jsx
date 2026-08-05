import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

const RoleGuard = ({ allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#666' }}>
        Authenticating...
      </div>
    );
  }

  // If no user or the user's role is not included in the allowed roles array, bounce them out
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/signin" replace />;
  }

  return <Outlet />;
};

export default RoleGuard;