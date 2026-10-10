const { z } = require("zod");
const { LEAD_SOURCES, LEAD_STATUSES, PRIORITIES } = require("../constants");
const { objectId, phone, paginationQuery, schema, idParams } = require("./common");

const createLeadSchema = schema({
  body: z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email(),
    phone: phone.optional().default(""),
    company: z.string().trim().max(160).optional().default(""),
    source: z.enum(LEAD_SOURCES),
    status: z.enum(LEAD_STATUSES.filter((item) => item !== "Converted")).optional(),
    priority: z.enum(PRIORITIES).optional(),
    assignedTo: objectId.optional(),
    description: z.string().trim().max(4000).optional().default("")
  }).strict()
});

const updateLeadSchema = schema({
  params: idParams,
  body: z.object({
    name: z.string().trim().min(2).max(120).optional(),
    email: z.string().trim().email().optional(),
    phone: phone.optional(),
    company: z.string().trim().max(160).optional(),
    source: z.enum(LEAD_SOURCES).optional(),
    status: z.enum(LEAD_STATUSES.filter((item) => item !== "Converted")).optional(),
    priority: z.enum(PRIORITIES).optional(),
    description: z.string().trim().max(4000).optional()
  }).strict()
});

const listLeadsSchema = schema({
  query: paginationQuery.extend({
    status: z.enum(LEAD_STATUSES).optional(),
    priority: z.enum(PRIORITIES).optional(),
    source: z.enum(LEAD_SOURCES).optional(),
    assignedTo: objectId.optional()
  })
});

const leadStatusSchema = schema({
  params: idParams,
  body: z.object({ status: z.enum(LEAD_STATUSES.filter((item) => item !== "Converted")) }).strict()
});

const assignLeadSchema = schema({
  params: idParams,
  body: z.object({ assignedTo: objectId }).strict()
});

const convertLeadSchema = schema({
  params: idParams,
  body: z.object({
    customerName: z.string().trim().min(2).max(120).optional(),
    customerEmail: z.string().trim().email().optional(),
    customerPhone: phone.optional(),
    company: z.string().trim().max(160).optional(),
    address: z.string().trim().max(500).optional(),
    dealName: z.string().trim().min(2).max(160).optional(),
    dealValue: z.number().positive(),
    probability: z.number().min(0).max(100).optional(),
    expectedClosingDate: z.coerce.date(),
    description: z.string().trim().max(4000).optional()
  }).strict()
});

const idSchema = schema({ params: idParams });

module.exports = {
  createLeadSchema,
  updateLeadSchema,
  listLeadsSchema,
  leadStatusSchema,
  assignLeadSchema,
  convertLeadSchema,
  idSchema
};
