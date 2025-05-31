const memberService = require("../services/member.service");

const MESSAGES = {
  MEMBER_CREATED: "Membro cadastrado com sucesso",
  MEMBER_UPDATED: "Membro atualizado com sucesso",
  MEMBER_DELETED: "Membro excluído com sucesso",
  MEMBER_NOT_FOUND: "Membro não encontrado",
  SERVER_ERROR: "Erro interno do servidor",
  MISSING_FIELDS: "Campos obrigatórios não fornecidos",
  INVALID_DATE: "Formato de data inválido",
};

const createResponse = (res, statusCode, message, data = null) => {
  const response = { message: message };

  if (data) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

const validateMemberData = (memberData) => {
  const errors = [];

  if (!memberData.name) {
    errors.push("Nome é obrigatório");
  }

  if (!memberData.birth_date) {
    errors.push("Data de nascimento é obrigatória");
  }

  if (memberData.status === undefined || memberData.status === null) {
    errors.push("Status é obrigatório");
  }

  if (!memberData.user_id) {
    errors.push("ID do usuário é obrigatório");
  }

  if (memberData.birth_date && isNaN(Date.parse(memberData.birth_date))) {
    errors.push("Formato de data de nascimento inválido");
  }

  if (memberData.batism_date && isNaN(Date.parse(memberData.batism_date))) {
    errors.push("Formato de data de batismo inválido");
  }

  return errors.length > 0 ? errors : null;
};

exports.createMember = async (req, res) => {
  try {
    const user_id = req.user._id;
    if (!user_id) return createResponse(res, 400, "ID do usuário é obrigatório");

    const memberData = { user_id: user_id, ...req.body };

    const validationErrors = validateMemberData(memberData);
    if (validationErrors) {
      return createResponse(res, 400, validationErrors.join(", "));
    }

    const newMember = await memberService.create(memberData);

    return createResponse(res, 201, MESSAGES.MEMBER_CREATED, newMember);
  } catch (error) {
    console.error("Erro ao criar membro:", error);
    return createResponse(res, 500, MESSAGES.SERVER_ERROR);
  }
};

exports.listMembers = async (req, res) => {
  try {
    const user_id = req.user._id;
    if (!user_id) return createResponse(res, 400, "ID do usuário é obrigatório");

    const members = await memberService.findAll(user_id);

    return createResponse(res, 200, `${members.length} documentos encontrados`, members);
  } catch (error) {
    console.error("Erro ao listar documentos:", error);
    return createResponse(res, 500, MESSAGES.SERVER_ERROR);
  }
};

exports.getMemberById = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user._id;
    if (!user_id) return createResponse(res, 400, "ID do usuário é obrigatório");

    if (!id) return createResponse(res, 400, "ID do membro é obrigatório");

    const member = await memberService.findById(id, user_id);

    if (!member) {
      return createResponse(res, 404, MESSAGES.MEMBER_NOT_FOUND);
    }

    return createResponse(res, 200, null, member);
  } catch (error) {
    console.error("Erro ao buscar membro:", error);
    return createResponse(res, 500, MESSAGES.SERVER_ERROR);
  }
};

exports.updateMember = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const user_id = req.user._id;
    if (!user_id) return createResponse(res, 400, "ID do usuário é obrigatório");

    if (!id) {
      return createResponse(res, 400, "ID do membro é obrigatório");
    }

    if (updateData.birth_date && isNaN(Date.parse(updateData.birth_date))) {
      return createResponse(res, 400, "Formato de data de nascimento inválido");
    }

    if (updateData.batism_date && isNaN(Date.parse(updateData.batism_date))) {
      return createResponse(res, 400, "Formato de data de batismo inválido");
    }

    const updatedMember = await memberService.update(id, updateData, user_id);

    if (!updatedMember) {
      return createResponse(res, 404, MESSAGES.MEMBER_NOT_FOUND);
    }

    return createResponse(res, 200, MESSAGES.MEMBER_UPDATED, updatedMember);
  } catch (error) {
    console.error("Erro ao atualizar membro:", error);
    return createResponse(res, 500, MESSAGES.SERVER_ERROR);
  }
};

exports.deleteMember = async (req, res) => {
  try {
    const { id } = req.params;

    const user_id = req.user._id;
    if (!user_id) return createResponse(res, 400, "ID do usuário é obrigatório");

    if (!id) {
      return createResponse(res, 400, "ID do membro é obrigatório");
    }

    const success = await memberService.delete(id, user_id);

    if (!success) {
      return createResponse(res, 404, MESSAGES.MEMBER_NOT_FOUND);
    }

    return createResponse(res, 200, MESSAGES.MEMBER_DELETED);
  } catch (error) {
    console.error("Erro ao excluir membro:", error);
    return createResponse(res, 500, MESSAGES.SERVER_ERROR);
  }
};
