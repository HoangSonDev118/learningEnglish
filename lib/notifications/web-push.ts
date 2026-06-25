import webpush from "web-push";
import { count, eq, lte } from "drizzle-orm";
import { getDb } from "@/db";
import { pushSubscriptions, vocabularyCards } from "@/db/schema";

const DUE_THRESHOLD = 50;
const NOTIFY_COOLDOWN_MS = 30 * 60 * 1000;

let vapidConfigured = false;

export type PushSubscriptionInput = {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
};

function ensureWebPushConfigured() {
  if (vapidConfigured) return true;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

export function getWebPushPublicKey() {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null;
}

export async function savePushSubscription(input: PushSubscriptionInput, userAgent?: string) {
  if (!input.endpoint || !input.keys?.p256dh || !input.keys?.auth) {
    throw new Error("Push subscription payload is invalid");
  }

  const db = getDb();
  const now = new Date();
  const expirationTime = input.expirationTime ? new Date(input.expirationTime) : null;

  await db
    .insert(pushSubscriptions)
    .values({
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      expirationTime,
      userAgent: userAgent ?? null,
      updatedAt: now,
      createdAt: now,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        expirationTime,
        userAgent: userAgent ?? null,
        updatedAt: now,
      },
    });
}

export async function removePushSubscription(endpoint: string) {
  const db = getDb();
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
}

async function getDueCount() {
  const db = getDb();
  const result = await db
    .select({ count: count() })
    .from(vocabularyCards)
    .where(lte(vocabularyCards.dueDate, new Date()));

  return Number(result[0]?.count ?? 0);
}

export async function sendDueReminderPushIfNeeded(options?: { force?: boolean }) {
  if (!ensureWebPushConfigured()) return { sent: 0, dueCount: 0 };

  const db = getDb();
  const dueCount = await getDueCount();
  if (!options?.force && dueCount <= DUE_THRESHOLD) {
    return { sent: 0, dueCount };
  }

  const now = new Date();
  const subscriptions = await db.select().from(pushSubscriptions);
  let sent = 0;

  for (const row of subscriptions) {
    if (row.expirationTime && row.expirationTime <= now) {
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, row.id));
      continue;
    }

    const lastNotifiedAt = row.lastNotifiedAt?.getTime() ?? 0;
    const isCoolingDown = now.getTime() - lastNotifiedAt < NOTIFY_COOLDOWN_MS;
    const notIncreasedEnough = dueCount <= row.lastNotifiedDueCount;

    if (!options?.force && isCoolingDown && notIncreasedEnough) {
      continue;
    }

    const payload = JSON.stringify({
      title: "Từ vựng cần ôn tập",
      body: `Yâu Yâu có ${dueCount} từ đến hạn. Let's goooooo!! 🔥🔥🔥.`,
      url: "/review",
    });

    try {
      await webpush.sendNotification(
        {
          endpoint: row.endpoint,
          expirationTime: row.expirationTime ? row.expirationTime.getTime() : null,
          keys: { p256dh: row.p256dh, auth: row.auth },
        },
        payload
      );

      sent += 1;
      await db
        .update(pushSubscriptions)
        .set({ lastNotifiedAt: now, lastNotifiedDueCount: dueCount, updatedAt: now })
        .where(eq(pushSubscriptions.id, row.id));
    } catch (error) {
      const statusCode = Number((error as { statusCode?: number })?.statusCode ?? 0);
      if (statusCode === 404 || statusCode === 410) {
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, row.id));
        continue;
      }
      await db
        .update(pushSubscriptions)
        .set({ updatedAt: now })
        .where(eq(pushSubscriptions.id, row.id));
    }
  }

  return { sent, dueCount };
}
