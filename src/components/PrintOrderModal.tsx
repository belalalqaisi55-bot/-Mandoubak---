import React from "react";
import {
  Printer,
  X,
  CheckCircle2,
  Hourglass,
  CheckCheck,
  XCircle,
  Building2,
  User as UserIcon,
  Phone,
  FileText,
  Calendar,
  Package,
  ShieldCheck,
  Trash2
} from "lucide-react";
import { Order } from "../types";

interface PrintOrderModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
  onDeleteOrder?: (order: Order) => void;
  repName?: string;
  repPhone?: string;
}

export const PrintOrderModal: React.FC<PrintOrderModalProps> = ({
  isOpen,
  order,
  onClose,
  onDeleteOrder,
  repName = "د. بلال القيسي",
  repPhone = "776600049"
}) => {
  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  // Helper to parse price safely
  const parseNumericPrice = (priceStr: string | number | undefined): number => {
    if (typeof priceStr === "number") return priceStr;
    if (!priceStr) return 0;
    const cleaned = String(priceStr).replace(/[^\d.]/g, "");
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const totalQuantity = (order.items || []).reduce(
    (sum, item) => sum + (Number(item.quantity) || 0),
    0
  );

  const totalEstimatedAmount = (order.items || []).reduce((sum, item) => {
    const unitPrice = parseNumericPrice(item.price);
    return sum + (Number(item.quantity) || 0) * unitPrice;
  }, 0);

  const hasPrices = totalEstimatedAmount > 0;

  const formattedDate = new Date(order.createdAt).toLocaleDateString("ar-YE", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  const formattedTime = new Date(order.createdAt).toLocaleTimeString("ar-YE", {
    hour: "2-digit",
    minute: "2-digit"
  });

  const printTimestamp = new Date().toLocaleString("ar-YE");

  return (
    <div
      id="print-order-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      dir="rtl"
    >
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Controls Bar (Non-Printable) */}
        <div className="no-print flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <Printer className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight">معاينة وطباعة الفاتورة الرسمية</h2>
              <p className="text-3xs text-slate-400">رقم الطلبية: <span className="font-mono text-teal-300">{order.id}</span></p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onDeleteOrder && (
              <button
                type="button"
                onClick={() => onDeleteOrder(order)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold transition shadow-sm active:scale-95 cursor-pointer"
                title="حذف هذه الطلبية نهائياً"
                id="btn-delete-order-from-modal"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">حذف الطلبية 🗑️</span>
              </button>
            )}

            <button
              id="btn-trigger-print-modal"
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition shadow-sm active:scale-95 cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>طباعة الفاتورة الآن</span>
            </button>

            <button
              id="btn-close-print-modal"
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title="إغلاق المعاينة"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/60">
          <div
            id="printable-invoice"
            className="w-full max-w-2xl mx-auto bg-white border border-slate-300 rounded-xl p-6 sm:p-8 text-slate-900 shadow-sm print:shadow-none print:border-none print:p-0 print:m-0"
          >
            {/* Header: Republic & Branding */}
            <div className="border-b-2 border-teal-700 pb-4 mb-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-block px-2.5 py-0.5 rounded bg-teal-50 text-teal-900 border border-teal-200 text-3xs font-extrabold uppercase">
                    الجمهورية اليمنية • مستند مالي وتوريد رسمي
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
                    فاتورة طلبية مستلزمات وأدوية طبية
                  </h1>
                  <p className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
                    <span>مندوبك الطبي: {repName}</span>
                    <span className="text-slate-400">•</span>
                    <span className="font-mono text-slate-700">هاتف: {repPhone}</span>
                  </p>
                </div>

                <div className="text-left shrink-0">
                  <div className="p-2 border border-slate-200 rounded-lg bg-slate-50 text-right">
                    <span className="text-3xs text-slate-500 font-bold block">رقم الفاتورة / الطلب:</span>
                    <span className="font-mono font-black text-xs text-slate-900">#{order.id}</span>
                  </div>
                  <span className="text-3xs text-slate-400 block mt-1 font-mono">
                    {formattedDate}
                  </span>
                </div>
              </div>
            </div>

            {/* Client & Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl mb-5 text-xs">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 text-teal-700 shrink-0" />
                  <span className="text-slate-500 font-medium">المنشأة / العميل:</span>
                  <span className="font-black text-slate-950">{order.entityName || "صيدلية / عيادة معتمدة"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <UserIcon className="h-3.5 w-3.5 text-teal-700 shrink-0" />
                  <span className="text-slate-500 font-medium">المسؤول المستلم:</span>
                  <span className="font-bold text-slate-800">{order.clientName || "غير محدد"}</span>
                </div>
              </div>

              <div className="space-y-1.5 sm:text-left">
                <div className="flex items-center sm:justify-end gap-2">
                  <Calendar className="h-3.5 w-3.5 text-teal-700 shrink-0" />
                  <span className="text-slate-500 font-medium">تاريخ الإنشاء:</span>
                  <span className="font-semibold text-slate-800">{formattedDate} ({formattedTime})</span>
                </div>
                <div className="flex items-center sm:justify-end gap-2">
                  <span className="text-slate-500 font-medium">حالة الطلبية:</span>
                  <span
                    className={`inline-flex items-center gap-1 font-black px-2 py-0.5 rounded text-3xs border ${
                      order.status === "completed"
                        ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                        : order.status === "approved"
                        ? "bg-cyan-100 text-cyan-900 border-cyan-300"
                        : order.status === "cancelled"
                        ? "bg-rose-100 text-rose-900 border-rose-300"
                        : "bg-amber-100 text-amber-900 border-amber-300"
                    }`}
                  >
                    {order.status === "completed" && <CheckCheck className="h-3 w-3" />}
                    {order.status === "approved" && <CheckCircle2 className="h-3 w-3" />}
                    {order.status === "pending" && <Hourglass className="h-3 w-3" />}
                    {order.status === "cancelled" && <XCircle className="h-3 w-3" />}
                    {order.status === "completed"
                      ? "تم التسليم والتوريد"
                      : order.status === "approved"
                      ? "مقبول ومؤكد رسمياً"
                      : order.status === "cancelled"
                      ? "ملغي"
                      : "معلق (قيد التنفيذ)"}
                  </span>
                </div>
              </div>
            </div>

            {/* Order Items Table */}
            <div className="mb-5 overflow-hidden border border-slate-300 rounded-xl">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="bg-teal-700 text-white font-black">
                    <th className="py-2.5 px-3 text-center w-10">م</th>
                    <th className="py-2.5 px-3">اسم الصنف الدوائي والمستلزم</th>
                    <th className="py-2.5 px-3 text-center w-24">الكمية المطلوبة</th>
                    <th className="py-2.5 px-3 text-left w-28">سعر الوحدة</th>
                    <th className="py-2.5 px-3 text-left w-28">الإجمالي الفرعي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item, idx) => {
                      const unitPrice = parseNumericPrice(item.price);
                      const subtotal = (Number(item.quantity) || 0) * unitPrice;

                      return (
                        <tr
                          key={`inv-item-${order.id}-${idx}`}
                          className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/70"}
                        >
                          <td className="py-2 px-3 text-center font-mono font-bold text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 font-bold text-slate-900">
                            {item.productName}
                          </td>
                          <td className="py-2 px-3 text-center font-mono font-black text-teal-800 bg-teal-50/40">
                            {item.quantity}
                          </td>
                          <td className="py-2 px-3 text-left font-mono font-semibold text-slate-700">
                            {unitPrice > 0 ? `${unitPrice.toLocaleString()} ر.ي` : item.price || "—"}
                          </td>
                          <td className="py-2 px-3 text-left font-mono font-black text-slate-900">
                            {subtotal > 0 ? `${subtotal.toLocaleString()} ر.ي` : "—"}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400 font-bold">
                        لا توجد أصناف في هذه الطلبية
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Financial Summary Calculation Box */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl mb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <Package className="h-4 w-4 text-teal-700" />
                  <span className="font-bold text-slate-600">إجمالي عدد الأصناف:</span>
                  <span className="font-black text-slate-900">{order.items?.length || 0} صنف</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-slate-600">مجموع العبوات والوحدات:</span>
                  <span className="font-black text-teal-800 font-mono">{totalQuantity} عبوة</span>
                </div>
              </div>

              {hasPrices && (
                <div className="p-2.5 px-4 bg-teal-900 text-white rounded-xl text-left border border-teal-950 w-full sm:w-auto">
                  <span className="text-3xs text-teal-200 block font-bold">إجمالي قيمة الفاتورة:</span>
                  <span className="text-lg font-black font-mono tracking-tight text-white">
                    {totalEstimatedAmount.toLocaleString()}{" "}
                    <span className="text-xs font-sans text-teal-300">ريال يمني</span>
                  </span>
                </div>
              )}
            </div>

            {/* Notes Section */}
            {order.notes && (
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl mb-5 text-xs">
                <span className="font-black text-amber-900 block mb-1">ملاحظات الطلبية والتوصيل:</span>
                <p className="text-slate-800 leading-relaxed">{order.notes}</p>
              </div>
            )}

            {/* Terms & Delivery Endorsement */}
            <div className="p-3 border border-dashed border-slate-300 rounded-xl bg-slate-50/50 mb-6 text-3xs text-slate-600 leading-relaxed">
              <p className="font-bold text-slate-700 mb-0.5">تعليمات التسليم وضمان الجودة:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>يرجى من الصيدلي أو المسؤول مطابقة الأصناف والكميات وأرقام التشغيلات فور الاستلام.</li>
                <li>تعتبر هذه الفاتورة مستند تسليم معتمد صادر من تطبيق "مندوبك الطبي".</li>
                <li>لأي استفسارات بخصوص الأصناف أو البونص يمكنكم التواصل المباشر مع المندوب د. بلال القيسي.</li>
              </ul>
            </div>

            {/* Signatures & Official Stamping Box */}
            <div className="grid grid-cols-2 gap-8 pt-4 border-t-2 border-slate-200 text-xs">
              <div className="text-center space-y-8">
                <div className="font-black text-slate-800">
                  ختم وتوقيع المنشأة المستلمة
                  <span className="block text-3xs text-slate-400 font-normal">
                    ({order.entityName || "الصيدلية / العيادة"})
                  </span>
                </div>
                <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto" />
                <span className="text-3xs text-slate-400 block">التوقيع / التاريخ</span>
              </div>

              <div className="text-center space-y-8">
                <div className="font-black text-teal-900">
                  المندوب الطبي المعتمد
                  <span className="block text-3xs text-teal-700 font-normal">
                    {repName} ({repPhone})
                  </span>
                </div>
                <div className="border-b border-dashed border-teal-600 w-3/4 mx-auto" />
                <span className="text-3xs text-teal-600 block">التوقيع والاعتماد</span>
              </div>
            </div>

            {/* Footer Watermark */}
            <div className="mt-8 pt-3 border-t border-slate-100 flex items-center justify-between text-4xs text-slate-400 font-mono">
              <span>تطبيق مندوبك الطبي (Mandoubak Med) • د/ بلال القيسي</span>
              <span>تاريخ وساعة الطباعة: {printTimestamp}</span>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions (Non-Printable) */}
        <div className="no-print p-3.5 bg-white border-t border-slate-200 flex items-center justify-between">
          <span className="text-2xs text-slate-500 font-medium">
            💡 نصيحة: يمكنك حفظ الفاتورة كملف PDF باختيار "Save as PDF" من خيارات الطابعة.
          </span>
          <div className="flex items-center gap-2">
            {onDeleteOrder && (
              <button
                type="button"
                onClick={() => onDeleteOrder(order)}
                className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="h-4 w-4 text-rose-600" />
                <span>حذف الطلبية</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black transition shadow-sm active:scale-95 cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>طباعة المستند</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
