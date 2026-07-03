"use strict";

function normalizeName(value) {
    return String(value || "")
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase();
}

function normalizeEmail(value) {
    return String(value || "")
        .trim()
        .toLowerCase();
}

module.exports = {
    normalizeName,
    normalizeEmail
};
