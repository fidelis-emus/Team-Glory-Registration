import { motion } from 'motion/react';
import { ShieldCheck, Heart, ArrowRight } from 'lucide-react';

interface WelcomeScreenProps {
  onProceed: () => void;
  darkMode: boolean;
  branding?: {
    logoBase64: string | null;
    headerTitle: string;
    headerSubtitle: string;
    footerText: string;
  };
}

export default function WelcomeScreen({ onProceed, darkMode, branding }: WelcomeScreenProps) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/15 dark:bg-blue-400/15 border border-blue-500/20 mb-4 text-blue-600 dark:text-blue-400">
          <Heart className="w-8 h-8 fill-blue-500/10 dark:fill-blue-405/10 animate-pulse" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-800 dark:text-white mb-3">
          Welcome to <span className="text-blue-600 dark:text-blue-400">{branding?.headerSubtitle || 'TEAM GLORY!'}</span>
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-blue-100/80 max-w-lg mx-auto font-medium leading-relaxed">
          Thank you for your interest in serving at {branding?.headerTitle || 'RCCG House of Glory, YP2'}. We believe every hand counts in the kingdom. Let's serve with excellence and purpose!
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="frosted-glass-card-light dark:frosted-glass-card-dark rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden mb-8"
      >
        {/* Decorative backdrop elements inside card */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/15 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none"></div>

        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2 border-b border-slate-200/50 dark:border-white/10 pb-3">
          <ShieldCheck className="text-blue-600 dark:text-blue-450 w-5 h-5 flex-shrink-0" />
          Important Guidelines
        </h2>

        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-500/15 text-blue-700 dark:bg-blue-550/30 dark:text-blue-200 font-bold flex items-center justify-center flex-shrink-0 text-sm">
              1
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-blue-100">Choose exactly two (2) ministry units</h3>
              <p className="text-xs text-slate-500 dark:text-blue-200/60 mt-1 leading-relaxed">
                Every worker is required to serve in two distinct units to maintain structural balance. Duplicate choices are prevented.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-500/15 text-blue-700 dark:bg-blue-550/30 dark:text-blue-200 font-bold flex items-center justify-center flex-shrink-0 text-sm">
              2
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-blue-100">Placement Subject to Review</h3>
              <p className="text-xs text-slate-500 dark:text-blue-200/60 mt-1 leading-relaxed">
                Final unit assignment is subject to coordinate review, qualification matching, and the immediate ministry requirements.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-500/15 text-blue-700 dark:bg-blue-550/30 dark:text-blue-200 font-bold flex items-center justify-center flex-shrink-0 text-sm">
              3
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-blue-100">Active Onboarding Contact</h3>
              <p className="text-xs text-slate-500 dark:text-blue-200/60 mt-1 leading-relaxed">
                Upon successful submission of this form, your Cluster Coordinator will contact you directly via WhatsApp to initiate onboarding.
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="text-center"
      >
        <button
          id="btn-proceed"
          onClick={onProceed}
          className="inline-flex items-center gap-2.5 px-8 py-4 text-base font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-700 hover:to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          Proceed to Fill Your Details
          <ArrowRight className="w-5 h-5" />
        </button>

        <p className="text-xs text-slate-500 dark:text-blue-200/50 mt-4 font-semibold">
          Estimated completion time: 3 - 5 minutes.
        </p>
      </motion.div>
    </div>
  );
}
