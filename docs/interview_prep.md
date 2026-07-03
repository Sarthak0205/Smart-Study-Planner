# Technical Interview Preparation Package

This document prepares you for technical interviews and portfolio presentations. It covers core architectural arguments, system design questions, and in-depth discussions of engineering tradeoffs.

---

## 💡 Architecture Talking Points

Use these lines during interviews to explain the core architectural decisions of StudyFlow:

- **Immutable Templates & Cloned Plans:** *"Instead of sharing mutable plans between teachers and students, we isolate them. Public plans are immutable curriculum blueprints. When a student follows a plan, we clone it entirely to create a private workspace. This provides complete tenant isolation and allows personal schedules to adapt independently without impacting other users."*
- **Follow-and-Clone Transaction:** *"Cloning is a multi-step relational write (creating plans, copying topics, establishing follows). We wrap this in a PostgreSQL database transaction with a SHARE lock on the source templates to guarantee that no user can see a partially cloned plan, and that updates to the source plan are locked during the cloning operation."*
- **Deterministic Stateless Scheduler:** *"The scheduling engine is pure and mathematical. It relies on deterministic priority sorting—sorting by calculated urgency, remaining workload, and difficulty weights. Tie-breakers are resolved using stable database fields. This makes the scheduler repeatable, debuggable, and testable."*
- **Explainability via `reason_json`:** *"Rather than treating schedule generation as a black-box AI recommendation, we persist the parameters of every scheduling decision in a `reason_json` JSONB database field. This lets the UI inspect and render the exact scoring inputs (e.g., urgency ratio, workload weight) for any given session."*
- **Propagation Engine & ACID Isolation:** *"Study logs represent behavioral truth. Submitting a study log recalculates parent topic progress and item completion. We run these writes inside transaction blocks with `SELECT ... FOR UPDATE` row-level locks on the parent records to protect against race conditions from concurrent logs or regenerate actions."*
- **Analytics Derivation:** *"We avoid caching pre-calculated adherence metrics in user tables where they could fall out of sync. Instead, metrics are derived on-demand using SQL aggregations. If the database scales, we can move this to database materialized views, keeping application logic stateless."*

---

## ❓ System Design Questions & Answers

### Q: Why clone plans instead of referencing the original template?
- **Answer:** Sharing references to template plans leads to severe scaling and security problems. If a teacher edits a public template topic, it would instantly mutate the schedules of thousands of students, causing concurrency locks and data anomalies. Cloning decouples the student's plan entirely. The student can customize topic names, reorder them, adjust dates, or miss sessions, and the scheduler will adapt to their specific progress without needing complex override tracking.

### Q: Why build a deterministic scheduler rather than using a heuristic algorithm or AI?
- **Answer:** In study planning, explainability is a hard product requirement. Heuristic optimization models (like simulated annealing or genetic algorithms) can return different schedules on each invocation unless seeded identical paths are maintained. Machine learning models can hallucinate schedule allocations. A deterministic algorithm ensures that if a schedule is generated twice with the same inputs, it yields the exact same outputs. This guarantees that developers can easily write unit tests for scheduling edge cases, and users can understand why a topic was scheduled.

### Q: Why store decision reasons in `reason_json` inside the database?
- **Answer:** Persistence is necessary because the scheduler's inputs (such as student logging history, progress, and current deadlines) are constantly changing. If we calculated the "why scheduled" reasoning on the fly, past schedule runs would lose their context as soon as the student logs study progress. Storing the parameters in a `reason_json` column at the moment of schedule generation preserves an immutable audit log of the system's decisions. Using a JSONB data type allows us to inspect, query, and render these decision parameters directly from PostgreSQL.

### Q: Why make schedule runs immutable?
- **Answer:** A schedule run represents the state of a plan at a specific point in time. When a student regenerates their schedule, the old schedule run is marked as `superseded` rather than deleted or updated in place. This preserves historical integrity. It lets us run analytics on *planning history* (e.g., comparing what was scheduled last week versus what was actually completed) to calculate student planning adherence trends.

### Q: How does ownership enforcement work securely?
- **Answer:** We enforce security at the database relationship layer rather than relying on role permissions (RBAC) alone. While RBAC verifies that a user is a `student`, it does not check whose data they are accessing. The policy layer traverses foreign keys before executing database writes (e.g., checking that `item -> day -> run -> user_id` matches the token's user ID). This prevents ID-sniffing and data leaks.

### Q: How is concurrency handled during logging?
- **Answer:** When a student logs hours, concurrent API calls could run progress updates simultaneously, causing dirty reads of the accumulated hours. We prevent this by executing the log submission inside an ACID transaction with an explicit `SELECT ... FOR UPDATE` lock on the related `schedule_item` and parent `topic` rows. This forces concurrent requests for the same plan to execute sequentially.

---

## ⚖️ Tradeoff Discussion

During the design phase, the following tradeoffs were accepted to prioritize data integrity and launch velocity:

### 1. Query-Time Recovery Evaluation vs. Materialized Tables
- **Tradeoff:** Recovery debt and missed sessions are calculated dynamically via database joins and SQL query filters, rather than being materialized in a database table by a cron worker.
- **Why it was made:** This avoids the complexity of keeping a cache table updated and eliminates background worker overhead. For current student volumes, PostgreSQL index scans on `schedule_items(date, status)` execute in sub-millisecond times.
- **Future Scaling:** If the schedule table grows to millions of rows, we can transition this to a lightweight Redis cache or pre-calculate recovery debt in a background worker.

### 2. Single Log Constraint per Schedule Item
- **Tradeoff:** A unique constraint on `study_logs(schedule_item_id)` restricts students to logging exactly one study session per scheduled block.
- **Why it was made:** This simple constraint eliminates double-submission bugs and race conditions where a user might log the same session multiple times.
- **Future Scaling:** To support multiple partial logs (e.g., logging 30 mins, then 1 hour later against the same slot), we can remove the unique constraint and transition to an aggregate SQL view summing logs for the scheduled item.

### 3. Deep Copy Overheads on Plan Follow
- **Tradeoff:** Following a plan performs a deep copy of the plan record and all its associated topics. For large plans (e.g., 100+ topics), this causes a surge in write queries.
- **Why it was made:** Deep copying is the only way to achieve complete data isolation. The query cost is mitigated by using bulk insert queries (`bulkCreate`) within a single transaction block, keeping follow-and-clone operations under 100ms for standard plans.
