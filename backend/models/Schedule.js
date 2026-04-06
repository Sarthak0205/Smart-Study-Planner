const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Schedule = sequelize.define("Schedule", {
    date: {
        type: DataTypes.DATE,
    },
    total_hours: {
        type: DataTypes.FLOAT,
    },
});

module.exports = Schedule;