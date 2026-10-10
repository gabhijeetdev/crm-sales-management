const asyncHandler = require("../utils/asyncHandler");
const dealService = require("../services/dealService");

exports.create = asyncHandler(async (req, res) => {
  const deal = await dealService.createDeal(req.user, req.body);
  res.status(201).json({ success: true, message: "Deal created successfully", data: { deal } });
});

exports.list = asyncHandler(async (req, res) => {
  const data = await dealService.listDeals(req.user, req.query);
  res.json({ success: true, message: "Deals fetched successfully", data });
});

exports.getById = asyncHandler(async (req, res) => {
  const deal = await dealService.getAccessibleDeal(req.user, req.params.id);
  res.json({ success: true, message: "Deal fetched successfully", data: { deal } });
});

exports.update = asyncHandler(async (req, res) => {
  const deal = await dealService.updateDeal(req.user, req.params.id, req.body);
  res.json({ success: true, message: "Deal updated successfully", data: { deal } });
});

exports.updateStage = asyncHandler(async (req, res) => {
  const deal = await dealService.updateDealStage(req.user, req.params.id, req.body);
  res.json({ success: true, message: "Deal stage updated successfully", data: { deal } });
});

exports.remove = asyncHandler(async (req, res) => {
  await dealService.deleteDeal(req.user, req.params.id);
  res.json({ success: true, message: "Deal deleted successfully" });
});
