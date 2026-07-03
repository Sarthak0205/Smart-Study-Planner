"use strict";

const authService = require("../services/auth.service");
const asyncHandler = require("../../../shared/utils/asyncHandler");
const { successResponse, createdResponse } = require("../../../shared/responses/apiResponse");
const {
    setRefreshCookie,
    clearRefreshCookie,
    getRefreshTokenFromRequest
} = require("../utils/cookie.util");

const register = asyncHandler(async (req, res) => {
    const result = await authService.register(req.validated.body);
    setRefreshCookie(res, result.refreshToken);

    return createdResponse(res, {
        user: result.user,
        accessToken: result.accessToken
    });
});

const login = asyncHandler(async (req, res) => {
    const result = await authService.login(req.validated.body);
    setRefreshCookie(res, result.refreshToken);

    return successResponse(res, {
        user: result.user,
        accessToken: result.accessToken
    });
});

const refresh = asyncHandler(async (req, res) => {
    const result = await authService.refresh(getRefreshTokenFromRequest(req));
    setRefreshCookie(res, result.refreshToken);

    return successResponse(res, {
        user: result.user,
        accessToken: result.accessToken
    });
});

const logout = asyncHandler(async (req, res) => {
    const result = await authService.logout({
        refreshToken: getRefreshTokenFromRequest(req),
        userId: req.user?.id || null
    });

    clearRefreshCookie(res);

    return successResponse(res, result);
});

const me = asyncHandler(async (req, res) => {
    const user = await authService.getCurrentUser(req.user.id);
    return successResponse(res, { user });
});

module.exports = {
    register,
    login,
    refresh,
    logout,
    me
};
