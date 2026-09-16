import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  ChevronDown, 
  ChevronUp, 
  Lock, 
  Unlock, 
  FileText, 
  FileSpreadsheet, 
  ShieldCheck, 
  Bot, 
  Archive,
  Activity,
  Filter,
  Check,
  AlertTriangle
} from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';

export default function DoctorDashboard() {
  const location = useLocation();
  const activeTab = location.pathname.includes('/schedule') ? 'schedule' : 'queue';
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showScribe, setShowScribe] = useState<string | null>(null);
  const [queuePage, setQueuePage] = useState(1);
  const [schedulePage, setSchedulePage] = useState(1);
  const [lockDate, setLockDate] = useState('');
  const [lockTimeFrom, setLockTimeFrom] = useState('');
  const [lockTimeTo, setLockTimeTo] = useState('');
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const ITEMS_PER_PAGE = 5;
  const [patients, setPatients] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAppts, setLoadingAppts] = useState(true);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [filterUrgency, setFilterUrgency] = useState<string>('All');
  const [filterDept, setFilterDept] = useState<string>('All');
  const [soapCopied, setSoapCopied] = useState<string | null>(null);

  useEffect(() => {
    async function fetchQueue() {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          setDoctorId(userData.user.id);
          fetchAppointments(userData.user.id);
        }
      } catch (e) {
        console.warn("Doctor user fetch fallback", e);
      }

      try {
        const { data } = await supabase
          .from('triages')
          .select('*, users(full_name)')
          .eq('status', 'pending')
          .eq('doctor_hidden', false)
          .order('created_at', { ascending: false });

        if (data && data.length > 0) {
          const formatted = data.map((item) => ({
            id: item.id,
            name: item.users?.full_name || 'Anonymous Patient',
            urgency: item.urgency,
            dept: item.department,
            time: new Date(item.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
            report: {
              symptoms: item.symptoms ? (item.symptoms.includes(',') ? item.symptoms.split(',').map((s: string) => s.trim()) : [item.symptoms]) : ['Not specified'],
              duration: item.duration || 'Not specified',
              analysis: item.analysis,
              image_data: item.image_data,
              urgency_level: item.urgency,
              recommended_department: item.department
            }
          }));
          setPatients(formatted);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn("Queue fetch fallback", err);
      }

      // Default sample queue for doctor showcase
      setPatients([
        {
          id: 'queue-demo-1',
          name: 'Aarav Verma',
          urgency: 'High',
          dept: 'Cardiology',
          time: 'Today, 02:45 PM',
          report: {
            symptoms: ['Chest tightness on exertion', 'Occasional palpitations', 'Mild dizziness'],
            duration: '2 days',
            analysis: 'Patient presents with exertional retrosternal discomfort and tachyarrhythmia symptoms. High urgency triage assigned for ECG and cardiac biomarker evaluation.',
            image_data: null,
            urgency_level: 'High',
            recommended_department: 'Cardiology'
          }
        },
        {
          id: 'queue-demo-2',
          name: 'Priya Nair',
          urgency: 'Medium',
          dept: 'General Medicine',
          time: 'Today, 03:15 PM',
          report: {
            symptoms: ['High fever (102°F)', 'Chills', 'Productive cough'],
            duration: '3 days',
            analysis: 'Probable community-acquired acute lower respiratory tract infection. Stable vitals, moderate urgency for chest auscultation and antibiotic therapy.',
            image_data: null,
            urgency_level: 'Medium',
            recommended_department: 'General Medicine'
          }
        }
      ]);
      setLoading(false);
    }
    fetchQueue();
  }, []);

  const fetchAppointments = async (docId: string) => {
    setLoadingAppts(true);
    const { data } = await supabase
      .from('appointments')
      .select('*, users!appointments_patient_id_fkey(full_name), triages(*)')
      .eq('doctor_id', docId)
      .order('appointment_time', { ascending: true });

    if (data) {
      setAppointments(data);
    }
    setLoadingAppts(false);
  };

  const handleAcknowledge = async (triageId: string) => {
    const { error } = await supabase
      .from('triages')
      .update({ status: 'acknowledged' })
      .eq('id', triageId);

    if (!error) {
      setPatients(prev => prev.filter(p => p.id !== triageId));
    }
  };

  const handleArchive = async () => {
    if (!archiveId) return;
    const { error } = await supabase
      .from('triages')
      .update({ doctor_hidden: true })
      .eq('id', archiveId);

    if (!error) {
      setPatients(prev => prev.filter(p => p.id !== archiveId));
    }
    setArchiveId(null);
  };

  const handleLockSlot = async () => {
    if (!lockDate || !lockTimeFrom || !lockTimeTo || !doctorId) return;
    const slotString = `${lockDate}: ${lockTimeFrom} - ${lockTimeTo}`;
    
    const { error } = await supabase.from('appointments').insert({
      doctor_id: doctorId,
      patient_id: doctorId,
      department: 'Locked Slot',
      appointment_time: slotString,
      status: 'locked'
    });

    if (!error) {
      fetchAppointments(doctorId);
      setLockDate('');
      setLockTimeFrom('');
      setLockTimeTo('');
    }
  };

  const handleUnlockSlot = async (apptId: string) => {
    const { error } = await supabase.from('appointments').delete().eq('id', apptId);
    if (!error && doctorId) {
      fetchAppointments(doctorId);
    }
  };

  const getUrgencyStyles = (level: string) => {
    const l = level?.toLowerCase() || '';
    if (l.includes('critical') || l.includes('high')) return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    if (l.includes('low')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
  };

  // Appointments mapping for schedule tab
  const patientAppts = appointments.filter(a => a.status !== 'locked').map(a => ({
    id: a.id,
    name: a.users?.full_name || 'Scheduled Patient',
    urgency: a.triages?.urgency || 'Medium',
    dept: a.department,
    time: a.appointment_time,
    report: {
      symptoms: a.triages?.symptoms ? [a.triages.symptoms] : ['General Consultation'],
      duration: a.triages?.duration || 'Pre-booked',
      analysis: a.triages?.analysis || 'Scheduled consultation directly booked or triage assigned.',
      image_data: a.triages?.image_data
    }
  }));

  const lockedSlots = appointments.filter(a => a.status === 'locked');

  const filteredPatients = patients.filter(p => {
    const matchUrgency = filterUrgency === 'All' || p.urgency?.toLowerCase() === filterUrgency.toLowerCase();
    const matchDept = filterDept === 'All' || p.dept?.toLowerCase() === filterDept.toLowerCase();
    return matchUrgency && matchDept;
  });

  const paginatedPatients = filteredPatients.slice((queuePage - 1) * ITEMS_PER_PAGE, queuePage * ITEMS_PER_PAGE);
  const paginatedAppts = patientAppts.slice((schedulePage - 1) * ITEMS_PER_PAGE, schedulePage * ITEMS_PER_PAGE);
  const totalQueuePages = Math.ceil(filteredPatients.length / ITEMS_PER_PAGE) || 1;
  const totalSchedulePages = Math.ceil(patientAppts.length / ITEMS_PER_PAGE) || 1;
  const uniqueDepts = Array.from(new Set(patients.map(p => p.dept).filter(Boolean)));

  const downloadPDF = (patient: any) => {
    const doc = new jsPDF();
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.text(`ArogyaPulse AI — Clinician Triage Record`, 10, 16);
    
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.text(`Engineered by: Pratik Kumar | System Version: 2.0.0`, 10, 35);
    doc.text(`Patient Name: ${patient.name}`, 10, 43);
    doc.text(`Assigned Urgency: ${patient.urgency}`, 10, 51);
    doc.text(`Recommended Department: ${patient.dept}`, 10, 59);
    doc.text(`Reported Duration: ${patient.report.duration}`, 10, 67);
    doc.text(`Symptoms: ${patient.report.symptoms.join(', ')}`, 10, 75);
    
    doc.setFontSize(12);
    doc.text('AI Multi-Agent Diagnostic Analysis:', 10, 90);
    doc.setFontSize(10);
    const splitTitle = doc.splitTextToSize(patient.report.analysis || 'No detailed analysis context recorded.', 180);
    doc.text(splitTitle, 10, 100);

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('ArogyaPulse Healthcare Platform by Pratik Kumar. Clinical decision support note.', 10, 280);
    
    doc.save(`ArogyaPulse_DoctorTriage_${patient.name.replace(/\s+/g, '_')}.pdf`);
  };

  const downloadExcel = (patient: any) => {
    const worksheet = XLSX.utils.json_to_sheet([{
      System: "ArogyaPulse AI",
      Author: "Pratik Kumar",
      Patient: patient.name,
      Urgency: patient.urgency,
      Department: patient.dept,
      Duration: patient.report.duration,
      Symptoms: patient.report.symptoms.join(', '),
      Analysis: patient.report.analysis
    }]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "DoctorReport");
    XLSX.writeFile(workbook, `ArogyaPulse_Triage_${patient.name.replace(/\s+/g, '_')}.xlsx`);
  };

  const copySoapNote = (patient: any) => {
    const text = `AROGYAPULSE AI — CLINICAL SOAP NOTE\n` +
      `PATIENT: ${patient.name}\n` +
      `URGENCY: ${patient.urgency}\n` +
      `DEPARTMENT: ${patient.dept}\n\n` +
      `S (Subjective): Patient reports: ${patient.report.symptoms.join(', ')}. Duration: ${patient.report.duration}.\n` +
      `O (Objective): Triage Urgency Level: ${patient.urgency}. Recommended department: ${patient.dept}.\n` +
      `A (Assessment): ${patient.report.analysis}\n` +
      `P (Plan): Immediate clinical examination. Diagnostic evaluation in ${patient.dept}.`;
    
    navigator.clipboard.writeText(text);
    setSoapCopied(patient.id);
    setTimeout(() => setSoapCopied(null), 2000);
  };

  const renderPatientList = (list: any[], isAppt: boolean = false) => {
    return list.map((patient) => {
      const isExpanded = expandedId === patient.id;
      
      return (
        <div key={patient.id} className="flex flex-col border-b border-slate-800/80 last:border-b-0">
          {/* Main Row */}
          <div 
            onClick={() => setExpandedId(isExpanded ? null : patient.id)}
            className={`grid grid-cols-12 gap-3 p-4 items-center cursor-pointer transition-all ${isExpanded ? 'bg-slate-800/60' : 'hover:bg-slate-800/30'}`}
          >
            <div className="col-span-4 md:col-span-3 pl-2 font-bold text-white text-xs sm:text-sm truncate flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 flex-shrink-0"></span>
              <span className="truncate">{patient.name}</span>
            </div>
            
            <div className="col-span-3 md:col-span-2 flex justify-center">
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${getUrgencyStyles(patient.urgency)}`}>
                <ShieldCheck className="w-3 h-3" />
                {patient.urgency}
              </div>
            </div>

            <div className="hidden md:block md:col-span-4 text-xs font-medium text-slate-300 truncate">
              {patient.dept}
            </div>
            
            <div className="col-span-4 md:col-span-2 text-right text-xs text-slate-400 font-mono truncate">
              {patient.time}
            </div>

            <div className="col-span-1 flex justify-center text-slate-400">
              {isExpanded ? <ChevronUp className="w-4 h-4 text-cyan-400" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>

          {/* Expanded Report View */}
          {isExpanded && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-slate-950/60 border-t border-slate-800/80">
              
              {/* Left Column: Symptoms & Durations */}
              <div className="md:col-span-1 space-y-5">
                {patient.report.image_data && (
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Attached Scan</h4>
                    <div className="w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-900">
                      <img src={`data:image/jpeg;base64,${patient.report.image_data}`} alt="Medical Scan" className="w-full h-auto object-cover max-h-48" />
                    </div>
                  </div>
                )}
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Reported Symptoms</h4>
                  <ul className="space-y-1.5">
                    {patient.report.symptoms.map((sym: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-200">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0"></div>
                        {sym}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Onset Duration</h4>
                  <p className="text-xs font-medium text-slate-200">{patient.report.duration}</p>
                </div>
              </div>

              {/* Middle & Right: AI Clinical Analysis & Actions */}
              <div className="md:col-span-2 space-y-4">
                <div>
                  <h4 className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" /> AI Clinical Assessment Summary
                  </h4>
                  <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 text-xs text-slate-200 leading-relaxed shadow-sm">
                    {patient.report.analysis}
                  </div>
                </div>

                {/* Actions */}
                {!isAppt && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button 
                      onClick={() => setShowScribe(showScribe === patient.id ? null : patient.id)}
                      className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all flex items-center gap-1.5 ${
                        showScribe === patient.id 
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20' 
                          : 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                      }`}
                    >
                      <Bot className="w-3.5 h-3.5" />
                      {showScribe === patient.id ? 'Hide SOAP Note' : 'Generate SOAP Note'}
                    </button>
                    <button 
                      onClick={() => handleAcknowledge(patient.id)}
                      className="px-3 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Acknowledge
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setArchiveId(patient.id); }}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all border border-slate-700 flex items-center gap-1.5"
                      title="Archive Record"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      Archive
                    </button>
                    <button 
                      onClick={() => downloadPDF(patient)} 
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-rose-400 rounded-xl border border-slate-700 transition-colors"
                      title="Export PDF"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => downloadExcel(patient)} 
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl border border-slate-700 transition-colors"
                      title="Export Excel"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* AI Scribe SOAP Note Panel */}
                {showScribe === patient.id && (
                  <div className="mt-4 p-4 bg-indigo-950/40 border border-indigo-500/30 rounded-2xl relative">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold text-indigo-300 flex items-center gap-2">
                        <Bot className="w-4 h-4 text-indigo-400" /> ArogyaPulse AI Scribe — Clinical SOAP Note
                      </h4>
                      <button
                        onClick={() => copySoapNote(patient)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-[10px] font-semibold text-indigo-300 border border-indigo-500/30 transition-all flex items-center gap-1"
                      >
                        {soapCopied === patient.id ? <Check className="w-3 h-3 text-emerald-400" /> : null}
                        {soapCopied === patient.id ? 'Copied to Clipboard' : 'Copy Note'}
                      </button>
                    </div>
                    <div className="space-y-2 text-xs text-slate-300 font-mono leading-relaxed bg-slate-950/70 p-3.5 rounded-xl border border-indigo-900/40">
                      <p><strong className="text-cyan-400">S (Subjective):</strong> Patient {patient.name} presented with reported symptoms of: {patient.report.symptoms.join(', ')}. Stated onset: {patient.report.duration}.</p>
                      <p><strong className="text-emerald-400">O (Objective):</strong> Triage AI determined Priority Level: {patient.urgency}. Routing assigned to: {patient.dept}.</p>
                      <p><strong className="text-amber-400">A (Assessment):</strong> Preliminary multi-agent assessment indicates: {patient.report.analysis?.split('.')[0] || 'Condition requires formal physician evaluation'}.</p>
                      <p><strong className="text-indigo-400">P (Plan):</strong> Complete clinical examination. Order baseline investigations for {patient.dept}. Maintain continuous monitoring.</p>
                    </div>
                  </div>
                )}

              </div>

            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="flex-grow w-full bg-[#090d16] text-slate-100 p-4 sm:p-8 md:p-10 min-h-full">
      <div className="max-w-6xl mx-auto">
        
        {/* Clinician Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium">Clinician Station</span>
              <span className="text-xs text-slate-400">ArogyaPulse AI Medical Staff</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {activeTab === 'queue' ? 'Active Clinical Triage Queue' : 'Consultation Roster & Schedule'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Real-time patient intake streaming with automated AI Scribe SOAP documentation.
            </p>
          </div>

          {/* Filters for Queue */}
          {activeTab === 'queue' && (
            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              <select 
                value={filterUrgency}
                onChange={(e) => { setFilterUrgency(e.target.value); setQueuePage(1); }}
                className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold text-slate-200 outline-none focus:border-cyan-500"
              >
                <option value="All">All Urgency Levels</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>

              <select 
                value={filterDept}
                onChange={(e) => { setFilterDept(e.target.value); setQueuePage(1); }}
                className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold text-slate-200 outline-none focus:border-cyan-500"
              >
                <option value="All">All Departments</option>
                {uniqueDepts.map(dept => (
                  <option key={String(dept)} value={String(dept)}>{String(dept)}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Tab 1: Queue Content */}
        {activeTab === 'queue' ? (
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-3 p-4 bg-slate-950/60 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <div className="col-span-4 md:col-span-3 pl-2">Patient Name</div>
              <div className="col-span-3 md:col-span-2 text-center">Urgency Level</div>
              <div className="hidden md:block md:col-span-4">Recommended Dept</div>
              <div className="col-span-4 md:col-span-2 text-right">Intake Time</div>
              <div className="col-span-1 text-center"></div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-slate-800/60">
              {loading ? (
                <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
                  <div className="w-6 h-6 border-2 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin"></div>
                  <span className="text-xs">Streaming active triage queue...</span>
                </div>
              ) : patients.length === 0 ? (
                <div className="p-12 text-center">
                  <ShieldCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-300 font-semibold text-sm">All Patient Triages Cleared</p>
                  <p className="text-slate-400 text-xs mt-1">No pending triage cases waiting in queue.</p>
                </div>
              ) : (
                renderPatientList(paginatedPatients, false)
              )}
            </div>

            {/* Pagination Controls */}
            {filteredPatients.length > ITEMS_PER_PAGE && (
              <div className="p-4 flex items-center justify-between border-t border-slate-800 bg-slate-950/40">
                <span className="text-xs text-slate-400">Page {queuePage} of {totalQueuePages}</span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setQueuePage(p => Math.max(1, p - 1))}
                    disabled={queuePage === 1}
                    className="p-1.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setQueuePage(p => Math.min(totalQueuePages, p + 1))}
                    disabled={queuePage === totalQueuePages}
                    className="p-1.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Tab 2: Schedule & Slot Locking */
          <div className="space-y-6">
            {/* Slot Locking Card */}
            <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-3xl">
              <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Lock className="w-4 h-4 text-cyan-400" /> Clinician Availability Slot Management
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input 
                  type="date" 
                  value={lockDate}
                  onChange={(e) => setLockDate(e.target.value)}
                  className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-cyan-500"
                />
                <input 
                  type="time" 
                  value={lockTimeFrom}
                  onChange={(e) => setLockTimeFrom(e.target.value)}
                  className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-cyan-500"
                />
                <input 
                  type="time" 
                  value={lockTimeTo}
                  onChange={(e) => setLockTimeTo(e.target.value)}
                  className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-cyan-500"
                />
                <button
                  onClick={handleLockSlot}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-cyan-500/20 flex items-center justify-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" /> Block Out Slot
                </button>
              </div>

              {/* Locked Slots list */}
              {lockedSlots.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Blocked Hours:</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {lockedSlots.map(slot => (
                      <div key={slot.id} className="flex items-center gap-2 px-3 py-1 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300">
                        <span>{slot.appointment_time}</span>
                        <button onClick={() => handleUnlockSlot(slot.id)} className="text-slate-400 hover:text-rose-400" title="Unlock slot">
                          <Unlock className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Scheduled Consultations Table */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="p-4 bg-slate-950/60 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-400" /> Booked Consultations
                </h3>
              </div>
              <div className="divide-y divide-slate-800/60">
                {loadingAppts ? (
                  <div className="p-8 text-center text-slate-400 text-xs">Loading consultation roster...</div>
                ) : patientAppts.length === 0 ? (
                  <div className="p-10 text-center text-slate-400 text-xs">No booked patient consultations scheduled.</div>
                ) : (
                  renderPatientList(paginatedAppts, true)
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      <ConfirmDialog
        isOpen={!!archiveId}
        title="Archive Triage Record"
        description="Are you sure you want to archive this clinical record? It will be removed from your active triage view."
        confirmText="Archive"
        onConfirm={handleArchive}
        onCancel={() => setArchiveId(null)}
      />
    </div>
  );
}
