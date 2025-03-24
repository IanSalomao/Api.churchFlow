const express = require("express");
const userRoutes = require("./userRoutes");
// Importe outras rotas aqui conforme cria-las

const router = express.Router();

// Rota de saúde da API
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || "1.0.0",
  });
});

// Registrar rotas
router.use("/users", userRoutes);
// Adicione outras rotas aqui conforme cria-las
// router.use('/members', memberRoutes);
// router.use('/ministries', ministryRoutes);
// router.use('/finances', financeRoutes);

module.exports = router;
