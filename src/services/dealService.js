const Deal = require("../models/Deal");
const Customer = require("../models/Customer");
const ApiError = require("../utils/ApiError");
const { CLOSED_DEAL_STAGES, TIMELINE_ACTIONS } = require("../constants");
const { isManager, isExecutive, getAccessibleUserIds, assignedToFilter, canAccessAssigned } = require("../utils/access");
const { paginationMeta, buildSort, searchFilter, dateRangeFilter, combineFilters } = require("../utils/pagination");
const { recordTimeline } = require("./timelineService");
const { assertActiveAssignee } = require("./userService");

const POPULATE = [
  { path: "assignedTo", select: "name email role" },
  { path: "customer", select: "name email company" },
  { path: "lead", select: "name email status" }
];

function assertClosingDate(date) {
  const value = new Date(date);
  const min = new Date();
  min.setFullYear(min.getFullYear() - 5);
  const max = new Date();
  max.setFullYear(max.getFullYear() + 5);
  if (value < min || value > max) {
    throw new ApiError(400, "Expected closing date must be within 5 years of today");
  }
}

function applyStageRules(deal, nextStage, extra = {}) {
  if (CLOSED_DEAL_STAGES.includes(deal.stage) && nextStage !== deal.stage) {
    throw new ApiError(400, "A closed Won or Lost deal cannot move back to another stage");
  }
  if (nextStage === "Won") {
    if (!deal.value || deal.value <= 0) throw new ApiError(400, "A Won deal must have a value greater than zero");
    if (!deal.expectedClosingDate) throw new ApiError(400, "A Won deal must have an expected closing date");
    deal.lostReason = "";
    deal.closedAt = new Date();
  }
  if (nextStage === "Lost") {
    const reason = extra.lostReason || deal.lostReason;
    if (!reason || !String(reason).trim()) throw new ApiError(400, "A Lost deal must include a lost reason");
    deal.lostReason = reason.trim();
    deal.closedAt = new Date();
  }
  deal.stage = nextStage;
}

async function getAccessibleDeal(user, id) {
  const deal = await Deal.findById(id).populate(POPULATE);
  if (!deal) throw new ApiError(404, "Deal not found");
  const ids = await getAccessibleUserIds(user);
  if (!canAccessAssigned(deal, ids, user)) throw new ApiError(403, "You do not have permission to access this deal");
  return deal;
}

async function createDeal(user, payload) {
  const customer = await Customer.findById(payload.customer);
  if (!customer) throw new ApiError(400, "Customer not found");
  const ids = await getAccessibleUserIds(user);
  if (!canAccessAssigned(customer, ids, user)) throw new ApiError(403, "You cannot create a deal for this customer");

  if (payload.lead && customer.lead && String(payload.lead) !== String(customer.lead)) {
    throw new ApiError(400, "Lead does not match the customer's original lead");
  }
  assertClosingDate(payload.expectedClosingDate);
  let assignedTo = payload.assignedTo || customer.assignedTo || user._id;
  if (isExecutive(user)) {
    assignedTo = user._id;
  } else if (payload.assignedTo) {
    await assertActiveAssignee(payload.assignedTo, { manager: isManager(user) ? user : null });
  }

  const deal = await Deal.create({
    ...payload,
    assignedTo,
    lead: payload.lead || customer.lead || null
  });
  await recordTimeline({
    action: TIMELINE_ACTIONS.DEAL_CREATED,
    entityType: "Deal",
    entityId: deal._id,
    performedBy: user._id,
    relatedEntities: [
      { entityType: "Customer", entityId: customer._id },
      ...(deal.lead ? [{ entityType: "Lead", entityId: deal.lead }] : [])
    ],
    newValue: { name: deal.name, value: deal.value }
  });
  return Deal.findById(deal._id).populate(POPULATE);
}

