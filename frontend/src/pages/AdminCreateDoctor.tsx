import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  User, 
  Mail, 
  Lock, 
  AlertCircle, 
  Trash2, 
  Key, 
  CheckCircle2, 
  Stethoscope,
  ShieldCheck
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function AdminCreateDoctor() {
  const [docName, setDocName] = useState('');
  const [docEmail, setDocEmail] = useState('');
  const [docPassword, setDocPassword] = useState('');
  const [docCreating, setDocCreating] = useState(false);
  const [docMsg, setDocMsg] = useState({ text: '', type: '' });
  const navigate = useNavigate();

  const [doctors, setDoctors] = useState<any[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [actionMsg, setActionMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    checkAdmin();
    fetchDoctors();
  }, []);

  const checkAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      navigate('/auth');
      return;
    }
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (userData?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
  };

  const fetchDoctors = async () => {
    setIsLoadingDocs(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/v1/admin/doctors`);
      if (response.ok) {
        const data = await response.json();
        setDoctors(data);
      }
    } catch (err) {
      console.error("Failed to fetch doctors", err);
    }
    setIsLoadingDocs(false);
  };

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setDocCreating(true);
    setDocMsg({ text: '', type: '' });
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/v1/admin/create-doctor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: docEmail,
          password: docPassword,
          full_name: docName
        })
      });
      const data = await response.json();
      if (response.ok) {
        setDocMsg({ text: 'Clinician successfully provisioned into ArogyaPulse OS!', type: 'success' });
        setDocName(''); setDocEmail(''); setDocPassword('');
        fetchDoctors();
      } else {
        setDocMsg({ text: data.detail || 'Failed to provision doctor account.', type: 'error' });
      }
    } catch (err) {
      setDocMsg({ text: 'Network error communicating with backend.', type: 'error' });
    }
    setDocCreating(false);
  };

  const handleResetPassword = async (userId: string) => {
    if (!newPassword || newPassword.length < 6) {
      setActionMsg({ text: 'Password must be at least 6 characters', type: 'error' });
      return;
    }
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/v1/admin/doctors/${userId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password: newPassword })
      });
      if (response.ok) {
        setActionMsg({ text: 'Password successfully updated.', type: 'success' });
        setResettingId(null);
        setNewPassword('');
      } else {
        setActionMsg({ text: 'Failed to reset password.', type: 'error' });
      }
    } catch (err) {
      setActionMsg({ text: 'Network error.', type: 'error' });
    }
    setTimeout(() => setActionMsg({ text: '', type: '' }), 3000);
  };

  const handleRevokeAccess = async (userId: string) => {
    if (!window.confirm("Are you sure you want to revoke this clinician's login credentials?")) return;
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/v1/admin/doctors/${userId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setActionMsg({ text: 'Clinician credentials successfully revoked.', type: 'success' });
        fetchDoctors();
      } else {
        setActionMsg({ text: 'Failed to revoke access.', type: 'error' });
      }
    } catch (err) {
      setActionMsg({ text: 'Network error.', type: 'error' });
    }
    setTimeout(() => setActionMsg({ text: '', type: '' }), 3000);
  };

  return (
    <div className="flex-grow w-full bg-[#090d16] text-slate-100 p-4 sm:p-8 md:p-10 min-h-full">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-medium">Provisioning</span>
            <span className="text-xs text-slate-400">ArogyaPulse Medical Staff Registry</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <UserPlus className="w-7 h-7 text-cyan-400" />
            Clinician Onboarding & Access Control
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">Register licensed doctors and issue secure triage workstation credentials.</p>
        </div>

        {actionMsg.text && (
          <div className={`p-4 rounded-2xl mb-6 text-xs font-semibold flex items-center gap-2 border ${
            actionMsg.type === 'success' 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
          }`}>
            {actionMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{actionMsg.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Create Doctor Form */}
          <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 p-6 rounded-3xl shadow-xl h-fit">
            <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-cyan-400" /> Provision Clinician ID
            </h2>
            <p className="text-xs text-slate-400 mb-5">Create verified practitioner accounts with clinical triage permissions.</p>

            {docMsg.text && (
              <div className={`p-3 rounded-xl mb-4 text-xs font-medium flex items-start gap-2 border ${
                docMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              }`}>
                {docMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                <span>{docMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleCreateDoctor} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Doctor Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    placeholder="e.g. Dr. Priya Patel, MS"
                    className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-cyan-500 placeholder-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Institutional Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={docEmail}
                    onChange={(e) => setDocEmail(e.target.value)}
                    placeholder="dr.patel@arogyapulse.ai"
                    className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-cyan-500 placeholder-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Temporary Access Key / Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={docPassword}
                    onChange={(e) => setDocPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-cyan-500 placeholder-slate-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={docCreating}
                className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-cyan-500/20 transition-all disabled:opacity-50 mt-2"
              >
                {docCreating ? 'Provisioning Account...' : 'Generate Clinician Access'}
              </button>
            </form>
          </div>

          {/* Active Clinicians List */}
          <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 p-6 rounded-3xl shadow-xl">
            <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Authorized Clinicians
            </h2>
            <p className="text-xs text-slate-400 mb-5">Physicians currently credentialed to handle active triage queues.</p>

            {isLoadingDocs ? (
              <div className="p-8 text-center text-slate-400 text-xs">Loading clinician roster...</div>
            ) : doctors.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">No doctor accounts registered yet.</div>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {doctors.map(doc => (
                  <div key={doc.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                        Dr
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">
                          {doc.full_name?.startsWith('Dr.') ? doc.full_name : `Dr. ${doc.full_name || 'Staff'}`}
                        </h4>
                        <span className="text-[10px] text-emerald-400 font-mono">Triage Licensed</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {resettingId === doc.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="password"
                            placeholder="New key"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white outline-none focus:border-cyan-500 w-24"
                          />
                          <button
                            onClick={() => handleResetPassword(doc.id)}
                            className="px-2 py-1 bg-cyan-500 text-slate-950 font-bold rounded-lg text-[10px]"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setResettingId(null)}
                            className="px-2 py-1 bg-slate-800 text-slate-400 rounded-lg text-[10px]"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setResettingId(doc.id)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-semibold transition-colors flex items-center gap-1"
                        >
                          <Key className="w-3 h-3 text-cyan-400" /> Reset
                        </button>
                      )}

                      <button
                        onClick={() => handleRevokeAccess(doc.id)}
                        className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Revoke Clinician Access"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
