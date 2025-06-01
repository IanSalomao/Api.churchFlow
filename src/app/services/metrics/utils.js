const mongoose = require("mongoose");

const formatMoneyValue = (cents) => {
  if (typeof cents !== "number") return "0,00";
  return (cents / 100).toFixed(2).replace(".", ",");
};

const formatPercentage = (value, reference) => {
  if (typeof value !== "number") return "0%";
  return ((value / reference) * 100).toFixed(2).replace(".", ",").concat("%");
};

const calculateAgeFromBirthDate = (birthDate) => {
  return Math.floor((new Date() - new Date(birthDate)) / (365.25 * 24 * 60 * 60 * 1000));
};

const getMonthlyData = async (model, user_id, dateField = "createdAt", monthsBack = 12) => {
  const now = new Date();
  const monthsAgo = new Date(now.setMonth(now.getMonth() - monthsBack));

  const aggregation = await model.aggregate([
    {
      $match: {
        user_id: new mongoose.Types.ObjectId(user_id),
        [dateField]: { $gte: monthsAgo },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: `$${dateField}` },
          month: { $month: `$${dateField}` },
        },
        count: { $sum: 1 },
        total: { $sum: { $ifNull: ["$value", 0] } },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  return aggregation;
};

module.exports = {
  formatMoneyValue,
  formatPercentage,
  calculateAgeFromBirthDate,
  getMonthlyData,
};
