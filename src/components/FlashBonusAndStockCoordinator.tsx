import React, { useState } from "react";
import {
  Flame,
  Clock,
  Sparkles,
  Calendar,
  AlertCircle,
  Plus,
  Trash2,
  CheckCircle2,
  Share2,
  Send,
  PackageCheck,
  Bell,
  FileSpreadsheet,
  Printer
} from "lucide-react";
import { FlashBonusOffer, ExpiryStockItem } from "../types";
import { showLocalNotification, requestNotificationPermission } from "../services/pushNotificationService";

export const DEFAULT_FLASH_BONUSES: FlashBonusOffer[] = [];

interface Props {
  clientName: string;
  entityName: string;
  onApplyFlashOffer?: (offer: FlashBonusOffer) => void;
}

export const FlashBonusAndStockCoordinator: React.FC<Props> = ({
  clientName,
  entityName,
  onApplyFlashOffer
}) => {
  const [activeTab, setActiveTab] = useState<"flash_offers" | "expiry_coordinator" | "scheduled_notifications">("flash_offers");

  // Flash Offers state
  const [flashOffers, setFlashOffers] = useState<FlashBonusOffer[]>(() => {
    try {
      const stored = localStorage.getItem('mandoubak_flash_offers');
      if (stored !== null) {
        return JSON.parse(stored);
      }
      return DEFAULT_FLASH_BONUSES;
    } catch {
      return DEFAULT_FLASH_BONUSES;
    }
  });

  // أمر تفريغ وحذف العروض الخاطفة الوهمية من التطبيق
  const clearAllOffers = () => {
    // 1. مسح العروض من الحالة المحلية (State)
    setFlashOffers([]);
    
    // 2. تخزين مصفوفة فارغة لضمان عدم استعادة الافتراضيات
    localStorage.setItem('mandoubak_flash_offers', JSON.stringify([]));
    
    console.log("تم تفريغ وحذف جميع العروض بنجاح");
  };

  // Scheduled Notifications state
  const [scheduledList, setScheduledList] = useState<Array<{ id: string; title: string; body: string; date: string; time: string; target: string; status: string }>>([
    { id: "sc-1", title: "تذكير بطلب عروض سيبلوكس", body: "تذكير للعميل بطلب دفعة جديدة مع عروض البونص الشهرية الخاصة بالمندوب د. بلال", date: "2026-10-01", time: "10:00", target: entityName || clientName || "الصيدلية", status: "مجدولة" }
  ]);
  const [schedTitle, setSchedTitle] = useState("");
  const [schedBody, setSchedBody] = useState("");
  const [schedDate, setSchedDate] = useState("");
  const [schedTime, setSchedTime] = useState("");

  const handleAddScheduledNotification = () => {
    if (!schedTitle.trim() || !schedDate || !schedTime) {
      alert("يرجى إدخال عنوان الإشعار وتاريخ ووقت الجدولة.");
      return;
    }
    setScheduledList([
      ...scheduledList,
      {
        id: "sc-" + Date.now(),
        title: schedTitle.trim(),
        body: schedBody.trim() || "تذكير دوري بخصوص الأدوية وطلبيات المخزون وعروض البونص",
        date: schedDate,
        time: schedTime,
        target: entityName || clientName || "العميل",
        status: "مجدولة"
      }
    ]);
    setSchedTitle("");
    setSchedBody("");
    setSchedDate("");
    setSchedTime("");
  };

  const handleDeleteScheduled = (id: string) => {
    setScheduledList(scheduledList.filter(item => item.id !== id));
  };

  const handleTestTriggerScheduled = async (item: { title: string; body: string }) => {
    const granted = await requestNotificationPermission();
    if (granted) {
      showLocalNotification(item.title, {
        body: item.body,
        tag: "scheduled-push-test"
      });
      alert("تم تفعيل واختبار الإشعار المجدول وإرساله فوراً إلى جهازك بنجاح!");
    } else {
      alert("يرجى السماح بالمتصفح بإرسال الإشعارات لتلقي التنبيهات المجدولة.");
    }
  };

  // Local state for registered near-expiry items
  const [expiryItems, setExpiryItems] = useState<Array<{ productName: string; qty: string; expiry: string }>>([
    { productName: "سيبلوكس 500", qty: "5 شرائط", expiry: "2026-11" }
  ]);

  const [newProductName, setNewProductName] = useState<string>("");
  const [newQty, setNewQty] = useState<string>("");
  const [newExpiry, setNewExpiry] = useState<string>("");
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const handleAddExpiryItem = () => {
    if (!newProductName.trim()) return;
    setExpiryItems([
      ...expiryItems,
      {
        productName: newProductName.trim(),
        qty: newQty.trim() || "1",
        expiry: newExpiry || "غير محدد"
      }
    ]);
    setNewProductName("");
    setNewQty("");
    setNewExpiry("");
  };

  const handleRemoveExpiryItem = (idx: number) => {
    setExpiryItems(expiryItems.filter((_, i) => i !== idx));
  };

  const handleSendExpiryReportWhatsApp = () => {
    if (expiryItems.length === 0) {
      alert("يرجى إضافة صنف واحد على الأقل لتنسيق الرواكد والصلاحيات.");
      return;
    }

    const itemsText = expiryItems
      .map((it, idx) => `${idx + 1}. ${it.productName} — الكمية: ${it.qty} (تاريخ الصلاحية: ${it.expiry})`)
      .join("\n");

    const text = encodeURIComponent(`🚨 *تقرير حصر الرواكد وقرب انتهاء الصلاحيات*
━━━━━━━━━━━━━━━━━━
🏥 *المنشأة*: ${entityName || clientName}
👤 *العميل*: ${clientName}
👨‍⚕️ *المندوب الطبي*: د/ بلال القيسي (776600049)
━━━━━━━━━━━━━━━━━━
الأصناف المراد تنسيق تدويرها أو إرجاعها أو استبدالها:
${itemsText}
━━━━━━━━━━━━━━━━━━
يرجى من المندوب التكرم بالزيارة والمطابقة.`);
    window.open(`https://wa.me/967776600049?text=${text}`, "_blank");
  };

  const handleTriggerExpiryPushNotification = async () => {
    if (expiryItems.length === 0) {
      alert("لا توجد أصناف مسجلة لقرب انتهاء الصلاحية لإرسال إشعار بها.");
      return;
    }
    const granted = await requestNotificationPermission();
    if (granted) {
      showLocalNotification("⚠️ تنبيه انتهاء صلاحية الأدوية بالمخزون", {
        body: `يوجد ${expiryItems.length} أصناف في مخزون ${entityName || clientName} قاربت صلاحيتها على الانتهاء. يرجى المراجعة والتنسيق مع د. بلال.`,
        tag: "inventory-expiry-alert"
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } else {
      alert("يرجى السماح بالمتصفح بإرسال الإشعارات لتلقي تنبيهات الصلاحيات الفورية.");
    }
  };

  const handleExportCSV = () => {
    if (expiryItems.length === 0) {
      alert("لا توجد أصناف مسجلة لتصديرها.");
      return;
    }
    const csvRows = [
      ["رقم", "اسم الصنف", "الكمية", "تاريخ الصلاحية", "المنشأة", "العميل", "المندوب"],
      ...expiryItems.map((item, idx) => [
        idx + 1,
        `"${item.productName.replace(/"/g, '""')}"`,
        `"${item.qty.replace(/"/g, '""')}"`,
        `"${item.expiry}"`,
        `"${(entityName || clientName).replace(/"/g, '""')}"`,
        `"${clientName.replace(/"/g, '""')}"`,
        "د/ بلال القيسي (776600049)"
      ])
    ];
    const csvContent = "\uFEFF" + csvRows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `expiry_report_${(entityName || clientName).replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPrintPDF = () => {
    if (expiryItems.length === 0) {
      alert("لا توجد أصناف مسجلة للطباعة والتصدير.");
      return;
    }
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("يرجى السماح بفتح النوافذ المنبثقة لطباعة أو تصدير التقرير.");
      return;
    }
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>تقرير الرواكد وقرب انتهاء الصلاحيات</title>
        <style>
          body { font-family: Tahoma, Arial, sans-serif; padding: 25px; color: #1e293b; direction: rtl; background: #fff; }
          .header { text-align: center; border-bottom: 2px solid #0f766e; padding-bottom: 15px; margin-bottom: 20px; }
          .header h1 { color: #0f766e; margin: 0 0 5px 0; font-size: 22px; }
          .header p { color: #475569; margin: 0; font-size: 13px; }
          .meta { margin-bottom: 20px; font-size: 14px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
          .meta p { margin: 6px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #cbd5e1; padding: 10px 14px; text-align: right; font-size: 13px; }
          th { background: #0f766e; color: #ffffff; font-weight: bold; }
          tr:nth-child(even) { background: #f8fafc; }
          .footer { margin-top: 35px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #cbd5e1; padding-top: 12px; }
          @media print { body { padding: 0; } .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>مندوبك الطبي — تقرير حصر الرواكد وقرب الصلاحيات</h1>
          <p>تنسيق تدوير واستبدال الأدوية والمستلزمات الطبية</p>
        </div>
        <div class="meta">
          <p><strong>اسم المنشأة / الصيدلية:</strong> ${entityName || clientName}</p>
          <p><strong>اسم العميل / المسؤول:</strong> ${clientName}</p>
          <p><strong>المندوب الطبي المعتمد:</strong> د/ بلال القيسي (هاتف: 776600049)</p>
          <p><strong>تاريخ التقرير:</strong> ${new Date().toLocaleDateString('ar-YE', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 50px;">م</th>
              <th>اسم الصنف الدوائي</th>
              <th>الكمية المتاحة</th>
              <th>تاريخ انتهاء الصلاحية</th>
            </tr>
          </thead>
          <tbody>
            ${expiryItems.map((it, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td><strong>${it.productName}</strong></td>
                <td>${it.qty}</td>
                <td style="color: #be123c; font-weight: bold;">${it.expiry}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        <div class="footer">
          <p>تم استخراج هذا التقرير إلكترونياً عبر تطبيق مندوبك الطبي الذكي - جميع الحقوق محفوظة.</p>
        </div>
        <div class="no-print" style="margin-top: 25px; text-align: center;">
          <button onclick="window.print();" style="background: #0f766e; color: white; border: none; padding: 10px 20px; font-size: 14px; border-radius: 6px; cursor: pointer; font-weight: bold;">طباعة / حفظ كملف PDF 🖨️</button>
        </div>
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="space-y-4 text-slate-900">
      {/* Top Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-700 via-rose-900 to-slate-900 text-white p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-lg shadow-md shrink-0">
              ⚡
            </div>
            <div>
              <span className="text-4xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.2 rounded-full">
                عروض فورية وحلول لوجستية
              </span>
              <h3 className="text-sm sm:text-base font-black text-white mt-0.5">
                عروض البونص الخاطف وتنسيق الرواكد والصلاحيات
              </h3>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700 text-3xs font-black">
            <button
              type="button"
              onClick={() => setActiveTab("flash_offers")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "flash_offers" ? "bg-amber-500 text-slate-950 shadow-2xs font-black" : "text-slate-300"
              }`}
            >
              <Flame className="h-3.5 w-3.5" />
              <span>عروض البونص الخاطف</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("expiry_coordinator")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "expiry_coordinator" ? "bg-rose-600 text-white shadow-2xs font-black" : "text-slate-300"
              }`}
            >
              <PackageCheck className="h-3.5 w-3.5" />
              <span>حصر الرواكد والصلاحيات</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("scheduled_notifications")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "scheduled_notifications" ? "bg-teal-600 text-white shadow-2xs font-black" : "text-slate-300"
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>جدولة الإشعارات</span>
            </button>
          </div>
        </div>
      </div>

      {activeTab === "flash_offers" && (
        <div className="space-y-3">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-bold text-slate-700">العروض الخاطفة الحالية:</h3>
            {flashOffers.length > 0 && (
              <button 
                onClick={clearAllOffers}
                className="text-2xs font-bold text-rose-600 hover:text-rose-800 bg-rose-50 px-2 py-1 rounded-md"
              >
                تصفير العروض
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {flashOffers.map((offer) => (
              <div
                key={offer.id}
                className="rounded-2xl border-2 border-amber-300/80 bg-gradient-to-b from-amber-50/50 via-white to-amber-50/20 p-4 shadow-sm flex flex-col justify-between gap-3 relative overflow-hidden"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-4xs font-black bg-rose-600 text-white px-2 py-0.5 rounded-full shadow-2xs">
                      {offer.badge} 🔥
                    </span>
                    <span className="text-4xs text-amber-900 font-bold flex items-center gap-1">
                      <Clock className="h-3 w-3 text-amber-700" />
                      {offer.endsAt}
                    </span>
                  </div>

                  <h4 className="font-black text-slate-950 text-sm leading-snug">{offer.productName}</h4>

                  <div className="rounded-xl bg-amber-100/80 border border-amber-300 p-2.5 space-y-1">
                    <div className="flex items-center justify-between text-3xs">
                      <span className="text-slate-500">البونص المعتاد:</span>
                      <span className="font-mono text-slate-700 line-through">{offer.originalBonus}</span>
                    </div>
                    <div className="flex items-center justify-between text-2xs font-black text-amber-950">
                      <span>البونص الخاطف الآن:</span>
                      <span className="text-rose-700 font-extrabold">{offer.flashBonus}</span>
                    </div>
                  </div>

                  <p className="text-4xs text-slate-500 font-medium">
                    الحد الأدنى للطلبية للاستفادة: <strong>{offer.minOrderQty} وحدة</strong>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (onApplyFlashOffer) {
                      onApplyFlashOffer(offer);
                    } else {
                      const text = encodeURIComponent(`⚡ *طلب تفعيل عرض بونص خاطف*
━━━━━━━━━━━━━━━━━━
🏥 *المنشأة*: ${entityName || clientName}
💊 *الصنف*: ${offer.productName}
🎁 *العرض المطلوب*: ${offer.flashBonus}
━━━━━━━━━━━━━━━━━━
د/ بلال القيسي - يرجى تثبيت العرض لطلبيتي`);
                      window.open(`https://wa.me/967776600049?text=${text}`, "_blank");
                    }
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-rose-600 hover:brightness-105 text-white font-black text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>تثبيت العرض بالطلبية 🚀</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "expiry_coordinator" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4 space-y-3">
            <div className="flex items-center gap-2 text-rose-950 font-black text-xs">
              <AlertCircle className="h-5 w-5 text-rose-600" />
              <span>إضافة صنف راكد أو قريب الصلاحية للتنسيق مع المندوب:</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
              <input
                type="text"
                placeholder="اسم الصنف (مثلاً: سيبلوكس 500)..."
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                className="sm:col-span-6 rounded-xl border border-slate-300 bg-white p-2 text-xs font-semibold focus:border-rose-500 focus:outline-none"
              />
              <input
                type="text"
                placeholder="الكمية (مثلاً: 10 باكت)..."
                value={newQty}
                onChange={(e) => setNewQty(e.target.value)}
                className="sm:col-span-3 rounded-xl border border-slate-300 bg-white p-2 text-xs font-semibold focus:border-rose-500 focus:outline-none"
              />
              <input
                type="month"
                placeholder="تاريخ الانتهاء..."
                value={newExpiry}
                onChange={(e) => setNewExpiry(e.target.value)}
                className="sm:col-span-3 rounded-xl border border-slate-300 bg-white p-2 text-xs font-semibold focus:border-rose-500 focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={handleAddExpiryItem}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-3xs transition-all flex items-center gap-1.5 cursor-pointer mr-auto"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>إضافة الصنف للقائمة</span>
            </button>
          </div>

          {/* List of recorded items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-950">قائمة الأصناف المحصورة للتنسيق:</h4>
              <span className="text-3xs text-slate-500 font-mono">{expiryItems.length} أصناف مسجلة</span>
            </div>

            <div className="space-y-1.5">
              {expiryItems.map((item, idx) => (
                <div
                  key={`exp-${idx}`}
                  className="rounded-xl border border-slate-200 bg-white p-3 flex items-center justify-between gap-3 text-3xs shadow-2xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-rose-100 text-rose-800 font-mono font-bold text-4xs">
                      {idx + 1}
                    </span>
                    <div>
                      <span className="font-black text-slate-900 text-2xs">{item.productName}</span>
                      <div className="flex items-center gap-2 text-4xs text-slate-500 mt-0.5">
                        <span>الكمية: {item.qty}</span>
                        <span>•</span>
                        <span className="font-mono text-rose-700 font-bold">تاريخ الانتهاء: {item.expiry}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveExpiryItem(idx)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleTriggerExpiryPushNotification}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:brightness-105 text-white font-black text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Bell className="h-4 w-4 animate-bounce" />
                <span>إرسال إشعار فوري (Push Notification) للتنبيه بصلاحيات الأصناف 🔔</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleExportPrintPDF}
                  className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:brightness-105 text-white font-black text-3xs sm:text-2xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  <span>تصدير التقرير PDF / طباعة 🖨️</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:brightness-105 text-white font-black text-3xs sm:text-2xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>تصدير ملف CSV 📊</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleSendExpiryReportWhatsApp}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:brightness-105 text-white font-black text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Send className="h-4 w-4" />
                <span>إرسال تقرير الرواكد والصلاحيات للمندوب د/ بلال عبر واتساب 💬</span>
              </button>

              {savedSuccess && (
                <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-3xs font-bold text-center animate-pulse">
                  ✅ تم إرسال الإشعار الفوري بنجاح إلى جهازك!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "scheduled_notifications" && (
        <div className="rounded-2xl border border-teal-200 bg-white p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-sm">جدولة الإشعارات التذكيرية للعملاء</h3>
                <p className="text-3xs text-slate-500 font-medium">جدولة الإشعارات والرسائل الترويجية لتصل في الأوقات المحددة تلقائياً</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 text-3xs font-bold border border-teal-200">
              {scheduledList.length} إشعارات مجدولة
            </span>
          </div>

          {/* Add Scheduled Notification Form */}
          <div className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-200/80 space-y-3">
            <h4 className="font-black text-teal-900 text-3xs flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5 text-teal-700" />
              <span>جدولة إشعار جديد</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-4xs font-bold text-slate-700 mb-1">عنوان الإشعار:</label>
                <input
                  type="text"
                  value={schedTitle}
                  onChange={(e) => setSchedTitle(e.target.value)}
                  placeholder="مثال: تذكير بموعد استلام دفعة سيبلوكس"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-3xs text-slate-900 focus:outline-none focus:border-teal-600"
                />
              </div>
              <div>
                <label className="block text-4xs font-bold text-slate-700 mb-1">العميل / المنشأة المستهدفة:</label>
                <input
                  type="text"
                  disabled
                  value={entityName || clientName || "الصيدلية"}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-3xs text-slate-600 font-medium cursor-not-allowed"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-4xs font-bold text-slate-700 mb-1">نص وتفاصيل الإشعار:</label>
                <input
                  type="text"
                  value={schedBody}
                  onChange={(e) => setSchedBody(e.target.value)}
                  placeholder="محتوى الإشعار الذي سيظهر للعميل في الوقت المجدول..."
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-3xs text-slate-900 focus:outline-none focus:border-teal-600"
                />
              </div>
              <div>
                <label className="block text-4xs font-bold text-slate-700 mb-1">تاريخ الإرسال المجدول:</label>
                <input
                  type="date"
                  value={schedDate}
                  onChange={(e) => setSchedDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-3xs text-slate-900 focus:outline-none focus:border-teal-600"
                />
              </div>
              <div>
                <label className="block text-4xs font-bold text-slate-700 mb-1">وقت الإرسال:</label>
                <input
                  type="time"
                  value={schedTime}
                  onChange={(e) => setSchedTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-3xs text-slate-900 focus:outline-none focus:border-teal-600"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddScheduledNotification}
              className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-3xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>حفظ وجدولة الإشعار 📅</span>
            </button>
          </div>

          {/* List of Scheduled Notifications */}
          <div className="space-y-2">
            <h4 className="font-black text-slate-900 text-3xs">قائمة الإشعارات المجدولة النشطة:</h4>
            {scheduledList.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-3xs">لا توجد إشعارات مجدولة حالياً.</div>
            ) : (
              scheduledList.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 bg-white p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-3xs shadow-2xs"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-teal-50 text-teal-800 flex items-center justify-center font-bold shrink-0 mt-0.5">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-2xs">{item.title}</span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-4xs font-bold">
                          {item.status}
                        </span>
                      </div>
                      <p className="text-slate-600 text-3xs">{item.body}</p>
                      <div className="flex items-center gap-3 text-4xs text-slate-500 font-mono">
                        <span>📅 التاريخ: {item.date}</span>
                        <span>⏰ الوقت: {item.time}</span>
                        <span>🏥 المنشأة: {item.target}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleTestTriggerScheduled(item)}
                      className="px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-4xs font-bold transition-colors cursor-pointer border border-teal-200 flex items-center gap-1"
                    >
                      <Bell className="h-3 w-3" />
                      <span>اختبار الإشعار</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteScheduled(item.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                      title="حذف الجدولة"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
