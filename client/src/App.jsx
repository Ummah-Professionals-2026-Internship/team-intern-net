import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [message, setMessage] = useState('Loading...')

  useEffect(() => {
    fetch('http://localhost:8000/')
      .then(res => res.json())
      .then(data => {
        console.log(data)
        setMessage(data.message)
      })
      .catch(err => {
        console.error(err)
        setMessage('Error')
      })
      
  }, [])

  return (
    <>
      <h1>{message}</h1>
    </>
  )
}

export default App