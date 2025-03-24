const jwt = require("jsonwebtoken");
const { AppError } = require("../utils/errors");
const userRepository = require("../repositories/userRepository");

/**
 * Middleware para autenticação com JWT
 * @param {Object} req - Request
 * @param {Object} res - Response
 * @param {Function} next - Next middleware
 */
const authenticate = async (req, res, next) => {
  try {
    // Obter token do header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AppError("Token de autenticação não fornecido", 401);
    }

    // Verificar formato do token
    const parts = authHeader.split(" ");

    if (parts.length !== 2) {
      throw new AppError("Formato de token inválido", 401);
    }

    const [scheme, token] = parts;

    if (!/^Bearer$/i.test(scheme)) {
      throw new AppError("Formato de token inválido", 401);
    }

    // Verificar e decodificar token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Verificar se o usuário ainda existe e está ativo
      const user = await userRepository.findById(decoded.id);

      if (!user) {
        throw new AppError("Usuário não encontrado", 404);
      }

      if (!user.status) {
        throw new AppError("Usuário desativado", 403);
      }

      // Adicionar dados do usuário ao request
      req.user = {
        id: decoded.id,
        email: decoded.email,
        church_name: decoded.church_name,
      };

      return next();
    } catch (error) {
      if (error.name === "JsonWebTokenError") {
        throw new AppError("Token inválido", 401);
      }

      if (error.name === "TokenExpiredError") {
        throw new AppError("Token expirado", 401);
      }

      throw error;
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  authenticate,
};
