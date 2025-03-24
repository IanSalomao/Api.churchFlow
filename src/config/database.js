const mongoose = require("mongoose");
const { logger } = require("../utils/logger");

// Opções de conexão
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
};

/**
 * Conecta ao MongoDB usando a URI do ambiente
 */
const connect = async () => {
  try {
    if (mongoose.connection.readyState === 0) {
      logger.info("Conectando ao MongoDB Atlas...");
      await mongoose.connect(process.env.MONGODB_URI, options);
      logger.info("MongoDB conectado com sucesso!");
    }
    return mongoose.connection;
  } catch (error) {
    logger.error("Erro ao conectar com MongoDB:", error);
    // No ambiente serverless, queremos que a função falhe rapidamente em caso de erro de conexão
    throw error;
  }
};

/**
 * Fecha a conexão com o MongoDB
 */
const disconnect = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    logger.info("MongoDB desconectado");
  }
};

module.exports = {
  connect,
  disconnect,
  mongoose,
};
