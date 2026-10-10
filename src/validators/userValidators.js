const { z } = require("zod");
const { ROLES } = require("../constants");
const { objectId, phone, paginationQuery, schema, idParams } = require("./common");

const createUserSchema = schema({
  body: z.object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(254),
    phone: phone.optional().default(""),
    password: z.string().min(8).max(72),
    role: z.enum([ROLES.ADMIN, ROLES.MANAGER, ROLES.EXECUTIVE]),
    isActive: z.boolean().optional().default(true),
    reportsTo: objectId.optional().nullable()
  }).strict()
});

const updateUserSchema = schema({
  params: idParams,
  body: z.object({
    name: z.string().trim().min(2).max(100).optional(),
    email: z.string().trim().email().max(254).optional(),
    phone: phone.optional(),
    password: z.string().min(8).max(72).optional(),
    role: z.enum([ROLES.ADMIN, ROLES.MANAGER, ROLES.EXECUTIVE]).optional(),
    reportsTo: objectId.optional().nullable()
  }).strict()
});

const listUsersSchema = schema({
  query: paginationQuery.extend({
    role: z.enum([ROLES.ADMIN, ROLES.MANAGER, ROLES.EXECUTIVE]).optional(),
    isActive: z.preprocess((value) => {
      if (value === "true") return true;
      if (value === "false") return false;
      return value;
    }, z.boolean().optional())
  })
});

const idSchema = schema({ params: idParams });

const setActiveSchema = schema({
  params: idParams,
  body: z.object({ isActive: z.boolean() }).strict()
});

module.exports = { createUserSchema, updateUserSchema, listUsersSchema, idSchema, setActiveSchema };
