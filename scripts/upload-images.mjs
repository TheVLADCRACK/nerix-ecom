// Envoie les photos produits (originaux en lecture seule) vers Neon Object Storage en WebP 480/960/1600,
// sans aucun recadrage : photos et créatives restent entières (affichées en « contain »).
// Affiche la table PRODUCT_MEDIA à recopier dans src/data/energyplus.ts. Idempotent (clé = empreinte).
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { AwsClient } from "aws4fetch";

const E = process.env;
const SRC = new URL("../dossier sans titre/", import.meta.url);
const s3 = new AwsClient({ accessKeyId: E.AWS_ACCESS_KEY_ID, secretAccessKey: E.AWS_SECRET_ACCESS_KEY, region: E.AWS_REGION, service: "s3" });
const url = (key) => `${E.AWS_ENDPOINT_URL_S3}/${E.S3_BUCKET}/${key}`;

// crop = [gauche, haut, côté] mesurés sur une vignette de 420 px de large (converti à l'échelle réelle).
const PLAN = {
  "powerbank-magnetique-sans-fil": [
    { file: "images produit/MAGNETIC WIRELESS POWER BANK.jpg", alt: "Powerbank magnétique blanche, face avant et dos" },
    { file: "images produit/WhatsApp Image 2026-06-22 at 3.35.56 AM.jpeg", alt: "Powerbank magnétique fixée au dos d'un smartphone" },
    { file: "images produit/Batterie Externe Magnétique,5000mAh Magnetic Powerbank,PD20w Fonction de Charge Rapide sans Fil Chargeu, Recharge Rapide Portable Compatible avec iPhone15&14&13&12.jpg", alt: "Powerbank magnétique blanche vue de face et de profil" },
    { file: "images produit/LUCKYDUO Magnetic Wireless Power Bank,5000mAh Slim for Magsafe Battery Pack with USB C PD 20W Ultra Fast Charging Magnetic Portable Charger for iPhone16_16pro max15_14_13_12Series.jpg", alt: "Powerbank magnétique à côté d'un smartphone noir" },
    { file: "images produit/  18.46.03.jpg", alt: "Powerbank magnétique tenue en main au dos d'un téléphone" },
    { file: "images produit/carregador Portátil.jpg", alt: "Powerbank magnétique posée sur une table de chevet" },
    { file: "images produit/WhatsApp Image 2026-06-05 at 9.04.53 PM.jpeg", alt: "Powerbank magnétique fixée à un iPhone, avec ses boîtes" },
    { file: "images produit/WhatsApp Image 2026-06-22 at 3.35.57 AM-2.jpeg", alt: "Powerbank magnétique blanche tenue en main devant sa boîte" },
    { file: "Creatives/ChatGPT Image 3 juin 2026, 14_05_17 (1).png", kind: "creative", alt: "Pourquoi choisir la powerbank magnétique plutôt qu'une batterie à câble" },
    { file: "Creatives/Gemini_Generated_Image_v8l41v8l41v8l41v.png", kind: "creative", alt: "Powerbank 10 000 mAh, charge rapide 20 W, fixée à un iPhone" },
    { file: "Creatives/Gemini_Generated_Image_ji1tg4ji1tg4ji1t.png", kind: "creative", alt: "Powerbank MagSafe 10 000 mAh compatible iPhone, sans câble" },
    { file: "Creatives/Gemini_Generated_Image_ydnvl4ydnvl4ydnv.png", kind: "creative", alt: "Conçue pour les iPhone 12 à 15 : batterie 10 000 mAh, charge rapide" },
    { file: "Creatives/Gemini_Generated_Image_ff7mooff7mooff7m.png", kind: "creative", alt: "Powerbank magnétique tenue en main, avec sa base de recharge" },
  ],
  "lampe-anti-moustiques-mosqitoshot": [
    { file: "Creatives Statics/file_00000000115871f48d15dcb4fad6a2fd.png", kind: "creative", alt: "Pourquoi racheter des sprays chaque mois : la lampe se recharge par USB" },
    { file: "Creatives Statics/file_000000002bf871f499254af50fa0cc40.png", kind: "creative", alt: "Une nuit paisible, sans spray ni odeur" },
    { file: "Creatives Statics/file_000000002ca4724699e53f9dc5f18117.png", kind: "creative", alt: "Lampe MosqitoShot allumée dans une chambre, le soir" },
    { file: "Creatives Statics/file_000000004a3c71f4b22e509fdca05189.png", kind: "creative", alt: "Les moustiques entrent, ils ne ressortent plus : lampe allumée" },
    { file: "Creatives Statics/file_0000000075f071f490e1d88963554f91.png", kind: "creative", alt: "Lampe MosqitoShot en voyage, compacte et rechargeable" },
    { file: "Creatives Statics/file_000000009c3071f489070623ac5888ee.png", kind: "creative", alt: "Lampe MosqitoShot près d'une famille endormie" },
    { file: "Creatives Statics/file_00000000a1907243986ab07d92ae9497.png", kind: "creative", alt: "Avant, après : la famille sans spray ni spirale" },
    { file: "Creatives Statics/file_00000000c1007243a74b952468dfb27c.png", kind: "creative", alt: "Lampe MosqitoShot sur une table de nuit près d'un bébé" },
    { file: "Creatives Statics/file_00000000d85471f490365990bc822564.png", kind: "creative", alt: "Lampe MosqitoShot silencieuse sur un bureau" },
  ],
  "biodance-pore-tightening-collagen-ampoule": [
    { file: "Biodance/Images produits/Biodance_PoreTighteningCollagenAmpoule_Photo2.webp", alt: "Flacons de l'ampoule Biodance Pore Tightening Collagen" },
    { file: "Biodance/Images produits/Biodance_PoreTighteningCollagenAmpoule_Photo5.webp", alt: "Flacon Biodance avec sa pipette" },
    { file: "Biodance/Images produits/Biodance_PoreTighteningCollagenAmpoule_Photo8.webp", alt: "Flacon Biodance Pore Tightening Collagen Ampoule de face" },
    { file: "Biodance/Images produits/Biodance_PoreTighteningCollagenAmpoule_Photo6.webp", alt: "Application de l'ampoule Biodance sur le visage" },
    { file: "Biodance/Images produits/Biodance Pore Tightening Collagen Ampoule 50ml.jpg", alt: "Ingrédients mis en avant de l'ampoule Biodance" },
    { file: "Biodance/Images produits/Biodance_PoreTighteningCollagenAmpoule_Photo3.webp", alt: "Pipette de l'ampoule Biodance tenue au-dessus du flacon" },
    { file: "Biodance/Images produits/Biodance_PoreTighteningCollagenAmpoule_Photo4.webp", alt: "Flacon Biodance devant ses boîtes" },
  ],
};

