const User = require("../models/user.model");


exports.register = async (name, email, password) => {
  try {
    const existingUser = await User.findOne({ where: { email } });

    if (existingUser) {
      const error = new Error("Email já cadastrado");
      error.code = 11000;
      throw error;
    }

    const newUser = await User.create({
      name,
      email,
      password,
    });

    return newUser;
  } catch (error) {
    throw error;
  }
};


exports.searchById = async (id) => {
  try {
    return await User.findByPk(id);
  } catch (error) {
    throw new Error(`Erro ao buscar usuário: ${error.message}`);
  }
};


exports.searchByEmail = async (email) => {
  try {
    return await User.findOne({ where: { email } });
  } catch (error) {
    throw new Error(`Erro ao buscar usuário por email: ${error.message}`);
  }
};


exports.update = async (id, updateData) => {
  try {
    const user = await User.findByPk(id);

    if (!user) {
      return null;
    }

    if (updateData.email && updateData.email !== user.email) {
      const existingUser = await User.findOne({
        where: { email: updateData.email },
      });

      if (existingUser) {
        const error = new Error("Email já está em uso");
        error.code = 11000;
        throw error;
      }
    }

    await user.update(updateData);
    return user;
  } catch (error) {
    if (error.code === 11000) {
      throw error;
    }
    throw new Error(`Erro ao atualizar usuário: ${error.message}`);
  }
};


exports.delete = async (id) => {
  try {
    const user = await User.findByPk(id);

    if (!user) {
      return false;
    }

    await user.destroy();
    return true;
  } catch (error) {
    throw new Error(`Erro ao excluir usuário: ${error.message}`);
  }
};


exports.sanitizeUser = (user) => {
  if (!user) return null;

  // Se for um modelo Sequelize, converte para objeto simples
  const userData = user.toJSON ? user.toJSON() : { ...user };

  // Remove a senha e outros campos sensíveis se existirem
  const { password, ...sanitizedUser } = userData;

  return sanitizedUser;
};
