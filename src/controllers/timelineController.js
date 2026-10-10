const asyncHandler = require("../utils/asyncHandler");
const timelineService = require("../services/timelineService");
const leadService = require("../services/leadService");
const customerService = require("../services/customerService");
const dealService = require("../services/dealService");
const activityService = require("../services/activityService");
const userService = require("../services/userService");
const ApiError = require("../utils/ApiError");

const accessors = {
  Lead: (user, id) => leadService.getAccessibleLead(user, id),
  Customer: (user, id) => customerService.getAccessibleCustomer(user, id),
  Deal: (user, id) => dealService.getAccessibleDeal(user, id),
  Activity: (user, id) => activityService.getAccessibleActivity(user, id),
  User: (user, id) => userService.getUser(user, id)
};

exports.get = asyncHandler(async (req, res) => {
  const { entityType, entityId } = req.params;
  const accessor = accessors[entityType];
  if (!accessor) throw new ApiError(400, "Unsupported entity type");
  await accessor(req.user, entityId);
  const data = await timelineService.getTimeline({ entityType, entityId, ...req.query });
  res.json({ success: true, message: "Timeline fetched successfully", data });
});
