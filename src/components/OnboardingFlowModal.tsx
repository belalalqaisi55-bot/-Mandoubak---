import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Pill, CheckCircle2, ArrowLeft, ArrowRight, ShieldCheck, TrendingUp, Stethoscope, Award, Zap } from "lucide-react";
import { OnboardingFlowType, setManualOnboardingOverride } from "../services/remoteConfigService";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  flowType: OnboardingFlowType;
  onVariantChange?: (newVariant: OnboardingFlowType) => void;
}

export const OnboardingFlowModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  flowType,
  onVariantChange,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  // VARIANT A: New Design (Modern Glassmorphism & High-Engagement Card Flow)
  const renderNewDesign = () => {
    const slides = [
      {
        badge: "تجربة الذكاء الصيدلاني 2026",
        title: "مرحباً بك في منصة مندوبك الطبي المطورة",
        desc: "أقوى نظام متكامل لإدارة المبيعات الطبية، طلبيات الأدوية، وحساب الجرعات بدقة وبدون إنترنت.",
        icon: <Sparkles className="w-12 h-12 text-emerald-500" />,
        highlight: "تحكم فوري ودقة فائقة",
        color: "from-emerald-500/10 to-teal-500/10 border-emerald-500/30"
      },
      {
        badge: "العمل دون اتصال (Offline-First)",
        title: "طلبيات وزيارات طبية مستمرة في كل مكان",
        desc: "سجّل طلبيات الصيدليات وجولاتك الميدانية حتى في المناطق المنقطعة عن الشبكة مع مزامنة سحابية تلقائية.",
        icon: <Zap className="w-12 h-12 text-blue-500" />,
        highlight: "مزامنة سحابية فائقة السرعة مع Firebase",
        color: "from-blue-500/10 to-cyan-500/10 border-blue-500/30"
      },
      {
        badge: "الرعاية والتوثيق المعتمد",
        title: "معتمد من د. بلال القيسي",
        desc: "كتالوج أدوية متكامل، حاسبة جرعات الأطفال، وكشف تداخلات الأدوية لحماية وسلامة المرضى.",
        icon: <ShieldCheck className="w-12 h-12 text-indigo-500" />,
        highlight: "ميزات الأمان والتشفير البيومتري",
        color: "from-indigo-500/10 to-purple-500/10 border-indigo-500/30"
      }
    ];

    const isLast = currentStep === slides.length - 1;

    return (
      <div className="flex flex-col h-full justify-between p-6 sm:p-8" dir="rtl">
        {/* Top Header Tag with A/B indicator */}
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <Sparkles className="w-3.5 h-3.5" />
            التصميم الجديد (Variant A - Remote Config)
          </span>
          <div className="flex gap-1.5">
            {slides.map((_, idx) => (
              <div
                key={idx}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentStep ? "w-7 bg-emerald-600" : "w-2 bg-slate-200"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content Slide with Motion */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="my-auto py-6"
          >
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br ${slides[currentStep].color} border shadow-inner`}>
              {slides[currentStep].icon}
            </div>

            <div className="inline-block px-3 py-1 mb-2 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg">
              {slides[currentStep].badge}
            </div>

            <h2 className="text-2xl font-bold text-slate-800 mb-3 leading-snug">
              {slides[currentStep].title}
            </h2>

            <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-4">
              {slides[currentStep].desc}
            </p>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{slides[currentStep].highlight}</span>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
          {currentStep > 0 ? (
            <button
              onClick={() => setCurrentStep(currentStep - 1)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors flex items-center gap-1.5"
            >
              <ArrowRight className="w-4 h-4" />
              السابق
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-slate-500 text-sm hover:text-slate-700 transition-colors"
            >
              تخطي
            </button>
          )}

          <button
            onClick={() => {
              if (isLast) {
                onClose();
              } else {
                setCurrentStep(currentStep + 1);
              }
            }}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-bold shadow-md shadow-emerald-500/20 hover:from-emerald-700 hover:to-teal-700 transition-all flex items-center gap-2"
          >
            <span>{isLast ? "ابدأ الاستخدام الآن" : "التالي"}</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  // BASELINE: Standard Design (Classic Onboarding Layout)
  const renderStandardDesign = () => {
    return (
      <div className="flex flex-col h-full justify-between p-6 sm:p-8" dir="rtl">
        <div className="flex items-center justify-between border-b pb-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            التصميم الكلاسيكي الافتراضي (Baseline)
          </span>
          <span className="text-xs text-slate-500">الإصدار 1.0</span>
        </div>

        <div className="my-auto py-6 text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-5 border border-blue-200 shadow-sm">
            <Pill className="w-10 h-10" />
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            مندوبك الطبي
          </h2>
          <p className="text-sm text-slate-500 font-medium mb-6">
            د. بلال القيسي - المساعد الذكي لمبيعات وطلبيات الأدوية
          </p>

          <div className="grid grid-cols-1 gap-3 max-w-sm mx-auto text-right">
            <div className="p-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span>إدارة وتسجيل طلبيات الأدوية بسهولة</span>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span>تقارير المخزون والزيارات الميدانية للصيدليات</span>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span>طباعة الفواتير وحساب الجرعات الدوائية</span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm"
          >
            الدخول إلى التطبيق
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md min-h-[480px] bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col">
        {flowType === "new_design" ? renderNewDesign() : renderStandardDesign()}

        {/* Quick Testing Switcher Toolbar at the bottom for verification */}
        <div className="bg-slate-100 px-4 py-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600" dir="rtl">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Remote Config Test:</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setManualOnboardingOverride("standard");
                onVariantChange?.("standard");
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                flowType === "standard" ? "bg-white text-blue-700 shadow-sm border font-bold" : "hover:bg-slate-200"
              }`}
            >
              Standard
            </button>
            <button
              onClick={() => {
                setManualOnboardingOverride("new_design");
                onVariantChange?.("new_design");
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                flowType === "new_design" ? "bg-emerald-600 text-white font-bold" : "hover:bg-slate-200"
              }`}
            >
              New Design
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
