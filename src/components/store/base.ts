import { headers } from "next/headers";
import { cache } from "react";

const ROOT = (process.env.ROOT_DOMAIN ?? "localhost:3000").toLowerCase();

/** Préfixe des liens : vide sur <boutique>.<domaine>, « /s/<boutique> » sur l'hôte de l'outil (aperçu). */
export const getBase = cache(async (slug: string) => {
  const host = ((await headers()).get("host") ?? "").toLowerCase();
  return host === `${slug}.${ROOT}` ? "" : `/s/${slug}`;
});
