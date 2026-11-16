import Link from "next/link";
import { LoginForm } from "@/components/platform/auth-forms";
import { AuthShell } from "@/components/platform/auth-shell";

export const metadata = { title: "Connexion" };

export default function Login() {
  return (
    <AuthShell>
      <div>
        <h1>Connexion</h1>
        <p style={{ color: "var(--nx-muted)", marginTop: 4 }}>Accès réservé à l'équipe.</p>
      </div>
      <LoginForm />
      <p style={{ color: "var(--nx-muted)", fontSize: 13 }}>Mot de passe oublié ? <Link href="/connexion/reinitialiser" style={{ color: "var(--nx-blue)" }}>Le réinitialiser</Link></p>
      <p style={{ color: "var(--nx-muted)", fontSize: 13 }}>Premier accès ? <Link href="/inscription" style={{ color: "var(--nx-blue)" }}>Créer le compte administrateur</Link></p>
    </AuthShell>
  );
}
