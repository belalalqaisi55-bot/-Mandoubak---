import React, { useState } from "react";
import {
  Calculator,
  Baby,
  Share2,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Info,
  Sparkles,
  Search,
  ChevronDown
} from "lucide-react";
import { PediatricDrugProfile } from "../types";

export const PEDIATRIC_DRUGS: PediatricDrugProfile[] = [
  {
    id: "ped-1",
    brandName: "ألريد شراب (Allerid Syrup)",
    genericName: "Cetirizine HCl",
    category: "مضادات الحساسية والرشح",
    concentration: "5 ملغ / 5 مل (1 ملغ/مل)",
    mgPerMl: 1,
    standardDoseMgPerKgPerDay: 0.25,
    dosesPerDay: 1,
    minAgeMonths: 6,
    maxDailyMg: 10,
    clinicalNotes: "يعطى مرة واحدة مساءً، آمن ولا يسبب نعاساً شديداً.",
    administrationWithFood: "مع أو بدون الأكل (يفضل مساءً)"
  },
  {
    id: "ped-2",
    brandName: "ديراد إم شراب (Dirad-M Syrup)",
    genericName: "Metronidazole + Diloxanide Furoate",
    category: "مطهّر ومعالج الدوسنتاريا والطفيليات",
    concentration: "100 ملغ ميترونيدازول / 5 مل",
    mgPerMl: 20,
    standardDoseMgPerKgPerDay: 30,
    dosesPerDay: 3,
    minAgeMonths: 12,
    maxDailyMg: 1200,
    clinicalNotes: "يستخدم لحالات الأميبا والجيارديا المعوية لمدة 5 إلى 7 أيام.",
    administrationWithFood: "بعد الأكل مباشرة لتجنب اضطراب المعدة"
  },
  {
    id: "ped-3",
    brandName: "نوفاتكس حقن (Novatex / Cefotaxime)",
    genericName: "Cefotaxime Sodium (سيفوتاكسيم)",
    category: "مضاد حيوي واسع الطيف (حقن عضل/وريد)",
    concentration: "500 ملغ / 5 مل بعد الحل (100 ملغ/مل)",
    mgPerMl: 100,
    standardDoseMgPerKgPerDay: 75,
    dosesPerDay: 3,
    minAgeMonths: 1,
    maxDailyMg: 2000,
    clinicalNotes: "يحسب 50-100 ملغ/كغ/يوم مقسمة على 3 جرعات كل 8 ساعات.",
    administrationWithFood: "حقن وريدي بطيء أو عضلي عميق"
  },
  {
    id: "ped-4",
    brandName: "باراسيتامول شراب للأطفال (Paracetamol 120)",
    genericName: "Paracetamol (خافض حرارة ومسكن)",
    category: "مسكنات وخافض حرارة",
    concentration: "120 ملغ / 5 مل (24 ملغ/مل)",
    mgPerMl: 24,
    standardDoseMgPerKgPerDay: 45, // 15 mg/kg * 3
    dosesPerDay: 3,
    minAgeMonths: 1,
    maxDailyMg: 2000,
    clinicalNotes: "الجرعة للجرعة الواحدة 15 ملغ/كغ كل 6-8 ساعات عند اللزوم.",
    administrationWithFood: "مع أو بدون الأكل مع شرب ماء كافٍ"
  },
  {
    id: "ped-5",
    brandName: "إيبوبروفين شراب (Ibuprofen 100)",
    genericName: "Ibuprofen (مضاد التهاب ومسكن)",
    category: "مسكنات وخافض حرارة ومضاد التهاب",
    concentration: "100 ملغ / 5 مل (20 ملغ/مل)",
    mgPerMl: 20,
    standardDoseMgPerKgPerDay: 30, // 10 mg/kg * 3
    dosesPerDay: 3,
    minAgeMonths: 6,
    maxDailyMg: 1200,
    clinicalNotes: "يعطى كل 8 ساعات بعد الرضاعة أو الأكل، فعال في خفض الحرارة العالية.",
    administrationWithFood: "بعد الأكل أو الرضاعة فقط"
  },
  {
    id: "ped-6",
    brandName: "أموكسيسيلين + كلافولانات شراب (Amoxi-Clav 228)",
    genericName: "Amoxicillin + Clavulanic Acid 228.5mg/5ml",
    category: "مضاد حيوي لالتهابات الصدر والأذن",
    concentration: "228.5 ملغ / 5 مل (45.7 ملغ/مل)",
    mgPerMl: 45.7,
    standardDoseMgPerKgPerDay: 50,
    dosesPerDay: 2,
    minAgeMonths: 2,
    maxDailyMg: 1800,
    clinicalNotes: "كل 12 ساعة بانتظام لمدة 7-10 أيام مع حفظ الشراب بالثلاجة بعد التحضير.",
    administrationWithFood: "في بداية الوجبة لتفادي الإسهال وتحسين الامتصاص"
  },
  {
    id: "ped-7",
    brandName: "أزيثرومايسين شراب (Azithromycin 200)",
    genericName: "Azithromycin 200mg/5ml",
    category: "مضاد حيوي لالتهاب الحلق واللوزتين",
    concentration: "200 ملغ / 5 مل (40 ملغ/مل)",
    mgPerMl: 40,
    standardDoseMgPerKgPerDay: 10,
    dosesPerDay: 1,
    minAgeMonths: 6,
    maxDailyMg: 500,
    clinicalNotes: "يعطى جرعة واحدة يومياً لمدة 3 أيام فقط.",
    administrationWithFood: "قبل الأكل بساعة أو بعده بساعتين"
  }
];

