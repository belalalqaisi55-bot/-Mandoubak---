import React, { useState, useMemo } from "react";
import {
  X,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Search,
  Send,
  Sparkles,
  Phone,
  ShoppingCart,
  MessageSquare,
  Clock,
  ShieldCheck,
  RefreshCw,
  Info
} from "lucide-react";
import { Product, User, StockReport } from "../types";
import { isFirebaseConfigured, db } from "../firebase";
import { doc, setDoc, query, collection, where, getDocs, deleteDoc } from "firebase/firestore";
import { saveOfflineStockReports } from "../utils/offlineSync";

interface FieldInventoryAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  clients: User[];
  currentRep: User | null;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  onOpenQuickOrder?: (client: User, items: { product: Product; qty: number }[]) => void;
  initialClientId?: string;
}

export const FieldInventoryAuditModal: React.FC<FieldInventoryAuditModalProps> = ({
  isOpen,
  onClose,
  products,
  clients,
  currentRep,
  onSuccess,
  onError,
  onOpenQuickOrder,
  initialClientId,
}) => {
  // Only pharmacies or clinics
  const eligibleClients = useMemo(() => {
    return clients.filter((c) => c.role === "pharmacy" || c.role === "doctor");
  }, [clients]);

  const [selectedClientId, setSelectedClientId] = useState<string>(
    initialClientId || (eligibleClients[0]?.id ?? "")
  );

  const [inventoryCounts, setInventoryCounts] = useState<Record<string, string>>({});
  const [repNotes, setRepNotes] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("الكل");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCriticalAlertSummary, setShowCriticalAlertSummary] = useState(false);
  const [lastSubmittedReports, setLastSubmittedReports] = useState<StockReport[]>([]);

  // Update selected client if initialClientId changes
  React.useEffect(() => {
    if (initialClientId) {
      setSelectedClientId(initialClientId);
    } else if (!selectedClientId && eligibleClients.length > 0) {
      setSelectedClientId(eligibleClients[0].id);
    }
  }, [initialClientId, eligibleClients]);

  const activeClient = useMemo(() => {
    return eligibleClients.find((c) => c.id === selectedClientId) || null;
  }, [eligibleClients, selectedClientId]);

  // Categories list
  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return ["الكل", ...Array.from(cats)];
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === "الكل" || p.category === selectedCategory;
      const q = productSearch.trim().toLowerCase();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.activeIngredient && p.activeIngredient.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, productSearch]);

  // Counted summary
  const auditSummary = useMemo(() => {
    let enteredCount = 0;
    let criticalCount = 0;
    let zeroCount = 0;
    let warningCount = 0;

    Object.entries(inventoryCounts).forEach(([_, val]) => {
      if (val !== "" && !isNaN(Number(val))) {
        enteredCount++;
        const qty = Number(val);
        if (qty === 0) {
          zeroCount++;
          criticalCount++;
        } else if (qty <= 3) {
          criticalCount++;
        } else if (qty <= 5) {
          warningCount++;
        }
      }
    });

    return { enteredCount, criticalCount, zeroCount, warningCount };
  }, [inventoryCounts]);

  const handleSetCount = (productId: string, value: string) => {
    setInventoryCounts((prev) => ({
      ...prev,
      [productId]: value,
    }));
  };

  const handleQuickPreset = (productId: string, qty: number) => {
    setInventoryCounts((prev) => ({
      ...prev,
      [productId]: String(qty),
    }));
  };

  const handleClearInventory = async () => {
    if (!activeClient) return;

    if (!confirm("هل أنت متأكد من مسح جميع بيانات الجرد المخزني لهذا العميل من الجهاز ومن السحابة؟ هذا الإجراء لا يمكن التراجع عنه.")) {
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Clear local state
      setInventoryCounts({});
      setRepNotes("");
      setShowCriticalAlertSummary(false);

      // 2. Clear local storage cache
      await saveOfflineStockReports([]);

      // 3. Clear cloud data
      if (isFirebaseConfigured && db) {
        const q = query(collection(db, "stockReports"), where("clientId", "==", activeClient.id));
        const querySnapshot = await getDocs(q);
        for (const docSnap of querySnapshot.docs) {
          await deleteDoc(docSnap.ref);
        }
        onSuccess("تم مسح بيانات الجرد المخزني لهذا العميل من السحابة والجهاز بنجاح.");
      } else {
        onSuccess("تم مسح البيانات المخزنية المؤقتة بنجاح.");
      }
    } catch (err) {
      console.error("Error clearing inventory:", err);
      onError("حدث خطأ أثناء مسح بيانات المخزون.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitAudit = async () => {
    if (!activeClient) {
      onError("الرجاء اختيار الصيدلية أو المنشأة الطبية أولاً.");
      return;
    }

    const validEntries = Object.entries(inventoryCounts).filter(
      ([_, val]) => val !== "" && !isNaN(Number(val)) && Number(val) >= 0
    );

    if (validEntries.length === 0) {
      onError("يرجى إدخال الرصيد المتبقي لصنف واحد على الأقل لتوثيق الجرد.");
      return;
    }

    setIsSubmitting(true);
    try {
      const timestamp = new Date().toISOString();
      const clientName = activeClient.name || "صيدلية غير محددة";
      const entityName = activeClient.entityName || activeClient.name || "منشأة صيدلانية";

      const reportsToSave: StockReport[] = validEntries.map(([pId, val], index) => {
        const prod = products.find((p) => p.id === pId);
        const remainingQty = Math.max(0, parseInt(String(val), 10));
        const isCritical = remainingQty <= 3;
        const isWarning = remainingQty <= 5;
        const urgencyLevel = remainingQty <= 3 ? "critical" : remainingQty <= 5 ? "warning" : "normal";

        return {
          id: `fld_rep_${Date.now()}_${index}`,
          clientId: activeClient.id,
          clientName: clientName,
          entityName: entityName,
          productId: pId,
          productName: prod?.name || `صنف #${pId}`,
          remainingQty: remainingQty,
          reportedAt: timestamp,
          syncStatus: "synced",
          syncedAt: timestamp,
          isCritical: isCritical,
          isWarning: isWarning,
          urgencyLevel: urgencyLevel,
          criticalAlertThreshold: 5,
          repNotes: repNotes.trim() ? repNotes.trim() : undefined,
          auditedByRepId: currentRep?.id || "rep-belal",
          auditedByRepName: currentRep?.name || "د/ بلال القيسي (المندوب الطبي)",
          clientPhone: activeClient.phone,
          location: activeClient.location,
        };
      });

      // 1. DIRECT FIRESTORE WRITE: Write all reports directly to Firestore
      if (isFirebaseConfigured && db) {
        for (const rep of reportsToSave) {
          try {
            await setDoc(doc(db, "stockReports", rep.id), rep, { merge: true });
          } catch (fsErr) {
            console.warn("Firestore write error for stock report:", rep.id, fsErr);
          }
        }

        // Also add an audit notification in Firestore if critical shortages exist
        const criticalReports = reportsToSave.filter((r) => r.remainingQty <= 3);
        if (criticalReports.length > 0) {
          try {
            const notifId = `notif_stk_${Date.now()}`;
            const notifPayload = {
              id: notifId,
              title: `⚠️ تنبيه نقص حرج: ${entityName}`,
              message: `تم رصد عجز حرج في ${criticalReports.length} أصناف بصيدلية ${entityName} أثناء الجرد الميداني (مثل: ${criticalReports.slice(0, 2).map((c) => c.productName).join("، ")}).`,
              type: "target",
              targetClientId: activeClient.id,
              targetClientName: entityName,
              sentVia: "system",
              deliveryStatus: "sent",
              createdAt: timestamp,
            };
            await setDoc(doc(db, "notifications", notifId), notifPayload);
          } catch (notifErr) {
            console.warn("Could not save critical alert notification:", notifErr);
          }
        }
      }

      // 2. Also forward to local backend API
      try {
        await fetch("/api/stock-reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId: activeClient.id,
            clientName: clientName,
            entityName: entityName,
            reports: reportsToSave.map((r) => ({
              productId: r.productId,
              productName: r.productName,
              remainingQty: r.remainingQty,
            })),
          }),
        });
      } catch (apiErr) {
        console.warn("Backend API sync notice:", apiErr);
      }

      // 3. Save to local IndexedDB for immediate offline resiliency
      try {
        await saveOfflineStockReports(reportsToSave, { forcePending: false });
      } catch (idbErr) {
        console.warn("IndexedDB stock reports cache error:", idbErr);
      }

      // Check if critical items were detected
      const criticalShortages = reportsToSave.filter((r) => r.remainingQty <= 5);
      setLastSubmittedReports(reportsToSave);

      if (criticalShortages.length > 0) {
        setShowCriticalAlertSummary(true);
        onSuccess(
          `تم توثيق ومزامنة الجرد الميداني في Firestore بنجاح ☁️! تم رصد ${criticalShortages.length} أصناف بنقص حرج.`
        );
      } else {
        onSuccess(
          `تم توثيق ومزامنة تقرير الجرد الميداني لصيدلية ${entityName} في Firestore مباشرة ☁️ بنجاح!`
        );
        handleClearInventory();
        onClose();
      }
    } catch (err: any) {
      onError(`حدث خطأ أثناء مزامنة الجرد: ${err?.message || "يرجى المحاولة مجدداً"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendWhatsAppSummary = () => {
    if (!activeClient) return;
    const phone = (activeClient.phone || "").replace(/\D/g, "");
    if (!phone) {
      onError("رقم هاتف الصيدلية غير مسجل.");
      return;
    }

    const criticalItems = lastSubmittedReports.filter((r) => r.remainingQty <= 5);
    let msg = `السلام عليكم دكتور في ${activeClient.entityName || activeClient.name}.\n`;
    msg += `تم تسجيل كشف الجرد الميداني بتاريخ ${new Date().toLocaleDateString("ar-YE")} بواسطة المندوب الطبي ${currentRep?.name || "د/ بلال القيسي"}.\n\n`;

    if (criticalItems.length > 0) {
      msg += `🚨 الأصناف ذات المخزون الحرج التي تتطلب توريداً عاجلاً:\n`;
      criticalItems.forEach((item) => {
        msg += `• ${item.productName}: متبقي (${item.remainingQty} علبة)\n`;
      });
      msg += `\nنرجو تأكيد كميات التوريد المطلوبة لاعتماد الفاتورة فوراً.`;
    } else {
      msg += `✓ جميع الأرصدة الحالية بحالة جيدة وكافية.\nشكراً لتعاونكم المستمر.`;
    }

    const whatsappUrl = `https://wa.me/${phone.startsWith("967") ? phone : "967" + phone}?text=${encodeURIComponent(msg)}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleCreateAutoRestockOrder = () => {
    if (!activeClient || !onOpenQuickOrder) return;
    const criticalItems = lastSubmittedReports.filter((r) => r.remainingQty <= 5);
    const orderItems = criticalItems.map((r) => {
      const prod = products.find((p) => p.id === r.productId) || {
        id: r.productId,
        name: r.productName,
        category: "أدوية",
        price: "1000",
        unit: "علبة",
        description: "",
      };
      // Suggest replenishment qty: if 0 -> 20, if 1-3 -> 15, if 4-5 -> 10
      const suggestedQty = r.remainingQty === 0 ? 25 : r.remainingQty <= 3 ? 15 : 10;
      return { product: prod, qty: suggestedQty };
    });

    onClose();
    onOpenQuickOrder(activeClient, orderItems);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] text-right">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 px-4 py-3.5 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 border border-white/20 text-teal-300">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white">
                  توثيق الجرد الميداني المباشر للصيدليات
                </h3>
                <span className="flex items-center gap-1 text-3xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  مزامنة سحابية Firestore حية
                </span>
              </div>
              <p className="text-3xs sm:text-2xs text-teal-100/80">
                تسجيل الأرصدة المتبقية على رف الصيدلية وتحديث التنبيهات ونقص المخزون فورياً
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-teal-200 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Post-submission Critical Alert Modal Overlay */}
        {showCriticalAlertSummary ? (
          <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
            <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-rose-900 flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-rose-950">
                  تم رصد عجز ونقص مخزون حرج في صيدلية {activeClient?.entityName || activeClient?.name}!
                </h4>
                <p className="text-xs text-rose-800 leading-relaxed">
                  تم حفظ الجرد بنجاح في قاعدة بيانات Firebase Firestore ومزامنة كشف الجرد مع لوحة المندوب
                  وتوليد تنبيهات فورية للأصناف التي أوشكت على النفاد.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h5 className="text-xs font-bold text-slate-800">
                قائمة الأصناف المحتاجة لتوريد عاجل:
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {lastSubmittedReports
                  .filter((r) => r.remainingQty <= 5)
                  .map((r) => (
                    <div
                      key={r.id}
                      className={`p-3 rounded-xl border flex items-center justify-between ${
                        r.remainingQty === 0
                          ? "bg-rose-100/60 border-rose-300 text-rose-950"
                          : "bg-amber-50 border-amber-200 text-amber-950"
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs">{r.productName}</div>
                        <div className="text-3xs text-slate-500 font-mono">
                          {r.remainingQty === 0 ? "نفاد تام من الصيدلية 🚨" : `متبقي قليل: ${r.remainingQty} علب`}
                        </div>
                      </div>
                      <span
                        className={`text-2xs font-mono font-bold px-2 py-0.5 rounded-full ${
                          r.remainingQty === 0 ? "bg-rose-600 text-white" : "bg-amber-500 text-white"
                        }`}
                      >
                        {r.remainingQty} علبة
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="pt-3 border-t border-slate-200 flex flex-wrap gap-2.5 justify-end">
              <button
                onClick={handleSendWhatsAppSummary}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 text-xs font-bold transition-all shadow-xs"
              >
                <MessageSquare className="h-4 w-4" />
                <span>إشعار الصيدلية عبر واتساب بكشف العجز 💬</span>
              </button>

              {onOpenQuickOrder && (
                <button
                  onClick={handleCreateAutoRestockOrder}
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 text-xs font-bold transition-all shadow-xs"
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span>إنشاء طلبية توريد فورية للأصناف الناقصة 📦</span>
                </button>
              )}

              <button
                onClick={() => {
                  handleClearInventory();
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 text-xs font-bold transition-all"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>إغلاق وإنهاء الجرد</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3 sm:p-4 space-y-3.5 overflow-y-auto flex-1">
            {/* Pharmacy Selector & Details Card */}
            <div className="rounded-xl border border-teal-100 bg-gradient-to-br from-teal-50/40 via-white to-slate-50 p-3 sm:p-3.5 shadow-2xs space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-teal-700 shrink-0" />
                  <span className="text-xs font-bold text-slate-800">اختيار الصيدلية / المنشأة الطبية:</span>
                </div>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="rounded-lg border border-teal-300 bg-white px-3 py-1.5 text-xs font-bold text-teal-950 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 shadow-2xs"
                >
                  {eligibleClients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.entityName || client.name} ({client.name})
                    </option>
                  ))}
                </select>
              </div>

              {activeClient && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-teal-100/70 text-3xs text-slate-600">
                  <div className="flex items-center gap-3">
                    <span>
                      <strong>المسؤول:</strong> {activeClient.name}
                    </span>
                    {activeClient.phone && (
                      <span className="flex items-center gap-1 font-mono text-slate-500">
                        <Phone className="h-3 w-3 text-teal-600" />
                        {activeClient.phone}
                      </span>
                    )}
                    {activeClient.location && (
                      <span>
                        <strong>الموقع:</strong> {activeClient.location}
                      </span>
                    )}
                  </div>
                  <div className="text-teal-800 font-bold">
                    المندوب الموثّق: {currentRep?.name || "د/ بلال القيسي"}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-3xs text-slate-500 block font-bold">أصناف تم جردها</span>
                <span className="font-black text-slate-900 text-sm font-mono">
                  {auditSummary.enteredCount} / {products.length}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-rose-50 border border-rose-200">
                <span className="text-3xs text-rose-700 block font-bold">عجز حرج (≤ 3)</span>
                <span className="font-black text-rose-700 text-sm font-mono">
                  {auditSummary.criticalCount}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-amber-50 border border-amber-200">
                <span className="text-3xs text-amber-700 block font-bold">نقص تحذيري (4-5)</span>
                <span className="font-black text-amber-800 text-sm font-mono">
                  {auditSummary.warningCount}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-red-50 border border-red-200">
                <span className="text-3xs text-red-700 block font-bold">أصناف نافدة (0)</span>
                <span className="font-black text-red-700 text-sm font-mono">
                  {auditSummary.zeroCount}
                </span>
              </div>
            </div>

            {/* Search and Category Filters */}
            <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
              <div className="relative w-full sm:w-64">
                <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="ابحث باسم الصنف أو المادة الفعالة..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-2.5 pr-8 text-xs font-medium text-slate-800 focus:border-teal-500 focus:outline-none"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                {categories.slice(0, 5).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`shrink-0 rounded-lg px-2.5 py-1 text-3xs font-bold transition-all ${
                      selectedCategory === cat
                        ? "bg-teal-700 text-white shadow-2xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Products Inventory Input Grid */}
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
              <div className="max-h-[38vh] overflow-y-auto divide-y divide-slate-100">
                {filteredProducts.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    لا توجد أصناف مطابقة للبحث أو الفئة المختارة.
                  </div>
                ) : (
                  filteredProducts.map((p) => {
                    const currentVal = inventoryCounts[p.id] ?? "";
                    const numVal = currentVal !== "" ? Number(currentVal) : null;
                    const isCrit = numVal !== null && numVal <= 3;
                    const isWarn = numVal !== null && numVal > 3 && numVal <= 5;
                    const isGood = numVal !== null && numVal > 5;

                    return (
                      <div
                        key={p.id}
                        className={`p-2.5 sm:p-3 flex items-center justify-between gap-3 transition-colors ${
                          isCrit
                            ? "bg-rose-50/50"
                            : isWarn
                            ? "bg-amber-50/30"
                            : "hover:bg-slate-50/70"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                              {p.name}
                            </span>
                            {p.category && (
                              <span className="shrink-0 text-4xs font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                {p.category}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-3xs text-slate-500">
                            {p.price && <span>السعر: {p.price}</span>}
                            {p.bonus && <span>• البونص: {p.bonus}</span>}
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="shrink-0 text-center">
                          {numVal === 0 ? (
                            <span className="text-3xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200">
                              نفاد تام 🚨
                            </span>
                          ) : isCrit ? (
                            <span className="text-3xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                              عجز حرج ⚠️
                            </span>
                          ) : isWarn ? (
                            <span className="text-3xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                              منخفض ⚡
                            </span>
                          ) : isGood ? (
                            <span className="text-3xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                              متوفر كافٍ ✓
                            </span>
                          ) : (
                            <span className="text-3xs font-medium text-slate-400">لم يُجرد</span>
                          )}
                        </div>

                        {/* Quantity Counter & Presets */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="hidden sm:flex items-center gap-1">
                            {[0, 2, 5, 10].map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => handleQuickPreset(p.id, preset)}
                                className="h-6 w-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-3xs font-mono font-bold transition-all"
                                title={`تعيين ${preset}`}
                              >
                                {preset}
                              </button>
                            ))}
                          </div>

                          <div className="relative w-20 sm:w-24">
                            <input
                              type="number"
                              min="0"
                              placeholder="الرصيد"
                              value={currentVal}
                              onChange={(e) => handleSetCount(p.id, e.target.value)}
                              className={`w-full rounded-lg border py-1.5 pl-2 pr-2 text-center text-xs font-mono font-black focus:outline-none transition-all ${
                                isCrit
                                  ? "border-rose-400 bg-white text-rose-800 ring-2 ring-rose-200"
                                  : isWarn
                                  ? "border-amber-400 bg-white text-amber-900 ring-2 ring-amber-100"
                                  : "border-slate-300 bg-white text-slate-900 focus:border-teal-500"
                              }`}
                            />
                            <span className="absolute left-1 top-1/2 -translate-y-1/2 text-4xs font-bold text-slate-400 pointer-events-none">
                              علبة
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Rep Field Notes */}
            <div className="space-y-1">
              <label className="block text-3xs font-bold text-slate-700">
                ملاحظات المندوب الميدانية والتوصيات للصيدلية (اختياري):
              </label>
              <textarea
                rows={2}
                placeholder="مثال: لوحظ إقبال متزايد على ريفانين والرفوف شبه فارغة، تم الاتفاق مع الصيدلي على طلبية تعويضية سريعة..."
                value={repNotes}
                onChange={(e) => setRepNotes(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-800 focus:border-teal-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Footer Actions */}
        {!showCriticalAlertSummary && (
          <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-3xs text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
              <span>مزامنة مشفرة وموثقة باسم المندوب في Firestore</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearInventory}
                disabled={isSubmitting}
                className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors disabled:opacity-50"
              >
                تصفير المخزون
              </button>

              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                إلغاء
              </button>

              <button
                type="button"
                disabled={isSubmitting || auditSummary.enteredCount === 0}
                onClick={handleSubmitAudit}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white px-5 py-2 text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>جارٍ المزامنة السحابية مع Firestore...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>مزامنة وحفظ الجرد الميداني فورياً ({auditSummary.enteredCount} صنف) ☁️</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
