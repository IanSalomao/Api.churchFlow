const express = require('express');
const router = express.Router();
const autenticacao = require('../core/auth_middleware')

const transactionController = require('../app/controllers/transaction.controller');

router.get('/', autenticacao, transactionController.listTransactions);
router.post('/', autenticacao,transactionController.createTransaction);
router.get('/:id', autenticacao,transactionController.getTransactionById);
router.put("/:id", autenticacao,transactionController.updateTransaction);
router.delete("/:id", autenticacao,transactionController.deleteTransaction);

module.exports = router;
