"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { type ActionResult, addCampaign, addCharge, addLoss, addPurchase, deletePurchase, updatePurchase } from "@/server/actions/manage";
import { Icon } from "@/components/ui/icons";
import { bankFee, type Lot, lotFees, trackedLink } from "@/lib/finance";
import { slugify, xaf } from "@/lib/format";

// Formulaires de saisie de gestion : validation immédiate ici, puis Server Action (session, Zod strict, store_id, audit_log).

type Opt = string[];
const today = () => new Date().toISOString().slice(0, 10);
const num = (f: FormData, k: string) => Number(String(f.get(k) ?? "").replace(/\s/g, "").replace(",", ".")) || 0;

function useSave() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const fail = (m: string) => { setMsg(null); setErr(m); };
  /** Envoie au serveur ; en cas de succès, vide le formulaire et rafraîchit les chiffres de la page. */
  const send = (call: () => Promise<ActionResult>, form?: HTMLFormElement) => start(async () => {
    try {
      const r = await call();
      if (!r.ok) return fail(r.error);
      setErr(null); setMsg(r.message ?? "Enregistré.");
      form?.reset();
      router.refresh();
    } catch { fail("Enregistrement impossible. Réessayez."); }
  });
  return { msg, err, pending, fail, send };
}
const Feedback = ({ msg, err }: { msg: string | null; err: string | null }) =>
  err ? <small role="alert" style={{ color: "var(--nx-red)" }}>{err}</small> : msg ? <small role="status" style={{ color: "var(--nx-green)" }}>{msg}</small> : null;
const Field = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => <label className="nx-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
const Select = ({ name, options, placeholder = "Choisir…" }: { name: string; options: Opt; placeholder?: string }) => (
  <select name={name} className="nx-select" defaultValue=""><option value="">{placeholder}</option>{options.map((o) => <option key={o}>{o}</option>)}</select>
);

