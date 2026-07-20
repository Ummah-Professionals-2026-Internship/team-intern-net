import { createBrowserRouter } from 'react-router-dom';
import SignIn from './views/onboarding/SignIn';
import MentorApplicationForm from './views/mentorSignup/MentorApplicationForm';
import RoleGuard from './routes/RoleGuard';
import AdminDashboard from './views/admin/AdminDash';
import StudentDashboard from './views/student/StudentDash';
import MentorDashboard from './views/mentor/MentorDash';
import PublicRoute from './routes/PublicRoute';
import LandingPage from './views/landingpage/landingPage';

export const router = createBrowserRouter([
  // Public routes
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/siging',
    element: <SignIn />,
  },
  
  {
    element: <PublicRoute />,
    children: [
        { path: '/signin', element: <SignIn /> },
    ],
    
  },

  {
    path: '/apply/mentor',
    element: <MentorApplicationForm />,
  },

  // Admin routes
  {
    element: <RoleGuard role="admin" />,
    children: [
      { path: '/admin/dashboard', element: <AdminDashboard /> },
    ],
  },

  // Mentor routes
  {
    element: <RoleGuard role="mentor" />,
    children: [
      { path: '/mentor/dashboard', element: <MentorDashboard /> },
    ],
  },

  // Student routes
  {
    element: <RoleGuard role="student" />,
    children: [
      { path: '/student/dashboard', element: <StudentDashboard /> },
    ],
  },
]);
