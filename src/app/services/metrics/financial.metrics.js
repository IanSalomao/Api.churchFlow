const mongoose = require("mongoose");
const Transaction = require("../../models/transaction.model");
const { formatMoneyValue, getMonthlyData } = require("./utils");

exports.getFinancialMetrics = async (user_id, startDate, endDate) => {
  try {
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const totalIncome = await Transaction.aggregate([
      {
        $match: {
          user_id: new mongoose.Types.ObjectId(user_id),
          ...(Object.keys(dateFilter).length && { date: dateFilter }),
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$value" },
        },
      },
    ]);

    const byCategory = await Transaction.aggregate([
      {
        $match: {
          user_id: new mongoose.Types.ObjectId(user_id),
          ...(Object.keys(dateFilter).length && { date: dateFilter }),
        },
      },
      { $unwind: "$categories" },
      {
        $group: {
          _id: "$categories",
          total: { $sum: "$value" },
        },
      },
      { $sort: { total: -1, _id: 1 } },
    ]);

    const monthlySummary = await getMonthlyData(Transaction, user_id, "date");

    const currentMonth = new Date();
    const previousMonth = new Date(currentMonth.setMonth(currentMonth.getMonth() - 1));

    const [currentMonthData, previousMonthData] = await Promise.all([
      Transaction.aggregate([
        {
          $match: {
            user_id: new mongoose.Types.ObjectId(user_id),
            date: {
              $gte: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1),
              $lt: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
            },
          },
        },
        { $group: { _id: null, total: { $sum: "$value" } } },
      ]),
      Transaction.aggregate([
        {
          $match: {
            user_id: new mongoose.Types.ObjectId(user_id),
            date: {
              $gte: new Date(previousMonth.getFullYear(), previousMonth.getMonth(), 1),
              $lt: new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 1),
            },
          },
        },
        { $group: { _id: null, total: { $sum: "$value" } } },
      ]),
    ]);

    return {
      total_income: formatMoneyValue(totalIncome[0]?.total || 0),
      by_category: byCategory.reduce((acc, curr) => {
        acc[curr._id] = formatMoneyValue(curr.total);
        return acc;
      }, {}),
      monthly_summary: monthlySummary.map((month) => ({
        month: `${month._id.year}-${String(month._id.month).padStart(2, "0")}`,
        total: formatMoneyValue(month.total),
      })),
      comparison: {
        current_month: formatMoneyValue(currentMonthData[0]?.total || 0),
        previous_month: formatMoneyValue(previousMonthData[0]?.total || 0),
        percentage_change: previousMonthData[0]?.total
          ? ((currentMonthData[0]?.total - previousMonthData[0]?.total) / previousMonthData[0]?.total) * 100
          : 0,
      },
    };
  } catch (error) {
    throw new Error(`Erro ao calcular métricas financeiras: ${error.message}`);
  }
};
