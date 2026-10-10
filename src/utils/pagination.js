function paginationMeta(total, page, pageSize) {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize) || 1)
  };
}

function buildSort(sortBy, sortOrder, allowed) {
  const field = allowed.includes(sortBy) ? sortBy : "createdAt";
  return { [field]: sortOrder === "asc" ? 1 : -1 };
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function searchFilter(search, fields) {
  if (!search) return {};
  const rx = new RegExp(escapeRegex(search), "i");
  return { $or: fields.map((field) => ({ [field]: rx })) };
}

function dateRangeFilter(from, to, field = "createdAt") {
  if (!from && !to) return {};
  const range = {};
  if (from) range.$gte = new Date(from);
  if (to) range.$lte = new Date(to);
  return { [field]: range };
}

function combineFilters(...parts) {
  const cleaned = parts.filter((part) => part && Object.keys(part).length > 0);
  if (cleaned.length === 0) return {};
  if (cleaned.length === 1) return cleaned[0];
  return { $and: cleaned };
}

module.exports = { paginationMeta, buildSort, escapeRegex, searchFilter, dateRangeFilter, combineFilters };
