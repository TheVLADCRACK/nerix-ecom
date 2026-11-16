// Lance le serveur de développement sur la copie de test (branche Neon « test-recette ») :
// les variables de .env.test-recette remplacent celles de .env.local pour ce processus seulement.
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";

for (const line of readFileSync(new URL("../.env.test-recette", import.meta.url), "utf8").split("\n")) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m) process.env[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
}
spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "-p", "3000"], { stdio: "inherit", env: process.env }).on("exit", (c) => process.exit(c ?? 0));
