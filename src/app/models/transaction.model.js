const { DataTypes } = require('sequelize');
const sequelize = require('../../core/db_connect');

const Transaction = sequelize.define(
  "Transaction",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    value: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    member_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "Members",
        key: "id",
      },
    },
    ministry_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "Ministries",
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
    tableName: "transactions",
    timestamps: false,
  }
);


module.exports = Transaction;
