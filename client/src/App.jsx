import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [message, setMessage] = useState('Loading...')

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
    <>
      <h1>{message}</h1>
    </>
  )
}

export default App