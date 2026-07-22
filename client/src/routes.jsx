// src/routes.jsx
import { createBrowserRouter } from 'react-router-dom';
import SignIn from './views/onboarding/SignIn';
import MentorApplicationForm from './views/mentorSignup/MentorApplicationForm';
import CareerPrep from './views/onboarding/CareerPrep';
import RoleGuard from './routes/RoleGuard';
import PublicRoute from './routes/PublicRoute';

import LandingPage from './views/landingpage/landingPage';
import AdminDashboard from './views/admin/AdminDash';
import StudentDashboard from './views/student/StudentDash';
import MentorDashboard from './views/mentor/MentorDash';

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

  // Role-protected routes
  {
    element: <RoleGuard role="admin" />,
    children: [
      { path: '/admin/dashboard', element: <AdminDashboard /> },
    ],
  },
  {
    element: <RoleGuard role="mentor" />,
    children: [
      { path: '/mentor/dashboard', element: <MentorDashboard /> },
    ],
  },
  {
    element: <RoleGuard role="student" />,
    children: [
      { path: '/student/dashboard', element: <StudentDashboard /> },
    ],
  },
]);