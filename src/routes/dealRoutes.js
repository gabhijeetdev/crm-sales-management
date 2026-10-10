const express = require("express");
const controller = require("../controllers/dealController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const validate = require("../middleware/validate");
const {
  createDealSchema,
  updateDealSchema,
  listDealsSchema,
  dealStageSchema,
  idSchema
} = require("../validators/dealValidators");

const router = express.Router();
router.use(authenticate);

router.get("/", validate(listDealsSchema), controller.list);
router.get("/:id", validate(idSchema), controller.getById);
router.post("/", validate(createDealSchema), controller.create);
router.patch("/:id", validate(updateDealSchema), controller.update);
router.patch("/:id/stage", validate(dealStageSchema), controller.updateStage);
router.delete("/:id", authorize("Admin", "Sales Manager"), validate(idSchema), controller.remove);

module.exports = router;
