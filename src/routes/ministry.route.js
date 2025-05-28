const express = require("express");
const router = express.Router();
const authenticator = require("../core/auth_middleware");

const ministryController = require("../app/controllers/ministry.controller");

router.get("/", authenticator, ministryController.listMinistries);
router.post("/", authenticator, ministryController.createMinistry);
router.get("/:id", authenticator, ministryController.getMinistryById);
router.put("/:id", authenticator, ministryController.updateMinistry);
router.delete("/:id", authenticator, ministryController.deleteMinistry);

module.exports = router;
