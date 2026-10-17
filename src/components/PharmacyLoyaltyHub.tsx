import React, { useState } from "react";
import {
  Award,
  Crown,
  Gift,
  RotateCcw,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  Share2,
  ChevronRight,
  ShieldCheck,
  Star
} from "lucide-react";
import { LoyaltyReward, Order } from "../types";

export const LOYALTY_REWARDS: LoyaltyReward[] = [
  {
    id: "rew-1",
    title: "بونص ترويجي إضافي (+5% على طلبيتك القادمة)",
    pointsRequired: 300,
    category: "bonus_boost",
    description: "تطبيق بونص إضافي 5% على أي صنف من أصناف القائمة المعتمدة بالتنسيق المباشر مع د/ بلال.",
    icon: "🎁"
  },
  {
    id: "rew-2",
    title: "بونص ترويجي مضاعف (+10% على طلبيتك القادمة)",
    pointsRequired: 600,
    category: "bonus_boost",
    description: "تطبيق بونص إضافي 10% مجاني على طلبيتك القادمة تقديراً لشراكتكم المستمرة.",
    icon: "⚡"
  },
  {
    id: "rew-3",
    title: "أولوية التوريد الفوري وخصم خاص على الأصناف الحصرية",
    pointsRequired: 900,
    category: "bonus_boost",
    description: "أولوية شحن فوري وتسليم مباشر مع بونص خاص معتمد من المندوب د/ بلال القيسي.",
    icon: "👑"
  }
];

interface Props {
  clientName: string;
  entityName: string;
  clientOrders?: Order[];
  onOneClickReorder?: (order: Order) => void;
}

