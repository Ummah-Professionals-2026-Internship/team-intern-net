import { createBrowserRouter, Navigate } from 'react-router-dom';
import App from './App';
import ProtectedRoute from './routes/ProtectedRoute';
import RoleGuard from './routes/RoleGuard';
import PublicRoute from './routes/PublicRoute';
import LandingPage from './views/landingpage/landingPage';
import StudentProfile from './views/student/StudentProfile';
import StudentMeetings from './views/student/StudentMeetings';
// Main branch onboarding paths
import SignIn from './views/onboarding/SignIn';
import MentorApplicationForm from './views/mentorSignup/MentorApplicationForm';

// Dashboard views
import AdminDashboard from './views/admin/AdminDash';
import MentorDashboard from './views/mentor/MentorDash';
import StudentLayout from './views/student/StudentLayout';
import StudentDashboard from './views/student/StudentDashboard';
import AvailabilityView from './views/availability/AvailabilityView';

export const router = createBrowserRouter([
  // Public routes
  {
    path: '/',
    element: <LandingPage />,
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
  {
    path: '/availability/:mentorId',
    element: <AvailabilityView mentorId="7" />,
  },
  
  // Protected Dashboard Routes
  {
    element: <ProtectedRoute />,
    children: [
      // STUDENT ROUTES
      {
        element: <RoleGuard allowedRoles={['student']} />,
        children: [
          {
            element: <StudentLayout />,
            children: [
              { path: '/student/dashboard', element: <StudentDashboard /> },
              { path: '/student/profile', element: <StudentProfile /> },
              { path: '/student/meetings', element: <StudentMeetings /> },
            ],
          },
        ],
      },
      // MENTOR ROUTES
      {
        element: <RoleGuard allowedRoles={['mentor']} />,
        children: [
          { path: '/mentor/dashboard', element: <MentorDashboard /> },
        ],
      },
      // ADMIN ROUTES
      {
        element: <RoleGuard allowedRoles={['admin']} />,
        children: [
          { path: '/admin/dashboard', element: <AdminDashboard /> },
        ],
      },
    ],
  },
]);

export default router;