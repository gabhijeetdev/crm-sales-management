const ApiError = require("../utils/ApiError");

function setProp(req, name, value) {
  Object.defineProperty(req, name, { value, writable: true, configurable: true, enumerable: true });
}

module.exports = (schema) => (req, _res, next) => {
  const result = schema.safeParse({
    body: req.body ?? {},
    query: req.query,
    params: req.params
  });
  if (!result.success) {
    return next(new ApiError(400, "Request validation failed",
      result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }))
    ));
  }
  setProp(req, "body", result.data.body);
  setProp(req, "query", result.data.query);
  setProp(req, "params", result.data.params);
  req.validated = result.data;
  next();
};

