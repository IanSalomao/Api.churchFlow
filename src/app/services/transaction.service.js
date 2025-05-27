const Transaction = require("../models/transaction.model");

const validRole = async (id, user_id) => {
  const transaction = await Transaction.findOne({
    _id: id,
    user_id: user_id,
  });

  if (!transaction) {
    return false;
  }

  return true;
};

exports.create = async (transactionData) => {
  try {
    const newTransaction = await Transaction.create(transactionData);
    return newTransaction;
  } catch (error) {
    if (error.name === "ValidationError") {
      return null;
    }
    throw new Error(`Erro ao criar transação: ${error.message}`);
  }
};

exports.findAll = async (user_id) => {
  try {
    const transactions = await Transaction.find({ user_id }).sort({ date: -1 }).populate("member_id").populate("ministry_id");

    return transactions;
  } catch (error) {
    throw new Error(`Erro ao listar transações: ${error.message}`);
  }
};

exports.findById = async (id, user_id) => {
  try {
    if (!(await validRole(id, user_id))) {
      throw new Error(`Item ${id} não encontrado ou não pertence ao usuário`);
    }

    return await Transaction.findById(id).populate("member_id").populate("ministry_id");
  } catch (error) {
    throw new Error(`Erro ao buscar transação: ${error.message}`);
  }
};

exports.update = async (id, updateData, user_id) => {
  try {
    if (!(await validRole(id, user_id))) {
      console.error(`Item ${id} não encontrado ou não pertence ao usuário`);
      return null;
    }

    const transaction = await Transaction.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
      .populate("member_id")
      .populate("ministry_id");

    return transaction;
  } catch (error) {
    if (error.name === "ValidationError") {
      return false;
    }
    throw new Error(`Erro ao atualizar transação: ${error.message}`);
  }
};

exports.delete = async (id, user_id) => {
  try {
    if (!(await validRole(id, user_id))) {
      console.error(`Item ${id} não encontrado ou não pertence ao usuário`);
      return null;
    }

    const transaction = await Transaction.findOneAndDelete({
      _id: id,
      user_id: user_id,
    });

    return !!transaction;
  } catch (error) {
    throw new Error(`Erro ao excluir transação: ${error.message}`);
  }
};
