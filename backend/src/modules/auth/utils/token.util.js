"use strict";

const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const config = require("../../../config/env");

const { BRANDING } = require("../../../config/branding");

function signAccessToken(user) {
    return jwt.sign(
        {
            sub: user.id,
            role: user.role,
            typ: "access"
        },
        config.jwt.accessSecret,
        {
            expiresIn: config.jwt.accessExpiresIn,
            issuer: BRANDING.API_NAME,
            audience: BRANDING.CLIENT_NAME
        }
    );
}

function verifyAccessToken(token) {
    return jwt.verify(token, config.jwt.accessSecret, {
        issuer: BRANDING.API_NAME,
        audience: BRANDING.CLIENT_NAME
    });
}

function generateRefreshToken() {
    return crypto.randomBytes(48).toString("base64url");
}

function hashRefreshToken(token) {
    return crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
}

function buildRefreshExpiry(now = new Date()) {
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + config.jwt.refreshTokenDays);
    return expiresAt;
}

function createTokenFamilyId() {
    return crypto.randomUUID();
}

module.exports = {
    signAccessToken,
    verifyAccessToken,
    generateRefreshToken,
    hashRefreshToken,
    buildRefreshExpiry,
    createTokenFamilyId
};
