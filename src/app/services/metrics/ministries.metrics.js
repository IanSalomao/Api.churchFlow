const mongoose = require("mongoose");
const Ministry = require("../../models/ministry.model");
const Transaction = require("../../models/transaction.model");
const { formatMoneyValue } = require("./utils");

exports.getMinistriesMetrics = async (user_id) => {
  try {
    const [totalMinistries, activeMinistries] = await Promise.all([
      Ministry.countDocuments({ user_id }),
      Ministry.countDocuments({ user_id, status: true }),
    ]);

    const ministriesDistribution = await Ministry.aggregate([
      {
        $match: { user_id: new mongoose.Types.ObjectId(user_id) },
      },
      {
        $lookup: {
          from: "members",
          localField: "member_id",
          foreignField: "_id",
          as: "leader",
        },
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
          ministry_name: "$name",
          leader: { $arrayElemAt: ["$leader.name", 0] },
          total_transactions: { $sum: "$transactions.value" },
          transaction_count: { $size: "$transactions" },
        },
      },
    ]);

    const financialSummary = await Transaction.aggregate([
      {
        $match: {
          user_id: new mongoose.Types.ObjectId(user_id),
          ministry_id: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: "$ministry_id",
          total: { $sum: "$value" },
        },
      },
    ]);

    return {
      total_ministries: totalMinistries,
      active_ministries: activeMinistries,
      inactive_ministries: totalMinistries - activeMinistries,
      members_distribution: ministriesDistribution.map((ministry) => ({
        ...ministry,
        total_transactions: formatMoneyValue(ministry.total_transactions),
      })),
      financial_summary: {
        total_spent: formatMoneyValue(financialSummary.reduce((acc, curr) => acc + curr.total, 0)),
        by_ministry: financialSummary.reduce((acc, curr) => {
          acc[curr._id] = formatMoneyValue(curr.total);
          return acc;
        }, {}),
      },
    };
  } catch (error) {
    throw new Error(`Erro ao calcular métricas de ministérios: ${error.message}`);
  }
};
