const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DIRECT_URL, {
  dialect: "postgres",
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false, // necessário para conexões com SSL do Supabase
    },
  },
  logging: false,
});

module.exports = sequelize;