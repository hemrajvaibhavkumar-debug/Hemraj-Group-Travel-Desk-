import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { KeyRound, Mail, ShieldAlert, Building2, Eye, EyeOff } from "lucide-react";
import { motion } from "motion/react";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  // New UI/UX States
  const [showPassword, setShowPassword] = useState(false);
  const [emailValid, setEmailValid] = useState<boolean | null>(null);

  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (!val.trim()) {
      setEmailValid(null);
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      setEmailValid(emailRegex.test(val));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Please fill in both email and password.");
      return;
    }

    try {
      setError("");
      setLoading(true);
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "Failed to log in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative background gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-orange-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[65%] rounded-full bg-amber-600/10 blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl relative z-10"
      >
        <div className="text-center space-y-3 mb-8">
          <div className="w-16 h-16 bg-gradient-to-tr from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 mx-auto border border-orange-400/20">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white uppercase">
              HEMRAJ <span className="text-orange-500 font-medium">GROUP</span>
            </h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">
              Personal Travel Desk
            </p>
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-rose-500/15 border border-rose-500/30 text-rose-200 rounded-2xl flex items-start gap-3 text-left"
          >
            <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="text-xs font-bold uppercase tracking-wide leading-relaxed">
              <span className="font-black text-rose-300 block mb-0.5">Authentication Error</span>
              {error}
            </div>
          </motion.div>
        )}

        {/* Corporate SSO Login Selector */}
        <div className="space-y-3 mb-6">
          <button
            type="button"
            onClick={() => {
              setEmail("superadmin@hemrajgroup.com");
              setPassword("Password123");
              setEmailValid(true);
            }}
            className="w-full py-3 bg-slate-950/40 hover:bg-slate-950/70 border border-slate-800/80 rounded-2xl text-slate-300 text-xs font-bold transition flex items-center justify-center gap-2.5 hover:text-white cursor-pointer"
          >
            <Building2 className="w-4 h-4 text-orange-500" />
            <span>Sign in with Google Workspace</span>
          </button>
        </div>

        <div className="relative flex py-2 items-center mb-5">
          <div className="flex-grow border-t border-slate-850"></div>
          <span className="flex-shrink mx-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">or login manually</span>
          <div className="flex-grow border-t border-slate-850"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 text-left">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Corporate Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="email"
                placeholder="name@hemrajgroup.com"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                disabled={loading}
                className={`w-full pl-11 pr-4 py-3 bg-slate-950/50 border text-white rounded-2xl placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-orange-500/20 text-xs font-semibold font-sans transition-all ${
                  emailValid === true ? "border-emerald-500/50 focus:border-emerald-500" :
                  emailValid === false ? "border-rose-500/50 focus:border-rose-500" :
                  "border-slate-800 focus:border-orange-500"
                }`}
              />
            </div>
            {emailValid === false && (
              <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wider block pl-2">
                Please enter a valid email address format.
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Security Password
            </label>
            <div className="relative">
              <KeyRound className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full pl-11 pr-12 py-3 bg-slate-950/50 border border-slate-800 text-white rounded-2xl placeholder-slate-650 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 text-xs font-semibold font-sans transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-3.5 text-slate-500 hover:text-slate-350 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition duration-150 active:scale-[0.98] shadow-lg shadow-orange-500/10 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
          >
            {loading ? "Authenticating..." : "Sign In to Workspace"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
