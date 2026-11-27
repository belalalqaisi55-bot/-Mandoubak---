import React, { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Check,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  FileSpreadsheet,
  Lock,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Unlock,
  Users,
  X,
} from "lucide-react";
import { User, UserPermissions } from "../types";
import { nativePlayClick, nativeVibrate } from "../utils/nativeBridge";

export const DEFAULT_USER_PERMISSIONS: UserPermissions = {
  canAccessStockReports: true,
  canViewVisits: true,
  canReceiveTargetedNotifications: true,
  canExportReports: true,
  canViewAgreements: true,
};

export const RESTRICTED_USER_PERMISSIONS: UserPermissions = {
  canAccessStockReports: false,
  canViewVisits: false,
  canReceiveTargetedNotifications: false,
  canExportReports: false,
  canViewAgreements: false,
};

interface PermissionMeta {
  key: keyof UserPermissions;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ReactNode;
}

const PERMISSION_DEFINITIONS: PermissionMeta[] = [
  {
    key: "canAccessStockReports",
    label: "الوصول لتقارير الجرد",
    shortLabel: "تقارير الجرد",
    description: "إدخال الأرصدة المتبقية واستعراض كشوفات الجرد الفردية",
    icon: <ClipboardList className="h-4 w-4 text-cyan-700" />,
  },
  {
    key: "canViewVisits",
    label: "الوصول للزيارات",
    shortLabel: "الزيارات",
    description: "استعراض سجل الزيارات الميدانية ومهام المتابعة",
    icon: <Users className="h-4 w-4 text-teal-700" />,
  },
  {
    key: "canReceiveTargetedNotifications",
    label: "استلام التنبيهات الموجهة",
    shortLabel: "التنبيهات الموجهة",
    description: "استقبال الرسائل والإشعارات الموجهة خصيصاً للمنشأة",
    icon: <Bell className="h-4 w-4 text-amber-600" />,
  },
  {
    key: "canExportReports",
    label: "تصدير البيانات",
    shortLabel: "تصدير البيانات",
    description: "تنزيل وتصدير تقارير الطلبيات والجرد بصيغة CSV / Excel",
    icon: <FileSpreadsheet className="h-4 w-4 text-emerald-700" />,
  },
  {
    key: "canViewAgreements",
    label: "عرض الاتفاقيات والبونص",
    shortLabel: "الاتفاقيات",
    description: "الاطلاع على الاتفاقيات التجارية وتوثيق تسليم البونص",
    icon: <FileCheck2 className="h-4 w-4 text-indigo-700" />,
  },
];

type FilterMode = "all" | "pharmacy" | "doctor" | "restricted" | "pending";

interface PermissionsManagerProps {
  users: User[];
  onUpdateUserPermissions: (userId: string, permissions: UserPermissions) => Promise<boolean>;
  onRefreshUsers?: () => Promise<void> | void;
  focusedUserId?: string | null;
  onClearFocusedUser?: () => void;
}

