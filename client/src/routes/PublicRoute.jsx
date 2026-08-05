import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

const PublicRoute = () => {
  const { user, loading } = useAuth();

  // 1. Wait until the authentication layer has finished checking the token
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#666' }}>
        Loading Session...
      </div>
    );
  }

  // 2. If the user is authenticated, route them away from public auth pages
  if (user) {
    switch (user.role) {
      case 'admin':   return <Navigate to="/admin/dashboard" replace />;
      case 'mentor':  return <Navigate to="/mentor/dashboard" replace />;
      case 'student': return <Navigate to="/student/dashboard" replace />;
      default:        
        // Safe fallback: If role is undefined or 'applicant', don't loop back to /signin.
        // Let them see the child routes or clear the session.
        return <Outlet />;
    }
  }

  // 3. If there is no user at all, safely allow them onto the sign-in/public page
  return <Outlet />;
};

export default PublicRoute;