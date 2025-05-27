const ministryService = require("../services/ministry.service");

const MESSAGES = {
  MINISTRY_GET: "Ministério encontrado com sucesso",
  MINISTRY_CREATED: "Ministério cadastrado com sucesso",
  MINISTRY_UPDATED: "Ministério atualizado com sucesso",
  MINISTRY_DELETED: "Ministério excluído com sucesso",
  MINISTRY_NOT_FOUND: "Ministério não encontrado",
  SERVER_ERROR: "Erro interno do servidor",
  MISSING_FIELDS: "Campos obrigatórios não fornecidos",
  INVALID_DATE: "Formato de data inválido",
  ORPHAN_ERROR: "O atributo relacional informado está incorreto ou não existe",
};

const createResponse = (res, statusCode, message, data = null) => {
  const response = { mensagem: message };

  if (data) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

const validateMinistryData = (ministryData) => {
  const errors = [];

  if (!ministryData.name) {
    errors.push("Nome é obrigatório");
  }

  if (ministryData.status === undefined || ministryData.status === null) {
    errors.push("Status é obrigatório");
  }

  if (!ministryData.member_id) {
    errors.push("ID do membro é obrigatório");
  }

  if (!ministryData.user_id) {
    errors.push("ID do usuário é obrigatório");
  }

  return errors.length > 0 ? errors : null;
};

exports.createMinistry = async (req, res) => {
  try {
    const user_id = req.user._id;
    if (!user_id) return createResponse(res, 400, "ID do usuário é obrigatório");

    const ministryData = { user_id: user_id, ...req.body };

    const validationErrors = validateMinistryData(ministryData);
    if (validationErrors) {
      return createResponse(res, 400, validationErrors.join(", "));
    }

    const newMinistry = await ministryService.create(ministryData);

    if (!newMinistry) {
      return createResponse(res, 400, MESSAGES.ORPHAN_ERROR);
    }

    return createResponse(res, 201, MESSAGES.MINISTRY_CREATED, newMinistry);
  } catch (error) {
    console.error("Erro ao criar ministério:", error);
    return createResponse(res, 500, MESSAGES.SERVER_ERROR);
  }
};

exports.listMinistries = async (req, res) => {
  try {
    const user_id = req.user._id;
    if (!user_id) return createResponse(res, 400, "ID do usuário é obrigatório");

    const ministries = await ministryService.findAll(user_id);

    return createResponse(res, 200, `${ministries.length} ministérios encontrados`, ministries);
  } catch (error) {
    console.error("Erro ao listar ministérios:", error);
    return createResponse(res, 500, MESSAGES.SERVER_ERROR);
  }
};

exports.getMinistryById = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user._id;
    if (!user_id) return createResponse(res, 400, "ID do usuário é obrigatório");

    if (!id) return createResponse(res, 400, "ID do ministério é obrigatório");

    const ministry = await ministryService.findById(id, user_id);

    if (!ministry) {
      return createResponse(res, 404, MESSAGES.MINISTRY_NOT_FOUND);
    }

    return createResponse(res, 200, MESSAGES.MINISTRY_GET, ministry);
  } catch (error) {
    console.error("Erro ao buscar ministério:", error);
    return createResponse(res, 500, MESSAGES.SERVER_ERROR);
  }
};

exports.updateMinistry = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const user_id = req.user._id;
    if (!user_id) return createResponse(res, 400, "ID do usuário é obrigatório");

    if (!id) {
      return createResponse(res, 400, "ID do ministério é obrigatório");
    }

    const updatedMinistry = await ministryService.update(id, updateData, user_id);

    if (updatedMinistry === false) {
      return createResponse(res, 400, MESSAGES.ORPHAN_ERROR);
    }

    if (!updatedMinistry) {
      return createResponse(res, 404, MESSAGES.MINISTRY_NOT_FOUND);
    }

    return createResponse(res, 200, MESSAGES.MINISTRY_UPDATED, updatedMinistry);
  } catch (error) {
    console.error("Erro ao atualizar ministério:", error);
    return createResponse(res, 500, MESSAGES.SERVER_ERROR);
  }
};

exports.deleteMinistry = async (req, res) => {
  try {
    const { id } = req.params;

    const user_id = req.user._id;
    if (!user_id) return createResponse(res, 400, "ID do usuário é obrigatório");

    if (!id) {
      return createResponse(res, 400, "ID do ministério é obrigatório");
    }

    const success = await ministryService.delete(id, user_id);

    if (!success) {
      return createResponse(res, 404, MESSAGES.MINISTRY_NOT_FOUND);
    }

    return createResponse(res, 200, MESSAGES.MINISTRY_DELETED);
  } catch (error) {
    console.error("Erro ao excluir ministério:", error);
    return createResponse(res, 500, MESSAGES.SERVER_ERROR);
  }
};
