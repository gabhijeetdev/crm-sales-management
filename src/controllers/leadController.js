const asyncHandler = require("../utils/asyncHandler");
const leadService = require("../services/leadService");

exports.create = asyncHandler(async (req, res) => {
  const lead = await leadService.createLead(req.user, req.body);
  res.status(201).json({ success: true, message: "Lead created successfully", data: { lead } });
});

exports.list = asyncHandler(async (req, res) => {
  const data = await leadService.listLeads(req.user, req.query);
  res.json({ success: true, message: "Leads fetched successfully", data });
});

exports.getById = asyncHandler(async (req, res) => {
  const lead = await leadService.getAccessibleLead(req.user, req.params.id);
  res.json({ success: true, message: "Lead fetched successfully", data: { lead } });
});

exports.update = asyncHandler(async (req, res) => {
  const lead = await leadService.updateLead(req.user, req.params.id, req.body);
  res.json({ success: true, message: "Lead updated successfully", data: { lead } });
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const lead = await leadService.updateLeadStatus(req.user, req.params.id, req.body.status);
  res.json({ success: true, message: "Lead status updated successfully", data: { lead } });
});

exports.assign = asyncHandler(async (req, res) => {
  const lead = await leadService.assignLead(req.user, req.params.id, req.body.assignedTo);
  res.json({ success: true, message: "Lead assigned successfully", data: { lead } });
});

exports.convert = asyncHandler(async (req, res) => {
  const data = await leadService.convertLead(req.user, req.params.id, req.body);
  res.json({ success: true, message: "Lead converted successfully", data });
});

exports.remove = asyncHandler(async (req, res) => {
  await leadService.deleteLead(req.user, req.params.id);
  res.json({ success: true, message: "Lead deleted successfully" });
});
