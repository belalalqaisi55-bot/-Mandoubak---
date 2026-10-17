import React, { useState } from "react";
import {
  Trophy,
  Brain,
  Zap,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  Award,
  Flame,
  ShieldAlert,
  Users,
  Bot,
  Medal,
  ChevronRight,
  Lightbulb,
  Lock,
  Layers,
  Star,
  Play,
  BookOpen
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
const drBelalProfileImg = "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=400";

// --- AUDIO & GEORGE QERDAHI VOICE HELPERS ---
let globalAudioCtx: AudioContext | null = null;
function getAudioContext() {
  if (!globalAudioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      globalAudioCtx = new AudioContextClass();
    }
  }
  if (globalAudioCtx && globalAudioCtx.state === "suspended") {
    globalAudioCtx.resume();
  }
  return globalAudioCtx;
}

export function playSound(type: string, enabled: boolean = true) {
  // Sound effects completely removed per user request
}

export function playMillionaireTheme(enabled: boolean = true) {
  // Millionaire theme music completely removed per user request
}

// --- DIFFICULTY STAGES DEFINITION ---
export type DifficultyLevel = "beginner" | "intermediate" | "advanced" | "expert";

export interface LevelInfo {
  id: DifficultyLevel;
  title: string;
  badge: string;
  description: string;
  color: string;
  bgGrad: string;
  border: string;
  icon: string;
}

export const DIFFICULTY_STAGES: LevelInfo[] = [
  {
    id: "beginner",
    title: "المرحلة الأولى: مبتدئ",
    badge: "مبتدئ 🟢",
    description: "أسئلة أساسية وشائعة في الصيدلة اليومية ومفاهيم الأدوية العامة.",
    color: "emerald",
    bgGrad: "from-emerald-500/10 via-teal-500/5 to-emerald-500/10",
    border: "border-emerald-300",
    icon: "🌱"
  },
  {
    id: "intermediate",
    title: "المرحلة الثانية: متوسط",
    badge: "متوسط 🔵",
    description: "تطبيقات فارماكولوجية سريرية، الآليات العلاجية، وتداخلات شائعة.",
    color: "sky",
    bgGrad: "from-sky-500/10 via-blue-500/5 to-sky-500/10",
    border: "border-sky-300",
    icon: "⚡"
  },
  {
    id: "advanced",
    title: "المرحلة الثالثة: متقدم",
    badge: "متقدم 🟣",
    description: "حالات سريرية دقيقة، إنزيمات CYP الكبدية، وتعديل الجرعات بالحمل والكلى.",
    color: "purple",
    bgGrad: "from-purple-500/10 via-indigo-500/5 to-purple-500/10",
    border: "border-purple-300",
    icon: "🔬"
  },
  {
    id: "expert",
    title: "المرحلة الرابعة: محترف",
    badge: "محترف 🔥🔴",
    description: "تحدي العمالقة: أدوية الطوارئ العناية المركزة، الترياقات السامة والنطاق العلاجي الضيق.",
    color: "rose",
    bgGrad: "from-rose-500/10 via-amber-500/5 to-rose-500/10",
    border: "border-rose-400",
    icon: "👑"
  }
];

// --- GAME 1: PHARMA MILLIONAIRE QUESTIONS BY LEVEL ---
export interface MillionaireQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  drBelalTip: string;
}

