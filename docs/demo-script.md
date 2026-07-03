# StudyFlow Platform Demonstration Guide

This guide details the step-by-step narrative scripts and talking points for conducting professional product demonstrations and technical interviews for the StudyFlow platform.

---

## 🚀 Setup & Warm Up

1. **Start Database:** Ensure PostgreSQL is running.
2. **Apply Migrations and Seeds:**
   ```bash
   cd backend
   npm run db:migrate:undo:all # optional: clear previous runs
   npm run db:migrate
   npm run db:seed
   npm run seed:demo
   ```
3. **Launch Apps:**
   - Backend: `npm start` (runs on `http://localhost:8000`)
   - Frontend: `npm run dev` (runs on `http://localhost:5173`)
4. **Browser Ready:** Open `http://localhost:5173` on the Login page.

---

## 🏃 Demo Flow 1 — First-Time User Journey

**Goal:** Show a clean registration path, plan design, topic planning, and initial schedule generation with explainability feedback.

### Step-by-Step Script:
1. Click **Register** on the segmented bar.
2. Fill in credentials (e.g., Name: `Alice`, Email: `alice@student.com`, Password: `Password123!`, Role: `Student`).
3. Click **Create Account**. Observe that you are logged in and view the empty Dashboard.
4. On the left menu, select **Plans**. Notice the empty plans state.
5. Create a study plan: Title: `Database Systems`, select `Private plan`, click **Create plan**.
6. Note the success alert and that the plan is immediately set as the active plan.
7. Under **Topic Management**, add two study topics:
   - **Topic 1:** Name: `Index Optimizations`, Difficulty: `4`, Estimated Hours: `6`, Deadline: `2026-06-15`. Click **Add Topic**.
   - **Topic 2:** Name: `SQL Concurrency`, Difficulty: `5`, Estimated Hours: `8`, Deadline: `2026-06-20`. Click **Add Topic**.
8. Navigate to **Schedule** view on the sidebar. Note the empty schedule state: *"No active schedule. Generate a schedule to allocate your workload across available study days."*
9. Click **Regenerate** in the top-right. Note the subtle loading state and then the successfully rendered daily schedule!

### Key Talking Points:
- **Clean Inputs:** *"As a student, I define simple parameters: what topics I need to learn, their estimated effort, and their deadlines. The system manages the scheduling mechanics without duplicate application states."*
- **Role Isolation:** *"Private plans belong strictly to this student's secure context. No other student can fetch these plan ids or topics."*

---

## 🏃 Demo Flow 2 — Adaptive Scheduling & Progress Propagation

**Goal:** Complete study sessions, log actual study hours, and observe how analytics propagate in real time.

### Step-by-Step Script:
1. Navigate to **Dashboard** on the sidebar.
2. Under the **Schedule** section, select the first scheduled item (e.g., `Index Optimizations`).
3. Note that the **Why Scheduled?** panel on the right populates with the topic details and decision parameters.
4. Locate the **Log Execution** panel on the right. Note that the default hours are pre-filled with the planned allocation (e.g., `2h`).
5. Click **Log Session**.
6. Observe the success feedback: *"Logged 2.0h. Topic progress is 33%."*
7. Inspect the top metrics bar:
   - **Adherence** updates immediately (e.g., `100%`).
   - **Execution** updates from `0/N` to `1/N` completed sessions.
   - **Workload Distribution** chart displays the updated completed session bar on the calendar date.

### Key Talking Points:
- **Real-Time Propagation:** *"Submitting a study log is not a generic CRUD write. It runs inside an ACID database transaction that updates the schedule item status, accumulates study hours, recalculates the parent topic's total progress percentage, and updates execution metrics."*
- **Execution Truth:** *"Schedules are planned intent; study logs are behavioral truth. By recording actual hours, we feed data back into the analytics lineage."*

---

## 🏃 Demo Flow 3 — Recovery Handling & Debt Management

**Goal:** Simulate missed sessions, analyze recovery pressure, and regenerate the plan to show automatic slot recovery.

### Step-by-Step Script:
1. Select another scheduled item from the calendar.
2. In the database (or through simulation), if a session's date passes without a log, it becomes `missed`.
3. Select the **Recovery** navigation item on the sidebar.
4. Inspect the **Recovery Workspace**:
   - Note the **Recovery Debt** card showing the total accrued missed hours.
   - Note the **Overdue Topics** listing the items that fell behind.
   - Note **Regeneration Recommendation** changes to `"Needed"`.
5. Go back to the **Schedule** tab and click **Regenerate**.
6. Notice that the new active schedule run has recalculated. The scheduler has allocated extra slots or increased slot sizes for the delayed topics to ensure deadlines are still met, and the **Recovery Debt** resolves!

### Key Talking Points:
- **Recovery Pressure:** *"Unlike static planners, StudyFlow detects missed deadlines and logs. It calculates a 'Recovery Pressure' value based on delayed hours vs remaining available capacity. If it exceeds threshold limits, the platform triggers a regeneration prompt."*
- **Algorithmic Adaptation:** *"Regeneration doesn't just shuffle items. It determines if the plan is still feasible. If a student misses too many sessions, the engine alerts them immediately by identifying the schedule as 'impossible', prompting them to adjust capacity or extend deadlines."*

---

## 🏃 Demo Flow 4 — Explainability Showcase

**Goal:** Highlight the core differentiator of StudyFlow: transparent, auditable scheduling decisions.

### Step-by-Step Script:
1. Click on any schedule card in the planner.
2. Direct the viewer's attention to the **Why Scheduled?** panel on the right sidebar.
3. Review the factors listed:
   - **Urgency Meter:** Indicates the proximity of the topic's deadline.
   - **Workload Pressure Meter:** Shows the ratio of remaining study hours vs available days.
   - **Difficulty Rating:** Displays the weight offset applied based on the 1-5 difficulty.
   - **Tie-Breakers:** Explain that the scheduler breaks scores deterministically by sorting stable IDs if priority calculations tie.
4. Show a **Revision Session** card. Explain that the decision reason changes to: *"Light revision added because the completed topic is difficult and near its deadline."*

### Key Talking Points:
- **Stateless Determinism:** *"The scheduling logic is pure and mathematical. Given the same inputs (topics, progress, and capacity), the algorithm will always produce the exact same schedule run, making it 100% testable and auditable."*
- **No Black Box AI:** *"Rather than using fuzzy machine learning models that hallucinate schedules, StudyFlow uses a transparent priority heuristic, rendering audit parameters directly from the backend `reason_json` payload."*
