import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import WelcomeScreen from './components/WelcomeScreen';
import RegistrationForm from './components/RegistrationForm';
import SuccessScreen from './components/SuccessScreen';
import AdminPanel from './components/AdminPanel';
import { Sun, Moon, ShieldAlert, Heart, Calendar } from 'lucide-react';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'welcome' | 'form' | 'success' | 'admin'>('welcome');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    // Check local preferences
    const stored = localStorage.getItem('team_glory_dark');
    return stored === 'true';
  });
  const [successMemberId, setSuccessMemberId] = useState<string>('');

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
            onClick={handleRestart}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-400 text-white flex items-center justify-center font-black shadow-md shadow-blue-500/10 group-hover:scale-105 transition-transform">
              G
            </div>
            <div>
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-300 uppercase tracking-widest block leading-tight">RCCG HOUSE OF GLORY, YP2</span>
              <h1 className="text-base sm:text-lg font-black text-gray-950 dark:text-white tracking-tight leading-none mt-0.5 font-sans">
                TEAM GLORY
              </h1>
            </div>
          </div>

          {/* Active Navigation Actions */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            {currentScreen !== 'admin' ? (
              <button
                onClick={() => setCurrentScreen('admin')}
                className="inline-flex items-center gap-1.5 bg-blue-500/15 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300 hover:bg-blue-500/25 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer"
                title="Admin Dashboard"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Admin Access</span>
              </button>
            ) : (
              <button
                onClick={() => setCurrentScreen('welcome')}
                className="inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-500 text-white hover:opacity-90 px-4 py-2 rounded-full text-xs font-semibold shadow-sm transition-all cursor-pointer"
              >
                <Heart className="w-3.5 h-3.5 fill-current" />
                Volunteer Registration
              </button>
            )}

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
          <motion.div
            key={currentScreen}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.35 }}
            className="w-full"
          >
            {/* Screen Router */}
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

            {currentScreen === 'admin' && (
              <AdminPanel 
                darkMode={darkMode}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* FOOTER COVENANT METADATA */}
      <footer className="border-t border-white/15 dark:border-white/10 py-6 text-center text-xs text-slate-500 dark:text-blue-200/70 bg-white/25 dark:bg-slate-950/20 backdrop-blur-md transition-colors duration-200 print:hidden">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p>© {new Date().getFullYear()} RCCG HOUSE OF GLORY YP2 - TEAM GLORY CENTRAL</p>
          <p className="text-[10px] text-gray-500/80 dark:text-gray-400 flex justify-center items-center gap-1.5 font-medium">
            <span>System Status:</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
            <span className="text-emerald-600 dark:text-emerald-400">● Operational</span>
            <span className="opacity-40">|</span>
            <span>Version 2.4.0-PRO</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
