// Import initial d'Energy Plus dans le schéma ecom : boutique, catalogue, contenus, puis données réelles du classeur ERP
// (data-private/erp.json, produit par scripts/erp_extract.py, hors Git).
// Une seule transaction. Refuse d'écraser une boutique existante sauf avec --reset (supprime la boutique et tout son contenu).
// Usage : node --env-file=.env.local scripts/import-data.mjs [--reset]
import { readFileSync, existsSync } from "node:fs";
import { Pool } from "@neondatabase/serverless";
import { CATEGORIES, CITIES, MEDIA_BASE, PRODUCT_MEDIA, PRODUCTS, ARTICLES, POST_CATEGORIES, STORE } from "../src/data/energyplus.ts";
import { PAGES } from "../src/data/energyplus-pages.ts";

const ROOT = new URL("../", import.meta.url);
const ERP_FILE = new URL("data-private/erp.json", ROOT);
const reset = process.argv.includes("--reset");
const erp = existsSync(ERP_FILE) ? JSON.parse(readFileSync(ERP_FILE, "utf8")) : null;

// Nom du produit dans le classeur → fiche boutique.
const ERP_SLUG = { "Powerbank Magsafe": "powerbank-magnetique-sans-fil", Mosquitoshot: "lampe-anti-moustiques-mosqitoshot", "Biodance Collagen": "biodance-pore-tightening-collagen-ampoule" };
const TAGS = { "energie/powerbanks": "Énergie", "maison/anti-moustiques": "Maison", "beaute/soins-visage": "Beauté" };

/** Prix habituel : le plus fréquent des commandes livrées (à égalité, le plus récent). */
function usualPrice(name) {
  const sold = (erp?.orders ?? []).filter((o) => o.product === name && o.status === "Livrée" && o.unitPrice > 0).sort((a, b) => b.date.localeCompare(a.date));
  const n = new Map();
  for (const o of sold) n.set(o.unitPrice, (n.get(o.unitPrice) ?? 0) + 1);
  let best = null;
  for (const [p, c] of n) if (best === null || c > n.get(best)) best = p;
  return best;
}

