import Link from "next/link";
import { loadFront, type FrontParams } from "@/components/store/ctx";
import { Icon } from "@/components/ui/icons";
import { dateFr } from "@/lib/format";

export const metadata = { title: "Conseils et guides", description: "Guides pratiques : énergie, maison, soins. Des réponses vérifiées, sans promesse exagérée." };

export default async function Blog({ params }: FrontParams) {
  const { base, posts } = await loadFront(params);
  const [first, ...rest] = posts;
  return (
    <div className="sf-page">
      <div className="sf-wrap">
        <div className="sf-pagehead"><div className="sf-eyebrow">Le blog</div><h1 className="sf-h" style={{ marginTop: 8 }}>Conseils et <em>guides</em></h1></div>
        {first && (
          <Link href={`${base}/blog/${first.slug}`} className="sf-band sf-dark" style={{ marginTop: 28 }}>
            <div><span className="sf-eyebrow">{first.category}</span><h2 className="sf-h" style={{ marginTop: 10 }}>{first.title}</h2></div>
            <div><p className="sf-muted">{first.excerpt}</p><span className="sf-link" style={{ marginTop: 16 }}>Lire l'article <Icon name="arrowRight" size={14} /></span></div>
          </Link>
        )}
        <div className="sf-posts" style={{ marginTop: 22 }}>
          {rest.map((p) => (
            <Link key={p.slug} href={`${base}/blog/${p.slug}`} className="sf-post sf-glass">
              <span className="sf-eyebrow">{p.category}</span>
              <h3>{p.title}</h3>
              <p className="sf-muted" style={{ fontSize: 14 }}>{p.excerpt.slice(0, 130)}…</p>
              <footer><span className="sf-muted">{dateFr(p.publishedAt)} · {p.minutes} min</span><Icon name="arrowRight" size={16} /></footer>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
