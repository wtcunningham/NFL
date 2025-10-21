import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import NavBar from '../components/NavBar.jsx'
import Home from './Home.jsx'
import GameDetail from './GameDetail.jsx'
export default function App() { 

    return (
        <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <BrowserRouter><NavBar /><Routes><Route path='/' element={<Home />} /><Route path='/games/:id' element={<GameDetail />} /></Routes></BrowserRouter>
        </div>
    ) 
}
