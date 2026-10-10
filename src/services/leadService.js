const mongoose = require("mongoose");
const Lead = require("../models/Lead");
const Customer = require("../models/Customer");
const Deal = require("../models/Deal");
const ApiError = require("../utils/ApiError");
const { TIMELINE_ACTIONS } = require("../constants");
const { isManager, isExecutive, getAccessibleUserIds, assignedToFilter, canAccessAssigned } = require("../utils/access");
const { paginationMeta, buildSort, searchFilter, dateRangeFilter, combineFilters } = require("../utils/pagination");
const { recordTimeline } = require("./timelineService");
const { assertActiveAssignee } = require("./userService");
const { assertClosingDate } = require("./dealService");

const POPULATE = [
  { path: "assignedTo", select: "name email role" },
  { path: "convertedCustomer", select: "name email company" },
  { path: "convertedDeal", select: "name value stage" }
];

const LEAD_TRANSITIONS = {
  New: ["Contacted", "Qualified", "Unqualified", "Lost"],
  Contacted: ["Qualified", "Unqualified", "Lost"],
  Qualified: ["Contacted", "Unqualified", "Lost"],
  Unqualified: ["Contacted", "Lost"],
  Lost: ["Contacted"],
  Converted: []
};

async function getAccessibleLead(user, id) {
  const lead = await Lead.findById(id).populate(POPULATE);
  if (!lead) throw new ApiError(404, "Lead not found");
  const ids = await getAccessibleUserIds(user);
  if (!canAccessAssigned(lead, ids, user)) throw new ApiError(403, "You do not have permission to access this lead");
  return lead;
}

async function createLead(user, payload) {
  let assignedTo = payload.assignedTo || null;
  if (isExecutive(user)) {
    assignedTo = user._id;
  } else if (assignedTo) {
    await assertActiveAssignee(assignedTo, {
      executiveOnly: true,
      manager: isManager(user) ? user : null
    });
  }

  const lead = await Lead.create({ ...payload, email: payload.email.toLowerCase(), assignedTo });
  await recordTimeline({
    action: TIMELINE_ACTIONS.LEAD_CREATED,
    entityType: "Lead",
    entityId: lead._id,
    performedBy: user._id,
    newValue: { name: lead.name, status: lead.status }
  });
  if (assignedTo) {
    await recordTimeline({
      action: TIMELINE_ACTIONS.LEAD_ASSIGNED,
      entityType: "Lead",
      entityId: lead._id,
      performedBy: user._id,
      newValue: { assignedTo }
    });
  }
  return Lead.findById(lead._id).populate(POPULATE);
}

async function listLeads(user, query) {
  const ids = await getAccessibleUserIds(user);
  const extra = {};
  if (query.status) extra.status = query.status;
  if (query.priority) extra.priority = query.priority;
  if (query.source) extra.source = query.source;
  if (query.assignedTo) extra.assignedTo = query.assignedTo;
  const filter = combineFilters(
    assignedToFilter(ids, user),
    searchFilter(query.search, ["name", "email", "phone", "company"]),
    dateRangeFilter(query.from, query.to),
    extra
  );

  const sort = buildSort(query.sortBy, query.sortOrder, ["createdAt", "updatedAt", "name", "priority", "status"]);
  const [items, total] = await Promise.all([
    Lead.find(filter).sort(sort).skip((query.page - 1) * query.pageSize).limit(query.pageSize).populate(POPULATE).lean(),
    Lead.countDocuments(filter)
  ]);
  return { items, pagination: paginationMeta(total, query.page, query.pageSize) };
}

async function updateLead(user, id, payload) {
  const lead = await getAccessibleLead(user, id);
  if (lead.status === "Converted") throw new ApiError(400, "Converted leads cannot be edited");

  const previousPriority = lead.priority;
  const previousStatus = lead.status;

  if (payload.status === "Converted") {
    throw new ApiError(400, "Use the convert endpoint to convert a qualified lead");
  }
  if (payload.status && payload.status !== lead.status &&
      !LEAD_TRANSITIONS[lead.status].includes(payload.status)) {
    throw new ApiError(400, `Cannot change lead status from ${lead.status} to ${payload.status}`);
  }

  ["name", "email", "phone", "company", "source", "description", "priority", "status"].forEach((field) => {
    if (payload[field] !== undefined) lead[field] = field === "email" ? payload[field].toLowerCase() : payload[field];
  });

  await lead.save();

  if (payload.priority && payload.priority !== previousPriority) {
    await recordTimeline({
      action: TIMELINE_ACTIONS.LEAD_PRIORITY_CHANGED,
      entityType: "Lead",
      entityId: lead._id,
      performedBy: user._id,
      previousValue: previousPriority,
      newValue: lead.priority
    });
  }
  if (payload.status && payload.status !== previousStatus) {
    await recordTimeline({
      action: TIMELINE_ACTIONS.LEAD_STATUS_CHANGED,
      entityType: "Lead",
      entityId: lead._id,
      performedBy: user._id,
      previousValue: previousStatus,
      newValue: lead.status
    });
  }
  return Lead.findById(lead._id).populate(POPULATE);
}

