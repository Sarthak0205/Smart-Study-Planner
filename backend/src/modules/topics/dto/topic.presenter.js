"use strict";

function presentTopic(topic) {
    if (!topic) return null;

    return {
        id: Number(topic.id),
        planId: Number(topic.planId),
        name: topic.name,
        difficulty: Number(topic.difficulty),
        estimatedHours: Number(topic.estimatedHours),
        deadline: topic.deadline,
        progress: Number(topic.progress),
        status: topic.status,
        position: topic.position,
        createdAt: topic.createdAt,
        updatedAt: topic.updatedAt
    };
}

function presentTopics(topics) {
    return topics.map(topic => presentTopic(topic));
}

module.exports = {
    presentTopic,
    presentTopics
};
