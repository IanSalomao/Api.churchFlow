/**
 * Repositório base para operações CRUD
 * Implementando o Repository Pattern
 */
class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  /**
   * Cria um novo documento
   * @param {Object} data - Dados a serem inseridos
   * @returns {Promise<Object>} Documento criado
   */
  async create(data) {
    const newDocument = new this.model(data);
    return await newDocument.save();
  }

  /**
   * Encontra um documento pelo ID
   * @param {string} id - ID do documento
   * @param {string} projection - Campos a serem retornados (opcional)
   * @returns {Promise<Object>} Documento encontrado
   */
  async findById(id, projection = "") {
    return await this.model.findById(id, projection).lean();
  }

  /**
   * Busca documentos que correspondem a um filtro
   * @param {Object} filter - Filtro de busca
   * @param {Object} options - Opções adicionais (sort, limit, skip, etc)
   * @returns {Promise<Array>} Array de documentos
   */
  async find(filter = {}, options = {}) {
    const { sort, limit, skip, projection } = options;

    let query = this.model.find(filter);

    if (projection) query = query.select(projection);
    if (sort) query = query.sort(sort);
    if (skip) query = query.skip(skip);
    if (limit) query = query.limit(limit);

    return await query.lean();
  }

  /**
   * Encontra um único documento que corresponda ao filtro
   * @param {Object} filter - Filtro de busca
   * @param {string} projection - Campos a serem retornados
   * @returns {Promise<Object>} Documento encontrado
   */
  async findOne(filter, projection = "") {
    return await this.model.findOne(filter, projection).lean();
  }

  /**
   * Atualiza um documento pelo ID
   * @param {string} id - ID do documento
   * @param {Object} update - Dados de atualização
   * @param {Object} options - Opções (como new: true)
   * @returns {Promise<Object>} Documento atualizado
   */
  async updateById(id, update, options = { new: true }) {
    return await this.model.findByIdAndUpdate(id, update, options);
  }

  /**
   * Atualiza documentos que correspondam a um filtro
   * @param {Object} filter - Filtro para documentos a serem atualizados
   * @param {Object} update - Dados de atualização
   * @returns {Promise<Object>} Resultado da operação
   */
  async updateMany(filter, update) {
    return await this.model.updateMany(filter, update);
  }

  /**
   * Remove um documento pelo ID
   * @param {string} id - ID do documento
   * @returns {Promise<Object>} Resultado da operação
   */
  async deleteById(id) {
    return await this.model.findByIdAndDelete(id);
  }

  /**
   * Remove documentos que correspondam a um filtro
   * @param {Object} filter - Filtro para documentos a serem removidos
   * @returns {Promise<Object>} Resultado da operação
   */
  async deleteMany(filter) {
    return await this.model.deleteMany(filter);
  }

  /**
   * Conta documentos que correspondam a um filtro
   * @param {Object} filter - Filtro de contagem
   * @returns {Promise<number>} Contagem de documentos
   */
  async count(filter = {}) {
    return await this.model.countDocuments(filter);
  }

  /**
   * Executa uma agregação
   * @param {Array} pipeline - Pipeline de agregação
   * @returns {Promise<Array>} Resultado da agregação
   */
  async aggregate(pipeline) {
    return await this.model.aggregate(pipeline);
  }
}

module.exports = BaseRepository;
