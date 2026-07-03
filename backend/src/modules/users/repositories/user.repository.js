"use strict";

const { User } = require("../../../db/models");
const { normalizeEmail } = require("../../../db/utils/normalize");
const { Op } = require("sequelize");

async function findUserById(id, options = {}) {
    return User.findByPk(id, options);
}

async function findUserByEmailExcludeId(email, userId, options = {}) {
    return User.findOne({
        where: {
            email: normalizeEmail(email),
            id: {
                [Op.ne]: userId
            }
        },
        ...options
    });
}

module.exports = {
    findUserById,
    findUserByEmailExcludeId
};
