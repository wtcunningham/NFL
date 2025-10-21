import React, { useEffect, useState } from 'react';

export default function ThemeToggle({ className = '' }) {
  const [isDark, setIsDark] = useState(
    () => document.documentElement.classList.contains('dark')
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    try { localStorage.setItem('theme', isDark ? 'dark' : 'light'); } catch {}
  }, [isDark]);

  return (
    <button
      type="button"
      onClick={() => setIsDark(d => !d)}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={
        `inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm 
         border transition-colors select-none
         bg-white text-slate-800 border-slate-300 hover:bg-slate-50
         dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 dark:hover:bg-slate-700
         ${className}`
      }
    >
      {isDark ? (
        // Sun icon
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="opacity-90">
          <path d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.8 1.42-1.42zm10.48 14.32l1.79 1.8 1.41-1.41-1.8-1.79-1.4 1.4zM12 4V1h-0v3h0zm0 19v-3h0v3h0zM4 12H1v0h3v0zm19 0h-3v0h3v0zM6.76 19.16l-1.42 1.42-1.79-1.8 1.41-1.41 1.8 1.79zM19.16 6.76l1.4-1.4 1.8 1.79-1.41 1.41-1.79-1.8zM12 8a4 4 0 100 8 4 4 0 000-8z"/>
        </svg>
      ) : (
        // Moon icon
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="opacity-90">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
        </svg>
      )}
      <span className="hidden sm:inline">{isDark ? 'Dark' : 'Light'}</span>
    </button>
  );
}
