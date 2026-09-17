import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User, LogOut, Settings as SettingsIcon, Cpu, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{
    email: string;
    id: string;
    full_name: string;
    role: string;
  } | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      setProfile({
        email: session.user.email || 'N/A',
        id: session.user.id,
        full_name: userData?.full_name || 'User',
        role: userData?.role || 'Patient'
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#090d16] text-slate-100 min-h-screen">
        <div className="w-6 h-6 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex-grow w-full bg-[#090d16] text-slate-100 p-4 sm:p-8 md:p-10 min-h-full">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-medium">System Configuration</span>
              <span className="text-xs text-slate-400">ArogyaPulse OS</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <SettingsIcon className="w-7 h-7 text-cyan-400" />
              Settings & Architecture
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">Manage active identity, security tokens, and view multi-agent engine telemetry.</p>
          </div>
          
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-rose-500/40 text-slate-300 hover:text-rose-400 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        <div className="space-y-6">
          
          {/* User Profile Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-cyan-400" /> Active Profile Credentials
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Full Legal Name</span>
                <span className="text-sm font-bold text-white">{profile?.full_name}</span>
              </div>

              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Authenticated Email</span>
                <span className="text-sm font-mono text-cyan-400">{profile?.email}</span>
              </div>

              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Assigned Role & Privileges</span>
                <span className="text-sm font-bold text-emerald-400 capitalize">{profile?.role} Clearance</span>
              </div>

              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Unique UUID Identifier</span>
                <span className="text-xs font-mono text-slate-400 truncate block">{profile?.id}</span>
              </div>
            </div>
          </div>

          {/* Clinical Engine System Specs Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <h2 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" /> ArogyaPulse Multi-Agent Clinical Engine
            </h2>
            <p className="text-xs text-slate-400 mb-5">Architectural specifications and system governance.</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Platform Architect</span>
                <span className="text-sm font-bold text-white">Pratik Kumar</span>
                <span className="text-[10px] text-cyan-400 block mt-0.5">Core Engineering</span>
              </div>

              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Orchestration Framework</span>
                <span className="text-sm font-bold text-white">LangGraph StateGraph</span>
                <span className="text-[10px] text-emerald-400 block mt-0.5">5 Specialized Clinical Nodes</span>
              </div>

              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Knowledge Retrieval (RAG)</span>
                <span className="text-sm font-bold text-white">Supabase pgvector</span>
                <span className="text-[10px] text-indigo-400 block mt-0.5">Medical Evidence Grounding</span>
              </div>
            </div>

            <div className="mt-4 p-4 bg-slate-950/40 border border-slate-800/80 rounded-2xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-300">Software License: Official MIT License granted to <strong className="text-white">Pratik Kumar (2026)</strong></span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-mono border border-cyan-500/20">Release v2.0.0</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
