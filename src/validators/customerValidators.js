const { z } = require("zod");
const { CUSTOMER_STATUSES } = require("../constants");
const { objectId, phone, paginationQuery, schema, idParams } = require("./common");

const createCustomerSchema = schema({
  body: z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email(),
    phone: phone.optional().default(""),
    company: z.string().trim().max(160).optional().default(""),
    address: z.string().trim().max(500).optional().default(""),
    assignedTo: objectId.optional(),
    status: z.enum(CUSTOMER_STATUSES).optional()
  }).strict()
});

const updateCustomerSchema = schema({
  params: idParams,
  body: z.object({
    name: z.string().trim().min(2).max(120).optional(),
    email: z.string().trim().email().optional(),
    phone: phone.optional(),
    company: z.string().trim().max(160).optional(),
    address: z.string().trim().max(500).optional(),
    assignedTo: objectId.optional(),
    status: z.enum(CUSTOMER_STATUSES).optional()
  }).strict()
});

const listCustomersSchema = schema({
  query: paginationQuery.extend({
    status: z.enum(CUSTOMER_STATUSES).optional(),
    assignedTo: objectId.optional()
  })
});

const idSchema = schema({ params: idParams });

module.exports = { createCustomerSchema, updateCustomerSchema, listCustomersSchema, idSchema };
