![Version](https://img.shields.io/badge/version-v1.0-blue)
![React](https://img.shields.io/badge/React-19-blue)
![Node](https://img.shields.io/badge/Node-20-green)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-blue)
![Status](https://img.shields.io/badge/status-deployed-success)
# StudyFlow: Adaptive Study Planning & Scheduling Platform

StudyFlow is a production-quality, engineering-focused study planning and scheduling platform designed as a modular monolith. It enables educators to author stable, reusable public study plans, and students to follow and clone these templates into highly personalized, adaptive scheduling paths. 

The core of StudyFlow is a **deterministic, explainable scheduling engine** that allocates study hours based on deadlines, topic difficulty, urgency scoring, and historical performance. Rather than relying on fragile application-level checks, StudyFlow uses robust **PostgreSQL transactional rules and schema constraints** to guarantee ownership, concurrency control, and scheduling invariants.

---
# Live Demo

Frontend:
https://YOUR-VERCEL-URL.vercel.app

Backend API:
https://studyflow-api-hddv.onrender.com

## Tech Stack

Frontend:
- React
- Vite
- React Query

Backend:
- Express
- Sequelize
- JWT Authentication
- Zod Validation

Database:
- PostgreSQL (Neon)

Deployment:
- Vercel
- Render
- Neon

## 🌟 Key Features

- **Immutable Templates & Cloned Plans:** Clear boundary between public curriculum templates (immutable drafts or published templates) and private student execution plans.
- **Follow-and-Clone Architecture:** Secure, transactional follow mechanism that creates personal plan copies, cloning workload items and setting up isolation boundaries.
- **Deterministic Scheduling Engine:** An allocation algorithm that computes priorities based on deadline proximity, difficulty, current progress gaps, and previous study log outcomes.
- **Decision Explainability (`reason_json`):** Every scheduled item stores a detailed JSON explanation of why it was scheduled, listing raw scoring weights, deadline pressure, and priority factors.
- **Adaptive Execution Loop:** Live tracking of study logs automatically recalculates topic progress, adherence statistics, and recovery pressure (handling missed sessions dynamically).
- **PostgreSQL Invariant Defense:** Strict table-level constraints and partial indexes (e.g., enforcing exactly one active schedule run per student-plan) guarantee integrity.
- **Fine-Grained Security & Policy Layer:** Robust JWT access token authentication, secure revocable refresh token rotation, and relation-based row ownership policies.

---

## 💻 Tech Stack

- **Backend:** Node.js, Express.js (v5.x), Zod schema validation
- **Frontend:** React (v19), Vite, TanStack React Query (v5), Zustand state management, Recharts
- **Database & ORM:** PostgreSQL, Sequelize ORM
- **Testing:** Jest & Supertest (Backend), Vitest (Frontend)
- **Logging & Security:** Pino structured logger, Helmet security headers, Express Rate Limit

---

## 📂 Project Architecture

```text
├── backend/
│   ├── api/                 # API configuration and route registry
│   ├── config/              # Sequelize connection and dotenv bootstrapper
│   ├── controllers/         # HTTP Controller handlers (thin wrapper)
│   ├── middleware/          # Rate limiting, logger and cors configurations
│   ├── models/              # Legacy DB model entries
│   ├── routes/              # Legacy route directory
│   ├── scripts/             # Database seeders (demo and performance traffic generators)
│   ├── services/            # Core business service logic
│   ├── src/
│   │   ├── app.js           # Express App setup (middleware registration)
│   │   ├── server.js        # HTTP server entry point
│   │   ├── db/              # Migrations, Models, and seed specifications
│   │   ├── http/            # Controllers, routers and API setup
│   │   ├── modules/         # Clean domain boundaries (auth, plans, topics, scheduler, etc.)
│   │   └── shared/          # Centralized error mapping, validation, and security policies
│   └── tests/               # Jest Integration & Unit test suite
├── frontend/
│   ├── src/
│   │   ├── components/      # UI components (Topic management, cards, inputs)
│   │   ├── api.js           # Centralized API fetch hook with refresh logic
│   │   ├── main.jsx         # App shell, sidebar, dashboard grid, and recovery view
│   │   └── styles.css       # Clean, modern custom stylesheet
└── docs/                    # Professional documentation package
```

---

## 🛠️ Setup Instructions & Environment Variables

### Prerequisites

- **Node.js:** v18+ is recommended.
- **PostgreSQL:** Active local instance or connection string.

### Environment Variables

Create a `.env` file in the `backend/` directory based on the following variables:

```ini
NODE_ENV=development
PORT=8000

# Database Settings
DB_HOST=localhost
DB_PORT=5432
DB_NAME=studyplanner
DB_USER=your_postgres_user
DB_PASSWORD=your_postgres_password
DB_POOL_MAX=10
DB_POOL_MIN=0
DB_POOL_IDLE_MS=10000
DB_POOL_ACQUIRE_MS=30000

# Performance Monitoring
SLOW_QUERY_MS=150
SLOW_REQUEST_MS=1000

# Security Rules
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
REQUEST_BODY_LIMIT=1mb
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=300
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX=20

# JWT Token Configurations
JWT_ACCESS_SECRET=your-strong-access-secret-key-at-least-32-chars
JWT_REFRESH_SECRET=your-strong-refresh-secret-key-at-least-32-chars
JWT_ACCESS_EXPIRES_IN=15m
REFRESH_TOKEN_DAYS=30
REFRESH_COOKIE_NAME=studyflow_refresh_token
```

---

## 🚀 Running Locally

### 1. Database Migrations and Seeding

Navigate to the `backend/` directory and run migrations and seed data:

```bash
cd backend
npm install
# Run migrations to create tables and database constraints
npm run db:migrate
# Run default seeds to create base public templates and roles
npm run db:seed
# Seed demo data for showcase simulation
npm run seed:demo
```

### 2. Start the Backend API Server

```bash
npm start
```
The backend will boot on `http://localhost:8000` with active API documentation reachable at:
- Swagger Docs: `http://localhost:8000/api/v1/docs`

### 3. Start the Frontend Client

Navigate to the `frontend/` directory, set up `.env` and launch Vite:

```bash
cd ../frontend
npm install
npm run dev
```
The client dashboard runs on `http://localhost:5173`.

---

## 🧪 Testing

### Backend Jest Suites

Run unit and HTTP integration tests:

```bash
cd backend
npm test
```

### Frontend Vitest Suites

Run component logic tests:

```bash
cd frontend
npm test
```

---

## 📸 Screenshots & Showcase Placeholders

*(Detailed visual walk-throughs can be verified locally on the frontend dashboard)*

1. **Dashboard Overview:** Comprehensive visual deck displaying schedule adherence, recovery debt, and next scheduled topics.
2. **Explainability Reason Deck:** Pop-up panel rendering the exact priority score breakdown and scheduler reasons.
3. **Recovery Panel:** Recovery recommendations and missed session debt graphs.

---

## 📝 Demo Walkthrough & Documentation Package

For in-depth explanations of system properties, please refer to the following documents in the `docs/` directory:

- [System Architecture Document](file:///Users/sdc/Projects/Smart-Study/docs/architecture.md) — Module layers, request pipelines, and scheduler design.
- [Database & Schema Documentation](file:///Users/sdc/Projects/Smart-Study/docs/database.md) — Transaction boundaries, table relationships, and SQL constraints.
- [Security & Policies](file:///Users/sdc/Projects/Smart-Study/docs/security.md) — Authentication flow, refresh tokens, and ownership policy controls.
- [Demo Narrative Script](file:///Users/sdc/Projects/Smart-Study/docs/demo-script.md) — Step-by-step scripts for recruiter demonstrations.
- [Technical Interview Prep Package](file:///Users/sdc/Projects/Smart-Study/docs/interview_prep.md) — Talking points, tradeoff logs, and system design answers.

---

## 🚀 Future Scalability Improvements

- **Background Job Materialization:** Offload missed session evaluations and recovery debt calculations to worker threads.
- **Read-Replica Isolation:** Split read-heavy dashboard metric requests from transaction-heavy scheduling updates.
- **Multi-session Logging:** Support multiple partial logging increments against a single scheduled card.