export const PharmacyLoyaltyHub: React.FC<Props> = ({
  clientName,
  entityName,
  clientOrders = [],
  onOneClickReorder
}) => {
  // Compute points from orders (e.g., 10 points per 1 item ordered, or 25 points per order submitted)
  const totalOrdersCount = clientOrders.length;
  const totalItemsOrdered = clientOrders.reduce(
    (acc, ord) => acc + ord.items.reduce((s, it) => s + (it.quantity || 1), 0),
    0
  );

  // Baseline points: 50 welcome points + calculated from orders
  const earnedPoints = 50 + totalOrdersCount * 25 + totalItemsOrdered * 2;
  const [redeemedPoints, setRedeemedPoints] = useState<number>(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const availablePoints = Math.max(0, earnedPoints - redeemedPoints);

  // Determine Tier
  const tier =
    availablePoints >= 600
      ? { name: "بلاتيني (Platinum)", color: "from-slate-800 to-indigo-900", icon: "👑", next: "أعلى فئة تميز" }
      : availablePoints >= 300
      ? { name: "ذهبي (Gold)", color: "from-amber-500 to-amber-700", icon: "⭐", next: "باقي 300 نقطة للبلاتيني" }
      : availablePoints >= 150
      ? { name: "فضي (Silver)", color: "from-slate-400 to-slate-600", icon: "🥈", next: "باقي 150 نقطة للذهبي" }
      : { name: "برونزي (Bronze)", color: "from-amber-700 to-amber-900", icon: "🥉", next: "باقي 100 نقطة للفضي" };

  const handleRedeem = (reward: LoyaltyReward) => {
    if (availablePoints < reward.pointsRequired) {
      alert(`عذراً، تحتاج إلى ${reward.pointsRequired - availablePoints} نقطة إضافية لاستبدال هذه المكافأة.`);
      return;
    }

    setRedeemedPoints((prev) => prev + reward.pointsRequired);
    setSuccessMessage(`تم حجز مكافأة: "${reward.title}" بنجاح! تم إشعار المندوب د/ بلال القيسي للتنسيق والتسليم.`);
    setTimeout(() => setSuccessMessage(null), 4000);

    // Also share notification
    const text = encodeURIComponent(`🎁 *طلب استبدال مكافأة ولاء صيدلية*
━━━━━━━━━━━━━━━━━━
🏥 *المنشأة*: ${entityName || clientName}
👤 *العميل*: ${clientName}
🏆 *المكافأة المطلوبة*: ${reward.title}
🔢 *النقاط المستبدلة*: ${reward.pointsRequired} نقطة
━━━━━━━━━━━━━━━━━━
المندوب د/ بلال القيسي - يرجى اعتماد وتسليم المكافأة.`);
    window.open(`https://wa.me/967776600049?text=${text}`, "_blank");
  };

  const lastOrder = clientOrders[0];

  return (
    <div className="space-y-4 text-slate-900">
      {/* Loyalty Status Banner */}
      <div className={`rounded-2xl bg-gradient-to-r ${tier.color} text-white p-4 sm:p-5 shadow-sm relative overflow-hidden`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center font-black text-2xl shadow-inner shrink-0">
              {tier.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-4xs font-black bg-white/20 text-white border border-white/30 px-2 py-0.5 rounded-full">
                  برنامج ولاء وشركاء د/ بلال القيسي
                </span>
              </div>
              <h3 className="text-lg font-black text-white mt-1">
                عضوية المستوى: {tier.name}
              </h3>
              <p className="text-3xs text-white/80 font-medium">
                {entityName ? `${entityName} - ` : ""}{clientName}
              </p>
            </div>
          </div>

          {/* Points Counter */}
          <div className="rounded-2xl bg-slate-950/40 border border-white/20 p-3 text-center min-w-[140px] shadow-sm">
            <span className="text-4xs text-amber-300 font-bold block">رصيد النقاط المتاحة</span>
            <div className="flex items-baseline justify-center gap-1 my-0.5">
              <span className="text-2xl sm:text-3xl font-black font-mono text-amber-300">
                {availablePoints}
              </span>
              <span className="text-3xs font-bold text-white">نقطة ⭐</span>
            </div>
            <span className="text-4xs text-white/70 block">{tier.next}</span>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 flex items-center gap-2 text-xs font-bold text-emerald-900 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* 1-Click Reorder Quick Action */}
      {lastOrder && (
        <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50/50 p-4 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-4xs font-bold bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded font-mono">
                  آخر طلبية سابقة
                </span>
                <span className="text-4xs text-slate-500 font-mono">
                  {new Date(lastOrder.createdAt).toLocaleDateString("ar-EG")}
                </span>
              </div>
              <h4 className="text-xs font-black text-slate-950 mt-0.5">
                إعادة طلب نفس الأصناف السابقة بنقرة واحدة ({lastOrder.items.length} أصناف)
              </h4>
              <p className="text-3xs text-slate-600 truncate max-w-md">
                {lastOrder.items.map((it) => `${it.productName} (${it.quantity})`).join(" • ")}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOneClickReorder && onOneClickReorder(lastOrder)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-teal-600 hover:brightness-105 text-white font-black text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            <Sparkles className="h-4 w-4" />
            <span>تكرار الطلبية الآن ⚡</span>
          </button>
        </div>
      )}

      {/* How to Earn Points Section (دليل وقواعد جمع النقاط) */}
      <div className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50/70 via-white to-amber-50/40 p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-teal-100 pb-2.5">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4.5 w-4.5 text-teal-700" />
            <h4 className="text-xs font-black text-slate-950">
              كيف تجمع وتضاعف نقاط الولاء في حسابك؟ 📈
            </h4>
          </div>
          <span className="text-4xs font-black bg-teal-100 text-teal-900 px-2 py-0.5 rounded-full">
            تراكمي وتلقائي
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          <div className="rounded-xl border border-teal-200/80 bg-white p-3 space-y-1 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-base">🎉</span>
              <span className="text-2xs font-black text-teal-800 font-mono bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                +50 نقطة
              </span>
            </div>
            <h5 className="text-xs font-black text-slate-900">هدية الترحيب بالانضمام</h5>
            <p className="text-3xs text-slate-500 font-medium leading-relaxed">
              تُمنح تلقائياً عند تفعيل حساب صيدليتك أو عيادتك على التطبيق.
            </p>
          </div>

          <div className="rounded-xl border border-indigo-200/80 bg-white p-3 space-y-1 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-base">📦</span>
              <span className="text-2xs font-black text-indigo-800 font-mono bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                +25 نقطة
              </span>
            </div>
            <h5 className="text-xs font-black text-slate-900">لكل طلبية مسجلة</h5>
            <p className="text-3xs text-slate-500 font-medium leading-relaxed">
              تُضاف لرصيدك عند إرسال أي طلبية أدوية جديدة عبر المنصة.
            </p>
          </div>

          <div className="rounded-xl border border-amber-200/80 bg-white p-3 space-y-1 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-base">💊</span>
              <span className="text-2xs font-black text-amber-900 font-mono bg-amber-50 px-2 py-0.5 rounded-md border border-amber-300">
                +2 نقطة / عبوة
              </span>
            </div>
            <h5 className="text-xs font-black text-slate-900">حجم الكميات المسحوبة</h5>
            <p className="text-3xs text-slate-500 font-medium leading-relaxed">
              نقطتان إضافيتان عن كل باكت أو علبة دواء يتم طلبها وتوريدها.
            </p>
          </div>

          <div className="rounded-xl border border-cyan-200/80 bg-white p-3 space-y-1 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-base">📋</span>
              <span className="text-2xs font-black text-cyan-800 font-mono bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-200">
                +15 نقطة
              </span>
            </div>
            <h5 className="text-xs font-black text-slate-900">تحديث كشف الجرد</h5>
            <p className="text-3xs text-slate-500 font-medium leading-relaxed">
              عند تسجيل الرصيد المتبقي لتفادي انقطاع ونفاد أي صنف.
            </p>
          </div>

          <div className="rounded-xl border border-rose-200/80 bg-white p-3 space-y-1 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-base">⚡</span>
              <span className="text-2xs font-black text-rose-800 font-mono bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                +30 نقطة
              </span>
            </div>
            <h5 className="text-xs font-black text-slate-900">عروض البونص والرواكد</h5>
            <p className="text-3xs text-slate-500 font-medium leading-relaxed">
              المشاركة في تدوير الأدوية قريبة الانتهاء وحجز البونص الخاطف.
            </p>
          </div>

          <div className="rounded-xl border border-emerald-200/80 bg-white p-3 space-y-1 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-base">🤝</span>
              <span className="text-2xs font-black text-emerald-800 font-mono bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                +40 نقطة
              </span>
            </div>
            <h5 className="text-xs font-black text-slate-900">استمرارية التعامل والتنسيق</h5>
            <p className="text-3xs text-slate-500 font-medium leading-relaxed">
              التواصل الفعال واعتماد طلبيات شهرية منتظمة مع المندوب د/ بلال.
            </p>
          </div>
        </div>
      </div>

      {/* Rewards Catalog */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black text-slate-950 flex items-center gap-1.5">
            <Gift className="h-4 w-4 text-amber-600" />
            <span>كتالوج مكافآت وهدايا الولاء:</span>
          </h4>
          <span className="text-3xs text-slate-500 font-medium">
            تُستبدل وتُسلّم مباشرة باليد مع المندوب د/ بلال
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {LOYALTY_REWARDS.map((rew) => {
            const canAfford = availablePoints >= rew.pointsRequired;
            return (
              <div
                key={rew.id}
                className={`rounded-2xl border p-4 flex flex-col justify-between gap-3 transition-all ${
                  canAfford
                    ? "border-amber-300 bg-white hover:border-amber-400 shadow-2xs"
                    : "border-slate-200 bg-slate-50/70 opacity-80"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{rew.icon}</span>
                    <span
                      className={`text-xs font-mono font-black px-2 py-0.5 rounded-full border ${
                        canAfford
                          ? "bg-amber-100 text-amber-900 border-amber-300"
                          : "bg-slate-200 text-slate-700 border-slate-300"
                      }`}
                    >
                      {rew.pointsRequired} نقطة
                    </span>
                  </div>
                  <h5 className="font-black text-slate-950 text-xs leading-snug">{rew.title}</h5>
                  <p className="text-3xs text-slate-600 leading-relaxed font-medium">{rew.description}</p>
                </div>

                <button
                  type="button"
                  onClick={() => handleRedeem(rew)}
                  disabled={!canAfford}
                  className={`w-full py-2 px-3 rounded-xl font-bold text-3xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    canAfford
                      ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-105 text-white shadow-2xs"
                      : "bg-slate-200 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  <Gift className="h-3 w-3" />
                  <span>{canAfford ? "استبدال المكافأة الآن" : `يلزمك ${rew.pointsRequired - availablePoints} نقطة إضافية`}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
