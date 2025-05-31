const Member = require("../../models/member.model");
const { calculateAgeFromBirthDate, getMonthlyData } = require("./utils");

exports.getMembersMetrics = async (user_id) => {
  try {
    const [totalMembers, activeMembers, monthlyGrowth] = await Promise.all([
      Member.countDocuments({ user_id }),
      Member.countDocuments({ user_id, status: true }),
      getMonthlyData(Member, user_id),
    ]);

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
