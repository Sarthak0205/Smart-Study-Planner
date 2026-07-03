"use strict";

const asyncHandler = require("../../../shared/utils/asyncHandler");
const { successResponse, createdResponse } = require("../../../shared/responses/apiResponse");
const planService = require("../services/plan.service");

const createPlan = asyncHandler(async (req, res) => {
    const plan = await planService.createPlan(req.user, req.validated.body);
    return createdResponse(res, { plan });
});

const listOwnedPlans = asyncHandler(async (req, res) => {
    const result = await planService.listOwnedPlans(req.user, req.validated.query);
    return successResponse(res, { plans: result.plans }, result.meta);
});

const listPublicPlans = asyncHandler(async (req, res) => {
    const result = await planService.listPublicPlans(req.user, req.validated.query);
    return successResponse(res, { plans: result.plans }, result.meta);
});

const getPlan = asyncHandler(async (req, res) => {
    const result = await planService.getPlan(req.user, req.validated.params.id);
    return successResponse(res, result);
});

const updatePlan = asyncHandler(async (req, res) => {
    const plan = await planService.updatePlan(req.user, req.validated.params.id, req.validated.body);
    return successResponse(res, { plan });
});

const publishPlan = asyncHandler(async (req, res) => {
    const plan = await planService.publishPlan(req.user, req.validated.params.id);
    return successResponse(res, { plan });
});

const archivePlan = asyncHandler(async (req, res) => {
    const plan = await planService.archivePlan(req.user, req.validated.params.id);
    return successResponse(res, { plan });
});

const deletePlan = asyncHandler(async (req, res) => {
    const result = await planService.deletePlan(req.user, req.validated.params.id);
    return successResponse(res, result);
});

const followPlan = asyncHandler(async (req, res) => {
    const result = await planService.followPlan(req.user, req.validated.params.id);
    return createdResponse(res, result);
});

module.exports = {
    createPlan,
    listOwnedPlans,
    listPublicPlans,
    getPlan,
    updatePlan,
    publishPlan,
    archivePlan,
    deletePlan,
    followPlan
};