export const MILLIONAIRE_QUESTIONS_BY_LEVEL: Record<DifficultyLevel, MillionaireQuestion[]> = {
  beginner: [
    {
      id: 1,
      question: "ما هو الاستخدام الأبرز والأكثر شيوعاً لدواء الباراسيتامول (Paracetamol)؟",
      options: ["موسع للشرايين التاجية", "مسكن للألم وخافض للحرارة", "مضاد حيوي للالتهاب البكتيري", "مدر للبول حاد"],
      correctIndex: 1,
      explanation: "الباراسيتامول خيار خط أول مسكن وخافض حرارة آمن نسبياً للجهاز الهضمي.",
      drBelalTip: "إجابة سهلة دكتور! الباراسيتامول مسكن وخافض حرارة ذو أمان ممتاز."
    },
    {
      id: 2,
      question: "أي من الفئات التالية تنتمي إليها أدوية مثل Omeprazole و Pantoprazole؟",
      options: ["مضادات الهيستامين H1", "مضادات الفطريات", "مثبطات مضخة البروتون (PPIs)", "حاصرات بيتا"],
      correctIndex: 2,
      explanation: "تثبط هذه الأدوية إنزيم H+/K+ ATPase لتثبيط إفراز حمض المعدة.",
      drBelalTip: "مقطع prazole يرمز لمضخات البروتون لحماية وتقليل حموضة المعدة."
    },
    {
      id: 3,
      question: "ما هو الخط الأول المعتمد في علاج السكري من النوع الثاني لتقليل مقاومة الأنسولين؟",
      options: ["Glibenclamide", "Insulin Glargine", "Aspirin", "Metformin"],
      correctIndex: 3,
      explanation: "الميتفورمين يقلل إنتاج الجلوكوز كبدياً ويزيد الحساسية للأنسولين دون هبوط حاد بالسكر.",
      drBelalTip: "الميتفورمين صديق مريض السكري الأول."
    },
    {
      id: 4,
      question: "ما هو العرض الجانبي المشهور لمسكنات NSAIDs مثل Ibuprofen على المعدة؟",
      options: ["تهيج بطانة المعدة والخطر التقرحي", "تساقط الشعر الشديد", "انخفاض دائم للسمع", "ارتفاع السكر"],
      correctIndex: 0,
      explanation: "تثبيط COX-1 يقلل البروستاغلاندينات الحامية لبطانة المعدة المخاطية.",
      drBelalTip: "تُؤخذ NSAIDs بعد الطعام للحفاظ على سلامة بطانة المعدة."
    },
    {
      id: 5,
      question: "أي من الأدوية التالية يستخدم كموسع قصبي سريع في أزمات الربو الحادة؟",
      options: ["Amlodipine", "Salbutamol (Ventolin)", "Atorvastatin", "Warfarin"],
      correctIndex: 1,
      explanation: "السالبوتامول محفز سريع لمستقبلات Beta-2 يوسع الشعب الهوائية فوراً.",
      drBelalTip: "الفنتولين هو بخاخ الإنقاذ السريع بمشيئة الله في نوبات الربو."
    },
    {
      id: 6,
      question: "أي من الفيتامينات التالية يذوب في الماء ويُفرز الفائض منه بسهولة في البول؟",
      options: ["Vitamin D", "Vitamin A", "Vitamin C (Ascorbic Acid)", "Vitamin K"],
      correctIndex: 2,
      explanation: "فيتامين C وفيتامينات B قابلة للذوبان في الماء ولا تتراكم بكميات سامة في الجسم كالفيتامينات الذائبة في الدهون (A, D, E, K).",
      drBelalTip: "الفيتامينات الذائبة في الماء أمانها عالي لأن الجسم يتخلص من الزائد منها."
    },
    {
      id: 7,
      question: "ما هو المضاد الحيوي الأكثر أماناً واستخداماً كخط أول في علاج التهاب اللوزتين البكتيري لدى الحوامل؟",
      options: ["Ciprofloxacin", "Doxycycline", "Clarithromycin", "Amoxicillin"],
      correctIndex: 3,
      explanation: "أموكسيسيلين هو البنسلين الآمن والمفضل للحوامل والأطفال في التهابات الجهاز التنفسي العلوي البكتيرية.",
      drBelalTip: "البنسلينات والسيفالوسبورينات هي أأمن المضادات الحيوية خلال الحمل."
    },
    {
      id: 8,
      question: "أي من الأدوية التالية يستخدم كمضاد للحساسية من الجيل الثاني ولا يسبب النعاس الشديد؟",
      options: ["Loratadine", "Diphenhydramine", "Chlorpheniramine", "Hydroxyzine"],
      correctIndex: 0,
      explanation: "اللوراتادين والسيتريزين من الجيل الثاني لا يعبران الحاجز الدموي الدماغي بسهولة مقارنة بالجيل الأول.",
      drBelalTip: "أدوية الحساسية من الجيل الثاني مناسبة لمن يقودون السيارات أو يحتاجون للتركيز."
    }
  ],

  intermediate: [
    {
      id: 1,
      question: "أي من المضادات الحيوية التالية يُمنع للأطفال دون سن 8 سنوات لمنع التصبغ الدائم للأسنان؟",
      options: ["Amoxicillin", "Doxycycline / Tetracyclines", "Azithromycin", "Cefalexin"],
      correctIndex: 1,
      explanation: "التتراسيكلينات ترتبط بالكالسيوم وتترسب في العظام والأسنان النامية.",
      drBelalTip: "ظاهرة التخلب Chelation مع الكالسيوم يسبب تصبغ أسنان الأطفال."
    },
    {
      id: 2,
      question: "أي فئة من أدوية الضغط تسبب السعال الجاف الشائع نتيجة تراكم البراكينين (Bradykinin)؟",
      options: ["Beta Blockers (مثل Atenolol)", "Calcium Channel Blockers", "ACE Inhibitors (مثل Captopril)", "Diuretics"],
      correctIndex: 2,
      explanation: "مثبطات ACE تمنع تفكيك البراكينين في الرئتين مما يسبب السعال الجاف.",
      drBelalTip: "في حال السعال الجاف نتحول إلى فئة ARBs مثل Valsartan."
    },
    {
      id: 3,
      question: "ما هو العرض الجانبي الشهير لحاصرات قنوات الكالسيوم مثل 'Amlodipine'؟",
      options: ["فقدان التذوق", "نزيف لثوي", "جفاف العين", "تورم ووذمة الكاحلين (Ankle Edema)"],
      correctIndex: 3,
      explanation: "توسع الشرايين المحيطية يؤدي لزيادة الضغط الهيدروستاتيكي وتجمع السوائل بالكاحل.",
      drBelalTip: "وذمة الكاحل عرض شائع ومشهور للأملوديبين."
    },
    {
      id: 4,
      question: "ما هي المادة المضادة (Antidote) الترياق المباشر لحالات التسمم بالباراسيتامول؟",
      options: ["N-Acetylcysteine (NAC)", "Naloxone", "Atropine", "Vitamin K"],
      correctIndex: 0,
      explanation: "يعيد بناء الجلوتاثيون للكبد ويحيد المادة السامة NAPQI.",
      drBelalTip: "الأسيتيل سيستين يحمي الكبد من السمية الحادة."
    },
    {
      id: 5,
      question: "دواء Clopidogrel هو دواء خامل ينشط بإنزيم CYP2C19. ما الدواء الذي يقلل فاعليته؟",
      options: ["Paracetamol", "Omeprazole", "Amoxicillin", "Vitamin C"],
      correctIndex: 1,
      explanation: "الأوميبرازول يثبط CYP2C19 ويمنع تحول الكلوبيدوغريل لشكله النشط.",
      drBelalTip: "نفضل Pantoprazole مع الكلوبيدوغريل لتفادي هذا التداخل."
    },
    {
      id: 6,
      question: "أي من خافضات الكوليسترول التالية يرتبط بأعلى خطر للإصابة بآلام والتهاب العضلات (Myopathy)؟",
      options: ["Ezetimibe", "Omega-3", "Atorvastatin / Statins", "Colestipol"],
      correctIndex: 2,
      explanation: "الستاتينات قد تسبب اعتلالاً عضلياً ويتطلب فحص إنزيم Creatine Kinase (CK) عند حدوث ألم عضلي مجهول.",
      drBelalTip: "تناول CoQ10 قد يخفف من آلام عضلات الستاتين لدى بعض المرضى."
    },
    {
      id: 7,
      question: "ما هو الهرمون المستخدم كمضاد لنقص السكر الحاد الشديد عند مريض السكري الفاقد للوعي؟",
      options: ["Insulin", "Metformin", "Thyroxine", "Glucagon"],
      correctIndex: 3,
      explanation: "الجلوكاجون يحفز تحلل الجليكوجين الكبدي إلى جلوكوز لرفع سكر الدم بسرعة في الطوارئ.",
      drBelalTip: "حقنة الجلوكاجون الإسعافية منقذة لحياة مريض السكري عند الإغماء."
    }
  ],

  advanced: [
    {
      id: 1,
      question: "تُمنع المضادات الحيوية الفلوروكينولونات (مثل Ciprofloxacin) مع مكملات الكالسيوم بسبب:",
      options: ["تحول الدواء لسم كبدي", "تدمير خلايا الدم", "حدوث التخلب (Chelation) وتقليل الامتصاص حاداً", "زيادة التجلط"],
      correctIndex: 2,
      explanation: "تتحد الكينولونات مع الأيونات ثنائية التكافؤ وتمنع الامتصاص المعوي.",
      drBelalTip: "اترك فارق ساعتين على الأقل بين الكينولونات والحديد أو الكالسيوم."
    },
    {
      id: 2,
      question: "ما هو الدواء الذي يمتلك نطاقاً علاجياً ضيقاً ويتطلب متابعة دورية لمعامل INR وتأثره بـ Vitamin K؟",
      options: ["Aspirin", "Clopidogrel", "Enoxaparin", "Warfarin"],
      correctIndex: 3,
      explanation: "الوارفارين يعاكس فيتامين K وتغيير تناول الخضار يغير الـ INR.",
      drBelalTip: "مراقبة الـ INR أساسية جداً لسلامة مريض الوارفارين."
    },
    {
      id: 3,
      question: "ما هو الهرمون المستخدم فوراً بالحقن العضلي لعلاج الصدمة التحسسية الحادة (Anaphylaxis)؟",
      options: ["Epinephrine (Adrenaline)", "Hydrocortisone Oral", "Cetirizine", "Salbutamol"],
      correctIndex: 0,
      explanation: "الإبينفرين يرفع ضغط الدم عبر alpha-1 ويوسع الشعب عبر beta-2 فوراً.",
      drBelalTip: "حقنة الأدرينالين هي المنقذ الأول في الصدمات التحسسية."
    },
    {
      id: 4,
      question: "ما هو الإنزيم الكبدي الذي تثبطه أدوية الستاتين (Statins) لتقليل تصنيع الكوليسترول؟",
      options: ["ACE Enzyme", "HMG-CoA Reductase", "Cyclooxygenase-2", "PDE-5"],
      correctIndex: 1,
      explanation: "الستاتينات تثبط HMG-CoA Reductase الممر الرئيسي لتصنيع الدهون.",
      drBelalTip: "تثبيط HMG-CoA هو الأساس العلمي لتخفيض الدهون الضارة LDL."
    },
    {
      id: 5,
      question: "أي من المضادات الحيوية التالية يسبب متلازمة الرجل الأحمر (Red Man Syndrome) عند حقنه بسرعة؟",
      options: ["Gentamicin", "Meropenem", "Vancomycin", "Ceftriaxone"],
      correctIndex: 2,
      explanation: "الحقن السريع للفانكوميسين يحفز إفراز الهيستامين المباشر مما يسبب احمرار الجلد والوجه.",
      drBelalTip: "يُعطى الفانكوميسين بالتقطير الوريدي البطيء على مدار ساعة على الأقل."
    },
    {
      id: 6,
      question: "ما هو التأثير الدوائي لجرعة الأسبرين المنخفضة (81-100 مجم) على الصفائح الدموية؟",
      options: ["تثبيط عكوس لإنزيم COX-2 فقط", "تحفيز البروستاغلاندين E2", "تنشيط الثرومبوكسان A2", "تثبيط غير عكوس لإنزيم COX-1 يمنع تخليق Thromboxane A2 طوال عمر الصفيحة"],
      correctIndex: 3,
      explanation: "الأسبرين يربط أستيل إنزيم COX-1 برابطة تساهمية غير عكوسة مما يمنع تجلط الصفائح لمدة 7-10 أيام.",
      drBelalTip: "تأثير الأسبرين على الصفيحة دائم طوال حياتها لعدم قدرتها على تصنيع إنزيمات جديدة."
    },
    {
      id: 7,
      question: "ما هو الترياق المحدد لعكس تأثير الهيبارين غير المجزأ (Unfractionated Heparin) عند النزف؟",
      options: ["Protamine Sulfate", "Vitamin K", "Idarucizumab", "Flumazenil"],
      correctIndex: 0,
      explanation: "كبريتات البروتامين مادة قاعدية ترتبط بقوة مع الهيبارين الحمضي لمعادلته فوراً.",
      drBelalTip: "كل 1 مجم من البروتامين يعادل حوالي 100 وحدة من الهيبارين."
    }
  ],

  expert: [
    {
      id: 1,
      question: "ما هو الترياق المباشر (Antidote) للتسمم الحاد بجرعة زائدة من الأفيونات (Opioids) مثل Morphine؟",
      options: ["Flumazenil", "Naloxone", "Atropine", "Protamine Sulfate"],
      correctIndex: 1,
      explanation: "النالوكسون حاصر تنافسي لمستقبلات Mu-opioid يعكس هبوط التنفس فوراً.",
      drBelalTip: "النالوكسون ينقذ مركز التنفس بالدماغ فوراً في حالات جرعات الأفيون الزائدة."
    },
    {
      id: 2,
      question: "ما هو الترياق المحدد لإلغاء تأثير مهدئات البنزوديازيبين (Benzodiazepines) في العناية المركزة؟",
      options: ["Naloxone", "Digibind", "Flumazenil", "Physostigmine"],
      correctIndex: 2,
      explanation: "فلومازينيل يحظر موقع ارتباط البنزوديازيبين على مستقبلات GABA-A.",
      drBelalTip: "فلومازينيل هو المعاكس النمطي للبنزوديازيبينات."
    },
    {
      id: 3,
      question: "دواء Digoxin ذو نطاق علاجي ضيق جداً. أي من الاضطرابات الشاردية تزيد من سميته القاتلة؟",
      options: ["ارتفاع الصوديوم", "نقص المغنيسيوم الحاد فقط", "ارتفاع السكر", "نقص بوتاسيوم الدم (Hypokalemia)"],
      correctIndex: 3,
      explanation: "Hypokalemia تزيد ارتباط الديجوكسين بمضخة Na+/K+ ATPase وتضاعف سميته القلبية.",
      drBelalTip: "انتبه لمستوى البوتاسيوم دائماً عند مرضى الديجوكسين!"
    },
    {
      id: 4,
      question: "أي من الأدوية التالية يتطلب مراقبة مستوى 'Serum Creatinine' وتعديل الجرعة بدقة لمنع السمية الكلوية والسمية السمعية (Ototoxicity)؟",
      options: ["Gentamicin / Amikacin (Aminoglycosides)", "Amoxicillin", "Metformin", "Paracetamol"],
      correctIndex: 0,
      explanation: "الأمينوجليكوزيدات تتركز في الكلى والأذن الداخلية وتتطلب تعديل الجرعة حسب تصفية الكرياتينين.",
      drBelalTip: "فحص وظائف الكلى أساسي قبل وأثناء العلاج بالأمينوجليكوزيدات."
    },
    {
      id: 5,
      question: "ما هو التداخل الدوائي الخطير بين أدوية MAO Inhibitors والأطعمة الغنية بالـ Tyramine (كال أجبان المعتقة)؟",
      options: ["هبوط السكر", "أزمة ارتفاع ضغط الدم الحاد القاتل (Hypertensive Crisis)", "فشل كبدي حاد", "نزيف رحمي"],
      correctIndex: 1,
      explanation: "التيرامين يطلق النورأدرينالين بكثرة وبغياب إنزيم MAO يحدث ارتفاع ضغط صاعق.",
      drBelalTip: "حمية خالية من التيرامين ضرورية جداً مع مثبطات المونوأمين أكسيديز."
    },
    {
      id: 6,
      question: "ما هو الترياق المستخدم لعلاج التسمم الحاد بأدوية حاصرات قنوات الكالسيوم (CCB Toxicity)؟",
      options: ["Atropine فقط", "N-Acetylcysteine", "High-dose Insulin Euglycemia Therapy (HIET) مع Calcium Gluconate", "Deferoxamine"],
      correctIndex: 2,
      explanation: "علاج الأنسولين بجرعات عالية مع الجلوكوز والكالسيوم يحسن استخدام الطاقة داخل خلايا عضلة القلب المتضررة من CCB.",
      drBelalTip: "HIET هو المعيار الذهبي الحديث لإنقاذ حالات التسمم الشديد بحاصرات قنوات الكالسيوم."
    },
    {
      id: 7,
      question: "ما هو التداخل الدوائي القاتل بين دواء Allopurinol ودواء Azathioprine؟",
      options: ["ارتفاع البوتاسيوم", "تدمير الغدة الدرقية", "تجلط رئوي حاد", "تثبيط حاد وشديد لنخاع العظام (Pancytopenia) نتيجة تثبيط Xanthine Oxidase"],
      correctIndex: 3,
      explanation: "الألوبيورينول يثبط إنزيم زانثين أوكسيديز وهو الإنزيم الأساسي لتفكيك 6-Mercaptopurine فيتراكم وتحدث سمية نخاعية مميتة.",
      drBelalTip: "يجب تخفيض جرعة الأزاثيوبرين بمقدار 75% إذا اضطررنا لجمعه مع ألوبيورينول."
    }
  ]
};

export const PRIZE_LADDER = [
  100, 200, 300, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000, 125000, 250000, 500000, 1000000
];

// --- GAME 2: DRUG INTERACTION PAIRS BY LEVEL ---
export interface InteractionPair {
  id: number;
  drugA: string;
  drugB: string;
  isDangerous: boolean;
  severity: "حرِج وممنوع" | "آمن ولا يوجد تعارض" | "يحتاج حذر وتعديل جرعة";
  explanation: string;
}