/** Nouvel achat (lot) : calcule le coût de revient unitaire en direct, frais bancaires proposés selon la règle du classeur. */
/** Nouvel achat, ou modification d'un achat existant (`lot`) : quantité, prix et frais modifiables, ou suppression. */
export function PurchaseForm({ storeSlug, products, lot, onDone }: { storeSlug: string; products: Opt; lot?: Lot; onDone?: string }) {
  const s = useSave();
  const router = useRouter();
  const f0 = lot?.fees;
  const lotTotal = lot ? Math.round(lot.quantity * lot.unitPrice) : 0;
  const [v, setV] = useState({ qty: lot?.quantity ?? 0, total: lotTotal, fees: lot ? lotFees(lot) - lot.fees.bank : 0 });
  // Frais bancaires calculés à partir du total (1,79 % + 350 FCFA) tant qu'ils ne sont pas saisis à la main.
  const [bankInput, setBankInput] = useState<string | null>(lot ? String(f0?.bank ?? 0) : null);
  const bank = bankInput === null ? (v.total > 0 ? Math.round(bankFee(v.total)) : 0) : Number(bankInput.replace(/\s/g, "").replace(",", ".")) || 0;
  const unit = v.qty > 0 ? (v.total + v.fees + bank) / v.qty : 0;
  const dv = (n?: number) => (n ? String(n) : undefined);
  return (
    <form className="nx-card nx-grid" noValidate
      onInput={(e) => { const f = new FormData(e.currentTarget); setV({ qty: num(f, "qty"), total: num(f, "total"), fees: ["transport", "customs", "shipping", "packaging", "other"].reduce((a, k) => a + num(f, k), 0) }); }}
      onSubmit={(e) => {
        e.preventDefault(); const form = e.currentTarget; const f = new FormData(form);
        if (!f.get("product") || v.qty <= 0 || v.total <= 0) return s.fail("Produit, quantité et prix d'achat total sont obligatoires.");
        const data = { product: String(f.get("product")).trim(), supplier: String(f.get("supplier") ?? "").trim(), date: String(f.get("date")), quantity: v.qty, total: v.total,
          fees: { transport: num(f, "transport"), customs: num(f, "customs"), shipping: num(f, "shipping"), packaging: num(f, "packaging"), bank, other: num(f, "other") } };
        if (!lot) return s.send(async () => { const r = await addPurchase(storeSlug, data); if (r.ok) setBankInput(null); return r; }, form);
        s.send(async () => { const r = await updatePurchase(storeSlug, lot.id, data); if (r.ok && onDone) router.replace(onDone); return r; });
      }}>
      <div className="nx-form-grid">
        <Field label="Produit"><input name="product" className="nx-input" list="lot-products" placeholder="Choisir ou saisir" defaultValue={lot?.product} /></Field>
        <datalist id="lot-products">{products.map((p) => <option key={p} value={p} />)}</datalist>
        <Field label="Fournisseur"><input name="supplier" className="nx-input" defaultValue={lot?.supplier} /></Field>
        <Field label="Date d'achat"><input name="date" type="date" className="nx-input" defaultValue={lot?.date ?? today()} /></Field>
        <Field label="Quantité"><input name="qty" className="nx-input mono" inputMode="numeric" defaultValue={dv(lot?.quantity)} /></Field>
        <Field label="Prix d'achat total (FCFA)" hint="Montant payé au fournisseur pour toute la quantité."><input name="total" className="nx-input mono" inputMode="decimal" defaultValue={dv(lotTotal)} /></Field>
        <Field label="Transport"><input name="transport" className="nx-input mono" inputMode="decimal" defaultValue={dv(f0?.transport)} /></Field>
        <Field label="Douane"><input name="customs" className="nx-input mono" inputMode="decimal" defaultValue={dv(f0?.customs)} /></Field>
        <Field label="Expédition"><input name="shipping" className="nx-input mono" inputMode="decimal" defaultValue={dv(f0?.shipping)} /></Field>
        <Field label="Emballage"><input name="packaging" className="nx-input mono" inputMode="decimal" defaultValue={dv(f0?.packaging)} /></Field>
        <Field label="Frais bancaires" hint={bankInput === null ? "Calculés : 1,79 % du total + 350 FCFA (modifiables)" : "Saisis à la main"}><input name="bank" className="nx-input mono" inputMode="decimal" value={bankInput ?? (bank ? String(bank) : "")} onChange={(e) => setBankInput(e.target.value)} /></Field>
        <Field label="Autres frais"><input name="other" className="nx-input mono" inputMode="decimal" defaultValue={dv(f0?.other)} /></Field>
      </div>
      <div className="nx-alert" style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <span>Coût total : <b className="mono">{xaf(Math.round(v.total + v.fees + bank))}</b></span>
        <span>Coût de revient unitaire : <b className="mono">{xaf(Math.round(unit))}</b></span>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button className="nx-btn dark" type="submit" disabled={s.pending}><Icon name={lot ? "check" : "plus"} size={16} /> {lot ? "Enregistrer les modifications" : "Ajouter l'achat"}</button>
        {lot && <button className="nx-btn" type="button" disabled={s.pending} onClick={() => {
          if (!confirm(`Supprimer l'achat « ${lot.product} » (${lot.quantity} unités) ? Le stock sera recalculé.`)) return;
          s.send(async () => { const r = await deletePurchase(storeSlug, lot.id); if (r.ok && onDone) router.replace(onDone); return r; });
        }}>Supprimer l'achat</button>}
        {lot && onDone && <a className="nx-btn ghost" href={onDone}>Annuler</a>}
        <Feedback {...s} />
      </div>
    </form>
  );
}

export function ChargeForm({ storeSlug, categories, methods }: { storeSlug: string; categories: Opt; methods: Opt }) {
  const s = useSave();
  return (
    <form className="nx-card nx-grid" noValidate onSubmit={(e) => {
      e.preventDefault(); const form = e.currentTarget; const f = new FormData(form);
      if (!f.get("category") || num(f, "amount") <= 0) return s.fail("Catégorie et montant obligatoires.");
      s.send(() => addCharge(storeSlug, { date: String(f.get("date")), category: String(f.get("category")), description: String(f.get("description") ?? "").trim(), amount: num(f, "amount"), method: String(f.get("method") ?? ""), monthly: !!f.get("monthly"), included: !!f.get("included") }), form);
    }}>
      <div className="nx-form-grid">
        <Field label="Date"><input name="date" type="date" className="nx-input" defaultValue={today()} /></Field>
        <Field label="Catégorie"><Select name="category" options={categories} /></Field>
        <Field label="Montant (FCFA)"><input name="amount" className="nx-input mono" inputMode="decimal" /></Field>
        <Field label="Payé par"><Select name="method" options={methods} /></Field>
      </div>
      <Field label="Description"><input name="description" className="nx-input" maxLength={120} placeholder="Ex. Forfait internet de juillet" /></Field>
      <label className="nx-check"><input type="checkbox" name="monthly" /> Se répète chaque mois (internet, forfait, loyer…) : ajoutée automatiquement le même jour</label>
      <label className="nx-check"><input type="checkbox" name="included" /> Déjà compté dans le coût d'un achat (ne pas compter deux fois)</label>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}><button className="nx-btn dark" type="submit" disabled={s.pending}><Icon name="plus" size={16} /> Ajouter la dépense</button><Feedback {...s} /></div>
    </form>
  );
}

export function LossForm({ storeSlug, products, reasons }: { storeSlug: string; products: Opt; reasons: Opt }) {
  const s = useSave();
  return (
    <form className="nx-card nx-grid" noValidate onSubmit={(e) => {
      e.preventDefault(); const form = e.currentTarget; const f = new FormData(form);
      if (!f.get("product") || num(f, "qty") <= 0 || !f.get("reason")) return s.fail("Produit, quantité et motif obligatoires.");
      s.send(() => addLoss(storeSlug, { date: String(f.get("date")), product: String(f.get("product")), quantity: num(f, "qty"), reason: String(f.get("reason")), note: String(f.get("note") ?? "").trim() }), form);
    }}>
      <div className="nx-form-grid">
        <Field label="Date"><input name="date" type="date" className="nx-input" defaultValue={today()} /></Field>
        <Field label="Produit"><Select name="product" options={products} /></Field>
        <Field label="Quantité"><input name="qty" className="nx-input mono" inputMode="numeric" /></Field>
        <Field label="Motif"><Select name="reason" options={reasons} /></Field>
      </div>
      <Field label="Note"><input name="note" className="nx-input" maxLength={160} /></Field>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}><button className="nx-btn dark" type="submit" disabled={s.pending}><Icon name="plus" size={16} /> Enregistrer la perte</button><Feedback {...s} /></div>
    </form>
  );
}

