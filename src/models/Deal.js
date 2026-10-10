const mongoose = require("mongoose");
const { DEAL_STAGES } = require("../constants");

const dealSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    lead: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", default: null, index: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    value: { type: Number, required: true, min: 0.01 },
    probability: { type: Number, required: true, min: 0, max: 100, default: 10 },
    expectedRevenue: { type: Number, min: 0, default: 0 },
    expectedClosingDate: { type: Date, required: true, index: true },
    stage: { type: String, enum: DEAL_STAGES, default: "Qualification", index: true },
    description: { type: String, trim: true, default: "", maxlength: 4000 },
    lostReason: { type: String, trim: true, default: "", maxlength: 1000 },
    closedAt: { type: Date, default: null }
  },
  { timestamps: true, versionKey: false }
);

dealSchema.pre("validate", function () {
  if (this.stage === "Won") {
    this.probability = 100;
    this.expectedRevenue = this.value;
  } else if (this.stage === "Lost") {
    this.probability = 0;
    this.expectedRevenue = 0;
  } else {
    this.expectedRevenue = Number((((this.value || 0) * (this.probability || 0)) / 100).toFixed(2));
  }
});

dealSchema.index({ assignedTo: 1, stage: 1 });
dealSchema.index({ createdAt: -1 });
dealSchema.index({ value: 1 });

module.exports = mongoose.model("Deal", dealSchema);
