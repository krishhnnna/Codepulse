import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import SetupModal from './SetupModal';

export default function Navbar({ currentPage, onNavigate }) {
  const { darkMode, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);

  return (
    <>
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200/60 dark:border-zinc-800/60">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[60px]">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 8L3 12l5 4" />
                <path d="M16 8l5 4-5 4" />
                <polyline points="9 15 11 11 13 14 15 9" />
              </svg>
            </div>
            <span className="text-[16px] font-bold tracking-tight text-zinc-900 dark:text-white">
              Code<span className="text-indigo-500">Pulse</span>
            </span>
          </div>

          {/* Center Nav Links */}
          <div className="hidden md:flex items-center bg-zinc-100/80 dark:bg-zinc-800/60 rounded-xl p-1 gap-0.5">
            <button onClick={() => onNavigate('dashboard')} className={`px-4 py-1.5 text-[13px] font-semibold rounded-lg transition-all ${currentPage === 'dashboard' ? 'text-zinc-900 dark:text-white bg-white dark:bg-zinc-700 shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'}`}>
              Dashboard
            </button>
            <button onClick={() => onNavigate('cheater')} className={`px-4 py-1.5 text-[13px] font-semibold rounded-lg transition-all ${currentPage === 'cheater' ? 'text-zinc-900 dark:text-white bg-white dark:bg-zinc-700 shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'}`}>
              Integrity Check
            </button>
            {/* Share Card hidden — in development
            <button onClick={() => onNavigate('share')} className={`px-4 py-1.5 text-[13px] font-semibold rounded-lg transition-all ${currentPage === 'share' ? 'text-zinc-900 dark:text-white bg-white dark:bg-zinc-700 shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'}`}>
              Share Card
            </button>
            */}
          </div>

          {/* Right */}
          <div className="flex items-center gap-1.5">
            {/* Settings / Setup */}
            <button
              onClick={() => setSetupOpen(true)}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-indigo-500 dark:text-zinc-500 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
              title="Setup profiles"
            >
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-amber-500 dark:text-zinc-500 dark:hover:text-amber-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
              title={darkMode ? 'Light mode' : 'Dark mode'}
            >
              {darkMode ? (
                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                </svg>
              ) : (
                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                </svg>
              )}
            </button>

            {/* Mobile menu */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
            >
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                {mobileOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />}
              </svg>
            </button>

            {/* Logout */}
            <button
              onClick={logout}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
              title="Log out"
            >
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div className="md:hidden py-3 border-t border-zinc-100 dark:border-zinc-800/60 space-y-1">
            <button onClick={() => { onNavigate('dashboard'); setMobileOpen(false); }} className={`block w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${currentPage === 'dashboard' ? 'font-semibold text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-800' : 'font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}>Dashboard</button>
            <button onClick={() => { onNavigate('cheater'); setMobileOpen(false); }} className={`block w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${currentPage === 'cheater' ? 'font-semibold text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-800' : 'font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}>Integrity Check</button>
            {/* Share Card hidden — in development
            <button onClick={() => { onNavigate('share'); setMobileOpen(false); }} className={`block w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${currentPage === 'share' ? 'font-semibold text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-800' : 'font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}>Share Card</button>
            */}
          </div>
        )}
      </div>
    </nav>

    <SetupModal open={setupOpen} onClose={() => setSetupOpen(false)} />
    </>
  );
}
