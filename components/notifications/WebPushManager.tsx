"use client";

import { useEffect } from "react";

function base64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

async function upsertSubscription(registration: ServiceWorkerRegistration) {
  const keyRes = await fetch("/api/push/public-key", { cache: "no-store" });
  if (!keyRes.ok) return;

  const { publicKey } = (await keyRes.json()) as { publicKey?: string };
  if (!publicKey) return;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64ToUint8Array(publicKey),
    });
  }

  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: subscription.toJSON() }),
  });
}

export function WebPushManager() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    let cancelled = false;

    const setup = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");

        if (Notification.permission === "granted") {
          await upsertSubscription(registration);
          return;
        }

        if (Notification.permission !== "default") return;

        const askPermissionOnFirstTap = async () => {
          if (cancelled) return;
          const permission = await Notification.requestPermission();
          if (permission === "granted") {
            await upsertSubscription(registration);
          }
        };

        window.addEventListener("click", askPermissionOnFirstTap, { once: true });
      } catch {
        // Ignore push setup errors to avoid affecting app rendering.
      }
    };

    void setup();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
