"use strict";

const { Model, DataTypes } = require("sequelize");
const { USER_ROLES } = require("../../constants/enums");

class User extends Model {}

function initUser(sequelize) {
    User.init({
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4
        },
        name: {
            type: DataTypes.STRING(120),
            allowNull: false,
            validate: {
                notEmpty: true
            }
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: false,
            validate: {
                isEmail: true,
                notEmpty: true
            }
        },
        passwordHash: {
            type: DataTypes.TEXT,
            allowNull: false,
            field: "password_hash"
        },
        role: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: USER_ROLES.STUDENT,
            validate: {
                isIn: [Object.values(USER_ROLES)]
            }
        }
    }, {
        sequelize,
        tableName: "users",
        modelName: "User",
        indexes: [
            {
                name: "users_email_lower_unique_idx",
                unique: true,
                fields: [sequelize.fn("lower", sequelize.col("email"))]
            }
        ]
    });

    return User;
}

module.exports = {
    User,
    initUser
};
