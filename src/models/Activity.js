const mongoose = require("mongoose");
const { ACTIVITY_TYPES, ACTIVITY_STATUSES, ENTITY_TYPES } = require("../constants");

const activitySchema = new mongoose.Schema(
  {
    type: { type: String, enum: ACTIVITY_TYPES, required: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, default: "", maxlength: 4000 },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    dueDate: { type: Date, default: null, index: true },
    status: { type: String, enum: ACTIVITY_STATUSES.filter((item) => item !== "Overdue"), default: "Pending", index: true },
    relatedTo: {
      entityType: { type: String, enum: ENTITY_TYPES.filter((item) => item !== "User" && item !== "Activity") },
      entityId: { type: mongoose.Schema.Types.ObjectId }
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    completedAt: { type: Date, default: null }
  },
  { timestamps: true, versionKey: false }
);

activitySchema.index({ "relatedTo.entityType": 1, "relatedTo.entityId": 1 });
activitySchema.index({ dueDate: 1, status: 1 });
activitySchema.index({ createdAt: -1 });

activitySchema.methods.effectiveStatus = function () {
  if (this.status === "Pending" && this.dueDate && this.dueDate < new Date()) return "Overdue";
  return this.status;
};

activitySchema.set("toJSON", {
  transform(_doc, ret) {
    if (ret.status === "Pending" && ret.dueDate && new Date(ret.dueDate) < new Date()) {
      ret.status = "Overdue";
    }
    return ret;
  }
});

module.exports = mongoose.model("Activity", activitySchema);
