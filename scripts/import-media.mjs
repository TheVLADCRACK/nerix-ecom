// Importe les photos produits depuis les ressources sources (lecture seule) vers Neon Object Storage,
// génère les icônes du site depuis le logo officiel. Idempotent (déduplication SHA-256).
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { AwsClient } from "aws4fetch";
import { Pool } from "@neondatabase/serverless";
import { PRODUCTS } from "../src/data/energyplus.ts";

const SRC = new URL("../dossier sans titre/", import.meta.url);
const WIDTHS = [480, 960, 1600];
const E = process.env;
const s3 = new AwsClient({ accessKeyId: E.AWS_ACCESS_KEY_ID, secretAccessKey: E.AWS_SECRET_ACCESS_KEY, region: E.AWS_REGION, service: "s3" });
const url = (key) => `${E.AWS_ENDPOINT_URL_S3}/${E.S3_BUCKET}/${key}`;
const pool = new Pool({ connectionString: E.DATABASE_URL });

async function put(key, body) {
  const res = await s3.fetch(url(key), { method: "PUT", body, headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable" } });
  if (!res.ok) throw new Error(`PUT ${key} : ${res.status} ${await res.text()}`);
}

for (const p of PRODUCTS) {
  const { rows: [prod] } = await pool.query("SELECT id FROM products WHERE slug = $1", [p.slug]);
  for (const [pos, file] of p.image_files.entries()) {
    const input = await readFile(new URL(file, SRC));
    let img = sharp(input).rotate();
    if (p.crop && pos === 0) img = img.extract(p.crop);
    const normalized = await img.webp({ quality: 90 }).toBuffer();
    const hash = createHash("sha256").update(normalized).digest("hex");
    let { rows: [asset] } = await pool.query("SELECT id FROM media_assets WHERE sha256 = $1", [hash]);
    if (!asset) {
      const base = `products/${p.slug}-${hash.slice(0, 10)}`;
      const variants = [];
      for (const w of WIDTHS) {
        const out = await sharp(normalized).resize({ width: w, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer({ resolveWithObject: true });
        const key = `${base}-${w}.webp`;
        await put(key, out.data);
        variants.push({ w, key, bytes: out.info.size, width: out.info.width, height: out.info.height });
      }
      const top = variants.at(-1);
      ({ rows: [asset] } = await pool.query(
        `INSERT INTO media_assets (bucket, object_key, mime_type, bytes, width, height, sha256, alt_text, variants, source_note)
         VALUES ($1,$2,'image/webp',$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
        [E.S3_BUCKET, base, top.bytes, top.width, top.height, hash, p.image_alt, JSON.stringify(variants), `Ressource source : ${file}`],
      ));
      console.log("importée :", file, variants.map((v) => `${v.width}px ${Math.round(v.bytes / 1024)} Ko`).join(", "));
    }
    await pool.query("INSERT INTO product_media (product_id, media_id, position) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING", [prod.id, asset.id, pos]);
  }
}

// Icônes et image de partage depuis le logo officiel (non modifié, seulement redimensionné).
const logo = await readFile(new URL("energy-plus/Logo-energy-plus.png", SRC));
const app = new URL("../src/app/", import.meta.url);
await sharp(logo).resize(512, 512).png().toFile(fileURLToPath(new URL("icon.png", app)));
await sharp(logo).resize(180, 180).flatten({ background: "#0c0c0c" }).png().toFile(fileURLToPath(new URL("apple-icon.png", app)));
await sharp(logo).resize(96, 96).png().toFile(fileURLToPath(new URL("../public/logo.png", import.meta.url)));
const og = await sharp({ create: { width: 1200, height: 630, channels: 4, background: "#0c0c0c" } })
  .composite([
    { input: await sharp(logo).resize(260, 260).toBuffer(), top: 120, left: 470 },
    { input: Buffer.from(`<svg width="1200" height="630"><text x="600" y="470" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="64" font-weight="700" fill="#f1d27c">Energy Plus</text><text x="600" y="530" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="30" fill="#a9a69d">Boutique en ligne · Cameroun</text></svg>`), top: 0, left: 0 },
  ])
  .png()
  .toBuffer();
await writeFile(new URL("opengraph-image.png", app), og);
console.log("icônes et image de partage générées");
await pool.end();
