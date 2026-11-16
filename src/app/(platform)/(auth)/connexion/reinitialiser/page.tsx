import Link from "next/link";
import { ResetRequestForm } from "@/components/platform/auth-forms";
import { AuthShell } from "@/components/platform/auth-shell";

export const metadata = { title: "Réinitialiser le mot de passe" };

export default function Reset() {
  return (
    <AuthShell>
      <div>
        <h1>Mot de passe oublié</h1>
        <p style={{ color: "var(--nx-muted)", marginTop: 4 }}>Nous envoyons un lien de réinitialisation à cette adresse si elle correspond à un membre de l'équipe.</p>
      </div>
      <ResetRequestForm />
      <p style={{ fontSize: 13 }}><Link href="/connexion" style={{ color: "var(--nx-blue)" }}>Retour à la connexion</Link></p>
    </AuthShell>
  );
}
