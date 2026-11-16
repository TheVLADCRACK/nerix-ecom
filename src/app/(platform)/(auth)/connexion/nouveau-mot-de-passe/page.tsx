import Link from "next/link";
import { NewPasswordForm } from "@/components/platform/auth-forms";
import { AuthShell } from "@/components/platform/auth-shell";

export const metadata = { title: "Nouveau mot de passe", robots: { index: false } };

export default async function NewPassword({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthShell>
      <div><h1>Nouveau mot de passe</h1></div>
      {token ? <NewPasswordForm token={token} /> : <p className="nx-alert">Lien incomplet. <Link href="/connexion/reinitialiser" style={{ color: "var(--nx-blue)" }}>Demander un nouveau lien</Link></p>}
    </AuthShell>
  );
}
