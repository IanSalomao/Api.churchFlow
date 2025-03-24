const BaseRepository = require("./baseRepository");
const User = require("../models/user");

class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  /**
   * Busca um usuário pelo email
   * @param {string} email - Email do usuário
   * @returns {Promise<Object>} Usuário encontrado
   */
  async findByEmail(email) {
    return await this.findOne({ email });
  }

  /**
   * Adiciona uma categoria de receita ao usuário
   * @param {string} userId - ID do usuário
   * @param {Object} categoryData - Dados da categoria
   * @returns {Promise<Object>} Usuário atualizado
   */
  async addIncomeCategory(userId, categoryData) {
    return await this.model.findByIdAndUpdate(userId, { $push: { income_categories: categoryData } }, { new: true });
  }

  /**
   * Adiciona uma categoria de despesa ao usuário
   * @param {string} userId - ID do usuário
   * @param {Object} categoryData - Dados da categoria
   * @returns {Promise<Object>} Usuário atualizado
   */
  async addExpenseCategory(userId, categoryData) {
    return await this.model.findByIdAndUpdate(userId, { $push: { expense_categories: categoryData } }, { new: true });
  }

  /**
   * Atualiza uma categoria de receita
   * @param {string} userId - ID do usuário
   * @param {string} categoryId - ID da categoria
   * @param {Object} categoryData - Novos dados da categoria
   * @returns {Promise<Object>} Usuário atualizado
   */
  async updateIncomeCategory(userId, categoryId, categoryData) {
    const updateData = {};

    // Preparar dados atualizáveis
    Object.keys(categoryData).forEach((key) => {
      updateData[`income_categories.$.${key}`] = categoryData[key];
    });

    return await this.model.findOneAndUpdate({ _id: userId, "income_categories._id": categoryId }, { $set: updateData }, { new: true });
  }

  /**
   * Atualiza uma categoria de despesa
   * @param {string} userId - ID do usuário
   * @param {string} categoryId - ID da categoria
   * @param {Object} categoryData - Novos dados da categoria
   * @returns {Promise<Object>} Usuário atualizado
   */
  async updateExpenseCategory(userId, categoryId, categoryData) {
    const updateData = {};

    // Preparar dados atualizáveis
    Object.keys(categoryData).forEach((key) => {
      updateData[`expense_categories.$.${key}`] = categoryData[key];
    });

    return await this.model.findOneAndUpdate({ _id: userId, "expense_categories._id": categoryId }, { $set: updateData }, { new: true });
  }

  /**
   * Registra uma tentativa de login
   * @param {string} userId - ID do usuário
   * @returns {Promise<Object>} Resultado da operação
   */
  async incrementLoginAttempts(userId) {
    return await this.model.findByIdAndUpdate(userId, { $inc: { login_attempts: 1 } }, { new: true });
  }

  /**
   * Reseta as tentativas de login
   * @param {string} userId - ID do usuário
   * @returns {Promise<Object>} Resultado da operação
   */
  async resetLoginAttempts(userId) {
    return await this.model.findByIdAndUpdate(userId, { login_attempts: 0 }, { new: true });
  }
}

module.exports = new UserRepository();
