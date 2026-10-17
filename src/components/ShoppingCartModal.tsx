import React from "react";
import { Product, CartItem, User } from "../types";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  X,
  Send,
  MessageSquare,
  Sparkles,
  ClipboardList,
  CheckCircle2,
  Package,
  ShieldCheck,
  ChevronRight
} from "lucide-react";
import { getProductDisplayImage } from "../utils/productImages";

interface ShoppingCartModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, newQty: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onCheckout: (notes: string) => Promise<boolean | void>;
  user: User | null;
  agreedTermsNotes?: string;
  setAgreedTermsNotes?: (notes: string) => void;
}

export const ShoppingCartModal: React.FC<ShoppingCartModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckout,
  user,
  agreedTermsNotes = "",
  setAgreedTermsNotes
}) => {
  const [localNotes, setLocalNotes] = React.useState(agreedTermsNotes);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    setLocalNotes(agreedTermsNotes);
  }, [agreedTermsNotes]);

  if (!isOpen) return null;

  // Calculate numerical price helper
  const parseNumericPrice = (priceStr: string): number => {
    if (!priceStr) return 0;
    const cleaned = priceStr.replace(/[^0-9.]/g, "");
    return parseFloat(cleaned) || 0;
  };

  // Compute total sums
  const totalUnits = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const totalPrice = cartItems.reduce((acc, item) => {
    const unitPrice = parseNumericPrice(item.product.price);
    return acc + unitPrice * item.quantity;
  }, 0);

  // Bonus calculation helper
  const calculateBonusReward = (qty: number, bonus?: string): number => {
    if (!bonus || qty <= 0) return 0;
    const cleanBonus = bonus.trim();
    if (cleanBonus.includes("%")) {
      const pct = parseFloat(cleanBonus.replace("%", "")) || 0;
      return Math.floor((qty * pct) / 100);
    }
    const match = cleanBonus.match(/(\d+)\s*\+\s*(\d+)/);
    if (match) {
      const buy = parseInt(match[1]);
      const free = parseInt(match[2]);
      if (buy > 0) return Math.floor(qty / buy) * free;
    }
    return 0;
  };

  const totalBonusItems = cartItems.reduce((acc, item) => {
    return acc + calculateBonusReward(item.quantity, item.product.bonus);
  }, 0);

  const handleConfirmOrder = async () => {
    if (cartItems.length === 0) return;
    setIsSubmitting(true);
    try {
      if (setAgreedTermsNotes) {
        setAgreedTermsNotes(localNotes);
      }
      await onCheckout(localNotes);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  // WhatsApp Order Share
  const handleShareWhatsApp = () => {
    if (cartItems.length === 0) return;

    let text = `*طلب دواء جديد عبر منصة مندوبك الطبي* 📋✨\n`;
    text += `👤 *العميل:* ${user?.name || "عميل مسجل"}\n`;
    text += `🏥 *المنشأة:* ${user?.entityName || "غير محدد"}\n`;
    text += `📱 *رقم الهاتف:* ${user?.phone || ""}\n`;
    text += `🗓️ *التاريخ:* ${new Date().toLocaleDateString("ar-YE")} ${new Date().toLocaleTimeString("ar-YE", { hour: "2-digit", minute: "2-digit" })}\n\n`;
    text += `📦 *تفاصيل الأصناف المطلوبة (${cartItems.length} صنف):*\n`;

    cartItems.forEach((item, index) => {
      const unitPrice = parseNumericPrice(item.product.price);
      const subtotal = unitPrice * item.quantity;
      const bonusReward = calculateBonusReward(item.quantity, item.product.bonus);

      text += `${index + 1}. *${item.product.name}*\n`;
      text += `   - الكمية: ${item.quantity} ${item.product.unit || "علبة"}\n`;
      text += `   - السعر: ${item.product.price} | الإجمالي: ${subtotal.toLocaleString()} ريال\n`;
      if (bonusReward > 0) {
        text += `   - 🎁 البونص المستحق: +${bonusReward} ${item.product.unit || "علبة"} مجاناً (${item.product.bonus})\n`;
      }
    });

    text += `\n💰 *إجمالي قيمة الطلبية:* ${totalPrice.toLocaleString()} ريال\n`;
    if (totalBonusItems > 0) {
      text += `🎁 *إجمالي الأصناف المجانية (البونص):* +${totalBonusItems} وحدة\n`;
    }

    if (localNotes.trim()) {
      text += `\n📝 *ملاحظات خاصة وشروط:* ${localNotes.trim()}\n`;
    }

    text += `\n🙏 شكراً لتعاملكم مع المندوب الطبي د/ بلال القيسي (776600049).`;

    const encoded = encodeURIComponent(text);
    const repPhone = "967776600049";
    window.open(`https://wa.me/${repPhone}?text=${encoded}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-2xl bg-teal-500/20 border border-teal-400/40 text-teal-300 flex items-center justify-center font-bold shadow-xs">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base sm:text-lg font-black text-white">
                  سلة طلبيات الأدوية
                </h3>
                <span className="bg-amber-400 text-slate-950 text-2xs font-black px-2 py-0.5 rounded-full font-mono">
                  {cartItems.length} صنف
                </span>
              </div>
              <p className="text-3xs text-teal-200/80 font-medium">
                {user?.entityName || user?.name || "منشأة العميل"} • المندوب الطبي د/ بلال القيسي
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {cartItems.length > 0 && (
              <button
                type="button"
                onClick={onClearCart}
                className="text-rose-300 hover:text-rose-100 hover:bg-white/10 px-2 py-1 rounded-lg text-3xs font-bold transition-colors cursor-pointer"
                title="تفريغ السلة بالكامل"
              >
                تفريغ السلة
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {cartItems.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="h-16 w-16 mx-auto rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center">
                <ShoppingCart className="h-8 w-8 text-slate-300" />
              </div>
              <h4 className="text-sm font-black text-slate-800">
                سلة الطلبيات فارغة حالياً
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                تصفح كتالوج الأصناف الدوائية واختر الأدوية والكميات المطلوبة لإضافتها إلى السلة وتأكيد الطلبية فوراً.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black shadow-sm cursor-pointer"
              >
                تصفح الكتالوج الدوائي 💊
              </button>
            </div>
          ) : (
            <>
              {/* Items List */}
              <div className="space-y-2.5 divide-y divide-slate-100">
                {cartItems.map((item) => {
                  const displayImg = getProductDisplayImage(item.product);
                  const unitPrice = parseNumericPrice(item.product.price);
                  const subtotal = unitPrice * item.quantity;
                  const bonusReward = calculateBonusReward(item.quantity, item.product.bonus);

                  return (
                    <div
                      key={item.product.id}
                      className="pt-2.5 first:pt-0 flex items-center justify-between gap-3 bg-white"
                    >
                      {/* Thumbnail & Product Details */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <img
                          src={displayImg}
                          alt={item.product.name}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <h5 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                            {item.product.name}
                          </h5>
                          <div className="flex items-center gap-2 text-3xs text-slate-500 mt-0.5">
                            <span className="font-mono text-teal-800 font-bold">
                              {item.product.price}
                            </span>
                            <span>/ {item.product.unit || "علبة"}</span>
                            {item.product.bonus && (
                              <span className="text-amber-800 font-bold bg-amber-50 px-1 rounded">
                                🎁 {item.product.bonus}
                              </span>
                            )}
                          </div>
                          {bonusReward > 0 && (
                            <div className="text-4xs font-black text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded mt-0.5 inline-block border border-emerald-200">
                              + {bonusReward} وحدة بونص مجاني 🎁
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Stepper & Line Price */}
                      <div className="flex items-center gap-3 shrink-0">
                        {/* Quantity Stepper */}
                        <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200">
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                            className="h-7 w-7 rounded-lg bg-white hover:bg-slate-200 text-slate-800 font-black text-xs flex items-center justify-center cursor-pointer shadow-3xs"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 1;
                              onUpdateQuantity(item.product.id, Math.max(1, val));
                            }}
                            className="w-10 text-center font-mono font-black text-xs text-slate-900 bg-transparent focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                            className="h-7 w-7 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-black text-xs flex items-center justify-center cursor-pointer shadow-3xs"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        {/* Subtotal & Delete */}
                        <div className="text-left min-w-[70px]">
                          <div className="font-mono font-black text-xs text-slate-900">
                            {subtotal.toLocaleString()} ريال
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.product.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="حذف من السلة"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Order Notes / Terms Agreement */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3 sm:p-3.5 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                  <ClipboardList className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>ملاحظات خاصة بالطلبية وشروط السداد المتفق عليها:</span>
                </div>
                <textarea
                  rows={2}
                  placeholder="مثال: التوصيل صباحاً، أو شروط سداد خاصة متفق عليها مع المندوب..."
                  value={localNotes}
                  onChange={(e) => setLocalNotes(e.target.value)}
                  className="w-full rounded-xl border border-amber-200 bg-white p-2.5 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Order Financial Summary Box */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>إجمالي الأصناف والوحدات:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {cartItems.length} صنف ({totalUnits} وحدة)
                  </span>
                </div>

                {totalBonusItems > 0 && (
                  <div className="flex items-center justify-between text-xs text-emerald-700 font-bold">
                    <span>إجمالي البونص المجاني المكتسب:</span>
                    <span className="font-mono font-black bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full">
                      🎁 +{totalBonusItems} وحدة مجاناً
                    </span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200 flex items-baseline justify-between">
                  <span className="text-sm font-black text-slate-900">المجموع الإجمالي للطلبية:</span>
                  <div className="text-left">
                    <span className="text-lg sm:text-xl font-black text-teal-800 font-mono tracking-tight">
                      {totalPrice.toLocaleString()}
                    </span>
                    <span className="text-xs font-bold text-slate-600 mr-1">ريال يمني</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        {cartItems.length > 0 && (
          <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                title="إرسال نسخة منسقة للطلبية عبر تطبيق واتساب"
              >
                <MessageSquare className="h-4 w-4" />
                <span>إرسال عبر واتساب 💬</span>
              </button>
            </div>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirmOrder}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-black transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              <span>{isSubmitting ? "جاري تأكيد الطلبية..." : "تأكيد وإرسال الطلبية للمندوب 🚀"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