export const INTERACTION_PAIRS_BY_LEVEL: Record<DifficultyLevel, InteractionPair[]> = {
  beginner: [
    {
      id: 1,
      drugA: "Paracetamol (باراسيتامول)",
      drugB: "Amoxicillin (أموكسيسيلين)",
      isDangerous: false,
      severity: "آمن ولا يوجد تعارض",
      explanation: "مزيج آمن ومستخدم بكثرة لعلاج الالتهاب البكتيري المصحوب بالحرارة أو الألم."
    },
    {
      id: 2,
      drugA: "Sildenafil (فياجرا)",
      drugB: "Nitroglycerin (نيتروجليسرين)",
      isDangerous: true,
      severity: "حرِج وممنوع",
      explanation: "تفاعل قاتل يتسبب بهبوط حاد وشديد جداً في ضغط الدم نتيجة التوسع الوعائي المضاعف."
    },
    {
      id: 3,
      drugA: "Ibuprofen (إيبوبروفين)",
      drugB: "Paracetamol (باراسيتامول)",
      isDangerous: false,
      severity: "آمن ولا يوجد تعارض",
      explanation: "يمكن التناوب بينهما بأمان تحت إشراف الطبيب لخفض الحرارة الشديدة."
    },
    {
      id: 4,
      drugA: "Metformin (ميتفورمين)",
      drugB: "Glibenclamide (جليبنكلاميد)",
      isDangerous: false,
      severity: "آمن ولا يوجد تعارض",
      explanation: "تركيبة شائعة لعلاج السكري يعملان بآليتين مكملتين."
    }
  ],

  intermediate: [
    {
      id: 1,
      drugA: "Warfarin (وارفارين)",
      drugB: "Aspirin (أسبرين)",
      isDangerous: true,
      severity: "حرِج وممنوع",
      explanation: "مزيج يضاعف خطر النزيف الداخلي والمعوي الشديد نتيجة مضاعفة التمييع وتثبيط الصفيحات."
    },
    {
      id: 2,
      drugA: "Ciprofloxacin (سيبروفلوكساسين)",
      drugB: "Calcium / Antacids (حليب ومضادات حموضة)",
      isDangerous: true,
      severity: "يحتاج حذر وتعديل جرعة",
      explanation: "الكالسيوم يرتبط بالسيبروفلوكساسين ويمنع امتصاصه. يجب ترك فارق ساعتين بينهما."
    },
    {
      id: 3,
      drugA: "Enalapril (إينالابريل)",
      drugB: "Spironolactone (سبيرونولاكتون)",
      isDangerous: true,
      severity: "يحتاج حذر وتعديل جرعة",
      explanation: "كلاهما يرفع مستويات البوتاسيوم في الدم (Hyperkalemia) مما قد يسبب اضطراب ضربات القلب."
    },
    {
      id: 4,
      drugA: "Omeprazole (أوميبرازول)",
      drugB: "Domperidone (دومبريدون)",
      isDangerous: false,
      severity: "آمن ولا يوجد تعارض",
      explanation: "وصفة متوازنة لعلاج الارتجاع والحرقة والمغص الهضمي."
    }
  ],

  advanced: [
    {
      id: 1,
      drugA: "Clarithromycin (كلاريثروميسين)",
      drugB: "Simvastatin (سيمفاستاتين)",
      isDangerous: true,
      severity: "حرِج وممنوع",
      explanation: "الكلاريثروميسين يثبط إنزيم CYP3A4 مما يرفع مستوى الستاتين بشكل حاد ويسبب انحلال العضلات (Rhabdomyolysis)."
    },
    {
      id: 2,
      drugA: "Methotrexate (ميثوتركسيت)",
      drugB: "Ibuprofen / NSAIDs",
      isDangerous: true,
      severity: "حرِج وممنوع",
      explanation: "مسكنات NSAIDs تقلل الإخراج الكلوي للميثوتركسيت مما يؤدي لسمية نخاع العظام الحادة."
    },
    {
      id: 3,
      drugA: "SSRIs (مثل Fluoxetine)",
      drugB: "Tramadol (تارامادول)",
      isDangerous: true,
      severity: "حرِج وممنوع",
      explanation: "يزيدان خطر حدوث متلازمة السيروتونين الخطيرة (Serotonin Syndrome) والتشنجات."
    },
    {
      id: 4,
      drugA: "Amlodipine (أملوديبين)",
      drugB: "Valsartan (فالسارتان)",
      isDangerous: false,
      severity: "آمن ولا يوجد تعارض",
      explanation: "مزيج ممتاز للتحكم بضغط الدم وتقلل من وذمة الكاحل الناجمة عن الأملوديبين."
    }
  ],

  expert: [
    {
      id: 1,
      drugA: "Lithium (ليثيوم)",
      drugB: "Hydrochlorothiazide (مدر بول ثيازايد)",
      isDangerous: true,
      severity: "حرِج وممنوع",
      explanation: "مدرات البول تقرر إخراج الصوديوم مما يحفز إعادة امتصاص الليثيوم كلوياً ويسبب سمية الليثيوم الحادة."
    },
    {
      id: 2,
      drugA: "Digoxin (ديجوكسين)",
      drugB: "Amiodarone (أمبودارون)",
      isDangerous: true,
      severity: "يحتاج حذر وتعديل جرعة",
      explanation: "الأميودارون يقلل التصفية الكلوية للديجوكسين ويضاعف تركيزه بالدم ويتطلب خفض جرعة الديجوكسين للنصف."
    },
    {
      id: 3,
      drugA: "Linezolid (لينيزوليد)",
      drugB: "SSRIs (مثل Sertraline)",
      isDangerous: true,
      severity: "حرِج وممنوع",
      explanation: "اللينيزوليد يمتلك خوارص تثبيط MAO ضعيفة، وجمعه مع SSRIs يسبب متلازمة سيروتونين صاعقة."
    },
    {
      id: 4,
      drugA: "Allopurinol (ألوبرينول)",
      drugB: "Azathioprine (أزاثيوبرين)",
      isDangerous: true,
      severity: "حرِج وممنوع",
      explanation: "الألوبورينول يثبط إنزيم Xanthine Oxidase المسؤول عن استقلاب الأزاثيوبرين مما يسبب تثبيط شديد لنخاع العظام."
    }
  ]
};

// --- GAME 3: MOLECULE MYSTERIES BY LEVEL ---
export interface MoleculeMystery {
  id: number;
  brandOrMolecule: string;
  clues: string[];
  options: string[];
  correctIndex: number;
  clinicalNote: string;
}

export const MOLECULE_MYSTERIES_BY_LEVEL: Record<DifficultyLevel, MoleculeMystery[]> = {
  beginner: [
    {
      id: 1,
      brandOrMolecule: "Metformin",
      clues: [
        "ينتمي لعائلة البايجوانيد (Biguanide) ومستخلص تاريخياً من نبات الفراشة العشبية.",
        "لا يسبب هبوط السكر المفاجئ (Hypoglycemia) عند استخدامه بمفرده.",
        "يعتبر الخط الأول المعتمد عالمياً لمرضى السكري من النوع الثاني وتقليل المقاومة للأنسولين."
      ],
      options: ["Glibenclamide", "Metformin", "Insulin", "Sitagliptin"],
      correctIndex: 1,
      clinicalNote: "الميتفورمين يقلل تصنيع الجلوكوز في الكبد ويزيد حساسيات المستقبلات للأنسولين."
    },
    {
      id: 2,
      brandOrMolecule: "Paracetamol",
      clues: [
        "يُعرف في أمريكا الشمالية باسم Acetaminophen.",
        "يعمل على الجهاز العصبي المركزي لتسكين الألم وخفض الحرارة.",
        "الترياق المباشر لسميته الكبدية هو N-Acetylcysteine."
      ],
      options: ["Ibuprofen", "Aspirin", "Paracetamol", "Diclofenac"],
      correctIndex: 2,
      clinicalNote: "دواء واسع الأمان بالجرعات النظامية (أقل من 4 جرام يومياً للبالغين)."
    },
    {
      id: 3,
      brandOrMolecule: "Salbutamol",
      clues: [
        "ناهض سريع وقصير المدى لمستقبلات Beta-2 الأدرينالية في القصبات.",
        "يُعرف تجارياً باسم Ventolin ويستخدم كبخاخ إنقاذ إسعافي في نوبات الربو.",
        "قد يسبب رجفة طفيفة باليدين وزيادة طفيفة في معدل ضربات القلب."
      ],
      options: ["Salbutamol", "Ipratropium", "Fluticasone", "Theophylline"],
      correctIndex: 0,
      clinicalNote: "سالبوتامول هو الخيار الأول والمفضل للتوسيع القصبي السريع في أزمات الربو."
    },
    {
      id: 4,
      brandOrMolecule: "Omeprazole",
      clues: [
        "مثبط لمضخة البروتون H+/K+ ATPase في الخلايا الجدارية للمعدة.",
        "يُستخدم لعلاج قرحة المعدة والارتجاع المريئي (GERD).",
        "يُفضل تناوله صباحاً على معدة فارغة قبل الإفطار بنصف ساعة."
      ],
      options: ["Ranitidine", "Antacid", "Domperidone", "Omeprazole"],
      correctIndex: 3,
      clinicalNote: "أوميبرازول يقلل إفراز الحمض بنسبة تتجاوز 90% ويوفر بيئة لالتئام القرحات."
    }
  ],

  intermediate: [
    {
      id: 1,
      brandOrMolecule: "Amlodipine",
      clues: [
        "ينتمي لمجموعة Dihydropyridine ومضاد لارتفاع ضغط الدم.",
        "يعمل عبر حظر قنوات الكالسيوم في العضلات الملساء للأوعية الدموية.",
        "من أشهر أعراضه الجانبية حدوث تورم أو وذمة حول الكاحل (Ankle Edema)."
      ],
      options: ["Atenolol", "Valsartan", "Amlodipine", "Furosemide"],
      correctIndex: 2,
      clinicalNote: "الأملوديبين يوفر تحكماً ممتازاً بالضغط على مدار 24 ساعة لجرعته اليومية الواحدة."
    },
    {
      id: 2,
      brandOrMolecule: "Atorvastatin",
      clues: [
        "يثبط إنزيم HMG-CoA Reductase المسئول عن تصنيع الكوليسترول في الكبد.",
        "يقلل مستوى الدهون الضارة LDL ويحمي الشرايين القلبية.",
        "يُفضل تناوله مساءً أو قبل النوم لتزامن أعلى تصنيع للدهون ليلاً."
      ],
      options: ["Fenofibrate", "Omega-3", "Ezetimibe", "Atorvastatin"],
      correctIndex: 3,
      clinicalNote: "الأتورفاستاتين هو أحد أكثر أدوية تخفيض الدهون أماناً وفاعلية مثبتة سريرياً."
    },
    {
      id: 3,
      brandOrMolecule: "Lisinopril",
      clues: [
        "ينتمي لمجموعة مثبطات الإنزيم المحول للأنجيوتنسين (ACE Inhibitors).",
        "يوفر حماية كلوية فائقة لمرضى السكري المصحوب بالزلال البولي.",
        "من آثاره الجانبية الشائعة السعال الجاف غير المنتج للبلغم."
      ],
      options: ["Lisinopril", "Losartan", "Hydrochlorothiazide", "Spironolactone"],
      correctIndex: 0,
      clinicalNote: "مثبطات ACE تقلل الضغط داخل الكبيبات الكلوية وتبطئ تدهور وظائف الكلى."
    },
    {
      id: 4,
      brandOrMolecule: "Clopidogrel",
      clues: [
        "دواء طليعي خامل يتحول إلى شكله النشط عبر إنزيم الكبد CYP2C19.",
        "يثبط مستقبلات ADP من نوع P2Y12 على سطح الصفائح الدموية لمنع التجلط.",
        "يتداخل مع دواء Omeprazole الذي يقلل من فاعليته المضادة للتخثر."
      ],
      options: ["Aspirin", "Clopidogrel", "Ticagrelor", "Dipyridamole"],
      correctIndex: 1,
      clinicalNote: "كلوبيدوغريل (Plavix) أساسي لمنع التجلط بعد تركيب الدعامات التاجية والشرايين."
    }
  ],

  advanced: [
    {
      id: 1,
      brandOrMolecule: "Ciprofloxacin",
      clues: [
        "ينتمي لمجموعة الفلوروكينولونات (Fluoroquinolones) الجيل الثاني.",
        "يثبط إنزيم DNA Gyrase و Topoisomerase IV البكتيري.",
        "يتحد مع الكالسيوم والحليب ويتطلب فارق ساعتين في الامتصاص."
      ],
      options: ["Amoxicillin", "Azithromycin", "Ciprofloxacin", "Doxycycline"],
      correctIndex: 2,
      clinicalNote: "مضاد حيوي واسع المجال فعال ضد البكتيريا سالبة الجرام بما فيها السيودوموناس."
    },
    {
      id: 2,
      brandOrMolecule: "Warfarin",
      clues: [
        "مضاد تخثر فموي يعاكس فيتامين K وتخليق عوامل التجلط 2, 7, 9, 10.",
        "يتطلب متابعة دقيقة لنسبة الـ INR بالدم.",
        "تتأثر فاعليته بشكل مباشر بتناول الأغذية الخضراء الغنية بفيتامين ك."
      ],
      options: ["Heparin", "Aspirin", "Rivaroxaban", "Warfarin"],
      correctIndex: 3,
      clinicalNote: "الوارفارين يتطلب تثقيف المريض حول التغذية الثابتة لمنع حدوث التجلط أو النزيف."
    },
    {
      id: 3,
      brandOrMolecule: "Naloxone",
      clues: [
        "حاصر نقي وتنافسي لمستقبلات الأفيون (Mu Opioid Receptors).",
        "يُعطى كدواء إنقاذ طارئ لعكس التثبيط التنفسي الناجم عن الجرعة الزائدة من المورفين أو الهيروين.",
        "عمره النصفي قصير جداً وقد يحتاج المريض لجرعات مكررة بعد استيقاظه."
      ],
      options: ["Naloxone", "Flumazenil", "Atropine", "Neostigmine"],
      correctIndex: 0,
      clinicalNote: "النالوكسون ينقذ الأرواح فوراً عبر إعادة تشغيل مركز التنفس الدماغي."
    }
  ],

  expert: [
    {
      id: 1,
      brandOrMolecule: "Vancomycin",
      clues: [
        "مضاد بكتيري جليكوببتيد ينتمي لفئة Glycopeptides.",
        "يعتبر العلاج الأساسي لبكتيريا MRSA المقاومة للميثيسيلين.",
        "إعطاؤه بالحقن الوريدي السريع يسبب Red Man Syndrome."
      ],
      options: ["Linezolid", "Vancomycin", "Meropenem", "Colistin"],
      correctIndex: 1,
      clinicalNote: "الفانكوميسين يستلزم متابعة مستويات التراكيز الدنيا (Trough levels) لمنع السمية الكلوية والسمية السمعية."
    },
    {
      id: 2,
      brandOrMolecule: "Digoxin",
      clues: [
        "جليكوسيد قلبي ينتمي لمجموعة Cardiac Glycosides مستخرج من نبات إصبع العذراء.",
        "يزيد قوة انقباض العضلة القلبية عبر تثبيط مضخة Na+/K+ ATPase.",
        "نقص البوتاسيوم (Hypokalemia) يزيد سميته القاتلة بشكل حاد."
      ],
      options: ["Dobutamine", "Amiodarone", "Digoxin", "Milrinone"],
      correctIndex: 2,
      clinicalNote: "الديجوكسين دواء ذو نطاق علاجي ضيق جداً (0.5 - 2.0 ng/mL) ويتطلب عناية فائقة."
    },
    {
      id: 3,
      brandOrMolecule: "Linezolid",
      clues: [
        "ينتمي لعائلة الأوكسازوليدينون (Oxazolidinone) المضادة للبكتيريا موجبة الجرام المقاومة (VRE & MRSA).",
        "يثبط تصنيع البروتين بالارتباط بالوحدة 50S للريبوسوم.",
        "يمتلك تأثيراً مثبطاً لإنزيم MAO وقد يسبب متلازمة السيروتونين إذا جُمع مع مضادات الاكتئاب SSRIs."
      ],
      options: ["Daptomycin", "Tigecycline", "Teicoplanin", "Linezolid"],
      correctIndex: 3,
      clinicalNote: "لينيزوليد يتطلب مراقبة تعداد الدم الكامل أسبوعياً لتحذير من تثبيط نقي العظام عند استخدامه لأكثر من أسبوعين."
    }
  ]
};


