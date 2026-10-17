import React, { useState } from "react";
import {
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Search,
  Sparkles,
  ArrowRightLeft,
  Share2,
  Copy,
  Pill
} from "lucide-react";
import { DrugInteractionItem } from "../types";

export interface DrugMonograph {
  id: string;
  brandName: string;
  genericName: string;
  category: string;
  indications: string[];
  contraindications: string[];
  pregnancyCategory: "A" | "B" | "C" | "D" | "X";
  renalAdjustment: string;
  competitiveEdge: string;
  standardAdultDose: string;
  bonusValue?: string;
}

export const MONOGRAPHS: DrugMonograph[] = [
  {
    id: "m-1",
    brandName: "سيبلوكس 500 (Ciplox 500)",
    genericName: "Ciprofloxacin 500 mg",
    category: "مضادات حيوية - فلوروكينولون",
    indications: [
      "التهابات المسالك البولية المعقدة وغير المعقدة (UTIs)",
      "التهابات الجهاز التنفسي السفلي",
      "التهابات العظام والمفاصل والجهاز الهضمي"
    ],
    contraindications: [
      "الحمل والرضاعة والأطفال دون 18 عاماً (إلا بضرورة قصوى)",
      "الحساسية لمجموعة الكينولونات",
      "الوهن العضلي الوبيل (Myasthenia Gravis)"
    ],
    pregnancyCategory: "C",
    renalAdjustment: "تخفض الجرعة إلى 250-500 ملغ كل 18-24 ساعة إذا كانت تصفية الكرياتينين < 30 مل/دقيقة",
    competitiveEdge: "نقاوة تصنيعية عالية مع امتصاص سريع ومنافس للصيدلية.",
    standardAdultDose: "قرص واحد 500 ملغ كل 12 ساعة لمدة 5 إلى 14 يوماً"
  },
  {
    id: "m-2",
    brandName: "ديراد إم (Dirad-M)",
    genericName: "Metronidazole 400mg + Diloxanide Furoate 500mg",
    category: "مضادات طفيليات وأميبا مزدوجة الفعالية",
    indications: [
      "الأميبا المعوية الحادة والمزمنة (Entamoeba histolytica)",
      "الدوسنتاريا الأميبية ومطهر للقولون",
      "حالات التكيس الأميبي المعوي (Cyst passer)"
    ],
    contraindications: [
      "الثلث الأول من الحمل",
      "الاضطرابات العصبية المركزية الشديدة",
      "تجنب تعاطي الكحول أثناء وبعد العلاج بـ 48 ساعة"
    ],
    pregnancyCategory: "B",
    renalAdjustment: "آمن بوجه عام مع مراقبة الاعتلال الكلوي الشديد",
    competitiveEdge: "تركيبة مزدوجة تقضي على الطفيلي النشط والأكياس معاً في دورة علاجية واحدة.",
    standardAdultDose: "قرص واحد 3 مرات يومياً بعد الأكل لمدة 5-10 أيام"
  },
  {
    id: "m-3",
    brandName: "ألريد (Allerid)",
    genericName: "Cetirizine Hydrochloride 10 mg",
    category: "مضادات الهيستامين من الجيل الثاني (Non-sedating)",
    indications: [
      "التهاب الأنف التحسسي الموسمي والدائم",
      "حكة وحساسية الجلد والأرتيكاريا المزمنة",
      "التهاب ملتحمة العين التحسسي"
    ],
    contraindications: [
      "فرط الحساسية للسيتريزين أو الهيدروكسيزين",
      "القصور الكلوي في مراحله النهائية (CrCl < 10 ml/min)"
    ],
    pregnancyCategory: "B",
    renalAdjustment: "5 ملغ يومياً في حالات الاعتلال الكلوي المتوسط",
    competitiveEdge: "تأثير سريع خلال 20 دقيقة يدوم 24 ساعة كاملة بنعاس قليل جداً مقارنة بالأجيال الأولى.",
    standardAdultDose: "قرص واحد 10 ملغ مساءً مع أو بدون طعام"
  },
  {
    id: "m-4",
    brandName: "فوركان 150 (Forcan 150)",
    genericName: "Fluconazole 150 mg",
    category: "مضادات الفطريات واسعة الطيف (Triazole)",
    indications: [
      "داء المبيضات المهبلي الحاد والمتكرر (Vaginal Candidiasis)",
      "فطريات الجلد والأظافر والقدم الرياضي",
      "فطريات الفم والبلعوم للمرضى ناقصي المناعة"
    ],
    contraindications: [
      "الاستعمال المتزامن مع أدوية تطيل فترة QT مثل سيسابريد أو تيرفينادين",
      "الحمل إلا في الحالات المهددة للحياة"
    ],
    pregnancyCategory: "D",
    renalAdjustment: "تخفيض الجرعة بنسبة 50% بعد الجرعة التحميلية إذا كان CrCl < 50 ml/min",
    competitiveEdge: "كبسولة واحدة تكفي لعلاج داء المبيضات الحاد بامتصاص فموي فائق يتجاوز 90%.",
    standardAdultDose: "كبسولة واحدة 150 ملغ جرعة واحدة لداء المبيضات المهبلي"
  },
  {
    id: "m-5",
    brandName: "لوماك 20 (Lomac 20)",
    genericName: "Omeprazole 20 mg",
    category: "مثبطات مضخة البروتون (PPI)",
    indications: [
      "ارتجاع المريء وحرقة المعدة (GERD)",
      "قرحة المعدة والاثني عشر",
      "استئصال جرثومة المعدة H. pylori ضمن العلاج الثلاثي"
    ],
    contraindications: [
      "الحساسية المفرطة لمثبطات مضخة البروتون",
      "الاستعمال المتزامن مع عقار كلوبيدوغريل (Plavix) دون إشراف طبي"
    ],
    pregnancyCategory: "C",
    renalAdjustment: "لا يلزم تعديل الجرعة لمرضى القصور الكلوي",
    competitiveEdge: "حبيبات دقيقة مقاومة لحموضة المعدة تضمن وصول المادة الفعالة للأمعاء بكفاءة 100%.",
    standardAdultDose: "كبسولة واحدة 20 ملغ صباحاً قبل الإفطار بنصف ساعة"
  },
  {
    id: "m-6",
    brandName: "نوفاتاكس / نوفاتكس (Novatax)",
    genericName: "Cefotaxime Sodium 500mg / 1g",
    category: "سيفالوسبورين الجيل الثالث (3rd Gen Cephalosporin)",
    indications: [
      "التهابات الجهاز التنفسي والتهاب الرئة",
      "التهاب السحايا الجرثومي وتسمم الدم (Septicemia)",
      "التهابات المسالك البولية والتناسلية والجروح الجراحية"
    ],
    contraindications: [
      "الحساسية للسيفالوسبورينات أو الحساسية الشديدة الفورية للبنسلين"
    ],
    pregnancyCategory: "B",
    renalAdjustment: "تخفض الجرعة إلى النصف إذا كانت تصفية الكرياتينين < 20 مل/دقيقة",
    competitiveEdge: "نفاذية ممتازة للحاجز الدموي الدماغي وثبات عالٍ ضد إنزيمات البيتا لاكتاماز ومنافس للصيدلية.",
    standardAdultDose: "1 إلى 2 جم كل 8 إلى 12 ساعة حقناً بالوريد أو العضل"
  }
];

