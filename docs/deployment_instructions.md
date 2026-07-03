# StudyFlow Deployment Instructions

This document provides step-by-step instructions for deploying StudyFlow to the target architecture:
*   **Database:** Neon PostgreSQL
*   **Backend:** Render Web Service
*   **Frontend:** Vercel

---

## 🛠️ Step 1: Database Setup on Neon

1.  **Create a Neon Account:** Go to [Neon.tech](https://neon.tech/) and sign up.
2.  **Create a New Project:** 
    *   Name the project (e.g., `studyflow`).
    *   Select your preferred region (e.g., US East / AWS).
    *   Set the database version to **PostgreSQL 15 or 16**.
3.  **Get the Connection String:**
    *   After creation, go to the project dashboard and copy the **Connection String**.
    *   Ensure the connection string format is selected (e.g., `Node.js` or `Prisma` style, which returns a string starting with `postgresql://` or `postgres://`).
    *   Ensure `sslmode=require` is appended to the connection string parameters.
4.  **Save Connection String:** You will need this string for configuring both your local migration environment and the Render backend service.

---

## 🚀 Step 2: Backend Deployment on Render

1.  **Create a Render Account:** Go to [Render.com](https://render.com/) and sign up.
2.  **Create a New Web Service:**
    *   Click **New +** and select **Web Service**.
    *   Connect your Git repository (GitHub/GitLab) where StudyFlow is pushed.
3.  **Configure Service Details:**
    *   **Name:** `studyflow-backend` (or a name of your choice).
    *   **Environment:** `Node`.
    *   **Region:** Select the region closest to your Neon database region to minimize latency.
    *   **Branch:** `main` (or your production branch).
    *   **Root Directory:** `backend` (Critical: Since this is a monorepo, set the root directory to `backend`).
    *   **Build Command:** `npm install` (Note: See the migration instructions for running migrations via the Release Command).
    *   **Start Command:** `npm start` (Runs `node server.js`).
4.  **Configure Environment Variables:**
    *   Navigate to the **Environment** tab in your Web Service dashboard.
    *   Add the following variables (refer to `docs/production_env_doc.md` for details):
        *   `NODE_ENV=production`
        *   `DATABASE_URL` = *[Your Neon Connection String]*
        *   `JWT_ACCESS_SECRET` = *[Long, random hex secret]*
        *   `JWT_REFRESH_SECRET` = *[Long, random hex secret]*
        *   `CORS_ORIGIN` = *[Your Vercel deployment URL (e.g., https://studyflow.vercel.app)]*
        *   `PORT=10000` (Render binds automatically, but setting a default port is good practice).
5.  **Configure Health Check:**
    *   Under **Advanced Settings**, set the **Health Check Path** to `/health` (liveness check) or `/ready` (readiness check that tests DB connectivity). Using `/health` is recommended for standard deployment stability.
6.  **Deploy:** Click **Create Web Service**. Wait for the build and deployment process to finish.

---

## 🎨 Step 3: Frontend Deployment on Vercel

1.  **Create a Vercel Account:** Go to [Vercel.com](https://vercel.com/) and sign up.
2.  **Import Your Project:**
    *   Click **Add New...** and select **Project**.
    *   Connect your Git repository.
3.  **Configure Project Settings:**
    *   **Framework Preset:** Select **Vite** (Vercel usually auto-detects this).
    *   **Root Directory:** Select `frontend` (Critical: Since this is a monorepo, set this to `frontend`).
    *   **Build & Development Settings:**
        *   Build Command: `npm run build`
        *   Output Directory: `dist`
        *   Install Command: `npm install`
4.  **Configure Environment Variables:**
    *   Under **Environment Variables**, add:
        *   `VITE_API_BASE_URL` = *[Your Render backend base API URL (e.g., https://studyflow-backend.onrender.com/api/v1)]*
    *   *Warning:* You **MUST** configure this variable in Vercel before the deployment builds, because Vite compiles environment variables statically into the production bundle during the build phase.
5.  **Deploy:** Click **Deploy**. Vercel will build the frontend assets and distribute them globally.

---

## 🔍 Step 4: Verification

1.  **Backend Health Check:** Open `https://your-backend.onrender.com/health` in a browser. It should return a success JSON response (`"status": "ok"`).
2.  **Backend Readiness Check:** Open `https://your-backend.onrender.com/ready` in a browser. It should verify database connectivity (`"status": "ready"`).
3.  **Frontend Interface:** Open `https://your-frontend.vercel.app`. The client-side dashboard should load.
4.  **Full Flow Test:**
    *   Create a new account (Register).
    *   Log in.
    *   Verify the session persists across browser page refreshes (requires Cookie configuration validation, see the Blocker section of the Audit Report).
