"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/ui/icons";
import { markNotificationsRead, type Note, pollNotifications } from "@/server/actions/notifications";

const KIND: Record<Note["kind"], { label: string; icon: IconName; notes: [number, number][] }> = {
  // [fréquence Hz, durée s] : un son reconnaissable par type d'alerte.
  order: { label: "Commande", icon: "orders", notes: [[523, 0.12], [659, 0.12], [784, 0.22]] }, // montée joyeuse
  payment: { label: "Paiement", icon: "cash", notes: [[988, 0.08], [1319, 0.25]] }, // caisse
  cancel: { label: "Annulation", icon: "x", notes: [[587, 0.16], [392, 0.3]] }, // descente
  cart: { label: "Panier abandonné", icon: "cart", notes: [[440, 0.12], [0, 0.06], [440, 0.12]] }, // double appel
  stock: { label: "Stock", icon: "box", notes: [[330, 0.1], [0, 0.05], [330, 0.1], [0, 0.05], [330, 0.18]] }, // alarme grave
  message: { label: "Message", icon: "inbox", notes: [[740, 0.18]] }, // note douce
};
const SOUND_KEY = "nx:sound";
const EVERY = 20_000;

let audio: AudioContext | undefined;
function play(kind: Note["kind"]) {
  try {
    audio ??= new AudioContext();
    let t = audio.currentTime + 0.02;
    for (const [hz, len] of KIND[kind].notes) {
      if (hz) {
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = "sine";
        osc.frequency.value = hz;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + len);
        osc.connect(gain).connect(audio.destination);
        osc.start(t);
        osc.stop(t + len + 0.02);
      }
      t += len;
    }
  } catch { /* son indisponible */ }
}

async function systemAlert(n: Note) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted" || document.visibilityState === "visible") return;
  const reg = await navigator.serviceWorker?.getRegistration();
  const opts = { body: n.body, tag: `nx-${n.id}`, icon: "/icons/icon-192.png", badge: "/icons/badge-96.png", data: { link: n.link } };
  if (reg) await reg.showNotification(n.title, opts);
  else new Notification(n.title, opts);
}

const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return m < 1 ? "à l'instant" : m < 60 ? `il y a ${m} min` : m < 1440 ? `il y a ${Math.round(m / 60)} h` : new Date(iso).toLocaleDateString("fr-FR");
};

/** Cloche de l'outil : sonde le serveur toutes les 20 s, joue le son du type d'alerte et prévient aussi quand l'application est en arrière-plan. */
export function NotificationBell() {
  const [items, setItems] = useState<Note[]>([]);
  const [lastRead, setLastRead] = useState(0);
  const [open, setOpen] = useState(false);
  const [sound, setSound] = useState(true);
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");
  const top = useRef(0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { setSound(localStorage.getItem(SOUND_KEY) !== "off"); } catch { /* stockage indisponible */ }
    setPerm(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
    let alive = true;
    let first = true;
    const tick = async () => {
      const r = await pollNotifications(top.current).catch(() => null);
      if (!alive || !r) return;
      setLastRead(r.lastRead);
      if (!r.items.length) { first = false; return; }
      top.current = Math.max(top.current, r.items[0]!.id);
      setItems((old) => [...r.items, ...old].slice(0, 50));
      if (first) { first = false; return; } // au chargement : pas de son pour l'historique
      let on = true;
      try { on = localStorage.getItem(SOUND_KEY) !== "off"; } catch { /* défaut : son actif */ }
      if (on) [...new Set(r.items.map((n) => n.kind))].forEach((k, i) => setTimeout(() => play(k), i * 900));
      r.items.slice(0, 3).forEach((n) => void systemAlert(n));
    };
    void tick();
    const timer = setInterval(tick, EVERY);
    const wake = () => { if (document.visibilityState === "visible") void tick(); };
    document.addEventListener("visibilitychange", wake);
    // Les navigateurs n'autorisent le son qu'après un geste : on prépare l'audio au premier toucher.
    const unlock = () => { try { audio ??= new AudioContext(); void audio.resume(); } catch { /* ignore */ } };
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => { alive = false; clearInterval(timer); document.removeEventListener("visibilitychange", wake); window.removeEventListener("pointerdown", unlock); };
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [open]);

  const unread = items.filter((n) => n.id > lastRead).length;
  const toggle = () => {
    setOpen(!open);
    if (!open && items[0] && items[0].id > lastRead) { setLastRead(items[0].id); void markNotificationsRead(items[0].id).catch(() => {}); }
  };
  const flipSound = () => {
    const next = !sound;
    setSound(next);
    try { localStorage.setItem(SOUND_KEY, next ? "on" : "off"); } catch { /* ignore */ }
    if (next) play("order");
  };
  const ask = async () => setPerm(await Notification.requestPermission());

  return (
    <div className="nx-notif" ref={box}>
      <button className="nx-iconbtn" aria-label={unread ? `Notifications : ${unread} non lues` : "Notifications"} aria-expanded={open} onClick={toggle}>
        <Icon name="bell" size={17} />
        {unread > 0 && <span className="nx-badge">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="nx-notif-pop" role="dialog" aria-label="Notifications">
          <header>
            <b>Notifications</b>
            <button className="nx-btn ghost" onClick={flipSound} aria-pressed={sound}>{sound ? "Son activé" : "Son coupé"}</button>
          </header>
          {perm === "default" && <button className="nx-btn" style={{ margin: "0 12px 8px" }} onClick={ask}><Icon name="bell" size={15} /> Recevoir les alertes sur ce téléphone</button>}
          {perm === "denied" && <p className="muted" style={{ margin: "0 12px 8px", fontSize: 12.5 }}>Alertes bloquées par le navigateur : autorisez-les dans les réglages du site.</p>}
          <ul>
            {items.length === 0 && <li className="muted" style={{ padding: 16 }}>Aucune notification pour l'instant.</li>}
            {items.map((n) => (
              <li key={n.id} className={n.id > lastRead ? "new" : undefined}>
                <Link href={n.link || "/"} onClick={() => setOpen(false)}>
                  <span className={`nx-notif-ico k-${n.kind}`}><Icon name={KIND[n.kind].icon} size={15} /></span>
                  <span><b>{n.title}</b>{n.body && <small>{n.body}</small>}<small className="muted">{KIND[n.kind].label} · {n.store} · {ago(n.at)}</small></span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