/** Campagne : budget en FCFA ou EUR (taux du réglage), période pour répartir la dépense, et lien suivi à mettre dans la publicité. */
export function CampaignForm({ storeSlug, platforms, products, eurRate, storeUrl }: { storeSlug: string; platforms: Opt; products: { slug: string; name: string }[]; eurRate: number; storeUrl: string }) {
  const s = useSave();
  const [cur, setCur] = useState<"XAF" | "EUR">("XAF");
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState("");
  const [product, setProduct] = useState("");
  const [copied, setCopied] = useState(false);
  const code = slugify(name).slice(0, 40);
  const link = code && platform ? trackedLink(`${storeUrl}${product ? `/produits/${product}` : "/shop"}`, { platform, code }) : "";
  return (
    <form className="nx-card nx-grid" noValidate onSubmit={(e) => {
      e.preventDefault(); const f = new FormData(e.currentTarget);
      if (!platform || !code || num(f, "spend") <= 0 || !f.get("start")) return s.fail("Plateforme, nom, date de début et budget obligatoires.");
      if (f.get("end") && String(f.get("end")) < String(f.get("start"))) return s.fail("La fin doit être après le début.");
      s.send(() => addCampaign(storeSlug, { platform, name: name.trim(), products: products.find((x) => x.slug === product)?.name ?? "", cities: String(f.get("cities") ?? "").trim(),
        start: String(f.get("start")), end: String(f.get("end") ?? ""), spend: num(f, "spend"), currency: cur }));
    }}>
      <div className="nx-form-grid">
        <Field label="Plateforme"><select className="nx-select" value={platform} onChange={(e) => setPlatform(e.target.value)}><option value="">Choisir…</option>{platforms.map((o) => <option key={o}>{o}</option>)}</select></Field>
        <Field label="Nom de la campagne" hint={code ? `Code : ${code}` : undefined}><input className="nx-input" maxLength={60} placeholder="Ex. Lampe Douala novembre" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Produit mis en avant"><select className="nx-select" value={product} onChange={(e) => setProduct(e.target.value)}><option value="">Toute la boutique</option>{products.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}</select></Field>
        <Field label="Villes ciblées"><input name="cities" className="nx-input" placeholder="Douala, Yaoundé" /></Field>
        <Field label="Début"><input name="start" type="date" className="nx-input" defaultValue={today()} /></Field>
        <Field label="Fin" hint="La dépense est répartie par jour entre ces dates."><input name="end" type="date" className="nx-input" /></Field>
        <Field label="Budget dépensé"><input name="spend" className="nx-input mono" inputMode="decimal" /></Field>
        <Field label="Devise" hint={cur === "EUR" ? `Converti au taux de ${eurRate} FCFA` : undefined}>
          <select name="currency" className="nx-select" value={cur} onChange={(e) => setCur(e.target.value as "XAF" | "EUR")}><option value="XAF">FCFA</option><option value="EUR">Euro</option></select>
        </Field>
      </div>
      <div className="nx-field">
        <span>Lien à mettre dans la publicité</span>
        <div style={{ display: "flex", gap: 6 }}>
          <input className="nx-input mono" readOnly value={link} placeholder="Choisissez la plateforme et le nom" style={{ fontSize: 12 }} aria-label="Lien suivi" />
          <button type="button" className="nx-btn" disabled={!link} onClick={async () => { try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {} }}>{copied ? "Copié" : "Copier"}</button>
        </div>
        <small>Chaque commande passée depuis ce lien est comptée pour cette campagne : commandes, livrées et CA se remplissent tout seuls.</small>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}><button className="nx-btn dark" type="submit" disabled={s.pending}><Icon name="plus" size={16} /> Ajouter la campagne</button><Feedback {...s} /></div>
    </form>
  );
}
