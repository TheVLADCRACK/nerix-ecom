// Service worker de l'outil Nerix Ecom : installation sur téléphone, page hors ligne, ouverture des notifications.
// Les pages et les données ne sont jamais mises en cache (toujours à jour, aucune donnée client stockée sur l'appareil).
const CACHE = "nerix-shell-v1";
const SHELL = ["/offline.html", "/icons/icon-192.png", "/nerix.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// Navigation : réseau d'abord ; sans réseau, page « hors ligne ».
self.addEventListener("fetch", (e) => {
  if (e.request.mode !== "navigate") return;
  e.respondWith(fetch(e.request).catch(() => caches.match("/offline.html")));
});

// Toucher une notification : ouvre (ou ramène) l'application sur la bonne page.
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.link || "/", self.location.origin).href;
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const win = wins.find((w) => new URL(w.url).origin === self.location.origin);
    if (win) { await win.focus(); return win.navigate(url); }
    return self.clients.openWindow(url);
  })());
});
