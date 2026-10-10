const ROLES = {
  ADMIN: "Admin",
  MANAGER: "Sales Manager",
  EXECUTIVE: "Sales Executive"
};

const LEAD_SOURCES = ["Website", "Referral", "Social Media", "Email", "Phone", "Other"];
const LEAD_STATUSES = ["New", "Contacted", "Qualified", "Unqualified", "Converted", "Lost"];
const PRIORITIES = ["Low", "Medium", "High"];

const CUSTOMER_STATUSES = ["Active", "Inactive"];

const DEAL_STAGES = ["Qualification", "Discovery", "Proposal", "Negotiation", "Won", "Lost"];
const CLOSED_DEAL_STAGES = ["Won", "Lost"];

const ACTIVITY_TYPES = ["Call", "Email", "Meeting", "Demo", "Follow-up", "Reminder", "Note"];
const ACTIVITY_STATUSES = ["Pending", "Completed", "Overdue"];

const ENTITY_TYPES = ["Lead", "Customer", "Deal", "User", "Activity"];

const TIMELINE_ACTIONS = {
  LEAD_CREATED: "Lead created",
  LEAD_ASSIGNED: "Lead assigned",
  LEAD_REASSIGNED: "Lead reassigned",
  LEAD_STATUS_CHANGED: "Lead status changed",
  LEAD_PRIORITY_CHANGED: "Lead priority changed",
  NOTE_ADDED: "Note added",
  FOLLOW_UP_CREATED: "Follow-up created",
  FOLLOW_UP_COMPLETED: "Follow-up completed",
  CUSTOMER_CREATED: "Customer created",
  LEAD_CONVERTED: "Lead converted",
  DEAL_CREATED: "Deal created",
  DEAL_STAGE_CHANGED: "Deal stage changed",
  DEAL_ASSIGNED: "Deal assigned",
  DEAL_WON: "Deal won",
  DEAL_LOST: "Deal lost"
};

module.exports = {
  ROLES,
  LEAD_SOURCES,
  LEAD_STATUSES,
  PRIORITIES,
  CUSTOMER_STATUSES,
  DEAL_STAGES,
  CLOSED_DEAL_STAGES,
  ACTIVITY_TYPES,
  ACTIVITY_STATUSES,
  ENTITY_TYPES,
  TIMELINE_ACTIONS
};
