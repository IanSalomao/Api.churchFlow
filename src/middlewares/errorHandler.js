const { AppError } = require("../utils/errors");
const { createErrorResponse } = require("../utils/responseBuilder");
const { logger } = require("../utils/logger");

/**
 * Middleware centralizado para tratamento de erros
 * @param {Error} err - Erro capturado
 * @param {Object} req - Request
 * @param {Object} res - Response
 * @param {Function} next - Next middleware
 */
const errorHandler = (err, req, res, next) => {
  // Log do erro
  logger.error(`${err.name}: ${err.message}`, {
    stack: err.stack,
    path: req.path,
    method: req.method,
    user: req.user ? req.user.id : "unauthenticated",
  });

  // AppError já tem o statusCode configurado
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(createErrorResponse(err.message, err.statusCode, err.errors));
  }

  // Erros de validação do Mongoose
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).reduce((acc, error) => {
      acc[error.path] = error.message;
      return acc;
    }, {});

    return res.status(400).json(createErrorResponse("Erro de validação", 400, errors));
  }

  // Erros de ID inválido do Mongoose
  if (err.name === "CastError" && err.kind === "ObjectId") {
    return res.status(400).json(createErrorResponse("ID inválido", 400));
  }

  // Erros de duplicação do Mongoose
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];

    return res.status(409).json(createErrorResponse(`${field} '${value}' já está em uso`, 409));
  }

  // Erros de SyntaxError no parsing de JSON
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json(createErrorResponse("JSON inválido", 400));
  }

  // Erro genérico para qualquer outro caso
  return res.status(500).json(createErrorResponse("Erro interno do servidor", 500));
};

module.exports = {
  errorHandler,
};
