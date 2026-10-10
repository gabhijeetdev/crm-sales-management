const asyncHandler = require("../utils/asyncHandler");
const dashboardService = require("../services/dashboardService");

exports.summary = asyncHandler(async (req, res) => {
  const data = await dashboardService.getSummary(req.user);
  res.json({ success: true, message: "Dashboard summary fetched successfully", data });
});

exports.pipeline = asyncHandler(async (req, res) => {
  const data = await dashboardService.getPipeline(req.user);
  res.json({ success: true, message: "Sales pipeline fetched successfully", data: { stages: data } });
});

exports.team = asyncHandler(async (req, res) => {
  const data = await dashboardService.getTeamPerformance(req.user);
  res.json({ success: true, message: "Team performance fetched successfully", data: { members: data } });
});
