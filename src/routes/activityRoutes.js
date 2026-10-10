const express = require("express");
const controller = require("../controllers/activityController");
const authenticate = require("../middleware/authenticate");
const validate = require("../middleware/validate");
const {
  createActivitySchema,
  updateActivitySchema,
  listActivitiesSchema,
  idSchema
} = require("../validators/activityValidators");

const router = express.Router();
router.use(authenticate);

router.get("/", validate(listActivitiesSchema), controller.list);
router.get("/:id", validate(idSchema), controller.getById);
router.post("/", validate(createActivitySchema), controller.create);
router.patch("/:id", validate(updateActivitySchema), controller.update);
router.patch("/:id/complete", validate(idSchema), controller.complete);
router.delete("/:id", validate(idSchema), controller.remove);

module.exports = router;