/** Articles : brouillons validés de docs/content/blog-drafts, en Markdown (rendu et assaini à l'affichage). */
function readPosts() {
  const slugByFile = {};
  const raws = ARTICLES.map((a) => {
    const raw = readFileSync(new URL(`docs/content/blog-drafts/${a.dir}/${a.file}`, ROOT), "utf8");
    slugByFile[a.file.replace(".md", "")] = raw.match(/^slug: (.+)$/m)[1].trim();
    return { a, raw };
  });
  return raws.map(({ a, raw }, i) => {
    const [, fm = "", rest = ""] = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/) ?? [];
    const sources = [...fm.matchAll(/^\s+- (.+)$/gm)].map((m) => m[1]).filter((s) => s.includes("http")).map((s) => {
      const url = s.match(/https?:\/\/\S+/)[0].replace(/[),]+$/, "");
      return { title: s.replace(url, "").replace(/\(consulté.*?\)/, "").replace(/[,(]\s*$/, "").trim().replace(/,$/, ""), url };
    });
    let body = rest.split("\n").filter((l) => !/^> \*\*(Produit cité|Note de rédaction)/.test(l)).join("\n")
      .replace(/\s*\[(À CONFIRMER|À ALIGNER|À FAIRE|À OBTENIR|À VÉRIFIER)[^\]]*\]/g, "").trim();
    const title = body.match(/^# (.+)$/m)?.[1] ?? "";
    body = body.replace(/^# .+\n+/, "").replace(/\]\((?:\.\.\/[a-z-]+\/)?(\d\d-[a-z0-9-]+)\.md\)/g, (_, f) => `](/blog/${slugByFile[f] ?? ""})`);
    const excerpt = body.split("\n\n")[0].replace(/[*_[\]]/g, "").replace(/\([^)]*\)/g, "").slice(0, 220);
    return { slug: slugByFile[a.file.replace(".md", "")], title, excerpt, category: POST_CATEGORIES.find((c) => c.slug === a.cat)?.name ?? "", body, sources, products: [a.product],
      minutes: Math.max(2, Math.round(body.split(/\s+/).length / 200)), publishedAt: new Date(Date.UTC(2026, 10, 14 - i)).toISOString() };
  });
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const c = await pool.connect();
const q = (text, params = []) => c.query(text, params).then((r) => r.rows);
try {
  await c.query("BEGIN");
  await c.query("SET LOCAL search_path = ecom");
  const existing = (await q("SELECT id FROM stores WHERE slug = $1", [STORE.slug]))[0];
  if (existing && !reset) throw new Error(`La boutique ${STORE.slug} existe déjà (relancer avec --reset pour la réimporter).`);
  if (existing) await q("DELETE FROM stores WHERE id = $1", [existing.id]);

  const lists = erp?.settings.lists ?? {};
  const settings = {
    eurRate: erp?.settings.eurRate ?? 656, taxRate: erp?.settings.taxRate ?? 0.25, lowStock: erp?.settings.lowStockThreshold ?? 5,
    lists: {
      chargeCategories: lists["Catégories de charges"] ?? ["Publicité", "Loyer", "Internet", "Électricité", "Salaires", "Transport", "Fournitures", "Autre"],
      paymentMethods: lists["Méthodes de paiement"] ?? ["Espèces", "Mobile Money", "Virement", "Autre"],
      couriers: (lists["Partenaires de livraison"] ?? []).filter((x) => x !== "Autre"),
      adPlatforms: lists["Plateformes publicitaires"] ?? ["Meta Ads", "TikTok Ads", "Google Ads", "Autre"],
      cancelReasons: lists["Motifs d'annulation"] ?? ["Client indisponible", "Refus du produit", "Mauvaise adresse", "Numéro incorrect", "Prix contesté", "Autre"],
      lossReasons: ["Casse", "Produit défectueux", "Vol", "Offert", "Autre"],
    },
  };
  const [{ id: store }] = await q(
    `INSERT INTO stores (slug, name, tagline, status, logo, favicon, hero_image, theme, sections, contact, social, tracking, settings, currency, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`,
    [STORE.slug, STORE.name, STORE.tagline, STORE.status, STORE.logo, STORE.favicon, STORE.heroImage, STORE.theme, JSON.stringify(STORE.sections), STORE.contact, STORE.social, STORE.tracking, settings, STORE.currency, STORE.createdAt],
  );

  let pos = 0;
  for (const cat of CATEGORIES) {
    await q("INSERT INTO categories (store_id, slug, path, parent_path, name, description, position) VALUES ($1,$2,$2,NULL,$3,$4,$5)", [store, cat.slug, cat.name, cat.description, pos++]);
    for (const ch of cat.children) await q("INSERT INTO categories (store_id, slug, path, parent_path, name, description, position) VALUES ($1,$2,$3,$4,$5,$6,$7)", [store, ch.slug, `${cat.slug}/${ch.slug}`, cat.slug, ch.name, ch.description, pos++]);
  }

  const skusByName = {};
  pos = 0;
  for (const p of PRODUCTS) {
    const erpName = Object.keys(ERP_SLUG).find((k) => ERP_SLUG[k] === p.slug);
    const [{ id: pid }] = await q(
      `INSERT INTO products (store_id, slug, name, status, category_path, brand, short, tag, specs, body, seo_title, seo_description, position)
       VALUES ($1,$2,$3,'active',$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
      [store, p.slug, p.name, p.category, p.brand, p.short, TAGS[p.category] ?? "", JSON.stringify(p.specs), JSON.stringify(p.body), p.seo_title, p.seo_description, pos++],
    );
    let v = 0;
    for (const variant of p.variants) {
      await q("INSERT INTO variants (store_id, product_id, sku, title, price, position) VALUES ($1,$2,$3,$4,$5,$6)", [store, pid, variant.sku, variant.title, (erpName && usualPrice(erpName)) ?? variant.price, v++]);
    }
    if (erpName) skusByName[erpName] = p.variants.map((x) => x.sku);
    let i = 0;
    for (const m of PRODUCT_MEDIA[p.slug] ?? []) {
      const [, width, height] = m.sizes[m.sizes.length - 1];
      const mid = m.sizes[Math.min(1, m.sizes.length - 1)];
      await q("INSERT INTO product_images (store_id, product_id, src, src_set, alt, width, height, kind, position) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)", [
        store, pid, `${MEDIA_BASE}${m.key}-${mid[0]}.webp`, m.sizes.map(([w, real]) => `${MEDIA_BASE}${m.key}-${w}.webp ${real}w`).join(", "), m.alt, width, height, m.kind, i++]);
    }
  }

  pos = 0;
  for (const city of CITIES) await q("INSERT INTO cities (store_id, name, fee, eta_min, eta_max, neighborhoods, position) VALUES ($1,$2,$3,$4,$5,$6,$7)", [store, city.name, city.fee, city.eta[0], city.eta[1], city.quarters, pos++]);
  for (const page of PAGES) await q("INSERT INTO pages (store_id, slug, title, body_md) VALUES ($1,$2,$3,$4)", [store, page.slug, page.title, page.body]);
  const posts = readPosts();
  for (const p of posts) await q("INSERT INTO posts (store_id, slug, title, excerpt, category, body_md, sources, product_slugs, minutes, published_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)", [store, p.slug, p.title, p.excerpt, p.category, p.body, JSON.stringify(p.sources), p.products, p.minutes, p.publishedAt]);

  const counts = { orders: 0, lots: 0, campaigns: 0, charges: 0, losses: 0 };
  if (erp) {
    for (const l of erp.products) {
      await q("INSERT INTO lots (store_id, ref, product, skus, supplier, purchased_on, quantity, unit_price, fees) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)", [
        store, l.id, l.name, [l.sku, ...(skusByName[l.name] ?? [])], l.supplier ?? "", l.purchaseDate, l.quantity, l.unitPrice,
        { transport: l.fees.transport ?? 0, customs: l.fees.customs ?? 0, shipping: l.fees.shipping ?? 0, packaging: l.fees.packaging ?? 0, bank: l.fees.bank ?? 0, other: l.fees.other ?? 0 }]);
      counts.lots++;
    }
    const skuOf = (name) => skusByName[name]?.[0] ?? erp.products.find((l) => l.name === name)?.sku ?? name;
    const variantOf = (name) => (skusByName[name] ? PRODUCTS.find((p) => p.slug === ERP_SLUG[name]).variants[0].title : "Standard");
    for (const o of erp.orders) {
      const delivered = o.status === "Livrée";
      const cancelled = o.status === "Annulée";
      const placed = `${o.date}T10:00:00+01:00`;
      const deliveredAt = delivered && o.deliveryDate ? `${o.deliveryDate}T17:00:00+01:00` : null;
      const [first = "Client", ...rest] = (o.customerName ?? "Client").split(" ");
      const subtotal = o.quantity * o.unitPrice;
      const [{ id: oid }] = await q(
        `INSERT INTO orders (store_id, number, placed_at, status, payment_status, fulfillment_status, payment_method, customer, city, neighborhood, landmark,
           subtotal, shipping, discount, total, courier, courier_fee, delivered_at, settled, cancel_reason)
         VALUES ($1,$2,$3,$4,$5,$6,'cod',$7,$8,$9,$10,$11,0,$12,$13,$14,$15,$16,true,$17) RETURNING id`,
        [store, o.id, placed, delivered ? "completed" : cancelled ? "cancelled" : o.status === "En cours" ? "processing" : "pending", delivered ? "paid" : "unpaid",
          delivered ? "delivered" : o.status === "En cours" ? "in_delivery" : "unfulfilled", { firstName: first, lastName: rest.join(" "), phone: o.phone ?? "" },
          o.city, o.place ?? "", o.note ?? "", subtotal, o.discount, subtotal - o.discount, o.partner, o.deliveryFee, deliveredAt, o.cancelReason]);
      await q("INSERT INTO order_lines (store_id, order_id, sku, name, variant, unit_price, quantity) VALUES ($1,$2,$3,$4,$5,$6,$7)", [store, oid, skuOf(o.product), o.product, variantOf(o.product), o.unitPrice, o.quantity]);
      await q("INSERT INTO order_events (store_id, order_id, at, label, actor) VALUES ($1,$2,$3,'Commande enregistrée','Import du classeur')", [store, oid, placed]);
      if (deliveredAt) await q("INSERT INTO order_events (store_id, order_id, at, label, actor) VALUES ($1,$2,$3,$4,'Import du classeur')", [store, oid, deliveredAt, `Livrée${o.partner ? ` par ${o.partner}` : ""}, paiement encaissé`]);
      if (cancelled) await q("INSERT INTO order_events (store_id, order_id, at, label, actor) VALUES ($1,$2,$3,$4,'Import du classeur')", [store, oid, `${o.deliveryDate ?? o.date}T17:00:00+01:00`, `Annulée${o.cancelReason ? ` : ${o.cancelReason}` : ""}`]);
      counts.orders++;
    }
    for (const k of erp.campaigns) {
      await q("INSERT INTO campaigns (store_id, ref, platform, name, products, cities, start_on, spend, currency, rate, orders, delivered, revenue) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)", [
        store, k.id, k.platform, k.name ?? "", k.products ?? "", k.cities ?? "", k.date, k.spend, k.currency === "EUR" ? "EUR" : "XAF", k.rate || settings.eurRate, k.orders, k.deliveredOrders, k.attributedRevenue]);
      counts.campaigns++;
    }
    for (const ch of erp.charges) {
      await q("INSERT INTO charges (store_id, ref, spent_on, category, description, amount, payment_method, included_in_cost) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)", [
        store, ch.id, ch.date, ch.category, ch.description ?? "", ch.amount, ch.paymentMethod ?? "", ch.includedInProductCost]);
      counts.charges++;
    }
    for (const l of erp.losses) {
      await q("INSERT INTO losses (store_id, ref, lost_on, product, quantity, reason, note) VALUES ($1,$2,$3,$4,$5,$6,$7)", [store, l.id, l.date, l.product, l.quantity, l.reason, l.note ?? ""]);
      counts.losses++;
    }
  }
  await c.query("COMMIT");
  console.log(`Energy Plus importée : ${PRODUCTS.length} produits, ${CITIES.length} villes, ${posts.length} articles, ${PAGES.length} pages,`,
    `${counts.lots} lots, ${counts.orders} commandes, ${counts.campaigns} campagnes, ${counts.charges} charges, ${counts.losses} pertes${erp ? "" : " (classeur absent)"}`);
} catch (e) {
  await c.query("ROLLBACK").catch(() => {});
  console.error("Import annulé :", e.message);
  process.exitCode = 1;
} finally {
  c.release();
  await pool.end();
}
