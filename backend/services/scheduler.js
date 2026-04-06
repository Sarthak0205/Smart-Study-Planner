function generateSchedule(topics, dailyHours) {
    const baseDate = new Date();
    const alpha = 1.5;

    topics = topics.filter(t => (t.status || 'pending') !== 'completed');
    if (topics.length === 0) return [];

    topics.forEach(t => {
        const progress = t.progress || 0;
        t.remaining_hours = Math.max(0, t.estimated_hours * (1 - progress));
        t.prev_priority = t.prev_priority || 0;
    });

    let schedule = [];
    let dayCount = 1;
    let maxDays = 30;

    while (topics.some(t => t.remaining_hours > 0) && maxDays-- > 0) {
        let remaining = dailyHours;
        let dayPlan = [];

        const currentDay = new Date(baseDate);
        currentDay.setDate(baseDate.getDate() + dayCount - 1);

        // STEP 1 — Priority Calculation
        let maxPriority = 0;

        for (let t of topics) {
            const remainingDays = Math.max(
                1,
                (new Date(t.deadline) - currentDay) / (1000 * 60 * 60 * 24)
            );

            const urgency = 1 / Math.pow(remainingDays, alpha);

            let p = t.difficulty * Math.sqrt(t.remaining_hours) * urgency;
            p *= (1 + (1 - (t.progress || 0)));

            if (remainingDays <= 0 && t.remaining_hours > 0) {
                p *= (1 + (t.remaining_hours / t.estimated_hours));
            }

            t.priority = p;
            if (p > maxPriority) maxPriority = p;
        }

        // STEP 2 — Normalize + Smooth + Clamp + Tie-break
        for (let t of topics) {
            let p = t.priority / (maxPriority || 1);

            p = 0.7 * p + 0.3 * t.prev_priority;

            const delta = p - t.prev_priority;
            const MAX_DELTA = 0.3;
            p = t.prev_priority + Math.max(-MAX_DELTA, Math.min(MAX_DELTA, delta));

            p += (t.id % 10) * 0.001;

            t.prev_priority = p;
            t.priority = p;
        }

        // STEP 3 — Sort
        topics.sort((a, b) => b.priority - a.priority);

        const MAX_TOPICS_PER_DAY = 3;
        let topicsUsed = 0;

        // STEP 4 — Primary Allocation
        for (let t of topics) {
            if (t.remaining_hours <= 0) continue;
            if (topicsUsed >= MAX_TOPICS_PER_DAY) break;

            let hours = Math.min(2, t.remaining_hours, remaining);
            if (hours <= 0) continue;

            dayPlan.push({
                topic: t.name,
                hours,
                priority: Number(t.priority.toFixed(3)),
            });

            t.remaining_hours -= hours;
            remaining -= hours;
            topicsUsed++;

            if (remaining <= 0) break;
        }

        // STEP 5 — Fill Remaining (efficient)
        let i = 0;
        while (remaining > 0 && i < topics.length) {
            let t = topics[i];

            if (t.remaining_hours > 0) {
                let existing = dayPlan.find(d => d.topic === t.name);
                let extra = Math.min(1, t.remaining_hours, remaining);

                if (existing) {
                    let canAdd = Math.min(extra, 2 - existing.hours);
                    if (canAdd > 0) {
                        existing.hours += canAdd;
                        t.remaining_hours -= canAdd;
                        remaining -= canAdd;
                    }
                } else {
                    dayPlan.push({
                        topic: t.name,
                        hours: extra,
                        priority: Number(t.priority.toFixed(3)),
                    });

                    t.remaining_hours -= extra;
                    remaining -= extra;
                }
            }

            i++;
        }

        // STEP 6 — Controlled Revision
        if (dayCount > 1 && schedule.length > 0) {
            let prevTopics = schedule[dayCount - 2].plan;
            let revisionCount = 0;

            for (let p of prevTopics) {
                if (remaining < 0.5) break;
                if (revisionCount >= 2) break;

                if (!p.topic.startsWith("Revision")) {
                    dayPlan.push({
                        topic: `Revision: ${p.topic}`,
                        hours: 0.5,
                        priority: 0,
                    });

                    remaining -= 0.5;
                    revisionCount++;
                }
            }
        }

        // 🔥 STEP 7 — FINAL MICRO FIX: Reinforcement (NO UNUSED TIME)
        if (remaining > 0 && dayPlan.length > 0) {
            // 🔥 Extract ONLY original topics (no Revision / Reinforce)
            const baseTopics = dayPlan
                .filter(p => !p.topic.startsWith("Revision") && !p.topic.startsWith("Reinforce"))
                .map(p => p.topic);

            let reinforcementCount = 0;
            const MAX_REINFORCEMENT = 3;

            let i = 0;

            while (remaining > 0 && i < baseTopics.length && reinforcementCount < MAX_REINFORCEMENT) {
                let topicName = baseTopics[i];

                let reinforceHours = Math.min(0.5, remaining);

                dayPlan.push({
                    topic: `Reinforce: ${topicName}`, // ✅ always clean
                    hours: reinforceHours,
                    priority: 0,
                });

                remaining -= reinforceHours;
                reinforcementCount++;
                i++;
            }
        }

        if (dayPlan.length === 0) break;

        schedule.push({
            day: dayCount,
            plan: dayPlan,
        });

        dayCount++;
    }

    return schedule;
}

module.exports = { generateSchedule };