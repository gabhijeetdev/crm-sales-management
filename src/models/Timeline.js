const mongoose = require("mongoose");
const { ENTITY_TYPES } = require("../constants");

const timelineSchema = new mongoose.Schema(
  {
    action: { type: String, required: true, trim: true },
    entityType: { type: String, enum: ENTITY_TYPES, required: true, index: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    previousValue: { type: mongoose.Schema.Types.Mixed, default: null },
    newValue: { type: mongoose.Schema.Types.Mixed, default: null },
    relatedEntities: [
      {
        entityType: { type: String, enum: ENTITY_TYPES },
        entityId: { type: mongoose.Schema.Types.ObjectId }
      }
    ]
  },
  { timestamps: true, versionKey: false }
);

timelineSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
timelineSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Timeline", timelineSchema);
