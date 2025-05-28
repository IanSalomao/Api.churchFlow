const express = require("express");
const router = express.Router();
const authenticator = require("../core/auth_middleware");

const transactionController = require("../app/controllers/transaction.controller");

router.get("/", authenticator, transactionController.listTransactions);
router.post("/", authenticator, transactionController.createTransaction);
router.get("/:id", authenticator, transactionController.getTransactionById);
router.put("/:id", authenticator, transactionController.updateTransaction);
router.delete("/:id", authenticator, transactionController.deleteTransaction);

module.exports = router;
