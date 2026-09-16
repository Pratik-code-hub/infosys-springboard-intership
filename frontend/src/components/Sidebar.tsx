import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Activity, 
  UserCircle, 
  LogOut, 
  LayoutDashboard, 
  Stethoscope, 
  MessageSquare, 
  Settings, 
  X, 
  UserPlus, 
  FileText, 
  Calendar
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Sidebar({ isOpen = false, setIsOpen = (_v: boolean) => {} }: { isOpen?: boolean, setIsOpen?: (v: boolean) => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('User');

  useEffect(() => {
    async function getUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase.from('users').select('role, full_name').eq('id', session.user.id).single();
        if (data) {
          setRole(data.role);
          let name = data.full_name || session.user.email?.split('@')[0] || 'User';
          name = name.replace(/Hospital Admin \((.*?)\)/i, '$1').replace(/\s*\((Patient|Doctor|Admin|patient|doctor|admin)\)/gi, '');
          setUserName(name);
        }
      }
    }
    getUser();
  }, [location.pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  // Do not render nav on auth page
  if (location.pathname === '/auth' || location.pathname === '/') return null;

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Content */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-slate-900/95 border-r border-slate-800/80 backdrop-blur-xl h-screen flex flex-col shadow-2xl flex-shrink-0
        transform transition-all duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0
      `}>
        {/* Logo Area */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-slate-800/60 bg-slate-900/40">
          <Link 
            to={role === 'admin' ? '/admin' : role === 'doctor' ? '/doctor' : '/dashboard'} 
            className="flex items-center gap-3 group"
            onClick={() => setIsOpen(false)}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-400 p-[1.5px] shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-all">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
                ArogyaPulse <span className="text-xs px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-semibold">AI</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide">Clinical Operating System</span>
            </div>
          </Link>
          <button 
            className="md:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors" 
            onClick={() => setIsOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Engine Status Badge */}
        <div className="px-5 py-3 mx-4 mt-4 rounded-xl bg-slate-800/40 border border-slate-700/40 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-slate-300 font-medium">Multi-Agent Core</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono border border-emerald-500/20">v2.0 Active</span>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto py-5 px-4 flex flex-col gap-1.5">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1">
            Navigation Menu
          </div>
          
          {role === 'admin' ? (
            <>
              <Link 
                to="/admin" 
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                  isActive('/admin') 
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                <LayoutDashboard className={`w-4 h-4 ${isActive('/admin') ? 'text-cyan-400' : 'text-slate-400'}`} />
                Command Center
              </Link>
              <Link 
                to="/admin/reports" 
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                  isActive('/admin/reports') 
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                <FileText className={`w-4 h-4 ${isActive('/admin/reports') ? 'text-cyan-400' : 'text-slate-400'}`} />
                Clinical Analytics
              </Link>
              <Link 
                to="/admin/create-doctor" 
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                  isActive('/admin/create-doctor') 
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                <UserPlus className={`w-4 h-4 ${isActive('/admin/create-doctor') ? 'text-cyan-400' : 'text-slate-400'}`} />
                Clinician Provisioning
              </Link>
              <Link 
                to="/admin/users" 
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                  isActive('/admin/users') 
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                <UserCircle className={`w-4 h-4 ${isActive('/admin/users') ? 'text-cyan-400' : 'text-slate-400'}`} />
                User Directory
              </Link>
            </>
          ) : role === 'doctor' ? (
            <>
              <Link 
                to="/doctor" 
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                  isActive('/doctor') 
                    ? 'bg-gradient-to-r from-emerald-500/20 to-cyan-500/10 text-emerald-300 border border-emerald-500/30 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                <Stethoscope className={`w-4 h-4 ${isActive('/doctor') ? 'text-emerald-400' : 'text-slate-400'}`} />
                Triage Station
              </Link>
              <Link 
                to="/doctor/schedule" 
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                  isActive('/doctor/schedule') 
                    ? 'bg-gradient-to-r from-emerald-500/20 to-cyan-500/10 text-emerald-300 border border-emerald-500/30 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                <Calendar className={`w-4 h-4 ${isActive('/doctor/schedule') ? 'text-emerald-400' : 'text-slate-400'}`} />
                Consultation Roster
              </Link>
            </>
          ) : (
            <>
              <Link 
                to="/dashboard" 
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                  isActive('/dashboard') 
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                <LayoutDashboard className={`w-4 h-4 ${isActive('/dashboard') ? 'text-cyan-400' : 'text-slate-400'}`} />
                Patient Dashboard
              </Link>
              <Link 
                to="/chat" 
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                  isActive('/chat') 
                    ? 'bg-gradient-to-r from-cyan-500/20 to-emerald-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                <MessageSquare className={`w-4 h-4 ${isActive('/chat') ? 'text-cyan-400' : 'text-slate-400'}`} />
                Symptom Intake AI
              </Link>
            </>
          )}

          <div className="pt-4 mt-3 border-t border-slate-800/60">
            <Link 
              to="/settings" 
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                isActive('/settings') 
                  ? 'bg-slate-800 text-white border border-slate-700' 
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <Settings className={`w-4 h-4 ${isActive('/settings') ? 'text-cyan-400' : 'text-slate-400'}`} />
              System Settings
            </Link>
          </div>
        </div>

        {/* User Identity & System Attribution Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/50 flex flex-col gap-3">
          <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 p-3 rounded-2xl">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-emerald-500/20 border border-cyan-500/30 text-cyan-400 flex items-center justify-center flex-shrink-0 font-bold text-sm">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-slate-200 truncate">{userName}</span>
                <span className="text-[11px] font-medium text-cyan-400/90 capitalize flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                  {role ? `${role.charAt(0).toUpperCase() + role.slice(1)} Mode` : 'Patient Mode'}
                </span>
              </div>
            </div>
            <button 
              onClick={handleLogout} 
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors flex-shrink-0" 
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between px-1 text-[10px] text-slate-400">
            <span>ArogyaPulse Platform</span>
            <span className="font-semibold text-slate-400">by Pratik Kumar</span>
          </div>
        </div>
      </aside>
    </>
  );
}
