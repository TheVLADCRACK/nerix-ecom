"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icons";
import { displayPhone, feeText, isCmMobile, normalizeCmPhone, xaf } from "@/lib/format";
import type { City } from "@/lib/types";
import { useStore } from "./cart";
import { placeOrder, saveCart } from "@/server/actions/shop";
import { slipKey } from "./slip";
import { readSource } from "./source";
import { PAY_LABEL, PAY_METHODS, type PayMethod } from "@/lib/payment";
import { track } from "./tracking";

type Errors = Partial<Record<"firstName" | "lastName" | "phone" | "whatsapp" | "city" | "neighborhood", string>>;

export function CheckoutForm({ cities, storeSlug, onlinePayments, direct }: { cities: City[]; storeSlug: string; onlinePayments: boolean; direct?: { sku: string; qty: number } }) {
  const cart = useStore();
  const { base } = cart;
  const item = direct ? cart.find(direct.sku) : undefined;
  // Achat direct depuis la fiche produit : seul cet article, le panier n'est pas touché.
  const lines = item ? [{ ...item, qty: Math.max(1, Math.min(direct!.qty, item.available, 5)) }] : cart.lines;
  const subtotal = lines.reduce((n, l) => n + l.qty * l.price, 0);
  const clear = item ? () => {} : cart.clear;
  const router = useRouter();
  const [cityId, setCityId] = useState("");
  const [sameWa, setSameWa] = useState(true);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [idemKey] = useState(() => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : ""));
  const [phone, setPhone] = useState("");
  const okPhone = normalizeCmPhone(phone);
  const city = cities.find((c) => c.id === cityId);
  const shipping = city?.fee ?? 0;
  // Paiement : à la livraison par défaut ; en ligne (Mobile Money, carte) sur la page sécurisée KPay.
  const [method, setMethod] = useState<PayMethod>("cod");
  const [paying, setPaying] = useState<string | null>(null);
  const total = subtotal + shipping;
  const started = lines.length > 0;
  // Panier abandonné : la saisie est envoyée 2 s après la dernière frappe, une fois le numéro valide.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastSaved = useRef("");
  const remember = (form: HTMLFormElement) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const f = new FormData(form);
      const get = (k: string) => String(f.get(k) ?? "").trim().slice(0, 60);
      if (!idemKey || !isCmMobile(normalizeCmPhone(get("phone")))) return;
      const payload = { key: idemKey, lines: lines.map((l) => ({ sku: l.sku, qty: l.qty })), firstName: get("firstName"), lastName: get("lastName"), phone: get("phone"), cityId: get("city") };
      const sig = JSON.stringify(payload);
      if (sig === lastSaved.current) return;
      lastSaved.current = sig;
      saveCart(storeSlug, payload).catch(() => { lastSaved.current = ""; }); // échec : renvoyé à la prochaine saisie
    }, 2000);
  };
  useEffect(() => () => clearTimeout(saveTimer.current), []);
  useEffect(() => {
    if (started) track("InitiateCheckout", { value: subtotal, items: lines.map((l) => ({ id: l.sku, name: l.productName, value: l.price, quantity: l.qty })) });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- une seule fois à l'ouverture du checkout
  }, [started]);

  if (!lines.length)
    return (
      <div className="sf-page"><div className="sf-wrap"><div className="sf-empty sf-glass"><strong>Votre panier est vide.</strong><Link href={`${base}/shop`} className="sf-btn primary">Voir la boutique</Link></div></div></div>
    );

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    const err: Errors = {};
    if (get("firstName").length < 1) err.firstName = "Indiquez votre prénom.";
    if (get("lastName").length < 1) err.lastName = "Indiquez votre nom.";
    if (!isCmMobile(normalizeCmPhone(get("phone")))) err.phone = "Numéro de mobile camerounais à 9 chiffres commençant par 6, par exemple 6 90 00 00 00.";
    if (!sameWa && get("whatsapp") && !isCmMobile(normalizeCmPhone(get("whatsapp")))) err.whatsapp = "Numéro WhatsApp invalide : mobile commençant par 6.";
    if (!cityId) err.city = "Choisissez votre ville.";
    if (!get("neighborhood")) err.neighborhood = "Indiquez votre quartier.";
    setErrors(err);
    if (Object.keys(err).length) {
      document.getElementById(`co-${Object.keys(err)[0]}`)?.focus();
      return;
    }
    setBusy(true);
    setFormError("");
    if (method !== "cod") setPaying("Ouverture de la page de paiement sécurisée…");
    // Le serveur recalcule prix, stock, frais et total, attribue le numéro et lance le paiement en ligne si choisi.
    placeOrder(storeSlug, {
      idempotencyKey: idemKey, lines: lines.map((l) => ({ sku: l.sku, qty: l.qty })),
      firstName: get("firstName"), lastName: get("lastName"), phone: get("phone"), whatsapp: sameWa ? "" : get("whatsapp"), email: get("email"),
      cityId, neighborhood: get("neighborhood"), landmark: get("landmark"), note: get("note"),
      payment: method, source: readSource(),
    }).then((r) => {
      if (!r.ok) {
        setBusy(false); setPaying(null); setFormError(r.error);
        if (r.field) document.getElementById(`co-${r.field}`)?.focus();
        return;
      }
      // Bordereau (sans téléphone ni email) lu par la page de confirmation, avec les montants calculés par le serveur.
      try {
        sessionStorage.setItem(slipKey(r.number), JSON.stringify({
          store: r.storeName, number: r.number, placedAt: r.placedAt, paid: false, subtotal: r.subtotal, shipping: r.shipping,
          paymentLabel: r.payment.method === "cod" ? undefined : PAY_LABEL[r.payment.method],
          online: r.payment.method !== "cod", total: r.total, lines: r.lines, trackUrl: `${window.location.host}${base}/suivi-commande`,
        }));
      } catch { /* stockage indisponible : la confirmation s'affiche sans bordereau */ }
      clear();
      if (r.payment.method !== "cod") { window.location.assign(r.payment.gatewayUrl); return; }
      router.push(`${base}/commande/confirmation/${r.number}?t=${encodeURIComponent(r.token)}`);
    }).catch(() => { setBusy(false); setPaying(null); setFormError("Connexion interrompue. Vérifiez votre réseau puis réessayez."); });
  }

  const field = (name: keyof Errors, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="sf-field">
      <span>{label}</span>
      <input id={`co-${name}`} name={name} className="sf-input" aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `co-${name}-err` : undefined} {...props} />
      {errors[name] && <span id={`co-${name}-err`} className="sf-error">{errors[name]}</span>}
    </label>
  );

  return (
    <div className="sf-page">
      <div className="sf-wrap">
        <h1 className="sf-h">Commande</h1>
        <form className="sf-checkout" onSubmit={(e) => { clearTimeout(saveTimer.current); submit(e); }} onChange={(e) => remember(e.currentTarget)} noValidate>
          <div style={{ display: "grid", gap: 20 }}>
            <section className="sf-panel sf-glass">
              <h2>Vos coordonnées</h2>
              <div className="sf-two">
                {field("firstName", "Prénom", { autoComplete: "given-name" })}
                {field("lastName", "Nom", { autoComplete: "family-name" })}
              </div>
              {field("phone", "Téléphone", { inputMode: "tel", autoComplete: "tel", placeholder: "6 90 00 00 00", value: phone, onChange: (e) => setPhone(e.currentTarget.value) })}
              {isCmMobile(okPhone) && !errors.phone && <small className="sf-muted" role="status" style={{ marginTop: -8 }}>Nous vous appellerons et vous écrirons sur WhatsApp au <b>{displayPhone(okPhone)}</b>. Vérifiez qu'il est juste.</small>}
              <label className="sf-option" style={{ padding: "10px 14px" }}>
                <input type="checkbox" checked={sameWa} onChange={(e) => setSameWa(e.target.checked)} />
                <span>Ce numéro est aussi mon WhatsApp</span>
              </label>
              {!sameWa && field("whatsapp", "WhatsApp (facultatif)", { inputMode: "tel", placeholder: "6 90 00 00 00" })}
              <label className="sf-field"><span>Email (facultatif)</span><input name="email" type="email" className="sf-input" autoComplete="email" /></label>
              <small className="sf-muted">Vos nom, numéro et ville sont enregistrés pendant la saisie pour que nous puissions vous aider à finaliser la commande.</small>
            </section>
            <section className="sf-panel sf-glass">
              <h2>Livraison</h2>
              <label className="sf-field">
                <span>Ville</span>
                <select id="co-city" name="city" value={cityId} onChange={(e) => setCityId(e.target.value)} aria-invalid={!!errors.city} aria-describedby={errors.city ? "co-city-err" : undefined}>
                  <option value="">Choisir…</option>
                  {cities.map((c) => <option key={c.id} value={c.id}>{c.name} · {feeText(c.fee)}</option>)}
                </select>
                {errors.city && <span id="co-city-err" className="sf-error">{errors.city}</span>}
              </label>
              {field("neighborhood", "Quartier", { list: "co-quarters", autoComplete: "address-level3", placeholder: city?.neighborhoods.length ? "Choisir ou saisir" : "Votre quartier" })}
              <datalist id="co-quarters">{city?.neighborhoods.map((n) => <option key={n} value={n} />)}</datalist>
              <label className="sf-field"><span>Point de repère</span><input name="landmark" className="sf-input" placeholder="Ex. face à la pharmacie, portail bleu" /><small>Aide le livreur à vous trouver.</small></label>
              <label className="sf-field"><span>Note (facultatif)</span><textarea name="note" /></label>
            </section>
            <section className="sf-panel sf-glass">
              <h2>Paiement</h2>
              {PAY_METHODS.map((m) => (
                <label key={m.key} className="sf-option" aria-disabled={m.key !== "cod" && !onlinePayments}>
                  <input type="radio" name="payment" value={m.key} checked={method === m.key} disabled={m.key !== "cod" && !onlinePayments} onChange={() => setMethod(m.key)} />
                  <span style={{ flex: 1 }}>
                    <strong>{m.label}</strong>
                    <br /><span className="sf-muted">{m.key !== "cod" && !onlinePayments ? "Bientôt disponible." : m.detail}</span>
                  </span>
                </label>
              ))}
            </section>
          </div>
          <aside className="sf-panel sf-glass" style={{ position: "sticky", top: 96 }}>
            <h2>Récapitulatif</h2>
            {lines.map((l) => (
              <div className="sf-line" key={l.sku} style={{ gridTemplateColumns: "48px 1fr auto" }}>
                {l.image ? <img src={l.image} alt="" style={{ width: 48, height: 48 }} /> : <span />}
                <span style={{ fontSize: 14 }}>{l.productName}<br /><span className="sf-muted">{l.variantTitle} × {l.qty}</span></span>
                <span className="sf-price" style={{ fontSize: 14 }}>{xaf(l.price * l.qty)}</span>
              </div>
            ))}
            <div className="sf-sum">
              <span>Sous-total</span><span className="sf-price">{xaf(subtotal)}</span>
              <span>Livraison</span><span className="sf-price">{city ? feeText(shipping) : "—"}</span>
              <span className="total">{method === "cod" ? "À payer à la livraison" : "Total à payer maintenant"}</span><span className="total sf-price">{xaf(total)}</span>
            </div>
            <button className="sf-btn primary block" type="submit" disabled={busy}>{busy ? "Envoi…" : method === "cod" ? "Confirmer la commande" : `Payer ${xaf(total)}`} <Icon name={method === "cod" ? "check" : "lock"} size={16} /></button>
            {formError && <p role="alert" className="sf-error" style={{ fontSize: 14 }}>{formError}</p>}
            {paying && <p role="status" className="sf-panel" style={{ padding: 12, fontSize: 13.5, border: "1px dashed var(--line)" }}>{paying}</p>}
            <p className="sf-muted" style={{ fontSize: 12.5 }}>En confirmant, vous acceptez nos <Link href={`${base}/cgv`} style={{ textDecoration: "underline" }}>conditions de vente</Link>. Nous vous appelons pour confirmer avant l'expédition.</p>
          </aside>
        </form>
      </div>
    </div>
  );
}
