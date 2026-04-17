const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Topic = sequelize.define("Topic", {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: 'unique_topic_per_plan_user'   // 🔥 PART OF COMPOSITE UNIQUE
    },

    difficulty: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },

    estimated_hours: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },

    deadline: {
        type: DataTypes.DATE,
        allowNull: false,
    },

    // 🔥 MULTI-USER SUPPORT
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: 'unique_topic_per_plan_user'   // 🔥 COMPOSITE UNIQUE
    },

    // 🔥 PLAN SCOPING
    planId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: 'unique_topic_per_plan_user'   // 🔥 COMPOSITE UNIQUE
    },

    status: {
        type: DataTypes.ENUM('pending', 'in_progress', 'completed'),
        defaultValue: 'pending',
    },

    progress: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
        validate: {
            min: 0,
            max: 1
        }
    }

}, {
    indexes: [
        { fields: ['deadline'] },
        { fields: ['difficulty'] },
        { fields: ['status'] },
        { fields: ['deadline', 'difficulty'] },
        { fields: ['userId'] },
        { fields: ['planId'] },

        // 🔥 FAST LOOKUP FOR CORE FLOW
        { fields: ['userId', 'planId'] }
    ]
});

module.exports = Topic;