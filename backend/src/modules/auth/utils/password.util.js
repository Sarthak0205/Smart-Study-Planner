"use strict";

const bcrypt = require("bcryptjs");

const PASSWORD_MIN_LENGTH = 8;

function validatePasswordPolicy(password) {
    if (typeof password !== "string" || password.length < PASSWORD_MIN_LENGTH) {
        return "Password must be at least 8 characters long";
    }

    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
        return "Password must include at least one letter and one number";
    }

    return null;
}

async function hashPassword(password) {
    return bcrypt.hash(password, 12);
}

async function comparePassword(password, passwordHash) {
    return bcrypt.compare(password, passwordHash);
}

module.exports = {
    validatePasswordPolicy,
    hashPassword,
    comparePassword
};
