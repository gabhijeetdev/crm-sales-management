const Activity = require("../models/Activity");
const Lead = require("../models/Lead");
const Customer = require("../models/Customer");
const Deal = require("../models/Deal");
const ApiError = require("../utils/ApiError");
const { TIMELINE_ACTIONS } = require("../constants");
const { isAdmin, isManager, isExecutive, getAccessibleUserIds, assignedToFilter, canAccessAssigned } = require("../utils/access");
const { paginationMeta, buildSort, searchFilter, dateRangeFilter, combineFilters } = require("../utils/pagination");
const { recordTimeline } = require("./timelineService");
const { assertActiveAssignee } = require("./userService");

const POPULATE = [
  { path: "assignedTo", select: "name email role" },
  { path: "createdBy", select: "name email role" }
];

const MODELS = { Lead, Customer, Deal };

async function assertRelatedAccess(user, relatedTo) {
  if (!relatedTo?.entityType || !relatedTo?.entityId) return;
  const Model = MODELS[relatedTo.entityType];
  if (!Model) throw new ApiError(400, "Invalid related entity type");
  const entity = await Model.findById(relatedTo.entityId);
  if (!entity) throw new ApiError(400, `${relatedTo.entityType} not found`);
  const ids = await getAccessibleUserIds(user);
  if (entity.assignedTo && !canAccessAssigned(entity, ids, user)) {
    throw new ApiError(403, `You cannot attach an activity to this ${relatedTo.entityType.toLowerCase()}`);
  }
}

function statusFilter(status) {
  const now = new Date();
  if (status === "Overdue") return { status: "Pending", dueDate: { $lt: now } };
  if (status === "Pending") return { status: "Pending", $or: [{ dueDate: null }, { dueDate: { $gte: now } }] };
  if (status === "Completed") return { status: "Completed" };
  return {};
}

async function getAccessibleActivity(user, id) {
  const activity = await Activity.findById(id).populate(POPULATE);
  if (!activity) throw new ApiError(404, "Activity not found");
  const ids = await getAccessibleUserIds(user);
  if (!canAccessAssigned(activity, ids, user) && String(activity.createdBy?._id || activity.createdBy) !== String(user._id)) {
    throw new ApiError(403, "You do not have permission to access this activity");
  }
  return activity;
}

async function createActivity(user, payload) {
  await assertRelatedAccess(user, payload.relatedTo);
  const assignedTo = isExecutive(user) ? user._id : (payload.assignedTo || user._id);
  await assertActiveAssignee(assignedTo, { manager: isManager(user) ? user : null });

  const activity = await Activity.create({
    ...payload,
    assignedTo,
    createdBy: user._id,
    status: "Pending"
  });

  let action = TIMELINE_ACTIONS.NOTE_ADDED;
  if (payload.type === "Follow-up" || payload.type === "Reminder") action = TIMELINE_ACTIONS.FOLLOW_UP_CREATED;
  else if (payload.type === "Note") action = TIMELINE_ACTIONS.NOTE_ADDED;
  else action = TIMELINE_ACTIONS.FOLLOW_UP_CREATED;

  if (payload.relatedTo?.entityId) {
    await recordTimeline({
      action,
      entityType: payload.relatedTo.entityType,
      entityId: payload.relatedTo.entityId,
      performedBy: user._id,
      newValue: { activity: activity._id, type: activity.type, title: activity.title },
      relatedEntities: [{ entityType: "Activity", entityId: activity._id }]
    });
  }
  return Activity.findById(activity._id).populate(POPULATE);
}

async function listActivities(user, query) {
  const ids = await getAccessibleUserIds(user);
  const extra = {};
  if (query.type) extra.type = query.type;
  if (query.assignedTo) extra.assignedTo = query.assignedTo;
  if (query.entityType && query.entityId) {
    extra["relatedTo.entityType"] = query.entityType;
    extra["relatedTo.entityId"] = query.entityId;
  }
  const filter = combineFilters(
    assignedToFilter(ids, user),
    searchFilter(query.search, ["title", "description"]),
    dateRangeFilter(query.from, query.to),
    statusFilter(query.status),
    extra
  );

  const sort = buildSort(query.sortBy, query.sortOrder, ["createdAt", "dueDate", "type"]);
  const [items, total] = await Promise.all([
    Activity.find(filter).sort(sort).skip((query.page - 1) * query.pageSize).limit(query.pageSize).populate(POPULATE),
    Activity.countDocuments(filter)
  ]);
  return { items, pagination: paginationMeta(total, query.page, query.pageSize) };
}

async function updateActivity(user, id, payload) {
  const activity = await getAccessibleActivity(user, id);
  if (activity.status === "Completed") throw new ApiError(400, "Completed activities cannot be edited");
  if (payload.relatedTo) await assertRelatedAccess(user, payload.relatedTo);
  ["type", "title", "description", "dueDate", "relatedTo"].forEach((field) => {
    if (payload[field] !== undefined) activity[field] = payload[field];
  });
  if (payload.assignedTo && isExecutive(user)) throw new ApiError(403, "Only Admin or Sales Manager can change assignment");
  if (payload.assignedTo) {
    await assertActiveAssignee(payload.assignedTo, { manager: isManager(user) ? user : null });
    activity.assignedTo = payload.assignedTo;
  }
  await activity.save();
  return Activity.findById(activity._id).populate(POPULATE);
}

async function completeActivity(user, id) {
  const activity = await getAccessibleActivity(user, id);
  if (activity.status === "Completed") throw new ApiError(400, "Activity is already completed");
  activity.status = "Completed";
  activity.completedAt = new Date();
  await activity.save();
  if (activity.relatedTo?.entityId) {
    await recordTimeline({
      action: TIMELINE_ACTIONS.FOLLOW_UP_COMPLETED,
      entityType: activity.relatedTo.entityType,
      entityId: activity.relatedTo.entityId,
      performedBy: user._id,
      newValue: { activity: activity._id, title: activity.title }
    });
  }
  return Activity.findById(activity._id).populate(POPULATE);
}

async function deleteActivity(user, id) {
  const activity = await getAccessibleActivity(user, id);
  if (!isAdmin(user) && String(activity.createdBy._id || activity.createdBy) !== String(user._id)) {
    throw new ApiError(403, "Only the creator or an Admin can delete this activity");
  }
  await activity.deleteOne();
  return activity;
}

module.exports = {
  getAccessibleActivity,
  createActivity,
  listActivities,
  updateActivity,
  completeActivity,
  deleteActivity
};