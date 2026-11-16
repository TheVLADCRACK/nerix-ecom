"use client";

/** Erreur passagère (service de connexion ou base injoignable) : on propose de réessayer, sans déconnecter. */
export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="nx-empty" role="alert" style={{ display: "grid", gap: 12, justifyItems: "center", padding: "60px 16px" }}>
      <strong>Le service ne répond pas pour le moment.</strong>
      <p>Votre session est conservée. Vérifiez la connexion internet puis réessayez.</p>
      <button type="button" className="nx-btn dark" onClick={() => reset()}>Réessayer</button>
    </div>
  );
}
