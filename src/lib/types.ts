// Types partagés entre l'interface et le serveur.

export type StoreTheme = {
  colors: { ink: string; bg: string; accent: string; accentDeep: string; accentSoft: string; night: string; onNight: string };
  headingFont: "serif" | "sans";
};

export type Section =
  | { id: string; type: "hero"; enabled: boolean; eyebrow: string; title: string; text: string; ctaLabel: string; ctaHref: string; secondaryLabel: string; secondaryHref: string; productSlug: string }
  | { id: string; type: "trust"; enabled: boolean; items: string[] }
  | { id: string; type: "categories"; enabled: boolean; title: string }
  | { id: string; type: "products"; enabled: boolean; title: string; tabs: boolean; limit: number }
  | { id: string; type: "banner"; enabled: boolean; title: string; text: string; ctaLabel: string; ctaHref: string }
  | { id: string; type: "posts"; enabled: boolean; title: string }
  | { id: string; type: "newsletter"; enabled: boolean; title: string; text: string }
  | { id: string; type: "featured"; enabled: boolean; title: string; text: string; productSlug: string }
  | { id: string; type: "imageText"; enabled: boolean; title: string; text: string; productSlug: string; ctaLabel: string; ctaHref: string; reverse: boolean }
  | { id: string; type: "richtext"; enabled: boolean; title: string; text: string }
  | { id: string; type: "faq"; enabled: boolean; title: string; items: { q: string; a: string }[] };

export type SectionType = Section["type"];

export type Store = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  status: "active" | "draft";
  logo: string;
  favicon: string;
  heroImage: string | null;
  theme: StoreTheme;
  sections: Section[];
  contact: { phone: string; whatsapp: string; email: string; hours: string };
  social: { facebook: string; instagram: string; tiktok: string };
  /** Identifiants publics des pixels (jamais de jeton secret ici). */
  tracking: { metaPixelIds: string[]; tiktokPixelId: string; ga4Id: string; googleAdsId: string; gtmId: string };
  currency: "XAF";
  createdAt: string;
};

/** « creative » = visuel publicitaire carré (explications) affiché entier dans « Comment ça marche ». */
export type ProductImage = { src: string; srcSet: string; alt: string; width: number; height: number; kind: "photo" | "creative" };

export type Variant = { id: string; sku: string; title: string; price: number; compareAt: number | null; available: number };

/** Contenu propre à un produit, affiché selon le modèle de page produit de la boutique. `hidden` : masqué sans être supprimé. */
export type ProductBlock =
  | { type: "benefits" | "safety"; items: string[]; hidden?: boolean }
  | { type: "text"; title: string; body: string; hidden?: boolean }
  | { type: "imageText"; title: string; body: string; image: string; reverse: boolean; hidden?: boolean }
  | { type: "faq"; items: { q: string; a: string }[]; hidden?: boolean };

/** Modèle de page produit d'une boutique : ordre et visibilité des sections, boutons d'achat, garanties affichées. */
export type ProductPageKey = "assure" | "benefits" | "blocks" | "howto" | "reviews" | "faq" | "related";
export type ProductPage = { sections: { key: ProductPageKey; enabled: boolean }[]; addToCart: boolean; buyNow: boolean; assure: { icon: "cash" | "truck" | "phone" | "refresh" | "shield" | "gift" | "star" | "clock"; text: string }[] };

export type Category = { id: string; slug: string; path: string; name: string; description: string; parentPath: string | null };

export type Product = {
  id: string;
  slug: string;
  name: string;
  status: "active" | "draft" | "archived";
  categoryPath: string;
  brand: string | null;
  short: string;
  tag: string;
  images: ProductImage[];
  variants: Variant[];
  specs: { label: string; value: string; source: string }[];
  body: ProductBlock[];
  seoTitle: string;
  seoDescription: string;
};

export type OrderStatus = "pending" | "confirmed" | "processing" | "packed" | "completed" | "cancelled" | "returned";
export type PaymentStatus = "unpaid" | "pending" | "paid" | "partially_refunded" | "refunded";
export type FulfillmentStatus = "unfulfilled" | "in_delivery" | "delivered" | "failed" | "returned";

export type OrderLine = { sku: string; name: string; variant: string; unitPrice: number; quantity: number };

export type Order = {
  id: string;
  number: string;
  storeSlug: string;
  placedAt: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  paymentMethod: "cod" | "mobile_money" | "card";
  customer: { firstName: string; lastName: string; phone: string };
  city: string;
  neighborhood: string;
  landmark: string;
  lines: OrderLine[];
  subtotal: number;
  shipping: number;
  total: number;
  /** Date de livraison : le CA est compté à cette date (règle du classeur). */
  deliveredAt?: string;
  /** Remise accordée (déduite du total). */
  discount?: number;
  /** Partenaire de livraison et ce qu'il facture à la boutique (pas au client). */
  courier?: string;
  courierFee?: number;
  /** Le livreur a reversé l'argent encaissé (moins ses frais). */
  settled?: boolean;
  /** Origine de la commande (paramètres utm du lien publicitaire). */
  source?: { channel: string; campaign: string };
  /** Anciennes commandes seulement : frais de paiement ajoutés avant SasPay. */
  paymentFee?: number;
  /** Archivée (test, doublon) : affichée en grisé, exclue des statistiques, du stock et de la comptabilité. */
  archived?: boolean;
  cancelReason?: string;
  note?: string;
  events: { at: string; label: string; actor?: string }[];
};

export type Post = { slug: string; title: string; excerpt: string; category: string; publishedAt: string; minutes: number; bodyHtml: string; sources: { title: string; url: string }[]; productSlugs: string[] };

export type Page = { slug: string; title: string; bodyHtml: string };

/** Délais en minutes. */
export type City = { id: string; name: string; fee: number; etaMin: number; etaMax: number; neighborhoods: string[] };

export type StaffMember = { id: string; name: string; email: string; role: "Administrateur"; stores: string[]; lastSeen: string };

export type ContactMessage = { id: string; storeSlug: string; name: string; phone: string; message: string; createdAt: string; handled: boolean };

/** Avis réel d'un client livré, saisi par l'équipe avec l'accord du client. Jamais d'avis inventé. */
export type Review = { id: string; storeSlug: string; productSlug: string; name: string; city: string; rating: 1 | 2 | 3 | 4 | 5; text: string; photo: string | null; source: string; consent: boolean; published: boolean; createdAt: string };
