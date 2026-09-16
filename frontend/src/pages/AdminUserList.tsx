import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  User, 
  Search, 
  UserCircle2, 
  UserCog
} from 'lucide-react';

export default function AdminUserList() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'patient' | 'doctor'>('patient');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAndFetchUsers();
  }, []);

  const checkAdminAndFetchUsers = async () => {
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

    await fetchUsers();
  };

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .in('role', ['patient', 'doctor'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
    } else if (data) {
      setUsers(data);
    }
    setLoading(false);
  };

  const filteredUsers = users.filter(u => {
    const roleMatch = u.role === activeTab;
    const searchMatch = 
      (u.full_name && u.full_name.toLowerCase().includes(search.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(search.toLowerCase()));
    
    return roleMatch && searchMatch;
  });

  return (
    <div className="flex-grow w-full bg-[#090d16] text-slate-100 p-4 sm:p-8 md:p-10 min-h-full">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-medium">Directory</span>
            <span className="text-xs text-slate-400">ArogyaPulse Personnel Registry</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Users className="w-7 h-7 text-cyan-400" />
            Institutional User Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">Audit active patients and credentialed medical specialists registered on the system.</p>
        </div>

        <div className="bg-slate-900/80 rounded-3xl border border-slate-800 shadow-xl overflow-hidden mb-8">
          
          {/* Tabs */}
          <div className="flex border-b border-slate-800 bg-slate-950/40">
            <button
              onClick={() => setActiveTab('patient')}
              className={`flex-1 py-3.5 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'patient' 
                  ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/5' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserCircle2 className="w-4 h-4" />
              Patient Registry
            </button>
            <button
              onClick={() => setActiveTab('doctor')}
              className={`flex-1 py-3.5 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'doctor' 
                  ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-500/5' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserCog className="w-4 h-4" />
              Clinician Roster
            </button>
          </div>

          {/* Search bar */}
          <div className="p-4 border-b border-slate-800 bg-slate-950/60">
            <div className="relative max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder={`Filter ${activeTab}s by name or institutional email...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-cyan-500 placeholder-slate-400"
              />
            </div>
          </div>

          {/* User Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 flex justify-center items-center">
                <div className="w-6 h-6 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin"></div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center text-slate-400">
                <User className="w-10 h-10 text-slate-600 mb-2" />
                <h3 className="text-sm font-semibold text-white">No {activeTab} accounts found</h3>
                <p className="text-xs mt-0.5">Try adjusting your search query.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/60 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-3.5">Name</th>
                    <th className="px-6 py-3.5">Email Identity</th>
                    <th className="px-6 py-3.5">System Role</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Date Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredUsers.map((user) => {
                    const isActive = user.is_active !== false;
                    return (
                      <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs border ${
                              user.role === 'doctor' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                            }`}>
                              {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <span className="font-semibold text-white">
                              {user.full_name || 'Anonymous User'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-slate-400 font-mono">
                          {user.email || 'OAuth / Direct'}
                        </td>
                        <td className="px-6 py-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            user.role === 'doctor' 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                              : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            isActive ? 'text-emerald-400' : 'text-slate-400'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-slate-400 font-mono">
                          {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
