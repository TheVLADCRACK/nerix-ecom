import "server-only";
import { createNeonAuth } from "@neon/auth/next/server";
import { redirect } from "next/navigation";
import { cache } from "react";
import { one, q } from "@/lib/db";
import { env } from "@/lib/env";

let instance: ReturnType<typeof createNeonAuth> | undefined;
/** Client Neon Auth (cookies signés, session renouvelée à l'usage : pas de déconnexion pour inactivité ; session vérifiée en cache 1 h). */
export const neonAuth = () =>
  (instance ??= createNeonAuth({ baseUrl: env().NEON_AUTH_BASE_URL, cookies: { secret: env().NEON_AUTH_COOKIE_SECRET, sameSite: "lax", sessionDataTtl: 3600 }, logLevel: "warn" }));

export type Staff = { id: string; userId: string; email: string; name: string; role: "admin" };

/** Membre de l'équipe connecté, ou null (pas de session, ou compte qui n'est pas dans l'équipe, ou désactivé). */
export const currentStaff = cache(async (): Promise<Staff | null> => {
  const { data, error } = await neonAuth().getSession();
  // Service d'authentification injoignable (réseau, démarrage à froid) : ce n'est pas une déconnexion.
  // On affiche une erreur « réessayez » au lieu de renvoyer vers la connexion.
  if (error && !data && (error.status === 0 || error.status >= 500 || /NETWORK|TIMEOUT|FETCH/i.test(error.code ?? ""))) {
    throw new Error("Service de connexion momentanément injoignable. Réessayez dans un instant.");
  }
  const userId = data?.user?.id;
  if (!userId) return null;
  const s = await one<{ id: string; user_id: string; email: string; name: string; role: "admin" }>(
    "SELECT id, user_id, email, name, role FROM ecom.staff WHERE user_id = $1 AND active", [userId]);
  // Dernière visite : non bloquante, au plus une écriture toutes les 5 minutes.
  if (s) void q("UPDATE ecom.staff SET last_seen = now() WHERE id = $1 AND (last_seen IS NULL OR last_seen < now() - interval '5 minutes')", [s.id]).catch(() => {});
  return s ? { id: s.id, userId: s.user_id, email: s.email, name: s.name, role: s.role } : null;
});

/** À appeler en tête de chaque page de l'outil et de chaque Server Action : redirige vers la connexion sinon. */
export async function requireStaff(): Promise<Staff> {
  const s = await currentStaff();
  if (!s) redirect("/connexion");
  return s;
}

/**
 * Vérifie la session, l'appartenance active à l'équipe et la permission. Un seul rôle pour l'instant (admin : tout).
 * Le code de permission documente l'action et servira quand les rôles fins arriveront.
 */
export async function requirePermission(_code: string): Promise<Staff> {
  return requireStaff();
}

/** Journal d'audit : qui a fait quoi. Jamais de secret ni de donnée de paiement brute dans `data`. */
export async function audit(staff: Staff, storeId: string | null, action: string, target = "", data: Record<string, unknown> = {}) {
  await q("INSERT INTO ecom.audit_log (store_id, actor_id, actor_name, action, target, data) VALUES ($1,$2,$3,$4,$5,$6)", [storeId, staff.id, staff.name, action, target, data]);
}
