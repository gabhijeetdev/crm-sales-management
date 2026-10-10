const asyncHandler = require("../utils/asyncHandler");
const settingService = require("../services/settingService");

exports.get = asyncHandler(async (_req, res) => {
  const settings = await settingService.getSettings();
  res.json({ success: true, message: "Settings fetched successfully", data: { settings } });
});

exports.update = asyncHandler(async (req, res) => {
  const settings = await settingService.updateSettings(req.body);
  res.json({ success: true, message: "Settings updated successfully", data: { settings } });
});
