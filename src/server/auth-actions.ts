"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { one, q } from "@/lib/db";
import { env } from "@/lib/env";
import { clientIpHash, rateLimit, safeEqual } from "@/lib/security";
import { audit, currentStaff, neonAuth } from "./auth";

export type AuthState = { error?: string } | undefined;

const SignIn = z.object({ email: z.email().max(200), password: z.string().min(1).max(200) }).strict();

export async function signInAction(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = SignIn.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: "Email ou mot de passe invalide." };
  if (!(await rateLimit(`login:${await clientIpHash()}`, 10, 900))) return { error: "Trop de tentatives. Réessayez dans 15 minutes." };
  const { data, error } = await neonAuth().signIn.email({ email: parsed.data.email.toLowerCase(), password: parsed.data.password });
  if (error || !data?.user?.id) return { error: "Email ou mot de passe incorrect." };
  // Le cookie de session n'est lisible qu'à la requête suivante : on vérifie l'équipe avec l'utilisateur renvoyé.
  if (!(await one("SELECT 1 FROM ecom.staff WHERE user_id = $1 AND active", [data.user.id]))) {
    await neonAuth().signOut();
    return { error: "Ce compte n'a pas accès à l'outil." };
  }
  redirect("/");
}

const SignUp = z.object({ name: z.string().trim().min(2).max(80), email: z.email().max(200), password: z.string().min(12).max(200), token: z.string().min(8).max(200) }).strict();

/** Création d'un accès : réservée au détenteur du code d'installation (ADMIN_SETUP_TOKEN) et aux emails de ADMIN_EMAILS. Les invitations viendront plus tard. */
export async function signUpAction(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = SignUp.safeParse({ name: form.get("name"), email: form.get("email"), password: form.get("password"), token: form.get("token") });
  if (!parsed.success) return { error: "Vérifiez les champs : mot de passe de 12 caractères minimum." };
  if (!(await rateLimit(`signup:${await clientIpHash()}`, 5, 3600))) return { error: "Trop de tentatives. Réessayez dans une heure." };
  if (!safeEqual(parsed.data.token, env().ADMIN_SETUP_TOKEN)) return { error: "Code d'installation incorrect." };
  const email = parsed.data.email.toLowerCase();
  // Liste d'emails administrateurs (ADMIN_EMAILS) : si elle est renseignée, seuls ces emails peuvent créer un accès.
  const allowed = env().ADMIN_EMAILS;
  if (allowed.length && !allowed.includes(email)) return { error: "Cet email n'est pas autorisé comme administrateur." };
  const { data, error } = await neonAuth().signUp.email({ email, password: parsed.data.password, name: parsed.data.name });
  const userId = data?.user?.id;
  if (error || !userId) return { error: "Création impossible : cet email a peut-être déjà un compte." };
  const staff = await one<{ id: string; user_id: string; email: string; name: string }>(
    "INSERT INTO ecom.staff (user_id, email, name, role) VALUES ($1,$2,$3,'admin') ON CONFLICT (user_id) DO UPDATE SET active = true RETURNING id, user_id, email, name",
    [userId, email, parsed.data.name]);
  if (staff) await audit({ id: staff.id, userId, email, name: staff.name, role: "admin" }, null, "Création d'un accès administrateur", email);
  redirect("/");
}

export async function signOutAction() {
  await neonAuth().signOut();
  redirect("/connexion");
}

/** « Déconnecter tous les appareils » : révoque toutes les sessions du compte, puis reconnecte sur la page de connexion. */
export async function signOutEverywhereAction() {
  const s = await currentStaff();
  if (s) await q("INSERT INTO ecom.audit_log (actor_id, actor_name, action) VALUES ($1,$2,'Déconnexion de tous les appareils')", [s.id, s.name]);
  await neonAuth().revokeSessions();
  redirect("/connexion");
}

const ResetReq = z.object({ email: z.email().max(200) }).strict();
/** Demande de lien : même réponse que l'email existe ou non (aucune énumération des comptes). */
export async function requestResetAction(_: AuthState, form: FormData): Promise<AuthState & { sent?: boolean }> {
  const parsed = ResetReq.safeParse({ email: form.get("email") });
  if (!parsed.success) return { error: "Email invalide." };
  if (await rateLimit(`reset:${await clientIpHash()}`, 5, 3600)) {
    await neonAuth().requestPasswordReset({ email: parsed.data.email.toLowerCase(), redirectTo: `${env().APP_URL}/connexion/nouveau-mot-de-passe` }).catch(() => {});
  }
  return { sent: true };
}

const ResetSet = z.object({ token: z.string().min(10).max(500), password: z.string().min(12).max(200) }).strict();
export async function resetPasswordAction(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = ResetSet.safeParse({ token: form.get("token"), password: form.get("password") });
  if (!parsed.success) return { error: "Mot de passe de 12 caractères minimum." };
  const { error } = await neonAuth().resetPassword({ newPassword: parsed.data.password, token: parsed.data.token });
  if (error) return { error: "Lien expiré ou déjà utilisé. Demandez un nouveau lien." };
  redirect("/connexion");
}
