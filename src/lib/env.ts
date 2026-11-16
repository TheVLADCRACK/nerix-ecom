import "server-only";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().startsWith("postgres"),
  NEON_AUTH_BASE_URL: z.url(),
  NEON_AUTH_COOKIE_SECRET: z.string().min(32),
  AWS_ENDPOINT_URL_S3: z.url(),
  AWS_REGION: z.string().min(2),
  S3_BUCKET: z.string().min(3),
  AWS_ACCESS_KEY_ID: z.string().min(8),
  AWS_SECRET_ACCESS_KEY: z.string().min(16),
  ADMIN_SETUP_TOKEN: z.string().min(24),
  ADMIN_EMAILS: z.string().default("").transform((v) => v.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)),
  CRON_SECRET: z.string().min(24),
  TOKEN_SECRET: z.string().min(32),
  APP_URL: z.url(),
  KPAY_BASE_URL: z.url().default("https://admin.kpay.site"),
  KPAY_API_KEY: z.string().regex(/^(kpay_(test|live)_\S+)?$/).default(""),
  KPAY_SECRET_KEY: z.string().default(""),
  KPAY_WEBHOOK_SECRET: z.string().default(""),
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
    if (cached.KPAY_API_KEY.startsWith("kpay_live_") && !cached.APP_URL.startsWith("https://")) throw new Error("Clé KPay live hors production");
  }
  return cached;
}

/** Paiement en ligne actif seulement si les deux clés KPay et le secret du webhook sont renseignés. */
export const onlinePayEnabled = () => {
  const e = env();
  return Boolean(e.KPAY_API_KEY && e.KPAY_SECRET_KEY && e.KPAY_WEBHOOK_SECRET);
};
