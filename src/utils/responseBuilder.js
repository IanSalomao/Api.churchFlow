/**
 * Cria uma resposta padronizada para a API
 * @param {boolean} success - Indicador de sucesso
 * @param {string} message - Mensagem descritiva
 * @param {any} data - Dados da resposta (opcional)
 * @param {Object} meta - Metadados adicionais (opcional)
 * @returns {Object} Resposta padronizada
 */
const createResponse = (success, message, data = null, meta = null) => {
  const response = {
    success,
    message,
  };

  if (data !== null) {
    response.data = data;
  }

  if (meta !== null) {
    response.meta = meta;
  }

  return response;
};

/**
 * Cria uma resposta de erro padronizada
 * @param {string} message - Mensagem de erro
 * @param {number} statusCode - Código HTTP
 * @param {Object} errors - Detalhes dos erros (opcional)
 * @returns {Object} Resposta de erro padronizada
 */
const createErrorResponse = (message, statusCode, errors = null) => {
  const response = {
    success: false,
    message,
    statusCode,
  };

  if (errors !== null) {
    response.errors = errors;
  }

  return response;
};

/**
 * Cria uma resposta de paginação
 * @param {boolean} success - Indicador de sucesso
 * @param {string} message - Mensagem descritiva
 * @param {Array} data - Dados paginados
 * @param {Object} pagination - Informações de paginação
 * @returns {Object} Resposta com paginação
 */
const createPaginatedResponse = (success, message, data, pagination) => {
  return {
    success,
    message,
    data,
    pagination,
  };
};

module.exports = {
  createResponse,
  createErrorResponse,
  createPaginatedResponse,
};
