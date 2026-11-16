// Moyens de paiement (Cameroun). Aucun frais affiché ni ajouté par la boutique : le client paie le total affiché ;
// les frais du prestataire en ligne (SasPay) apparaissent seulement sur sa page de paiement.

export type PayMethod = "cod" | "mobile_money" | "card";

export const PAY_METHODS: { key: PayMethod; label: string; detail: string }[] = [
  { key: "cod", label: "Paiement à la livraison", detail: "En espèces, après avoir vérifié votre colis." },
  { key: "mobile_money", label: "Mobile Money", detail: "Orange Money ou MTN MoMo, sur la page de paiement sécurisée." },
  { key: "card", label: "Carte bancaire", detail: "Visa ou Mastercard, sur la page de paiement sécurisée." },
];

export const PAY_LABEL: Record<PayMethod, string> = { cod: "Paiement à la livraison", mobile_money: "Mobile Money", card: "Carte bancaire" };
