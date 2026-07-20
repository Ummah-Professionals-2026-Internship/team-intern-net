// src/routes.jsx
import { createBrowserRouter, Navigate } from 'react-router-dom';
// import { useAuth } from './context/AuthContext';
import App from './App';
import ProtectedRoute from './routes/ProtectedRoute';

import SignIn from './views/onboarding/SignIn';
import MentorApplicationForm from './views/mentorSignup/MentorApplicationForm';
import CareerPrep from './views/onboarding/CareerPrep';
import AdminDash from './views/admin/AdminDash';


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
        path: '/advisor',
        element: <MentorApplicationForm />,
    },
    {
        path: '/prep',
        element: <CareerPrep />,
    },

    {
        element: <ProtectedRoute />,
        children: [
            { path: '/dashboard', element: <App /> },
        ],
    },

    {
        element: <ProtectedRoute allowedRoles={['admin']} />,
        children: [
            { path: '/admin', element: <AdminDash /> },
        ],
    },


    // 2. Main Application Routes
    // {

    // }
    // ...
]);
