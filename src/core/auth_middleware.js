const jwt = require("jsonwebtoken");
require("dotenv").config();

const MESSAGES = {
  TOKEN_MISSING: "Token de autenticação não fornecido",
  TOKEN_INVALID: "Token de autenticação inválido ou expirado",
  TOKEN_FORMAT_INVALID: "Formato de token inválido. Use: Bearer [token]",
  AUTHORIZATION_HEADER_MISSING: "Cabeçalho de autorização não fornecido",
};

const authenticator = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res
        .status(401)
        .json({ mensagem: MESSAGES.AUTHORIZATION_HEADER_MISSING });
    }

    const parts = authHeader.split(" ");

    if (parts.length !== 2) {
      return res.status(401).json({ mensagem: MESSAGES.TOKEN_FORMAT_INVALID });
    }

    const [scheme, token] = parts;

    if (!/^Bearer$/i.test(scheme)) {
      return res.status(401).json({ mensagem: MESSAGES.TOKEN_FORMAT_INVALID });
    }

    if (!token) {
      return res.status(401).json({ mensagem: MESSAGES.TOKEN_MISSING });
    }

    jwt.verify(token, process.env.CHAVE_SECRETA, (erro, decoded) => {
      if (erro) {
        console.error("Erro na verificação do token:", erro.message);
        return res.status(401).json({ mensagem: MESSAGES.TOKEN_INVALID });
      }

      req.user = decoded.user;

      return next();
    });
  } catch (error) {
    console.error("Erro no middleware de autenticação:", error);
    return res.status(500).json({ mensagem: "Erro interno no servidor" });
  }
};

module.exports = authenticator;
