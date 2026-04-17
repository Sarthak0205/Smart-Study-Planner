require("dotenv").config();

const express = require("express");
const cors = require("cors");

// 🔥 DB INIT
require("./config/db");
const { sequelize } = require("./models");

const app = express();

// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json());

// ================= HEALTH CHECK =================
app.get("/", (req, res) => {
    res.send("API Running");
});

// ================= ROUTES =================

// 🔐 AUTH
const authRoutes = require("./routes/authRoutes");
app.use("/auth", authRoutes);

// 📚 CORE SYSTEM
app.use("/topics", require("./routes/topicRoutes"));
app.use("/schedule", require("./routes/scheduleRoutes"));
app.use("/log", require("./routes/logRoutes"));
app.use("/plans", require("./routes/planRoutes")); // ⚠️ keep clean prefix

// ================= DB ANALYSIS =================
app.get("/api/db-analysis", async (req, res) => {
    try {
        const { mode } = req.query;

        let query;

        if (mode === "join") {
            query = `
                EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
                SELECT *
                FROM "ScheduleItems" si
                JOIN "Schedules" s ON si."ScheduleId" = s.id
                WHERE s.date::date = CURRENT_DATE
                ORDER BY si.priority_score DESC;
            `;
        } else if (mode === "limit") {
            query = `
                EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
                SELECT *
                FROM "ScheduleItems" si
                JOIN "Schedules" s ON si."ScheduleId" = s.id
                WHERE s.date::date = CURRENT_DATE
                ORDER BY si.priority_score DESC
                LIMIT 20;
            `;
        } else {
            query = `
                EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
                SELECT *
                FROM "ScheduleItems"
                WHERE "ScheduleId" = 37
                ORDER BY priority_score DESC
                LIMIT 20;
            `;
        }

        const [result] = await sequelize.query(query);

        const rawPlan = result[0]["QUERY PLAN"][0];
        const planRoot = rawPlan.Plan;

        // 🔍 METRICS EXTRACTION
        function extractMetrics(node) {
            let totalRows = 0;
            let sharedHit = 0;
            let sharedRead = 0;
            let hasSort = false;
            let usesIndex = false;

            function traverse(n) {
                totalRows += n["Actual Rows"] || 0;
                sharedHit += n["Shared Hit Blocks"] || 0;
                sharedRead += n["Shared Read Blocks"] || 0;

                if (n["Node Type"] === "Sort") hasSort = true;

                if (
                    n["Node Type"] === "Index Scan" ||
                    n["Node Type"] === "Index Only Scan"
                ) {
                    usesIndex = true;
                }

                if (n.Plans) n.Plans.forEach(traverse);
            }

            traverse(node);

            return {
                totalRows,
                buffers: { hit: sharedHit, read: sharedRead },
                hasSort,
                usesIndex,
                indexOptimizedOrder: usesIndex && !hasSort
            };
        }

        const extracted = extractMetrics(planRoot);

        res.json({
            mode,
            executionTime: rawPlan["Execution Time"],
            metrics: {
                rowsProcessed: extracted.totalRows,
                bufferHits: extracted.buffers.hit,
                bufferReads: extracted.buffers.read,
            },
            flags: {
                hasSort: extracted.hasSort,
                usesIndex: extracted.usesIndex,
                indexOptimizedOrder: extracted.indexOptimizedOrder
            },
            plan: rawPlan
        });

    } catch (err) {
        console.error("DB ANALYSIS ERROR:", err);
        res.status(500).json({ error: "DB analysis failed" });
    }
});

// ================= GLOBAL ERROR HANDLER =================
app.use((err, req, res, next) => {
    console.error("GLOBAL ERROR:", err);
    res.status(500).json({ message: "Something went wrong" });
});

// ================= SERVER START =================
const PORT = process.env.PORT || 8000;

app.listen(PORT, async () => {
    try {
        await sequelize.authenticate();

        // 🔥 ADD THIS LINE
        await sequelize.sync({ force: true })

        console.log("✅ PostgreSQL Connected");
        console.log(`🚀 Server running on port ${PORT}`);
    } catch (err) {
        console.error("❌ DB connection failed:", err);
    }
});