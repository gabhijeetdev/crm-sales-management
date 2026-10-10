const asyncHandler = require("../utils/asyncHandler");
const customerService = require("../services/customerService");

exports.create = asyncHandler(async (req, res) => {
  const customer = await customerService.createCustomer(req.user, req.body);
  res.status(201).json({ success: true, message: "Customer created successfully", data: { customer } });
});

exports.list = asyncHandler(async (req, res) => {
  const data = await customerService.listCustomers(req.user, req.query);
  res.json({ success: true, message: "Customers fetched successfully", data });
});

exports.getById = asyncHandler(async (req, res) => {
  const customer = await customerService.getAccessibleCustomer(req.user, req.params.id);
  res.json({ success: true, message: "Customer fetched successfully", data: { customer } });
});

exports.update = asyncHandler(async (req, res) => {
  const customer = await customerService.updateCustomer(req.user, req.params.id, req.body);
  res.json({ success: true, message: "Customer updated successfully", data: { customer } });
});

exports.remove = asyncHandler(async (req, res) => {
  await customerService.deleteCustomer(req.user, req.params.id);
  res.json({ success: true, message: "Customer deleted successfully" });
});
