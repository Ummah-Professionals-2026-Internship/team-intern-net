// src/routes.jsx
import { createBrowserRouter, Navigate } from 'react-router-dom';
// import { useAuth } from './context/AuthContext';
import App from './App';
import ProtectedRoute from './routes/ProtectedRoute';

import SignIn from './views/onboarding/SignIn';
import MentorApplicationForm from './views/mentorSignup/MentorApplicationForm';
import AvailabilityView from './views/availability/AvailabilityView';
import StudentLayout from './views/student/StudentLayout';


// Moved ProtectedRoute to routes folder.
//
// const ProtectedRoute = () => {
//   const { user } = useAuth();
//   return user ? <Outlet /> : <Navigate to="/signin" replace />;
// };

export const router = createBrowserRouter([
    // 1. Auth Routes
    {
        path: '/',
        element: <Navigate to="/signin" replace />,
    },
    {
        path: '/signin',
        element: <SignIn />,
    },
    {
        path: '/prep',
        element: <MentorApplicationForm />,
    },
    // Temporary test route
    {
        path: '/availability/:mentorId',
        element: <AvailabilityView mentorId={7} />,
    },

    {
        element: <ProtectedRoute />,
        children: [
            { path: '/dashboard', element: <App /> },
        ],
    },

    {
  path: '/student',
  element: <StudentLayout />,
  children: [
    { path: 'availability', element: <AvailabilityView /> },
  ],
},


    // 2. Main Application Routes
    // {

    // }
    // ...
]);
