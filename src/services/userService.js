const User = require("../models/User");
const Lead = require("../models/Lead");
const Customer = require("../models/Customer");
const Deal = require("../models/Deal");
const Activity = require("../models/Activity");
const ApiError = require("../utils/ApiError");
const { ROLES } = require("../constants");
const { isAdmin, isManager } = require("../utils/access");
const { paginationMeta, buildSort, searchFilter, combineFilters } = require("../utils/pagination");

async function assertActiveAssignee(userId, { executiveOnly = false, manager = null } = {}) {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(400, "Assigned user was not found");
  if (!user.isActive) throw new ApiError(400, "Assigned user is inactive");
  if (executiveOnly && user.role !== ROLES.EXECUTIVE) {
    throw new ApiError(400, "Leads can only be assigned to Sales Executives");
  }
  if (manager && user.role === ROLES.EXECUTIVE && String(user.reportsTo || "") !== String(manager._id)) {
    throw new ApiError(403, "You can only assign work to executives on your team");
  }
  return user;
}

async function createUser(payload) {
  const email = payload.email.toLowerCase().trim();
  if (await User.exists({ email })) throw new ApiError(409, "An account with this email already exists");

  if (payload.reportsTo) {
    const manager = await User.findById(payload.reportsTo);
    if (!manager || manager.role !== ROLES.MANAGER || !manager.isActive) {
      throw new ApiError(400, "reportsTo must be an active Sales Manager");
    }
  }

  return User.create({
    name: payload.name,
    email,
    phone: payload.phone || "",
    password: payload.password,
    role: payload.role,
    isActive: payload.isActive ?? true,
    reportsTo: payload.role === ROLES.EXECUTIVE ? payload.reportsTo || null : null
  });
}

async function listUsers(actor, query) {
  const { page, pageSize, sortBy, sortOrder, search, role, isActive } = query;
  const extra = {};
  if (role) extra.role = role;
  if (typeof isActive === "boolean") extra.isActive = isActive;
  const teamScope = !isAdmin(actor) && isManager(actor)
    ? { $or: [{ _id: actor._id }, { reportsTo: actor._id }] }
    : {};
  const filter = combineFilters(searchFilter(search, ["name", "email", "phone"]), extra, teamScope);

  const sort = buildSort(sortBy, sortOrder, ["createdAt", "name", "email", "role"]);
  const [items, total] = await Promise.all([
    User.find(filter)
      .sort(sort)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate("reportsTo", "name email role")
      .lean(),
    User.countDocuments(filter)
  ]);
  return { items, pagination: paginationMeta(total, page, pageSize) };
}

async function getUser(actor, id) {
  const user = await User.findById(id).populate("reportsTo", "name email role");
  if (!user) throw new ApiError(404, "User not found");
  if (!isAdmin(actor) && isManager(actor)) {
    const allowed = String(user._id) === String(actor._id) || String(user.reportsTo?._id || user.reportsTo) === String(actor._id);
    if (!allowed) throw new ApiError(403, "You do not have permission to view this user");
  }
  return user;
}

async function updateUser(id, payload, actorId) {
  const user = await User.findById(id).select("+password");
  if (!user) throw new ApiError(404, "User not found");

  if (payload.email && payload.email.toLowerCase() !== user.email) {
    const exists = await User.exists({ email: payload.email.toLowerCase(), _id: { $ne: id } });
    if (exists) throw new ApiError(409, "An account with this email already exists");
    user.email = payload.email.toLowerCase();
  }

  if (payload.name !== undefined) user.name = payload.name;
  if (payload.phone !== undefined) user.phone = payload.phone;
  if (payload.role !== undefined) {
    if (String(user._id) === String(actorId) && payload.role !== ROLES.ADMIN) {
      throw new ApiError(400, "You cannot remove your own Admin role");
    }
    user.role = payload.role;
  }
  if (payload.password) user.password = payload.password;
  if (payload.reportsTo !== undefined) {
    if (payload.reportsTo) {
      const manager = await User.findById(payload.reportsTo);
      if (!manager || manager.role !== ROLES.MANAGER || !manager.isActive) {
        throw new ApiError(400, "reportsTo must be an active Sales Manager");
      }
      user.reportsTo = payload.reportsTo;
    } else {
      user.reportsTo = null;
    }
  }
  if (user.role !== ROLES.EXECUTIVE) user.reportsTo = null;
  await user.save();
  return User.findById(id).populate("reportsTo", "name email role");
}

async function setUserActive(id, isActive, actorId) {
  if (String(id) === String(actorId) && !isActive) {
    throw new ApiError(400, "You cannot deactivate your own account");
  }
  const user = await User.findByIdAndUpdate(id, { isActive }, { new: true });
  if (!user) throw new ApiError(404, "User not found");
  if (!isActive) {
    user.tokenVersion += 1;
    await user.save();
  }
  return user;
}

async function deleteUser(id, actorId) {
  if (String(id) === String(actorId)) throw new ApiError(400, "You cannot delete your own account");
  const user = await User.findById(id);
  if (!user) throw new ApiError(404, "User not found");

  const [leads, customers, deals, activities, reports] = await Promise.all([
    Lead.exists({ assignedTo: id }),
    Customer.exists({ assignedTo: id }),
    Deal.exists({ assignedTo: id }),
    Activity.exists({ assignedTo: id }),
    User.exists({ reportsTo: id })
  ]);
  if (leads || customers || deals || activities || reports) {
    throw new ApiError(409, "User still has assigned records or team members. Reassign them or deactivate the user instead.");
  }
  await user.deleteOne();
  return user;
}

module.exports = {
  assertActiveAssignee,
  createUser,
  listUsers,
  getUser,
  updateUser,
  setUserActive,
  deleteUser
};
