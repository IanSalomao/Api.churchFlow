const userService = require("../services/userService");
const { AppError } = require("../utils/errors");
const { createResponse } = require("../utils/responseBuilder");

class UserController {
  /**
   * Cria um novo usuário (igreja)
   * @param {Object} req - Request
   * @param {Object} res - Response
   * @param {Function} next - Next middleware
   */
  async registerUser(req, res, next) {
    try {
      const userData = req.body;

      // Validar dados básicos
      if (!userData.church_name || !userData.email || !userData.password) {
        throw new AppError("Dados incompletos. Nome da igreja, email e senha são obrigatórios", 400);
      }

      // Criar usuário através do serviço
      const user = await userService.createUser(userData);

      // Remover dados sensíveis da resposta
      const userToReturn = {
        id: user._id,
        church_name: user.church_name,
        email: user.email,
        created_at: user.created_at,
      };

      return res.status(201).json(createResponse(true, "Usuário criado com sucesso", userToReturn));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Autentica um usuário
   * @param {Object} req - Request
   * @param {Object} res - Response
   * @param {Function} next - Next middleware
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new AppError("Email e senha são obrigatórios", 400);
      }

      const authResult = await userService.authenticateUser(email, password);

      return res.json(createResponse(true, "Login realizado com sucesso", authResult));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtém dados do usuário atual
   * @param {Object} req - Request
   * @param {Object} res - Response
   * @param {Function} next - Next middleware
   */
  async getProfile(req, res, next) {
    try {
      const userId = req.user.id;

      const user = await userService.getUserById(userId);

      return res.json(createResponse(true, "Perfil obtido com sucesso", user));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Atualiza dados do usuário
   * @param {Object} req - Request
   * @param {Object} res - Response
   * @param {Function} next - Next middleware
   */
  async updateProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const updateData = req.body;

      // Impedir atualização de campos sensíveis diretamente
      delete updateData.password_hash;
      delete updateData.salt;
      delete updateData.login_attempts;

      const updatedUser = await userService.updateUser(userId, updateData);

      return res.json(createResponse(true, "Perfil atualizado com sucesso", updatedUser));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Atualiza a senha do usuário
   * @param {Object} req - Request
   * @param {Object} res - Response
   * @param {Function} next - Next middleware
   */
  async updatePassword(req, res, next) {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        throw new AppError("Senha atual e nova senha são obrigatórias", 400);
      }

      // Verificar senha atual primeiro
      await userService.authenticateUser(req.user.email, currentPassword);

      // Atualizar senha
      await userService.updateUser(userId, { password: newPassword });

      return res.json(createResponse(true, "Senha atualizada com sucesso"));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Adiciona categoria de receita
   * @param {Object} req - Request
   * @param {Object} res - Response
   * @param {Function} next - Next middleware
   */
  async addIncomeCategory(req, res, next) {
    try {
      const userId = req.user.id;
      const categoryData = req.body;

      if (!categoryData.name) {
        throw new AppError("Nome da categoria é obrigatório", 400);
      }

      const result = await userService.addIncomeCategory(userId, categoryData);

      return res.status(201).json(
        createResponse(true, "Categoria adicionada com sucesso", {
          categories: result.income_categories,
        })
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Adiciona categoria de despesa
   * @param {Object} req - Request
   * @param {Object} res - Response
   * @param {Function} next - Next middleware
   */
  async addExpenseCategory(req, res, next) {
    try {
      const userId = req.user.id;
      const categoryData = req.body;

      if (!categoryData.name) {
        throw new AppError("Nome da categoria é obrigatório", 400);
      }

      const result = await userService.addExpenseCategory(userId, categoryData);

      return res.status(201).json(
        createResponse(true, "Categoria adicionada com sucesso", {
          categories: result.expense_categories,
        })
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();
