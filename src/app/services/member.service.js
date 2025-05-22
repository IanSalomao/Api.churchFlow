const Member = require("../models/member.model");

const validRole = async (id, user_id) => {
  const member = await Member.findOne({
    where: {
      id: id,
      user_id: user_id,
    },
  });

  if (!member) {
    return false;
  }

  return true;
};

exports.create = async (memberData) => {
  try {
    const newMember = await Member.create(memberData);
    return newMember;
  } catch (error) {
    throw new Error(`Erro ao criar membro: ${error.message}`);
  }
};

exports.findAll = async (user_id) => {
  try {
    const members = await Member.findAll({
      where: { user_id: user_id },
      order: [["name", "ASC"]],
    });

    return members;
  } catch (error) {
    throw new Error(`Erro ao listar membros: ${error.message}`);
  }
};

exports.findById = async (id, user_id) => {
  try {
    if (!(await validRole(id, user_id))) {
      throw new Error(`Item ${id} não encontrado ou não pertence ao usuário`);
    }

    return await Member.findByPk(id);
  } catch (error) {
    throw new Error(`Erro ao buscar membro: ${error.message}`);
  }
};

exports.update = async (id, updateData, user_id) => {
  try {
    if (!(await validRole(id, user_id))) {
      console.error(`Item ${id} não encontrado ou não pertence ao usuário`);
      return null
    }

    const member = await Member.findByPk(id);

    if (!member) {
      return null;
    }

    await member.update(updateData);
    return member;
  } catch (error) {
    throw new Error(`Erro ao atualizar membro: ${error.message}`);
  }
};

exports.delete = async (id, user_id) => {
  try {
    if (!(await validRole(id, user_id))) {
      console.error(`Item ${id} não encontrado ou não pertence ao usuário`);
      return null;
    }
    const member = await Member.findByPk(id, { where: { user_id: user_id } });

    if (!member) {
      return false;
    }

    await member.destroy();
    return true;
  } catch (error) {
    throw new Error(`Erro ao excluir membro: ${error.message}`);
  }
};
