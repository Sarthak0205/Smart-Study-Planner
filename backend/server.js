const express = require("express");
const cors = require("cors");

// ✅ Load DB + models
require("./config/db");
const { sequelize } = require("./models"); // 🔥 FIX: IMPORT SEQUELIZE INSTANCE

const app = express();

app.use(cors());
app.use(express.json());

// ✅ Health check
app.get("/", (req, res) => {
    res.send("API Running");
});
const authRoutes = require("./routes/authRoutes");
const planRoutes = require("./routes/planRoutes");

// ✅ Routes
app.use("/topics", require("./routes/topicRoutes"));
app.use("/schedule", require("./routes/scheduleRoutes"));
app.use("/log", require("./routes/logRoutes"));
app.use("/auth", authRoutes);
app.use("/plans", planRoutes);

// ================= DB ANALYSIS ROUTE =================
app.get("/api/db-analysis", async (req, res) => {
    try {
        const { mode } = req.query;
        let query;

        // ================= QUERIES =================
        if (mode === "join") {
            query = `
                EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
                SELECT *
                FROM "ScheduleItems" si
                JOIN "Schedules" s ON si."ScheduleId" = s.id
                WHERE s.date::date = CURRENT_DATE
                ORDER BY si.priority_score DESC;
            `;
        }

        else if (mode === "limit") {
            query = `
                EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
                SELECT *
                FROM "ScheduleItems" si
                JOIN "Schedules" s ON si."ScheduleId" = s.id
                WHERE s.date::date = CURRENT_DATE
                ORDER BY si.priority_score DESC
                LIMIT 20;
            `;
        }

        else {
            query = `
                EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
                SELECT *
                FROM "ScheduleItems"
                WHERE "ScheduleId" = 37
                ORDER BY priority_score DESC
                LIMIT 20;
            `;
        }

        // ================= EXECUTION =================
        const [result] = await sequelize.query(query);

        // ================= PLAN PARSING =================
        const rawPlan = result[0]["QUERY PLAN"][0];
        const planRoot = rawPlan.Plan;

        // ================= METRIC EXTRACTION =================
        function extractMetrics(planNode) {
            let totalRows = 0;
            let sharedHit = 0;
            let sharedRead = 0;
            let hasSort = false;
            let usesIndex = false;
            let usesIndexForSort = false;

            function traverse(node) {
                // Rows processed
                totalRows += node["Actual Rows"] || 0;

                // Buffers
                sharedHit += node["Shared Hit Blocks"] || 0;
                sharedRead += node["Shared Read Blocks"] || 0;

                // Detect sort
                if (node["Node Type"] === "Sort") {
                    hasSort = true;
                }

                // Detect index usage (only real index scans)
                if (
                    node["Node Type"] === "Index Scan" ||
                    node["Node Type"] === "Index Only Scan"
                ) {
                    usesIndex = true;
                }

                // Traverse children
                if (node.Plans) {
                    node.Plans.forEach(traverse);
                }
            }

            traverse(planNode);

            // 🔥 KEY LOGIC: index helps ordering ONLY if no sort exists
            usesIndexForSort = usesIndex && !hasSort;

            return {
                totalRows,
                buffers: {
                    hit: sharedHit,
                    read: sharedRead,
                },
                hasSort,
                usesIndex,
                indexOptimizedOrder: usesIndexForSort
            };
        }
        const extracted = extractMetrics(planRoot);

        // ================= EXECUTION TIME =================
        const executionTime = rawPlan["Execution Time"];

        // ================= RESPONSE =================
        res.json({
            mode,

            executionTime,

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

            plan: rawPlan, // full JSON for frontend viewer
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "DB analysis failed" });
    }
});

// ✅ Start server
app.listen(8000, () => {
    console.log("Server running on port 8000");
});