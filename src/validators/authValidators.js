const { z } = require("zod");

const registerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(254),
    phone: z.string().trim().max(30).optional().default(""),
    password: z.string().min(8).max(72)
  }).strict(),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough()
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().email(),
    password: z.string().min(1)
  }).strict(),
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough()
});

module.exports = { registerSchema, loginSchema };
