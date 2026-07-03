"use strict";

const { createTestServer, closeDatabasePool } = require("../helpers/apiClient");

afterAll(async () => {
    await closeDatabasePool();
});

test("auth, plan creation, schedule generation, and study-log propagation work together", async () => {
    const server = createTestServer();
    const stamp = Date.now();

    try {
        const registered = await server.request("POST", "/auth/register", {
            body: {
                name: "Integration Student",
                email: `integration-${stamp}@studyflow.test`,
                password: "StrongPass123!",
                role: "student"
            }
        });

        expect(registered.status).toBe(201);
        const token = registered.body.data.accessToken;

        const plan = await server.request("POST", "/plans", {
            token,
            body: { title: "Integration Plan", visibility: "private" }
        });
        expect(plan.status).toBe(201);
        const planId = plan.body.data.plan.id;

        const topic = await server.request("POST", `/plans/${planId}/topics`, {
            token,
            body: {
                name: "Transactional propagation",
                difficulty: 4,
                estimatedHours: 2,
                deadline: "2026-05-30"
            }
        });
        expect(topic.status).toBe(201);

        const schedule = await server.request("POST", `/plans/${planId}/schedule-runs`, {
            token,
            body: {
                dailyCapacityHours: 2,
                forceRegenerate: true,
                today: "2026-05-25"
            }
        });
        expect(schedule.status).toBe(201);
        const item = schedule.body.data.scheduleRun.days.flatMap(day => day.items)[0];
        expect(item.reason.score.total).toBeGreaterThanOrEqual(0);

        const log = await server.request("POST", `/execution/schedule-items/${item.id}/logs`, {
            token,
            body: {
                hoursStudied: 1.5,
                difficultyFeedback: "hard",
                sessionEffectiveness: "medium",
                perceivedWorkload: "heavy"
            }
        });
        expect(log.status).toBe(201);
        expect(log.body.data.topicProgress.progress).toBe(0.75);

        const duplicate = await server.request("POST", `/execution/schedule-items/${item.id}/logs`, {
            token,
            body: { hoursStudied: 1 }
        });
        expect(duplicate.status).toBe(409);
        expect(duplicate.body.error.code).toBe("DUPLICATE_RESOURCE");

        const adherence = await server.request("GET", `/execution/adherence?planId=${planId}`, { token });
        expect(adherence.status).toBe(200);
        expect(adherence.body.data.adherence.hourAdherence).toBe(0.75);
    } finally {
        await server.close();
    }
});

test("ownership bypass against schedule item logging is rejected", async () => {
    const ownerServer = createTestServer();
    const stamp = Date.now();

    try {
        const owner = await ownerServer.request("POST", "/auth/register", {
            body: {
                name: "Owner Student",
                email: `owner-${stamp}@studyflow.test`,
                password: "StrongPass123!",
                role: "student"
            }
        });
        const attacker = await ownerServer.request("POST", "/auth/register", {
            body: {
                name: "Other Student",
                email: `attacker-${stamp}@studyflow.test`,
                password: "StrongPass123!",
                role: "student"
            }
        });
        const ownerToken = owner.body.data.accessToken;
        const attackerToken = attacker.body.data.accessToken;

        const plan = await ownerServer.request("POST", "/plans", {
            token: ownerToken,
            body: { title: "Ownership Plan", visibility: "private" }
        });
        const planId = plan.body.data.plan.id;

        await ownerServer.request("POST", `/plans/${planId}/topics`, {
            token: ownerToken,
            body: {
                name: "Ownership enforcement",
                difficulty: 3,
                estimatedHours: 2,
                deadline: "2026-05-30"
            }
        });

        const schedule = await ownerServer.request("POST", `/plans/${planId}/schedule-runs`, {
            token: ownerToken,
            body: { dailyCapacityHours: 2, forceRegenerate: true, today: "2026-05-25" }
        });
        const item = schedule.body.data.scheduleRun.days.flatMap(day => day.items)[0];

        const bypass = await ownerServer.request("POST", `/execution/schedule-items/${item.id}/logs`, {
            token: attackerToken,
            body: { hoursStudied: 1 }
        });

        expect(bypass.status).toBe(403);
        expect(bypass.body.error.code).toBe("OWNERSHIP_REQUIRED");
    } finally {
        await ownerServer.close();
    }
});
