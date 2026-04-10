module.exports = (sequelize, DataTypes) => {
    const UserSchedule = sequelize.define("UserSchedule", {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
    });

    return UserSchedule;
};