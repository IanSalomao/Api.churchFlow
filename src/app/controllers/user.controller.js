const userService = require("../services/user.service");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const MESSAGES = {
  USER_REGISTERED: "Usuário cadastrado com sucesso",
  USER_NOT_FOUND: "Usuário não encontrado",
  INVALID_PASSWORD: "Senha inválida",
  WELCOME: "Olá, ",
  USER_UPDATED: "Usuário atualizado com sucesso",
  USER_DELETED: "Usuário excluído com sucesso",
  SERVER_ERROR: "Erro interno do servidor",
  USER_GET: "Dados do usuário listados",
};

const generateToken = (user) => {
  return jwt.sign({ user }, process.env.CHAVE_SECRETA, { expiresIn: "12h" });
};

const createResponse = (res, statusCode, message, data = null) => {
  const response = { message: message };

  if (data) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

exports.registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return createResponse(res, 400, "Nome, email e senha são obrigatórios");
    }

    const hashPassword = await bcrypt.hash(password, 10);
    const user = await userService.register(name, email, hashPassword);
    const token = generateToken(user);

    return createResponse(res, 201, MESSAGES.USER_REGISTERED, { user, token });
  } catch (error) {
    if (error.code === 11000 || error.message.includes("duplicate")) {
      return createResponse(res, 409, "Email já cadastrado");
    }

    console.error("Erro ao registrar usuário:", error);
    return createResponse(res, 500, MESSAGES.SERVER_ERROR);
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return createResponse(res, 400, "Email e senha são obrigatórios");
    }

    const user = await userService.searchByEmail(email);

    if (!user) {
      return createResponse(res, 404, MESSAGES.USER_NOT_FOUND);
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return createResponse(res, 401, MESSAGES.INVALID_PASSWORD);
    }

    const token = generateToken(user);

    return createResponse(res, 200, MESSAGES.WELCOME + user.name, { token });
  } catch (error) {
    console.error("Erro ao fazer login:", error);
    return createResponse(res, 500, MESSAGES.SERVER_ERROR);
  }
};

exports.searchUser = async (req, res) => {
  try {
    const { _id } = req.user;

    if (!_id) {
      return createResponse(res, 400, "ID do usuário é obrigatório");
    }

    const user = await userService.searchById(_id);

    if (!user) {
      return createResponse(res, 404, MESSAGES.USER_NOT_FOUND);
    }

    return createResponse(res, 200, MESSAGES.USER_GET, user);
  } catch (error) {
    console.error("Erro ao buscar usuário:", error);
    return createResponse(res, 500, MESSAGES.SERVER_ERROR);
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { _id } = req.user;

    if (!_id) {
      return createResponse(res, 400, "ID do usuário é obrigatório");
    }

    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    const updatedUser = await userService.update(_id, updateData);

    if (!updatedUser) {
      return createResponse(res, 404, MESSAGES.USER_NOT_FOUND);
    }

    const { password, ...userWithoutPassword } = updatedUser.toObject ? updatedUser.toObject() : updatedUser;

    return createResponse(res, 200, MESSAGES.USER_UPDATED, userWithoutPassword);
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error);
    return createResponse(res, 500, MESSAGES.SERVER_ERROR);
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { _id } = req.user;

    if (!_id) {
      return createResponse(res, 400, "ID do usuário é obrigatório");
    }

    const success = await userService.delete(_id);

    if (!success) {
      return createResponse(res, 404, MESSAGES.USER_NOT_FOUND);
    }

    return createResponse(res, 200, MESSAGES.USER_DELETED);
  } catch (error) {
    console.error("Erro ao excluir usuário:", error);
    return createResponse(res, 500, MESSAGES.SERVER_ERROR);
  }
};
