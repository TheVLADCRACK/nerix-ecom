"use client";
import { useEffect } from "react";

/** Enregistre le service worker de l'outil (installation sur téléphone, alertes en arrière-plan). */
export function ServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
  }, []);
  return null;
}
