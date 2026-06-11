import { motion } from 'motion/react';
import { CheckCircle2, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface SuccessScreenProps {
  memberId: string;
  onReset: () => void;
}

export default function SuccessScreen({ memberId, onReset }: SuccessScreenProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(memberId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="frosted-glass-card-light dark:frosted-glass-card-dark rounded-3xl p-8 shadow-2xl relative overflow-hidden text-center"
      >
        {/* Colorful background radial highlights inside card */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -ml-16 -mb-16 pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
          className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mb-6 border border-emerald-500/25 shadow-inner"
        >
          <CheckCircle2 className="w-12 h-12" />
        </motion.div>

        <div className="space-y-4">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white font-sans">
            Registration Successful!
          </h1>

          {/* Member Card ID Badge */}
          <div className="bg-white/60 dark:bg-slate-900/55 border border-emerald-500/20 dark:border-emerald-500/15 rounded-2xl p-5 my-6 shadow-sm">
            <p className="text-[10px] font-bold text-slate-500 dark:text-blue-200/60 uppercase tracking-widest mb-2.5">
              Your Official Member ID
            </p>
            <div className="inline-flex items-center gap-3 bg-white dark:bg-slate-950 px-5 py-2.5 rounded-xl shadow-inner border border-slate-200/50 dark:border-white/5">
              <span className="font-mono text-xl font-bold text-blue-600 dark:text-blue-400 select-all tracking-wider">
                {memberId}
              </span>
              <button
                onClick={copyToClipboard}
                className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 p-1 rounded-lg transition-colors cursor-pointer"
                title="Copy ID"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-blue-200/40 mt-3 font-semibold">Keep this ID safe for future check-ins</p>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
            Thank you for registering to serve with <strong className="text-blue-600 dark:text-blue-400 font-bold">TEAM GLORY</strong>. 
            Your application has been received and is being reviewed. A Cluster Coordinator will contact you via WhatsApp with your placement details and next steps.
          </p>

          <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-bold">
            We are honored to serve alongside you!
          </p>

          <div className="pt-6 pb-2">
            <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-xl text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/25 max-w-xs mx-auto">
              <span className="text-lg">🤝</span>
              Form successfully registered in cloud.
            </div>
          </div>

          {/* Option to file another (useful for families) */}
          <div className="pt-4 border-t border-slate-200/50 dark:border-white/5">
            <button
              onClick={onReset}
              className="text-xs font-bold text-slate-400 hover:text-blue-600 dark:text-blue-200/60 dark:hover:text-blue-400 transition-colors underline cursor-pointer"
            >
              Register another member
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
