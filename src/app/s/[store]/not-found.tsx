export default function NotFound() {
  return (
    <div className="sf-page">
      <div className="sf-wrap">
        <div className="sf-empty sf-glass">
          <h1 className="sf-h" style={{ fontSize: 64 }}>Introuvable</h1>
          <p className="sf-muted">Cette page n'existe pas ou n'est plus disponible.</p>
          <a href="./" className="sf-btn primary">Retour à l'accueil</a>
        </div>
      </div>
    </div>
  );
}
