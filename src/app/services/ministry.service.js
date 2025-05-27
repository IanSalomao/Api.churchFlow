const Ministry = require("../models/ministry.model");

const validRole = async (id, user_id) => {
  const ministry = await Ministry.findOne({ _id: id, user_id: user_id });

  if (!ministry) {
    return false;
  }

  return true;
};

exports.create = async (ministryData) => {
  try {
    const newMinistry = await Ministry.create(ministryData);
    return newMinistry;
  } catch (error) {
    throw new Error(`Erro ao criar ministério: ${error.message}`);
  }
};

exports.findAll = async (user_id) => {
  try {
    const ministries = await Ministry.find({ user_id }).sort({ name: 1 }).exec();

    return ministries;
  } catch (error) {
    throw new Error(`Erro ao listar ministérios: ${error.message}`);
  }
};

exports.findById = async (id, user_id) => {
  try {
    if (!(await validRole(id, user_id))) {
      console.error(`Item ${id} não encontrado ou não pertence ao usuário`);
      return null;
    }

    return await Ministry.find({ _id: id, user_id: user_id });
  } catch (error) {
    console.error(error);
    throw new Error(`Erro ao buscar ministério: ${error.message}`);
  }
};

exports.update = async (id, updateData, user_id) => {
  try {
    if (!(await validRole(id, user_id))) {
      console.error(`Item ${id} não encontrado ou não pertence ao usuário`);
      return null;
    }

    const updatedMinistry = await Ministry.findByIdAndUpdate(id, updateData, {
      new: true,
    });
    return updatedMinistry;
  } catch (error) {
    throw new Error(`Erro ao atualizar ministério: ${error.message}`);
  }
};

exports.delete = async (id, user_id) => {
  try {
    if (!(await validRole(id, user_id))) {
      console.error(`Item ${id} não encontrado ou não pertence ao usuário`);
      return null;
    }

    await Ministry.findByIdAndDelete(id);
    return true;
  } catch (error) {
    throw new Error(`Erro ao excluir ministério: ${error.message}`);
  }
};
