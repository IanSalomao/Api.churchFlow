const express = require('express');
const router = express.Router();
const autenticacao = require('../core/auth_middleware')

const ministryController = require('../app/controllers/ministry.controller');

router.get('/', autenticacao, ministryController.listMinistries);
router.post('/', autenticacao,ministryController.createMinistry);
router.get('/:id', autenticacao,ministryController.getMinistryById);
router.put("/:id", autenticacao,ministryController.updateMinistry);
router.delete("/:id", autenticacao,ministryController.deleteMinistry);

module.exports = router;
