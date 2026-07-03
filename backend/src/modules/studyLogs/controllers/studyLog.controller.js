"use strict";

const asyncHandler = require("../../../shared/utils/asyncHandler");
const { createdResponse, successResponse } = require("../../../shared/responses/apiResponse");
const studyLogService = require("../services/studyLog.service");

const submitStudyLog = asyncHandler(async (req, res) => {
    const result = await studyLogService.submitStudyLog(
        req.user,
        req.validated.params.id,
        req.validated.body
    );

    return createdResponse(res, result);
});

const getExecutionStatus = asyncHandler(async (req, res) => {
    const status = await studyLogService.getExecutionStatus(req.user, req.validated.query.planId);
    return successResponse(res, { status });
});

const getTopicProgress = asyncHandler(async (req, res) => {
    const progress = await studyLogService.getTopicProgress(req.user, req.validated.params.id);
    return successResponse(res, { progress });
});

const getAdherenceSummary = asyncHandler(async (req, res) => {
    const adherence = await studyLogService.getAdherenceSummary(req.user, req.validated.query.planId);
    return successResponse(res, { adherence });
});

const getMissedSessions = asyncHandler(async (req, res) => {
    const result = await studyLogService.getMissedSessions(req.user, req.validated.query.planId);
    return successResponse(res, result);
});

const getRecoveryState = asyncHandler(async (req, res) => {
    const recovery = await studyLogService.getRecoveryState(req.user, req.validated.query.planId);
    return successResponse(res, { recovery });
});

module.exports = {
    submitStudyLog,
    getExecutionStatus,
    getTopicProgress,
    getAdherenceSummary,
    getMissedSessions,
    getRecoveryState
};
