const ApiError = require("../utils/ApiError");

module.exports = (err, _req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";
  let details = err.details;

  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed";
    details = Object.values(err.errors).map((item) => item.message);
  } else if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid resource ID";
  } else if (err.code === 11000) {
    statusCode = 409;
    message = "A record with this value already exists";
    details = Object.keys(err.keyValue || {});
  } else if (err instanceof ApiError) {
    statusCode = err.statusCode;
  }

  if (statusCode >= 500) {
    console.error(err);
  } else if (process.env.NODE_ENV !== "production") {
    console.warn(`${statusCode} ${message}`);
  }

  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 && process.env.NODE_ENV === "production"
      ? "Internal server error"
      : message,
    ...(details ? { details } : {})
  });
};
