
function calculatePriority(topic) {
    const today = new Date();
    const deadline = new Date(topic.deadline);

    let daysLeft = Math.ceil(
        (deadline - today) / (1000 * 60 * 60 * 24)
    );

    if (daysLeft <= 0) daysLeft = 1;

    const urgency = 1 / daysLeft;

    const difficultyWeight = (topic.difficulty || 1) / 5;

    const workload =
        topic.remaining_hours / (topic.estimated_hours || 1);

    const progressPenalty = 1 - (topic.progress || 0);

    const feedbackBoost = topic.feedbackScore || 0;

    return (
        (0.35 * urgency) +
        (0.2 * difficultyWeight) +
        (0.2 * workload) +
        (0.15 * progressPenalty) +
        (0.1 * feedbackBoost)
    );
}


function generateSchedule(topics, dailyHours = 4) {

    // 🔥 ADD PRIORITY
    let enriched = topics.map(t => ({
        ...t,
        priority: calculatePriority(t)
    }));

    // 🔥 SORT BY PRIORITY
    enriched.sort((a, b) => b.priority - a.priority);

    const generated = [];

    let dayIndex = 0;

    while (enriched.some(t => t.remaining_hours > 0)) {

        let remainingTime = dailyHours;
        const sessions = [];

        for (let topic of enriched) {
            if (topic.remaining_hours <= 0) continue;
            if (remainingTime <= 0) break;

            const allocated = Math.min(
                topic.remaining_hours,
                remainingTime
            );

            if (allocated <= 0) continue;

            topic.remaining_hours -= allocated;
            remainingTime -= allocated;

            sessions.push({
                topic: topic.name,
                hours: allocated,
                priority: topic.priority,
                reason: {
                    difficulty: topic.difficulty,
                    urgency: "computed",
                    progress: topic.progress,
                    feedback: topic.feedbackScore
                },
                sourceId: topic.id
            });
        }

        if (sessions.length === 0) break;

        const date = new Date();
        date.setDate(date.getDate() + dayIndex);

        generated.push({
            date,
            total_hours: dailyHours - remainingTime,
            sessions
        });

        dayIndex++;
    }

    return generated;
}

module.exports = {
    generateSchedule
};