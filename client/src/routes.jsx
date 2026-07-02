// src/routes.jsx
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import App from './App';
import SignIn from './views/onboarding/SignIn';

// import Home from './views/Home';
// import Admin from './views/admin/admin';
// import Mentor from './views/mentor/mentor';
// import User from './views/user/user';

const ProtectedRoute = () => {
  const { user } = useAuth();
  return user ? <Outlet /> : <Navigate to="/signin" replace />;
};

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
        element: <ProtectedRoute />,
        children: [
            { path: '/dashboard', element: <App /> },
        ],
    },

    // 2. Main Application Routes
    // {

    // }
    // ...
]);
