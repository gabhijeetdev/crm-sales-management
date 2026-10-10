const { z } = require("zod");
const { ACTIVITY_TYPES, ACTIVITY_STATUSES } = require("../constants");
const { objectId, paginationQuery, schema, idParams } = require("./common");

const relatedTo = z.object({
  entityType: z.enum(["Lead", "Customer", "Deal"]),
  entityId: objectId
}).optional();

const createActivitySchema = schema({
  body: z.object({
    type: z.enum(ACTIVITY_TYPES),
    title: z.string().trim().min(2).max(160),
    description: z.string().trim().max(4000).optional().default(""),
    assignedTo: objectId.optional(),
    dueDate: z.coerce.date().optional().nullable(),
    relatedTo
  }).strict()
});

const updateActivitySchema = schema({
  params: idParams,
  body: z.object({
    type: z.enum(ACTIVITY_TYPES).optional(),
    title: z.string().trim().min(2).max(160).optional(),
    description: z.string().trim().max(4000).optional(),
    assignedTo: objectId.optional(),
    dueDate: z.coerce.date().optional().nullable(),
    relatedTo
  }).strict()
});

const listActivitiesSchema = schema({
  query: paginationQuery.extend({
    type: z.enum(ACTIVITY_TYPES).optional(),
    status: z.enum(ACTIVITY_STATUSES).optional(),
    assignedTo: objectId.optional(),
    entityType: z.enum(["Lead", "Customer", "Deal"]).optional(),
    entityId: objectId.optional()
  })
});

const idSchema = schema({ params: idParams });

module.exports = { createActivitySchema, updateActivitySchema, listActivitiesSchema, idSchema };
