import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Activity, 
  Stethoscope, 
  Mail, 
  Lock, 
  UserPlus, 
  LogIn, 
  KeyRound, 
  ArrowLeft, 
  Eye, 
  EyeOff,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

type AuthView = 'patient_login' | 'patient_signup' | 'forgot_password' | 'internal_login';

export default function Auth() {
  const [view, setView] = useState<AuthView>('patient_login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [internalRole, setInternalRole] = useState<'doctor' | 'admin' | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const navigate = useNavigate();


  const fillDemoCredentials = (role: 'patient' | 'doctor' | 'admin') => {
    setErrorMsg('');
    setSuccessMsg('');
    if (role === 'patient') {
      setView('patient_login');
      setEmail('aarav.verma@gmail.com');
      setPassword('Password@123');
    } else if (role === 'doctor') {
      setView('internal_login');
      setInternalRole('doctor');
      setEmail('dr.ananya@arogyapulse.ai');
      setPassword('Password@123');
    } else {
      setView('internal_login');
      setInternalRole('admin');
      setEmail('pratik.admin@arogyapulse.ai');
      setPassword('Password@123');
    }
  };

  const resetState = () => {
    setEmail('');
    setPassword('');
    setErrorMsg('');
    setSuccessMsg('');
    setShowPassword(false);
  };

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });
      if (error) throw error;
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Google authentication failed');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });
      if (error) throw error;
      setSuccessMsg('Check your email for the password reset link!');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (view === 'patient_login' || view === 'internal_login') {
        // Log in
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No user found.");

        const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();
        const userRole = userData?.role || 'patient';
        
        if (userRole === 'admin') navigate('/admin');
        else if (userRole === 'doctor') navigate('/doctor');
        else navigate('/dashboard');

      } else if (view === 'patient_signup') {
        // Sign up (Always defaults to 'patient' for external signups)
        const role = 'patient';
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: email.split('@')[0],
              role: role
            }
          }
        });
        
        if (signUpError) throw signUpError;

        let currentUser = data.user;
        if (!data.session) {
          const { data: signInData, error: autoSignInError } = await supabase.auth.signInWithPassword({ email, password });
          if (!autoSignInError && signInData.user) {
            currentUser = signInData.user;
          }
        }
        
        if (currentUser) {
          const { error: profileError } = await supabase.from('users').upsert({
            id: currentUser.id,
            role: role,
            full_name: email.split('@')[0]
          });
          if (profileError) console.warn('Profile creation notice:', profileError.message);
        }

        navigate('/dashboard'); 
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex justify-center items-center bg-[#070b14] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,182,212,0.15),rgba(255,255,255,0))] font-sans text-slate-100 py-10 px-4 sm:px-6 relative overflow-hidden">
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-[480px] bg-slate-900/80 backdrop-blur-2xl p-8 sm:p-10 rounded-3xl shadow-2xl border border-slate-800/80 relative z-10">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-emerald-400 p-[1.5px] shadow-xl shadow-cyan-500/20 mb-4 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              {view === 'internal_login' ? (
                 internalRole === 'doctor' ? <Stethoscope className="w-8 h-8 text-emerald-400" /> : <ShieldCheck className="w-8 h-8 text-cyan-400" />
              ) : view === 'forgot_password' ? (
                 <KeyRound className="w-8 h-8 text-cyan-400" />
              ) : (
                 <Activity className="w-8 h-8 text-cyan-400 animate-pulse" />
              )}
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            ArogyaPulse <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-semibold uppercase">AI</span>
          </h1>
          <p className="text-slate-400 text-xs mt-1 font-medium text-center">
            Clinical AI Triage & Healthcare Operating System
          </p>
        </div>

        {/* View Description */}
        <div className="text-center mb-6">
          <h2 className="text-lg font-semibold text-slate-200">
            {view === 'patient_login' && 'Patient Portal Access'}
            {view === 'patient_signup' && 'Create Patient Profile'}
            {view === 'internal_login' && (internalRole === 'doctor' ? 'Clinician Triage Portal' : 'Hospital Command Center')}
            {view === 'forgot_password' && 'Password Recovery'}
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            {view === 'patient_login' && 'Sign in to access AI symptom triage and appointment records'}
            {view === 'patient_signup' && 'Register to begin your clinical AI consultation'}
            {view === 'internal_login' && 'Authorized medical staff and director credentials only'}
            {view === 'forgot_password' && 'Enter your registered email for password recovery'}
          </p>
        </div>

        {/* 1-Click Demo Presets Bar (Instant Showcase for Reviewers/GitHub Visitors) */}
        <div className="mb-6 p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 px-1">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <Sparkles className="w-3.5 h-3.5" /> 1-Click Demo Profiles
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Auto-Fill</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => fillDemoCredentials('patient')}
              className="px-2 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-[11px] font-medium text-slate-300 hover:text-white border border-slate-700/50 hover:border-cyan-500/50 transition-all flex flex-col items-center gap-0.5"
            >
              <span className="font-semibold text-cyan-400">Patient</span>
              <span className="text-[9px] text-slate-400 truncate max-w-full">Aarav Verma</span>
            </button>
            <button
              type="button"
              onClick={() => fillDemoCredentials('doctor')}
              className="px-2 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-[11px] font-medium text-slate-300 hover:text-white border border-slate-700/50 hover:border-emerald-500/50 transition-all flex flex-col items-center gap-0.5"
            >
              <span className="font-semibold text-emerald-400">Doctor</span>
              <span className="text-[9px] text-slate-400 truncate max-w-full">Dr. Ananya</span>
            </button>
            <button
              type="button"
              onClick={() => fillDemoCredentials('admin')}
              className="px-2 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-[11px] font-medium text-slate-300 hover:text-white border border-slate-700/50 hover:border-indigo-500/50 transition-all flex flex-col items-center gap-0.5"
            >
              <span className="font-semibold text-indigo-400">Director</span>
              <span className="text-[9px] text-slate-400 truncate max-w-full">Pratik Sharma</span>
            </button>
          </div>
        </div>

        {/* Back Button for Internal/Forgot Password */}
        {(view === 'internal_login' || view === 'forgot_password') && (
           <button 
             onClick={() => {
               resetState();
               setView('patient_login');
             }}
             className="mb-4 flex items-center justify-center gap-2 w-full py-2 text-xs font-medium text-slate-400 hover:text-cyan-400 transition-colors rounded-xl bg-slate-800/40 border border-slate-800"
           >
             <ArrowLeft className="w-3.5 h-3.5" /> Return to Patient Portal
           </button>
        )}

        {/* Toggle Login / Signup (Only for Patients) */}
        {(view === 'patient_login' || view === 'patient_signup') && (
          <div className="flex p-1 bg-slate-950/80 rounded-2xl mb-6 border border-slate-800">
            <button
              type="button"
              onClick={() => { resetState(); setView('patient_login'); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                view === 'patient_login' 
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { resetState(); setView('patient_signup'); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                view === 'patient_signup' 
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Register
            </button>
          </div>
        )}

        {/* Alerts / Error Messages */}
        {errorMsg && (
          <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-2xl text-xs font-medium flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl text-xs font-medium flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Google OAuth (Only for Patients) */}
        {(view === 'patient_login' || view === 'patient_signup') && (
          <>
            <button 
              type="button" 
              onClick={handleGoogleSignIn}
              className="w-full mb-5 py-2.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 text-slate-200 rounded-xl font-medium text-xs transition-all flex items-center justify-center gap-2.5 shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google Workspace
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-slate-800"></div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Or Email</span>
              <div className="flex-1 h-px bg-slate-800"></div>
            </div>
          </>
        )}

        {/* Main Form */}
        <form onSubmit={view === 'forgot_password' ? handleResetPassword : handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="email" 
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all outline-none text-xs text-white placeholder-slate-400"
                placeholder="clinician@arogyapulse.ai"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          
          {view !== 'forgot_password' && (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">Password</label>
                {view === 'patient_login' && (
                  <button 
                    type="button" 
                    onClick={() => { resetState(); setView('forgot_password'); }}
                    className="text-[11px] font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  minLength={6}
                  className="w-full pl-10 pr-11 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all outline-none text-xs text-white placeholder-slate-400"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full mt-2 py-3 text-white rounded-xl font-semibold text-xs tracking-wide shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
              view === 'internal_login' 
                ? (internalRole === 'doctor' 
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 shadow-emerald-500/20' 
                    : 'bg-gradient-to-r from-indigo-600 to-purple-500 hover:from-indigo-500 hover:to-purple-400 shadow-indigo-500/20') 
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-cyan-500/25'
            }`}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : view === 'patient_login' || view === 'internal_login' ? (
              <><LogIn className="w-4 h-4" /> Access System</>
            ) : view === 'patient_signup' ? (
              <><UserPlus className="w-4 h-4" /> Register New Account</>
            ) : (
              <><Mail className="w-4 h-4" /> Dispatch Recovery Link</>
            )}
          </button>
        </form>

        {/* Portal Switcher Footer */}
        <div className="mt-8 pt-5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <span>ArogyaPulse AI Platform</span>
          <span className="font-semibold text-cyan-400">Engineered by Pratik</span>
        </div>

      </div>
    </div>
  );
}
