const { Sequelize } = require("sequelize");

const sequelize = new Sequelize("studyplanner", "sdc", null, {
  host: "localhost",
  port: 5432,
  dialect: "postgres",
  logging: false,
});

sequelize.authenticate()
  .then(() => console.log("PostgreSQL Connected"))
  .catch(err => console.error("DB Error:", err));

module.exports = sequelize;