interface Props {
  onClose?: () => void;
  doctorOrPharmacyName?: string;
}

export const PediatricDoseCalculator: React.FC<Props> = ({
  doctorOrPharmacyName = "الطبيب / الصيدلاني"
}) => {
  const [selectedDrugId, setSelectedDrugId] = useState<string>(PEDIATRIC_DRUGS[0].id);
  const [weightKg, setWeightKg] = useState<string>("12");
  const [ageMonths, setAgeMonths] = useState<string>("24");
  const [inputMode, setInputMode] = useState<"weight" | "age">("weight");
  const [copied, setCopied] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const selectedDrug = PEDIATRIC_DRUGS.find((d) => d.id === selectedDrugId) || PEDIATRIC_DRUGS[0];

  // Helper: estimate weight from age if age mode is selected
  const calculatedWeight = (): number => {
    if (inputMode === "weight") {
      return Math.max(1, Number(weightKg) || 1);
    }
    const months = Number(ageMonths) || 12;
    if (months <= 12) {
      return Math.max(3, Math.round(((months + 9) / 2) * 10) / 10);
    }
    const years = months / 12;
    if (years <= 6) {
      return Math.round((years * 2 + 8) * 10) / 10;
    }
    return Math.round((years * 3 + 7) * 10) / 10;
  };

  const currentWeight = calculatedWeight();

  // Dose calculation
  const totalDailyMg = Math.min(
    selectedDrug.maxDailyMg,
    currentWeight * selectedDrug.standardDoseMgPerKgPerDay
  );
  const singleDoseMg = totalDailyMg / selectedDrug.dosesPerDay;
  const singleDoseMl = Math.round((singleDoseMg / selectedDrug.mgPerMl) * 10) / 10;
  const totalDailyMl = Math.round((totalDailyMg / selectedDrug.mgPerMl) * 10) / 10;

  const frequencyLabel =
    selectedDrug.dosesPerDay === 1
      ? "مرة واحدة يومياً"
      : selectedDrug.dosesPerDay === 2
      ? "كل 12 ساعة (مرتين يومياً)"
      : selectedDrug.dosesPerDay === 3
      ? "كل 8 ساعات (3 مرات يومياً)"
      : "كل 6 ساعات (4 مرات يومياً)";

  const getCardText = () => {
    return `📋 *بطاقة جرعة دوائية دقيقة للأطفال*
━━━━━━━━━━━━━━━━━━
🏥 *المنشأة*: ${doctorOrPharmacyName}
👨‍⚕️ *المندوب المعتمد*: د/ بلال القيسي (776600049)
━━━━━━━━━━━━━━━━━━
💊 *الدواء*: ${selectedDrug.brandName}
🔬 *المادة الفعالة*: ${selectedDrug.genericName}
⚖️ *وزن الطفل المعتمد*: ${currentWeight} كجم
💉 *الجرعة في المرة الواحدة*: ${singleDoseMl} مل (سم³)
⏰ *التكرار*: ${frequencyLabel}
🍱 *طريقة التناول*: ${selectedDrug.administrationWithFood}
📝 *ملاحظات صيدلانية*: ${selectedDrug.clinicalNotes}
━━━━━━━━━━━━━━━━━━
✨ تم الاحتساب الدقيق عبر منصة مندوبك الطبي`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getCardText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(getCardText());
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const filteredDrugs = PEDIATRIC_DRUGS.filter(
    (d) =>
      d.brandName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.genericName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4 text-slate-900">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-teal-800 via-teal-900 to-slate-900 text-white p-4 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-lg shadow-md shrink-0">
              👶
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-4xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.2 rounded-full">
                  أداة سريرية يومية للطبيب والصيدلاني
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-white mt-0.5">
                حاسبة جرعات الأطفال الدقيقة (Pediatric Dose Calculator)
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Controls + Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left/Top: Input parameters (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          {/* Drug Selector */}
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-2.5">
            <label className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-teal-600" />
              <span>اختر المستحضر الدوائي:</span>
            </label>

            {/* Quick Filter */}
            <div className="relative">
              <input
                type="text"
                placeholder="ابحث بالاسم التجاري أو العلمي..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pr-7 pl-2 text-3xs font-medium focus:border-teal-500 focus:bg-white focus:outline-none"
              />
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-0.5 scrollbar-thin">
              {filteredDrugs.map((drug) => (
                <button
                  key={drug.id}
                  type="button"
                  onClick={() => setSelectedDrugId(drug.id)}
                  className={`w-full text-right p-2 rounded-lg border text-3xs transition-all flex flex-col gap-0.5 cursor-pointer ${
                    selectedDrugId === drug.id
                      ? "border-teal-600 bg-teal-50/90 text-teal-950 font-bold shadow-2xs"
                      : "border-slate-100 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-950 text-2xs">{drug.brandName}</span>
                    <span className="text-4xs text-teal-700 bg-white px-1 py-0.2 rounded border border-teal-200 font-mono">
                      {drug.concentration}
                    </span>
                  </div>
                  <span className="text-4xs text-slate-500 truncate">{drug.genericName}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Child Parameters: Weight or Age */}
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <Baby className="h-4 w-4 text-amber-600" />
                <span>بيانات الطفل:</span>
              </span>

              {/* Mode Toggle */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-3xs font-bold">
                <button
                  type="button"
                  onClick={() => setInputMode("weight")}
                  className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                    inputMode === "weight" ? "bg-teal-700 text-white shadow-2xs" : "text-slate-600"
                  }`}
                >
                  بالوزن (كجم)
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode("age")}
                  className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                    inputMode === "age" ? "bg-teal-700 text-white shadow-2xs" : "text-slate-600"
                  }`}
                >
                  بالعمر (أشهر)
                </button>
              </div>
            </div>

            {inputMode === "weight" ? (
              <div className="space-y-1.5">
                <label className="text-3xs font-bold text-slate-700">وزن الطفل الفعلي (كيلوجرام):</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="2"
                    max="60"
                    step="0.5"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    className="w-full rounded-xl border border-teal-300 bg-teal-50/40 p-2 text-center font-mono font-black text-base text-teal-950 focus:border-teal-600 focus:outline-none"
                  />
                  <span className="text-xs font-bold text-slate-600 shrink-0 font-mono">KG كجم</span>
                </div>
                {/* Quick Weight Presets */}
                <div className="flex items-center gap-1 flex-wrap pt-1">
                  {[6, 9, 12, 15, 18, 22, 28].map((w) => (
                    <button
                      key={`w-preset-${w}`}
                      type="button"
                      onClick={() => setWeightKg(String(w))}
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-4xs font-bold text-slate-700 cursor-pointer"
                    >
                      {w} كجم
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-3xs font-bold text-slate-700">عمر الطفل (بالأشهر):</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="144"
                    value={ageMonths}
                    onChange={(e) => setAgeMonths(e.target.value)}
                    className="w-full rounded-xl border border-amber-300 bg-amber-50/40 p-2 text-center font-mono font-black text-base text-amber-950 focus:border-amber-600 focus:outline-none"
                  />
                  <span className="text-xs font-bold text-slate-600 shrink-0">شهر</span>
                </div>
                <div className="text-4xs text-amber-800 bg-amber-100/60 p-1.5 rounded-lg font-medium">
                  💡 تقدير الوزن التقريبي: <strong>{currentWeight} كجم</strong> بناءً على العمر.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right/Bottom: Calculated Result & Prescription Card (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Main Calculation Card */}
          <div className="rounded-2xl border-2 border-teal-400/80 bg-gradient-to-br from-white via-teal-50/30 to-emerald-50/20 p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-teal-100 pb-3">
              <div>
                <span className="text-4xs font-black text-teal-800 bg-teal-100 border border-teal-300 px-2 py-0.5 rounded-full">
                  {selectedDrug.category}
                </span>
                <h4 className="text-base sm:text-lg font-black text-teal-950 mt-1">
                  {selectedDrug.brandName}
                </h4>
                <p className="text-3xs font-mono text-slate-500">{selectedDrug.genericName}</p>
              </div>
              <div className="text-left font-mono">
                <span className="text-4xs text-slate-400 block">التركيز</span>
                <span className="text-xs font-black text-teal-800">{selectedDrug.concentration}</span>
              </div>
            </div>

            {/* Big Dose Numbers */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {/* Single Dose ML */}
              <div className="rounded-xl bg-teal-800 text-white p-3 text-center shadow-xs flex flex-col justify-center">
                <span className="text-4xs text-teal-200 font-bold block">الجرعة في المرة الواحدة</span>
                <div className="flex items-baseline justify-center gap-1 my-0.5">
                  <span className="text-2xl sm:text-3xl font-black font-mono text-amber-300">
                    {singleDoseMl}
                  </span>
                  <span className="text-xs font-bold text-teal-100">مل (سم³)</span>
                </div>
                <span className="text-4xs text-teal-200 font-mono">({Math.round(singleDoseMg)} ملغ)</span>
              </div>

              {/* Frequency */}
              <div className="rounded-xl bg-white border border-teal-200 p-3 text-center shadow-2xs flex flex-col justify-center">
                <span className="text-4xs text-slate-500 font-bold block">تكرار الجرعة</span>
                <span className="text-xs sm:text-sm font-black text-slate-900 my-1 block">
                  {frequencyLabel}
                </span>
                <span className="text-4xs text-emerald-700 font-bold bg-emerald-50 rounded px-1 py-0.2">
                  {selectedDrug.dosesPerDay} مرات في اليوم
                </span>
              </div>

              {/* Total Daily ML */}
              <div className="rounded-xl bg-white border border-slate-200 p-3 text-center shadow-2xs flex flex-col justify-center col-span-2 sm:col-span-1">
                <span className="text-4xs text-slate-500 font-bold block">إجمالي اليوم الكامل</span>
                <div className="flex items-baseline justify-center gap-1 my-0.5">
                  <span className="text-lg font-black font-mono text-slate-900">{totalDailyMl}</span>
                  <span className="text-3xs font-bold text-slate-500">مل/يوم</span>
                </div>
                <span className="text-4xs text-slate-400 font-mono">({Math.round(totalDailyMg)} ملغ كلي)</span>
              </div>
            </div>

            {/* Administration & Clinical Guidance */}
            <div className="space-y-2 rounded-xl bg-white border border-slate-200/90 p-3 text-3xs">
              <div className="flex items-start gap-2">
                <span className="font-black text-teal-900 shrink-0">🍱 طريقة التناول:</span>
                <span className="font-bold text-slate-800">{selectedDrug.administrationWithFood}</span>
              </div>
              <div className="flex items-start gap-2 pt-1 border-t border-slate-100">
                <span className="font-black text-amber-900 shrink-0">💡 توجيه صيدلاني:</span>
                <span className="font-medium text-slate-700">{selectedDrug.clinicalNotes}</span>
              </div>
            </div>

            {/* Action Bar: Copy & WhatsApp Share */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-teal-100 flex-wrap">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span>إرسال للأم / المريض واتساب 💬</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">تم النسخ!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-slate-600" />
                      <span>نسخ البطاقة</span>
                    </>
                  )}
                </button>
              </div>

              <span className="text-4xs font-mono text-slate-400 hidden sm:inline">
                المندوب د/ بلال القيسي 776600049
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
