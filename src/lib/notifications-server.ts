/**
 * src/lib/notifications-server.ts
 *
 * Server-side notification helper. Used by every money-moving / sensitive
 * API route to fan a single event out into:
 *   1. A row in the `Notification` table (in-app notifications, polled by
 *      the SPA's notifications panel + bell badge in real time).
 *   2. A logged "email" (dev-mode simulation — real `sendEmail` would be
 *      called here in production) when the user has `emailNotif: true` AND
 *      the notification type warrants an email (transaction / security /
 *      warning).
 *
 * Why a single helper?
 *   - Consistent shape: every notification has title + message + type +
 *     channel + optional actionUrl + optional metadata.
 *   - Single place to add email / SMS / push fan-out later.
 *   - Failures here MUST NEVER break the parent operation. We log and move
 *     on — the user already got their money transferred; a notification
 *     failing to persist is a degraded experience, not a data-integrity bug.
 */

import { db } from "@/lib/db";

/** Notification types — kept in sync with the Prisma schema comment. */
export type NotificationType =
  | "info"
  | "success"
  | "warning"
  | "error"
  | "transaction"
  | "security"
  | "promo"
  | "bill"
  | "kyc"
  | "system";

/** Channels — kept in sync with the Prisma schema comment. */
export type NotificationChannel = "push" | "email" | "sms" | "in_app";

export interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  channel?: NotificationChannel;
  actionUrl?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Notification types that warrant an email when the user has email notifs on.
 * Promo / info / success / system notifications are in-app only — we don't
 * want to spam the user's inbox with "you bought 0.001 BTC" emails unless
 * the type explicitly opts in.
 */
const EMAIL_WORTHY_TYPES: NotificationType[] = [
  "transaction",
  "security",
  "warning",
  "bill",
  "kyc",
  "error",
];

/**
 * Create a notification (in-app row + optional email log) for the given user.
 *
 * This function is best-effort: if the DB write or the email log fails, it
 * logs the error and resolves — it NEVER throws. The caller (e.g. a transfer
 * route) already did the financial work; a notification failure must not roll
 * anything back.
 */
export async function createNotification(
  params: CreateNotificationParams,
): Promise<void> {
  const {
    userId,
    title,
    message,
    type = "info",
    channel = "push",
    actionUrl = null,
    metadata = null,
  } = params;

  try {
    await db.notification.create({
      data: {
        userId,
        title: String(title).slice(0, 200),
        message: String(message).slice(0, 1000),
        type,
        channel,
        isRead: false,
        actionUrl: actionUrl ?? null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  } catch (e) {
    // Don't let a notification failure break the parent operation.
    console.error("[createNotification] failed to persist:", e);
    return;
  }

  // Email fan-out — only for users who opted in AND the type warrants it.
  try {
    if (!EMAIL_WORTHY_TYPES.includes(type)) return;
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { email: true, emailNotif: true, firstName: true },
    });
    if (!user || !user.emailNotif || !user.email) return;

    // Dev-mode: log the email that WOULD be sent. In production this would
    // be `await sendEmail(user.email, title, message)`.
    console.log(
      `[email] To: ${user.email} | Subject: ${title} | Body: ${message}`,
    );
  } catch (e) {
    console.error("[createNotification] email fan-out failed:", e);
  }
}
