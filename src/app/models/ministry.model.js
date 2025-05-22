const { DataTypes } = require('sequelize');
const sequelize = require('../../core/db_connect');

const Ministry = sequelize.define(
  "Ministry",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status:{
      type: DataTypes.BOOLEAN,
      allowNull: false
    },
    member_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Members",
        key: "id",
      },
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "User",
        key: "id",
      },
    },
  },
  {
    tableName: "ministries",
    timestamps: false,
  }
);


module.exports = Ministry;
