import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './pages/App.jsx'
import './styles/tailwind.css'
createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>)