export const DRUG_INTERACTIONS: DrugInteractionItem[] = [
  {
    id: "int-1",
    drugA: "سيبلوكس (Ciprofloxacin)",
    drugB: "مضادات الحموضة / الكالسيوم / الحديد",
    severity: "major",
    description: "الكالسيوم والألمنيوم والمغنيسيوم ترتبط بالسيبلوكس وتمنع امتصاصه بنسبة تفوق 70%.",
    recommendation: "يجب الفصل بفاصل ساعتين على الأقل قبل السيبلوكس أو 4-6 ساعات بعده."
  },
  {
    id: "int-2",
    drugA: "ديراد إم / سيبازول (Metronidazole / Secnidazole)",
    drugB: "وارفارين (Warfarin)",
    severity: "major",
    description: "يزيد الميترونيدازول من تأثير الوارفارين المضاد للتخثر ويرفع خطر النزيف بشكل ملحوظ.",
    recommendation: "مراقبة تحليل السيولة (INR) بدقة وتخفيض جرعة الوارفارين تحت إشراف الطبيب."
  },
  {
    id: "int-3",
    drugA: "لوماك (Omeprazole)",
    drugB: "كلوبيدوغريل (Clopidogrel)",
    severity: "moderate",
    description: "أوميبرازول يثبط إنزيم CYP2C19 مما قد يقلل تحويل الكلوبيدوغريل إلى شكله الفعال.",
    recommendation: "يفضل استبدال أوميبرازول بـ بانتوبرازول أو فايموتيدين عند الحاجة لحماية المعدة."
  },
  {
    id: "int-4",
    drugA: "فوركان (Fluconazole)",
    drugB: "أدوية الدهون الستاتين (Atorvastatin / Simvastatin)",
    severity: "major",
    description: "يثبط فلوكونازول استقلاب الستاتين مما قد يرفع تركيزه بالدم ويزيد خطر الاعتلال العضلي.",
    recommendation: "إيقاف الستاتين مؤقتاً أثناء جرعة الفلوكونازول أو المراقبة الصارمة لآلام العضلات."
  },
  {
    id: "int-5",
    drugA: "ألريد (Cetirizine)",
    drugB: "المهدئات ومضادات الاكتئاب المركزية",
    severity: "minor",
    description: "قد يحدث زيادة طفيفة في الشعور بالخمول أو النعاس لدى المرضى الحساسين.",
    recommendation: "تجنب القيادة أو تشغيل الآلات الثقيلة في بداية الاستخدام."
  }
];