export const PermissionsManager: React.FC<PermissionsManagerProps> = ({
  users,
  onUpdateUserPermissions,
  onRefreshUsers,
  focusedUserId = null,
  onClearFocusedUser,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [localPermsMap, setLocalPermsMap] = useState<Record<string, UserPermissions>>({});
  const [savingUserIds, setSavingUserIds] = useState<Record<string, boolean>>({});
  const [savedUserIds, setSavedUserIds] = useState<Record<string, boolean>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [bulkActionPending, setBulkActionPending] = useState<"enable_all" | "restrict_all" | null>(null);
  const [isApplyingBulk, setIsApplyingBulk] = useState(false);

  const clientUsers = useMemo(() => {
    const byId = new Map<string, User>();
    users.forEach((u) => {
      if (!u || !u.id) return;
      if (u.role === "rep" || u.role === "admin" || u.id === "u_rep") return;
      if (!byId.has(u.id)) {
        byId.set(u.id, u);
      }
    });
    return Array.from(byId.values());
  }, [users]);

  useEffect(() => {
    const nextMap: Record<string, UserPermissions> = {};
    clientUsers.forEach((u) => {
      nextMap[u.id] = {
        ...DEFAULT_USER_PERMISSIONS,
        ...(u.permissions || {}),
      };
    });
    setLocalPermsMap(nextMap);
  }, [clientUsers]);

  const getUserPerms = (u: User): UserPermissions => {
    return localPermsMap[u.id] || { ...DEFAULT_USER_PERMISSIONS, ...(u.permissions || {}) };
  };

  const getAccountStatusLabel = (u: User): { text: string; tone: string } => {
    if (u.status === "suspended") {
      return { text: "حساب معلّق", tone: "text-rose-700" };
    }
    if (u.status === "rejected") {
      return { text: "حساب مرفوض", tone: "text-rose-700" };
    }
    if (u.isApproved === false || u.status === "pending_approval") {
      return { text: "بانتظار الاعتماد", tone: "text-amber-700" };
    }
    return { text: "معتمد", tone: "text-emerald-700" };
  };

  const countEnabled = (perms: UserPermissions): number => {
    return PERMISSION_DEFINITIONS.reduce((acc, def) => (perms[def.key] ? acc + 1 : acc), 0);
  };

  const stats = useMemo(() => {
    let fullAccess = 0;
    let restricted = 0;
    let pending = 0;
    clientUsers.forEach((u) => {
      const perms = getUserPerms(u);
      const enabled = countEnabled(perms);
      if (enabled === PERMISSION_DEFINITIONS.length) fullAccess += 1;
      else restricted += 1;
      if (u.isApproved === false || u.status === "pending_approval") pending += 1;
    });
    return {
      total: clientUsers.length,
      fullAccess,
      restricted,
      pending,
    };
  }, [clientUsers, localPermsMap]);

  const focusedUser = useMemo(() => {
    if (!focusedUserId) return null;
    return clientUsers.find((u) => u.id === focusedUserId) || null;
  }, [clientUsers, focusedUserId]);

  const filteredUsers = useMemo(() => {
    if (focusedUser) {
      return [focusedUser];
    }
    const q = searchQuery.trim().toLowerCase();
    return clientUsers.filter((u) => {
      if (filterMode === "pharmacy" && u.role !== "pharmacy") return false;
      if (filterMode === "doctor" && u.role !== "doctor") return false;
      if (filterMode === "restricted") {
        const perms = getUserPerms(u);
        if (countEnabled(perms) === PERMISSION_DEFINITIONS.length) return false;
      }
      if (filterMode === "pending") {
        if (u.isApproved !== false && u.status !== "pending_approval") return false;
      }
      if (q) {
        const haystack = `${u.entityName || ""} ${u.name || ""} ${u.phone || ""} ${u.email || ""} ${u.location || ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [clientUsers, focusedUser, filterMode, searchQuery, localPermsMap]);

  const markSaved = (userId: string) => {
    setSavedUserIds((prev) => ({ ...prev, [userId]: true }));
    setTimeout(() => {
      setSavedUserIds((prev) => {
        if (!prev[userId]) return prev;
        const copy = { ...prev };
        delete copy[userId];
        return copy;
      });
    }, 1800);
  };

  const applyPermissionsForUser = async (targetUser: User, nextPerms: UserPermissions) => {
    nativePlayClick();
    nativeVibrate(15);
    setErrorMessage(null);

    const prevPerms = getUserPerms(targetUser);
    setLocalPermsMap((prev) => ({ ...prev, [targetUser.id]: nextPerms }));
    setSavingUserIds((prev) => ({ ...prev, [targetUser.id]: true }));

    try {
      const ok = await onUpdateUserPermissions(targetUser.id, nextPerms);
      if (ok) {
        markSaved(targetUser.id);
      } else {
        setLocalPermsMap((prev) => ({ ...prev, [targetUser.id]: prevPerms }));
        setErrorMessage(`تعذر حفظ أذونات "${targetUser.entityName || targetUser.name}".`);
      }
    } catch {
      setLocalPermsMap((prev) => ({ ...prev, [targetUser.id]: prevPerms }));
      setErrorMessage(`حدث خطأ أثناء تحديث أذونات "${targetUser.entityName || targetUser.name}".`);
    } finally {
      setSavingUserIds((prev) => {
        const copy = { ...prev };
        delete copy[targetUser.id];
        return copy;
      });
    }
  };

  const handleTogglePermission = (targetUser: User, key: keyof UserPermissions) => {
    const current = getUserPerms(targetUser);
    const nextPerms: UserPermissions = {
      ...current,
      [key]: !current[key],
    };
    void applyPermissionsForUser(targetUser, nextPerms);
  };

  const handleBulkApply = async (mode: "enable_all" | "restrict_all") => {
    if (filteredUsers.length === 0) return;
    nativePlayClick();
    setBulkActionPending(null);
    setErrorMessage(null);
    setIsApplyingBulk(true);

    const template = mode === "enable_all" ? DEFAULT_USER_PERMISSIONS : RESTRICTED_USER_PERMISSIONS;
    let failedCount = 0;

    for (const client of filteredUsers) {
      const prevPerms = getUserPerms(client);
      setLocalPermsMap((prev) => ({ ...prev, [client.id]: { ...template } }));
      setSavingUserIds((prev) => ({ ...prev, [client.id]: true }));
      try {
        const ok = await onUpdateUserPermissions(client.id, { ...template });
        if (ok) {
          markSaved(client.id);
        } else {
          failedCount += 1;
          setLocalPermsMap((prev) => ({ ...prev, [client.id]: prevPerms }));
        }
      } catch {
        failedCount += 1;
        setLocalPermsMap((prev) => ({ ...prev, [client.id]: prevPerms }));
      } finally {
        setSavingUserIds((prev) => {
          const copy = { ...prev };
          delete copy[client.id];
          return copy;
        });
      }
    }

    if (failedCount > 0) {
      setErrorMessage(`تعذر تحديث أذونات ${failedCount} مستخدم(ين). يرجى المحاولة مجدداً.`);
    }
    setIsApplyingBulk(false);
  };

  const handleRefresh = async () => {
    if (!onRefreshUsers) return;
    nativePlayClick();
    setIsRefreshing(true);
    try {
      await onRefreshUsers();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 bg-white" dir="rtl">
      {/* Header & Primary Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0">
            <SlidersHorizontal className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900">
              إدارة أذونات المستخدمين
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              تفعيل أو تعطيل صلاحيات تقارير الجرد، الزيارات، التنبيهات الموجهة، وتصدير البيانات لكل صيدلية أو طبيب على حدة
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onRefreshUsers && (
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0 min-h-10"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>تحديث القائمة</span>
            </button>
          )}
        </div>
      </div>

      {/* Numeric Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5">
          <div className="text-3xs font-medium text-slate-500">إجمالي المستخدمين</div>
          <div className="text-lg font-black text-slate-900 tabular-nums mt-0.5">{stats.total}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5">
          <div className="text-3xs font-medium text-slate-500">وصول كامل (5/5)</div>
          <div className="text-lg font-black text-emerald-700 tabular-nums mt-0.5">{stats.fullAccess}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5">
          <div className="text-3xs font-medium text-slate-500">صلاحيات مقيّدة</div>
          <div className="text-lg font-black text-amber-700 tabular-nums mt-0.5">{stats.restricted}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5">
          <div className="text-3xs font-medium text-slate-500">بانتظار الاعتماد</div>
          <div className="text-lg font-black text-slate-700 tabular-nums mt-0.5">{stats.pending}</div>
        </div>
      </div>

      {/* Focused Single-User Banner */}
      {focusedUser && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-teal-200 bg-teal-50/60 px-4 py-3">
          <div className="text-xs text-slate-800">
            <span className="font-bold text-teal-900">عرض أذونات مستخدم محدد: </span>
            <span className="font-black text-slate-900">{focusedUser.entityName || focusedUser.name}</span>
            <span className="text-slate-500"> · {focusedUser.name}</span>
          </div>
          {onClearFocusedUser && (
            <button
              type="button"
              onClick={onClearFocusedUser}
              className="inline-flex items-center gap-1.5 rounded-lg border border-teal-300 bg-white px-3 py-1.5 text-2xs font-bold text-teal-800 hover:bg-teal-50 transition-colors cursor-pointer self-start sm:self-auto whitespace-nowrap shrink-0"
            >
              <X className="h-3.5 w-3.5" />
              <span>عرض جميع المستخدمين</span>
            </button>
          )}
        </div>
      )}

      {/* Search, Segmented Role Filter & Bulk Actions Bar */}
      {!focusedUser && (
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row gap-2.5 flex-1">
            <div className="relative flex-1 min-w-0">
              <Search className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث باسم المنشأة، المسؤول، رقم الهاتف، أو المنطقة..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pr-9 pl-8 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:outline-none min-h-10"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="مسح البحث"
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl shrink-0 overflow-x-auto">
              {(
                [
                  { id: "all", label: "الكل" },
                  { id: "pharmacy", label: "الصيدليات" },
                  { id: "doctor", label: "الأطباء" },
                  { id: "restricted", label: "المقيّدون فقط" },
                  { id: "pending", label: "قيد الاعتماد" },
                ] as Array<{ id: FilterMode; label: string }>
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterMode(tab.id)}
                  className={`px-3 py-1.5 text-2xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    filterMode === tab.id
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bulk Quick Actions */}
          {filteredUsers.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              {bulkActionPending ? (
                <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-2xs">
                  <span className="font-bold text-amber-900">
                    {bulkActionPending === "enable_all"
                      ? `تفعيل كل الصلاحيات لـ ${filteredUsers.length} مستخدم؟`
                      : `تعطيل كل الصلاحيات لـ ${filteredUsers.length} مستخدم؟`}
                  </span>
                  <button
                    type="button"
                    disabled={isApplyingBulk}
                    onClick={() => void handleBulkApply(bulkActionPending)}
                    className="rounded-lg bg-teal-600 hover:bg-teal-700 text-white px-2.5 py-1 font-bold cursor-pointer disabled:opacity-50"
                  >
                    تأكيد
                  </button>
                  <button
                    type="button"
                    disabled={isApplyingBulk}
                    onClick={() => setBulkActionPending(null)}
                    className="rounded-lg border border-slate-300 bg-white text-slate-700 px-2.5 py-1 font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={isApplyingBulk}
                    onClick={() => setBulkActionPending("enable_all")}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50/70 px-3 py-2 text-2xs font-bold text-teal-800 hover:bg-teal-100/70 transition-colors cursor-pointer whitespace-nowrap shrink-0 min-h-10"
                  >
                    <Unlock className="h-3.5 w-3.5" />
                    <span>تفعيل الكل للمعروضين</span>
                  </button>
                  <button
                    type="button"
                    disabled={isApplyingBulk}
                    onClick={() => setBulkActionPending("restrict_all")}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-2xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap shrink-0 min-h-10"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    <span>تقييد المعروضين</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Error State Banner */}
      {errorMessage && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-800"
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
            aria-label="إغلاق التنبيه"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Empty / Filtered Empty States */}
      {clientUsers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center space-y-2">
          <Users className="h-9 w-9 text-slate-300 mx-auto" />
          <div className="text-sm font-bold text-slate-800">لا يوجد مستخدمون مسجلون حالياً</div>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            عند تسجيل الصيدليات والأطباء أو إضافتهم من قائمة العملاء، ستظهر هنا مصفوفة الأذونات لإدارة صلاحيات كل مستخدم على حدة.
          </p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center space-y-3">
          <Search className="h-8 w-8 text-slate-300 mx-auto" />
          <div className="text-sm font-bold text-slate-800">لا توجد نتائج مطابقة للبحث أو التصفية</div>
          <p className="text-xs text-slate-500">جرّب تعديل كلمات البحث أو إزالة الفلتر المحدد.</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setFilterMode("all");
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>إعادة ضبط التصفية</span>
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Matrix Table View */}
          <div className="hidden xl:block rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-2xs font-bold text-slate-600">
                  <th className="py-3 px-4 min-w-[240px]">المستخدم / المنشأة</th>
                  {PERMISSION_DEFINITIONS.map((def) => (
                    <th key={def.key} className="py-3 px-3 text-center whitespace-nowrap">
                      <div className="inline-flex flex-col items-center gap-1">
                        <span className="inline-flex items-center gap-1.5 text-slate-800">
                          {def.icon}
                          <span>{def.shortLabel}</span>
                        </span>
                      </div>
                    </th>
                  ))}
                  <th className="py-3 px-4 text-left whitespace-nowrap">الحالة والإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {filteredUsers.map((client) => {
                  const perms = getUserPerms(client);
                  const enabledCount = countEnabled(perms);
                  const isRowSaving = Boolean(savingUserIds[client.id]);
                  const isRowSaved = Boolean(savedUserIds[client.id]);
                  const statusMeta = getAccountStatusLabel(client);

                  return (
                    <tr
                      key={client.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-3 px-4 align-middle">
                        <div className="font-bold text-slate-900 truncate max-w-[260px]">
                          {client.entityName || client.name}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-3xs text-slate-500 mt-0.5">
                          <span>{client.role === "doctor" ? "طبيب" : "صيدلية"}</span>
                          <span aria-hidden="true">·</span>
                          <span className="truncate max-w-[140px]">{client.name}</span>
                          {client.phone && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono tabular-nums dir-ltr">{client.phone}</span>
                            </>
                          )}
                          <span aria-hidden="true">·</span>
                          <span className={`font-semibold ${statusMeta.tone}`}>{statusMeta.text}</span>
                        </div>
                      </td>

                      {PERMISSION_DEFINITIONS.map((def) => {
                        const checked = perms[def.key];
                        return (
                          <td key={def.key} className="py-3 px-3 text-center align-middle">
                            <div className="inline-flex flex-col items-center gap-1">
                              <button
                                type="button"
                                role="switch"
                                aria-checked={checked}
                                aria-label={`${def.label} لـ ${client.entityName || client.name}`}
                                disabled={isRowSaving}
                                onClick={() => handleTogglePermission(client, def.key)}
                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-1 disabled:opacity-50 ${
                                  checked
                                    ? "bg-teal-600 border-teal-600"
                                    : "bg-slate-200 border-slate-300"
                                }`}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-4.5 w-4.5 rounded-full bg-white shadow-xs transition-transform ${
                                    checked ? "-translate-x-5.5" : "-translate-x-0.5"
                                  }`}
                                />
                              </button>
                              <span
                                className={`text-4xs font-bold ${
                                  checked ? "text-teal-700" : "text-slate-400"
                                }`}
                              >
                                {checked ? "مفعّل" : "معطّل"}
                              </span>
                            </div>
                          </td>
                        );
                      })}

                      <td className="py-3 px-4 align-middle text-left">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-3xs font-bold tabular-nums text-slate-600 min-w-[74px] text-left">
                            {isRowSaving ? (
                              <span className="text-teal-700">جاري الحفظ...</span>
                            ) : isRowSaved ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700">
                                <Check className="h-3 w-3" />
                                تم الحفظ
                              </span>
                            ) : (
                              `${enabledCount}/${PERMISSION_DEFINITIONS.length} مفعّلة`
                            )}
                          </span>

                          {enabledCount < PERMISSION_DEFINITIONS.length ? (
                            <button
                              type="button"
                              disabled={isRowSaving}
                              onClick={() => void applyPermissionsForUser(client, { ...DEFAULT_USER_PERMISSIONS })}
                              className="rounded-lg border border-teal-200 bg-white px-2.5 py-1.5 text-3xs font-bold text-teal-700 hover:bg-teal-50 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
                            >
                              تفعيل الكل
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isRowSaving}
                              onClick={() => void applyPermissionsForUser(client, { ...RESTRICTED_USER_PERMISSIONS })}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-3xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
                            >
                              تقييد الكل
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile & Tablet List View */}
          <div className="xl:hidden space-y-3">
            {filteredUsers.map((client) => {
              const perms = getUserPerms(client);
              const enabledCount = countEnabled(perms);
              const isRowSaving = Boolean(savingUserIds[client.id]);
              const isRowSaved = Boolean(savedUserIds[client.id]);
              const statusMeta = getAccountStatusLabel(client);

              return (
                <div
                  key={client.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="min-w-0">
                      <div className="text-sm font-black text-slate-900 truncate">
                        {client.entityName || client.name}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-3xs text-slate-500 mt-0.5">
                        <span>{client.role === "doctor" ? "طبيب / عيادة" : "صيدلية"}</span>
                        <span aria-hidden="true">·</span>
                        <span>{client.name}</span>
                        {client.phone && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums dir-ltr">{client.phone}</span>
                          </>
                        )}
                        <span aria-hidden="true">·</span>
                        <span className={`font-semibold ${statusMeta.tone}`}>{statusMeta.text}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-3xs font-bold tabular-nums text-slate-600">
                        {isRowSaving ? (
                          <span className="text-teal-700">جاري الحفظ...</span>
                        ) : isRowSaved ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            تم الحفظ
                          </span>
                        ) : (
                          `${enabledCount}/${PERMISSION_DEFINITIONS.length} مفعّلة`
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {PERMISSION_DEFINITIONS.map((def) => {
                      const checked = perms[def.key];
                      return (
                        <div
                          key={def.key}
                          className="flex items-center justify-between gap-3 py-2.5"
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div className="mt-0.5 shrink-0">{def.icon}</div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900">{def.label}</div>
                              <div className="text-3xs text-slate-500">{def.description}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`text-3xs font-bold ${
                                checked ? "text-teal-700" : "text-slate-400"
                              }`}
                            >
                              {checked ? "مفعّل" : "معطّل"}
                            </span>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={checked}
                              aria-label={`${def.label} لـ ${client.entityName || client.name}`}
                              disabled={isRowSaving}
                              onClick={() => handleTogglePermission(client, def.key)}
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-1 disabled:opacity-50 ${
                                checked
                                  ? "bg-teal-600 border-teal-600"
                                  : "bg-slate-200 border-slate-300"
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4.5 w-4.5 rounded-full bg-white shadow-xs transition-transform ${
                                  checked ? "-translate-x-5.5" : "-translate-x-0.5"
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={isRowSaving || enabledCount === PERMISSION_DEFINITIONS.length}
                      onClick={() => void applyPermissionsForUser(client, { ...DEFAULT_USER_PERMISSIONS })}
                      className="inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-white px-3 py-1.5 text-3xs font-bold text-teal-700 hover:bg-teal-50 transition-colors cursor-pointer disabled:opacity-40"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>تفعيل جميع الصلاحيات</span>
                    </button>
                    <button
                      type="button"
                      disabled={isRowSaving || enabledCount === 0}
                      onClick={() => void applyPermissionsForUser(client, { ...RESTRICTED_USER_PERMISSIONS })}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-3xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-40"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      <span>تقييد الكل</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default PermissionsManager;
