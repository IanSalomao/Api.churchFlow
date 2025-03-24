const serverless = require("serverless-http");
const express = require("express");
const mongoose = require("mongoose");
const { connect } = require("../config/database");
const routes = require("../routes");
const { errorHandler } = require("../middlewares/errorHandler");
const { logger } = require("../utils/logger");

// Aplicação Express
const app = express();

// Middleware para parsing de JSON
app.use(express.json());

// Middleware de logging para todas as requisições
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Rotas da API
app.use("/api", routes);

// Middleware para rotas não encontradas
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Rota não encontrada",
  });
});

// Middleware de tratamento de erros
app.use(errorHandler);

// Conectando ao MongoDB antes de iniciar a função
let isConnected = false;

// Handler Lambda
const handler = async (event, context) => {
  // Manter conexão MongoDB entre invocações frias
  context.callbackWaitsForEmptyEventLoop = false;

  if (!isConnected) {
    await connect();
    isConnected = true;
  }

  return serverless(app)(event, context);
};

// Exportar para uso com Serverless
module.exports = { handler };

// Para desenvolvimento local com Express
if (process.env.NODE_ENV === "development") {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
}
