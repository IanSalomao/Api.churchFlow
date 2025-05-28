const Transaction = require("../models/transaction.model");
const Member = require("../models/member.model");
const Ministry = require("../models/ministry.model");
const mongoose = require("mongoose");

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

exports.getFinancialMetrics = async (user_id, startDate, endDate) => {
  try {
    // Configurando filtros de data
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    // Métricas gerais
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

    // Agrupamento por categoria
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
    ]);

    // Resumo mensal
    const monthlySummary = await getMonthlyData(Transaction, user_id, "date");

    // Comparação mês atual vs anterior
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
      total_income: totalIncome[0]?.total || 0,
      by_category: byCategory.reduce((acc, curr) => {
        acc[curr._id] = curr.total;
        return acc;
      }, {}),
      monthly_summary: monthlySummary.map((month) => ({
        month: `${month._id.year}-${String(month._id.month).padStart(2, "0")}`,
        total: month.total,
      })),
      comparison: {
        current_month: currentMonthData[0]?.total || 0,
        previous_month: previousMonthData[0]?.total || 0,
        percentage_change: previousMonthData[0]?.total
          ? ((currentMonthData[0]?.total - previousMonthData[0]?.total) / previousMonthData[0]?.total) * 100
          : 0,
      },
    };
  } catch (error) {
    throw new Error(`Erro ao calcular métricas financeiras: ${error.message}`);
  }
};

exports.getMembersMetrics = async (user_id) => {
  try {
    const [totalMembers, activeMembers, monthlyGrowth] = await Promise.all([
      Member.countDocuments({ user_id }),
      Member.countDocuments({ user_id, status: true }),
      getMonthlyData(Member, user_id),
    ]);

    // Distribuição por idade
    const members = await Member.find({ user_id });
    const ageDistribution = members.reduce(
      (acc, member) => {
        const age = calculateAgeFromBirthDate(member.birth_date);
        if (age < 18) acc.under_18++;
        else if (age <= 30) acc["18_30"]++;
        else if (age <= 50) acc["31_50"]++;
        else acc.above_50++;
        return acc;
      },
      { under_18: 0, "18_30": 0, "31_50": 0, above_50: 0 }
    );

    // Estatísticas de batismo
    const baptismStats = {
      total_baptized: await Member.countDocuments({ user_id, batism_date: { $exists: true, $ne: null } }),
      pending_baptism: await Member.countDocuments({ user_id, batism_date: null }),
      baptisms_this_year: await Member.countDocuments({
        user_id,
        batism_date: {
          $gte: new Date(new Date().getFullYear(), 0, 1),
          $lte: new Date(new Date().getFullYear(), 11, 31),
        },
      }),
    };

    return {
      total_members: totalMembers,
      active_members: activeMembers,
      inactive_members: totalMembers - activeMembers,
      growth: {
        new_members_month: monthlyGrowth[monthlyGrowth.length - 1]?.count || 0,
        percentage_growth: totalMembers ? ((monthlyGrowth[monthlyGrowth.length - 1]?.count || 0) / totalMembers) * 100 : 0,
      },
      age_distribution: ageDistribution,
      baptism_stats: baptismStats,
      monthly_growth: monthlyGrowth.map((month) => ({
        month: `${month._id.year}-${String(month._id.month).padStart(2, "0")}`,
        new_members: month.count,
      })),
    };
  } catch (error) {
    throw new Error(`Erro ao calcular métricas de membros: ${error.message}`);
  }
};

exports.getMinistriesMetrics = async (user_id) => {
  try {
    const [totalMinistries, activeMinistries] = await Promise.all([
      Ministry.countDocuments({ user_id }),
      Ministry.countDocuments({ user_id, status: true }),
    ]);

    // Distribuição de membros por ministério
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

    // Resumo financeiro
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
      members_distribution: ministriesDistribution,
      financial_summary: {
        total_spent: financialSummary.reduce((acc, curr) => acc + curr.total, 0),
        by_ministry: financialSummary.reduce((acc, curr) => {
          acc[curr._id] = curr.total;
          return acc;
        }, {}),
      },
    };
  } catch (error) {
    throw new Error(`Erro ao calcular métricas de ministérios: ${error.message}`);
  }
};

exports.getDashboardMetrics = async (user_id) => {
  try {
    const now = new Date();
    const weekAgo = new Date(now.setDate(now.getDate() - 7));

    const [totalMembers, activeMinistries, recentMembers, recentTransactions, ministryChanges, topCategories, topMinistries] = await Promise.all([
      Member.countDocuments({ user_id }),
      Ministry.countDocuments({ user_id, status: true }),
      Member.countDocuments({ user_id, createdAt: { $gte: weekAgo } }),
      Transaction.countDocuments({ user_id, date: { $gte: weekAgo } }),
      Ministry.countDocuments({ user_id, updatedAt: { $gte: weekAgo } }),
      Transaction.aggregate([
        {
          $match: { user_id: new mongoose.Types.ObjectId(user_id) },
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
        { $sort: { total_transactions: -1 } },
        { $limit: 5 },
      ]),
    ]);

    // Cálculo do total mensal
    const monthlyTotal = await Transaction.aggregate([
      {
        $match: {
          user_id: new mongoose.Types.ObjectId(user_id),
          date: {
            $gte: new Date(now.getFullYear(), now.getMonth(), 1),
            $lt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
          },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$value" },
        },
      },
    ]);

    return {
      quick_stats: {
        total_members: totalMembers,
        total_ministries: await Ministry.countDocuments({ user_id }),
        monthly_income: monthlyTotal[0]?.total || 0,
        active_ministries: activeMinistries,
      },
      recent_activity: {
        new_members_week: recentMembers,
        new_transactions_week: recentTransactions,
        ministry_changes: ministryChanges,
      },
      financial_health: {
        current_month_achieved: monthlyTotal[0]?.total || 0,
      },
      top_categories: topCategories.map((category) => ({
        name: category._id,
        total: category.total,
        percentage: (category.total / (monthlyTotal[0]?.total || 1)) * 100,
      })),
      top_ministries: topMinistries.map((ministry) => ({
        name: ministry.name,
        total_transactions: ministry.total_transactions,
      })),
    };
  } catch (error) {
    throw new Error(`Erro ao calcular métricas do dashboard: ${error.message}`);
  }
};
