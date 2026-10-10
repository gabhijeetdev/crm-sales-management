const express = require("express");
const controller = require("../controllers/customerController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const validate = require("../middleware/validate");
const {
  createCustomerSchema,
  updateCustomerSchema,
  listCustomersSchema,
  idSchema
} = require("../validators/customerValidators");

const router = express.Router();
router.use(authenticate);

router.get("/", validate(listCustomersSchema), controller.list);
router.get("/:id", validate(idSchema), controller.getById);
router.post("/", validate(createCustomerSchema), controller.create);
router.patch("/:id", validate(updateCustomerSchema), controller.update);
router.delete("/:id", authorize("Admin"), validate(idSchema), controller.remove);

module.exports = router;
