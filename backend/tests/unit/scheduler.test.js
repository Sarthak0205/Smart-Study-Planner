"use strict";

const { generateScheduleDraft } = require("../../src/modules/scheduler/engine/scheduler.engine");

test("scheduler is deterministic for identical inputs", () => {
    const input = {
        topics: [{
            id: 1,
            name: "PostgreSQL indexes",
            difficulty: 4,
            estimatedHours: 6,
            deadline: "2026-05-30",
            progress: 0.25,
            status: "in_progress",
            position: 0,
            feedbackScore: 0.35
        }, {
            id: 2,
            name: "JWT ownership",
            difficulty: 3,
            estimatedHours: 4,
            deadline: "2026-05-28",
            progress: 0,
            status: "pending",
            position: 1,
            feedbackScore: 0
        }],
        constraints: { dailyCapacityHours: 2 },
        today: new Date("2026-05-25T00:00:00.000Z")
    };

    const first = generateScheduleDraft(input);
    const second = generateScheduleDraft(input);

    expect(first.days).toEqual(second.days);
    expect(first.feasibility.status).toBe(second.feasibility.status);
    expect(first.days[0].items[0].reasonJson.score.total).toBeGreaterThanOrEqual(0);
});

test("scheduler explicitly reports impossible workloads", () => {
    const draft = generateScheduleDraft({
        topics: [{
            id: 1,
            name: "Impossible topic",
            difficulty: 5,
            estimatedHours: 80,
            deadline: "2026-05-26",
            progress: 0,
            status: "pending",
            position: 0
        }],
        constraints: { dailyCapacityHours: 1 },
        today: new Date("2026-05-25T00:00:00.000Z"),
        allowImpossible: true
    });

    expect(draft.feasibility.status).toBe("impossible");
    expect(draft.feasibility.deficitHours).toBeGreaterThan(0);
    expect(draft.feasibility.warnings.join(",")).toMatch(/insufficient_capacity/);
});
