const { z } = require("zod");

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid ObjectId");
const phone = z.string().trim().max(30).regex(/^[+]?[\d\s\-()]{7,20}$|^$/, "Invalid phone number");

const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().trim().optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  search: z.string().trim().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional()
});

function schema({ body = z.object({}).passthrough(), query = z.object({}).passthrough(), params = z.object({}).passthrough() }) {
  return z.object({ body, query, params });
}

const idParams = z.object({ id: objectId });

module.exports = { objectId, phone, paginationQuery, schema, idParams };
