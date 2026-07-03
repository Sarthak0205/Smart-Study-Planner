"use strict";

const { Op } = require("sequelize");
const { User, RefreshToken } = require("../../../db/models");
const { normalizeEmail } = require("../../../db/utils/normalize");

async function findUserByEmail(email, options = {}) {
    return User.findOne({
        where: {
            email: normalizeEmail(email)
        },
        ...options
    });
}

async function findUserById(id, options = {}) {
    return User.findByPk(id, options);
}

async function createUser({ name, email, passwordHash, role }, options = {}) {
    return User.create({
        name,
        email: normalizeEmail(email),
        passwordHash,
        role
    }, options);
}

async function createRefreshToken(payload, options = {}) {
    return RefreshToken.create(payload, options);
}

async function findRefreshTokenByHash(tokenHash, options = {}) {
    const { includeUser = false, ...queryOptions } = options;

    return RefreshToken.findOne({
        where: { tokenHash },
        include: includeUser
            ? [{
                model: User,
                as: "user"
            }]
            : [],
        ...queryOptions
    });
}

async function revokeRefreshToken(tokenRecord, { replacedByTokenId = null, transaction } = {}) {
    tokenRecord.revokedAt = new Date();
    tokenRecord.replacedByTokenId = replacedByTokenId;
    return tokenRecord.save({ transaction });
}

async function revokeRefreshTokenFamily(familyId, options = {}) {
    return RefreshToken.update({
        revokedAt: new Date()
    }, {
        where: {
            familyId,
            revokedAt: {
                [Op.is]: null
            }
        },
        ...options
    });
}

async function revokeUserRefreshTokens(userId, options = {}) {
    return RefreshToken.update({
        revokedAt: new Date()
    }, {
        where: {
            userId,
            revokedAt: {
                [Op.is]: null
            }
        },
        ...options
    });
}

module.exports = {
    findUserByEmail,
    findUserById,
    createUser,
    createRefreshToken,
    findRefreshTokenByHash,
    revokeRefreshToken,
    revokeRefreshTokenFamily,
    revokeUserRefreshTokens
};
