import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from './context/useAuth';
import api from './api/api';
import './App.css';

function App() {
  const [message, setMessage] = useState('Loading...');
  const { logout } = useAuth();

  useEffect(() => {
    // Health check using the centralized API client instance
    api.get('/')
      .then((res) => {
        setMessage(res.data.message || "No message found");
      })
      .catch((err) => {
        console.error(err);
        setMessage("Backend not reachable");
      });
  }, []);

  return (
    <div className="app-layout">
      <header className="backend-status-bar">
        <span>API Connection Status: <strong>{message}</strong></span>
      </header>

      <main className="main-content-window">
        <Outlet />
        
        <button onClick={logout}>Log out</button>
      </main>
    </div>
  );
}

export default App;