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
// import PublicRoute from './routes/PublicRoute';
// import LandingPage from './views/landingpage/landingPage';
import MentorLayout from "./views/mentor/MentorLayout";
import MentorAvailability from './views/mentor/MentorAvailability';
import MentorRequests from './views/mentor/MentorRequests';
import MentorDashboard from './views/mentor/MentorDashboard';
import MentorMeetings from './views/mentor/MentorMeetings';
import MentorRequestDetail from './views/mentor/MentorRequestDetail';
import MentorSettings from './views/mentor/MentorSettings';
import MentorProfile from './views/mentor/MentorProfile';


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
      {
        path: "/mentor",
        element: <MentorLayout />,
        children: [
          { index: true, element: <MentorDashboard /> },
          { path: "dashboard", element: <MentorDashboard /> }, // optional
          { path: "availability", element: <MentorAvailability /> },
          { path: "requests", element: <MentorRequests /> },
          { path: "requests/:id", element: <MentorRequestDetail /> },
          { path: "meetings", element: <MentorMeetings /> },
          { path: "profile", element: <MentorProfile /> },
          { path: "settings", element: <MentorSettings />},
        ],
      },
      
    ],
  },
  {
    element: <RoleGuard role="student" />,
    children: [
      { path: '/student/dashboard', element: <StudentDashboard /> },
    ],
  },
]);