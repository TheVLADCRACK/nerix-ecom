// Seed idempotent : relançable sans créer de doublon.
import { readFile } from "node:fs/promises";
import { Pool } from "@neondatabase/serverless";
import { ROLES, CITIES, CATEGORIES, PRODUCTS, ARTICLES, POST_CATEGORIES, SETTINGS } from "../src/data/energyplus.ts";
import { PAGES } from "../src/data/energyplus-pages.ts";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const c = await pool.connect();
const q = (t, p = []) => c.query(t, p).then((r) => r.rows);
const one = async (t, p) => (await q(t, p))[0];

function parseArticle(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  const fm = m[1];
  const field = (k) => fm.match(new RegExp(`^${k}: (.+)$`, "m"))?.[1]?.trim();
  const sources = [...fm.matchAll(/^\s+- (.+)$/gm)].map((s) => s[1]).filter((s) => s.includes("http")).map((s) => {
    const url = s.match(/https?:\/\/\S+/)[0].replace(/[),]+$/, "");
    return { title: s.replace(url, "").replace(/[,(]\s*$/, "").replace(/\(consulté.*?\)/, "").trim().replace(/[,]$/, ""), url };
  });
  let body = m[2]
    .split("\n")
    .filter((l) => !/^> \*\*(Produit cité|Note de rédaction)/.test(l))
    .join("\n")
    .replace(/\s*\[(À CONFIRMER|À ALIGNER|À FAIRE|À OBTENIR|À VÉRIFIER)[^\]]*\]/g, "")
    .trim();
  const title = body.match(/^# (.+)$/m)[1];
  body = body.replace(/^# .+\n+/, "");
  // liens internes entre brouillons → URL publiques
  body = body.replace(/\]\((?:\.\.\/[a-z-]+\/)?(\d\d-[a-z0-9-]+)\.md\)/g, (_, f) => `](/blog/${slugByFile[f] ?? ""})`);
  const excerpt = body.split("\n\n")[0].replace(/[*_[\]]/g, "").replace(/\([^)]*\)/g, "").slice(0, 280);
  const words = body.split(/\s+/).length;
  return { slug: field("slug"), title, excerpt, body, sources, minutes: Math.max(2, Math.round(words / 200)) };
}

const slugByFile = {};
for (const a of ARTICLES) {
  const raw = await readFile(new URL(`../docs/content/blog-drafts/${a.dir}/${a.file}`, import.meta.url), "utf8");
  slugByFile[a.file.replace(".md", "")] = raw.match(/^slug: (.+)$/m)[1].trim();
}

