"use strict";

function toDateOnly(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function parseDateOnly(value) {
    const [year, month, day] = String(value).split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
}

function addDays(date, days) {
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + days);
    return next;
}

function daysBetween(start, end) {
    const ms = parseDateOnly(formatDateOnly(end)) - parseDateOnly(formatDateOnly(start));
    return Math.ceil(ms / 86_400_000);
}

function formatDateOnly(date) {
    return date.toISOString().slice(0, 10);
}

module.exports = {
    toDateOnly,
    parseDateOnly,
    addDays,
    daysBetween,
    formatDateOnly
};
