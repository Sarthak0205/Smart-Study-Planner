"use strict";

const { Transaction } = require("sequelize");
const AppError = require("../../../shared/errors/AppError");
const { ERROR_CODES } = require("../../../shared/errors/errorCodes");
const { USER_ROLES } = require("../../../constants/enums");
const { withTransaction } = require("../../../config/database");
const { normalizeEmail } = require("../../../db/utils/normalize");
const {
    validatePasswordPolicy,
    hashPassword,
    comparePassword
} = require("../utils/password.util");
const {
    signAccessToken,
    generateRefreshToken,
    hashRefreshToken,
    buildRefreshExpiry,
    createTokenFamilyId
} = require("../utils/token.util");
const { presentUser } = require("../utils/userPresenter");
const authRepository = require("../repositories/auth.repository");

const SELF_REGISTER_ROLES = new Set([
    USER_ROLES.STUDENT,
    USER_ROLES.TEACHER
]);

function invalidCredentialsError() {
    return new AppError({
        message: "Invalid email or password",
        code: ERROR_CODES.INVALID_CREDENTIALS,
        statusCode: 401
    });
}

function invalidTokenError(message = "Invalid refresh token") {
    return new AppError({
        message,
        code: ERROR_CODES.INVALID_TOKEN,
        statusCode: 401
    });
}

async function issueTokenPair(user, { transaction, familyId = createTokenFamilyId() } = {}) {
    const accessToken = signAccessToken(user);
    const refreshToken = generateRefreshToken();
    const refreshTokenRecord = await authRepository.createRefreshToken({
        userId: user.id,
        tokenHash: hashRefreshToken(refreshToken),
        familyId,
        expiresAt: buildRefreshExpiry()
    }, { transaction });

    return {
        accessToken,
        refreshToken,
        refreshTokenRecord
    };
}

async function register({ name, email, password, role = USER_ROLES.STUDENT }) {
    if (!SELF_REGISTER_ROLES.has(role)) {
        throw new AppError({
            message: "Only student and teacher registration is allowed",
            code: ERROR_CODES.FORBIDDEN,
            statusCode: 403
        });
    }

    const passwordPolicyError = validatePasswordPolicy(password);
    if (passwordPolicyError) {
        throw new AppError({
            message: passwordPolicyError,
            code: ERROR_CODES.VALIDATION_ERROR,
            statusCode: 400
        });
    }

    return withTransaction(async transaction => {
        const existingUser = await authRepository.findUserByEmail(email, {
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        if (existingUser) {
            throw new AppError({
                message: "Email is already registered",
                code: ERROR_CODES.DUPLICATE_RESOURCE,
                statusCode: 409
            });
        }

        const user = await authRepository.createUser({
            name: name.trim(),
            email: normalizeEmail(email),
            passwordHash: await hashPassword(password),
            role
        }, { transaction });

        const tokens = await issueTokenPair(user, { transaction });

        return {
            user: presentUser(user),
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken
        };
    });
}

async function login({ email, password }) {
    const user = await authRepository.findUserByEmail(email);

    if (!user) {
        throw invalidCredentialsError();
    }

    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
        throw invalidCredentialsError();
    }

    return withTransaction(async transaction => {
        const tokens = await issueTokenPair(user, { transaction });

        return {
            user: presentUser(user),
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken
        };
    });
}

async function refresh(refreshToken) {
    if (!refreshToken) {
        throw invalidTokenError("Refresh token is required");
    }

    return withTransaction(async transaction => {
        const tokenHash = hashRefreshToken(refreshToken);
        const tokenRecord = await authRepository.findRefreshTokenByHash(tokenHash, {
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        if (!tokenRecord) {
            throw invalidTokenError();
        }

        if (tokenRecord.revokedAt) {
            await authRepository.revokeRefreshTokenFamily(tokenRecord.familyId, { transaction });
            throw new AppError({
                message: "Refresh token has been revoked",
                code: ERROR_CODES.REVOKED_TOKEN,
                statusCode: 401
            });
        }

        if (tokenRecord.expiresAt <= new Date()) {
            await authRepository.revokeRefreshToken(tokenRecord, { transaction });
            throw new AppError({
                message: "Refresh token has expired",
                code: ERROR_CODES.EXPIRED_TOKEN,
                statusCode: 401
            });
        }

        const user = await authRepository.findUserById(tokenRecord.userId, { transaction });

        if (!user) {
            throw invalidTokenError();
        }

        const nextTokens = await issueTokenPair(user, {
            transaction,
            familyId: tokenRecord.familyId
        });

        await authRepository.revokeRefreshToken(tokenRecord, {
            replacedByTokenId: nextTokens.refreshTokenRecord.id,
            transaction
        });

        return {
            user: presentUser(user),
            accessToken: nextTokens.accessToken,
            refreshToken: nextTokens.refreshToken
        };
    }, {
        isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
    });
}

async function logout({ refreshToken, userId }) {
    return withTransaction(async transaction => {
        if (refreshToken) {
            const tokenRecord = await authRepository.findRefreshTokenByHash(hashRefreshToken(refreshToken), {
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (tokenRecord && !tokenRecord.revokedAt) {
                await authRepository.revokeRefreshToken(tokenRecord, { transaction });
            }

            return { revoked: Boolean(tokenRecord) };
        }

        if (userId) {
            await authRepository.revokeUserRefreshTokens(userId, { transaction });
            return { revoked: true };
        }

        return { revoked: false };
    });
}

async function getCurrentUser(userId) {
    const user = await authRepository.findUserById(userId);

    if (!user) {
        throw new AppError({
            message: "Authenticated user no longer exists",
            code: ERROR_CODES.UNAUTHORIZED,
            statusCode: 401
        });
    }

    return presentUser(user);
}

module.exports = {
    register,
    login,
    refresh,
    logout,
    getCurrentUser
};
