"use strict";

const { DataTypes, Sequelize } = require("sequelize");

module.exports = {
    async up(queryInterface) {
        await queryInterface.createTable("refresh_tokens", {
            id: {
                type: DataTypes.UUID,
                allowNull: false,
                primaryKey: true,
                defaultValue: Sequelize.literal("gen_random_uuid()")
            },
            user_id: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: "users",
                    key: "id"
                },
                onUpdate: "CASCADE",
                onDelete: "CASCADE"
            },
            token_hash: {
                type: DataTypes.STRING(128),
                allowNull: false
            },
            family_id: {
                type: DataTypes.UUID,
                allowNull: false
            },
            expires_at: {
                type: DataTypes.DATE,
                allowNull: false
            },
            revoked_at: {
                type: DataTypes.DATE,
                allowNull: true
            },
            replaced_by_token_id: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: "refresh_tokens",
                    key: "id"
                },
                onUpdate: "CASCADE",
                onDelete: "SET NULL"
            },
            created_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal("now()")
            },
            updated_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal("now()")
            }
        });

        await queryInterface.addConstraint("refresh_tokens", {
            fields: ["token_hash"],
            type: "unique",
            name: "refresh_tokens_token_hash_unique"
        });
        await queryInterface.addIndex("refresh_tokens", ["user_id"], { name: "refresh_tokens_user_id_idx" });
        await queryInterface.addIndex("refresh_tokens", ["family_id"], { name: "refresh_tokens_family_id_idx" });
        await queryInterface.addIndex("refresh_tokens", ["expires_at"], { name: "refresh_tokens_expires_at_idx" });
        await queryInterface.addIndex("refresh_tokens", ["user_id", "revoked_at"], {
            name: "refresh_tokens_active_user_idx",
            where: {
                revoked_at: null
            }
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable("refresh_tokens");
    }
};
