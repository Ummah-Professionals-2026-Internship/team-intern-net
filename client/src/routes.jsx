// src/routes.jsx
import { createBrowserRouter, Navigate } from 'react-router-dom';
// import { useAuth } from './context/AuthContext';
import App from './App';
import ProtectedRoute from './routes/ProtectedRoute';
import SignIn from './views/onboarding/SignIn';


import MentorApplicationForm from './views/mentorSignup/MentorApplicationForm';
import MentorLayout from "./views/mentor/MentorLayout";

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

    {
        element: <ProtectedRoute />,
        children: [
            { path: '/dashboard', element: <App /> },
        ],
    },
    {
        path: '/mentor',
        element: <MentorLayout  />,
        // children: [
        //     { index: true, element: <MentorHome /> },
        //     { path: "requests",  element: <MentorRequests /> },
        //     { path: "meetings",  element: <MentorMeetings /> },
        //     { path: "availability", element: <MentorAvailability /> },
        //     { path: "profile",   element: <MentorProfile /> },
        //     { path: "settings",  element: <MentorSettings /> },
        // ]
    }


    // 2. Main Application Routes
    // {

    // }
    // ...
]);
