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
  { path: "lead", select: "name email status company" }
];

async function getAccessibleCustomer(user, id) {
  const customer = await Customer.findById(id).populate(POPULATE);
  if (!customer) throw new ApiError(404, "Customer not found");
  const ids = await getAccessibleUserIds(user);
  if (!canAccessAssigned(customer, ids, user)) throw new ApiError(403, "You do not have permission to access this customer");
  return customer;
}

async function createCustomer(user, payload) {
  let assignedTo = payload.assignedTo || user._id;
  if (isExecutive(user)) {
    assignedTo = user._id;
  } else if (payload.assignedTo) {
    await assertActiveAssignee(payload.assignedTo, { manager: isManager(user) ? user : null });
  }
  const customer = await Customer.create({
    ...payload,
    email: payload.email.toLowerCase(),
    assignedTo
  });
  await recordTimeline({
    action: TIMELINE_ACTIONS.CUSTOMER_CREATED,
    entityType: "Customer",
    entityId: customer._id,
    performedBy: user._id,
    newValue: { name: customer.name }
  });
  return Customer.findById(customer._id).populate(POPULATE);
}

async function listCustomers(user, query) {
  const ids = await getAccessibleUserIds(user);
  const extra = {};
  if (query.status) extra.status = query.status;
  if (query.assignedTo) extra.assignedTo = query.assignedTo;
  const filter = combineFilters(
    assignedToFilter(ids, user),
    searchFilter(query.search, ["name", "email", "phone", "company"]),
    dateRangeFilter(query.from, query.to),
    extra
  );

  const sort = buildSort(query.sortBy, query.sortOrder, ["createdAt", "name", "email"]);
  const [items, total] = await Promise.all([
    Customer.find(filter).sort(sort).skip((query.page - 1) * query.pageSize).limit(query.pageSize).populate(POPULATE).lean(),
    Customer.countDocuments(filter)
  ]);
  return { items, pagination: paginationMeta(total, query.page, query.pageSize) };
}

async function updateCustomer(user, id, payload) {
  const customer = await getAccessibleCustomer(user, id);
  ["name", "email", "phone", "company", "address", "status"].forEach((field) => {
    if (payload[field] !== undefined) {
      customer[field] = field === "email" ? payload[field].toLowerCase() : payload[field];
    }
  });
  if (payload.assignedTo && isExecutive(user)) throw new ApiError(403, "Only Admin or Sales Manager can change assignment");
  if (payload.assignedTo) {
    await assertActiveAssignee(payload.assignedTo, { manager: isManager(user) ? user : null });
    customer.assignedTo = payload.assignedTo;
  }
  await customer.save();
  return Customer.findById(customer._id).populate(POPULATE);
}

async function deleteCustomer(user, id) {
  if (!isAdmin(user)) throw new ApiError(403, "Only Admin can delete customers");
  const customer = await Customer.findById(id);
  if (!customer) throw new ApiError(404, "Customer not found");
  const openDeals = await Deal.countDocuments({ customer: id, stage: { $nin: ["Won", "Lost"] } });
  if (openDeals > 0) throw new ApiError(400, "Cannot delete a customer with open deals");
  await customer.deleteOne();
  return customer;
}

module.exports = {
  getAccessibleCustomer,
  createCustomer,
  listCustomers,
  updateCustomer,
  deleteCustomer
};