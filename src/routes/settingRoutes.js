const express = require("express");
const controller = require("../controllers/settingController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const validate = require("../middleware/validate");
const { updateSettingsSchema } = require("../validators/settingValidators");

const router = express.Router();
router.use(authenticate);

router.get("/", controller.get);
router.put("/", authorize("Admin"), validate(updateSettingsSchema), controller.update);

module.exports = router;
