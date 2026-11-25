import { getApp, getApps, initializeApp } from "firebase-admin/app";
import { Firestore, getFirestore } from "firebase-admin/firestore";
import { getMessaging, Messaging } from "firebase-admin/messaging";
import { logger } from "firebase-functions";
import { defineString } from "firebase-functions/params";
import { onInit } from "firebase-functions/v2";
import {
  onDocumentCreated,
  onDocumentUpdated,
} from "firebase-functions/v2/firestore";

const FIRESTORE_DATABASE_ID =
  "ai-studio-mandoubak-dbcf65c3-e1f8-4cba-8ace-6290e2f2c547";
const FUNCTIONS_REGION = "europe-west1";
const ANDROID_CHANNEL_ID = "mandoubak_med_default";
const APP_ICON_PATH = "/icons/pwa-192x192.png";

const appBaseUrlParam = defineString("APP_BASE_URL", {
  default: "https://mandoubak-med-1-belalalqaisi55-afks-projects.vercel.app",
  description: "Public web app base URL used for Web Push click links",
});

let db: Firestore;
let messaging: Messaging;

onInit(() => {
  const app = getApps().length > 0 ? getApp() : initializeApp();
  db = getFirestore(app, FIRESTORE_DATABASE_ID);
  messaging = getMessaging(app);
});

interface UserDoc {
  id?: string;
  role?: string;
  fcmToken?: string;
  fcmTokens?: string[];
  permissions?: {
    canReceiveTargetedNotifications?: boolean;
    [key: string]: unknown;
  };
}

interface NotificationDoc {
  id?: string;
  title?: string;
  message?: string;
  type?: "broadcast" | "target";
  targetClientId?: string;
  targetUserId?: string;
  isArchived?: boolean;
  fcmDispatchedBy?: string;
}

interface OrderDoc {
  id?: string;
  clientId?: string;
  userId?: string;
  clientName?: string;
  entityName?: string;
  status?: string;
  items?: Array<{ productName?: string; quantity?: number }>;
  fcmDispatchedBy?: string;
}

function extractUserTokens(userData: UserDoc): string[] {
  const tokens = new Set<string>();
  if (typeof userData.fcmToken === "string" && userData.fcmToken.trim()) {
    tokens.add(userData.fcmToken.trim());
  }
  if (Array.isArray(userData.fcmTokens)) {
    for (const token of userData.fcmTokens) {
      if (typeof token === "string" && token.trim()) {
        tokens.add(token.trim());
      }
    }
  }
  return Array.from(tokens);
}

async function pruneDeadTokens(
  deadTokens: Set<string>,
  userRecords: Array<{ docId: string; data: UserDoc }>
): Promise<void> {
  if (deadTokens.size === 0) return;

  const batch = db.batch();
  let updates = 0;

  for (const { docId, data } of userRecords) {
    const currentTokens = Array.isArray(data.fcmTokens)
      ? data.fcmTokens.filter((t) => typeof t === "string" && t.trim().length > 0)
      : [];
    const filteredList = currentTokens.filter((t) => !deadTokens.has(t));
    const hadDeadPrimary =
      typeof data.fcmToken === "string" && deadTokens.has(data.fcmToken.trim());

    if (hadDeadPrimary || filteredList.length !== currentTokens.length) {
      const nextPrimary =
        filteredList[0] ||
        (hadDeadPrimary ? "" : (data.fcmToken || "").trim());
      batch.set(
        db.collection("users").doc(docId),
        {
          fcmToken: nextPrimary,
          fcmTokens: filteredList,
        },
        { merge: true }
      );
      updates++;
    }
  }

  if (updates > 0) {
    await batch.commit();
  }
}