export const DrugInteractionsAndMonographs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"monographs" | "interactions">("monographs");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedMonograph, setSelectedMonograph] = useState<DrugMonograph>(MONOGRAPHS[0]);
  const [copied, setCopied] = useState<boolean>(false);

  const filteredMonographs = MONOGRAPHS.filter(
    (m) =>
      m.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.genericName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleShareWhatsApp = (mono: DrugMonograph) => {
    const text = encodeURIComponent(`📄 *البطاقة العلمية والمونوغراف الصيدلاني*
━━━━━━━━━━━━━━━━━━
💊 *المستحضر*: ${mono.brandName}
🔬 *الاسم العلمي*: ${mono.genericName}
🏷️ *التصنيف*: ${mono.category}
━━━━━━━━━━━━━━━━━━
🎯 *الاستطبابات*:
${mono.indications.map((i) => `• ${i}`).join("\n")}

🚫 *موانع الاستعمال*:
${mono.contraindications.map((c) => `• ${c}`).join("\n")}

🤰 *فئة الحمل*: الفئة (${mono.pregnancyCategory})
🫘 *مرضى الكلى*: ${mono.renalAdjustment}
✨ *الميزة التنافسية*: ${mono.competitiveEdge}
━━━━━━━━━━━━━━━━━━
👨‍⚕️ د/ بلال القيسي - 776600049`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <div className="space-y-4 text-slate-900">
      {/* Top Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0">
              📚
            </div>
            <div>
              <span className="text-4xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.2 rounded-full">
                المرجع العلمي السريري للأطباء والصيادلة
              </span>
              <h3 className="text-sm sm:text-base font-black text-white mt-0.5">
                الدليل الدوائي والمونوغراف والتداخلات (Scientific Hub)
              </h3>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700 text-3xs font-black">
            <button
              type="button"
              onClick={() => setActiveTab("monographs")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "monographs"
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>البطاقات العلمية والمونوغراف</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("interactions")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "interactions"
                  ? "bg-amber-600 text-white shadow-2xs"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>فاحص التداخلات الدوائية</span>
            </button>
          </div>
        </div>
      </div>

      {activeTab === "monographs" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: List of Drugs */}
          <div className="lg:col-span-4 space-y-2.5">
            <div className="relative">
              <input
                type="text"
                placeholder="ابحث بالاسم العلمي أو التجاري..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pr-8 pl-3 text-xs font-medium focus:border-indigo-600 focus:outline-none shadow-2xs"
              />
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            </div>

            <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-0.5 scrollbar-thin">
              {filteredMonographs.map((mono) => (
                <button
                  key={mono.id}
                  type="button"
                  onClick={() => setSelectedMonograph(mono)}
                  className={`w-full text-right p-3 rounded-xl border transition-all flex flex-col gap-1 cursor-pointer ${
                    selectedMonograph.id === mono.id
                      ? "border-indigo-600 bg-indigo-50/90 text-indigo-950 font-bold shadow-xs"
                      : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-900 text-xs">{mono.brandName}</span>
                  </div>
                  <span className="text-3xs text-slate-500 truncate font-mono">{mono.genericName}</span>
                  <span className="text-4xs text-indigo-700 bg-white border border-indigo-100 rounded px-1.5 py-0.2 w-fit">
                    {mono.category}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Right Column: Full Scientific Monograph Detail */}
          <div className="lg:col-span-8">
            <div className="rounded-2xl border-2 border-indigo-200 bg-white p-4 sm:p-5 shadow-sm space-y-4">
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-4xs font-black text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                      {selectedMonograph.category}
                    </span>
                    <span className="text-4xs font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      فئة الحمل: ({selectedMonograph.pregnancyCategory})
                    </span>
                  </div>
                  <h4 className="text-base sm:text-lg font-black text-slate-950 mt-1">
                    {selectedMonograph.brandName}
                  </h4>
                  <p className="text-xs font-mono font-bold text-teal-700">{selectedMonograph.genericName}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleShareWhatsApp(selectedMonograph)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-3xs font-black shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    <span>مشاركة عبر واتساب</span>
                  </button>
                </div>
              </div>

              {/* Competitive Edge Highlight */}
              <div className="rounded-xl bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 p-3 flex items-start gap-2 text-xs">
                <Sparkles className="h-4 w-4 text-teal-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-black text-teal-950 block">الميزة التنافسية وسبب التفضيل:</span>
                  <p className="text-teal-900 font-medium text-3xs mt-0.5">
                    {selectedMonograph.competitiveEdge}
                  </p>
                </div>
              </div>

              {/* Grid: Indications & Contraindications */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Indications */}
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 space-y-2">
                  <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>الاستطبابات ودواعي الاستعمال:</span>
                  </span>
                  <ul className="space-y-1 text-3xs text-emerald-900 font-medium list-disc pr-4">
                    {selectedMonograph.indications.map((ind, i) => (
                      <li key={`ind-${i}`}>{ind}</li>
                    ))}
                  </ul>
                </div>

                {/* Contraindications */}
                <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-3 space-y-2">
                  <span className="text-xs font-black text-rose-950 flex items-center gap-1.5">
                    <ShieldAlert className="h-4 w-4 text-rose-600" />
                    <span>موانع الاستعمال والتحذيرات:</span>
                  </span>
                  <ul className="space-y-1 text-3xs text-rose-900 font-medium list-disc pr-4">
                    {selectedMonograph.contraindications.map((c, i) => (
                      <li key={`contra-${i}`}>{c}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Adult Dosing & Renal Function */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-3xs">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1">
                  <span className="font-black text-slate-900 block">💉 الجرعة القياسية للبالغين:</span>
                  <p className="text-slate-700 font-medium">{selectedMonograph.standardAdultDose}</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1">
                  <span className="font-black text-slate-900 block">🫘 تعديل الجرعة لمرضى القصور الكلوي:</span>
                  <p className="text-slate-700 font-medium">{selectedMonograph.renalAdjustment}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Drug Interaction Checker Screen */
        <div className="space-y-3">
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 flex items-start gap-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-black text-amber-950">
                تنبيهات التداخلات الدوائية الهامة لأصناف القائمة
              </h4>
              <p className="text-3xs text-amber-900 font-medium mt-0.5">
                تساعدك هذه الأداة في تجنب الأخطاء الدوائية عند صرف أو وصف هذه الأصناف مع علاجات المرضى المزمنة.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {DRUG_INTERACTIONS.map((item) => (
              <div
                key={item.id}
                className={`rounded-2xl border p-4 space-y-2.5 shadow-2xs ${
                  item.severity === "major"
                    ? "border-rose-300 bg-rose-50/50"
                    : item.severity === "moderate"
                    ? "border-amber-300 bg-amber-50/50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-center justify-between gap-2 border-b pb-2 border-slate-200/80">
                  <div className="flex items-center gap-1.5 font-black text-xs text-slate-950">
                    <Pill className="h-4 w-4 text-indigo-700" />
                    <span>{item.drugA}</span>
                    <ArrowRightLeft className="h-3 w-3 text-slate-400 mx-0.5" />
                    <span>{item.drugB}</span>
                  </div>

                  <span
                    className={`text-4xs font-black px-2 py-0.5 rounded-full border ${
                      item.severity === "major"
                        ? "bg-rose-100 text-rose-800 border-rose-300"
                        : item.severity === "moderate"
                        ? "bg-amber-100 text-amber-800 border-amber-300"
                        : "bg-slate-100 text-slate-700 border-slate-300"
                    }`}
                  >
                    {item.severity === "major"
                      ? "تداخل عالي الخطورة ⚠️"
                      : item.severity === "moderate"
                      ? "تداخل متوسط ⚡"
                      : "تداخل طفيف ℹ️"}
                  </span>
                </div>

                <div className="text-3xs space-y-1.5">
                  <p className="text-slate-800 font-semibold leading-relaxed">
                    <strong className="text-slate-950">آلية التداخل:</strong> {item.description}
                  </p>
                  <div className="rounded-lg bg-white p-2 border border-slate-200/90 font-bold text-teal-900 flex items-start gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-teal-600 shrink-0 mt-0.5" />
                    <span>التوجيه والحل السريري: {item.recommendation}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
