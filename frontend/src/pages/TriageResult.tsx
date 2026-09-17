import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, 
  ShieldCheck, 
  CheckCircle2, 
  Activity, 
  Calendar, 
  UserRound, 
  ArrowLeft
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function TriageResult() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showToast, setShowToast] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [patientId, setPatientId] = useState<string | null>(null);

  const triageData = location.state?.triageData || {
    triage_id: null,
    urgency_level: "Medium",
    recommended_department: "General Medicine",
    ai_explanation: "ArogyaPulse Clinical AI has finalized your preliminary evaluation. Please review your recommended next steps below or book a specialist consultation."
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setPatientId(data.user.id);
      } else {
        const demoRaw = localStorage.getItem('arogya_demo_user');
        if (demoRaw) {
          try {
            const demo = JSON.parse(demoRaw);
            setPatientId(demo.id || 'demo-patient');
          } catch (e) {}
        }
      }
    }).catch(() => {
      const demoRaw = localStorage.getItem('arogya_demo_user');
      if (demoRaw) {
        try {
          const demo = JSON.parse(demoRaw);
          setPatientId(demo.id || 'demo-patient');
        } catch (e) {}
      }
    });
  }, []);

  const handleStartBooking = async () => {
    setIsBooking(true);
    let docList: any[] = [];
    try {
      const { data } = await supabase.from('users').select('id, full_name').eq('role', 'doctor');
      if (data && data.length > 0) {
        docList = data;
      }
    } catch (e) {
      console.warn("Doctors fetch fallback", e);
    }

    if (docList.length === 0) {
      docList = [
        { id: 'doc-ananya', full_name: 'Dr. Ananya Iyer (Cardiology)' },
        { id: 'doc-rajesh', full_name: 'Dr. Rajesh Mehta (General Medicine)' },
        { id: 'doc-priya', full_name: 'Dr. Priya Patel (Neurology & Internal Med)' }
      ];
    }
    setDoctors(docList);
    setSelectedDoctor(docList[0].id);
  };

  const handleConfirmBooking = async () => {
    if (!selectedDoctor || !bookingDate || !bookingTime) return;

    const formattedSlot = `${bookingDate}: ${bookingTime}`;
    const docObj = doctors.find(d => d.id === selectedDoctor);
    const docName = docObj?.full_name?.replace(/\s*\((.*?)\)/gi, '') || 'Dr. Ananya Iyer';

    try {
      if (patientId) {
        await supabase.from('appointments').insert({
          patient_id: patientId,
          doctor_id: selectedDoctor,
          triage_report_id: triageData.triage_id || null,
          department: triageData.recommended_department || 'General Medicine',
          appointment_time: formattedSlot,
          status: 'scheduled'
        });

        if (triageData.triage_id) {
          await supabase.from('triages').update({ status: 'scheduled' }).eq('id', triageData.triage_id);
        }
      }
    } catch (apptError) {
      console.warn("Supabase appointment fallback:", apptError);
    }

    // Persist appointment locally for seamless showcase
    const newAppt = {
      id: 'appt-' + Date.now(),
      patient_id: patientId || 'demo-patient',
      doctor_id: selectedDoctor,
      doctor_name: docName,
      triage_report_id: triageData.triage_id || null,
      department: triageData.recommended_department || 'General Medicine',
      appointment_time: formattedSlot,
      status: 'scheduled',
      created_at: new Date().toISOString()
    };
    const existingAppts = JSON.parse(localStorage.getItem('arogya_local_appointments') || '[]');
    localStorage.setItem('arogya_local_appointments', JSON.stringify([newAppt, ...existingAppts]));

    // Update local triage record status and clinician assignment
    const existingTriages = JSON.parse(localStorage.getItem('arogya_local_triages') || '[]');
    const updatedTriages = existingTriages.map((t: any) => {
      if (t.id === triageData.triage_id) {
        return {
          ...t,
          status: 'scheduled',
          doctorName: docName,
          appointmentTime: formattedSlot
        };
      }
      return t;
    });
    localStorage.setItem('arogya_local_triages', JSON.stringify(updatedTriages));

    setIsBooking(false);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      navigate('/dashboard');
    }, 2000);
  };

  const getUrgencyStyles = (level: string) => {
    const l = level?.toLowerCase() || '';
    if (l.includes('high') || l.includes('critical')) return 'bg-rose-500/10 text-rose-400 border-rose-500/30 ring-1 ring-rose-500/20';
    if (l.includes('low')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 ring-1 ring-emerald-500/20';
    return 'bg-amber-500/10 text-amber-400 border-amber-500/30 ring-1 ring-amber-500/20';
  };

  return (
    <div className="flex-grow flex items-center justify-center p-4 sm:p-8 bg-[#090d16] text-slate-100 min-h-full">

      {showToast && (
        <div className="fixed top-20 right-6 bg-emerald-500 text-slate-950 font-bold px-6 py-3.5 rounded-2xl shadow-xl flex items-center gap-2.5 animate-in slide-in-from-top-4 z-50 text-xs">
          <CheckCircle2 className="w-5 h-5" />
          <span>Appointment Successfully Confirmed!</span>
        </div>
      )}

      <div className="w-full max-w-2xl bg-slate-900/85 backdrop-blur-2xl rounded-3xl shadow-2xl border border-slate-800 p-6 sm:p-10 text-center relative overflow-hidden">
        
        {/* Glow ambient decoration */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-24 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Urgency Badge */}
        <div className="flex justify-center mb-6">
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider ${getUrgencyStyles(triageData.urgency_level)}`}>
            <AlertTriangle className="w-4 h-4" />
            <span>{triageData.urgency_level} Priority Level</span>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
          {triageData.suspected_condition || "Clinical Assessment Complete"}
        </h1>
        <p className="text-xs sm:text-sm text-cyan-400 font-semibold mb-8 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4" />
          Recommended Routing: {triageData.recommended_department}
        </p>

        {/* AI Clinical Reasoning Card */}
        <div className="bg-slate-950/70 rounded-2xl p-5 sm:p-7 text-left border border-slate-800/80 mb-8 shadow-inner">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">ArogyaPulse Clinical Synthesis</h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
            {triageData.ai_explanation}
          </p>
        </div>

        {/* Booking Form or Action Buttons */}
        {isBooking ? (
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-6 mb-6 text-left animate-in slide-in-from-bottom-4 shadow-xl">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              Direct Specialist Scheduling
            </h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Available Clinicians</label>
                <div className="relative">
                  <UserRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select
                    value={selectedDoctor}
                    onChange={(e) => setSelectedDoctor(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl outline-none focus:border-cyan-500 text-xs text-white"
                  >
                    {doctors.map(doc => (
                      <option key={doc.id} value={doc.id}>
                        {doc.full_name?.startsWith('Dr.') ? doc.full_name : `Dr. ${doc.full_name || doc.email?.split('@')[0] || 'Attending Physician'}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Appointment Date & Time</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input 
                    type="date" 
                    value={bookingDate} 
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl outline-none focus:border-cyan-500 text-xs text-white"
                  />
                  <input 
                    type="time" 
                    value={bookingTime} 
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl outline-none focus:border-cyan-500 text-xs text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsBooking(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold text-xs transition-all"
              >
                Back
              </button>
              <button
                onClick={handleConfirmBooking}
                disabled={!bookingDate || !bookingTime}
                className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl font-semibold text-xs shadow-md shadow-cyan-500/20 transition-all disabled:opacity-40"
              >
                Confirm Appointment Slot
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-5 py-2.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 rounded-xl font-semibold text-xs transition-all border border-slate-700 flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Return to Dashboard
            </button>
            <button
              onClick={handleStartBooking}
              className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl font-semibold text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              Schedule Specialist Consultation
            </button>
          </div>
        )}

        {/* Footer attribution */}
        <div className="mt-8 pt-4 border-t border-slate-800/80 text-[10px] text-slate-400">
          ArogyaPulse AI Multi-Agent Triage Engine • Engineered by Pratik
        </div>

      </div>
    </div>
  );
}
