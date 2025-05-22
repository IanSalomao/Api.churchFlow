const transactionService = require("../services/transaction.service");

const MESSAGES = {
  MINISTRY_GET: "Transação encontrado com sucesso",
  MINISTRY_CREATED: "Transação cadastrado com sucesso",
  MINISTRY_UPDATED: "Transação atualizado com sucesso",
  MINISTRY_DELETED: "Transação excluído com sucesso",
  MINISTRY_NOT_FOUND: "Transação não encontrado",
  SERVER_ERROR: "Erro interno do servidor",
  MISSING_FIELDS: "Campos obrigatórios não fornecidos",
  INVALID_DATE: "Formato de data inválido",
  ORPHAN_ERROR: "O atributo relacional informado está incorreto ou não existe",
};


const createResponse = (res, statusCode, message, data = null) => {
  const response = { mensagem: message };

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

  if (transactionData.value !== int ) {
    errors.push("O valor de uma transação deve ser um inteiro que represente o valor em centavos");
  }

  if (!transactionData.member_id || !transactionData.ministry_id) {
    errors.push("Um transação deve está relacionada a um membro ou a um ministério");
  }

  if (transactionData.member_id || transactionData.ministry_id) {
    errors.push(
      "Um transação deve não pode estar relacionada a um membro e um ministério ao mesmo tempo"
    );
  }

  if (!transactionData.user_id) {
    errors.push("ID do usuário é obrigatório");
  }

  return errors.length > 0 ? errors : null;
};


exports.createTransaction = async (req, res) => {
  try {
  const user_id = req.user.id;
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

    return createResponse(res, 201, MESSAGES.MINISTRY_CREATED, newTransaction);
  } catch (error) {
    console.error("Erro ao criar transação:", error);
    return createResponse(res, 500, MESSAGES.SERVER_ERROR);
  }
};


exports.listTransactions = async (req, res) => {
  try {
  const user_id = req.user.id;
  if (!user_id) return createResponse(res, 400, "ID do usuário é obrigatório");

    const transactions = await transactionService.findAll(user_id);

    return createResponse(
      res,
      200,
      `${transactions.length} transaçãos encontrados`,
      transactions
    );
  } catch (error) {
    console.error("Erro ao listar transaçãos:", error);
    return createResponse(res, 500, MESSAGES.SERVER_ERROR);
  }
};


exports.getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;
    if (!user_id) return createResponse(res, 400, "ID do usuário é obrigatório");

    if (!id)
      return createResponse(res, 400, "ID do transação é obrigatório");
    

    const transaction = await transactionService.findById(id, user_id);

    if (!transaction) {
      return createResponse(res, 404, MESSAGES.MINISTRY_NOT_FOUND);
    }

    return createResponse(res, 200, MESSAGES.MINISTRY_GET, transaction);
  } catch (error) {
    console.error("Erro ao buscar transação:", error);
    return createResponse(res, 500, MESSAGES.SERVER_ERROR);
  }
};


exports.updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const user_id = req.user.id;
    if (!user_id)
      return createResponse(res, 400, "ID do usuário é obrigatório");


    if (!id) {
      return createResponse(res, 400, "ID do transação é obrigatório");
    }

    const updatedTransaction = await transactionService.update(id, updateData, user_id);

    if (updatedTransaction === false) {
      return createResponse(res, 400, MESSAGES.ORPHAN_ERROR);
    }

    if (!updatedTransaction) {
      return createResponse(res, 404, MESSAGES.MINISTRY_NOT_FOUND);
    }

    return createResponse(res, 200, MESSAGES.MINISTRY_UPDATED, updatedTransaction);
  } catch (error) {

    console.error("Erro ao atualizar transação:", error);
    return createResponse(res, 500, MESSAGES.SERVER_ERROR);
  }
};


exports.deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    const user_id = req.user.id;
    if (!user_id)
      return createResponse(res, 400, "ID do usuário é obrigatório");

    if (!id) {
      return createResponse(res, 400, "ID do transação é obrigatório");
    }

    const success = await transactionService.delete(id,user_id);

    if (!success) {
      return createResponse(res, 404, MESSAGES.MINISTRY_NOT_FOUND);
    }

    return createResponse(res, 200, MESSAGES.MINISTRY_DELETED);
  } catch (error) {
    console.error("Erro ao excluir transação:", error);
    return createResponse(res, 500, MESSAGES.SERVER_ERROR);
  }
};