async function dispatchFcmToUsers(params: {
  title: string;
  body: string;
  data?: Record<string, string>;
  targetUserIds?: string[];
  roles?: string[];
  respectTargetedPermission?: boolean;
}): Promise<{
  attempted: boolean;
  tokenCount: number;
  successCount: number;
  failureCount: number;
  reason?: string;
}> {
  const {
    title,
    body,
    data = {},
    targetUserIds,
    roles,
    respectTargetedPermission = false,
  } = params;

  const usersSnap = await db.collection("users").get();
  const userRecords: Array<{ docId: string; data: UserDoc }> = [];
  const tokenSet = new Set<string>();

  const normalizedTargets = targetUserIds
    ? new Set(targetUserIds.map((id) => id.trim()).filter(Boolean))
    : null;
  const normalizedRoles = roles
    ? new Set(roles.map((r) => r.trim()).filter(Boolean))
    : null;

  for (const docSnap of usersSnap.docs) {
    const userData = docSnap.data() as UserDoc;
    const candidateIds = [docSnap.id, userData.id].filter(
      (v): v is string => typeof v === "string" && v.trim().length > 0
    );

    if (normalizedTargets) {
      const matchesTarget = candidateIds.some((id) => normalizedTargets.has(id));
      if (!matchesTarget) continue;
    }

    if (normalizedRoles) {
      const roleMatch =
        typeof userData.role === "string" && normalizedRoles.has(userData.role);
      const repFallback =
        normalizedRoles.has("rep") && candidateIds.includes("u_rep");
      if (!roleMatch && !repFallback) continue;
    }

    if (
      respectTargetedPermission &&
      userData.permissions?.canReceiveTargetedNotifications === false
    ) {
      continue;
    }

    userRecords.push({ docId: docSnap.id, data: userData });
    for (const token of extractUserTokens(userData)) {
      tokenSet.add(token);
    }
  }

  const tokens = Array.from(tokenSet);
  if (tokens.length === 0) {
    return {
      attempted: false,
      tokenCount: 0,
      successCount: 0,
      failureCount: 0,
      reason: "no_registered_tokens",
    };
  }

  const baseUrl = appBaseUrlParam.value().replace(/\/+$/, "");
  const relativePath =
    data.url && data.url.startsWith("/") ? data.url : "/";
  const fullLink = `${baseUrl}${relativePath}`;

  const safeData: Record<string, string> = {
    title,
    body,
    url: relativePath,
  };
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined && v !== null) {
      safeData[k] = String(v);
    }
  }

  let totalSuccess = 0;
  let totalFailure = 0;
  const deadTokens = new Set<string>();

  // FCM sendEachForMulticast supports up to 500 tokens per request
  for (let i = 0; i < tokens.length; i += 500) {
    const chunk = tokens.slice(i, i + 500);
    const batchRes = await messaging.sendEachForMulticast({
      tokens: chunk,
      notification: { title, body },
      data: safeData,
      android: {
        ttl: 3600 * 1000,
        collapseKey: "mandoubak_updates",
        notification: {
          channelId: ANDROID_CHANNEL_ID,
        },
      },
      webpush: {
        headers: {
          Urgency: "high",
          TTL: "86400",
        },
        notification: {
          title,
          body,
          icon: `${baseUrl}${APP_ICON_PATH}`,
          badge: `${baseUrl}${APP_ICON_PATH}`,
          dir: "rtl",
          lang: "ar",
          tag: safeData.notification_id || "mandoubak-med-notification",
          renotify: true,
        },
        fcmOptions: {
          link: fullLink,
        },
      },
    });

    totalSuccess += batchRes.successCount;
    totalFailure += batchRes.failureCount;

    batchRes.responses.forEach((resp, idx) => {
      const errCode = resp.error?.code || "";
      if (
        !resp.success &&
        (errCode === "messaging/registration-token-not-registered" ||
          errCode === "messaging/invalid-registration-token")
      ) {
        if (chunk[idx]) {
          deadTokens.add(chunk[idx]);
        }
      }
    });
  }

  if (deadTokens.size > 0) {
    await pruneDeadTokens(deadTokens, userRecords).catch((err) => {
      logger.warn("Dead FCM token cleanup warning", err);
    });
  }

  return {
    attempted: true,
    tokenCount: tokens.length,
    successCount: totalSuccess,
    failureCount: totalFailure,
  };
}

export const onNotificationCreatedPush = onDocumentCreated(
  {
    document: "notifications/{notificationId}",
    database: FIRESTORE_DATABASE_ID,
    region: FUNCTIONS_REGION,
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const notif = snap.data() as NotificationDoc;
    if (notif.isArchived || notif.fcmDispatchedBy) {
      return;
    }

    const title = (notif.title || "").trim();
    const message = (notif.message || "").trim();
    if (!title || !message) {
      return;
    }

    const targetId = (notif.targetClientId || notif.targetUserId || "").trim();
    const isTargeted = notif.type === "target" && targetId.length > 0;

    const result = await dispatchFcmToUsers({
      title,
      body: message,
      targetUserIds: isTargeted ? [targetId] : undefined,
      respectTargetedPermission: isTargeted,
      data: {
        notification_id: notif.id || event.params.notificationId,
        type: notif.type || "broadcast",
        url: "/",
      },
    });

    await snap.ref.set(
      {
        fcmDispatchedBy: "cloud_function",
        fcmDispatchedAt: new Date().toISOString(),
        fcmResult: result,
      },
      { merge: true }
    );
  }
);

