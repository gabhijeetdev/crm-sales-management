const { z } = require("zod");
const { DEAL_STAGES } = require("../constants");
const { objectId, paginationQuery, schema, idParams } = require("./common");

const createDealSchema = schema({
  body: z.object({
    name: z.string().trim().min(2).max(160),
    customer: objectId,
    lead: objectId.optional(),
    assignedTo: objectId.optional(),
    value: z.number().positive(),
    probability: z.number().min(0).max(100).optional().default(10),
    expectedClosingDate: z.coerce.date(),
    stage: z.enum(DEAL_STAGES.filter((item) => item !== "Won" && item !== "Lost")).optional(),
    description: z.string().trim().max(4000).optional().default("")
  }).strict()
});

const updateDealSchema = schema({
  params: idParams,
  body: z.object({
    name: z.string().trim().min(2).max(160).optional(),
    assignedTo: objectId.optional(),
    value: z.number().positive().optional(),
    probability: z.number().min(0).max(100).optional(),
    expectedClosingDate: z.coerce.date().optional(),
    stage: z.enum(DEAL_STAGES).optional(),
    description: z.string().trim().max(4000).optional(),
    lostReason: z.string().trim().min(3).max(1000).optional()
  }).strict()
});

const listDealsSchema = schema({
  query: paginationQuery.extend({
    stage: z.enum(DEAL_STAGES).optional(),
    assignedTo: objectId.optional(),
    customer: objectId.optional(),
    minAmount: z.coerce.number().min(0).optional(),
    maxAmount: z.coerce.number().min(0).optional(),
    closingFrom: z.coerce.date().optional(),
    closingTo: z.coerce.date().optional()
  })
});

const dealStageSchema = schema({
  params: idParams,
  body: z.object({
    stage: z.enum(DEAL_STAGES),
    lostReason: z.string().trim().min(3).max(1000).optional()
  }).strict()
});

const idSchema = schema({ params: idParams });

module.exports = { createDealSchema, updateDealSchema, listDealsSchema, dealStageSchema, idSchema };
