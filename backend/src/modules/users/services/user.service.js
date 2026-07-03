"use strict";

const AppError = require("../../../shared/errors/AppError");
const { ERROR_CODES } = require("../../../shared/errors/errorCodes");
const userRepository = require("../repositories/user.repository");
const { comparePassword, hashPassword, validatePasswordPolicy } = require("../../auth/utils/password.util");
const { presentUser } = require("../../auth/utils/userPresenter");

async function getUserProfile(userId) {
    const user = await userRepository.findUserById(userId);
    if (!user) {
        throw new AppError({
            message: "User not found",
            code: ERROR_CODES.NOT_FOUND,
            statusCode: 404
        });
    }
    return presentUser(user);
}

async function updateProfile(userId, payload) {
    const user = await userRepository.findUserById(userId);
    if (!user) {
        throw new AppError({
            message: "User not found",
            code: ERROR_CODES.NOT_FOUND,
            statusCode: 404
        });
    }

    if (payload.email) {
        const existingUser = await userRepository.findUserByEmailExcludeId(payload.email, userId);
        if (existingUser) {
            throw new AppError({
                message: "Email is already registered by another account",
                code: ERROR_CODES.DUPLICATE_RESOURCE,
                statusCode: 409
            });
        }
        user.email = payload.email.trim().toLowerCase();
    }

    if (payload.name) {
        user.name = payload.name.trim();
    }

    await user.save();
    return presentUser(user);
}

async function changePassword(userId, { oldPassword, newPassword }) {
    const user = await userRepository.findUserById(userId);
    if (!user) {
        throw new AppError({
            message: "User not found",
            code: ERROR_CODES.NOT_FOUND,
            statusCode: 404
        });
    }

    const isOldPasswordCorrect = await comparePassword(oldPassword, user.passwordHash);
    if (!isOldPasswordCorrect) {
        throw new AppError({
            message: "Incorrect old password",
            code: ERROR_CODES.INVALID_CREDENTIALS,
            statusCode: 401
        });
    }

    const passwordPolicyError = validatePasswordPolicy(newPassword);
    if (passwordPolicyError) {
        throw new AppError({
            message: passwordPolicyError,
            code: ERROR_CODES.VALIDATION_ERROR,
            statusCode: 400
        });
    }

    user.passwordHash = await hashPassword(newPassword);
    await user.save();

    return { success: true };
}

module.exports = {
    getUserProfile,
    updateProfile,
    changePassword
};
