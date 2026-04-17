const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Schedule = sequelize.define("Schedule", {

    // 🔥 NEW FIELD (IMPORTANT)
    sourcePlanId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },

    ownerId: {
        type: DataTypes.UUID,
        allowNull: true,
    },

    title: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "Untitled Plan",
    },

    isPublic: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    generatedFromPlanId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    // ✅ EXISTING
    date: {
        type: DataTypes.DATE,
    },

    total_hours: {
        type: DataTypes.FLOAT,
    },

});

module.exports = Schedule;