async function listDeals(user, query) {
  const ids = await getAccessibleUserIds(user);
  const extra = {};
  if (query.stage) extra.stage = query.stage;
  if (query.assignedTo) extra.assignedTo = query.assignedTo;
  if (query.customer) extra.customer = query.customer;
  if (query.minAmount || query.maxAmount) {
    extra.value = {};
    if (query.minAmount) extra.value.$gte = query.minAmount;
    if (query.maxAmount) extra.value.$lte = query.maxAmount;
  }
  const filter = combineFilters(
    assignedToFilter(ids, user),
    searchFilter(query.search, ["name", "description", "lostReason"]),
    dateRangeFilter(query.from, query.to),
    dateRangeFilter(query.closingFrom, query.closingTo, "expectedClosingDate"),
    extra
  );

  const sort = buildSort(query.sortBy, query.sortOrder, ["createdAt", "value", "expectedClosingDate", "probability", "stage"]);
  const [items, total] = await Promise.all([
    Deal.find(filter).sort(sort).skip((query.page - 1) * query.pageSize).limit(query.pageSize).populate(POPULATE).lean(),
    Deal.countDocuments(filter)
  ]);
  return { items, pagination: paginationMeta(total, query.page, query.pageSize) };
}

async function updateDeal(user, id, payload) {
  const deal = await getAccessibleDeal(user, id);
  const previousStage = deal.stage;
  const related = [
    { entityType: "Customer", entityId: deal.customer?._id || deal.customer },
    ...(deal.lead ? [{ entityType: "Lead", entityId: deal.lead._id || deal.lead }] : [])
  ];
  const previousAssignee = deal.assignedTo?._id || deal.assignedTo;
  if (CLOSED_DEAL_STAGES.includes(deal.stage) && payload.stage && payload.stage !== deal.stage) {
    throw new ApiError(400, "A closed Won or Lost deal cannot move back to another stage");
  }
  if (CLOSED_DEAL_STAGES.includes(deal.stage) &&
      ["name", "value", "probability", "expectedClosingDate", "assignedTo", "lostReason"].some((f) => payload[f] !== undefined)) {
    throw new ApiError(400, "Closed deals cannot be modified");
  }

  if (payload.expectedClosingDate) assertClosingDate(payload.expectedClosingDate);
  ["name", "value", "probability", "expectedClosingDate", "description", "lostReason"].forEach((field) => {
    if (payload[field] !== undefined) deal[field] = payload[field];
  });
  if (payload.value !== undefined && payload.value <= 0) throw new ApiError(400, "Deal value must be greater than zero");
  if (payload.assignedTo && isExecutive(user)) throw new ApiError(403, "Only Admin or Sales Manager can change assignment");
  if (payload.assignedTo) {
    await assertActiveAssignee(payload.assignedTo, { manager: isManager(user) ? user : null });
    deal.assignedTo = payload.assignedTo;
  }
  if (payload.stage && payload.stage !== deal.stage) {
    applyStageRules(deal, payload.stage, payload);
  }
  await deal.save();

  if (payload.assignedTo) {
    await recordTimeline({
      action: TIMELINE_ACTIONS.DEAL_ASSIGNED,
      entityType: "Deal",
      entityId: deal._id,
      performedBy: user._id,
      previousValue: previousAssignee,
      newValue: payload.assignedTo,
      relatedEntities: related
    });
  }

  if (payload.stage && ["Won", "Lost"].includes(payload.stage)) {
    await recordTimeline({
      action: payload.stage === "Won" ? TIMELINE_ACTIONS.DEAL_WON : TIMELINE_ACTIONS.DEAL_LOST,
      entityType: "Deal",
      entityId: deal._id,
      performedBy: user._id,
      previousValue: previousStage,
      newValue: payload.stage === "Won" ? { value: deal.value } : { reason: deal.lostReason },
      relatedEntities: related
    });
  } else if (payload.stage) {
    await recordTimeline({
      action: TIMELINE_ACTIONS.DEAL_STAGE_CHANGED,
      entityType: "Deal",
      entityId: deal._id,
      performedBy: user._id,
      previousValue: previousStage,
      newValue: deal.stage,
      relatedEntities: related
    });
  }
  return Deal.findById(deal._id).populate(POPULATE);
}

async function updateDealStage(user, id, { stage, lostReason }) {
  return updateDeal(user, id, { stage, lostReason });
}

async function deleteDeal(user, id) {
  const deal = await getAccessibleDeal(user, id);
  if (deal.stage === "Won") throw new ApiError(400, "Won deals cannot be deleted");
  await deal.deleteOne();
  return deal;
}

module.exports = {
  assertClosingDate,
  getAccessibleDeal,
  createDeal,
  listDeals,
  updateDeal,
  updateDealStage,
  deleteDeal
};