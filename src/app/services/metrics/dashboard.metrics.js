const mongoose = require("mongoose");
const Member = require("../../models/member.model");
const Ministry = require("../../models/ministry.model");
const Transaction = require("../../models/transaction.model");
const { formatMoneyValue, formatPercentage } = require("./utils");

exports.getDashboardMetrics = async (user_id) => {
  try {
    const now = new Date();
    const weekAgo = new Date(now.setDate(now.getDate() - 7));

    const [totalMembers, activeMinistries, recentMembers, recentTransactions, ministryChanges, topCategories, topMinistries] = await Promise.all([
      Member.countDocuments({ user_id, status: true }),
      Ministry.countDocuments({ user_id, status: true }),
      Member.countDocuments({ user_id, createdAt: { $gte: weekAgo } }),
      Transaction.countDocuments({ user_id, date: { $gte: weekAgo } }),
      Ministry.countDocuments({ user_id, updatedAt: { $gte: weekAgo } }),
      Transaction.aggregate([
        {
          $match: { user_id: new mongoose.Types.ObjectId(user_id), value: { $gt: 0 } },
        },
        { $unwind: "$categories" },
        {
          $group: {
            _id: "$categories",
            total: { $sum: "$value" },
            count: { $sum: 1 },
          },
        },
        { $sort: { total: -1 } },
        { $limit: 5 },
      ]),
      Ministry.aggregate([
        {
          $match: { user_id: new mongoose.Types.ObjectId(user_id) },
        },
        {
          $lookup: {
            from: "transactions",
            localField: "_id",
            foreignField: "ministry_id",
            as: "transactions",
          },
        },
        {
          $project: {
            name: 1,
            total_transactions: { $sum: "$transactions.value" },
          },
        },
        { $sort: { total_transactions: 1 } },
        { $limit: 5 },
      ]),
    ]);

    const totalInflows = await Transaction.aggregate([
      {
        $match: {
          user_id: new mongoose.Types.ObjectId(user_id),
          value: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$value" },
        },
      },
    ]);

    const totalOutflows = await Transaction.aggregate([
      {
        $match: {
          user_id: new mongoose.Types.ObjectId(user_id),
          value: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$value" },
        },
      },
    ]);

    const totalIncome = await Transaction.aggregate([
      {
        $match: {
          user_id: new mongoose.Types.ObjectId(user_id),
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: "$value",
          },
        },
      },
    ]);

    return {
      quick_stats: {
        total_active_members: totalMembers,
        total_active_ministries: activeMinistries,
      },
      recent_activity: {
        new_members_week: recentMembers,
        new_transactions_week: recentTransactions,
        ministry_changes: ministryChanges,
      },
      financial_health: {
        total_income: formatMoneyValue(totalIncome[0]?.total || 0),
        total_inflows: formatMoneyValue(totalInflows[0]?.total || 0),
        total_outflows: formatMoneyValue(totalOutflows[0]?.total || 0),
      },
      top_categories: topCategories.map((category) => ({
        name: category._id,
        total: formatMoneyValue(category.total),
        percentage: formatPercentage(category.total, totalInflows[0]?.total || 1),
      })),
      top_ministries: topMinistries.map((ministry) => ({
        name: ministry.name,
        total_transactions: formatMoneyValue(ministry.total_transactions),
      })),
    };
  } catch (error) {
    throw new Error(`Erro ao calcular métricas do dashboard: ${error.message}`);
  }
};
