const API = process.env.API_URL || "http://localhost:8000/api/v1";
const PASSWORD = "password123";

async function apiFetch(path, options = {}) {
    const res = await fetch(`${API}${path}`, options);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        throw new Error(data.error?.message || data.message || `Request failed: ${path}`);
    }

    return data;
}

async function login(email) {
    const data = await apiFetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: PASSWORD })
    });

    return data.data.accessToken;
}

async function authedFetch(token, path, options = {}) {
    return apiFetch(path, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...(options.headers || {})
        }
    });
}

async function simulateStudent(email) {
    try {
        const token = await login(email);
        const plansResponse = await authedFetch(token, "/plans?limit=10");
        const plans = plansResponse.data?.plans || [];

        await authedFetch(token, "/plans/public?limit=10");

        if (!plans.length) return;

        const planId = plans[0].id;

        const topicsResponse = await authedFetch(token, `/plans/${planId}/topics`);
        const topics = topicsResponse.data?.topics || [];

        await authedFetch(token, `/plans/${planId}/schedule-runs`, {
            method: "POST",
            body: JSON.stringify({ dailyCapacityHours: 4, forceRegenerate: true })
        }).catch(() => null);

        const scheduleResponse = await authedFetch(token, `/schedule-runs/active?planId=${planId}`);
        const scheduleRun = scheduleResponse.data?.scheduleRun;

        const todayResponse = await authedFetch(token, `/schedule-runs/today?planId=${planId}`).catch(() => null);
        const todayDay = todayResponse?.data?.scheduleDay;

        if (todayDay && Array.isArray(todayDay.items) && todayDay.items.length > 0) {
            const item = todayDay.items[0];
            await authedFetch(token, `/execution/schedule-items/${item.id}/logs`, {
                method: "POST",
                body: JSON.stringify({
                    hoursStudied: item.allocatedHours,
                    difficultyFeedback: "medium"
                })
            }).catch(() => null);
        }
    } catch (err) {
        console.error(`Error simulating student ${email}:`, err.message);
    }
}

async function simulateTeacher(email) {
    try {
        const token = await login(email);
        const plansResponse = await authedFetch(token, "/plans?limit=10");
        const plans = plansResponse.data?.plans || [];

        await authedFetch(token, "/plans/public?limit=10");

        if (!plans.length) return;

        const planId = plans[0].id;
        await authedFetch(token, `/plans/${planId}/publish`, {
            method: "POST"
        }).catch(() => null);

        await authedFetch(token, `/plans/${planId}/schedule-runs`, {
            method: "POST",
            body: JSON.stringify({ dailyCapacityHours: 5, forceRegenerate: true })
        }).catch(() => null);
    } catch (err) {
        console.error(`Error simulating teacher ${email}:`, err.message);
    }
}

async function simulateAdmin(email) {
    try {
        const token = await login(email);
        await authedFetch(token, "/auth/me");
        await authedFetch(token, "/plans/public?limit=10");
    } catch (err) {
        console.error(`Error simulating admin ${email}:`, err.message);
    }
}

async function run() {
    try {
        const students = Array.from({ length: 6 }, (_, index) => `student${index + 1}@test.com`);
        const teachers = ["teacher1@test.com", "teacher2@test.com"];

        for (const teacher of teachers) {
            await simulateTeacher(teacher);
        }

        await Promise.all(students.map(simulateStudent));
        await simulateAdmin("admin@test.com");

        console.log("✅ Traffic simulation completed");
    } catch (err) {
        console.error("❌ Traffic simulation failed:", err);
        process.exitCode = 1;
    }
}

run();
