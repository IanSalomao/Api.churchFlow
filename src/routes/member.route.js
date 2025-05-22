const express = require('express');
const router = express.Router();
const authenticator = require("../core/auth_middleware");

const memberController = require('../app/controllers/member.controller');

router.get('/', authenticator, memberController.listMembers);
router.post('/', authenticator,memberController.createMember);
router.get('/:id', authenticator,memberController.getMemberById);
router.put("/:id", authenticator,memberController.updateMember);
router.delete("/:id", authenticator,memberController.deleteMember);

module.exports = router;
