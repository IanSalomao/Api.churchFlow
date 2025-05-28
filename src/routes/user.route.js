const express = require("express");
const router = express.Router();
const authenticator = require("../core/auth_middleware");

const userController = require("../app/controllers/user.controller");

router.post("/", userController.registerUser);
router.post("/login", userController.login);
router.get("/", authenticator, userController.searchUser);
router.put("/", authenticator, userController.updateUser);
router.delete("/", authenticator, userController.deleteUser);

module.exports = router;
