const Lead = require("../models/Lead");
const Customer = require("../models/Customer");
const Deal = require("../models/Deal");
const Activity = require("../models/Activity");
const User = require("../models/User");
const { DEAL_STAGES } = require("../constants");
const { isAdmin, getAccessibleUserIds, assignedToFilter } = require("../utils/access");
const ApiError = require("../utils/ApiError");

async function scoped(user) {
  const ids = await getAccessibleUserIds(user);
  return assignedToFilter(ids, user);
}

async function getSummary(user) {
  const filter = await scoped(user);
  const now = new Date();

  const [
    totalLeads,
    newLeads,
    qualifiedLeads,
    convertedLeads,
    totalCustomers,
    totalDeals,
    openDeals,
    wonDeals,
    lostDeals,
    revenueAgg,
    expectedAgg,
    pendingActivities,
    overdueActivities
  ] = await Promise.all([
    Lead.countDocuments(filter),
    Lead.countDocuments({ ...filter, status: "New" }),
    Lead.countDocuments({ ...filter, status: "Qualified" }),
    Lead.countDocuments({ ...filter, status: "Converted" }),
    Customer.countDocuments(filter),
    Deal.countDocuments(filter),
    Deal.countDocuments({ ...filter, stage: { $nin: ["Won", "Lost"] } }),
    Deal.countDocuments({ ...filter, stage: "Won" }),
    Deal.countDocuments({ ...filter, stage: "Lost" }),
    Deal.aggregate([
      { $match: { ...filter, stage: "Won" } },
      { $group: { _id: null, total: { $sum: "$value" } } }
    ]),
    Deal.aggregate([
      { $match: { ...filter, stage: { $nin: ["Won", "Lost"] } } },
      { $group: { _id: null, total: { $sum: "$expectedRevenue" } } }
    ]),
    Activity.countDocuments({
      ...filter,
      status: "Pending",
      $or: [{ dueDate: null }, { dueDate: { $gte: now } }]
    }),
    Activity.countDocuments({ ...filter, status: "Pending", dueDate: { $lt: now } })
  ]);

  const conversionRate = totalLeads === 0 ? 0 : Number(((convertedLeads / totalLeads) * 100).toFixed(2));

  return {
    totalLeads,
    newLeads,
    qualifiedLeads,
    convertedLeads,
    totalCustomers,
    totalDeals,
    openDeals,
    wonDeals,
    lostDeals,
    totalRevenue: revenueAgg[0]?.total || 0,
    expectedRevenue: expectedAgg[0]?.total || 0,
    conversionRate,
    pendingActivities,
    overdueActivities
  };
}

async function getPipeline(user) {
  const filter = await scoped(user);
  const rows = await Deal.aggregate([
    { $match: filter },
    {
      $group: {
        _id: "$stage",
        count: { $sum: 1 },
        value: { $sum: "$value" },
        expectedRevenue: { $sum: "$expectedRevenue" }
      }
    }
  ]);
  const byStage = Object.fromEntries(rows.map((row) => [row._id, row]));
  return DEAL_STAGES.map((stage) => ({
    stage,
    count: byStage[stage]?.count || 0,
    value: byStage[stage]?.value || 0,
    expectedRevenue: byStage[stage]?.expectedRevenue || 0
  }));
}

async function getTeamPerformance(user) {
  if (!isAdmin(user) && user.role !== "Sales Manager") {
    throw new ApiError(403, "Only Admin and Sales Managers can view team performance");
  }
  const ids = await getAccessibleUserIds(user);
  const members = await User.find(ids ? { _id: { $in: ids } } : { role: { $ne: "Admin" } })
    .select("name email role isActive")
    .lean();

  const memberIds = members.map((item) => item._id);
  const [leadStats, dealStats] = await Promise.all([
    Lead.aggregate([
      { $match: { assignedTo: { $in: memberIds } } },
      { $group: { _id: "$assignedTo", total: { $sum: 1 }, converted: { $sum: { $cond: [{ $eq: ["$status", "Converted"] }, 1, 0] } } } }
    ]),
    Deal.aggregate([
      { $match: { assignedTo: { $in: memberIds } } },
      {
        $group: {
          _id: "$assignedTo",
          deals: { $sum: 1 },
          won: { $sum: { $cond: [{ $eq: ["$stage", "Won"] }, 1, 0] } },
          revenue: { $sum: { $cond: [{ $eq: ["$stage", "Won"] }, "$value", 0] } },
          pipeline: { $sum: { $cond: [{ $in: ["$stage", ["Won", "Lost"]] }, 0, "$expectedRevenue"] } }
        }
      }
    ])
  ]);

  const leadsByUser = Object.fromEntries(leadStats.map((row) => [String(row._id), row]));
  const dealsByUser = Object.fromEntries(dealStats.map((row) => [String(row._id), row]));

  return members.map((member) => {
    const leads = leadsByUser[String(member._id)] || { total: 0, converted: 0 };
    const deals = dealsByUser[String(member._id)] || { deals: 0, won: 0, revenue: 0, pipeline: 0 };
    return {
      user: member,
      leads: leads.total,
      convertedLeads: leads.converted,
      deals: deals.deals,
      wonDeals: deals.won,
      revenue: deals.revenue,
      expectedRevenue: deals.pipeline
    };
  });
}

module.exports = { getSummary, getPipeline, getTeamPerformance };
