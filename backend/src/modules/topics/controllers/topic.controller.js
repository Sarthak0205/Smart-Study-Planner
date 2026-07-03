"use strict";

const asyncHandler = require("../../../shared/utils/asyncHandler");
const { successResponse, createdResponse } = require("../../../shared/responses/apiResponse");
const topicService = require("../services/topic.service");

const listTopics = asyncHandler(async (req, res) => {
    const topics = await topicService.listTopics(req.user, req.validated.params.id, req.validated.query || {});
    return successResponse(res, { topics });
});

const createTopic = asyncHandler(async (req, res) => {
    const topic = await topicService.createTopic(req.user, req.validated.params.id, req.validated.body);
    return createdResponse(res, { topic });
});

const updateTopic = asyncHandler(async (req, res) => {
    const topic = await topicService.updateTopic(
        req.user,
        req.validated.params.id,
        req.validated.params.topicId,
        req.validated.body
    );
    return successResponse(res, { topic });
});

const deleteTopic = asyncHandler(async (req, res) => {
    const result = await topicService.deleteTopic(req.user, req.validated.params.id, req.validated.params.topicId);
    return successResponse(res, result);
});

const reorderTopics = asyncHandler(async (req, res) => {
    const topics = await topicService.reorderTopics(req.user, req.validated.params.id, req.validated.body.topicOrder);
    return successResponse(res, { topics });
});

module.exports = {
    listTopics,
    createTopic,
    updateTopic,
    deleteTopic,
    reorderTopics
};
