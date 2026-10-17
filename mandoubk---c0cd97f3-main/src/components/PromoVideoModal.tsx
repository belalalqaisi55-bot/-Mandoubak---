import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
  Search,
  ShoppingCart,
  Send,
  Bell,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Layers,
  Check,
  Gamepad2,
  Trophy,
  Brain,
  Bot,
  Gift,
  HelpCircle,
  Award,
  Zap,
  Flame,
  ShieldCheck,
  BookOpen,
  HeartHandshake,
  Stethoscope,
  ChevronLeft,
  FileSpreadsheet,
  MessageCircle,
  Pill,
  Radio,
} from "lucide-react";
import { Product } from "../types";
import { DEFAULT_PRODUCTS } from "../data/defaultProducts";
const gamesSceneImg = "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=600";
const promoBanner = "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800";
const storyAd = "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&q=80&w=600";

interface PromoVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  repName?: string;
  repPhone?: string;
  repAvatar?: string;
  products?: Product[];
  onOpenGames?: () => void;
  onOpenSheet?: () => void;
}

// Sound effects generator using Web Audio API (Guaranteed audio feedback on all browsers)
const playChimeEffect = (type: "start" | "step" | "ding" = "step") => {
  try {
    if (typeof window === "undefined") return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "start") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } else if (type === "step") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    } else {
      osc.type = "sine";
      osc.frequency.setValueAtTime(783.99, ctx.currentTime); // G5
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    }
  } catch (e) {
    // Silent catch for audio context limitations
  }
};

