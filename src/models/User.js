const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    phone: { type: String, trim: true, default: "" },
    password: { type: String, required: true, minlength: 8, select: false },
    role: {
      type: String,
      enum: ["Admin", "Sales Manager", "Sales Executive"],
      default: "Sales Executive",
      required: true
    },
    isActive: { type: Boolean, default: true, index: true },
    reportsTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    tokenVersion: { type: Number, default: 0 }
  },
  { timestamps: true, versionKey: false }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.set("toJSON", {
  transform(_doc, ret) {
    delete ret.password;
    delete ret.tokenVersion;
    return ret;
  }
});

userSchema.index({ role: 1, isActive: 1 });
module.exports = mongoose.model("User", userSchema);
