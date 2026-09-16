import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './pages/Auth';
import UpdatePassword from './pages/UpdatePassword';
import PatientDashboard from './pages/PatientDashboard';
import SymptomChecker from './pages/SymptomChecker';
import TriageResult from './pages/TriageResult';
import DoctorDashboard from './pages/DoctorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminReports from './pages/AdminReports';
import AdminCreateDoctor from './pages/AdminCreateDoctor';
import AdminUserList from './pages/AdminUserList';
import Settings from './pages/Settings';
import Sidebar from './components/Sidebar';
import { Menu, Activity } from 'lucide-react';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <Router>
      <div className="flex h-screen overflow-hidden bg-[#0b0f19] text-slate-100 selection:bg-cyan-500 selection:text-white">
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
        
        <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
          {/* Mobile Header */}
          <div className="md:hidden flex items-center justify-between px-5 py-3.5 bg-slate-900/90 border-b border-slate-800/80 backdrop-blur-md z-30">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-emerald-400 p-[1px]">
                <div className="w-full h-full bg-slate-950 rounded-[7px] flex items-center justify-center">
                  <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
                </div>
              </div>
              <span className="text-base font-bold text-white tracking-tight">ArogyaPulse <span className="text-cyan-400 text-xs font-semibold">AI</span></span>
            </div>
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
              aria-label="Open Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          {/* Dynamic Content Viewport */}
          <div className="flex-1 overflow-y-auto bg-gradient-to-b from-[#0d1322] to-[#080b12]">
            <Routes>
              <Route path="/" element={<Navigate to="/auth" replace />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/update-password" element={<UpdatePassword />} />
              <Route path="/dashboard" element={<PatientDashboard />} />
              <Route path="/chat" element={<SymptomChecker />} />
              <Route path="/result" element={<TriageResult />} />
              <Route path="/doctor" element={<DoctorDashboard />} />
              <Route path="/doctor/schedule" element={<DoctorDashboard />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/reports" element={<AdminReports />} />
              <Route path="/admin/create-doctor" element={<AdminCreateDoctor />} />
              <Route path="/admin/users" element={<AdminUserList />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;
