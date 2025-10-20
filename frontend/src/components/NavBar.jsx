import React from 'react'
import { Link, NavLink } from 'react-router-dom'
export default function NavBar(){return(<nav className='sticky top-0 z-10 backdrop-blur bg-slate-950/70 border-b border-slate-800'><div className='max-w-5xl mx-auto p-4 flex items-center gap-4'><Link to='/' className='flex items-center gap-2'><img src='/assets/logo.svg' className='h-8'/><span className='text-xl font-bold'>GridironAI</span></Link><div className='flex-1'></div><NavLink to='/' className={({isActive})=>'px-3 py-1 rounded-full '+(isActive?'bg-blue-600':'hover:bg-slate-800')}>Games</NavLink></div></nav>)}
