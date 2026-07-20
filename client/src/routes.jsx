// src/routes.jsx
import { createBrowserRouter, Navigate } from 'react-router-dom';
// import { useAuth } from './context/AuthContext';
import App from './App';
import ProtectedRoute from './routes/ProtectedRoute';
import SignIn from './views/onboarding/SignIn';


import MentorApplicationForm from './views/mentorSignup/MentorApplicationForm';
import RoleGuard from './routes/RoleGuard';
import AdminDashboard from './views/admin/AdminDash';
import StudentDashboard from './views/student/StudentDash';
import MentorDashboard from './views/mentor/MentorDash';
import PublicRoute from './routes/PublicRoute';
import LandingPage from './views/landingpage/landingPage';
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
