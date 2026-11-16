import "server-only";
import { AwsClient } from "aws4fetch";
import sharp from "sharp";
import { env } from "./env";
import { sha256 } from "./security";

export const IMAGE_WIDTHS = [480, 960, 1600] as const;
const MAX_BYTES = 10 * 1024 * 1024;

let client: AwsClient | undefined;
const s3 = () =>
  (client ??= new AwsClient({
    accessKeyId: env().AWS_ACCESS_KEY_ID,
    secretAccessKey: env().AWS_SECRET_ACCESS_KEY,
    region: env().AWS_REGION,
    service: "s3",
  }));

export const publicMediaUrl = (key: string) => `${env().AWS_ENDPOINT_URL_S3}/${env().S3_BUCKET}/${key}`;

async function put(key: string, body: Buffer, contentType: string) {
  const res = await s3().fetch(publicMediaUrl(key), {
    method: "PUT",
    body: new Uint8Array(body),
    headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=31536000, immutable" },
  });
  if (!res.ok) throw new Error(`Stockage : échec de l'envoi (${res.status})`);
}

/** Vérifie la signature binaire : seuls JPEG, PNG et WebP sont acceptés en entrée. */
export function sniffImage(buf: Buffer): "jpeg" | "png" | "webp" | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}

export type StoredImage = { src: string; srcSet: string; width: number; height: number };

/**
 * Ré-encode l'image (supprime EXIF et contenu caché), génère 3 largeurs WebP et les envoie dans le bucket public.
 * Clé = empreinte du fichier : la même image n'est jamais stockée deux fois. Nom de fichier toujours généré côté serveur.
 */
export async function storeImage(input: Buffer, opts: { folder: "products" | "reviews" | "stores"; storeSlug: string }): Promise<StoredImage> {
  if (input.length > MAX_BYTES) throw new Error("Image trop lourde (10 Mo maximum)");
  if (!sniffImage(input)) throw new Error("Format refusé : JPEG, PNG ou WebP uniquement");
  const base = sharp(input, { limitInputPixels: 40_000_000 }).rotate();
  const key = `${opts.folder}/${opts.storeSlug}/${sha256(input.toString("base64")).slice(0, 20)}`;
  const variants: { w: number; width: number; height: number }[] = [];
  for (const w of IMAGE_WIDTHS) {
    const out = await base.clone().resize({ width: w, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer({ resolveWithObject: true });
    if (variants.length && out.info.width === variants[variants.length - 1]!.width) break; // original plus petit : pas de doublon
    await put(`${key}-${w}.webp`, out.data, "image/webp");
    variants.push({ w, width: out.info.width, height: out.info.height });
  }
  const mid = variants[Math.min(1, variants.length - 1)]!;
  const largest = variants[variants.length - 1]!;
  return {
    src: publicMediaUrl(`${key}-${mid.w}.webp`),
    srcSet: variants.map((v) => `${publicMediaUrl(`${key}-${v.w}.webp`)} ${v.width}w`).join(", "),
    width: largest.width,
    height: largest.height,
  };
}
