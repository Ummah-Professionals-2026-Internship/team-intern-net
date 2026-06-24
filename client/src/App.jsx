import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import SignIn from './views/onboarding/SignIn';
import './App.css';

// import { Router } from 'express'

function App() {
  const [message, setMessage] = useState('Loading...')
  const { logout } = useAuth();

  useEffect(() => {
    fetch('http://127.0.0.1:8000/')
      .then(res => res.json())
      .then(data => {
        console.log(data)
        setMessage(data.message || "No message found")
      })
      .catch(err => {
        console.error(err)
        setMessage("Backend not reachable")
      })
      
  }, [])

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
  )
}

export default App;