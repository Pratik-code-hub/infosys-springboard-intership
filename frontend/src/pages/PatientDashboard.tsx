import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, 
  Clock, 
  ShieldCheck, 
  ChevronRight, 
  CheckCircle2, 
  ChevronLeft, 
  FileText, 
  FileSpreadsheet, 
  Trash2,
  Heart,
  Droplets,
  Wind,
  Plus,
  Sparkles
} from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';

export default function PatientDashboard() {
  const [activeTab, setActiveTab] = useState<'history' | 'activity'>('history');
  const navigate = useNavigate();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [patientName, setPatientName] = useState<string>('Patient');
  const [historyPage, setHistoryPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    async function fetchHistory() {
      let currentUserId = null;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          currentUserId = user.id;
          const { data: userData } = await supabase.from('users').select('full_name').eq('id', user.id).single();
          if (userData?.full_name) setPatientName(userData.full_name.replace(/\s*\((Patient|Doctor|Admin|patient|doctor|admin)\)/gi, ''));
        }
      } catch (e) {
        console.warn("Supabase fetch user fallback", e);
      }

      if (!currentUserId) {
        const demoRaw = localStorage.getItem('arogya_demo_user');
        if (demoRaw) {
          try {
            const demo = JSON.parse(demoRaw);
            setPatientName(demo.name || 'Aarav Verma');
            currentUserId = demo.id || 'demo-patient';
          } catch (err) {}
        }
      }

      let fetchedTriages: any[] = [];
      if (currentUserId && !currentUserId.startsWith('demo-')) {
        try {
          const { data } = await supabase
            .from('triages')
            .select('*')
            .eq('patient_id', currentUserId)
            .eq('patient_hidden', false)
            .order('created_at', { ascending: false });

          const { data: apptData } = await supabase
            .from('appointments')
            .select('*, users!appointments_doctor_id_fkey(full_name)')
            .eq('patient_id', currentUserId);

          if (data && data.length > 0) {
            fetchedTriages = data.map(triage => {
              const appt = apptData?.find(a => a.triage_report_id === triage.id);
              const docName = appt?.users?.full_name || appt?.users?.email?.split('@')[0] || 'Unassigned';
              return { ...triage, doctorName: docName, appointmentTime: appt?.appointment_time };
            });
          }
        } catch (err) {
          console.warn("Supabase history query fallback", err);
        }
      }

      // Read local triages created during session
      const localRaw = localStorage.getItem('arogya_local_triages');
      const localTriages: any[] = localRaw ? JSON.parse(localRaw) : [];
      const validLocal = localTriages.filter(t => !t.patient_hidden);

      const defaultDemo = [
        {
          id: 'triage-demo-1',
          created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
          symptoms: 'Persistent dry cough, mild fever (100.4°F), sore throat for 3 days',
          urgency: 'Medium',
          department: 'General Medicine',
          doctorName: 'Dr. Rajesh Mehta',
          appointmentTime: new Date(Date.now() + 3600000 * 4).toISOString(),
          analysis: 'Clinical presentation indicates acute upper respiratory tract infection. Mild febrile episode without chest pain or dyspnea.'
        },
        {
          id: 'triage-demo-2',
          created_at: new Date(Date.now() - 3600000 * 72).toISOString(),
          symptoms: 'Elevated blood pressure reading (145/92 mmHg), occasional palpitations',
          urgency: 'High',
          department: 'Cardiology',
          doctorName: 'Dr. Ananya Iyer',
          appointmentTime: new Date(Date.now() + 3600000 * 28).toISOString(),
          analysis: 'Stage 1 essential hypertension with episodic palpitations. Recommended 24h ambulatory BP monitor and ECG review.'
        }
      ];

      // Combine local triages with fetched or demo items (avoiding duplicates)
      const combined = [...validLocal, ...(fetchedTriages.length > 0 ? fetchedTriages : defaultDemo)];
      const uniqueMap = new Map();
      combined.forEach(item => {
        if (!uniqueMap.has(item.id)) uniqueMap.set(item.id, item);
      });

      setHistory(Array.from(uniqueMap.values()));
      setLoading(false);
    }
    fetchHistory();
  }, []);

  const hideRecord = async () => {
    if (!deleteId) return;
    
    try {
      await supabase
        .from('triages')
        .update({ patient_hidden: true })
        .eq('id', deleteId);
    } catch (e) {}

    // Update local storage
    const localRaw = localStorage.getItem('arogya_local_triages');
    if (localRaw) {
      try {
        const localTriages = JSON.parse(localRaw);
        const updated = localTriages.map((t: any) => t.id === deleteId ? { ...t, patient_hidden: true } : t);
        localStorage.setItem('arogya_local_triages', JSON.stringify(updated));
      } catch (e) {}
    }

    setHistory(prev => prev.filter(h => h.id !== deleteId));
    setDeleteId(null);
  };

  const getUrgencyStyles = (level: string) => {
    const l = level?.toLowerCase() || '';
    if (l.includes('high') || l.includes('critical')) return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    if (l.includes('low')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
  };

  const downloadPDF = (item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const doc = new jsPDF();
    
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text(`ArogyaPulse AI — Official Clinical Triage Summary`, 10, 16);
    
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.text(`Engineered by: Pratik | ArogyaPulse Healthcare OS`, 10, 35);
    doc.text(`Patient Name: ${patientName}`, 10, 43);
    doc.text(`Assessment Timestamp: ${new Date(item.created_at).toLocaleString()}`, 10, 51);
    doc.text(`Triage Urgency: ${item.urgency}`, 10, 59);
    doc.text(`Recommended Department: ${item.department}`, 10, 67);
    doc.text(`Attending Clinician: ${item.doctorName?.startsWith('Dr.') ? item.doctorName : `Dr. ${item.doctorName}`}`, 10, 75);
    doc.text(`Scheduled Consultation: ${item.appointmentTime || 'Pending Staff Assignment'}`, 10, 83);
    doc.text(`Symptom Duration: ${item.duration || 'Not specified'}`, 10, 91);
    doc.text(`Primary Complaint: ${item.symptoms}`, 10, 99);
    
    doc.setFontSize(13);
    doc.text('Clinical Assessment & Reasoning:', 10, 115);
    doc.setFontSize(10);
    const splitTitle = doc.splitTextToSize(item.analysis || 'No detailed analysis context recorded.', 180);
    doc.text(splitTitle, 10, 125);

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Confidential Medical Record. Generated by ArogyaPulse AI Multi-Agent Engine. Consult a licensed physician.', 10, 280);
    
    doc.save(`ArogyaPulse_${patientName.replace(/\s+/g, '_')}_${new Date(item.created_at).toISOString().split('T')[0]}.pdf`);
  };

  const downloadExcel = (item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const worksheet = XLSX.utils.json_to_sheet([{
      System: "ArogyaPulse AI",
      Author: "Pratik",
      Patient: patientName,
      Date: new Date(item.created_at).toLocaleString(),
      Urgency: item.urgency,
      Department: item.department,
      AssignedDoctor: item.doctorName?.startsWith('Dr.') ? item.doctorName : `Dr. ${item.doctorName}`,
      AppointmentTime: item.appointmentTime || 'Pending',
      Duration: item.duration || 'Not specified',
      Symptoms: item.symptoms,
      Analysis: item.analysis
    }]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ClinicalReport");
    XLSX.writeFile(workbook, `ArogyaPulse_${patientName.replace(/\s+/g, '_')}_${new Date(item.created_at).toISOString().split('T')[0]}.xlsx`);
  };

  const paginatedHistory = history.slice((historyPage - 1) * ITEMS_PER_PAGE, historyPage * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(history.length / ITEMS_PER_PAGE) || 1;

  const getRecentActivity = () => {
    if (history.length === 0) return [];
    const latestTriage = history[0];
    const timeString = new Date(latestTriage.created_at).toLocaleString(undefined, { 
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' 
    });

    return [
      { id: 1, agent: 'Clinical Scribe Node', status: 'Report Synthesized', time: timeString },
      { id: 2, agent: 'Roster Orchestrator', status: 'Slot Allocated', time: timeString },
      { id: 3, agent: 'Urgency Classification Node', status: 'Priority Determined', time: timeString },
      { id: 4, agent: 'Pathology Analysis Node', status: 'Context Correlated', time: timeString },
      { id: 5, agent: 'pgvector RAG Search', status: 'Medical Evidence Grounded', time: timeString },
      { id: 6, agent: 'Voice/Text Intake Node', status: 'Input Ingested', time: timeString },
    ];
  };

  const dynamicActivity = getRecentActivity();

  return (
    <div className="flex-grow w-full bg-[#090d16] text-slate-100 p-4 sm:p-8 md:p-10 min-h-full">
      <div className="max-w-6xl mx-auto">
        
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-medium">Patient Station</span>
              <span className="text-xs text-slate-400">ID: {patientName ? patientName.toLowerCase().replace(/\s+/g, '.') : 'patient'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Welcome back, {patientName}</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">Review your AI clinical assessments, health timeline, and specialist bookings.</p>
          </div>
          <button 
            onClick={() => navigate('/chat')}
            className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl font-semibold shadow-lg shadow-cyan-500/20 transition-all text-xs sm:text-sm flex items-center justify-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            New Symptom Consultation
          </button>
        </div>

        {/* Patient Vitals Overview Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 flex-shrink-0">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 font-medium">Heart Rate</span>
              <div className="text-base sm:text-lg font-bold text-white">72 <span className="text-xs font-normal text-slate-400">BPM</span></div>
            </div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 flex-shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 font-medium">Blood Pressure</span>
              <div className="text-base sm:text-lg font-bold text-white">120/80 <span className="text-xs font-normal text-slate-400">mmHg</span></div>
            </div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <Wind className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 font-medium">Oxygen Saturation</span>
              <div className="text-base sm:text-lg font-bold text-white">99% <span className="text-xs font-normal text-slate-400">SpO2</span></div>
            </div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
              <Droplets className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 font-medium">Blood Glucose</span>
              <div className="text-base sm:text-lg font-bold text-white">96 <span className="text-xs font-normal text-slate-400">mg/dL</span></div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-800 mb-6">
          <button 
            onClick={() => setActiveTab('history')}
            className={`px-5 py-2.5 font-semibold text-xs sm:text-sm transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'history' 
                ? 'border-cyan-400 text-cyan-300' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Clinical History Timeline
          </button>
          <button 
            onClick={() => setActiveTab('activity')}
            className={`px-5 py-2.5 font-semibold text-xs sm:text-sm transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'activity' 
                ? 'border-cyan-400 text-cyan-300' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            Multi-Agent Pipeline Tracing
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {loading ? (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
                <div className="w-6 h-6 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin"></div>
                <span className="text-xs">Fetching clinical records...</span>
              </div>
            ) : history.length === 0 ? (
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-12 text-center">
                <ShieldCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base sm:text-lg font-bold text-white">No Triage Records Found</h3>
                <p className="text-slate-400 text-xs mt-1 max-w-md mx-auto">
                  Launch the interactive Symptom Intake AI to analyze symptoms and generate your first clinical report.
                </p>
                <button
                  onClick={() => navigate('/chat')}
                  className="mt-5 px-5 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Start First Assessment
                </button>
              </div>
            ) : (
              <div className="relative border-l-2 border-slate-800 ml-4 space-y-6 pb-4">
                {paginatedHistory.map((item) => (
                  <div key={item.id} className="relative pl-7 group">
                    {/* Timeline Dot */}
                    <div className={`absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 border-[#090d16] ${item.status === 'scheduled' ? 'bg-cyan-400 ring-2 ring-cyan-400/20' : 'bg-slate-600'}`}></div>
                    
                    <div 
                      onClick={() => navigate('/result', { state: { triageData: { urgency_level: item.urgency, recommended_department: item.department, ai_explanation: item.analysis } } })}
                      className="bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-5 hover:shadow-xl transition-all cursor-pointer flex flex-col sm:flex-row justify-between gap-4"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-xs font-semibold text-slate-400">
                            {new Date(item.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                          </span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${item.status === 'scheduled' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'bg-slate-800 text-slate-400'}`}>
                            {item.status || 'Archived'}
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-white mb-1 flex items-center gap-2">
                          {item.department}
                        </h3>
                        {item.status === 'scheduled' && item.doctorName && (
                          <p className="text-xs text-slate-300 flex items-center gap-1.5 mt-1">
                            <Clock className="w-3.5 h-3.5 text-cyan-400" />
                            Assigned Clinician: <span className="font-semibold text-white">{item.doctorName?.startsWith('Dr.') ? item.doctorName : `Dr. ${item.doctorName}`}</span>
                          </p>
                        )}
                        <div className={`mt-3 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getUrgencyStyles(item.urgency)}`}>
                          <ShieldCheck className="w-3 h-3" /> {item.urgency} Urgency
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                        <div className="flex gap-2">
                          <button 
                            onClick={(e) => downloadPDF(item, e)}
                            className="p-2 bg-slate-800 hover:bg-slate-700 text-rose-400 rounded-xl border border-slate-700 transition-colors"
                            title="Download Clinical Summary (PDF)"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={(e) => downloadExcel(item, e)}
                            className="p-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl border border-slate-700 transition-colors"
                            title="Export Clinical Data (Excel)"
                          >
                            <FileSpreadsheet className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setDeleteId(item.id); }}
                            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors border border-slate-800 hover:border-rose-500/30"
                            title="Hide from timeline"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <span className="hidden sm:flex text-xs font-semibold text-cyan-400 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                          View Triage Note <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Pagination Controls */}
            {history.length > ITEMS_PER_PAGE && (
              <div className="pt-4 flex items-center justify-between border-t border-slate-800 mt-4">
                <span className="text-xs text-slate-400">Page {historyPage} of {totalPages}</span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                    disabled={historyPage === 1}
                    className="p-2 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setHistoryPage(p => Math.min(totalPages, p + 1))}
                    disabled={historyPage === totalPages}
                    className="p-2 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8">
            <h2 className="text-base sm:text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              Live Multi-Agent Pipeline Activity
            </h2>
            
            <div className="relative border-l-2 border-slate-800 ml-3 space-y-6">
              {dynamicActivity.length === 0 ? (
                <div className="text-slate-400 pl-6 py-4 text-xs">No recent multi-agent telemetry logged.</div>
              ) : (
                dynamicActivity.map((log) => (
                  <div key={log.id} className="relative pl-6">
                    <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-[#090d16] border-2 border-emerald-400 flex items-center justify-center">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm text-slate-200">{log.agent}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          {log.status}
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" />
                          {log.time}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>

      <ConfirmDialog
        isOpen={!!deleteId}
        title="Remove Record"
        description="Are you sure you want to remove this record from your timeline? It will no longer be visible here."
        confirmText="Remove"
        onConfirm={hideRecord}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
