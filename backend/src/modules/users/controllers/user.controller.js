"use strict";

const userService = require("../services/user.service");
const asyncHandler = require("../../../shared/utils/asyncHandler");
const { successResponse } = require("../../../shared/responses/apiResponse");

const getProfile = asyncHandler(async (req, res) => {
    const profile = await userService.getUserProfile(req.user.id);
    return successResponse(res, { profile });
});

const updateProfile = asyncHandler(async (req, res) => {
    const updated = await userService.updateProfile(req.user.id, req.validated.body);
    return successResponse(res, { profile: updated });
});

const changePassword = asyncHandler(async (req, res) => {
    const result = await userService.changePassword(req.user.id, req.validated.body);
    return successResponse(res, result);
});

module.exports = {
    getProfile,
    updateProfile,
    changePassword
};
