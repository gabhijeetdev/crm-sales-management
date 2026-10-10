const express = require("express");
const controller = require("../controllers/timelineController");
const authenticate = require("../middleware/authenticate");
const validate = require("../middleware/validate");
const { getTimelineSchema } = require("../validators/timelineValidators");

const router = express.Router();
router.use(authenticate);
router.get("/:entityType/:entityId", validate(getTimelineSchema), controller.get);

module.exports = router;
