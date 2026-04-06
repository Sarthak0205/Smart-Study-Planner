const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Topic = sequelize.define("Topic", {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
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

    // ✅ ADD THIS
    status: {
        type: DataTypes.ENUM('pending', 'in_progress', 'completed'),
        defaultValue: 'pending',
    },
    progress: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
    }

}, {
    indexes: [
        { fields: ['deadline'] },
        { fields: ['difficulty'] },
        { fields: ['status'] },
        { fields: ['deadline', 'difficulty'] }
    ]
});

module.exports = Topic;