import Link from "next/link";
import { SignupForm } from "@/components/platform/auth-forms";
import { AuthShell } from "@/components/platform/auth-shell";

export const metadata = { title: "Créer votre accès" };

export default function Signup() {
  return (
    <AuthShell>
      <div>
        <h1>Créer votre accès</h1>
        <p style={{ color: "var(--nx-muted)", marginTop: 4 }}>Réservé à l'équipe : il faut le code d'installation. Les invitations par email arriveront plus tard.</p>
      </div>
      <SignupForm />
      <p style={{ color: "var(--nx-muted)", fontSize: 13 }}>Déjà un accès ? <Link href="/connexion" style={{ color: "var(--nx-blue)" }}>Se connecter</Link></p>
    </AuthShell>
  );
}
