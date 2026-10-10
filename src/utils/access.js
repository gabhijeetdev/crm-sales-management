const User = require("../models/User");
const { ROLES } = require("../constants");

function isAdmin(user) {
  return user.role === ROLES.ADMIN;
}

function isManager(user) {
  return user.role === ROLES.MANAGER;
}

function isExecutive(user) {
  return user.role === ROLES.EXECUTIVE;
}

async function getAccessibleUserIds(user) {
  if (isAdmin(user)) return null;
  if (isManager(user)) {
    const reports = await User.find({ reportsTo: user._id }).select("_id");
    return [user._id, ...reports.map((item) => item._id)];
  }
  return [user._id];
}

function assignedToFilter(accessibleIds, user) {
  if (!accessibleIds) return {};
  const assigned = { assignedTo: { $in: accessibleIds } };
  if (isManager(user)) return { $or: [assigned, { assignedTo: null }] };
  return assigned;
}

function canAccessAssigned(resource, accessibleIds, user) {
  if (!accessibleIds) return true;
  if (!resource.assignedTo) return isManager(user);
  const assigned = resource.assignedTo._id || resource.assignedTo;
  return accessibleIds.some((id) => String(id) === String(assigned));
}

module.exports = {
  isAdmin,
  isManager,
  isExecutive,
  getAccessibleUserIds,
  assignedToFilter,
  canAccessAssigned
};
