const express = require('express');
const router = express.Router();
const autenticacao = require('../core/auth_middleware')

const userController = require('../app/controllers/user.controller');

router.post('/', userController.registerUser);
router.post('/login', userController.login);
router.get('/', autenticacao,userController.searchUser);
router.put("/", autenticacao, userController.updateUser);
router.delete("/", autenticacao, userController.deleteUser);

module.exports = router;