export const PromoVideoModal: React.FC<PromoVideoModalProps> = ({
  isOpen,
  onClose,
  repName = "د/ بلال القيسي",
  repPhone = "+967776600049",
  repAvatar,
  products = DEFAULT_PRODUCTS,
  onOpenGames,
  onOpenSheet,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [hasUserStartedAudio, setHasUserStartedAudio] = useState(false);
  const [speechActive, setSpeechActive] = useState(false);

  // Audio state refs to prevent overlapping speech or timer desync
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const keepAliveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load and cache browser voices safely
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const updateVoices = () => {
      try {
        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          setAvailableVoices(voices);
        }
      } catch (e) {
        console.error("Error loading voices:", e);
      }
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Pick representative products from actual app data
  const sampleProduct1 = products.find((p) => p.name.includes("لوماك") || p.id === "p8") || {
    id: "p8",
    name: "لوماك شرائط (Lomac Strips)",
    description: "الاسم العلمي: Omeprazole 20 Tab",
    category: "أدوية المعدة والحموضة",
    price: "2400 ريال",
    bonus: "100%",
    unit: "شريط",
  };

  const sampleProduct2 = products.find((p) => p.name.includes("نوفاتاكس") || p.id === "p7") || {
    id: "p7",
    name: "نوفاتاكس 1 جم (Novatax 1g)",
    description: "الاسم العلمي: Cefotaxime 1g",
    category: "حقن مضاد حيوي",
    price: "850 ريال",
    bonus: "40%",
    unit: "حقنة",
  };

  const steps = [
    {
      id: "step-welcome-intro",
      stepIdx: 0,
      duration: 11000,
      stepNumber: "رسالة الترحيب والافتتاحية",
      tag: "أهلاً وسهلاً بكم 🌟",
      title: "مرحباً بكم في منصة مندوبك الطبي الذكية 🩺✨",
      description: `يسرّ الممثل الطبي المعتمد ${repName} الترحيب بكم في منصتكم الصيدلانية الأولى؛ تجربة رقمية متكاملة لطلب الأدوية المعتمدة، جرد المخزون، واحتساب البونص التلقائي.`,
      voiceText: `أَهْلاً وَسَهْلاً بِكُمْ فِي مَنَصَّتِكُمْ الصَّيْدَلانِيَّةِ الأُولَى، مَعَكُمْ الدُّكْتُور بِلَال القَيْسِي. نُقَدِّمُ لَكُمْ تَجْرِبَةً رَقْمِيَّةً مُتَكَامِلَةً تَبْدَأُ مِنْ سَلَّةِ الأَلْعَابِ الطِّبِّيَّة، وَجَدْوَلِ طَلَبِ الأَدْوِيَةِ مَعَ احْتِسَابِ البُونُصِ المَجَّانِيِّ وَالسِّعْرِ الصَّافِي فَوْرِيّاً.`,
      icon: <HeartHandshake className="h-6 w-6 text-amber-400" />,
      bgImage: promoBanner,
      badge: "منصة التوزيع والخدمات الصيدلانية المعتمدة 🌟",
      visual: (
        <div className="space-y-3 bg-slate-900/95 rounded-2xl p-4 border border-teal-500/40 text-right shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-slate-700/80 pb-2.5">
            <div className="flex items-center gap-2">
              {repAvatar ? (
                <img
                  src={repAvatar}
                  alt={repName}
                  className="h-9 w-9 rounded-xl object-cover border border-teal-400 shadow-md ring-1 ring-teal-400/40"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-white flex items-center justify-center font-black text-sm shadow-md">
                  👨‍⚕️
                </div>
              )}
              <div className="text-right">
                <span className="block text-xs font-black text-white">{repName}</span>
                <span className="block text-3xs text-teal-300 font-mono">{repPhone}</span>
              </div>
            </div>
            <span className="rounded-full bg-teal-500/20 px-3 py-1 text-3xs font-black text-teal-300 border border-teal-500/40">
              تنسيق وتوريد معتمد 🛡️
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-slate-800/90 p-2.5 border border-amber-500/30 space-y-1">
              <Gamepad2 className="h-4 w-4 text-amber-400 mx-auto" />
              <p className="text-3xs font-black text-amber-200">سلة ألعاب طبية</p>
              <p className="text-3xs text-slate-400">مسابقات وبوانص</p>
            </div>
            <div className="rounded-xl bg-slate-800/90 p-2.5 border border-teal-500/30 space-y-1">
              <FileSpreadsheet className="h-4 w-4 text-teal-400 mx-auto" />
              <p className="text-3xs font-black text-teal-200">شيت الجرد والطلب</p>
              <p className="text-3xs text-slate-400">بونص حتى 100%</p>
            </div>
            <div className="rounded-xl bg-slate-800/90 p-2.5 border border-indigo-500/30 space-y-1">
              <MessageCircle className="h-4 w-4 text-indigo-400 mx-auto" />
              <p className="text-3xs font-black text-indigo-200">تأكيد الواتساب</p>
              <p className="text-3xs text-slate-400">إرسال فوري مباشر</p>
            </div>
          </div>

          <div className="rounded-xl bg-gradient-to-r from-teal-500/20 via-emerald-500/20 to-teal-500/20 border border-teal-500/40 p-2 text-center text-xs font-black text-teal-200 flex items-center justify-center gap-2">
            <Sparkles className="h-4 w-4 text-teal-300 animate-pulse" />
            <span>نعمل معكم خطوة بخطوة لتلبية كافة احتياجات صيدليتكم بدقة وسرعة!</span>
          </div>
        </div>
      ),
      bulletPoints: [
        "إشراف مباشر ومتابعة مستمرة من د/ بلال القيسي",
        "سلة ألعاب ومسابقات سريرية فريدة ومجزية",
        "تسهيل طلب الأدوية واحتساب البونص التلقائي",
      ],
    },
    {
      id: "step-games-exclusive",
      stepIdx: 1,
      duration: 11000,
      stepNumber: "الخطوة الأولى: الميزة الحصرية",
      tag: "سلة الألعاب والمسابقات الطبية",
      title: "كيفية لعب الألعاب والمسابقات الطبية 🎮🏆",
      description: "طريقة اللعب: 1) اختر مستواك (مبتدئ، متوسط، متقدم، محترف)، 2) اختر نمط اللعبة (من سيربح المليون، تحدي التداخلات، أو لغز الدواء)، 3) استعن بوسائل المساعدة واجمع النقاط!",
      voiceText: "الخطوة الأولى: كَيْفِيَّةُ لَعِبِ الأَلْعَابِ الطِّبِّيَّة. أَوَّلاً: حَدِّدْ مُسْتَوَى الصُّعُوبَةِ المُنَاسِبَ لَك، ثَانِياً: اخْتَرِ النَّمَطَ كَمُسَابَقَةِ المِلْيُونِ أَوْ تَحَدِّي التَّدَاخُلاتِ السَّرِيعَة، ثَالِثاً: اسْتَخْدِمْ وَسَائِلَ المُسَاعَدَةِ كَحَذْفِ إِجَابَتَيْنِ وَتَصْوِيتِ الصَّيَادِلَةِ لِتَصْعَدَ لِقِمَّةِ لَوْحَةِ الشَّرَف.",
      icon: <Gamepad2 className="h-6 w-6 text-amber-400" />,
      bgImage: gamesSceneImg,
      badge: "دليل قواعد اللعب ووسائل المساعدة 🎯",
      visual: (
        <div className="space-y-3 bg-slate-900/95 rounded-2xl p-4 border border-amber-500/40 text-right shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-slate-700/80 pb-2">
            <div className="flex items-center gap-1.5 text-xs text-amber-300 font-black">
              <BookOpen className="h-4 w-4 text-amber-400" />
              <span>طريقة وقواعد اللعب (3 أنماط تفاعلية)</span>
            </div>
            <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-3xs font-black text-amber-300 border border-amber-500/40">
              4 مستويات صعوبة 🏆
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-slate-800/90 p-2 border border-amber-500/30 text-right space-y-1">
              <div className="flex items-center justify-between">
                <Trophy className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-3xs font-black text-amber-300">1</span>
              </div>
              <p className="text-3xs font-black text-white leading-tight">المليون الصيدلاني</p>
              <p className="text-3xs text-slate-400">15 سؤالاً + 3 مساعدات</p>
            </div>

            <div className="rounded-xl bg-slate-800/90 p-2 border border-rose-500/30 text-right space-y-1">
              <div className="flex items-center justify-between">
                <Zap className="h-3.5 w-3.5 text-rose-400" />
                <span className="text-3xs font-black text-rose-300">2</span>
              </div>
              <p className="text-3xs font-black text-white leading-tight">تحدي التداخلات</p>
              <p className="text-3xs text-slate-400">آمن أم خطير وممنوع</p>
            </div>

            <div className="rounded-xl bg-slate-800/90 p-2 border border-indigo-500/30 text-right space-y-1">
              <div className="flex items-center justify-between">
                <Brain className="h-3.5 w-3.5 text-indigo-400" />
                <span className="text-3xs font-black text-indigo-300">3</span>
              </div>
              <p className="text-3xs font-black text-white leading-tight">لغز الدواء الخفي</p>
              <p className="text-3xs text-slate-400">تلميحات سريرية متتالية</p>
            </div>
          </div>

          <div className="rounded-xl bg-slate-800/80 border border-slate-700/80 p-2.5 flex items-center justify-between text-3xs font-bold text-slate-300">
            <span className="text-amber-300">💡 وسائل المساعدة:</span>
            <div className="flex items-center gap-1.5">
              <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-lg border border-amber-500/30">50:50 حذف خيارين</span>
              <span className="bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-lg border border-teal-500/30">نصيحة د/ بلال</span>
              <span className="bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-lg border border-sky-500/30">تصويت الصيادلة</span>
            </div>
          </div>
        </div>
      ),
      bulletPoints: [
        "1. اختيار مستوى الصعوبة: مبتدئ 🌱، متوسط ⚡، متقدم 🔬، أو محترف 🔥",
        "2. اختيار النمط: بنك أسئلة المليون، سرعة التداخلات، أو حل ألغاز الأدوية",
        "3. وسائل مساعدة مجانية: حذف إجابتين (50:50)، تلميح د/ بلال، ورأي الجمهور",
      ],
    },
    {
      id: "step-catalog-search",
      stepIdx: 2,
      duration: 10000,
      stepNumber: "الخطوة الثانية",
      tag: "كتالوج الأصناف والأسعار والبونص",
      title: "تصفح قائمة الأدوية ونسب البونص الحقيقية 💊📋",
      description: `استعرض قائمة أدويتك المعتمدة (لوماك، نوفاتاكس، سيبلوكس، بارفيز، ألريد، ديراد إم) واطّلع على السعر الرسمي ونسبة البونص والسعر الصافي المخفض.`,
      voiceText: "الخطوة الثانية: تَصَفَّحْ كَتَالُوجَ الأَدْوِيَةِ المُعْتَمَدَة، مِثْلَ لُومَاك بِبُونُصِ مِائَةٍ بِالمِائَة، وَنُوفَاتَاكْس، وَسِيبْلُوكْس، حَيْثُ يَظْهَرُ لَكَ السِّعْرُ الرَّسْمِيُّ وَالسِّعْرُ الصَّافِي بَعْدَ البُونُصِ بِدِقَّة.",
      icon: <Search className="h-6 w-6 text-teal-400" />,
      bgImage: promoBanner,
      badge: "أصناف دوائية معتمدة بأسعار وبوانص واضحة 💊",
      visual: (
        <div className="space-y-2 bg-slate-900/95 rounded-2xl p-3.5 border border-teal-500/40 text-right shadow-2xl backdrop-blur-md">
          {/* Real App Product 1: Lomac */}
          <div className="rounded-xl bg-slate-800/90 p-2.5 border border-amber-500/40 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="rounded-lg bg-emerald-500/20 px-2 py-0.5 text-3xs font-black text-emerald-300 border border-emerald-500/40 animate-pulse">
                🎁 بونص استثنائي: {sampleProduct1.bonus} (1+1 مجاناً)
              </span>
              <span className="text-xs font-black text-white">{sampleProduct1.name}</span>
            </div>
            <div className="flex items-center justify-between text-3xs text-slate-300 pt-1 border-t border-slate-700/60">
              <span className="font-bold text-amber-300 font-mono text-2xs">الصافي: 1,200 ريال / شريط</span>
              <span className="text-slate-400 line-through">الرسمي: {sampleProduct1.price}</span>
            </div>
          </div>

          {/* Real App Product 2: Novatax */}
          <div className="rounded-xl bg-slate-800/90 p-2.5 border border-teal-500/30 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="rounded-lg bg-teal-500/20 px-2 py-0.5 text-3xs font-black text-teal-300 border border-teal-500/40">
                🎁 بونص: {sampleProduct2.bonus} (10+4 مجاناً)
              </span>
              <span className="text-xs font-black text-white">{sampleProduct2.name}</span>
            </div>
            <div className="flex items-center justify-between text-3xs text-slate-300 pt-1 border-t border-slate-700/60">
              <span className="font-bold text-teal-300 font-mono text-2xs">الصافي: 607 ريال / حقنة</span>
              <span className="text-slate-400">الرسمي: {sampleProduct2.price}</span>
            </div>
          </div>
        </div>
      ),
      bulletPoints: [
        "عرض أصنافك المعتمدة (لوماك، نوفاتاكس، سيبلوكس، بارفيز، ألريد)",
        "احتساب آلي للسعر الصافي بعد خصم نسبة البونص",
        "تحديث دائم لأسعار ونسب بوانص المستودع الرسمية",
      ],
    },
    {
      id: "step-cart-bonus",
      stepIdx: 3,
      duration: 10000,
      stepNumber: "الخطوة الثالثة",
      tag: "شيت الجرد والطلبيات الذكي",
      title: "إدخال الرصيد المتبقي وتحديد الطلبية 📊🛒",
      description: "سجّل الرصيد المتوفر في صيدليتك لتتبع النواقص، وحدد كمية الطلب؛ وسيقوم النظام آلياً بحساب كميات البونص والتوفير المالي الإجمالي.",
      voiceText: "الخطوة الثالثة: سَجِّلِ الرَّصِيدَ المَتَبَقِّي فِي صَيْدَلِيَّتِك، ثُمَّ حَدِّدِ الكَمِّيَّةَ المَطْلُوبَة، وَسَيَقُومُ النِّظَامُ بِاحْتِسَابِ حَبَّاتِ البُونُصِ المَجَّانِيَّةِ وَإِجْمَالِي الفَاتُورَةِ تِلْقَائِيّاً.",
      icon: <FileSpreadsheet className="h-6 w-6 text-emerald-400" />,
      bgImage: storyAd,
      badge: "شيت إكسل ذكي يجمع بين الجرد والطلب واحتساب البونص 💰",
      visual: (
        <div className="space-y-2.5 bg-slate-900/95 rounded-2xl p-3.5 border border-emerald-500/40 text-right shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-emerald-300 font-black border-b border-slate-700/80 pb-2">
            <span>شيت الجرد والطلبية المباشر</span>
            <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
          </div>

          <div className="space-y-2">
            {/* Row representation: Lomac */}
            <div className="rounded-xl bg-slate-800 p-2 border border-slate-700 flex items-center justify-between text-3xs">
              <div className="flex items-center gap-2">
                <span className="bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded-lg font-bold font-mono">
                  طلب: 10 + 10 بونص 🎁
                </span>
              </div>
              <div className="text-right">
                <span className="font-black text-white block">لوماك شرائط (Lomac 20)</span>
                <span className="text-slate-400">الرصيد المتبقي: 2 شريط (منخفض)</span>
              </div>
            </div>

            {/* Row representation: Novatax */}
            <div className="rounded-xl bg-slate-800 p-2 border border-slate-700 flex items-center justify-between text-3xs">
              <div className="flex items-center gap-2">
                <span className="bg-teal-500/20 text-teal-300 px-2 py-1 rounded-lg font-bold font-mono">
                  طلب: 20 + 8 بونص 🎁
                </span>
              </div>
              <div className="text-right">
                <span className="font-black text-white block">نوفاتاكس 1 جم (Novatax 1g)</span>
                <span className="text-slate-400">الرصيد المتبقي: 5 حقن</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-emerald-950/80 border border-emerald-500/50 p-2 text-center text-xs font-black text-emerald-300 flex items-center justify-center gap-2">
            <Gift className="h-4 w-4 text-emerald-400 animate-bounce" />
            <span>إجمالي البونص المجاني المكتسب: 18 قطعة مجاناً! 🎁</span>
          </div>
        </div>
      ),
      bulletPoints: [
        "حقول ذكية لتسجيل رصيد الصيدلية لتفادي نفاذ المخزون",
        "حساب فوري لكميات البونص المكتسبة مع كل كمية",
        "تنسيق توريد مباشر وسداد نقدي أو آجل بحسب الاتفاق",
      ],
    },
    {
      id: "step-order-delivery",
      stepIdx: 4,
      duration: 10000,
      stepNumber: "الخطوة الرابعة",
      tag: "إرسال وتأكيد الطلبية عبر الواتساب",
      title: "تأكيد الطلب وتصدير الفاتورة لمندوبك د/ بلال 📲⚡",
      description: `اضغط على زر «إرسال الطلبية» لتوليد فاتورة تفصيلية ومشاركتها مباشرة عبر الواتساب مع د/ بلال القيسي مع حفظ نسخة في سجل طلباتك.`,
      voiceText: `الخطوة الرابعة: اضْغَطْ عَلَى إِرْسَالِ الطَّلَب، لِيَتِمَّ تَوْلِيدُ فَاتُورَةٍ صَيْدَلانِيَّةٍ مُفَصَّلَة، وَإِرْسَالُهَا مُبَاشَرَةً إِلَى الوَاتْسَابِ الخَاصِّ بِالدُّكْتُور بِلَال القَيْسِي مَعَ تَأْكِيدِ التَّوْرِيد.`,
      icon: <Send className="h-6 w-6 text-indigo-400" />,
      bgImage: promoBanner,
      badge: "تأكيد مباشر عبر الواتساب مع د/ بلال القيسي (+967776600049) 📲",
      visual: (
        <div className="space-y-3 bg-slate-900/95 rounded-2xl p-4 border border-indigo-500/40 text-right shadow-2xl backdrop-blur-md">
          <div className="rounded-xl bg-gradient-to-r from-teal-600 via-emerald-600 to-indigo-600 p-2.5 text-center font-black text-xs text-white shadow-lg flex items-center justify-center gap-2">
            <Send className="h-4 w-4" />
            <span>تم تجهيز الطلبية بنجاح لصيدليتكم</span>
          </div>

          <div className="space-y-2 pt-1 text-2xs">
            <div className="flex items-center justify-between text-slate-300 bg-slate-800/80 p-2 rounded-xl border border-slate-700">
              <span className="font-mono text-teal-300 font-bold">{repPhone}</span>
              <span className="font-semibold text-slate-300">المستلم: {repName}</span>
            </div>
            <div className="flex items-center justify-between text-slate-300 bg-slate-800/80 p-2 rounded-xl border border-slate-700">
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 font-bold text-emerald-300 border border-emerald-500/40">
                مباشر وفوري 💬
              </span>
              <span className="font-semibold text-slate-300">رسالة الواتساب المنسقة</span>
            </div>
          </div>
        </div>
      ),
      bulletPoints: [
        "رسالة واتساب احترافية جاهزة بضغطة زر واحدة",
        "تتضمن أسماء الأصناف، الكميات، البونص، والمبالغ",
        "تنسيق موعد التوصيل والتسليم مباشرة مع المندوب",
      ],
    },
    {
      id: "step-support-rep",
      stepIdx: 5,
      duration: 10000,
      stepNumber: "الخطوة الخامسة",
      tag: "خدمة العملاء والنواقص والذكاء الاصطناعي",
      title: "طلب النواقص، البحث العلمي، والمتابعة المستمرة 📞🔬",
      description: `أرسل بلاغاً عن أي صنف ناقص لتوفيره، واستفد من أداة الذكاء الاصطناعي للبحث عن التداخلات الدوائية، مع إمكانية الاتصال بـ ${repName} في أي وقت.`,
      voiceText: "الخطوة الخامسة: يُمْكِنُكَ الإِبْلاغُ عَنْ أَيِّ صِنْفٍ نَاقِصٍ لِتَوْفِيرِهِ فَوْراً، وَاسْتِخْدَامُ الذَّكَاءِ الاصْطِنَاعِيِّ لِلْبَحْثِ العِلْمِيِّ وَالتَّدَاخُلاتِ الدَّوَائِيَّة، مَعَ التَّوَاصُلِ المُبَاشِرِ مَعَنَا دَائِماً.",
      icon: <Bell className="h-6 w-6 text-cyan-400" />,
      bgImage: storyAd,
      badge: "دعم صيدلاني وبحث علمي متكامل 24/7 🩺",
      visual: (
        <div className="space-y-2.5 bg-slate-900/95 rounded-2xl p-3.5 border border-cyan-500/40 text-right shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-cyan-300 font-black border-b border-slate-700/80 pb-2">
            <span>البحث العلمي وطلب النواقص</span>
            <Brain className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="grid grid-cols-2 gap-2 text-3xs">
            <div className="bg-slate-800 p-2 rounded-xl border border-slate-700 space-y-1">
              <span className="text-cyan-300 font-black block">🔬 البحث العلمي</span>
              <span className="text-slate-400 block">تحليل الجرعات والتداخلات الدوائية</span>
            </div>
            <div className="bg-slate-800 p-2 rounded-xl border border-slate-700 space-y-1">
              <span className="text-amber-300 font-black block">📦 طلب صنف ناقص</span>
              <span className="text-slate-400 block">توفير سريع لأي صنف غير متوفر</span>
            </div>
          </div>
          <div className="rounded-xl bg-cyan-950/80 border border-cyan-500/40 p-2 text-center text-xs font-black text-cyan-200">
            👨‍⚕️ د/ بلال القيسي في خدمتكم دائماً: {repPhone}
          </div>
        </div>
      ),
      bulletPoints: [
        "طلب توفير أي دواء غير متوفر لتأمينه بأسرع وقت",
        "أداة الذكاء الاصطناعي للتحليل العلمي والسريري",
        "اتصال وواتساب مباشر مع المندوب د/ بلال القيسي",
      ],
    },
  ];

  // Primary speak function that cleanly speaks Arabic text and handles browser state
  const speakStepAudio = useCallback(
    (index: number) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window) || isMuted) {
        return;
      }

      // Play soft chime sound effect on step trigger
      playChimeEffect(index === 0 ? "start" : "step");

      try {
        // Resume engine if browser paused or suspended audio context
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.cancel();
      } catch (e) {
        console.warn("Cancel speech error", e);
      }

      const targetStep = steps[index] || steps[0];
      const utterance = new SpeechSynthesisUtterance(targetStep.voiceText);
      utterance.lang = "ar-SA";
      utterance.pitch = 0.88;
      utterance.rate = 0.92;

      // Best Arabic voice matching
      if (availableVoices.length > 0) {
        const arabicVoices = availableVoices.filter((v) =>
          v.lang.toLowerCase().startsWith("ar")
        );

        const bestVoice =
          arabicVoices.find((v) => {
            const name = v.name.toLowerCase();
            return (
              name.includes("male") ||
              name.includes("maged") ||
              name.includes("tariq") ||
              name.includes("tarik") ||
              name.includes("naayf") ||
              name.includes("salim") ||
              name.includes("bilal") ||
              name.includes("hoda")
            ) && !name.includes("female") && !name.includes("zeina") && !name.includes("fatima");
          }) ||
          arabicVoices.find((v) => {
            const name = v.name.toLowerCase();
            return (
              !name.includes("female") &&
              !name.includes("zeina") &&
              !name.includes("fatima") &&
              !name.includes("zariyah") &&
              !name.includes("leila")
            );
          }) ||
          arabicVoices[0];

        if (bestVoice) {
          utterance.voice = bestVoice;
        }
      }

      utterance.onstart = () => {
        setSpeechActive(true);
      };

      utterance.onend = () => {
        setSpeechActive(false);
        if (keepAliveIntervalRef.current) {
          clearInterval(keepAliveIntervalRef.current);
          keepAliveIntervalRef.current = null;
        }
      };

      utterance.onerror = () => {
        setSpeechActive(false);
        if (keepAliveIntervalRef.current) {
          clearInterval(keepAliveIntervalRef.current);
          keepAliveIntervalRef.current = null;
        }
      };

      utteranceRef.current = utterance;

      // Chrome speech timeout keep-alive guard
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
      }
      keepAliveIntervalRef.current = setInterval(() => {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        } else {
          if (keepAliveIntervalRef.current) {
            clearInterval(keepAliveIntervalRef.current);
            keepAliveIntervalRef.current = null;
          }
        }
      }, 3500);

      // Microtask delay to ensure cancel() was processed by browser
      setTimeout(() => {
        try {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
          window.speechSynthesis.speak(utterance);
        } catch (err) {
          console.warn("Speak execution error:", err);
        }
      }, 40);
    },
    [availableVoices, isMuted, steps]
  );

  // User interaction initiator to unlock audio context & speech engine immediately
  const handleUserTriggerAudio = () => {
    setHasUserStartedAudio(true);
    setIsMuted(false);
    setIsPlaying(true);
    if ("speechSynthesis" in window) {
      window.speechSynthesis.resume();
    }
    speakStepAudio(currentStep);
  };

  // Trigger speech on step change or play/pause (once user has interacted or when modal opens)
  useEffect(() => {
    if (!isOpen) {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
        keepAliveIntervalRef.current = null;
      }
      return;
    }

    if (isPlaying && !isMuted && hasUserStartedAudio) {
      speakStepAudio(currentStep);
    } else if (!isPlaying || isMuted) {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    }

    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
        keepAliveIntervalRef.current = null;
      }
    };
  }, [currentStep, isPlaying, isOpen, isMuted, hasUserStartedAudio, speakStepAudio]);

  // Smooth Progress Timer
  useEffect(() => {
    if (!isOpen || !isPlaying) return;

    const intervalTime = 50;
    const duration = steps[currentStep]?.duration || 10000;
    const stepIncrement = (intervalTime / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setCurrentStep((sc) => (sc + 1) % steps.length);
          return 0;
        }
        return prev + stepIncrement;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isOpen, isPlaying, currentStep, steps.length]);

  if (!isOpen) return null;

  const current = steps[currentStep] || steps[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-300"
      onClick={() => {
        // Unlock audio on any click within the modal backdrop if not already unlocked
        if (!hasUserStartedAudio) {
          setHasUserStartedAudio(true);
          if ("speechSynthesis" in window) {
            window.speechSynthesis.resume();
          }
          speakStepAudio(currentStep);
        }
      }}
    >
      <div
        className="relative w-full max-w-4xl overflow-hidden rounded-3xl bg-slate-900 border border-slate-700/60 shadow-2xl flex flex-col md:flex-row h-[92vh] max-h-[660px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={() => {
            if ("speechSynthesis" in window) window.speechSynthesis.cancel();
            onClose();
          }}
          className="absolute top-4 left-4 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/80 text-white/80 hover:text-white hover:bg-slate-800 backdrop-blur-sm border border-slate-700 transition cursor-pointer"
          title="إغلاق الدليل"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Video Tutorial Visual Stage (Left on desktop) */}
        <div className="relative flex-1 bg-slate-950 flex flex-col justify-between p-6 overflow-hidden">
          {/* Animated Background Art */}
          <motion.div
            key={`bg-step-${current.id}`}
            initial={{ scale: 1.05, opacity: 0.15 }}
            animate={{ scale: 1, opacity: 0.25 }}
            transition={{ duration: 1.2 }}
            className="absolute inset-0 bg-cover bg-center filter blur-xs"
            style={{ backgroundImage: `url(${current.bgImage})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/85 to-slate-950/40" />

          {/* Top Header Label & Voice Status Badge */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-3 w-3 rounded-full ${
                  speechActive
                    ? "bg-emerald-400 animate-ping"
                    : isMuted
                    ? "bg-rose-500"
                    : "bg-amber-400 animate-pulse"
                }`}
              />
              <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                <span>فيديو الشرح الصوتي المباشر</span>
                {speechActive && (
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full text-3xs font-mono">
                    صوت نشط 🎙️
                  </span>
                )}
              </span>
            </div>
            <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-3 py-1 text-xs font-black text-amber-200">
              {current.stepNumber}
            </span>
          </div>

          {/* Audio Tap to Play Banner if user hasn't clicked yet */}
          {!hasUserStartedAudio && (
            <motion.div
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="relative z-20 my-2"
            >
              <button
                onClick={handleUserTriggerAudio}
                className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-teal-500 to-emerald-500 text-slate-950 font-black text-xs shadow-xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-98 transition cursor-pointer animate-pulse"
              >
                <Volume2 className="h-4 w-4 text-slate-950" />
                <span>اضغط هنا لتفعيل الصوت الفوري بصوت د/ بلال القيسي 🔊</span>
              </button>
            </motion.div>
          )}

          {/* Center Visual Mockup Box */}
          <motion.div
            key={`content-step-${current.id}`}
            initial={{ y: 20, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative z-10 w-full max-w-lg mx-auto space-y-3.5 my-auto"
          >
            {/* Step Title & Subtitle */}
            <div className="text-right space-y-1">
              <div className="inline-flex items-center gap-2 rounded-lg bg-teal-500/10 px-2.5 py-1 text-2xs font-bold text-teal-300 border border-teal-500/20">
                {current.icon}
                <span>{current.tag}</span>
              </div>
              <h2 className="text-lg sm:text-2xl font-black text-white leading-snug">
                {current.title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                {current.description}
              </p>
            </div>

            {/* Interactive Live Visual Mock */}
            <div>{current.visual}</div>

            {/* Bullet Points */}
            <div className="space-y-1 pt-0.5 text-right">
              {current.bulletPoints.map((pt, i) => (
                <motion.div
                  key={`bullet-${current.id}-${i}`}
                  initial={{ x: 15, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.15 + i * 0.08 }}
                  className="flex items-center justify-end gap-2 text-xs text-slate-300 font-medium"
                >
                  <span>{pt}</span>
                  <CheckCircle2 className="h-3.5 w-3.5 text-teal-400 shrink-0" />
                </motion.div>
              ))}
            </div>

            {/* Badge Indicator */}
            <div className="pt-0.5 text-center">
              <span className="inline-block w-full py-1.5 px-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-teal-500/20 border border-amber-500/30 text-amber-200 text-xs font-black shadow-md">
                {current.badge}
              </span>
            </div>
          </motion.div>

          {/* Step Quick Navigation Bar (Bottom of Visual Stage) */}
          <div className="relative z-10 flex items-center justify-between pt-3 border-t border-slate-800/80">
            <button
              onClick={() => {
                const prevStep = currentStep > 0 ? currentStep - 1 : steps.length - 1;
                setCurrentStep(prevStep);
                setProgress(0);
                if (!hasUserStartedAudio) setHasUserStartedAudio(true);
                speakStepAudio(prevStep);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-300 transition cursor-pointer"
            >
              <ArrowRight className="h-3.5 w-3.5" />
              <span>السابق</span>
            </button>

            <span className="text-2xs font-bold text-slate-400">
              خطوة {currentStep + 1} من {steps.length}
            </span>

            <button
              onClick={() => {
                const nextStep = (currentStep + 1) % steps.length;
                setCurrentStep(nextStep);
                setProgress(0);
                if (!hasUserStartedAudio) setHasUserStartedAudio(true);
                speakStepAudio(nextStep);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-teal-600/30 hover:bg-teal-600/50 border border-teal-500/40 px-3 py-1.5 text-xs font-bold text-teal-200 transition cursor-pointer"
            >
              <span>التالي</span>
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Sidebar Controls & Playlist (Right on desktop) */}
        <div className="w-full md:w-80 bg-slate-900/95 p-5 flex flex-col justify-between border-t md:border-t-0 md:border-r border-slate-800 text-right text-white">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <span className="text-xs font-black text-slate-200">فهرس الخطوات والفيديو</span>
              <Layers className="h-4 w-4 text-amber-400" />
            </div>

            {/* Story Timeline Bars */}
            <div className="grid grid-cols-6 gap-1 pt-1">
              {steps.map((st, idx) => (
                <button
                  key={`timeline-bar-${st.id}-${idx}`}
                  onClick={() => {
                    setCurrentStep(idx);
                    setProgress(0);
                    if (!hasUserStartedAudio) setHasUserStartedAudio(true);
                    speakStepAudio(idx);
                  }}
                  className="h-2 rounded-full overflow-hidden bg-slate-800 relative cursor-pointer"
                  title={`انتقال إلى ${st.stepNumber}`}
                >
                  <div
                    className={`h-full bg-gradient-to-r from-amber-400 to-teal-400 transition-all ${
                      idx === currentStep
                        ? "duration-75"
                        : idx < currentStep
                        ? "w-full"
                        : "w-0"
                    }`}
                    style={{
                      width: idx === currentStep ? `${progress}%` : idx < currentStep ? "100%" : "0%",
                    }}
                  />
                </button>
              ))}
            </div>

            {/* Step Selector List */}
            <div className="space-y-1.5 pt-2 max-h-52 overflow-y-auto pr-1">
              {steps.map((st, idx) => (
                <button
                  key={`step-list-btn-${st.id}`}
                  onClick={() => {
                    setCurrentStep(idx);
                    setProgress(0);
                    if (!hasUserStartedAudio) setHasUserStartedAudio(true);
                    speakStepAudio(idx);
                  }}
                  className={`w-full text-right p-2 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                    currentStep === idx
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                      : "bg-slate-800/40 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  <span className="truncate">{st.tag}</span>
                  <span className="text-3xs font-mono opacity-60">0{idx + 1}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Controls & Actions */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            {/* Voice info indicator */}
            <div className="rounded-xl bg-slate-800/80 p-2 text-3xs text-slate-300 text-center font-medium border border-slate-700/60 flex items-center justify-center gap-1.5">
              <Sparkles className="h-3 w-3 text-amber-400" />
              <span>
                {speechActive
                  ? "جاري نطق الشرح الصوتي المباشر 🎙️"
                  : "مزامنة صوتية مع تفاصيل منتجاتك وأسعارك 📋"}
              </span>
            </div>

            {/* Play/Pause & Audio bar */}
            <div className="flex items-center justify-center gap-2.5">
              <button
                onClick={() => {
                  setCurrentStep(0);
                  setProgress(0);
                  if (!hasUserStartedAudio) setHasUserStartedAudio(true);
                  speakStepAudio(0);
                }}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                title="إعادة الشرح من البداية"
              >
                <RotateCcw className="h-4 w-4" />
              </button>

              <button
                onClick={() => {
                  if (!hasUserStartedAudio) setHasUserStartedAudio(true);
                  const nextPlay = !isPlaying;
                  setIsPlaying(nextPlay);
                  if (nextPlay) {
                    speakStepAudio(currentStep);
                  } else {
                    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
                  }
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-teal-500 to-emerald-600 text-white font-black text-xs shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-95 transition cursor-pointer"
              >
                {isPlaying ? (
                  <>
                    <Pause className="h-4 w-4" />
                    <span>إيقاف مؤقت</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    <span>تشغيل الصوت والشرح</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  if (!hasUserStartedAudio) setHasUserStartedAudio(true);
                  const nextMuted = !isMuted;
                  setIsMuted(nextMuted);
                  if (nextMuted) {
                    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
                  } else {
                    speakStepAudio(currentStep);
                  }
                }}
                className={`p-2.5 rounded-xl transition cursor-pointer ${
                  isMuted
                    ? "bg-rose-500/20 text-rose-300"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                }`}
                title={isMuted ? "تشغيل الصوت" : "كتم الصوت"}
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              {onOpenGames && (
                <button
                  onClick={() => {
                    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
                    onClose();
                    onOpenGames();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:brightness-110 text-white text-xs font-black text-center transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  <Gamepad2 className="h-4 w-4" />
                  <span>انتقل مباشرة لسلة الألعاب 🎮</span>
                </button>
              )}

              <button
                onClick={() => {
                  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
                  onClose();
                  if (onOpenSheet) onOpenSheet();
                }}
                className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold text-center transition cursor-pointer"
              >
                تصفح شيت الأصناف والطلبيات 📋
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
