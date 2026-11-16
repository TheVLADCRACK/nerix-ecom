"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

// Étape A : panier côté navigateur (prix toujours relus depuis le catalogue fourni par le serveur).
// Étape B : remplacé par le cookie HTTP-only et des Server Actions ; le serveur recalcule tout à la commande.
export type CatalogItem = { sku: string; productSlug: string; productName: string; variantTitle: string; price: number; available: number; image: string | null };
type Line = { sku: string; qty: number };
type Ctx = {
  base: string;
  storeSlug: string;
  lines: (CatalogItem & { qty: number })[];
  count: number;
  subtotal: number;
  add: (sku: string, qty?: number) => void;
  set: (sku: string, qty: number) => void;
  clear: () => void;
  find: (sku: string) => CatalogItem | undefined;
};

const CartCtx = createContext<Ctx | null>(null);

export function StoreProvider({ base, storeSlug, catalog, children }: { base: string; storeSlug: string; catalog: CatalogItem[]; children: React.ReactNode }) {
  const key = `cart:${storeSlug}`;
  const [raw, setRaw] = useState<Line[]>([]);
  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem(key) ?? "[]");
      if (Array.isArray(v)) setRaw(v.filter((l) => typeof l?.sku === "string" && Number.isInteger(l?.qty) && l.qty > 0).slice(0, 20));
    } catch {}
  }, [key]);
  const save = useCallback((next: Line[]) => {
    setRaw(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
  }, [key]);

  const bySku = useMemo(() => new Map(catalog.map((c) => [c.sku, c])), [catalog]);
  const lines = raw.flatMap((l) => {
    const c = bySku.get(l.sku);
    return c ? [{ ...c, qty: Math.min(l.qty, Math.max(c.available, 0), 5) }] : [];
  }).filter((l) => l.qty > 0);

  const value: Ctx = {
    base, storeSlug, lines,
    count: lines.reduce((n, l) => n + l.qty, 0),
    subtotal: lines.reduce((n, l) => n + l.qty * l.price, 0),
    add: (sku, qty = 1) => {
      const cur = raw.find((l) => l.sku === sku);
      save(cur ? raw.map((l) => (l.sku === sku ? { ...l, qty: l.qty + qty } : l)) : [...raw, { sku, qty }]);
    },
    set: (sku, qty) => save(qty <= 0 ? raw.filter((l) => l.sku !== sku) : raw.map((l) => (l.sku === sku ? { ...l, qty } : l))),
    clear: () => save([]),
    find: (sku) => bySku.get(sku),
  };
  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useStore() {
  const c = useContext(CartCtx);
  if (!c) throw new Error("useStore hors de StoreProvider");
  return c;
}
