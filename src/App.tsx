import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import WelcomeScreen from './components/WelcomeScreen';
import RegistrationForm from './components/RegistrationForm';
import SuccessScreen from './components/SuccessScreen';
import AdminPanel from './components/AdminPanel';
import { Sun, Moon, ArrowLeft } from 'lucide-react';

export default function App() {
  const [portal, setPortal] = useState<'client' | 'admin'>(() => {
    const path = window.location.pathname.toLowerCase().replace(/\/$/, '');
    const hash = window.location.hash.toLowerCase();
    const search = window.location.search.toLowerCase();
    if (path === '/admin' || path.endsWith('/admin') || hash === '#/admin' || hash === '#admin' || search === '?admin' || search.includes('portal=admin')) {
      return 'admin';
    }
    return 'client';
  });

  const [currentScreen, setCurrentScreen] = useState<'welcome' | 'form' | 'success'>('welcome');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    // Check local preferences
    const stored = localStorage.getItem('team_glory_dark');
    return stored === 'true';
  });
  const [successMemberId, setSuccessMemberId] = useState<string>('');

  // Handle URL updates / popstate for seamless backward/forward & manual navigation
  useEffect(() => {
    const handleUrlChange = () => {
      const path = window.location.pathname.toLowerCase().replace(/\/$/, '');
      const hash = window.location.hash.toLowerCase();
      const search = window.location.search.toLowerCase();
      if (path === '/admin' || path.endsWith('/admin') || hash === '#/admin' || hash === '#admin' || search === '?admin' || search.includes('portal=admin')) {
        setPortal('admin');
      } else {
        setPortal('client');
      }
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  // Handle Dark mode class injection
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('team_glory_dark', String(darkMode));
  }, [darkMode]);

  const handleRegistrationSuccess = (id: string) => {
    setSuccessMemberId(id);
    setCurrentScreen('success');
  };

  const handleRestart = () => {
    setSuccessMemberId('');
    setCurrentScreen('welcome');
  };

  const navigateToPortal = (target: 'client' | 'admin') => {
    if (target === 'admin') {
      window.location.hash = '#/admin';
      setPortal('admin');
    } else {
      // Return to client portal
      if (window.location.pathname === '/admin' || window.location.pathname.endsWith('/admin')) {
        window.history.pushState(null, '', '/');
      }
      window.location.hash = '';
      setPortal('client');
      setCurrentScreen('welcome');
    }
  };

  const bgStyle = darkMode 
    ? { background: 'radial-gradient(circle at top left, #003366, #001a33)' }
    : { background: 'radial-gradient(circle at top left, #dfefff, #f1f5f9)' };

  return (
    <div 
      style={bgStyle}
      className="min-h-screen text-gray-800 dark:text-gray-100 transition-all duration-300 flex flex-col font-sans"
    >
      
      {/* HEADER BAR */}
      <header className="border-b border-white/20 dark:border-white/10 bg-white/45 dark:bg-slate-900/35 sticky top-0 z-40 backdrop-blur-md transition-all duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          
          {/* Logo / Brand Name */}
          <div 
            onClick={() => {
              if (portal === 'client') {
                handleRestart();
              }
            }}
            className={`flex items-center gap-2.5 select-none group ${portal === 'client' ? 'cursor-pointer' : ''}`}
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr transition-transform flex items-center justify-center font-black shadow-md ${
              portal === 'admin' 
                ? 'from-red-600 to-amber-500 shadow-red-500/10' 
                : 'from-blue-600 to-indigo-400 shadow-blue-500/10 group-hover:scale-105'
            } text-white`}>
              {portal === 'admin' ? '🛡️' : 'G'}
            </div>
            <div>
              <span className={`text-[10px] font-bold uppercase tracking-widest block leading-tight ${
                portal === 'admin' ? 'text-red-500 dark:text-red-400' : 'text-blue-600 dark:text-blue-300'
              }`}>
                RCCG HOUSE OF GLORY, YP2
              </span>
              <h1 className="text-base sm:text-lg font-black text-gray-950 dark:text-white tracking-tight leading-none mt-0.5 font-sans">
                {portal === 'admin' ? 'ADMIN SECURE PORTAL' : 'TEAM GLORY'}
              </h1>
            </div>
          </div>

          {/* Active Navigation Actions depending on portal */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            {portal === 'admin' ? (
              <button
                onClick={() => navigateToPortal('client')}
                className="inline-flex items-center gap-1.5 bg-gradient-to-r from-slate-600 to-slate-800 hover:from-slate-700 hover:to-slate-900 text-white px-4 py-2 rounded-full text-xs font-semibold shadow-sm transition-all cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Go to Client Site
              </button>
            ) : null}

            {/* Dark Mode Checker Switch */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 border border-gray-150 dark:border-gray-850 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition duration-240 text-gray-500 dark:text-gray-400 cursor-pointer"
              aria-label="Toggle visual theme"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-violet-600" />}
            </button>
          </div>
        </div>
      </header>

      {/* GLOBAL BODY CONTAINER */}
      <main className="flex-grow flex flex-col justify-center py-8">
        <AnimatePresence mode="wait">
          {portal === 'client' ? (
            <motion.div
              key="client-portal"
              initial={{ opacity: 0, scale: 0.99, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.99, y: -10 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              {currentScreen === 'welcome' && (
                <WelcomeScreen 
                  onProceed={() => setCurrentScreen('form')} 
                  darkMode={darkMode}
                />
              )}

              {currentScreen === 'form' && (
                <RegistrationForm 
                  onSuccess={handleRegistrationSuccess}
                  onBack={() => setCurrentScreen('welcome')}
                  darkMode={darkMode}
                />
              )}

              {currentScreen === 'success' && (
                <SuccessScreen 
                  memberId={successMemberId} 
                  onReset={handleRestart}
                />
              )}
            </motion.div>
          ) : (
            <motion.div
              key="admin-portal"
              initial={{ opacity: 0, scale: 0.99, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.99, y: -10 }}
              transition={{ duration: 0.25 }}
              className="w-full"
            >
              <AdminPanel 
                darkMode={darkMode}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* FOOTER COVENANT METADATA */}
      <footer className="border-t border-white/15 dark:border-white/10 py-6 text-center text-xs text-slate-500 dark:text-blue-200/70 bg-white/25 dark:bg-slate-950/20 backdrop-blur-md transition-colors duration-200 print:hidden">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p>© {new Date().getFullYear()} RCCG HOUSE OF GLORY YP2 - TEAM GLORY CENTRAL</p>
          <div className="text-[10px] text-gray-500/80 dark:text-gray-400 flex flex-wrap justify-center items-center gap-x-3 gap-y-1 font-medium">
            <span className="flex items-center gap-1.5">
              <span>System Status:</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              <span className="text-emerald-600 dark:text-emerald-400">● Operational</span>
            </span>
            <span className="opacity-40">|</span>
            <span>Version 2.5.0-PRO</span>
            
            {portal === 'client' && (
              <>
                <span className="opacity-40">|</span>
                <span className="text-slate-400/80 dark:text-slate-500 select-none">
                  Admin portal is isolated to `/admin` or `#/admin` URI.
                </span>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