async function updateLeadStatus(user, id, status) {
  return updateLead(user, id, { status });
}

async function assignLead(user, id, assignedTo) {
  const lead = await getAccessibleLead(user, id);
  if (lead.status === "Converted") throw new ApiError(400, "Converted leads cannot be reassigned");
  const assignee = await assertActiveAssignee(assignedTo, {
    executiveOnly: true,
    manager: isManager(user) ? user : null
  });

  const previous = lead.assignedTo;
  const action = previous ? TIMELINE_ACTIONS.LEAD_REASSIGNED : TIMELINE_ACTIONS.LEAD_ASSIGNED;
  lead.assignedTo = assignee._id;
  await lead.save();
  await recordTimeline({
    action,
    entityType: "Lead",
    entityId: lead._id,
    performedBy: user._id,
    previousValue: previous,
    newValue: assignee._id
  });
  return Lead.findById(lead._id).populate(POPULATE);
}

async function deleteLead(user, id) {
  const lead = await getAccessibleLead(user, id);
  if (lead.status === "Converted") throw new ApiError(400, "Converted leads cannot be deleted");
  await lead.deleteOne();
  return lead;
}

async function convertLead(user, id, payload) {
  const lead = await getAccessibleLead(user, id);
  if (lead.status === "Converted") throw new ApiError(409, "This lead has already been converted");
  if (lead.status !== "Qualified") throw new ApiError(400, "Only qualified leads can be converted");
  assertClosingDate(payload.expectedClosingDate);

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const [customer] = await Customer.create([{
      name: payload.customerName || lead.name,
      email: (payload.customerEmail || lead.email).toLowerCase(),
      phone: payload.customerPhone || lead.phone,
      company: payload.company || lead.company,
      address: payload.address || "",
      lead: lead._id,
      assignedTo: lead.assignedTo || user._id,
      status: "Active"
    }], { session });

    const [deal] = await Deal.create([{
      name: payload.dealName || `${lead.company || lead.name} Deal`,
      lead: lead._id,
      customer: customer._id,
      assignedTo: lead.assignedTo || user._id,
      value: payload.dealValue,
      probability: payload.probability ?? 20,
      expectedClosingDate: payload.expectedClosingDate,
      stage: "Qualification",
      description: payload.description || lead.description
    }], { session });

    lead.status = "Converted";
    lead.convertedAt = new Date();
    lead.convertedCustomer = customer._id;
    lead.convertedDeal = deal._id;
    await lead.save({ session });

    await recordTimeline({
      action: TIMELINE_ACTIONS.CUSTOMER_CREATED,
      entityType: "Customer",
      entityId: customer._id,
      performedBy: user._id,
      relatedEntities: [{ entityType: "Lead", entityId: lead._id }],
      newValue: { name: customer.name }
    }, session);
    await recordTimeline({
      action: TIMELINE_ACTIONS.DEAL_CREATED,
      entityType: "Deal",
      entityId: deal._id,
      performedBy: user._id,
      relatedEntities: [
        { entityType: "Lead", entityId: lead._id },
        { entityType: "Customer", entityId: customer._id }
      ],
      newValue: { name: deal.name, value: deal.value }
    }, session);
    await recordTimeline({
      action: TIMELINE_ACTIONS.LEAD_CONVERTED,
      entityType: "Lead",
      entityId: lead._id,
      performedBy: user._id,
      relatedEntities: [
        { entityType: "Customer", entityId: customer._id },
        { entityType: "Deal", entityId: deal._id }
      ],
      newValue: { customer: customer._id, deal: deal._id }
    }, session);

    await session.commitTransaction();
    return {
      lead: await Lead.findById(lead._id).populate(POPULATE),
      customer,
      deal
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

module.exports = {
  getAccessibleLead,
  createLead,
  listLeads,
  updateLead,
  updateLeadStatus,
  assignLead,
  deleteLead,
  convertLead
};