import webpush from "web-push";
import { count, eq, lte } from "drizzle-orm";
import { getDb } from "@/db";
import { pushSubscriptions, vocabularyCards } from "@/db/schema";

const DUE_THRESHOLD = 30;
const NOTIFY_COOLDOWN_MS = 6 * 60 * 60 * 1000;

let vapidConfigured = false;

export type PushSubscriptionInput = {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
};

type PushSkipReason =
  | "below-threshold"
  | "not-configured"
  | "cooldown"
  | "expired"
  | "permission-gone"
  | "send-error";

type PushSendSummary = {
  sent: number;
  dueCount: number;
  threshold: number;
  totalSubscriptions: number;
  skipped: Record<PushSkipReason, number>;
};

function getVapidConfig() {
  return {
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY,
    subject: process.env.VAPID_SUBJECT,
  };
}

function ensureWebPushConfigured() {
  if (vapidConfigured) return true;

  const { publicKey, privateKey, subject } = getVapidConfig();
  if (!publicKey || !privateKey || !subject) return false;

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

function createEmptySkipped(): Record<PushSkipReason, number> {
  return {
    "below-threshold": 0,
    "not-configured": 0,
    cooldown: 0,
    expired: 0,
    "permission-gone": 0,
    "send-error": 0,
  };
}

function endpointTail(endpoint: string) {
  return endpoint.slice(-18);
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
  const configured = ensureWebPushConfigured();
  const skipped = createEmptySkipped();
  if (!configured) {
    skipped["not-configured"] = 1;
    return {
      sent: 0,
      dueCount: 0,
      threshold: DUE_THRESHOLD,
      totalSubscriptions: 0,
      skipped,
    } satisfies PushSendSummary;
  }

  const db = getDb();
  const dueCount = await getDueCount();
  if (!options?.force && dueCount <= DUE_THRESHOLD) {
    skipped["below-threshold"] = 1;
    return {
      sent: 0,
      dueCount,
      threshold: DUE_THRESHOLD,
      totalSubscriptions: 0,
      skipped,
    } satisfies PushSendSummary;
  }

  const now = new Date();
  const subscriptions = await db.select().from(pushSubscriptions);
  let sent = 0;

  for (const row of subscriptions) {
    if (row.expirationTime && row.expirationTime <= now) {
      skipped.expired += 1;
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, row.id));
      continue;
    }

    const lastNotifiedAt = row.lastNotifiedAt?.getTime() ?? 0;
    const isCoolingDown = now.getTime() - lastNotifiedAt < NOTIFY_COOLDOWN_MS;
    const notIncreasedEnough = dueCount <= row.lastNotifiedDueCount;

    if (!options?.force && isCoolingDown && notIncreasedEnough) {
      skipped.cooldown += 1;
      continue;
    }

    const payload = JSON.stringify({
      title: "Từ vựng cần ôn tập",
      body: `Yâu Yâu Yâu đang có ${dueCount} từ đến hạn. Vào app ngay để ôn tập nàoooooooo. Let's gooooooooooooooo 🔥🔥🔥🔥🔥`,
      url: "/review",
      dueCount,
      sentAt: now.toISOString(),
    });

    try {
      await webpush.sendNotification(
        {
          endpoint: row.endpoint,
          expirationTime: row.expirationTime ? row.expirationTime.getTime() : null,
          keys: {
            p256dh: row.p256dh,
            auth: row.auth,
          },
        },
        payload
      );

      sent += 1;
      await db
        .update(pushSubscriptions)
        .set({
          lastNotifiedAt: now,
          lastNotifiedDueCount: dueCount,
          updatedAt: now,
        })
        .where(eq(pushSubscriptions.id, row.id));
    } catch (error) {
      const statusCode = Number((error as { statusCode?: number })?.statusCode ?? 0);
      if (statusCode === 404 || statusCode === 410) {
        skipped["permission-gone"] += 1;
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, row.id));
        continue;
      }

      skipped["send-error"] += 1;

      await db
        .update(pushSubscriptions)
        .set({ updatedAt: now })
        .where(eq(pushSubscriptions.id, row.id));
    }
  }

  return {
    sent,
    dueCount,
    threshold: DUE_THRESHOLD,
    totalSubscriptions: subscriptions.length,
    skipped,
  } satisfies PushSendSummary;
}

export async function getPushDebugStatus() {
  const configured = ensureWebPushConfigured();
  const dueCount = await getDueCount();
  const now = new Date();
  const db = getDb();
  const subscriptions = await db.select().from(pushSubscriptions);

  const devices = subscriptions.map((row) => {
    const expired = !!(row.expirationTime && row.expirationTime <= now);
    const isCoolingDown =
      now.getTime() - (row.lastNotifiedAt?.getTime() ?? 0) < NOTIFY_COOLDOWN_MS;
    const notIncreasedEnough = dueCount <= row.lastNotifiedDueCount;
    const wouldSkipByCooldown = isCoolingDown && notIncreasedEnough;
    const belowThreshold = dueCount <= DUE_THRESHOLD;

    const nextAction = !configured
      ? "not-configured"
      : expired
        ? "expired"
        : belowThreshold
          ? "below-threshold"
          : wouldSkipByCooldown
            ? "cooldown"
            : "will-send";

    return {
      id: row.id,
      endpointTail: endpointTail(row.endpoint),
      userAgent: row.userAgent,
      expirationTime: row.expirationTime?.toISOString() ?? null,
      lastNotifiedAt: row.lastNotifiedAt?.toISOString() ?? null,
      lastNotifiedDueCount: row.lastNotifiedDueCount,
      nextAction,
    };
  });

  return {
    configured,
    dueCount,
    threshold: DUE_THRESHOLD,
    cooldownMs: NOTIFY_COOLDOWN_MS,
    totalSubscriptions: subscriptions.length,
    devices,
  };
}
