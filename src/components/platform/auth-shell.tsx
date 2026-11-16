/** Connexion et inscription : un formulaire centré, sans image ni animation. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="nx-auth">
      <div className="form">
        <div>
          <div className="nx-brand" style={{ padding: 0 }}><img src="/nerix.png" alt="" style={{ width: 28, height: 28 }} /><span style={{ fontSize: 17 }}>Nerix Ecom</span></div>
          {children}
        </div>
      </div>
    </div>
  );
}
