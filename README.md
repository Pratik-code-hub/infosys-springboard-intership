# ArogyaPulse AI 🏥⚡
> **Next-Generation Multi-Agent Clinical Intelligence & Healthcare Orchestration Platform**  
> *Engineered by **Pratik Kumar** | Production-Grade Healthcare OS*

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Framework](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![Backend](https://img.shields.io/badge/FastAPI-0.104+-teal.svg)](https://fastapi.tiangolo.com/)
[![Agents](https://img.shields.io/badge/LangGraph-StateGraph-orange.svg)](https://langchain-ai.github.io/langgraph/)
[![Database](https://img.shields.io/badge/Supabase-pgvector%20RAG-emerald.svg)](https://supabase.com/)
[![AI Engine](https://img.shields.io/badge/LLM-Groq%20%7C%20Google%20Gemini-indigo.svg)](https://groq.com/)

---

## 🌟 Executive Overview

**ArogyaPulse AI** is a state-of-the-art clinical decision support and triage system designed to streamline the patient intake pipeline, ground clinical decision-making in real-time vector medical databases, and assist doctors by automatically synthesizing clinical SOAP notes.

Built with an autonomous **Multi-Agent Architecture using LangGraph**, ArogyaPulse orchestrates five specialized clinical agents working in concert to collect symptoms, retrieve validated clinical literature via **pgvector RAG**, evaluate urgency, route patients to the correct hospital department, and dynamically allocate consultation slots.

---

## 🔬 Multi-Agent Clinical Architecture

```
                                  [ Patient Intake (Text / Voice / Scan) ]
                                                     │
                                                     ▼
                                            ┌─────────────────┐
                                            │ 1. Intake Agent │
                                            └────────┬────────┘
                                                     │ (Structured Symptoms)
                                                     ▼
                                           ┌───────────────────┐
                                           │ 2. Research Agent │ ◄── [ Supabase pgvector RAG ]
                                           └─────────┬─────────┘     (Medical Knowledge Base)
                                                     │ (Grounded Context)
                                                     ▼
                                           ┌───────────────────┐
                                           │ 3. Analysis Agent │
                                           └─────────┬─────────┘
                                                     │ (Clinical Rationale)
                                                     ▼
                                           ┌───────────────────┐
                                           │ 4. Decision Agent │
                                           └─────────┬─────────┘
                                                     │ (Urgency & Department)
                                                     ▼
                                          ┌─────────────────────┐
                                          │ 5. Scribe Reporting │
                                          └──────────┬──────────┘
                                                     │
                        ┌────────────────────────────┴────────────────────────────┐
                        ▼                                                         ▼
           [ Patient Triage Dossier ]                                [ Clinician SOAP Note & Queue ]
```

### The 5 Autonomous Agent Nodes:
1. **Intake Agent**: Extracts core symptoms, duration, and severity from raw multimodal natural language or uploaded medical scans.
2. **Research Agent (RAG)**: Queries clinical embeddings stored in Supabase `pgvector` to ground reasoning in peer-reviewed medical data.
3. **Analysis Agent**: Evaluates patient presentation against retrieved medical protocols to infer probable conditions and risk vectors.
4. **Decision & Triage Agent**: Formally assigns standardized Urgency Level (*Critical, High, Medium, Low*) and routes to specialized hospital departments.
5. **Clinical Scribe & Reporting Agent**: Automatically drafts structured physician SOAP notes (*Subjective, Objective, Assessment, Plan*) and dockets the case.

---

## 🚀 Key Platform Features

- **Multimodal Patient Intake**: Supports text, real-time Web Speech voice dictation, and medical image/scan uploads.
- **Clinician Triage Station**: Real-time queue for attending physicians with 1-click SOAP note generation and export.
- **Dynamic Slot Rostering**: Intelligent queue scheduling preventing clinic congestion and allowing doctors to block custom hours.
- **Executive Command Center**: Interactive departmental volume charts, urgency distribution metrics, and audit registries built with Recharts.
- **1-Click Indian Demographic Demo Profiles**: Instant testing across Patient, Doctor, and Director personas:
  - **Superadmin / Director**: `pratik.admin@arogyapulse.ai`
  - **Attending Cardiologist**: `dr.ananya@arogyapulse.ai`
  - **General Practitioner**: `dr.rajesh@arogyapulse.ai`
  - **Patient**: `aarav.verma@gmail.com`
- **One-Click Dossier Export**: Generate and download encrypted clinical PDF dossiers and Excel audit spreadsheets.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Recharts, Vite |
| **Backend API** | FastAPI, Python 3.11+, Pydantic v2, Uvicorn |
| **Agentic Framework** | LangGraph, LangChain, StateGraph |
| **AI Providers** | Groq (`llama-3.3-70b-versatile`) & Google Gemini (`gemini-1.5-flash`) |
| **Database & Auth** | Supabase (PostgreSQL, Row Level Security, pgvector embeddings) |
| **Export Engines** | jsPDF, SheetJS (XLSX) |

---

## 📦 Installation & Local Setup

### Prerequisites
- Node.js (v18+)
- Python (v3.11+)
- Supabase Account
- Groq API Key or Google Gemini API Key

---

### Step 1: Clone Repository & Database Setup
```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/ArogyaPulse-AI.git
cd ArogyaPulse-AI
```

1. Create a project on [Supabase](https://supabase.com).
2. Navigate to the **SQL Editor** in Supabase and run the migration script: `backend/supabase_schema.sql`.
3. Note your **Supabase URL**, **Anon Key**, and **Service Role Key**.

---

### Step 2: Backend Configuration
```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
```

Create `backend/.env` (see `backend/.env.example`):
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Choose either or both:
GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_google_gemini_key
```

Seed initial Indian clinical personas:
```bash
python create_users.py
```

Start the FastAPI engine:
```bash
uvicorn app.main:app --reload --port 8000
```
Backend will be live on `http://localhost:8000` (Swagger docs at `/docs`).

---

### Step 3: Frontend Configuration
Open a new terminal window:
```bash
cd frontend
npm install
```

Create `frontend/.env.local`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:8000
```

Launch the development server:
```bash
npm run dev
```
Frontend will be accessible at `http://localhost:2004`.

---

## 🧪 Quick Test-Drive Guide

1. Open `http://localhost:2004/auth`.
2. Click **"Patient (Aarav Verma)"** on the 1-Click Demo Profiles bar, then click **Access System**.
3. Go to **Symptom Intake AI**, click one of the quick symptom prompts (e.g. *"High fever (102°F) with body chills for 3 days"*), and press Send.
4. Click **"Generate Multi-Agent Clinical Triage Report"**. Watch the LangGraph stepper orchestrate all 5 agents in real time.
5. Log out and switch to **"Doctor (Dr. Ananya)"**. Open the **Active Triage Queue** to review the patient's record, view the scan report, and click **"Generate SOAP Note"**!

---

## 📄 License

This software is released under the **MIT License**.  
Copyright (c) 2026 **Pratik Kumar**. All rights reserved. See [LICENSE](LICENSE) for full legal text.

---

## 👨‍💻 Author & Attribution

**Engineered and maintained by Pratik Kumar.**  
Designed as a production-grade multi-agent medical triage platform. Contributions and issues are welcome via GitHub Pull Requests.
