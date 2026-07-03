"use strict";

const asyncHandler = require("../../../shared/utils/asyncHandler");
const { createdResponse, successResponse } = require("../../../shared/responses/apiResponse");
const scheduleService = require("../services/schedule.service");

const generateSchedule = asyncHandler(async (req, res) => {
    const result = await scheduleService.generateSchedule(
        req.user,
        req.validated.params.id,
        req.validated.body || {}
    );

    return createdResponse(res, result);
});

const getActiveSchedule = asyncHandler(async (req, res) => {
    const scheduleRun = await scheduleService.getActiveSchedule(req.user, req.validated.query.planId);
    return successResponse(res, { scheduleRun });
});

const getHistory = asyncHandler(async (req, res) => {
    const result = await scheduleService.getScheduleHistory(req.user, req.validated.query);
    return successResponse(res, { scheduleRuns: result.scheduleRuns }, result.meta);
});

const getDetails = asyncHandler(async (req, res) => {
    const scheduleRun = await scheduleService.getScheduleDetails(req.user, req.validated.params.id);
    return successResponse(res, { scheduleRun });
});

const getToday = asyncHandler(async (req, res) => {
    const result = await scheduleService.getTodaySchedule(req.user, req.validated.query.planId);
    return successResponse(res, result);
});

module.exports = {
    generateSchedule,
    getActiveSchedule,
    getHistory,
    getDetails,
    getToday
};