// Helper to shuffle options and maintain correct pointer for Millionaire
export function shuffleMillionaireQuestion(q: MillionaireQuestion): MillionaireQuestion {
  const correctText = q.options[q.correctIndex];
  const shuffledOpts = [...q.options];
  for (let i = shuffledOpts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledOpts[i], shuffledOpts[j]] = [shuffledOpts[j], shuffledOpts[i]];
  }
  const newIndex = shuffledOpts.indexOf(correctText);
  return {
    ...q,
    options: shuffledOpts,
    correctIndex: newIndex >= 0 ? newIndex : 0
  };
}

// Helper to shuffle options and maintain correct pointer for Mystery
export function shuffleMoleculeMystery(m: MoleculeMystery): MoleculeMystery {
  const correctText = m.options[m.correctIndex];
  const shuffledOpts = [...m.options];
  for (let i = shuffledOpts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledOpts[i], shuffledOpts[j]] = [shuffledOpts[j], shuffledOpts[i]];
  }
  const newIndex = shuffledOpts.indexOf(correctText);
  return {
    ...m,
    options: shuffledOpts,
    correctIndex: newIndex >= 0 ? newIndex : 0
  };
}

interface PharmaGamesProps {
  onBackToApp?: () => void;
  repAvatar?: string;
}

