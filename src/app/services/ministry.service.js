const Ministry = require("../models/ministry.model");

const validRole = async (id, user_id) => {
  const ministry = await Ministry.findOne({
    where: {
      id: id,
      user_id: user_id,
    },
  });

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
    if (error.parent.code === "23503") {
      return null;
    }

    throw new Error(`Erro ao criar ministério: ${error.message}`);
  }
};

exports.findAll = async (user_id) => {
  try {
    const ministries = await Ministry.findAll({
      where: { user_id: user_id },
      order: [["name", "ASC"]],
    });

    return ministries;
  } catch (error) {
    throw new Error(`Erro ao listar ministérios: ${error.message}`);
  }
};

exports.findById = async (id, user_id) => {
  try {
    if (!(await validRole(id, user_id))) {
      throw new Error(`Item ${id} não encontrado ou não pertence ao usuário`);
    }

    return await Ministry.findByPk(id);
  } catch (error) {
    throw new Error(`Erro ao buscar ministério: ${error.message}`);
  }
};

exports.update = async (id, updateData, user_id) => {
  try {
    if (!(await validRole(id, user_id))) {
      console.error(`Item ${id} não encontrado ou não pertence ao usuário`);
      return null
    }

    const ministry = await Ministry.findByPk(id);

    if (!ministry) {
      return null;
    }

    await ministry.update(updateData);
    return ministry;
  } catch (error) {
    if (error.parent.code === "23503") {
      return false;
    }
    
    throw new Error(`Erro ao atualizar ministério: ${error.message}`);
  }
};

exports.delete = async (id, user_id) => {
  try {
    if (!(await validRole(id, user_id))) {
      console.error(`Item ${id} não encontrado ou não pertence ao usuário`);
      return null;
    }
    const ministry = await Ministry.findByPk(id, { where: { user_id: user_id } });

    if (!ministry) {
      return false;
    }

    await ministry.destroy();
    return true;
  } catch (error) {
    throw new Error(`Erro ao excluir ministério: ${error.message}`);
  }
};
