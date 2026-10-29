# GitHub Actions Detective (Next.js + Python Tech Stack)

A refactored, modern DevOps CI/CD log diagnostics tool built with **Next.js (React 19 / TypeScript / App Router)** and **Python (FastAPI / Uvicorn / HTTPX)**.

---

## 🏗️ Architecture

```
Rebactor/
├── backend/                  # Python FastAPI Service
│   ├── main.py               # REST API, log extractor, and root-cause classifier
│   ├── requirements.txt      # Dependencies (fastapi, httpx, uvicorn, pydantic)
│   ├── .env                  # Configuration (GITHUB_TOKEN, PORT, CORS)
│   ├── .env.example          # Template
│   └── Dockerfile            # Container definition
│
├── frontend/                 # Next.js App Router Application
│   ├── src/
│   │   ├── app/              # layout.tsx, page.tsx, globals.css
│   │   ├── components/       # LogCard.tsx with diagnosis tabs and copy utils
│   │   ├── lib/              # api.ts client service
│   │   └── types/            # TypeScript interfaces
│   ├── .env.local            # NEXT_PUBLIC_API_URL=http://localhost:8001
│   ├── package.json
│   └── Dockerfile
│
└── docker-compose.yml        # Multi-container orchestration
```

---

## ⚡ Features

1. **Auto-Fetched Repositories**: Automatically fetches accessible repositories for your GitHub account.
2. **AI / Rule-Based Log Diagnostic Summary**:
   - Classifies failure category (`Non-zero Exit Code`, `Dependency Failure`, `Environment Config`, etc.)
   - Extracts failed command / step and exit status
   - Highlights human-readable root causes and auto-fix recommendations
3. **Multi-View Mode**:
   - **AI Diagnosis**: Structured cards with root cause and recommended actions
   - **Formatted**: Cleaned log stripped of ANSI escapes and carriage noise
   - **Raw Log**: Direct terminal log streaming
4. **Security & Flexibility**: Works with pre-configured backend token or custom runtime token override in the header.

---

## 🚀 Running Locally

### Option 1: Development Mode (Run Both)

#### 1. Start Python Backend:
```bash
cd Rebactor/backend
pip install -r requirements.txt
python main.py
```
> Backend runs at: `http://localhost:8001` (Interactive Swagger docs: `http://localhost:8001/docs`)

#### 2. Start Next.js Frontend:
```bash
cd Rebactor/frontend
npm run dev
```
> Frontend runs at: `http://localhost:3000`

---

### Option 2: Docker Compose

```bash
cd Rebactor
docker-compose up --build
```
- Open `http://localhost:3000` to access the dashboard.
