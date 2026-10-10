const { z } = require("zod");
const { ENTITY_TYPES } = require("../constants");
const { objectId, paginationQuery, schema } = require("./common");

const getTimelineSchema = schema({
  params: z.object({
    entityType: z.enum(ENTITY_TYPES),
    entityId: objectId
  }),
  query: paginationQuery
});

module.exports = { getTimelineSchema };
