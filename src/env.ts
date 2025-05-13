import { z } from "zod";

const numericString = z
  .string()
  .regex(/^[0-9]+$/, { message: "Must contain only digits" });

const envSchema = z.object({
  STATE: z.string().default("dev"),

  CLIENT_TOKEN: z.string(),
  PGSQL_URL: z.string().url(),
  INFO_WEBHOOK: z.string().url(),
  WARN_WEBHOOK: z.string().url(),
  ERROR_WEBHOOK: z.string().url(),
  INFO_COLOR: z.string().default("ffffff"),
  WARN_COLOR: z.string().default("ffb027"),
  ERROR_COLOR: z.string().default("ff2727"),

  CLAN_NAME: z.string(),
  SERVER_ID: z.string(),
  PREFIX: z.string().default("!"),

  APPLICATION_CHANNEL: numericString,
  PENDING_INV_CHANNEL: numericString,
  MAIN_CHANNEL: numericString,
  STAFF_CHANNEL: numericString,
  BOT_CHANNEL: numericString,
  
  CLAN_ROLE: numericString,
  STAFF_ROLE: numericString,
  DEV_ROLE: numericString.optional(),
  
  DEV_ID: numericString,
  CHRISS: numericString.default("864209794070741012"),
  
  // Bloodlust
  TRYOUT_CHANNEL: numericString.optional(),
  VERIFIED_ROLE: numericString.optional(),
  UNVERIFIED_ROLE: numericString.optional(),
  WAITLIST_ROLE: numericString.optional(),
  TRYOUT_PENDING_ROLE: numericString.optional(),
  SA_REGION_ROLE: numericString.optional(),
  SA_TRYOUTER_ROLE: numericString.optional(),
  EU_REGION_ROLE: numericString.optional(),
  EU_TRYOUTER_ROLE: numericString.optional(),
  ASIA_REGION_ROLE: numericString.optional(),
  ASIA_TRYOUTER_ROLE: numericString.optional(),
  NA_REGION_ROLE: numericString.optional(),
  NA_TRYOUTER_ROLE: numericString.optional(),
  AU_REGION_ROLE: numericString.optional(),
  AU_TRYOUTER_ROLE: numericString.optional(),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error("Invalid environment variables:\n", result.error.format());
  process.exit(1);
}

export const env = result.data;
