const metricsService = require("../services/metrics.service");

const createResponse = (res, statusCode, message, data = null) => {
  const response = { mensagem: message };
  if (data) {
    response.data = data;
  }
  return res.status(statusCode).json(response);
};

const validateDateFormat = (dateString) => {
  if (!dateString) return true;
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

exports.getFinancialMetrics = async (req, res) => {
  try {
    const user_id = req.user._id;
    const { start_date, end_date } = req.query;

    // Validação das datas
    if (!validateDateFormat(start_date) || !validateDateFormat(end_date)) {
      return createResponse(res, 400, "Formato de data inválido. Use YYYY-MM-DD");
    }

    // Validação do período
    if (start_date && end_date && new Date(start_date) > new Date(end_date)) {
      return createResponse(res, 400, "A data inicial não pode ser maior que a data final");
    }

    const metrics = await metricsService.getFinancialMetrics(user_id, start_date, end_date);
    return createResponse(res, 200, "Métricas financeiras calculadas com sucesso", metrics);
  } catch (error) {
    console.error("Erro ao obter métricas financeiras:", error);
    return createResponse(res, 500, "Erro ao calcular métricas financeiras");
  }
};

exports.getMembersMetrics = async (req, res) => {
  try {
    const user_id = req.user._id;

    const metrics = await metricsService.getMembersMetrics(user_id);
    return createResponse(res, 200, "Métricas de membros calculadas com sucesso", metrics);
  } catch (error) {
    console.error("Erro ao obter métricas de membros:", error);
    return createResponse(res, 500, "Erro ao calcular métricas de membros");
  }
};

exports.getMinistriesMetrics = async (req, res) => {
  try {
    const user_id = req.user._id;

    const metrics = await metricsService.getMinistriesMetrics(user_id);
    return createResponse(res, 200, "Métricas de ministérios calculadas com sucesso", metrics);
  } catch (error) {
    console.error("Erro ao obter métricas de ministérios:", error);
    return createResponse(res, 500, "Erro ao calcular métricas de ministérios");
  }
};

exports.getDashboardMetrics = async (req, res) => {
  try {
    const user_id = req.user._id;

    const metrics = await metricsService.getDashboardMetrics(user_id);
    return createResponse(res, 200, "Métricas do dashboard calculadas com sucesso", metrics);
  } catch (error) {
    console.error("Erro ao obter métricas do dashboard:", error);
    return createResponse(res, 500, "Erro ao calcular métricas do dashboard");
  }
};
