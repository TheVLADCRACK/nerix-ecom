import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadFront } from "@/components/store/ctx";
import { getPageBySlug } from "@/server/repo";
import { etaText, feeText, xaf } from "@/lib/format";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

type P = { params: Promise<{ store: string; page: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { store } = await loadFront(params);
  const page = await getPageBySlug(store.id, (await params).page);
  return page ? { title: page.title } : {};
}

export default async function InfoPage({ params }: P) {
  const { store, cities } = await loadFront(params);
  const page = await getPageBySlug(store.id, (await params).page);
  if (!page) notFound();
  const table = `<table><thead><tr><th>Ville</th><th>Frais</th><th>Délai</th></tr></thead><tbody>${cities.map((c) => `<tr><td>${esc(c.name)}</td><td>${feeText(c.fee)}</td><td>${etaText(c.etaMin, c.etaMax)}</td></tr>`).join("")}</tbody></table>`;
  // Noms de villes saisis dans l'admin : échappés avant insertion dans le HTML.
  const html = page.bodyHtml.replace(/<p>\{\{DELIVERY_TABLE\}\}<\/p>/, table);
  return (
    <div className="sf-wrap">
      <article className="sf-article">
        <h1 className="sf-h">{page.title}</h1>
        <div className="sf-prose" style={{ marginTop: 24 }} dangerouslySetInnerHTML={{ __html: html }} />
      </article>
    </div>
  );
}
