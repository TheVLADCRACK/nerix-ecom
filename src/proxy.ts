import { NextResponse, type NextRequest } from "next/server";
import { neonAuth } from "@/server/auth";

// Domaine de l'outil : « localhost:3000 » en développement, « ecom.nerix.site » en production.
const ROOT = (process.env.ROOT_DOMAIN ?? "localhost:3000").toLowerCase();
const RESERVED = new Set(["app", "www", "admin", "api"]);
// Fichiers de l'application installable de l'outil : publics (le navigateur les charge sans session), absents des boutiques.
const PWA = /^\/(manifest\.webmanifest|sw\.js|offline\.html|icons\/.+)$/;

let authMw: ((req: NextRequest) => Promise<NextResponse>) | undefined;
const auth = () => (authMw ??= neonAuth().middleware({ loginUrl: "/connexion", publicRoutes: ["/inscription", "/s"] }));

/**
 * <boutique>.<domaine>/x → /s/<boutique>/x (public).
 * Outil : Neon Auth renouvelle ici la session expirée, car une page serveur n'a pas le droit d'écrire un cookie.
 * Les cookies renouvelés sont aussi passés à la requête, pour que la page lise la session à jour sans la réécrire.
 */
export async function proxy(req: NextRequest) {
  const host = (req.headers.get("host") ?? "").toLowerCase();
  if (host.endsWith(`.${ROOT}`)) {
    const sub = host.slice(0, -ROOT.length - 1);
    if (/^[a-z0-9-]{2,40}$/.test(sub) && !RESERVED.has(sub)) {
      const url = req.nextUrl.clone();
      url.pathname = `/s/${sub}${url.pathname === "/" ? "" : url.pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  if (PWA.test(req.nextUrl.pathname)) return NextResponse.next();
  const res = await auth()(req);
  const fresh = res.headers.getSetCookie();
  if (res.headers.has("location") || fresh.length === 0) return res;

  const jar = new Map(req.cookies.getAll().map((c) => [c.name, c.value]));
  for (const line of fresh) {
    const pair = line.split(";")[0] ?? "";
    const i = pair.indexOf("=");
    const name = pair.slice(0, i).trim();
    const value = pair.slice(i + 1).trim();
    if (!value || /max-age=0/i.test(line)) jar.delete(name);
    else jar.set(name, value);
  }
  const headers = new Headers(req.headers);
  headers.set("cookie", [...jar].map(([k, v]) => `${k}=${v}`).join("; "));
  const out = NextResponse.next({ request: { headers } });
  for (const line of fresh) out.headers.append("Set-Cookie", line);
  return out;
}

export const config = { matcher: ["/((?!_next/|api/|favicon|stores/|nerix).*)"] };
