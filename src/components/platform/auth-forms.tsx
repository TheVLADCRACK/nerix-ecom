"use client";
import { useActionState } from "react";
import { type AuthState, requestResetAction, resetPasswordAction, signInAction, signUpAction } from "@/server/auth-actions";

const Err = ({ s }: { s: AuthState }) => (s?.error ? <p role="alert" className="nx-alert" style={{ color: "var(--nx-red)" }}>{s.error}</p> : null);

export function LoginForm() {
  const [state, action, pending] = useActionState(signInAction, undefined);
  return (
    <form className="nx-grid" action={action}>
      <Err s={state} />
      <label className="nx-field"><span>Email</span><input className="nx-input" type="email" name="email" autoComplete="email" required /></label>
      <label className="nx-field"><span>Mot de passe</span><input className="nx-input" type="password" name="password" autoComplete="current-password" required /></label>
      <button className="nx-btn dark" style={{ justifyContent: "center", height: 40 }} type="submit" disabled={pending}>{pending ? "Connexion…" : "Se connecter"}</button>
    </form>
  );
}

export function SignupForm() {
  const [state, action, pending] = useActionState(signUpAction, undefined);
  return (
    <form className="nx-grid" action={action}>
      <Err s={state} />
      <label className="nx-field"><span>Nom</span><input className="nx-input" name="name" autoComplete="name" required minLength={2} maxLength={80} /></label>
      <label className="nx-field"><span>Email</span><input className="nx-input" type="email" name="email" autoComplete="email" required /></label>
      <label className="nx-field"><span>Mot de passe</span><input className="nx-input" type="password" name="password" autoComplete="new-password" required minLength={12} /><small>12 caractères minimum.</small></label>
      <label className="nx-field"><span>Code d'installation</span><input className="nx-input mono" name="token" autoComplete="off" required /><small>Valeur ADMIN_SETUP_TOKEN de votre fichier .env.local.</small></label>
      <button className="nx-btn dark" style={{ justifyContent: "center", height: 40 }} type="submit" disabled={pending}>{pending ? "Création…" : "Créer mon accès"}</button>
    </form>
  );
}

export function ResetRequestForm() {
  const [state, action, pending] = useActionState(requestResetAction, undefined);
  if (state && "sent" in state && state.sent) return <p className="nx-alert" role="status">Si cette adresse correspond à un membre de l'équipe, un lien vient d'être envoyé. Pensez à vérifier les courriers indésirables.</p>;
  return (
    <form className="nx-grid" action={action}>
      <Err s={state} />
      <label className="nx-field"><span>Email</span><input className="nx-input" type="email" name="email" autoComplete="email" required /></label>
      <button className="nx-btn dark" style={{ justifyContent: "center", height: 40 }} type="submit" disabled={pending}>Envoyer le lien</button>
    </form>
  );
}

export function NewPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, undefined);
  return (
    <form className="nx-grid" action={action}>
      <Err s={state} />
      <input type="hidden" name="token" value={token} />
      <label className="nx-field"><span>Nouveau mot de passe</span><input className="nx-input" type="password" name="password" autoComplete="new-password" required minLength={12} /><small>12 caractères minimum.</small></label>
      <button className="nx-btn dark" style={{ justifyContent: "center", height: 40 }} type="submit" disabled={pending}>Enregistrer</button>
    </form>
  );
}