export const onOrderCreatedPush = onDocumentCreated(
  {
    document: "orders/{orderId}",
    database: FIRESTORE_DATABASE_ID,
    region: FUNCTIONS_REGION,
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const order = snap.data() as OrderDoc;
    if (order.fcmDispatchedBy || order.status !== "pending") {
      return;
    }

    const entityLabel =
      (order.entityName || order.clientName || "عميل").trim();
    const itemCount = Array.isArray(order.items) ? order.items.length : 0;

    const result = await dispatchFcmToUsers({
      title: `طلبية جديدة من ${entityLabel}`,
      body:
        itemCount > 0
          ? `تم استلام طلبية جديدة تحتوي على ${itemCount} أصناف بانتظار المراجعة.`
          : "تم استلام طلبية جديدة بانتظار المراجعة والاعتماد.",
      roles: ["rep", "admin"],
      data: {
        type: "new_order",
        orderId: order.id || event.params.orderId,
        notification_id: `order_new_${event.params.orderId}`,
        url: "/",
      },
    });

    await snap.ref.set(
      {
        fcmDispatchedBy: "cloud_function",
        fcmDispatchedAt: new Date().toISOString(),
        fcmResult: result,
      },
      { merge: true }
    );
  }
);

const ORDER_STATUS_LABELS: Record<string, { title: string; body: string }> = {
  approved: {
    title: "تم اعتماد طلبيتك",
    body: "تمت الموافقة على طلبيتك وجاري تجهيزها للتوريد.",
  },
  processing: {
    title: "طلبيتك قيد التجهيز",
    body: "يتم الآن تجهيز أصناف طلبيتك للشحن والتسليم.",
  },
  completed: {
    title: "اكتملت طلبيتك بنجاح",
    body: "تم تسليم وإتمام طلبيتك. شكراً لتعاملك مع مندوبك الطبي.",
  },
  cancelled: {
    title: "تم إلغاء الطلبية",
    body: "تم تحديث حالة طلبيتك إلى ملغاة. تواصل مع المندوب للاستفسار.",
  },
};

export const onOrderStatusUpdatedPush = onDocumentUpdated(
  {
    document: "orders/{orderId}",
    database: FIRESTORE_DATABASE_ID,
    region: FUNCTIONS_REGION,
  },
  async (event) => {
    const before = event.data?.before.data() as OrderDoc | undefined;
    const after = event.data?.after.data() as OrderDoc | undefined;
    if (!before || !after) return;

    if (!after.status || before.status === after.status) {
      return;
    }

    const statusCopy = ORDER_STATUS_LABELS[after.status];
    if (!statusCopy) return;

    const targetIds = [after.clientId, after.userId].filter(
      (v): v is string => typeof v === "string" && v.trim().length > 0
    );
    if (targetIds.length === 0) return;

    await dispatchFcmToUsers({
      title: statusCopy.title,
      body: statusCopy.body,
      targetUserIds: targetIds,
      respectTargetedPermission: true,
      data: {
        type: "order_status",
        orderId: after.id || event.params.orderId,
        status: after.status,
        notification_id: `order_${after.status}_${event.params.orderId}`,
        url: "/",
      },
    });
  }
);

export const onUserApprovedPush = onDocumentUpdated(
  {
    document: "users/{userId}",
    database: FIRESTORE_DATABASE_ID,
    region: FUNCTIONS_REGION,
  },
  async (event) => {
    const before = event.data?.before.data() as
      | (UserDoc & { isApproved?: boolean; status?: string })
      | undefined;
    const after = event.data?.after.data() as
      | (UserDoc & { isApproved?: boolean; status?: string })
      | undefined;
    if (!before || !after) return;

    const becameApproved =
      (!before.isApproved && after.isApproved === true) ||
      (before.status !== "approved" && after.status === "approved");

    if (!becameApproved) return;

    await dispatchFcmToUsers({
      title: "تم تفعيل حسابك في مندوبك الطبي",
      body: "تمت مراجعة واعتماد حسابك بنجاح. يمكنك الآن تصفح الكتالوج وتقديم الطلبيات.",
      targetUserIds: [event.params.userId, after.id || ""].filter(Boolean),
      data: {
        type: "account_approved",
        notification_id: `approved_${event.params.userId}`,
        url: "/",
      },
    });
  }
);