try {
  await c.query("BEGIN");

  for (const r of ROLES) {
    const role = await one(
      `INSERT INTO roles (code, name, is_system) VALUES ($1,$2,$3) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
      [r.code, r.name, !!r.system],
    );
    for (const p of r.perms) await q(`INSERT INTO role_permissions (role_id, permission) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [role.id, p]);
  }

  for (const [i, city] of CITIES.entries()) {
    const ct = await one(
      `INSERT INTO cities (name, region, sort_order) VALUES ($1,$2,$3) ON CONFLICT (country, name) DO UPDATE SET sort_order = EXCLUDED.sort_order RETURNING id`,
      [city.name, city.region, i],
    );
    const zone = await one(
      `INSERT INTO delivery_zones (city_id, name, fee_xaf, eta_min_hours, eta_max_hours) VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (city_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
      [ct.id, city.quarters.length ? `${city.name} – toute la ville` : city.name, city.fee, city.eta[0], city.eta[1]],
    );
    for (const qn of city.quarters)
      await q(`INSERT INTO neighborhoods (city_id, zone_id, name) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`, [ct.id, zone.id, qn]);
  }

  const catIds = {};
  for (const [i, cat] of CATEGORIES.entries()) {
    const parent = await one(
      `INSERT INTO categories (name, slug, path, depth, description, sort_order) VALUES ($1,$2,$2,1,$3,$4)
       ON CONFLICT (path) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description RETURNING id`,
      [cat.name, cat.slug, cat.description, i],
    );
    catIds[cat.slug] = parent.id;
    for (const ch of cat.children) {
      const row = await one(
        `INSERT INTO categories (parent_id, name, slug, path, depth, description) VALUES ($1,$2,$3,$4,2,$5)
         ON CONFLICT (path) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description RETURNING id`,
        [parent.id, ch.name, ch.slug, `${cat.slug}/${ch.slug}`, ch.description],
      );
      catIds[`${cat.slug}/${ch.slug}`] = row.id;
    }
  }

  const productIds = {};
  for (const p of PRODUCTS) {
    let brandId = null;
    if (p.brand) {
      const b = await one(
        `INSERT INTO brands (name, slug) VALUES ($1, lower($1)) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
        [p.brand],
      );
      brandId = b.id;
    }
    const prod = await one(
      `INSERT INTO products (slug, name, brand_id, primary_category_id, short_description, body, status, published_at, seo_title, seo_description)
       VALUES ($1,$2,$3,$4,$5,$6,'active', now(), $7, $8)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, short_description = EXCLUDED.short_description, body = EXCLUDED.body,
         seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description, updated_at = now()
       RETURNING id`,
      [p.slug, p.name, brandId, catIds[p.category], p.short, JSON.stringify(p.body), p.seo_title, p.seo_description],
    );
    productIds[p.slug] = prod.id;
    const hasOptions = p.variants.some((v) => Object.keys(v.options).length);
    if (hasOptions) {
      const optName = Object.keys(p.variants[0].options)[0];
      await q(`INSERT INTO product_options (product_id, name) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [prod.id, optName]);
    }
    for (const [i, v] of p.variants.entries()) {
      const variant = await one(
        `INSERT INTO product_variants (product_id, sku, title, option_values, price_xaf, position) VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (sku) DO UPDATE SET title = EXCLUDED.title RETURNING id, (xmax = 0) AS inserted`,
        [prod.id, v.sku, v.title, JSON.stringify(v.options), v.price, i],
      );
      const inv = await one(`INSERT INTO inventory_items (variant_id, on_hand) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING variant_id`, [variant.id, v.stock]);
      if (inv)
        await q(
          `INSERT INTO stock_movements (variant_id, reason, delta_on_hand, actor_type, note) VALUES ($1,'initial',$2,'system','Stock de lancement')`,
          [variant.id, v.stock],
        );
    }
    await q(`DELETE FROM product_specifications WHERE product_id = $1`, [prod.id]);
    for (const [i, s] of p.specs.entries())
      await q(
        `INSERT INTO product_specifications (product_id, label, value, source, verified_at, position) VALUES ($1,$2,$3,$4, now(), $5)`,
        [prod.id, s.label, s.value, s.source, i],
      );
  }

  const postCat = {};
  for (const pc of POST_CATEGORIES)
    postCat[pc.slug] = (await one(`INSERT INTO post_categories (name, slug) VALUES ($1,$2) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id`, [pc.name, pc.slug])).id;

  for (const [i, a] of ARTICLES.entries()) {
    const raw = await readFile(new URL(`../docs/content/blog-drafts/${a.dir}/${a.file}`, import.meta.url), "utf8");
    const art = parseArticle(raw);
    const post = await one(
      `INSERT INTO posts (slug, title, excerpt, body_md, category_id, status, published_at, sources, reading_minutes, seo_title, seo_description)
       VALUES ($1,$2,$3,$4,$5,'published', now() - ($6 || ' hours')::interval, $7, $8, $9, $10)
       ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, excerpt = EXCLUDED.excerpt, body_md = EXCLUDED.body_md,
         sources = EXCLUDED.sources, reading_minutes = EXCLUDED.reading_minutes, updated_at = now()
       RETURNING id`,
      [art.slug, art.title, art.excerpt, art.body, postCat[a.cat], String(i), JSON.stringify(art.sources), art.minutes, art.title.slice(0, 70), art.excerpt.slice(0, 160)],
    );
    await q(`INSERT INTO post_products (post_id, product_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [post.id, productIds[a.product]]);
  }

  for (const pg of PAGES)
    await q(
      `INSERT INTO pages (slug, title, body_md, status, seo_title, seo_description) VALUES ($1,$2,$3,'published',$2,$4)
       ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, body_md = EXCLUDED.body_md, seo_description = EXCLUDED.seo_description, updated_at = now()`,
      [pg.slug, pg.title, pg.body, pg.seo],
    );

  for (const [k, v] of Object.entries(SETTINGS))
    await q(`INSERT INTO store_settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO NOTHING`, [k, JSON.stringify(v)]);

  await c.query("COMMIT");
  console.log("seed terminé");
} catch (e) {
  await c.query("ROLLBACK");
  throw e;
} finally {
  c.release();
  await pool.end();
}
