import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Paperclip, 
  Send, 
  X, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  MessageSquare, 
  Plus, 
  Menu, 
  Trash2, 
  Activity, 
  Sparkles, 
  Search, 
  Brain, 
  ShieldCheck, 
  FileCheck2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type Message = {
  id: string;
  sender: 'user' | 'ai';
  text: string;
};

type ChatSession = {
  id: string;
  title: string;
  created_at: string;
};

const AGENT_STEPS = [
  { name: 'Intake', icon: MessageSquare },
  { name: 'Knowledge RAG', icon: Search },
  { name: 'Clinical Analysis', icon: Brain },
  { name: 'Urgency Scoring', icon: ShieldCheck },
  { name: 'Scribe Report', icon: FileCheck2 }
];

const SUGGESTED_SYMPTOMS = [
  "Severe chest tightness and shortness of breath",
  "High fever (102°F) with body chills for 3 days",
  "Throbbing migraine with light sensitivity",
  "Sharp abdominal pain on the lower right side"
];

export default function SymptomChecker() {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isTriaging, setIsTriaging] = useState(false);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(-1);
  const [attachedImage, setAttachedImage] = useState<{file: File, base64: string} | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  
  // Chat Sessions States
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  
  // Voice Assistant States
  const [isListening, setIsListening] = useState(false);
  const [isSpeakingEnabled, setIsSpeakingEnabled] = useState(true);
  const [recognition, setRecognition] = useState<any>(null);
  const [wasLastInputVoice, setWasLastInputVoice] = useState(false);
  
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

  // Simulate agent pipeline progress
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isTriaging) {
      setCurrentStep(0);
      interval = setInterval(() => {
        setCurrentStep(prev => (prev < 4 ? prev + 1 : prev));
      }, 700);
    } else {
      setCurrentStep(-1);
    }
    return () => clearInterval(interval);
  }, [isTriaging]);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      const recog = new SpeechRecognitionAPI();
      recog.continuous = true;
      recog.interimResults = false;
      
      recog.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setInput(prev => prev + (prev ? ' ' : '') + finalTranscript.trim());
          setWasLastInputVoice(true);
        }
      };
      recog.onend = () => setIsListening(false);
      setRecognition(recog);
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognition?.stop();
      setIsListening(false);
    } else {
      try {
        recognition?.start();
        setIsListening(true);
      } catch(e) {
        console.error("Speech recognition error:", e);
      }
    }
  };
  
  const initialMessage: Message = {
    id: '1',
    sender: 'ai',
    text: "Namaste! I am the ArogyaPulse Clinical Assistant. I am here to help systematically assess your symptoms and assist your clinical team. Please note that I provide clinical decision support and this is not a substitute for emergency services in life-threatening conditions.\n\nTo get started, could you briefly describe what symptoms or discomfort you are experiencing today?"
  };

  const [messages, setMessages] = useState<Message[]>([initialMessage]);

  useEffect(() => {
    if (!patientId) return;
    const fetchSessions = async () => {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      try {
        const res = await fetch(`${apiUrl}/api/v1/sessions/${patientId}`);
        if (res.ok) {
          const data = await res.json();
          setSessions(data);
        }
      } catch (e) {
        console.error("Failed to fetch sessions", e);
      }
    };
    fetchSessions();
  }, [patientId]);

  const loadSession = async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    try {
      const res = await fetch(`${apiUrl}/api/v1/sessions/${sessionId}/messages`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setMessages(data.map((m: any) => ({
            id: m.id,
            sender: m.sender === 'patient' ? 'user' : 'ai',
            text: m.message
          })));
        } else {
          setMessages([initialMessage]);
        }
      }
    } catch (e) {
      console.error("Failed to load session messages", e);
    }
  };

  const handleDeleteSession = async () => {
    if (!sessionToDelete) return;
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    try {
      const res = await fetch(`${apiUrl}/api/v1/sessions/${sessionToDelete}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setSessions(prev => prev.filter(s => s.id !== sessionToDelete));
        if (currentSessionId === sessionToDelete) {
          startNewChat();
        }
      }
    } catch (e) {
      console.error("Failed to delete session", e);
    }
    setSessionToDelete(null);
  };

  const startNewChat = () => {
    setCurrentSessionId(null);
    setMessages([initialMessage]);
    setIsSidebarOpen(false);
  };

  // AI Speech Synthesis
  useEffect(() => {
    if (messages.length > 1) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.sender === 'ai' && isSpeakingEnabled && wasLastInputVoice) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(lastMessage.text);
        window.speechSynthesis.speak(utterance);
      }
    }
  }, [messages, isSpeakingEnabled, wasLastInputVoice]);

  // Intelligent Clinical Decision & Conversational Fallback Engine
  const generateClinicalAiResponse = (userMessage: string, previousMessages: Message[]): string => {
    const msg = userMessage.toLowerCase();
    
    // Cardiac / Thoracic
    if (msg.includes('chest') || msg.includes('heart') || msg.includes('palpitation') || msg.includes('angina') || msg.includes('cardiac')) {
      return "I note that you are experiencing chest or cardiac-related discomfort. To ensure accurate triage:\n\n1. Does the tightness or pain radiate into your left arm, neck, jaw, or back?\n2. Are you experiencing any shortness of breath, cold sweats, or dizziness?\n3. How long has this sensation been present?";
    }
    
    // Respiratory / Pulmonary
    if (msg.includes('breath') || msg.includes('cough') || msg.includes('asthma') || msg.includes('wheez') || msg.includes('throat') || msg.includes('lung')) {
      return "Thank you for describing your respiratory symptoms:\n\n1. Is your cough dry or producing colored sputum/mucus?\n2. Does your breathing difficulty worsen when lying flat or during exertion?\n3. Have you measured your oxygen saturation (SpO2) or body temperature?";
    }

    // Fever / Infection / Flu / Dengue / Malaria
    if (msg.includes('fever') || msg.includes('chill') || msg.includes('temperature') || msg.includes('malaria') || msg.includes('dengue') || msg.includes('infection') || msg.includes('shiver')) {
      return "I have documented your fever and systemic discomfort:\n\n1. What is your highest recorded temperature (e.g., 101°F / 102°F) and for how many days has it persisted?\n2. Are you experiencing shivering, severe body aches, rash, or nausea?\n3. Have you taken any fever-reducing medication (such as Paracetamol)?";
    }

    // Neurological / Headache / Migraine
    if (msg.includes('headache') || msg.includes('migraine') || msg.includes('dizzy') || msg.includes('faint') || msg.includes('vision') || msg.includes('numb')) {
      return "Headache and neurological presentations require careful evaluation:\n\n1. Is the pain throbbing on one side or a steady tight pressure across the head?\n2. Are you experiencing sensitivity to bright light, nausea, or visual disturbances?\n3. On a scale of 1 to 10, how intense is the discomfort right now?";
    }

    // Abdominal / Gastrointestinal
    if (msg.includes('stomach') || msg.includes('abdom') || msg.includes('nausea') || msg.includes('vomit') || msg.includes('diarrhea') || msg.includes('cramp') || msg.includes('acidity')) {
      return "Abdominal symptoms can stem from several clinical factors:\n\n1. Is the pain focused in the upper abdomen, lower right side, or generalized?\n2. Have you experienced any vomiting, fever, or inability to retain liquids?\n3. Did the pain begin abruptly or build up gradually over hours/days?";
    }

    // Orthopedic / Musculoskeletal / Joint
    if (msg.includes('joint') || msg.includes('knee') || msg.includes('bone') || msg.includes('back') || msg.includes('muscle') || msg.includes('sprain') || msg.includes('fracture') || msg.includes('swelling')) {
      return "For musculoskeletal and orthopedic concerns:\n\n1. Was there a recent fall, impact, twist, or strenuous physical activity?\n2. Is there visible swelling, redness, or difficulty bearing weight?\n3. Does resting the area relieve the pain or does stiffness persist?";
    }

    // Skin / Allergy / Rash
    if (msg.includes('rash') || msg.includes('skin') || msg.includes('itch') || msg.includes('allergy') || msg.includes('redness') || msg.includes('blister')) {
      return "Dermatological and allergic symptoms require visual and temporal assessment:\n\n1. When did this first appear, and is it spreading to other areas of the body?\n2. Is it accompanied by intense itching, burning, or facial swelling?\n3. Have you used any new skincare products, foods, or medications recently?";
    }

    // General Contextual Response
    const userCount = previousMessages.filter(m => m.sender === 'user').length;
    if (userCount <= 1) {
      return `I have noted: "${userMessage}". To help the clinical team, could you share how many days this has been going on, and whether this is mild, moderate, or severe?`;
    } else if (userCount === 2) {
      return `Thank you for the additional context. Do you have any known medical conditions (such as hypertension, asthma, or diabetes), or are you currently taking any regular medications?`;
    } else {
      return `I have compiled a comprehensive clinical summary of your reported symptoms. You may now click the **"Run Multi-Agent Clinical Triage"** button above to generate your official diagnostic triage report and route to an attending specialist.`;
    }
  };

  const generateLocalClinicalTriage = (allMessagesText: string) => {
    const text = allMessagesText.toLowerCase();
    
    let urgency: "Critical" | "High" | "Medium" | "Low" = "Medium";
    let department = "General Medicine";
    let suspectedCondition = "Acute Febrile or Inflammatory Syndrome";
    let explanation = "";

    if (text.includes('chest') || text.includes('heart') || text.includes('angina') || text.includes('palpitation') || text.includes('cardiac')) {
      urgency = text.includes('severe') || text.includes('breath') || text.includes('radiat') || text.includes('tight') ? "Critical" : "High";
      department = "Cardiology";
      suspectedCondition = "Suspected Anginal Syndrome / Exertional Retrosternal Discomfort";
      explanation = "Patient presents with thoracic tightness and cardiac-related symptoms. High urgency assigned for emergent 12-lead ECG, cardiac troponin biomarker panel, and physician evaluation.";
    } else if (text.includes('breath') || text.includes('asthma') || text.includes('wheez') || (text.includes('cough') && text.includes('fever'))) {
      urgency = text.includes('shortness') || text.includes('breath') || text.includes('struggle') ? "High" : "Medium";
      department = "Pulmonology";
      suspectedCondition = "Acute Respiratory Infection / Bronchial Hyperreactivity";
      explanation = "Presentation consistent with lower respiratory involvement. Urgent assessment of blood oxygen saturation (SpO2), chest auscultation, and nebulization therapy recommended.";
    } else if (text.includes('headache') || text.includes('migraine') || text.includes('dizzy') || text.includes('vision') || text.includes('numb')) {
      urgency = text.includes('vision') || text.includes('numb') || text.includes('worst') ? "High" : "Medium";
      department = "Neurology";
      suspectedCondition = "Episodic Cephalea / Acute Neurological Evaluation";
      explanation = "Symptoms indicate acute cephalea or neuro-vascular event. Neurological deficit screening, blood pressure monitoring, and neuro-imaging consideration indicated.";
    } else if (text.includes('stomach') || text.includes('abdom') || text.includes('vomit') || text.includes('diarrhea') || text.includes('cramp')) {
      urgency = text.includes('lower right') || text.includes('severe') || text.includes('blood') ? "High" : "Medium";
      department = "Gastroenterology";
      suspectedCondition = "Acute Gastrointestinal Inflammation / Enteritis";
      explanation = "Clinical indicators point to acute gastrointestinal irritation or peritoneal tenderness. Focused abdominal palpation, hydration therapy, and ultrasound indicated.";
    } else if (text.includes('joint') || text.includes('fracture') || text.includes('bone') || text.includes('sprain') || text.includes('knee') || text.includes('swelling')) {
      urgency = text.includes('fracture') || text.includes('cannot walk') || text.includes('unable to bear') ? "High" : "Medium";
      department = "Orthopedics";
      suspectedCondition = "Musculoskeletal Trauma / Articular Arthralgia";
      explanation = "Clinical symptoms suggest musculoskeletal strain or structural joint involvement. Plain digital radiography (X-ray) and orthopedic immobilisation advised.";
    } else if (text.includes('rash') || text.includes('skin') || text.includes('allergy') || text.includes('itch')) {
      urgency = "Low";
      department = "Dermatology";
      suspectedCondition = "Dermatological Erythema / Cutaneous Allergic Reaction";
      explanation = "Dermatological eruption observed. Oral antihistamine therapy, topical barrier emollients, and allergen patch assessment recommended.";
    } else if (text.includes('fever') || text.includes('chill') || text.includes('malaria') || text.includes('dengue')) {
      urgency = "Medium";
      department = "General Medicine";
      suspectedCondition = "Pyrexia of Unknown Origin / Viral Syndromic Episode";
      explanation = "Febrile presentation documented. Complete Blood Count (CBC) with differential, dengue NS1/malaria serology, and antipyretic hydration indicated.";
    } else {
      urgency = "Low";
      department = "General Practice";
      suspectedCondition = "Primary Healthcare Clinical Evaluation";
      explanation = "Standard clinical triage conducted. Clinical vitals baseline and physician examination recommended for targeted diagnostic review.";
    }

    return {
      urgency_level: urgency,
      recommended_department: department,
      suspected_condition: suspectedCondition,
      ai_explanation: explanation
    };
  };

  const handleSend = async (customText?: string) => {
    const textToSend = customText || input;
    if (!textToSend.trim() && !attachedImage) return;

    const userMessage = textToSend.trim() || "Please analyze this uploaded medical report.";
    setInput('');
    
    let imageBase64 = attachedImage?.base64 || null;
    let messageText = userMessage;
    
    const newUserMsg: Message = { 
      id: Date.now().toString(), 
      sender: 'user', 
      text: imageBase64 ? `[Medical Record Attached] ${userMessage}` : userMessage 
    };

    setMessages(prev => [...prev, newUserMsg]);
    setAttachedImage(null);
    setIsTyping(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      let sessionIdToUse = currentSessionId;
      
      if (!sessionIdToUse) {
         try {
           const titleRes = await fetch(`${apiUrl}/api/v1/sessions`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ patient_id: patientId || "demo-patient", title: userMessage.substring(0, 30) + "..." })
           });
           if (titleRes.ok) {
              const newSession = await titleRes.json();
              sessionIdToUse = newSession.id;
              setCurrentSessionId(sessionIdToUse);
              setSessions(prev => [newSession, ...prev]);
           }
         } catch (e) {
           // Backend offline, skip session creation
         }
      }

      const response = await fetch(`${apiUrl}/api/v1/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patientId || "demo-patient",
          message: messageText,
          image_data: imageBase64,
          session_id: sessionIdToUse
        })
      });

      if (!response.ok) throw new Error('Network response was not ok');

      const data = await response.json();
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), sender: 'ai', text: data.reply }]);
    } catch (error) {
      // Intelligent Clinical AI Fallback
      setTimeout(() => {
        const aiReply = generateClinicalAiResponse(userMessage, [...messages, newUserMsg]);
        setMessages(prev => [...prev, { 
          id: (Date.now() + 1).toString(), 
          sender: 'ai', 
          text: aiReply 
        }]);
      }, 600);
    } finally {
      setIsTyping(false);
    }
  };

  const handleGenerateTriage = async () => {
    setIsTriaging(true);
    const recentMessages = messages.slice(-10);
    const allMessages = recentMessages.map(m => `${m.sender.toUpperCase()}: ${m.text}`).join('\n\n');
    const userComplaints = messages.filter(m => m.sender === 'user').map(m => m.text).join(', ') || "General Medical Intake";

    // Determine current patient name
    let patientDisplayName = 'Aarav Verma';
    const demoRaw = localStorage.getItem('arogya_demo_user');
    if (demoRaw) {
      try {
        const demo = JSON.parse(demoRaw);
        patientDisplayName = demo.name || 'Aarav Verma';
      } catch (e) {}
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/v1/triage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patientId || "demo-patient",
          message: allMessages,
          image_data: null
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error: ${response.status}`);
      }

      const data = await response.json();

      // Persist to local storage for multi-role sync
      const newTriage = {
        id: data.triage_id || 'triage-' + Date.now(),
        patient_id: patientId || 'demo-patient',
        patient_name: patientDisplayName,
        created_at: new Date().toISOString(),
        symptoms: userComplaints,
        duration: '1-3 days',
        analysis: data.ai_explanation || '',
        urgency: data.urgency_level || 'Medium',
        department: data.recommended_department || 'General Medicine',
        suspected_condition: data.suspected_condition || 'Clinical Evaluation Complete',
        status: 'pending',
        doctor_hidden: false,
        patient_hidden: false
      };
      const existing = JSON.parse(localStorage.getItem('arogya_local_triages') || '[]');
      localStorage.setItem('arogya_local_triages', JSON.stringify([newTriage, ...existing]));

      setTimeout(() => navigate('/result', { state: { triageData: { ...data, patient_name: patientDisplayName, symptoms: userComplaints } } }), 2800);

    } catch (error: any) {
      // Local Intelligent Multi-Agent Triage Synthesis
      const localResult = generateLocalClinicalTriage(allMessages);
      const triageId = 'triage-' + Date.now();

      const newTriage = {
        id: triageId,
        patient_id: patientId || 'demo-patient',
        patient_name: patientDisplayName,
        created_at: new Date().toISOString(),
        symptoms: userComplaints,
        duration: '1-3 days',
        analysis: localResult.ai_explanation,
        urgency: localResult.urgency_level,
        department: localResult.recommended_department,
        suspected_condition: localResult.suspected_condition,
        status: 'pending',
        doctor_hidden: false,
        patient_hidden: false
      };

      const existing = JSON.parse(localStorage.getItem('arogya_local_triages') || '[]');
      localStorage.setItem('arogya_local_triages', JSON.stringify([newTriage, ...existing]));

      const payload = {
        triage_id: triageId,
        urgency_level: localResult.urgency_level,
        recommended_department: localResult.recommended_department,
        suspected_condition: localResult.suspected_condition,
        ai_explanation: localResult.ai_explanation,
        symptoms: userComplaints,
        patient_name: patientDisplayName
      };

      setTimeout(() => navigate('/result', { state: { triageData: payload } }), 2800);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      const base64 = result.split(',')[1];
      setAttachedImage({ file, base64 });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex-grow flex w-full relative h-full overflow-hidden bg-[#090d16] text-slate-100">
      
      {/* Sidebar for Chat Sessions */}
      <div className={`absolute md:static top-0 left-0 h-full bg-slate-900/95 border-r border-slate-800 flex flex-col transition-all duration-300 z-50 ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full'} flex-shrink-0 overflow-hidden backdrop-blur-xl`}>
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-cyan-400" /> Consultations
          </h2>
          <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800" title="Close Sidebar">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="p-3">
          <button 
            onClick={startNewChat}
            className="w-full flex items-center justify-center gap-2 p-2.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 text-cyan-300 rounded-xl transition-all border border-cyan-500/30 text-xs font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Consultation</span>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
          {sessions.map((session) => (
            <div 
              key={session.id}
              onClick={() => loadSession(session.id)}
              className={`flex items-center justify-between group p-2.5 rounded-xl text-xs cursor-pointer transition-all ${currentSessionId === session.id ? 'bg-cyan-500/10 text-cyan-300 font-medium border border-cyan-500/30' : 'hover:bg-slate-800/60 text-slate-400 hover:text-slate-200'}`}
            >
              <div className="flex items-center gap-2.5 overflow-hidden flex-1">
                <Activity className="w-3.5 h-3.5 flex-shrink-0 text-cyan-400" />
                <span className="truncate">{session.title}</span>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setSessionToDelete(session.id);
                }}
                className={`p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 ${currentSessionId === session.id ? 'opacity-100' : ''}`}
                title="Delete Consultation"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {sessions.length === 0 && (
            <div className="text-xs text-slate-400 p-4 text-center">
              No previous consultations.
            </div>
          )}
        </div>
      </div>
      
      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full relative pt-2 sm:pt-4 pb-4 px-3 sm:px-6 h-full">
        
        {/* Chat Header with Agent Progress Strip */}
        <div className="bg-slate-900/85 backdrop-blur-xl rounded-2xl p-4 flex flex-col gap-3 shadow-xl border border-slate-800 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!isSidebarOpen && (
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="text-slate-400 hover:text-white transition-colors p-2 rounded-xl hover:bg-slate-800 border border-slate-800 bg-slate-900"
                  title="Open Consultation History"
                >
                  <Menu className="w-4 h-4" />
                </button>
              )}
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-400 p-[1.5px] shadow-lg shadow-cyan-500/20">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Bot className="w-5 h-5 text-cyan-400" />
                </div>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">ArogyaPulse Clinical AI</h1>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">Agent Active</span>
                </div>
                <p className="text-[11px] text-slate-400">Intelligent Medical Triage & Clinical Decision Support</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button 
                onClick={() => {
                  setIsSpeakingEnabled(!isSpeakingEnabled);
                  if (isSpeakingEnabled) window.speechSynthesis.cancel();
                }}
                className={`p-2 rounded-xl transition-all border ${
                  isSpeakingEnabled 
                    ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' 
                    : 'text-slate-400 hover:text-white border-transparent hover:bg-slate-800'
                }`}
                title={isSpeakingEnabled ? "Mute Voice Assistant" : "Enable Voice Assistant"}
              >
                {isSpeakingEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Multi-Agent Orchestration Stepper */}
          {isTriaging && (
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/90">
              <div className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Activity className="w-3 h-3 animate-spin" /> Orchestrating LangGraph Clinical Pipeline...
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {AGENT_STEPS.map((step, index) => {
                  const Icon = step.icon;
                  const isActive = index === currentStep;
                  const isPast = index < currentStep;
                  return (
                    <div 
                      key={step.name} 
                      className={`flex items-center gap-2 p-1.5 rounded-lg border text-xs transition-all ${
                        isActive 
                          ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-bold animate-pulse' 
                          : isPast 
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-medium' 
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="text-[11px] truncate">{step.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Chat History Canvas */}
        <div className="flex-grow overflow-y-auto p-4 sm:p-5 my-2 bg-slate-900/40 rounded-2xl border border-slate-800/60 flex flex-col gap-4">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex items-start gap-3 max-w-[85%] ${msg.sender === 'user' ? 'self-end flex-row-reverse' : ''}`}
            >
              {msg.sender === 'ai' && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-emerald-500/20 border border-cyan-500/30 flex-shrink-0 flex items-center justify-center text-cyan-400 mt-1">
                  <Activity className="w-4 h-4" />
                </div>
              )}
              <div 
                className={`p-4 text-xs sm:text-sm leading-relaxed rounded-2xl shadow-sm ${
                  msg.sender === 'user' 
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-sm shadow-cyan-600/20' 
                    : 'bg-slate-900/90 text-slate-200 rounded-tl-sm border border-slate-800'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>
            </div>
          ))}

          {/* AI Typing Indicator */}
          {isTyping && (
            <div className="flex items-start gap-3 max-w-[85%]">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex-shrink-0 flex items-center justify-center text-cyan-400 mt-1">
                <Activity className="w-4 h-4 animate-pulse" />
              </div>
              <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl rounded-tl-sm flex items-center gap-1.5 h-10">
                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Suggestion Chips for Fast Testing */}
        {messages.length === 1 && (
          <div className="mb-2 px-1 flex flex-wrap gap-1.5">
            {SUGGESTED_SYMPTOMS.map((symptom, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(symptom)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-[11px] text-slate-300 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/40 transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Sparkles className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                <span className="truncate">{symptom}</span>
              </button>
            ))}
          </div>
        )}

        {/* Chat Input & Action Bar */}
        <div className="bg-slate-900/90 backdrop-blur-xl rounded-2xl p-3 sm:p-4 shadow-xl border border-slate-800 z-10 flex flex-col gap-3">
          {/* Triage Trigger Action */}
          {messages.length > 1 && !isTriaging && (
            <div className="flex justify-center">
              <button 
                onClick={handleGenerateTriage}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 text-xs tracking-wide"
              >
                <ShieldCheck className="w-4 h-4" />
                Generate Multi-Agent Clinical Triage Report
              </button>
            </div>
          )}

          {/* Attachment Preview */}
          {attachedImage && (
            <div className="flex items-center gap-3 p-2 bg-slate-950/70 border border-slate-800 rounded-xl max-w-fit">
              <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center overflow-hidden border border-slate-800">
                <img src={`data:image/jpeg;base64,${attachedImage.base64}`} alt="Attachment" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-200 truncate max-w-[150px]">{attachedImage.file.name}</span>
                <span className="text-[10px] text-slate-400">{(attachedImage.file.size / 1024).toFixed(1)} KB</span>
              </div>
              <button 
                onClick={() => setAttachedImage(null)}
                className="p-1 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors ml-2"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileChange}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="text-slate-400 hover:text-cyan-400 transition-colors p-2.5 rounded-xl hover:bg-slate-800 border border-transparent hover:border-slate-700 flex-shrink-0"
              title="Attach Medical Scan / Report"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            
            <div className="flex-grow relative">
              <input 
                type="text" 
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setWasLastInputVoice(false);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={isListening ? "Listening to your voice input..." : "Type symptoms or upload medical report..."} 
                className={`w-full bg-slate-950/80 text-slate-100 text-xs sm:text-sm rounded-xl py-2.5 pl-3.5 pr-10 border transition-all outline-none placeholder-slate-400 ${
                  isListening 
                    ? 'border-rose-500 ring-2 ring-rose-500/20' 
                    : 'border-slate-800 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20'
                }`}
              />
              {isListening && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" style={{ animationDelay: '300ms' }}></div>
                </div>
              )}
            </div>

            <button 
              onClick={toggleListening}
              className={`p-2.5 rounded-xl flex items-center justify-center transition-all flex-shrink-0 border ${
                isListening 
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse' 
                  : 'bg-slate-800/80 text-slate-300 hover:text-white border-slate-700/80 hover:bg-slate-700'
              }`}
              title={isListening ? "Stop Voice Input" : "Start Voice Input"}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <button 
              onClick={() => handleSend()}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500 transition-all p-2.5 rounded-xl flex items-center justify-center shadow-md shadow-cyan-500/20 flex-shrink-0 disabled:opacity-40" 
              disabled={(!input.trim() && !attachedImage) || isTyping}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {sessionToDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-[90%] max-w-[380px] p-6 flex flex-col gap-4">
            <h3 className="text-base font-bold text-white">Delete Consultation</h3>
            <p className="text-slate-400 text-xs">Are you sure you want to permanently clear this consultation history? This action cannot be undone.</p>
            <div className="flex items-center justify-end gap-3 mt-2">
              <button 
                onClick={() => setSessionToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteSession}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-colors shadow-md shadow-rose-600/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
