const asyncHandler = require("../utils/asyncHandler");
const activityService = require("../services/activityService");

exports.create = asyncHandler(async (req, res) => {
  const activity = await activityService.createActivity(req.user, req.body);
  res.status(201).json({ success: true, message: "Activity created successfully", data: { activity } });
});

exports.list = asyncHandler(async (req, res) => {
  const data = await activityService.listActivities(req.user, req.query);
  res.json({ success: true, message: "Activities fetched successfully", data });
});

exports.getById = asyncHandler(async (req, res) => {
  const activity = await activityService.getAccessibleActivity(req.user, req.params.id);
  res.json({ success: true, message: "Activity fetched successfully", data: { activity } });
});

exports.update = asyncHandler(async (req, res) => {
  const activity = await activityService.updateActivity(req.user, req.params.id, req.body);
  res.json({ success: true, message: "Activity updated successfully", data: { activity } });
});

exports.complete = asyncHandler(async (req, res) => {
  const activity = await activityService.completeActivity(req.user, req.params.id);
  res.json({ success: true, message: "Activity marked as completed", data: { activity } });
});

exports.remove = asyncHandler(async (req, res) => {
  await activityService.deleteActivity(req.user, req.params.id);
  res.json({ success: true, message: "Activity deleted successfully" });
});
