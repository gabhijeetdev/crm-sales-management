const mongoose = require("mongoose");
const { LEAD_SOURCES, LEAD_STATUSES, PRIORITIES } = require("../constants");

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, default: "" },
    company: { type: String, trim: true, default: "" },
    source: { type: String, enum: LEAD_SOURCES, required: true },
    status: { type: String, enum: LEAD_STATUSES, default: "New", index: true },
    priority: { type: String, enum: PRIORITIES, default: "Medium", index: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    description: { type: String, trim: true, default: "", maxlength: 4000 },
    convertedAt: { type: Date, default: null },
    convertedCustomer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", default: null },
    convertedDeal: { type: mongoose.Schema.Types.ObjectId, ref: "Deal", default: null }
  },
  { timestamps: true, versionKey: false }
);

leadSchema.index({ email: 1 });
leadSchema.index({ source: 1 });
leadSchema.index({ createdAt: -1 });
leadSchema.index({ assignedTo: 1, status: 1 });
leadSchema.index({ name: 1, company: 1 });

module.exports = mongoose.model("Lead", leadSchema);
