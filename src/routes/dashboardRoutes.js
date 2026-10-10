const express = require("express");
const controller = require("../controllers/dashboardController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");

const router = express.Router();
router.use(authenticate);

router.get("/", controller.summary);
router.get("/pipeline", controller.pipeline);
router.get("/team", authorize("Admin", "Sales Manager"), controller.team);

module.exports = router;
