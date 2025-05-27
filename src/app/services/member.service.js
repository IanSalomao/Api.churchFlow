const Member = require("../models/member.model");

const validRole = async (id, user_id) => {
  const member = await Member.findOne({ _id: id, user_id: user_id });

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
    const members = await Member.find({ user_id }).sort({ name: 1 }).exec();

    return members;
  } catch (error) {
    throw new Error(`Erro ao listar membros: ${error.message}`);
  }
};

exports.findById = async (id, user_id) => {
  try {
    if (!(await validRole(id, user_id))) {
      console.error(`Item ${id} não encontrado ou não pertence ao usuário`);
      return null;
    }

    return await Member.find({ _id: id, user_id: user_id });
  } catch (error) {
    console.log(error);
    throw new Error(`Erro ao buscar membro: ${error.message}`);
  }
};

exports.update = async (id, updateData, user_id) => {
  try {
    if (!(await validRole(id, user_id))) {
      console.error(`Item ${id} não encontrado ou não pertence ao usuário`);
      return null;
    }

    const updatedMember = await Member.findByIdAndUpdate(id, updateData, { new: true });
    return updatedMember;
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

    await Member.findByIdAndDelete(id);
    return true;
  } catch (error) {
    throw new Error(`Erro ao excluir membro: ${error.message}`);
  }
};
