const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  const endpoints = {
    message: "Bem-vindo à API Church Flow",
    version: "1.0.0",
    endpoints: {
      user: {
        base: "/user",
        routes: {
          "POST /": "Registrar novo usuário",
          "POST /login": "Realizar login",
          "GET /": "Buscar informações do usuário (requer autenticação)",
          "PUT /": "Atualizar usuário (requer autenticação)",
          "DELETE /": "Remover usuário (requer autenticação)",
        },
      },
      member: {
        base: "/member",
        routes: {
          "GET /": "Listar todos os membros (requer autenticação)",
          "POST /": "Criar novo membro (requer autenticação)",
          "GET /:id": "Buscar membro por ID (requer autenticação)",
          "PUT /:id": "Atualizar membro (requer autenticação)",
          "DELETE /:id": "Remover membro (requer autenticação)",
        },
      },
      ministry: {
        base: "/ministry",
        routes: {
          "GET /": "Listar todos os ministérios (requer autenticação)",
          "POST /": "Criar novo ministério (requer autenticação)",
          "GET /:id": "Buscar ministério por ID (requer autenticação)",
          "PUT /:id": "Atualizar ministério (requer autenticação)",
          "DELETE /:id": "Remover ministério (requer autenticação)",
        },
      },
      transaction: {
        base: "/transaction",
        routes: {
          "GET /": "Listar todas as transações (requer autenticação)",
          "POST /": "Criar nova transação (requer autenticação)",
          "GET /:id": "Buscar transação por ID (requer autenticação)",
          "PUT /:id": "Atualizar transação (requer autenticação)",
          "DELETE /:id": "Remover transação (requer autenticação)",
        },
      },
      metrics: {
        base: "/metrics",
        routes: {
          "GET /dashboard": "Obter métricas gerais (requer autenticação)",
          "GET /members": "Obter métricas de membros (requer autenticação)",
          "GET /finances": "Obter métricas financeiras (requer autenticação)",
          "GET /ministries": "Obter métricas dos ministérios (requer autenticação)",
        },
      },
    },
    documentation: "Para mais detalhes sobre cada endpoint, consulte a documentação completa",
  };

  res.status(200).json(endpoints);
});

module.exports = router;
