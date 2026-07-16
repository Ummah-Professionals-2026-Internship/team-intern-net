// src/routes.jsx
import { createBrowserRouter, Navigate } from 'react-router-dom';
// import { useAuth } from './context/AuthContext';
import App from './App';
import ProtectedRoute from './routes/ProtectedRoute';
import SignIn from './views/onboarding/SignIn';


import MentorApplicationForm from './views/mentorSignup/MentorApplicationForm';
import MentorLayout from "./views/mentor/MentorLayout";
import MentorAvailability from './views/mentor/MentorAvailability';
import MentorRequests from './views/mentor/MentorRequests';
import MentorDashboard from './views/mentor/MentorDashboard';
import MentorMeetings from './views/mentor/MentorMeetings';
import MentorRequestDetail from './views/mentor/MentorRequestDetail';
import MentorSettings from './views/mentor/MentorSettings';
import MentorProfile from './views/mentor/MentorProfile';


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
        children: [
            { index: true, element: <MentorDashboard />, },
            { path: "availability", element: <MentorAvailability /> },
            { path: "requests",  element: <MentorRequests /> },
            { path: "requests/:id", element: <MentorRequestDetail /> },
            { path: "meetings",  element: <MentorMeetings /> },
            { path: "profile",   element: <MentorProfile /> },
            { path: "settings",  element: <MentorSettings /> },
        ]
    }


    // 2. Main Application Routes
    // {

    // }
    // ...
]);
