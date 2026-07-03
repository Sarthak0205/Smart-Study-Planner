"use strict";

const config = require("../../../config/env");

function parseCookies(header = "") {
    return header
        .split(";")
        .map(part => part.trim())
        .filter(Boolean)
        .reduce((cookies, part) => {
            const separatorIndex = part.indexOf("=");
            if (separatorIndex === -1) return cookies;

            const key = part.slice(0, separatorIndex);
            const value = part.slice(separatorIndex + 1);
            cookies[key] = decodeURIComponent(value);
            return cookies;
        }, {});
}

function setRefreshCookie(res, refreshToken) {
    const maxAge = config.jwt.refreshTokenDays * 24 * 60 * 60;
    const sameSite = config.isProduction ? "None" : "Lax";
    const secure = config.isProduction ? "; Secure" : "";

    res.setHeader(
        "Set-Cookie",
        `${config.jwt.refreshCookieName}=${encodeURIComponent(refreshToken)}; HttpOnly; Path=/api/v1/auth; Max-Age=${maxAge}; SameSite=${sameSite}${secure}`
    );
}

function clearRefreshCookie(res) {
    const sameSite = config.isProduction ? "None" : "Lax";
    const secure = config.isProduction ? "; Secure" : "";

    res.setHeader(
        "Set-Cookie",
        `${config.jwt.refreshCookieName}=; HttpOnly; Path=/api/v1/auth; Max-Age=0; SameSite=${sameSite}${secure}`
    );
}

function getRefreshTokenFromRequest(req) {
    const cookies = parseCookies(req.headers.cookie || "");
    return cookies[config.jwt.refreshCookieName] || req.body?.refreshToken || null;
}

module.exports = {
    parseCookies,
    setRefreshCookie,
    clearRefreshCookie,
    getRefreshTokenFromRequest
};