const out = {};
for (const [slug, items] of Object.entries(PLAN)) {
  out[slug] = [];
  for (const it of items) {
    let img = sharp(await readFile(new URL(it.file, SRC))).rotate();
    if (it.crop) {
      const { width } = await img.metadata();
      const k = width / 420;
      const [l, t, s] = it.crop.map((v) => Math.round(v * k));
      img = img.extract({ left: l, top: t, width: s, height: s });
    }
    const master = await img.webp({ quality: 92 }).toBuffer();
    const hash = createHash("sha256").update(master).digest("hex").slice(0, 10);
    const key = `products/${slug}-${hash}`;
    const sizes = [];
    for (const w of [480, 960, 1600]) {
      const r = await sharp(master).resize({ width: w, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer({ resolveWithObject: true });
      if (sizes.length && r.info.width === sizes[sizes.length - 1][1]) break; // pas de doublon quand l'original est petit
      const head = await s3.fetch(url(`${key}-${w}.webp`), { method: "HEAD" });
      if (!head.ok) {
        const res = await s3.fetch(url(`${key}-${w}.webp`), { method: "PUT", body: r.data, headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable" } });
        if (!res.ok) throw new Error(`${key}-${w} : ${res.status}`);
      }
      sizes.push([w, r.info.width, r.info.height]);
    }
    out[slug].push({ key, alt: it.alt, kind: it.kind ?? "photo", sizes });
  }
}
console.log(JSON.stringify(out, null, 2));
