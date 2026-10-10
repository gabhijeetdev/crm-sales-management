const mongoose = require("mongoose");
const { CUSTOMER_STATUSES } = require("../constants");

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, default: "" },
    company: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "", maxlength: 500 },
    lead: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", default: undefined, unique: true, sparse: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    status: { type: String, enum: CUSTOMER_STATUSES, default: "Active", index: true }
  },
  { timestamps: true, versionKey: false }
);

customerSchema.index({ email: 1 });
customerSchema.index({ createdAt: -1 });
customerSchema.index({ assignedTo: 1, status: 1 });

module.exports = mongoose.model("Customer", customerSchema);
