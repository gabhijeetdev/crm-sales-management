const express = require("express");
const controller = require("../controllers/userController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const validate = require("../middleware/validate");
const {
  createUserSchema,
  updateUserSchema,
  listUsersSchema,
  idSchema,
  setActiveSchema
} = require("../validators/userValidators");

const router = express.Router();
router.use(authenticate);

router.get("/", authorize("Admin", "Sales Manager"), validate(listUsersSchema), controller.list);
router.get("/:id", authorize("Admin", "Sales Manager"), validate(idSchema), controller.getById);
router.post("/", authorize("Admin"), validate(createUserSchema), controller.create);
router.patch("/:id", authorize("Admin"), validate(updateUserSchema), controller.update);
router.patch("/:id/status", authorize("Admin"), validate(setActiveSchema), controller.setActive);
router.delete("/:id", authorize("Admin"), validate(idSchema), controller.remove);

module.exports = router;