export const PharmaGames: React.FC<PharmaGamesProps> = ({ onBackToApp, repAvatar }) => {
  const [activeGame, setActiveGame] = useState<"menu" | "millionaire" | "speed" | "mystery">("menu");
  const [showHowToPlayModal, setShowHowToPlayModal] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);

  // Selected difficulty per game
  const [selectedLevel, setSelectedLevel] = useState<DifficultyLevel>("beginner");
  const [isLevelModalOpen, setIsLevelModalOpen] = useState(false);
  const [pendingGameToStart, setPendingGameToStart] = useState<"millionaire" | "speed" | "mystery" | null>(null);

  // Active randomized lists ensuring options and question order are never static
  const [millionaireQuestionsList, setMillionaireQuestionsList] = useState<MillionaireQuestion[]>(() => {
    const raw = MILLIONAIRE_QUESTIONS_BY_LEVEL.beginner;
    return [...raw].sort(() => 0.5 - Math.random()).map(shuffleMillionaireQuestion);
  });

  const [activeMysteriesList, setActiveMysteriesList] = useState<MoleculeMystery[]>(() => {
    const raw = MOLECULE_MYSTERIES_BY_LEVEL.beginner;
    return [...raw].sort(() => 0.5 - Math.random()).map(shuffleMoleculeMystery);
  });

  // --- MILLIONAIRE STATES ---
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isGameEnded, setIsGameEnded] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const [guaranteedAmount, setGuaranteedAmount] = useState(0);
  
  // Lifelines
  const [used5050, setUsed5050] = useState(false);
  const [hiddenOptions, setHiddenOptions] = useState<number[]>([]);
  
  const [usedDrBelal, setUsedDrBelal] = useState(false);
  const [showDrBelalTip, setShowDrBelalTip] = useState(false);
  
  const [usedAudience, setUsedAudience] = useState(false);
  const [audiencePoll, setAudiencePoll] = useState<number[] | null>(null);

  // --- SPEED MATCH STATES ---
  const [speedIndex, setSpeedIndex] = useState(0);
  const [speedScore, setSpeedScore] = useState(0);
  const [speedStreak, setSpeedStreak] = useState(0);
  const [speedShowResult, setSpeedShowResult] = useState(false);
  const [lastUserChoice, setLastUserChoice] = useState<boolean | null>(null);
  const [speedGameOver, setSpeedGameOver] = useState(false);

  // --- MYSTERY STATES ---
  const [mysteryIndex, setMysteryIndex] = useState(0);
  const [cluesRevealed, setCluesRevealed] = useState(1);
  const [mysteryScore, setMysteryScore] = useState(0);
  const [mysterySelected, setMysterySelected] = useState<number | null>(null);
  const [mysteryAnswered, setMysteryAnswered] = useState(false);
  const [mysteryGameOver, setMysteryGameOver] = useState(false);

  // Trigger level selection modal before game starts
  const openLevelSelector = (game: "millionaire" | "speed" | "mystery") => {
    setPendingGameToStart(game);
    setIsLevelModalOpen(true);
  };

  const confirmStartGameWithLevel = (level: DifficultyLevel) => {
    setSelectedLevel(level);
    setIsLevelModalOpen(false);

    if (pendingGameToStart === "millionaire") {
      startMillionaire(level);
    } else if (pendingGameToStart === "speed") {
      startSpeedMatch(level);
    } else if (pendingGameToStart === "mystery") {
      startMystery(level);
    }
  };

  // Reset Millionaire Game
  const startMillionaire = (lvl = selectedLevel) => {
    setSelectedLevel(lvl);
    const pool = MILLIONAIRE_QUESTIONS_BY_LEVEL[lvl] || MILLIONAIRE_QUESTIONS_BY_LEVEL.beginner;
    const shuffled = [...pool].sort(() => 0.5 - Math.random()).map(shuffleMillionaireQuestion);
    setMillionaireQuestionsList(shuffled);
    setCurrentQIndex(0);
    setSelectedOpt(null);
    setIsAnswered(false);
    setIsGameEnded(false);
    setWinAmount(0);
    setGuaranteedAmount(0);
    setUsed5050(false);
    setHiddenOptions([]);
    setUsedDrBelal(false);
    setShowDrBelalTip(false);
    setUsedAudience(false);
    setAudiencePoll(null);
    setActiveGame("millionaire");

    playSound("suspense", isSoundEnabled);
    playMillionaireTheme(isSoundEnabled);
  };

  // Lifeline 50:50
  const handleUse5050 = () => {
    if (used5050 || isAnswered) return;
    playSound("click", isSoundEnabled);
    const questions = millionaireQuestionsList;
    const currentQ = questions[currentQIndex] || MILLIONAIRE_QUESTIONS_BY_LEVEL[selectedLevel][0];
    const wrongIndices = [0, 1, 2, 3].filter((i) => i !== currentQ.correctIndex);
    const shuffled = wrongIndices.sort(() => 0.5 - Math.random());
    setHiddenOptions([shuffled[0], shuffled[1]]);
    setUsed5050(true);
  };

  // Lifeline Dr. Belal
  const handleUseDrBelal = () => {
    if (usedDrBelal || isAnswered) return;
    playSound("click", isSoundEnabled);
    setShowDrBelalTip(true);
    setUsedDrBelal(true);
  };

  // Lifeline Audience Poll
  const handleUseAudience = () => {
    if (usedAudience || isAnswered) return;
    playSound("click", isSoundEnabled);
    const questions = millionaireQuestionsList;
    const currentQ = questions[currentQIndex] || MILLIONAIRE_QUESTIONS_BY_LEVEL[selectedLevel][0];
    const poll = [0, 0, 0, 0];
    const correctIdx = currentQ.correctIndex;
    poll[correctIdx] = Math.floor(Math.random() * 25) + 60; // 60-85%
    let remaining = 100 - poll[correctIdx];
    
    [0, 1, 2, 3].forEach((i) => {
      if (i !== correctIdx) {
        const share = Math.floor(Math.random() * remaining);
        poll[i] = share;
        remaining -= share;
      }
    });
    poll[correctIdx] += remaining;
    setAudiencePoll(poll);
    setUsedAudience(true);
  };

  // Answer Millionaire
  const handleAnswerMillionaire = (index: number) => {
    if (isAnswered) return;
    setSelectedOpt(index);
    setIsAnswered(true);

    playSound("click", isSoundEnabled);
    playMillionaireTheme(isSoundEnabled);

    const questions = millionaireQuestionsList;
    const currentQ = questions[currentQIndex] || MILLIONAIRE_QUESTIONS_BY_LEVEL[selectedLevel][0];

    if (index === currentQ.correctIndex) {
      playSound("correct", isSoundEnabled);
      playMillionaireTheme(isSoundEnabled);

      const currentPrize = PRIZE_LADDER[currentQIndex];
      setWinAmount(currentPrize);
      
      if (currentPrize === 1000) setGuaranteedAmount(1000);
      if (currentPrize === 32000) setGuaranteedAmount(32000);

      setTimeout(() => {
        if (currentQIndex + 1 < questions.length) {
          setCurrentQIndex((prev) => prev + 1);
          setSelectedOpt(null);
          setIsAnswered(false);
          setHiddenOptions([]);
          setShowDrBelalTip(false);
          setAudiencePoll(null);
        } else {
          setWinAmount(1000000);
          setIsGameEnded(true);
          playMillionaireTheme(isSoundEnabled);
        }
      }, 2000);
    } else {
      playSound("wrong", isSoundEnabled);
      setTimeout(() => {
        setIsGameEnded(true);
      }, 2000);
    }
  };

  // Reset Speed Match
  const startSpeedMatch = (lvl = selectedLevel) => {
    setSelectedLevel(lvl);
    setSpeedIndex(0);
    setSpeedScore(0);
    setSpeedStreak(0);
    setSpeedShowResult(false);
    setLastUserChoice(null);
    setSpeedGameOver(false);
    setActiveGame("speed");
  };

  const handleSpeedAnswer = (choiceDangerous: boolean) => {
    if (speedShowResult) return;
    setLastUserChoice(choiceDangerous);
    setSpeedShowResult(true);

    const pairs = INTERACTION_PAIRS_BY_LEVEL[selectedLevel];
    const currentPair = pairs[speedIndex];
    const isCorrect = choiceDangerous === currentPair.isDangerous;

    playSound(isCorrect ? "correct" : "wrong", isSoundEnabled);

    if (isCorrect) {
      setSpeedScore((prev) => prev + 100 + speedStreak * 20);
      setSpeedStreak((prev) => prev + 1);
    } else {
      setSpeedStreak(0);
    }
  };

  const handleNextSpeedPair = () => {
    const pairs = INTERACTION_PAIRS_BY_LEVEL[selectedLevel];
    if (speedIndex + 1 < pairs.length) {
      setSpeedIndex((prev) => prev + 1);
      setSpeedShowResult(false);
      setLastUserChoice(null);
    } else {
      setSpeedGameOver(true);
    }
  };

  // Reset Mystery
  const startMystery = (lvl = selectedLevel) => {
    setSelectedLevel(lvl);
    const pool = MOLECULE_MYSTERIES_BY_LEVEL[lvl] || MOLECULE_MYSTERIES_BY_LEVEL.beginner;
    const shuffled = [...pool].sort(() => 0.5 - Math.random()).map(shuffleMoleculeMystery);
    setActiveMysteriesList(shuffled);
    setMysteryIndex(0);
    setCluesRevealed(1);
    setMysteryScore(0);
    setMysterySelected(null);
    setMysteryAnswered(false);
    setMysteryGameOver(false);
    setActiveGame("mystery");
  };

  const handleRevealClue = () => {
    if (cluesRevealed < 3) {
      setCluesRevealed((prev) => prev + 1);
    }
  };

  const handleMysteryAnswer = (index: number) => {
    if (mysteryAnswered) return;
    setMysterySelected(index);
    setMysteryAnswered(true);

    const mysteries = activeMysteriesList;
    const currentM = mysteries[mysteryIndex] || MOLECULE_MYSTERIES_BY_LEVEL[selectedLevel][0];
    const isCorrect = index === currentM.correctIndex;

    playSound(isCorrect ? "correct" : "wrong", isSoundEnabled);

    if (isCorrect) {
      const added = cluesRevealed === 1 ? 300 : cluesRevealed === 2 ? 200 : 100;
      setMysteryScore((prev) => prev + added);
    }
  };

  const handleNextMystery = () => {
    const mysteries = activeMysteriesList;
    if (mysteryIndex + 1 < mysteries.length) {
      setMysteryIndex((prev) => prev + 1);
      setCluesRevealed(1);
      setMysterySelected(null);
      setMysteryAnswered(false);
    } else {
      setMysteryGameOver(true);
    }
  };

  const currentLevelDetails = DIFFICULTY_STAGES.find((s) => s.id === selectedLevel) || DIFFICULTY_STAGES[0];

  return (
    <div className="space-y-6">
      {/* Top Header & Branding */}
      <div className="rounded-2xl border border-teal-100 bg-gradient-to-r from-teal-900 via-slate-900 to-cyan-950 p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-teal-500/10 blur-2xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 rounded-full bg-teal-500/20 px-3 py-1 text-2xs font-bold text-teal-300 border border-teal-400/30">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              المركز المعتمد لاختبارات مزاولة المهنة الطبية والصيدلانية
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
              سلة اختبار مزاولة المهنة الطبية 🩺📋
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              بنوك أسئلة واختبارات محاكية لاختبارات مزاولة المهنة الطبية والصيدلانية (هيئة التخصصات الصحية SCFHS، بروميتريك Prometric، والبورد المهني) مع تقييم دقيق وشرح سريري متقدم.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSoundEnabled(!isSoundEnabled)}
              className={`flex items-center gap-2 border px-3.5 py-2.5 rounded-xl font-black text-xs transition shadow-md cursor-pointer ${
                isSoundEnabled
                  ? "bg-teal-500/25 border-teal-400/50 text-teal-200 hover:bg-teal-500/35"
                  : "bg-slate-800/80 border-slate-600 text-slate-400 hover:bg-slate-800"
              }`}
              title={isSoundEnabled ? "كتم المؤثرات الصوتية وصوت جورج قرداحي" : "تشغيل المؤثرات الصوتية وصوت جورج قرداحي"}
            >
              <span>{isSoundEnabled ? "🔊 الصوت مفعل (جورج قرداحي)" : "🔇 الصوت مكتوم"}</span>
            </button>

            <button
              onClick={() => setShowHowToPlayModal(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-400/40 text-amber-200 px-3.5 py-2.5 rounded-xl font-black text-xs transition shadow-md cursor-pointer"
            >
              <Lightbulb className="h-4 w-4 text-amber-400 animate-pulse" />
              <span>كيفية وقواعد الألعاب 📖</span>
            </button>

            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/10 shrink-0">
              <div className="h-10 w-10 rounded-full bg-teal-500 text-white flex items-center justify-center font-bold text-sm shadow-md">
                👨‍⚕️
              </div>
              <div className="text-right">
                <span className="block text-2xs text-teal-300 font-semibold">إشراف وإعداد علمي:</span>
                <span className="block text-xs font-extrabold text-white">فريق الإشراف الطبي</span>
                <span className="block text-3xs text-slate-300">قسم المسابقات التفاعلية</span>
              </div>
            </div>
          </div>
        </div>

        {activeGame !== "menu" && (
          <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveGame("menu")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-bold text-white transition-all cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
                العودة لقائمة الألعاب
              </button>

              <button
                onClick={() => openLevelSelector(activeGame)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/20 border border-amber-400/40 hover:bg-amber-500/30 px-3 py-1.5 text-xs font-bold text-amber-300 transition-all cursor-pointer"
              >
                <Layers className="h-3.5 w-3.5" />
                تغيير المستوى ({currentLevelDetails.badge})
              </button>
            </div>

            <span className="text-2xs text-slate-300 font-extrabold flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-full">
              المستوى الحالي: {currentLevelDetails.title} {currentLevelDetails.icon}
            </span>
          </div>
        )}
      </div>

      {/* GAME MENU SCREEN */}
      {activeGame === "menu" && (
        <div className="space-y-6">
          {/* Professional Licensing Exam Basket Banner */}
          <div className="rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 via-cyan-50 to-emerald-50 p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md font-bold text-lg shrink-0">
                📋
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-teal-900">سلة اختبارات مزاولة المهنة والترخيص (Board & Licensing Exam Basket)</span>
                  <span className="bg-teal-600 text-white text-3xs font-extrabold px-2 py-0.5 rounded-full">معتمدة</span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  أسئلة محاكية تماماً لاختبارات هيئة التخصصات الصحية (SCFHS)، بروميتريك (Prometric)، وبورد الصيدلة السريرية مع الشرح العلمي والتقييم الفوري.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="bg-white px-3 py-1.5 rounded-xl border border-teal-200 text-xs font-bold text-teal-800 shadow-2xs">
                🎯 نسبة النجاح المطلوبة: 65%
              </span>
            </div>
          </div>

          {/* Global Stage Selector Tabs */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-teal-600" />
                <h3 className="text-xs font-black text-slate-900">اختر المرحلة أو مستوى الصعوبة المفضل لديك:</h3>
              </div>
              <span className="text-3xs text-teal-700 font-extrabold bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                4 مراحل متدرجة
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {DIFFICULTY_STAGES.map((stage, idx) => {
                const isSelected = selectedLevel === stage.id;
                return (
                  <button
                    key={`stage-sel-${stage.id || 's'}-${idx}`}
                    onClick={() => setSelectedLevel(stage.id)}
                    className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? `${stage.border} bg-gradient-to-br ${stage.bgGrad} shadow-sm ring-2 ring-teal-500/30`
                        : "border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{stage.icon}</span>
                      <span className={`text-3xs font-extrabold px-2 py-0.5 rounded-full ${isSelected ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-700"}`}>
                        {stage.badge}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-slate-900">{stage.title}</span>
                      <span className="block text-3xs text-slate-500 mt-0.5 line-clamp-1">{stage.description}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Millionaire */}
            <motion.div
              whileHover={{ y: -4 }}
              className="rounded-2xl border border-amber-200 bg-gradient-to-b from-amber-50/80 to-amber-100/30 p-6 flex flex-col justify-between shadow-md relative overflow-hidden"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/30">
                    <Trophy className="h-6 w-6" />
                  </div>
                  <span className="rounded-full bg-amber-200/80 px-2.5 py-1 text-3xs font-extrabold text-amber-900 border border-amber-300">
                    الأكثر شعبية 🔥
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900">من سيربح المليون الصيدلانية 💰</h3>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    15 سؤالاً متدرجاً في علم الأدوية! استخدم وسائل المساعدة (50:50، نصيحة الخبير الطبي، وتصويت الصيادلة) للوصول للمليون.
                  </p>
                </div>

                <div className="space-y-1.5 text-2xs font-semibold text-slate-700 bg-white/80 p-3 rounded-xl border border-amber-100">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">المرحلة المختارة:</span>
                    <span className="font-extrabold text-amber-800">{currentLevelDetails.title} {currentLevelDetails.icon}</span>
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-amber-600" />
                    <span>أسئلة متخصصة بحسب المرحلة المختارة</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mt-6">
                <button
                  onClick={() => startMillionaire(selectedLevel)}
                  className="w-full rounded-xl bg-gradient-to-r from-amber-600 to-yellow-500 py-3 text-xs font-bold text-white shadow-md transition-all hover:brightness-105 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="h-4 w-4" />
                  ابدأ لعبة المليون ({currentLevelDetails.badge})
                </button>
                <button
                  onClick={() => openLevelSelector("millionaire")}
                  className="w-full rounded-xl border border-amber-300 bg-amber-50 py-2 text-3xs font-extrabold text-amber-900 hover:bg-amber-100 transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Layers className="h-3.5 w-3.5" />
                  تغيير المرحلة قبل البدء
                </button>
              </div>
            </motion.div>

            {/* Card 2: Interaction Matcher */}
            <motion.div
              whileHover={{ y: -4 }}
              className="rounded-2xl border border-rose-200 bg-gradient-to-b from-rose-50/80 to-rose-100/30 p-6 flex flex-col justify-between shadow-md relative overflow-hidden"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-lg shadow-rose-600/30">
                    <Zap className="h-6 w-6" />
                  </div>
                  <span className="rounded-full bg-rose-200/80 px-2.5 py-1 text-3xs font-extrabold text-rose-900 border border-rose-300">
                    تحدي السرعة ⚡
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900">تحدي كشف التداخل الدوائي ⚡</h3>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    يتم إظهار علاجين معاً، هل يمكنك اتخاذ القرار السريع؟ حدد فوراً إذا كان التجمع خطيراً وممنوعاً أو آمناً!
                  </p>
                </div>

                <div className="space-y-1.5 text-2xs font-semibold text-slate-700 bg-white/80 p-3 rounded-xl border border-rose-100">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">المرحلة المختارة:</span>
                    <span className="font-extrabold text-rose-800">{currentLevelDetails.title} {currentLevelDetails.icon}</span>
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-rose-600" />
                    <span>تداخلات سريرية تناسب مستواك العلمي</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mt-6">
                <button
                  onClick={() => startSpeedMatch(selectedLevel)}
                  className="w-full rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 py-3 text-xs font-bold text-white shadow-md transition-all hover:brightness-105 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="h-4 w-4" />
                  ابدأ تحدي التداخلات ({currentLevelDetails.badge})
                </button>
                <button
                  onClick={() => openLevelSelector("speed")}
                  className="w-full rounded-xl border border-rose-300 bg-rose-50 py-2 text-3xs font-extrabold text-rose-900 hover:bg-rose-100 transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Layers className="h-3.5 w-3.5" />
                  تغيير المرحلة قبل البدء
                </button>
              </div>
            </motion.div>

            {/* Card 3: Active Molecule Mystery */}
            <motion.div
              whileHover={{ y: -4 }}
              className="rounded-2xl border border-indigo-200 bg-gradient-to-b from-indigo-50/80 to-indigo-100/30 p-6 flex flex-col justify-between shadow-md relative overflow-hidden"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
                    <Brain className="h-6 w-6" />
                  </div>
                  <span className="rounded-full bg-indigo-200/80 px-2.5 py-1 text-3xs font-extrabold text-indigo-900 border border-indigo-300">
                    لغز علمي 🔍
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900">لغز المادة الفعالة والجرعة 🔍</h3>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    كشف تلميح تلو الآخر حول الدواء المخفي! كلما حزرت الدواء بتلميحات أقل، كلما حصدت درجات أعلى.
                  </p>
                </div>

                <div className="space-y-1.5 text-2xs font-semibold text-slate-700 bg-white/80 p-3 rounded-xl border border-indigo-100">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">المرحلة المختارة:</span>
                    <span className="font-extrabold text-indigo-800">{currentLevelDetails.title} {currentLevelDetails.icon}</span>
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />
                    <span>تلميحات كيميائية وفق المستوى المختار</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mt-6">
                <button
                  onClick={() => startMystery(selectedLevel)}
                  className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3 text-xs font-bold text-white shadow-md transition-all hover:brightness-105 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="h-4 w-4" />
                  ابدأ لغز الدواء ({currentLevelDetails.badge})
                </button>
                <button
                  onClick={() => openLevelSelector("mystery")}
                  className="w-full rounded-xl border border-indigo-300 bg-indigo-50 py-2 text-3xs font-extrabold text-indigo-900 hover:bg-indigo-100 transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Layers className="h-3.5 w-3.5" />
                  تغيير المرحلة قبل البدء
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* LEVEL SELECTOR MODAL */}
      <AnimatePresence>
        {isLevelModalOpen && (
          <motion.div
            key="pharma-level-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
          >
            <motion.div
              key="pharma-level-modal-panel"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">اختر مرحلة ومستوى الصعوبة 🎯</h3>
                    <p className="text-3xs text-slate-500">حدد المستوى للبدء بالأسئلة والتحديات المناسبة لك</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsLevelModalOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2.5">
                {DIFFICULTY_STAGES.map((stage, idx) => (
                  <button
                    key={`stage-modal-${stage.id || 'sm'}-${idx}`}
                    onClick={() => confirmStartGameWithLevel(stage.id)}
                    className={`w-full p-4 rounded-xl border text-right transition-all flex items-start gap-3 cursor-pointer hover:scale-[1.01] ${stage.border} bg-gradient-to-r ${stage.bgGrad}`}
                  >
                    <span className="text-2xl mt-0.5">{stage.icon}</span>
                    <div className="space-y-0.5 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900">{stage.title}</span>
                        <span className="text-3xs font-extrabold px-2 py-0.5 rounded-full bg-slate-900 text-white">
                          {stage.badge}
                        </span>
                      </div>
                      <p className="text-3xs text-slate-600 leading-relaxed">{stage.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HOW TO PLAY & RULES MODAL (كيفية الألعاب) */}
      <AnimatePresence>
        {showHowToPlayModal && (
          <motion.div
            key="pharma-how-to-play-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto"
          >
            <motion.div
              key="pharma-how-to-play-panel"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden text-right"
            >
              {/* Modal Header */}
              <div className="p-5 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white flex items-center justify-between border-b border-white/10 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black">دليل وقواعد سلة الألعاب الطبية 🧺🎮</h3>
                    <p className="text-3xs text-slate-300">كيف تلعب، تجمع النقاط، وتستفيد من وسائل المساعدة</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowHowToPlayModal(false)}
                  className="rounded-full h-8 w-8 bg-white/10 hover:bg-white/20 text-slate-200 flex items-center justify-center transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Modal Content Scrollable */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 text-xs">
                
                {/* 1. General flow */}
                <div className="rounded-2xl bg-teal-50 border border-teal-200 p-4 space-y-2">
                  <h4 className="font-extrabold text-teal-900 text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-teal-600" />
                    الخطوات الأساسية لبدء أي لعبة:
                  </h4>
                  <ul className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-3xs font-medium text-teal-950 pt-1">
                    <li className="bg-white/80 p-2.5 rounded-xl border border-teal-100 space-y-1">
                      <span className="font-black text-teal-700 block">1️⃣ اختر المستوى:</span>
                      <span>حدد درجة الصعوبة (مبتدئ، متوسط، متقدم، محترف) لتخصيص بنك الأسئلة.</span>
                    </li>
                    <li className="bg-white/80 p-2.5 rounded-xl border border-teal-100 space-y-1">
                      <span className="font-black text-teal-700 block">2️⃣ ابدأ التحدي:</span>
                      <span>اقرأ الحالة أو الدواء بتركيز وفكّر في الخيارات المطروحة.</span>
                    </li>
                    <li className="bg-white/80 p-2.5 rounded-xl border border-teal-100 space-y-1">
                      <span className="font-black text-teal-700 block">3️⃣ وسائل المساعدة:</span>
                      <span>استعن بالمساعدات المتاحة عند الحيرة لحماية رصيدك من النقاط.</span>
                    </li>
                  </ul>
                </div>

                {/* 2. Three Games Explained */}
                <div className="space-y-4">
                  <h4 className="font-black text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    شرح أنماط وقواعد الألعاب الثلاث:
                  </h4>

                  {/* Game 1 */}
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-6 w-6 rounded-lg bg-amber-500 text-white font-black text-xs flex items-center justify-center">1</span>
                        <h5 className="font-black text-slate-900 text-xs">من سيربح المليون الصيدلانية 💰</h5>
                      </div>
                      <span className="text-3xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">15 سؤالاً متدرجاً</span>
                    </div>
                    <p className="text-3xs text-slate-600 leading-relaxed">
                      مسابقة تفاعلية تحاكي البرنامج الشهير. تجيب على 15 سؤالاً دوائياً متصاعد الصعوبة للوصول إلى جائزة المليون الافتراضية.
                    </p>
                    <div className="bg-white p-3 rounded-xl border border-amber-200 space-y-1.5 text-3xs">
                      <span className="font-extrabold text-amber-900 block">💡 وسائل المساعدة المتاحة (مرة واحدة لكل مسابقة):</span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-700">
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                          <strong className="text-amber-700 block mb-0.5">50:50 (حذف إجابتين)</strong>
                          يحذف النظام خيارين خاطئين ويتبقى خياران فقط.
                        </div>
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                          <strong className="text-teal-700 block mb-0.5">نصيحة د/ بلال</strong>
                          تلميح علمي وسريري ذكي يرشدك نحو الإجابة الصحيحة.
                        </div>
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                          <strong className="text-sky-700 block mb-0.5">تصويت الصيادلة</strong>
                          استطلاع افتراضي لآراء مجتمع الصيادلة والأطباء.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Game 2 */}
                  <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-6 w-6 rounded-lg bg-rose-500 text-white font-black text-xs flex items-center justify-center">2</span>
                        <h5 className="font-black text-slate-900 text-xs">تحدي التداخلات السريعة (آمن أم خطير؟) ⚡</h5>
                      </div>
                      <span className="text-3xs font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full">سرعة وبديهة</span>
                    </div>
                    <p className="text-3xs text-slate-600 leading-relaxed">
                      يُعرض عليك ثنائي دوائي (Drug-Drug Interaction) أو دواء مع حالة مرضية خاصة. هدفك اتخاذ قرار فوري: هل الدمج <span className="font-bold text-emerald-700">"آمن ومقبول"</span> أم <span className="font-bold text-rose-700">"خطير وممنوع"</span>؟
                    </p>
                    <div className="bg-white p-2.5 rounded-xl border border-rose-200 text-3xs text-slate-700">
                      <span className="font-extrabold text-rose-900 block mb-1">🔥 نظام النقاط المتتالية (Streak):</span>
                      كل إجابة صحيحة متتالية تضاعف نقاطك، مع عرض الشرح السريري المعتمد فور الإجابة لتثبيت المعلومة.
                    </div>
                  </div>

                  {/* Game 3 */}
                  <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-6 w-6 rounded-lg bg-indigo-500 text-white font-black text-xs flex items-center justify-center">3</span>
                        <h5 className="font-black text-slate-900 text-xs">لغز الدواء الخفي (Mystery Drug) 🕵️‍♂️</h5>
                      </div>
                      <span className="text-3xs font-bold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded-full">تفكير واستنتاج</span>
                    </div>
                    <p className="text-3xs text-slate-600 leading-relaxed">
                      يتم إخفاء اسم الدواء وتُعطى تلميحات سريرية متتالية (الآلية، الاستخدام الأساسي، الأثر الجانبي المميز، التحذير السريري).
                    </p>
                    <div className="bg-white p-2.5 rounded-xl border border-indigo-200 text-3xs text-slate-700">
                      <span className="font-extrabold text-indigo-900 block mb-1">🎯 كيف تحصد أعلى نقاط؟</span>
                      كلما كشفت الدواء بتلميحات أقل (1 أو 2 فقط)، كلما حصدت النقاط الكاملة (+100 نقطة)! كشف مزيد من التلميحات يقلل النقاط المكتسبة.
                    </div>
                  </div>
                </div>

                {/* 3. Difficulty Stages Explanation */}
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-3">
                  <h4 className="font-black text-slate-900 text-xs flex items-center gap-2">
                    <Layers className="h-4 w-4 text-teal-600" />
                    مستويات الصعوبة الأربعة المتاحة:
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-3xs">
                    <div className="bg-white p-2 rounded-xl border border-emerald-200 text-right">
                      <span className="font-extrabold text-emerald-800 block">🌱 مبتدئ</span>
                      <span className="text-slate-500">أدوية شائعة واستخدامات عامة.</span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-teal-200 text-right">
                      <span className="font-extrabold text-teal-800 block">⚡ متوسط</span>
                      <span className="text-slate-500">جرعات، تفاعلات، وموانع الاستعمال.</span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-amber-200 text-right">
                      <span className="font-extrabold text-amber-800 block">🔬 متقدم</span>
                      <span className="text-slate-500">حالات سريرية ومعادلات كلوية.</span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-rose-200 text-right">
                      <span className="font-extrabold text-rose-800 block">🔥 محترف</span>
                      <span className="text-slate-500">علم السموم والأورام والتخصصات الدقيقة.</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
                <button
                  onClick={() => setShowHowToPlayModal(false)}
                  className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition cursor-pointer"
                >
                  إغلاق الدليل
                </button>

                <button
                  onClick={() => {
                    setShowHowToPlayModal(false);
                    openLevelSelector("millionaire");
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-teal-600 to-emerald-600 hover:brightness-110 text-white font-black text-xs text-center transition shadow-md shadow-teal-600/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="h-4 w-4" />
                  <span>فهمت القواعد، ابدأ اللعب الآن! 🚀</span>
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GAME 1: PHARMA MILLIONAIRE SCREEN */}
      {activeGame === "millionaire" && (
        <div className="space-y-6">
          {/* TV Studio Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 p-4 sm:p-5 text-white shadow-xl border border-amber-500/30 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center shadow-lg shadow-amber-500/30 text-slate-950 font-black text-xl">
                💰
              </div>
              <div>
                <span className="block text-3xs font-extrabold text-amber-400 tracking-wider">استوديو من سيربح المليون الطبيب الصيدلاني</span>
                <h3 className="text-base sm:text-lg font-black text-white">تقديم الإعلامي: د. جورج قرداحي 🎙️</h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-xl bg-amber-500/20 border border-amber-400/40 px-3 py-1.5 text-xs font-black text-amber-300">
                المستوى: {currentLevelDetails.title} ({currentLevelDetails.badge})
              </span>
              <button
                type="button"
                onClick={() => setActiveGame("menu")}
                className="rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 text-xs font-bold transition-all border border-slate-700 cursor-pointer"
              >
                العودة للقائمة
              </button>
            </div>
          </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Quiz Area */}
          <div className="lg:col-span-3 space-y-6">
            {!isGameEnded ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md space-y-6">
                {/* Header question progress & Lifelines */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 font-extrabold text-white text-xs">
                      {currentQIndex + 1}
                    </span>
                    <div>
                      <span className="block text-2xs text-slate-400 font-bold">السؤال الحالي ({currentLevelDetails.badge}):</span>
                      <span className="block text-xs font-bold text-slate-800">
                        قيمة السؤال: <span className="text-amber-600">${PRIZE_LADDER[currentQIndex].toLocaleString()}</span>
                      </span>
                    </div>
                  </div>

                  {/* Lifeline Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleUse5050}
                      disabled={used5050 || isAnswered}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                        used5050
                          ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through"
                          : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                      }`}
                      title="حذف إجابتين خاطئتين"
                    >
                      <span>50:50</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleUseDrBelal}
                      disabled={usedDrBelal || isAnswered}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                        usedDrBelal
                          ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through"
                          : "bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100"
                      }`}
                      title="نصيحة الخبير الطبي"
                    >
                      <Bot className="h-3.5 w-3.5 text-teal-600" />
                      <span>نصيحة الخبير</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleUseAudience}
                      disabled={usedAudience || isAnswered}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                        usedAudience
                          ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through"
                          : "bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100"
                      }`}
                      title="تصويت الجمهور الصيدلاني"
                    >
                      <Users className="h-3.5 w-3.5 text-indigo-600" />
                      <span>جمهور الصيادلة</span>
                    </button>
                  </div>
                </div>

                {/* Dr. Belal Tip Helper Box if triggered */}
                <AnimatePresence>
                  {showDrBelalTip && (
                    <motion.div
                      key={`dr-belal-tip-${selectedLevel}-${currentQIndex}`}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="rounded-xl border border-teal-200 bg-teal-50/70 p-4 flex items-start gap-3"
                    >
                      <img
                        src={repAvatar || drBelalProfileImg || "/app-logo.jpg"}
                        alt="د/ بلال القيسي"
                        className="h-10 w-10 rounded-full object-cover border-2 border-teal-500 shadow-sm shrink-0 ring-1 ring-teal-500/30"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = "/app-logo.jpg";
                        }}
                      />
                      <div className="space-y-0.5">
                        <span className="block text-xs font-extrabold text-teal-900">
                          تلميح وصية الخبير الطبي لك:
                        </span>
                        <p className="text-xs text-teal-800 leading-relaxed font-medium">
                          "{millionaireQuestionsList[currentQIndex]?.drBelalTip || MILLIONAIRE_QUESTIONS_BY_LEVEL[selectedLevel][0]?.drBelalTip}"
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Audience Poll Graph if triggered */}
                {audiencePoll && (
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-2">
                    <span className="block text-xs font-extrabold text-indigo-900 flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-indigo-600" />
                      نتائج تصويت عيّنة الصيادلة والأطباء:
                    </span>
                    <div className="grid grid-cols-4 gap-2 text-center pt-1">
                      {["أ", "ب", "ج", "د"].map((label, idx) => (
                        <div key={`poll-${label}-${idx}`} className="space-y-1">
                          <div className="h-16 bg-slate-200 rounded-lg relative overflow-hidden flex items-end">
                            <div
                              className="w-full bg-indigo-600 transition-all duration-500"
                              style={{ height: `${audiencePoll[idx]}%` }}
                            />
                          </div>
                          <span className="block text-3xs font-bold text-slate-700">
                            {label}: {audiencePoll[idx]}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Question Box */}
                <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-cyan-950 p-6 text-white text-center shadow-lg relative overflow-hidden border border-slate-800">
                  <span className="inline-block rounded-full bg-amber-500/20 px-3 py-0.5 text-3xs font-bold text-amber-300 mb-2 border border-amber-500/30">
                    السؤال رقم {currentQIndex + 1} من {millionaireQuestionsList.length} ({currentLevelDetails.title})
                  </span>
                  <h3 className="text-base md:text-lg font-bold leading-relaxed">
                    {(millionaireQuestionsList[currentQIndex] || MILLIONAIRE_QUESTIONS_BY_LEVEL[selectedLevel][0]).question}
                  </h3>
                </div>

                {/* Options Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(millionaireQuestionsList[currentQIndex] || MILLIONAIRE_QUESTIONS_BY_LEVEL[selectedLevel][0]).options.map((opt, idx) => {
                    const optionLabels = ["أ", "ب", "ج", "د"];
                    const isHidden = hiddenOptions.includes(idx);
                    const currentQ = millionaireQuestionsList[currentQIndex] || MILLIONAIRE_QUESTIONS_BY_LEVEL[selectedLevel][0];
                    const isCorrect = idx === currentQ.correctIndex;
                    const isSelected = selectedOpt === idx;

                    let btnStyle = "border-slate-200 bg-slate-50 text-slate-800 hover:bg-teal-50 hover:border-teal-300";

                    if (isAnswered) {
                      if (isCorrect) {
                        btnStyle = "border-emerald-500 bg-emerald-50 text-emerald-900 font-bold ring-2 ring-emerald-400";
                      } else if (isSelected && !isCorrect) {
                        btnStyle = "border-rose-500 bg-rose-50 text-rose-900 font-bold ring-2 ring-rose-400";
                      } else {
                        btnStyle = "border-slate-200 bg-slate-100 text-slate-400 opacity-50";
                      }
                    }

                    if (isHidden) {
                      return (
                        <div key={`mopt-hidden-${selectedLevel}-${currentQIndex}-${idx}`} className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-slate-300 text-xs font-bold text-center">
                          محذوف بمساعدة 50:50
                        </div>
                      );
                    }

                    return (
                      <motion.button
                        key={`mopt-btn-${selectedLevel}-${currentQIndex}-${idx}`}
                        type="button"
                        onClick={() => handleAnswerMillionaire(idx)}
                        disabled={isAnswered}
                        whileHover={!isAnswered ? { scale: 1.02, backgroundColor: "#f0fdf4" } : {}}
                        whileTap={!isAnswered ? { scale: 0.98 } : {}}
                        animate={
                          isAnswered && isCorrect
                            ? { scale: [1, 1.05, 1], backgroundColor: ["#ecfdf5", "#10b981", "#ecfdf5"] }
                            : isAnswered && isSelected && !isCorrect
                            ? { x: [0, -8, 8, -8, 8, 0], backgroundColor: ["#fff1f2", "#f43f5e", "#fff1f2"] }
                            : {}
                        }
                        transition={{ duration: 0.4 }}
                        className={`p-4 rounded-xl border text-right transition-all flex items-center gap-3 cursor-pointer shadow-sm ${btnStyle}`}
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-200 font-extrabold text-slate-700 text-xs shadow-inner">
                          {optionLabels[idx]}
                        </span>
                        <span className="text-xs font-bold leading-relaxed">{opt}</span>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Explanation on Answered */}
                {isAnswered && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl border text-xs leading-relaxed space-y-1 ${
                      selectedOpt === (millionaireQuestionsList[currentQIndex] || MILLIONAIRE_QUESTIONS_BY_LEVEL[selectedLevel][0]).correctIndex
                        ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                        : "bg-rose-50 border-rose-200 text-rose-900"
                    }`}
                  >
                    <span className="font-extrabold block">
                      {selectedOpt === (millionaireQuestionsList[currentQIndex] || MILLIONAIRE_QUESTIONS_BY_LEVEL[selectedLevel][0]).correctIndex
                        ? "إجابة ممتازة وصحيحة! 👏"
                        : "إجابة خاطئة! الإجابة الصحيحة موضحة بالأخضر."}
                    </span>
                    <p>{(millionaireQuestionsList[currentQIndex] || MILLIONAIRE_QUESTIONS_BY_LEVEL[selectedLevel][0]).explanation}</p>
                  </motion.div>
                )}
              </div>
            ) : (
              /* GAME END SUMMARY */
              <div className="rounded-2xl border border-amber-200 bg-white p-8 text-center space-y-6 shadow-xl">
                <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 text-white shadow-xl shadow-amber-500/30">
                  <Trophy className="h-10 w-10 animate-bounce" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-slate-900">
                    {winAmount === 1000000 ? "🎉 مبروك! لقد أصبحت مليونير الصيدلة العلمية!" : "انتهت الجولة العلمية الممتعة!"}
                  </h3>
                  <p className="text-sm text-slate-600">
                    رصيدك النهائي الفائز في مسابقة المليون ({currentLevelDetails.title}):
                  </p>
                  <div className="inline-block rounded-2xl bg-slate-900 px-6 py-3 text-2xl font-black text-amber-400 shadow-md">
                    ${winAmount.toLocaleString()}
                  </div>
                </div>

                {/* Dr. Belal Certificate Badge */}
                <div className="max-w-md mx-auto rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 to-cyan-50 p-5 text-right space-y-2 shadow-sm">
                  <div className="flex items-center justify-between border-b border-teal-100 pb-2">
                    <span className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                      <Medal className="h-4 w-4 text-amber-500" />
                      وسام التكريم العلمي المعترف به
                    </span>
                    <span className="text-3xs text-teal-600 font-extrabold">تطبيق مندوبك الطبي</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    تشهد إدارة تطبيق مندوبك الطبي بكفاءتكم العالية والمعرفية الممتازة في أداء مرحلة ({currentLevelDetails.badge}).
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => startMillionaire(selectedLevel)}
                    className="rounded-xl bg-amber-500 px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-amber-600 transition-all cursor-pointer flex items-center gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    المحاولة مجدداً
                  </button>
                  <button
                    onClick={() => setActiveGame("menu")}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-3 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                  >
                    القائمة الرئيسية
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Prize Ladder Sidebar */}
          <div className="rounded-2xl border border-slate-200 bg-slate-900 p-5 text-white space-y-4 shadow-md">
            <h4 className="text-xs font-extrabold text-amber-400 border-b border-slate-800 pb-2 text-center flex items-center justify-center gap-1.5">
              <Trophy className="h-4 w-4" />
              سلم جوائز المليون
            </h4>

            <div className="space-y-1 text-xs">
              {PRIZE_LADDER.slice().reverse().map((amount, idx) => {
                const originalIdx = 14 - idx;
                const isCurrent = currentQIndex === originalIdx && !isGameEnded;
                const isPassed = currentQIndex > originalIdx;
                const isSafeLevel = originalIdx === 4 || originalIdx === 9 || originalIdx === 14;

                let textStyle = "text-slate-400";
                if (isCurrent) textStyle = "bg-amber-500 text-slate-950 font-black rounded-lg px-2.5 py-1 shadow-md scale-105";
                else if (isPassed) textStyle = "text-emerald-400 font-bold";
                else if (isSafeLevel) textStyle = "text-white font-bold";

                return (
                  <div
                    key={`prize-${selectedLevel}-${originalIdx}`}
                    className={`flex items-center justify-between py-1 px-2 rounded transition-all ${textStyle}`}
                  >
                    <span className="text-3xs font-bold opacity-80">
                      {originalIdx + 1}
                    </span>
                    <span>${amount.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* GAME 2: SPEED DRUG INTERACTION MATCH */}
      {activeGame === "speed" && (
        <div className="max-w-2xl mx-auto space-y-6">
          {!speedGameOver ? (
            <div className="rounded-2xl border border-rose-200 bg-white p-6 shadow-md space-y-6">
              {/* Header Score & Streak */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-rose-600" />
                  <span className="text-xs font-bold text-slate-800">
                    السؤال {speedIndex + 1} من {INTERACTION_PAIRS_BY_LEVEL[selectedLevel].length} ({currentLevelDetails.badge})
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-left">
                    <span className="block text-3xs text-slate-400 font-bold">النقاط:</span>
                    <span className="block text-sm font-black text-rose-600">{speedScore}</span>
                  </div>
                  <div className="text-left bg-rose-50 px-3 py-1 rounded-xl border border-rose-100">
                    <span className="block text-3xs text-rose-700 font-bold flex items-center gap-1">
                      <Flame className="h-3 w-3 text-rose-600" />
                      الإنجاز المتتالي:
                    </span>
                    <span className="block text-xs font-black text-rose-800 text-center">{speedStreak}</span>
                  </div>
                </div>
              </div>

              {/* Pair Card Display */}
              <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-rose-950 p-6 text-white text-center space-y-4 shadow-lg border border-rose-900/40">
                <span className="inline-block rounded-full bg-rose-500/20 px-3 py-0.5 text-3xs font-bold text-rose-300 border border-rose-500/30">
                  هل التزامن والجمع بين العلاجين التاليين خطير أم آمن؟
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/15">
                    <span className="block text-3xs text-slate-300 font-semibold mb-1">الدواء الأول:</span>
                    <span className="block text-sm font-extrabold text-teal-300">
                      {INTERACTION_PAIRS_BY_LEVEL[selectedLevel][speedIndex].drugA}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/15">
                    <span className="block text-3xs text-slate-300 font-semibold mb-1">الدواء الثاني:</span>
                    <span className="block text-sm font-extrabold text-cyan-300">
                      {INTERACTION_PAIRS_BY_LEVEL[selectedLevel][speedIndex].drugB}
                    </span>
                  </div>
                </div>
              </div>

              {/* Choice Buttons */}
              {!speedShowResult ? (
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleSpeedAnswer(true)}
                    className="p-5 rounded-2xl border-2 border-rose-200 bg-rose-50 text-rose-900 hover:bg-rose-100 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95"
                  >
                    <ShieldAlert className="h-8 w-8 text-rose-600" />
                    <span className="text-xs font-black">تفاعل خطير / يُمنع التزامن ⚠️</span>
                  </button>

                  <button
                    onClick={() => handleSpeedAnswer(false)}
                    className="p-5 rounded-2xl border-2 border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95"
                  >
                    <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                    <span className="text-xs font-black">آمن ولا يوجد تعارض 🟢</span>
                  </button>
                </div>
              ) : (
                /* Result & Clinical Explanation */
                <div className="space-y-4">
                  <div
                    className={`p-5 rounded-2xl border text-right space-y-2 ${
                      lastUserChoice === INTERACTION_PAIRS_BY_LEVEL[selectedLevel][speedIndex].isDangerous
                        ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                        : "bg-rose-50 border-rose-200 text-rose-900"
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-black/5 pb-2">
                      <span className="font-extrabold text-xs flex items-center gap-1.5">
                        {lastUserChoice === INTERACTION_PAIRS_BY_LEVEL[selectedLevel][speedIndex].isDangerous ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            إجابة دقيقة وسريعة! (+100 نقطة)
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 text-rose-600" />
                            خطأ! خيار غير صحيح.
                          </>
                        )}
                      </span>
                      <span className="text-3xs font-bold px-2 py-0.5 rounded-full bg-white/80">
                        درجة الخطورة: {INTERACTION_PAIRS_BY_LEVEL[selectedLevel][speedIndex].severity}
                      </span>
                    </div>

                    <p className="text-xs leading-relaxed font-medium">
                      {INTERACTION_PAIRS_BY_LEVEL[selectedLevel][speedIndex].explanation}
                    </p>
                  </div>

                  <button
                    onClick={handleNextSpeedPair}
                    className="w-full rounded-xl bg-rose-600 py-3 text-xs font-bold text-white shadow-md hover:bg-rose-700 transition-all cursor-pointer"
                  >
                    الانتقال للتحدي التالي
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center space-y-6 shadow-xl">
              <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-rose-600 text-white shadow-lg">
                <Award className="h-8 w-8" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-900">انتهت الجولة السريعة!</h3>
                <p className="text-xs text-slate-600">إجمالي النقاط في مرحلة ({currentLevelDetails.title}):</p>
                <div className="inline-block rounded-2xl bg-rose-600 px-6 py-2.5 text-xl font-black text-white shadow-md">
                  {speedScore} نقطة
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => startSpeedMatch(selectedLevel)}
                  className="rounded-xl bg-rose-600 px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-rose-700 transition-all cursor-pointer"
                >
                  إعادة التحدي
                </button>
                <button
                  onClick={() => setActiveGame("menu")}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-3 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  القائمة الرئيسية
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* GAME 3: ACTIVE MOLECULE MYSTERY */}
      {activeGame === "mystery" && (
        <div className="max-w-2xl mx-auto space-y-6">
          {!mysteryGameOver ? (
            <div className="rounded-2xl border border-indigo-200 bg-white p-6 shadow-md space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-800">
                    اللغز {mysteryIndex + 1} من {activeMysteriesList.length} ({currentLevelDetails.badge})
                  </span>
                </div>

                <div className="text-left">
                  <span className="block text-3xs text-slate-400 font-bold">نقاط الألغاز:</span>
                  <span className="block text-sm font-black text-indigo-600">{mysteryScore}</span>
                </div>
              </div>

              {/* Clues Container */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  التلميحات المكشوفة للدواء المجهول:
                </span>

                <div className="space-y-2">
                  {(activeMysteriesList[mysteryIndex] || MOLECULE_MYSTERIES_BY_LEVEL[selectedLevel][0]).clues.slice(0, cluesRevealed).map((clue, idx) => (
                    <motion.div
                      key={`clue-${selectedLevel}-${mysteryIndex}-${idx}`}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs font-medium text-indigo-950 flex items-start gap-2.5"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-3xs mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed">{clue}</span>
                    </motion.div>
                  ))}
                </div>

                {cluesRevealed < 3 && !mysteryAnswered && (
                  <button
                    onClick={handleRevealClue}
                    className="w-full py-2.5 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/30 text-indigo-700 text-2xs font-bold hover:bg-indigo-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                    كشف التلميح التالي (يُقلل النقاط المكافأة)
                  </button>
                )}
              </div>

              {/* Options */}
              <div className="space-y-2 pt-2">
                <span className="text-2xs font-bold text-slate-500 block">
                  اختر المادة الفعالة أو الاسم العلمي الصحيح:
                </span>

                <div className="grid grid-cols-2 gap-3">
                  {(activeMysteriesList[mysteryIndex] || MOLECULE_MYSTERIES_BY_LEVEL[selectedLevel][0]).options.map((opt, idx) => {
                    const currentM = activeMysteriesList[mysteryIndex] || MOLECULE_MYSTERIES_BY_LEVEL[selectedLevel][0];
                    const isCorrect = idx === currentM.correctIndex;
                    const isSelected = mysterySelected === idx;

                    let btnStyle = "border-slate-200 bg-slate-50 text-slate-800 hover:bg-indigo-50 hover:border-indigo-300";

                    if (mysteryAnswered) {
                      if (isCorrect) {
                        btnStyle = "border-emerald-500 bg-emerald-50 text-emerald-900 font-bold";
                      } else if (isSelected && !isCorrect) {
                        btnStyle = "border-rose-500 bg-rose-50 text-rose-900 font-bold";
                      } else {
                        btnStyle = "border-slate-200 bg-slate-100 text-slate-400 opacity-50";
                      }
                    }

                    return (
                      <button
                        key={`myopt-${selectedLevel}-${mysteryIndex}-${idx}`}
                        onClick={() => handleMysteryAnswer(idx)}
                        disabled={mysteryAnswered}
                        className={`p-3.5 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${btnStyle}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Explanation */}
              {mysteryAnswered && (
                <div className="space-y-4 pt-2">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
                    <span className="font-extrabold text-slate-900 block mb-1">
                      💡 ملخص وفائدة سريرية:
                    </span>
                    {(activeMysteriesList[mysteryIndex] || MOLECULE_MYSTERIES_BY_LEVEL[selectedLevel][0]).clinicalNote}
                  </div>

                  <button
                    onClick={handleNextMystery}
                    className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition-all cursor-pointer"
                  >
                    الانتقال للغز التالي
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-indigo-200 bg-white p-8 text-center space-y-6 shadow-xl">
              <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg">
                <Brain className="h-8 w-8" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-900">أحسنت! أتممت ألغاز الأدوية!</h3>
                <p className="text-xs text-slate-600">مجموع نقاط الاستنتاج في مرحلة ({currentLevelDetails.title}):</p>
                <div className="inline-block rounded-2xl bg-indigo-600 px-6 py-2.5 text-xl font-black text-white shadow-md">
                  {mysteryScore} نقطة
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => startMystery(selectedLevel)}
                  className="rounded-xl bg-indigo-600 px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition-all cursor-pointer"
                >
                  إعادة الألغاز
                </button>
                <button
                  onClick={() => setActiveGame("menu")}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-3 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  القائمة الرئيسية
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
