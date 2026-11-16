/** Lit ?periode= et renvoie [début, fin[ et un libellé. */
export function readPeriod(raw: string | undefined, now = new Date()) {
  const y = now.getFullYear();
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(raw ?? "");
  if (m) {
    const yy = Number(m[1]); const mm = Number(m[2]) - 1;
    const from = `${m[1]}-${m[2]}-01`;
    const to = mm === 11 ? `${yy + 1}-01-01` : `${yy}-${String(mm + 2).padStart(2, "0")}-01`;
    return { period: raw!, year: yy, from, to, label: new Date(Date.UTC(yy, mm, 1)).toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }) };
  }
  const yy = /^\d{4}$/.test(raw ?? "") ? Number(raw) : y;
  return { period: String(yy), year: yy, from: `${yy}-01-01`, to: `${yy + 1}-01-01`, label: `Année ${yy}` };
}
