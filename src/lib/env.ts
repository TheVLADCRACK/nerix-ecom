import "server-only";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().startsWith("postgres"),
  NEON_AUTH_BASE_URL: z.url(),
  NEON_AUTH_COOKIE_SECRET: z.string().min(32),
  S3_ENDPOINT: z.url(),
  S3_REGION: z.string().min(2),
  S3_BUCKET: z.string().min(3),
  S3_ACCESS_KEY_ID: z.string().min(8),
  S3_SECRET_ACCESS_KEY: z.string().min(16),
  ADMIN_SETUP_TOKEN: z.string().min(24),
  ADMIN_EMAILS: z.string().default("").transform((v) => v.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)),
  CRON_SECRET: z.string().min(24),
  TOKEN_SECRET: z.string().min(32),
  APP_URL: z.url(),
  SASPAY_BASE_URL: z.url().default("https://api.saspay.me/api/v1"),
  SASPAY_API_KEY: z.string().regex(/^(sk_(test|live)_\S+)?$/).default(""),
  SASPAY_WEBHOOK_SECRET: z.string().default(""),
  SASPAY_CUSTOMER_EMAIL: z.email().default("contact@nerix.site"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/** Variables validées au premier usage : une variable manquante fait échouer immédiatement. */
export function env(): Env {
  if (!cached) {
    const parsed = schema.safeParse(process.env);
    if (!parsed.success) {
      const keys = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
      throw new Error(`Configuration invalide : ${keys}`);
    }
    cached = parsed.data;
    if (cached.SASPAY_API_KEY.startsWith("sk_live_") && !cached.APP_URL.startsWith("https://")) throw new Error("Clé SaasPay live hors production");
  }
  return cached;
}

/** Paiement en ligne actif seulement si la clé et le secret du webhook sont renseignés. */
export const onlinePayEnabled = () => {
  const e = env();
  return Boolean(e.SASPAY_API_KEY && e.SASPAY_WEBHOOK_SECRET);
};
