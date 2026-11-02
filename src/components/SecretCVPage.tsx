import React from 'react';
import { ExternalLink, Rocket, Phone, MessageSquare, Download, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const SecretCVPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const cvImagePath = "/assets/aistudio/IMG-20261031-WA5791_7e098974.jpg";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-teal-950 text-slate-100 p-3 sm:p-6 md:p-10 font-sans" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Top Header Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 rounded-xl bg-white/10 hover:bg-white/20">
              <ArrowRight className="h-5 w-5" />
            </button>
            <div className="h-12 w-12 rounded-xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300 font-bold text-xl shadow-inner">
              Rx
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-white">د. بلال يحيى أحمد القيسي</h1>
                <span className="bg-teal-500/20 text-teal-300 text-3xs font-bold px-2 py-0.5 rounded-full border border-teal-500/30">
                  دكتور صيدلي معتمد
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                السيرة الذاتية المهنية وملف الخبرات الصيدلانية والتسويق الدوائي
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <a
              href="https://wa.me/967776600049"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>واتساب 776600049</span>
            </a>
            <a
              href={cvImagePath}
              download="CV_Dr_Belal_Alqaisi.jpg"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-600 hover:to-emerald-600 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl border border-white/15 transition-all shadow-md active:scale-95"
            >
              <Download className="h-3.5 w-3.5 text-white" />
              <span>تحميل السيرة</span>
            </a>
          </div>
        </div>

        {/* The CV Document Visual Display */}
        <div className="bg-white rounded-3xl shadow-2xl p-2 sm:p-4 border border-slate-200 overflow-hidden">
          <div className="relative group">
            <iframe 
              src="/assets/aistudio/_______________-__._____________73012dc9.pdf" 
              className="w-full h-[800px] rounded-2xl shadow-md border border-slate-100"
              title="السيرة الذاتية - د. بلال يحيى أحمد ثابت القيسي"
            />
          </div>
        </div>

        {/* Special Application Showcase Card */}
        <div className="relative overflow-hidden bg-gradient-to-r from-teal-900 via-slate-900 to-emerald-950 rounded-3xl p-6 sm:p-8 shadow-2xl border-2 border-teal-500/40 text-center space-y-5">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="inline-flex items-center gap-2 bg-teal-500/20 text-teal-300 px-4 py-1.5 rounded-full text-xs font-bold border border-teal-400/30">
            <Rocket className="h-4 w-4 text-amber-400 animate-pulse" />
            <span>من ابتكار وتطوير د. بلال القيسي</span>
          </div>

          <div className="space-y-2 max-w-2xl mx-auto">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              نظام "مندوبك الطبي" الذكي المتكامل 💊📱
            </h2>
            <p className="text-xs sm:text-sm text-teal-100/90 leading-relaxed font-medium">
              أعتز بكوني مطور تطبيق <span className="font-black text-amber-300">"مندوبك الطبي"</span>، وهو منصة برمجية صيدلانية وطبية متكاملة تهدف إلى رقمنة وأتمتة مبيعات الأدوية، إدارة طلبيات الصيدليات والعيادات، متابعة الزيارات الميدانية بالـ GPS، وحساب الجرعات وتفاعلات الأدوية مع دعم العمل أوفلاين والمزامنة السحابية.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-2xl mx-auto pt-2 text-3xs font-bold text-teal-200">
            <div className="bg-white/5 rounded-xl p-2.5 border border-white/10 flex items-center justify-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-teal-400 shrink-0" />
              <span>إدارة طلبيات ذكية</span>
            </div>
            <div className="bg-white/5 rounded-xl p-2.5 border border-white/10 flex items-center justify-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-teal-400 shrink-0" />
              <span>كتالوج دوائي متكامل</span>
            </div>
            <div className="bg-white/5 rounded-xl p-2.5 border border-white/10 flex items-center justify-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-teal-400 shrink-0" />
              <span>حاسبة جرعات الأطفال</span>
            </div>
            <div className="bg-white/5 rounded-xl p-2.5 border border-white/10 flex items-center justify-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-teal-400 shrink-0" />
              <span>مزامنة سحابية وبلوتوث</span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a 
              href="/" 
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 px-8 py-3.5 rounded-2xl font-black text-sm transition-all shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer"
            >
              <span>دخول واستكشاف تطبيق مندوبك الطبي</span>
              <ExternalLink className="h-4 w-4" />
            </a>

            <a
              href="tel:+967776600049"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3.5 rounded-2xl font-bold text-sm border border-white/15 transition-all shadow-md active:scale-95"
            >
              <Phone className="h-4 w-4 text-teal-300" />
              <span>اتصال هاتفي مباشر</span>
            </a>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-4xs text-slate-500 pt-2 pb-6">
          <p>جميع الحقوق محفوظة © د. بلال يحيى أحمد القيسي | تطبيق مندوبك الطبي</p>
          <div className="flex items-center justify-center gap-1 mt-1 text-slate-600">
            <ShieldCheck className="h-3 w-3 text-teal-500" />
            <span>صفحة خاصة مشفرة عبر باركود QR الذكي</span>
          </div>
        </div>

      </div>
    </div>
  );
};
