const jwt = require("jsonwebtoken");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

function signToken(user) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be set to a random string of at least 32 characters");
  }
  return jwt.sign(
    { sub: user._id.toString(), tokenVersion: user.tokenVersion },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );
}

exports.register = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  const exists = await User.exists({ email: normalizedEmail });
  if (exists) throw new ApiError(409, "An account with this email already exists");
  const user = await User.create({
    name, email: normalizedEmail, phone, password, role: "Sales Executive"
  });

  const token = signToken(user);
  res.status(201).json({
    success: true,
    message: "Registration successful",
    data: { user, token }
  });
});

exports.login = asyncHandler(async (req, res) => {
  const email = req.body.email.toLowerCase().trim();
  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.comparePassword(req.body.password))) {
    throw new ApiError(401, "Invalid email or password");
  }
  if (!user.isActive) throw new ApiError(403, "This account is inactive");

  res.json({
    success: true,
    message: "Login successful",
    data: { user, token: signToken(user) }
  });
});

exports.logout = asyncHandler(async (req, res) => {
  req.user.tokenVersion += 1;
  await req.user.save();
  res.json({ success: true, message: "Logged out successfully" });
});

exports.me = asyncHandler(async (req, res) => {
  res.json({ success: true, message: "Profile fetched successfully", data: { user: req.user } });
});
