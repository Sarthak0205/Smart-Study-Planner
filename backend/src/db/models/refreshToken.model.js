"use strict";

const { Model, DataTypes } = require("sequelize");

class RefreshToken extends Model {}

function initRefreshToken(sequelize) {
    RefreshToken.init({
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: "user_id"
        },
        tokenHash: {
            type: DataTypes.STRING(128),
            allowNull: false,
            field: "token_hash"
        },
        familyId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: "family_id"
        },
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: false,
            field: "expires_at"
        },
        revokedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: "revoked_at"
        },
        replacedByTokenId: {
            type: DataTypes.UUID,
            allowNull: true,
            field: "replaced_by_token_id"
        }
    }, {
        sequelize,
        tableName: "refresh_tokens",
        modelName: "RefreshToken",
        indexes: [
            { name: "refresh_tokens_token_hash_unique", unique: true, fields: ["token_hash"] },
            { name: "refresh_tokens_user_id_idx", fields: ["user_id"] },
            { name: "refresh_tokens_family_id_idx", fields: ["family_id"] },
            { name: "refresh_tokens_expires_at_idx", fields: ["expires_at"] },
            { name: "refresh_tokens_active_user_idx", fields: ["user_id", "revoked_at"], where: { revoked_at: null } }
        ]
    });

    return RefreshToken;
}

module.exports = {
    RefreshToken,
    initRefreshToken
};
