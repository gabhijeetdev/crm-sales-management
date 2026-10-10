const { z } = require("zod");
const { schema } = require("./common");

const updateSettingsSchema = schema({
  body: z.object({
    companyName: z.string().trim().min(2).max(120).optional(),
    currency: z.string().trim().min(3).max(8).optional(),
    timezone: z.string().trim().min(3).max(64).optional(),
    fiscalYearStartMonth: z.number().int().min(1).max(12).optional()
  }).strict()
});

module.exports = { updateSettingsSchema };
