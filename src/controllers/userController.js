const asyncHandler = require("../utils/asyncHandler");
const userService = require("../services/userService");

exports.create = asyncHandler(async (req, res) => {
  const user = await userService.createUser(req.body);
  res.status(201).json({ success: true, message: "User created successfully", data: { user } });
});

exports.list = asyncHandler(async (req, res) => {
  const data = await userService.listUsers(req.user, req.query);
  res.json({ success: true, message: "Users fetched successfully", data });
});

exports.getById = asyncHandler(async (req, res) => {
  const user = await userService.getUser(req.user, req.params.id);
  res.json({ success: true, message: "User fetched successfully", data: { user } });
});

exports.update = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(req.params.id, req.body, req.user._id);
  res.json({ success: true, message: "User updated successfully", data: { user } });
});

exports.setActive = asyncHandler(async (req, res) => {
  const user = await userService.setUserActive(req.params.id, req.body.isActive, req.user._id);
  res.json({
    success: true,
    message: req.body.isActive ? "User activated successfully" : "User deactivated successfully",
    data: { user }
  });
});

exports.remove = asyncHandler(async (req, res) => {
  await userService.deleteUser(req.params.id, req.user._id);
  res.json({ success: true, message: "User deleted successfully" });
});
