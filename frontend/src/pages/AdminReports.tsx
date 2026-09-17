import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { 
  Download,
  Search,
  FileText,
  FileDown, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  FileSpreadsheet
} from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

type TriageData = {
  id: string;
  created_at: string;
  symptoms: string;
  analysis: string;
  urgency: string;
  department: string;
  patient: {
    full_name: string;
  };
  doctorName?: string;
};

export default function AdminReports() {
  const [reports, setReports] = useState<TriageData[]>([]);
  const [activeDoctors, setActiveDoctors] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [urgencyFilter, setUrgencyFilter] = useState('All');
  const [doctorFilter, setDoctorFilter] = useState('All');
  const [diseaseSearch, setDiseaseSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const ITEMS_PER_PAGE = 10;
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAndFetchData();
  }, []);

  const checkAdminAndFetchData = async () => {
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

    await fetchReports();
  };

  const fetchReports = async () => {
    setLoading(true);
    let doctorsList = [
      { id: 'doc-ananya', name: 'Dr. Ananya Iyer' },
      { id: 'doc-rajesh', name: 'Dr. Rajesh Mehta' },
      { id: 'doc-priya', name: 'Dr. Priya Patel' }
    ];

    try {
      const { data: doctorsData } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('role', 'doctor');

      if (doctorsData && doctorsData.length > 0) {
        doctorsList = doctorsData.map(d => ({
          id: d.id,
          name: d.full_name?.replace(/\s*\((Doctor|doctor)\)/gi, '') || 'Doctor'
        }));
      }
    } catch (e) {
      console.warn("Doctors fetch fallback", e);
    }
    setActiveDoctors(doctorsList);

    let onlineReports: any[] = [];
    try {
      const { data, error } = await supabase
        .from('triages')
        .select(`
          id,
          created_at,
          symptoms,
          analysis,
          urgency,
          department,
          patient:users!triages_patient_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      const { data: apptData } = await supabase
        .from('appointments')
        .select('*, users!appointments_doctor_id_fkey(full_name)');

      if (!error && data && data.length > 0) {
        onlineReports = data.map((triage: any) => {
          const appt = apptData?.find(a => a.triage_report_id === triage.id);
          let docName = appt?.users?.full_name || 'Unassigned';
          docName = docName.replace(/\s*\((Patient|Doctor|Admin|patient|doctor|admin)\)/gi, '');
          return { ...triage, doctorName: docName };
        });
      }
    } catch (err) {
      console.warn("Supabase reports fallback", err);
    }

    // Read local triages created in current session
    const localRaw = localStorage.getItem('arogya_local_triages');
    const localTriages: any[] = localRaw ? JSON.parse(localRaw) : [];
    const formattedLocal: TriageData[] = localTriages.map((t: any) => ({
      id: t.id,
      created_at: t.created_at || new Date().toISOString(),
      symptoms: t.symptoms || '',
      analysis: t.analysis || '',
      urgency: t.urgency || 'Medium',
      department: t.department || 'General Practice',
      patient: {
        full_name: t.patient_name || 'Aarav Verma'
      },
      doctorName: t.doctorName || 'Dr. Ananya Iyer'
    }));

    const defaultShowcaseReports: TriageData[] = [
      {
        id: 'triage-demo-1',
        created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
        symptoms: 'Persistent dry cough, mild fever (100.4°F), sore throat for 3 days',
        analysis: 'Clinical presentation indicates acute upper respiratory tract infection. Mild febrile episode without chest pain.',
        urgency: 'Medium',
        department: 'General Medicine',
        patient: { full_name: 'Aarav Verma' },
        doctorName: 'Dr. Rajesh Mehta'
      },
      {
        id: 'triage-demo-2',
        created_at: new Date(Date.now() - 3600000 * 72).toISOString(),
        symptoms: 'Elevated blood pressure reading (145/92 mmHg), occasional palpitations',
        analysis: 'Stage 1 essential hypertension with episodic palpitations. Recommended 24h ambulatory BP monitor and ECG review.',
        urgency: 'High',
        department: 'Cardiology',
        patient: { full_name: 'Priya Nair' },
        doctorName: 'Dr. Ananya Iyer'
      }
    ];

    const allCombined = [...formattedLocal, ...(onlineReports.length > 0 ? onlineReports : defaultShowcaseReports)];
    const uniqueMap = new Map();
    allCombined.forEach(item => {
      if (!uniqueMap.has(item.id)) uniqueMap.set(item.id, item);
    });

    setReports(Array.from(uniqueMap.values()));
    setLoading(false);
  };

  const filteredReports = reports.filter(r => {
    const matchUrgency = urgencyFilter === 'All' || r.urgency === urgencyFilter;
    const matchDoctor = doctorFilter === 'All' || r.doctorName === doctorFilter;
    const q = diseaseSearch.trim().toLowerCase();
    const matchDisease = !q ||
                         (r.analysis?.toLowerCase().includes(q)) || 
                         (r.symptoms?.toLowerCase().includes(q)) ||
                         (r.department?.toLowerCase().includes(q)) ||
                         (r.patient?.full_name?.toLowerCase().includes(q)) ||
                         (r.id?.toLowerCase().includes(q));
    return matchUrgency && matchDoctor && matchDisease;
  });

  const uniqueDoctors = ['All', 'Unassigned', ...activeDoctors.map(d => d.name)];
  const totalPages = Math.ceil(filteredReports.length / ITEMS_PER_PAGE) || 1;
  const paginatedReports = filteredReports.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const getUrgencyColor = (level: string) => {
    switch(level) {
      case 'Critical': return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'High': return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'Medium': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'Low': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      default: return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const downloadExcel = () => {
    const exportData = filteredReports.map(r => ({
      System: "ArogyaPulse AI",
      Author: "Pratik",
      Date: new Date(r.created_at).toLocaleDateString(),
      'Patient Name': (r.patient?.full_name || 'Unknown').replace(/\s*\((Patient|Doctor|Admin|patient|doctor|admin)\)/gi, ''),
      'Assigned Doctor': r.doctorName || 'Unassigned',
      Urgency: r.urgency,
      Department: r.department,
      Symptoms: r.symptoms,
      'AI Analysis': r.analysis || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const colWidths = [
      { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 50 }, { wch: 80 }
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ClinicalRegistry");
    XLSX.writeFile(workbook, `ArogyaPulse_Registry_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.text('ArogyaPulse AI — Clinical Analytics & Audit Report', 14, 16);
    
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.text(`Platform Director: Pratik | Exported on: ${new Date().toLocaleDateString()}`, 14, 32);
    doc.text(`Filters applied - Urgency: ${urgencyFilter} | Clinician: ${doctorFilter}`, 14, 38);

    let yPos = 48;
    filteredReports.forEach((report, index) => {
      if (yPos > 265) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      const patName = (report.patient?.full_name || 'Unknown').replace(/\s*\((Patient|Doctor|Admin|patient|doctor|admin)\)/gi, '');
      doc.text(`${index + 1}. Patient: ${patName} (${new Date(report.created_at).toLocaleDateString()})`, 14, yPos);
      yPos += 6;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Urgency: ${report.urgency} | Department: ${report.department} | Assigned: ${report.doctorName}`, 14, yPos);
      yPos += 6;

      doc.text('Primary Symptoms:', 14, yPos);
      const splitSymptoms = doc.splitTextToSize(report.symptoms, 160);
      doc.text(splitSymptoms, 50, yPos);
      yPos += (splitSymptoms.length * 5) + 2;

      doc.text('AI Assessment:', 14, yPos);
      const splitAnalysis = doc.splitTextToSize(report.analysis || 'None recorded', 160);
      doc.text(splitAnalysis, 50, yPos);
      yPos += (splitAnalysis.length * 5) + 8;
    });

    doc.save(`ArogyaPulse_Audit_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const downloadIndividualPDF = (report: TriageData) => {
    const doc = new jsPDF();
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.text('ArogyaPulse AI — Individual Patient Triage Docket', 14, 16);
    
    doc.setTextColor(15, 23, 42);
    let yPos = 35;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    const patName = (report.patient?.full_name || 'Unknown').replace(/\s*\((Patient|Doctor|Admin|patient|doctor|admin)\)/gi, '');
    doc.text(`Patient: ${patName}`, 14, yPos);
    yPos += 7;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Triage Timestamp: ${new Date(report.created_at).toLocaleString()}`, 14, yPos);
    yPos += 7;
    doc.text(`Assigned Clinician: ${report.doctorName}`, 14, yPos);
    yPos += 7;
    doc.text(`Urgency Level: ${report.urgency} | Department Routing: ${report.department}`, 14, yPos);
    yPos += 12;

    doc.setFont('helvetica', 'bold');
    doc.text('Reported Symptoms:', 14, yPos);
    doc.setFont('helvetica', 'normal');
    const splitSymptoms = doc.splitTextToSize(report.symptoms, 160);
    doc.text(splitSymptoms, 14, yPos + 6);
    yPos += (splitSymptoms.length * 5) + 12;

    doc.setFont('helvetica', 'bold');
    doc.text('AI Clinical Analysis & Diagnostic Rationale:', 14, yPos);
    doc.setFont('helvetica', 'normal');
    const splitAnalysis = doc.splitTextToSize(report.analysis || 'None recorded', 180);
    doc.text(splitAnalysis, 14, yPos + 6);

    doc.save(`ArogyaPulse_${patName.replace(/\s/g, '_')}_${new Date(report.created_at).toISOString().split('T')[0]}.pdf`);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await supabase.from('triages').delete().eq('id', deleteId);
    } catch (e) {}

    // Also remove from local storage
    const localRaw = localStorage.getItem('arogya_local_triages');
    if (localRaw) {
      try {
        const localTriages = JSON.parse(localRaw);
        const updated = localTriages.filter((t: any) => t.id !== deleteId);
        localStorage.setItem('arogya_local_triages', JSON.stringify(updated));
      } catch (e) {}
    }

    setReports(prev => prev.filter(r => r.id !== deleteId));
    setDeleteId(null);
  };

  return (
    <div className="flex-grow w-full bg-[#090d16] text-slate-100 p-4 sm:p-8 md:p-10 min-h-full">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-medium">Audit Analytics</span>
              <span className="text-xs text-slate-400">ArogyaPulse Clinical Registry</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <FileText className="w-7 h-7 text-cyan-400" />
              Clinical Reports & Analytics
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">Audit, filter, and export comprehensive patient triage dossiers.</p>
          </div>
          
          <div className="flex items-center gap-2.5">
            <button 
              onClick={downloadExcel}
              className="px-3.5 py-2 bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-emerald-400 rounded-xl text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Registry (Excel)</span>
            </button>
            <button 
              onClick={downloadPDF}
              className="px-3.5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-cyan-500/20 flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Download Audit (PDF)</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl mb-6 shadow-xl flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search symptoms, conditions, or clinical keywords..."
              value={diseaseSearch}
              onChange={(e) => { setDiseaseSearch(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-cyan-500 placeholder-slate-400"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">Urgency:</span>
              <select
                value={urgencyFilter}
                onChange={(e) => { setUrgencyFilter(e.target.value); setCurrentPage(1); }}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-cyan-500"
              >
                <option value="All">All Levels</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">Clinician:</span>
              <select
                value={doctorFilter}
                onChange={(e) => { setDoctorFilter(e.target.value); setCurrentPage(1); }}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-cyan-500 max-w-[150px] truncate"
              >
                {uniqueDoctors.map(doc => (
                  <option key={doc} value={doc}>{doc}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Reports Table */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/70 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="p-4 pl-6">Date</th>
                  <th className="p-4">Patient</th>
                  <th className="p-4">Attending Doctor</th>
                  <th className="p-4">Urgency</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">Key Symptoms</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400">
                      Loading clinical dossiers...
                    </td>
                  </tr>
                ) : paginatedReports.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400">
                      No matching records found.
                    </td>
                  </tr>
                ) : (
                  paginatedReports.map((report) => (
                    <tr key={report.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 pl-6 text-slate-400 font-mono">
                        {new Date(report.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 font-semibold text-white">
                        {(report.patient?.full_name || 'Unknown Patient').replace(/\s*\((Patient|Doctor|Admin|patient|doctor|admin)\)/gi, '')}
                      </td>
                      <td className="p-4 text-slate-300">
                        {report.doctorName}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getUrgencyColor(report.urgency)}`}>
                          {report.urgency}
                        </span>
                      </td>
                      <td className="p-4 text-slate-300 font-medium">
                        {report.department}
                      </td>
                      <td className="p-4 text-slate-400 max-w-[200px] truncate">
                        {report.symptoms}
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => downloadIndividualPDF(report)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-lg border border-slate-700 transition-colors"
                            title="Download Patient Dossier (PDF)"
                          >
                            <FileDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteId(report.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors border border-transparent hover:border-rose-500/30"
                            title="Purge Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between">
              <span className="text-xs text-slate-400">Page {currentPage} of {totalPages}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      <ConfirmDialog
        isOpen={!!deleteId}
        title="Purge Triage Record"
        description="Are you sure you want to permanently delete this clinical record from the audit registry? This operation is irreversible."
        confirmText="Purge"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
