const transactionService = require("../services/transaction.service");

const MESSAGES = {
  TRANSACTION_GET: "Transação encontrada com sucesso",
  TRANSACTION_CREATED: "Transação cadastrada com sucesso",
  TRANSACTION_UPDATED: "Transação atualizada com sucesso",
  TRANSACTION_DELETED: "Transação excluída com sucesso",
  TRANSACTION_NOT_FOUND: "Transação não encontrada",
  SERVER_ERROR: "Erro interno do servidor",
  MISSING_FIELDS: "Campos obrigatórios não fornecidos",
  INVALID_DATE: "Formato de data inválido",
  ORPHAN_ERROR: "O atributo relacional informado está incorreto ou não existe",
  INVALID_CATEGORIES: "O campo categories deve ser um array de strings",
};

const createResponse = (res, statusCode, message, data = null) => {
  const response = { message: message };
  if (data) {
    response.data = data;
  }
  return res.status(statusCode).json(response);
};

const validateTransactionData = (transactionData) => {
  const errors = [];

  if (!transactionData.value) {
    errors.push("Valor é obrigatório");
  }

  const numericValue = Number(transactionData.value);

  if (isNaN(numericValue)) {
    errors.push("Valor deve ser um número válido");
  } else {
    if (!Number.isInteger(numericValue)) errors.push("O valor deve ser um número inteiro representando centavos");
  }

  if (!transactionData.member_id && !transactionData.ministry_id) {
    errors.push("Uma transação deve estar relacionada a um membro ou a um ministério");
  }

  if (transactionData.member_id && transactionData.ministry_id) {
    errors.push("Uma transação não pode estar relacionada a um membro e um ministério ao mesmo tempo");
  }

  if (!transactionData.user_id) {
    errors.push("ID do usuário é obrigatório");
  }

  // Validação do campo categories
  if (transactionData.categories !== undefined) {
    if (!Array.isArray(transactionData.categories)) {
      errors.push("O campo categories deve ser um array");
    } else {
      const hasInvalidCategory = transactionData.categories.some((category) => typeof category !== "string" || category.trim().length === 0);
      if (hasInvalidCategory) {
        errors.push("Todas as categorias devem ser strings não vazias");
      }
    }
  }

  return errors.length > 0 ? errors : null;
};

exports.createTransaction = async (req, res) => {
  try {
    const user_id = req.user._id;
    if (!user_id) return createResponse(res, 400, "ID do usuário é obrigatório");

    const transactionData = { user_id: user_id, ...req.body };

    const validationErrors = validateTransactionData(transactionData);
    if (validationErrors) {
      return createResponse(res, 400, validationErrors.join(", "));
    }

    const newTransaction = await transactionService.create(transactionData);

    if (!newTransaction) {
      return createResponse(res, 400, MESSAGES.ORPHAN_ERROR);
    }

    return createResponse(res, 201, MESSAGES.TRANSACTION_CREATED, newTransaction);
  } catch (error) {
    console.error("Erro ao criar transação:", error);
    return createResponse(res, 500, MESSAGES.SERVER_ERROR);
  }
};

exports.listTransactions = async (req, res) => {
  try {
    const user_id = req.user._id;
    if (!user_id) return createResponse(res, 400, "ID do usuário é obrigatório");

    const transactions = await transactionService.findAll(user_id);

    return createResponse(res, 200, `${transactions.length} transações encontradas`, transactions);
  } catch (error) {
    console.error("Erro ao listar transações:", error);
    return createResponse(res, 500, MESSAGES.SERVER_ERROR);
  }
};

exports.getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user._id;
    if (!user_id) return createResponse(res, 400, "ID do usuário é obrigatório");

    if (!id) return createResponse(res, 400, "ID da transação é obrigatório");

    const transaction = await transactionService.findById(id, user_id);

    if (!transaction) {
      return createResponse(res, 404, MESSAGES.TRANSACTION_NOT_FOUND);
    }

    return createResponse(res, 200, MESSAGES.TRANSACTION_GET, transaction);
  } catch (error) {
    console.error("Erro ao buscar transação:", error);
    return createResponse(res, 500, MESSAGES.SERVER_ERROR);
  }
};

exports.updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const user_id = req.user._id;

    if (!user_id) return createResponse(res, 400, "ID do usuário é obrigatório");
    if (!id) return createResponse(res, 400, "ID da transação é obrigatório");

    const updatedTransaction = await transactionService.update(id, updateData, user_id);

    if (updatedTransaction === false) {
      return createResponse(res, 400, MESSAGES.ORPHAN_ERROR);
    }

    if (!updatedTransaction) {
      return createResponse(res, 404, MESSAGES.TRANSACTION_NOT_FOUND);
    }

    return createResponse(res, 200, MESSAGES.TRANSACTION_UPDATED, updatedTransaction);
  } catch (error) {
    console.error("Erro ao atualizar transação:", error);
    return createResponse(res, 500, MESSAGES.SERVER_ERROR);
  }
};

exports.deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user._id;

    if (!user_id) return createResponse(res, 400, "ID do usuário é obrigatório");
    if (!id) return createResponse(res, 400, "ID da transação é obrigatório");

    const success = await transactionService.delete(id, user_id);

    if (!success) {
      return createResponse(res, 404, MESSAGES.TRANSACTION_NOT_FOUND);
    }

    return createResponse(res, 200, MESSAGES.TRANSACTION_DELETED);
  } catch (error) {
    console.error("Erro ao excluir transação:", error);
    return createResponse(res, 500, MESSAGES.SERVER_ERROR);
  }
};
