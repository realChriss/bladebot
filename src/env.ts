import { z } from "zod";

const envSchema = z.object({
  // Core configuration
  CLIENT_TOKEN: z.string(),
  PGSQL_URL: z.string().url(),
  INFO_WEBHOOK: z.string().url(),
  WARN_WEBHOOK: z.string().url(),
  ERROR_WEBHOOK: z.string().url(),
  INFO_COLOR: z.string().default("ffffff"),
  WARN_COLOR: z.string().default("16108333"),
  ERROR_COLOR: z.string().default("16718619"),
  CLAN_NAME: z.string(),
  SERVER_ID: z.string(),
  STATE: z.string().default("dev"),

  // Bot config
  PREFIX: z.string().default("!"),

  // Channels (required)
  APPLICATION_CHANNEL: z.string(),
  PENDING_INV_CHANNEL: z.string(),
  MAIN_CHANNEL: z.string(),
  STAFF_CHANNEL: z.string(),
  BOT_CHANNEL: z.string(),

  // Optional channels
  TRYOUT_CHANNEL: z.string().optional(),

  // Roles (required)
  CLAN_ROLE: z.string(),
  STAFF_ROLE: z.string(),

  // Optional roles
  DEV_ROLE: z.string().optional(),
  VERIFIED_ROLE: z.string().optional(),
  UNVERIFIED_ROLE: z.string().optional(),
  WAITLIST_ROLE: z.string().optional(),
  TRYOUT_PENDING_ROLE: z.string().optional(),

  SA_REGION_ROLE: z.string().optional(),
  SA_TRYOUTER_ROLE: z.string().optional(),
  EU_REGION_ROLE: z.string().optional(),
  EU_TRYOUTER_ROLE: z.string().optional(),
  ASIA_REGION_ROLE: z.string().optional(),
  ASIA_TRYOUTER_ROLE: z.string().optional(),
  NA_REGION_ROLE: z.string().optional(),
  NA_TRYOUTER_ROLE: z.string().optional(),
  AU_REGION_ROLE: z.string().optional(),
  AU_TRYOUTER_ROLE: z.string().optional(),

  // Developer
  DEV_ID: z.string(),
  CHRISS: z.string().optional(),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("❌ Invalid environment variables:", _env.error.format());
  process.exit(1);
}

export const env = _env.data;
