"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onUserApprovedPush = exports.onOrderStatusUpdatedPush = exports.onOrderCreatedPush = exports.onNotificationCreatedPush = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const messaging_1 = require("firebase-admin/messaging");
const firebase_functions_1 = require("firebase-functions");
const params_1 = require("firebase-functions/params");
const v2_1 = require("firebase-functions/v2");
const firestore_2 = require("firebase-functions/v2/firestore");
const FIRESTORE_DATABASE_ID = "ai-studio-mandoubak-dbcf65c3-e1f8-4cba-8ace-6290e2f2c547";
const FUNCTIONS_REGION = "europe-west1";
const ANDROID_CHANNEL_ID = "mandoubak_med_default";
const APP_ICON_PATH = "/icons/pwa-192x192.png";
const appBaseUrlParam = (0, params_1.defineString)("APP_BASE_URL", {
    default: "https://mandoubak-med-1-belalalqaisi55-afks-projects.vercel.app",
    description: "Public web app base URL used for Web Push click links",
});
let db;
let messaging;
(0, v2_1.onInit)(() => {
    const app = (0, app_1.getApps)().length > 0 ? (0, app_1.getApp)() : (0, app_1.initializeApp)();
    db = (0, firestore_1.getFirestore)(app, FIRESTORE_DATABASE_ID);
    messaging = (0, messaging_1.getMessaging)(app);
});
function extractUserTokens(userData) {
    const tokens = new Set();
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
async function pruneDeadTokens(deadTokens, userRecords) {
    if (deadTokens.size === 0)
        return;
    const batch = db.batch();
    let updates = 0;
    for (const { docId, data } of userRecords) {
        const currentTokens = Array.isArray(data.fcmTokens)
            ? data.fcmTokens.filter((t) => typeof t === "string" && t.trim().length > 0)
            : [];
        const filteredList = currentTokens.filter((t) => !deadTokens.has(t));
        const hadDeadPrimary = typeof data.fcmToken === "string" && deadTokens.has(data.fcmToken.trim());
        if (hadDeadPrimary || filteredList.length !== currentTokens.length) {
            const nextPrimary = filteredList[0] ||
                (hadDeadPrimary ? "" : (data.fcmToken || "").trim());
            batch.set(db.collection("users").doc(docId), {
                fcmToken: nextPrimary,
                fcmTokens: filteredList,
            }, { merge: true });
            updates++;
        }
    }
    if (updates > 0) {
        await batch.commit();
    }
}
async function dispatchFcmToUsers(params) {
    const { title, body, data = {}, targetUserIds, roles, respectTargetedPermission = false, } = params;
    const usersSnap = await db.collection("users").get();
    const userRecords = [];
    const tokenSet = new Set();
    const normalizedTargets = targetUserIds
        ? new Set(targetUserIds.map((id) => id.trim()).filter(Boolean))
        : null;
    const normalizedRoles = roles
        ? new Set(roles.map((r) => r.trim()).filter(Boolean))
        : null;
    for (const docSnap of usersSnap.docs) {
        const userData = docSnap.data();
        const candidateIds = [docSnap.id, userData.id].filter((v) => typeof v === "string" && v.trim().length > 0);
        if (normalizedTargets) {
            const matchesTarget = candidateIds.some((id) => normalizedTargets.has(id));
            if (!matchesTarget)
                continue;
        }
        if (normalizedRoles) {
            const roleMatch = typeof userData.role === "string" && normalizedRoles.has(userData.role);
            const repFallback = normalizedRoles.has("rep") && candidateIds.includes("u_rep");
            if (!roleMatch && !repFallback)
                continue;
        }
        if (respectTargetedPermission &&
            userData.permissions?.canReceiveTargetedNotifications === false) {
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
    const relativePath = data.url && data.url.startsWith("/") ? data.url : "/";
    const fullLink = `${baseUrl}${relativePath}`;
    const safeData = {
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
    const deadTokens = new Set();
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
            if (!resp.success &&
                (errCode === "messaging/registration-token-not-registered" ||
                    errCode === "messaging/invalid-registration-token")) {
                if (chunk[idx]) {
                    deadTokens.add(chunk[idx]);
                }
            }
        });
    }
    if (deadTokens.size > 0) {
        await pruneDeadTokens(deadTokens, userRecords).catch((err) => {
            firebase_functions_1.logger.warn("Dead FCM token cleanup warning", err);
        });
    }
    return {
        attempted: true,
        tokenCount: tokens.length,
        successCount: totalSuccess,
        failureCount: totalFailure,
    };
}
exports.onNotificationCreatedPush = (0, firestore_2.onDocumentCreated)({
    document: "notifications/{notificationId}",
    database: FIRESTORE_DATABASE_ID,
    region: FUNCTIONS_REGION,
}, async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const notif = snap.data();
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
    await snap.ref.set({
        fcmDispatchedBy: "cloud_function",
        fcmDispatchedAt: new Date().toISOString(),
        fcmResult: result,
    }, { merge: true });
});
exports.onOrderCreatedPush = (0, firestore_2.onDocumentCreated)({
    document: "orders/{orderId}",
    database: FIRESTORE_DATABASE_ID,
    region: FUNCTIONS_REGION,
}, async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const order = snap.data();
    if (order.fcmDispatchedBy || order.status !== "pending") {
        return;
    }
    const entityLabel = (order.entityName || order.clientName || "عميل").trim();
    const itemCount = Array.isArray(order.items) ? order.items.length : 0;
    const result = await dispatchFcmToUsers({
        title: `طلبية جديدة من ${entityLabel}`,
        body: itemCount > 0
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
    await snap.ref.set({
        fcmDispatchedBy: "cloud_function",
        fcmDispatchedAt: new Date().toISOString(),
        fcmResult: result,
    }, { merge: true });
});
const ORDER_STATUS_LABELS = {
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
exports.onOrderStatusUpdatedPush = (0, firestore_2.onDocumentUpdated)({
    document: "orders/{orderId}",
    database: FIRESTORE_DATABASE_ID,
    region: FUNCTIONS_REGION,
}, async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after)
        return;
    if (!after.status || before.status === after.status) {
        return;
    }
    const statusCopy = ORDER_STATUS_LABELS[after.status];
    if (!statusCopy)
        return;
    const targetIds = [after.clientId, after.userId].filter((v) => typeof v === "string" && v.trim().length > 0);
    if (targetIds.length === 0)
        return;
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
});
exports.onUserApprovedPush = (0, firestore_2.onDocumentUpdated)({
    document: "users/{userId}",
    database: FIRESTORE_DATABASE_ID,
    region: FUNCTIONS_REGION,
}, async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after)
        return;
    const becameApproved = (!before.isApproved && after.isApproved === true) ||
        (before.status !== "approved" && after.status === "approved");
    if (!becameApproved)
        return;
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
});
//# sourceMappingURL=index.js.map