const { getFinancialMetrics } = require("./financial.metrics");
const { getMembersMetrics } = require("./members.metrics");
const { getMinistriesMetrics } = require("./ministries.metrics");
const { getDashboardMetrics } = require("./dashboard.metrics");

module.exports = {
  getFinancialMetrics,
  getMembersMetrics,
  getMinistriesMetrics,
  getDashboardMetrics,
};
