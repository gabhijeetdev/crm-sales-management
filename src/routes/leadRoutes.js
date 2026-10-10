const express = require("express");
const controller = require("../controllers/leadController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const validate = require("../middleware/validate");
const {
  createLeadSchema,
  updateLeadSchema,
  listLeadsSchema,
  leadStatusSchema,
  assignLeadSchema,
  convertLeadSchema,
  idSchema
} = require("../validators/leadValidators");

const router = express.Router();
router.use(authenticate);

router.get("/", validate(listLeadsSchema), controller.list);
router.get("/:id", validate(idSchema), controller.getById);
router.post("/", validate(createLeadSchema), controller.create);
router.patch("/:id", validate(updateLeadSchema), controller.update);
router.patch("/:id/status", validate(leadStatusSchema), controller.updateStatus);
router.patch("/:id/assign", authorize("Admin", "Sales Manager"), validate(assignLeadSchema), controller.assign);
router.post("/:id/convert", validate(convertLeadSchema), controller.convert);
router.delete("/:id", authorize("Admin", "Sales Manager"), validate(idSchema), controller.remove);

module.exports = router;
