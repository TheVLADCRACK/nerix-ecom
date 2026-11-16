"use client";
import { useRef } from "react";
import { Icon } from "@/components/ui/icons";

/** « Explore our recommendations » : titre, flèches et défilement horizontal. */
export function Carousel({ title, children }: { title: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const go = (d: number) => ref.current?.scrollBy({ left: d * ref.current.clientWidth * 0.8, behavior: "smooth" });
  return (
    <section className="sf-reco">
      <header>
        <h2 className="sf-t">{title}</h2>
        <div className="sf-arrows">
          <button type="button" onClick={() => go(-1)} aria-label="Précédent"><Icon name="arrowLeft" size={18} /></button>
          <button type="button" onClick={() => go(1)} aria-label="Suivant"><Icon name="arrowRight" size={18} /></button>
        </div>
      </header>
      <div className="sf-carousel" ref={ref}>{children}</div>
    </section>
  );
}
