import { createBrowserRouter } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute';
import RoleGuard from './routes/RoleGuard';
import PublicRoute from './routes/PublicRoute';
import LandingPage from './views/landingpage/landingPage';
import SignIn from './views/onboarding/SignIn';
import MentorApplicationForm from './views/mentorSignup/MentorApplicationForm';
import CareerPrep from './views/onboarding/CareerPrep';

// Dashboard views & Sub-views
import AdminDashboard from './views/admin/AdminDash';
import MentorDashboard from './views/mentor/MentorDash';
import StudentLayout from './views/student/StudentLayout';
import StudentDashboard from './views/student/StudentDashboard';
import StudentProfile from './views/student/StudentProfile';
import StudentMeetings from './views/student/StudentMeetings';
import AvailabilityView from './views/availability/AvailabilityView';

export const router = createBrowserRouter([
  // Public routes
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/advisor',
    element: <MentorApplicationForm />,
  },
  {
    path: '/prep',
    element: <CareerPrep />,
  },

  // Auth / Guest-only routes
  {
    element: <PublicRoute />,
    children: [
      { path: '/signin', element: <SignIn /> },
    ],
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