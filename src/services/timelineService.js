const Timeline = require("../models/Timeline");
const { paginationMeta, buildSort } = require("../utils/pagination");

async function recordTimeline(payload, session) {
  const docs = await Timeline.create([payload], session ? { session } : {});
  return docs[0];
}

async function getTimeline({ entityType, entityId, page, pageSize, sortBy, sortOrder }) {
  const filter = {
    $or: [
      { entityType, entityId },
      { relatedEntities: { $elemMatch: { entityType, entityId } } }
    ]
  };
  const sort = buildSort(sortBy, sortOrder, ["createdAt"]);
  const [items, total] = await Promise.all([
    Timeline.find(filter)
      .sort(sort)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate("performedBy", "name email role")
      .lean(),
    Timeline.countDocuments(filter)
  ]);
  return { items, pagination: paginationMeta(total, page, pageSize) };
}

module.exports = { recordTimeline, getTimeline };
