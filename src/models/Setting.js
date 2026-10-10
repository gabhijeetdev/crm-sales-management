const mongoose = require("mongoose");

const settingSchema = new mongoose.Schema(
  {
    companyName: { type: String, trim: true, default: "CRM Company", maxlength: 120 },
    currency: { type: String, trim: true, default: "INR", maxlength: 8 },
    timezone: { type: String, trim: true, default: "Asia/Kolkata", maxlength: 64 },
    fiscalYearStartMonth: { type: Number, min: 1, max: 12, default: 4 }
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("Setting", settingSchema);
