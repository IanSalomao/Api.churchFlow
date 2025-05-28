const express = require("express");
const router = express.Router();
const metricsController = require("../app/controllers/metrics.controller");
const authenticator = require("../core/auth_middleware");

// Aplicando middleware de autenticação em todas as rotas
router.use(authenticator);

// Rotas de métricas
router.get("/financial", metricsController.getFinancialMetrics);
router.get("/members", metricsController.getMembersMetrics);
router.get("/ministries", metricsController.getMinistriesMetrics);
router.get("/dashboard", metricsController.getDashboardMetrics);

module.exports = router;
