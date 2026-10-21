import React, { useState, useEffect } from "react";
import {
  FlaskConical,
  Dna,
  Atom,
  Search,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  FileText,
  BookOpen,
  Sparkles,
  Layers,
  ShieldAlert,
  Activity,
  Award,
  RefreshCw,
  Copy,
  Check
} from "lucide-react";

interface CompoundData {
  query: string;
  cid: number | null;
  structurePngUrl: string | null;
  properties: {
    CID?: number;
    MolecularFormula?: string;
    MolecularWeight?: string;
    CanonicalSMILES?: string;
    IsomericSMILES?: string;
    InChIKey?: string;
    XLogP?: number;
    TPSA?: number;
    HBondDonorCount?: number;
    HBondAcceptorCount?: number;
    RotatableBondCount?: number;
    Complexity?: number;
  } | null;
  lipinskiEvaluation: {
    passed: boolean;
    violationsCount: number;
    violations: string[];
    veberPassed: boolean;
    veberViolations: string[];
    isOrallyBioavailable: boolean;
    summaryArabic: string;
  } | null;
  fdaLabel: {
    brandName?: string;
    genericName?: string;
    substanceName?: string;
    pharmClass?: string[];
    indications?: string;
    boxedWarning?: string;
    contraindications?: string;
    dosageAndAdministration?: string;
    drugInteractions?: string;
  } | null;
  literature: Array<{
    id: string;
    title: string;
    authorString: string;
    journalTitle: string;
    pubYear: string;
    doi?: string;
    isOpenAccess: boolean;
    url: string;
  }>;
  provenance: {
    databases: string[];
    timestamp: string;
  };
}

const PRELOADED_EXAMPLES = [
  { name: "Ciprofloxacin", arabic: "سيبلوكس (Ciprofloxacin)", target: "DNA Gyrase / Topoisomerase IV" },
  { name: "Omeprazole", arabic: "لوماك (Omeprazole)", target: "H+/K+ ATPase Proton Pump" },
  { name: "Fluconazole", arabic: "فوركان (Fluconazole)", target: "Lanosterol 14-alpha Demethylase" },
  { name: "Cetirizine", arabic: "ألريد (Cetirizine)", target: "Histamine H1 Receptor" },
  { name: "Metronidazole", arabic: "ديراد إم (Metronidazole)", target: "Microbial DNA Electron Sink" },
  { name: "Paracetamol", arabic: "بارفيز (Paracetamol)", target: "Central COX-2 / TRPA1 Channel" },
  { name: "Cefotaxime", arabic: "نوفاتاكس (Cefotaxime)", target: "Penicillin-Binding Proteins (PBPs)" },
  { name: "Lansoprazole", arabic: "لانسك (Lansoprazole)", target: "Gastric Parietal H+/K+ ATPase" }
];

export const BioscienceSkillsExplorer: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("Ciprofloxacin");
  const [data, setData] = useState<CompoundData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedSmiles, setCopiedSmiles] = useState(false);
  const [activeSection, setActiveSection] = useState<"structure" | "properties" | "fda" | "literature">("structure");

  const fetchCompound = async (name: string) => {
    if (!name || !name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/science/compound-lookup?name=${encodeURIComponent(name.trim())}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        setError(json.error || "لم يتم العثور على بيانات كيميائية للمركب المحدد");
      }
    } catch (e: any) {
      console.warn("Bioscience fetch error:", e);
      setError("تعذر الاتصال بقواعد البيانات العلمية (PubChem/openFDA)");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompound("Ciprofloxacin");
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSmiles(true);
    setTimeout(() => setCopiedSmiles(false), 2000);
  };

  return (
    <div className="space-y-4 text-slate-900 dir-rtl">
      {/* Header Banner - Scientific Workbench Style */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 shadow-sm border border-slate-800">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 text-indigo-300 flex items-center justify-center font-bold text-xl shadow-inner shrink-0">
              <FlaskConical className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-3xs font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full">
                  Google DeepMind Science Skills Integration
                </span>
                <span className="text-3xs font-black bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-full">
                  PubChem • openFDA • Europe PMC
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white mt-1">
                المستكشف البيولوجي والصيدلاني الدوائي (Bioscience Workbench)
              </h3>
              <p className="text-2xs text-slate-300">
                استعلام التركيب الكيميائي، قواعد ليبينسكي للتوافر الحيوي، البيانات السريرية، وأحدث الأبحاث العلمية الموثقة.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                fetchCompound(searchTerm);
              }}
              className="relative flex-1 md:w-64"
            >
              <input
                type="text"
                placeholder="ابحث بالاسم العلمي أو الكيميائي..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/90 py-2 pr-8 pl-3 text-xs font-semibold text-white placeholder-slate-400 focus:border-indigo-400 focus:outline-hidden"
              />
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </form>
            <button
              type="button"
              onClick={() => fetchCompound(searchTerm)}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer disabled:opacity-50"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "بحث علمي"}
            </button>
          </div>
        </div>

        {/* Quick Example Pills Bar */}
        <div className="mt-3.5 pt-3 border-t border-slate-800/80">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-3xs font-bold scrollbar-thin">
            <span className="text-slate-400 shrink-0 font-medium">أصناف القائمة السريعة:</span>
            {PRELOADED_EXAMPLES.map((ex) => (
              <button
                key={ex.name}
                type="button"
                onClick={() => {
                  setSearchTerm(ex.name);
                  fetchCompound(ex.name);
                }}
                className={`px-2.5 py-1 rounded-lg border transition-all shrink-0 cursor-pointer ${
                  searchTerm.toLowerCase() === ex.name.toLowerCase()
                    ? "bg-indigo-600 text-white border-indigo-400 shadow-2xs font-black"
                    : "bg-slate-800/70 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white"
                }`}
              >
                {ex.arabic}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col items-center justify-center gap-2">
          <RefreshCw className="h-7 w-7 text-indigo-600 animate-spin" />
          <p className="text-xs font-bold text-slate-800">جاري استعلام قواعد البيانات العلمية PubChem PUG REST و openFDA...</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {data && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: 2D Chemical Depiction & Lipinski Assessment */}
          <div className="lg:col-span-5 space-y-4">
            {/* 2D Structure Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <Atom className="h-4 w-4 text-indigo-600" />
                  <h4 className="text-xs font-black text-slate-900">الرسم الهيكلي الجزيئي ثنائي الأبعاد</h4>
                </div>
                {data.cid && (
                  <span className="text-4xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
                    CID: {data.cid}
                  </span>
                )}
              </div>

              {data.structurePngUrl ? (
                <div className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                  <img
                    src={data.structurePngUrl}
                    alt={`التركيب الكيميائي لـ ${data.query}`}
                    className="h-52 w-52 object-contain mix-blend-multiply"
                    loading="lazy"
                  />
                  <div className="mt-2 text-center">
                    <span className="text-3xs font-mono font-bold text-slate-700 block">
                      {data.properties?.MolecularFormula || data.query}
                    </span>
                    <span className="text-4xs text-slate-400">
                      مستورد من أرشيف PubChem المعتمد
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-xl text-slate-400 text-xs">
                  لا يتوفر رسم هيكلي ثنائي الأبعاد لهذا المركب
                </div>
              )}

              {/* SMILES & InChIKey */}
              {data.properties?.CanonicalSMILES && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-4xs font-bold text-slate-500">
                    <span>Canonical SMILES:</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(data.properties?.CanonicalSMILES || "")}
                      className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedSmiles ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedSmiles ? "تم النسخ" : "نسخ"}</span>
                    </button>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-100 font-mono text-3xs text-slate-800 break-all select-all border border-slate-200">
                    {data.properties.CanonicalSMILES}
                  </div>
                </div>
              )}

              {data.cid && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-3xs">
                  <span className="text-slate-500">رابط السجل الرسمي:</span>
                  <a
                    href={`https://pubchem.ncbi.nlm.nih.gov/compound/${data.cid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-800 font-bold inline-flex items-center gap-1"
                  >
                    <span>فتح في PubChem</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>

            {/* Lipinski Rule of 5 Card */}
            {data.lipinskiEvaluation && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-emerald-600" />
                    <h4 className="text-xs font-black text-slate-900">
                      تقييم التوافر الحيوي الدوائي (Lipinski & Veber)
                    </h4>
                  </div>
                  <span
                    className={`text-4xs font-bold px-2 py-0.5 rounded-full border ${
                      data.lipinskiEvaluation.passed
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                        : "bg-rose-50 text-rose-800 border-rose-300"
                    }`}
                  >
                    {data.lipinskiEvaluation.passed ? "مطابق للقواعد ✓" : "مخالف لقواعد ليبينسكي ✗"}
                  </span>
                </div>

                <p className="text-3xs font-bold text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                  {data.lipinskiEvaluation.summaryArabic}
                </p>

                <div className="grid grid-cols-2 gap-2 text-3xs">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-slate-500 block">الوزن الجزيئي (MW):</span>
                    <span className="font-mono font-bold text-slate-900">
                      {data.properties?.MolecularWeight || "-"} Da
                    </span>
                    <span className="text-4xs text-slate-400 block mt-0.5">الحد الأقصى: 500</span>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-slate-500 block">الارتباط الدهني (XLogP):</span>
                    <span className="font-mono font-bold text-slate-900">
                      {data.properties?.XLogP ?? "-"}
                    </span>
                    <span className="text-4xs text-slate-400 block mt-0.5">الحد الأقصى: 5.0</span>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-slate-500 block">روابط مانحة (HBD):</span>
                    <span className="font-mono font-bold text-slate-900">
                      {data.properties?.HBondDonorCount ?? "-"}
                    </span>
                    <span className="text-4xs text-slate-400 block mt-0.5">الحد الأقصى: 5</span>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-slate-500 block">روابط مستقبلة (HBA):</span>
                    <span className="font-mono font-bold text-slate-900">
                      {data.properties?.HBondAcceptorCount ?? "-"}
                    </span>
                    <span className="text-4xs text-slate-400 block mt-0.5">الحد الأقصى: 10</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-3xs pt-1">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-slate-500 block">المساحة القطبية (TPSA):</span>
                    <span className="font-mono font-bold text-slate-900">
                      {data.properties?.TPSA ? `${data.properties.TPSA} Å²` : "-"}
                    </span>
                    <span className="text-4xs text-slate-400 block mt-0.5">قاعدة فايبر: ≤ 140 Å²</span>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-slate-500 block">روابط دوارة (Rotatable):</span>
                    <span className="font-mono font-bold text-slate-900">
                      {data.properties?.RotatableBondCount ?? "-"}
                    </span>
                    <span className="text-4xs text-slate-400 block mt-0.5">قاعدة فايبر: ≤ 10</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Physical Properties, FDA Insights, and Peer-Reviewed Literature */}
          <div className="lg:col-span-7 space-y-4">
            {/* Section Switcher */}
            <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-2xl border border-slate-300 text-3xs font-bold">
              <button
                type="button"
                onClick={() => setActiveSection("structure")}
                className={`flex-1 py-1.5 px-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  activeSection === "structure"
                    ? "bg-white text-indigo-900 shadow-2xs font-black"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Dna className="h-3.5 w-3.5" />
                <span>الخصائص الفيزيوكيميائية</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection("fda")}
                className={`flex-1 py-1.5 px-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  activeSection === "fda"
                    ? "bg-white text-teal-900 shadow-2xs font-black"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                <span>بيانات إدارة الغذاء والدواء (FDA)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection("literature")}
                className={`flex-1 py-1.5 px-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  activeSection === "literature"
                    ? "bg-white text-purple-900 shadow-2xs font-black"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>الأبحاث والدراسات (PubMed)</span>
              </button>
            </div>

            {/* TAB 1: Physicochemical Properties */}
            {activeSection === "structure" && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-4xs font-bold text-slate-500 uppercase">Chemical & Physical Monograph</span>
                    <h4 className="text-sm sm:text-base font-black text-slate-950 mt-0.5">
                      جدول الخصائص الفيزيوكيميائية المعتمدة
                    </h4>
                  </div>
                  <span className="text-4xs font-black bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-full">
                    المصدر: PubChem PUG REST
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-2.5 font-bold text-slate-500 w-1/3">الاسم / الاستعلام</td>
                        <td className="py-2.5 font-black text-slate-900">{data.query}</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-bold text-slate-500">الصيغة الجزيئية (Formula)</td>
                        <td className="py-2.5 font-mono font-bold text-indigo-700">
                          {data.properties?.MolecularFormula || "غير محدد"}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-bold text-slate-500">الوزن الجزيئي الدقيق (MW)</td>
                        <td className="py-2.5 font-mono font-bold text-slate-900">
                          {data.properties?.MolecularWeight ? `${data.properties.MolecularWeight} g/mol` : "غير محدد"}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-bold text-slate-500">معامل الذائبية في الدهون (XLogP)</td>
                        <td className="py-2.5 font-mono font-bold text-slate-900">
                          {data.properties?.XLogP ?? "غير محدد"}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-bold text-slate-500">المساحة السطحية القطبية (TPSA)</td>
                        <td className="py-2.5 font-mono font-bold text-slate-900">
                          {data.properties?.TPSA ? `${data.properties.TPSA} Å²` : "غير محدد"}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-bold text-slate-500">معقد الجزيء (Complexity)</td>
                        <td className="py-2.5 font-mono font-bold text-slate-900">
                          {data.properties?.Complexity ?? "غير محدد"}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-bold text-slate-500">رمز InChIKey الدولي</td>
                        <td className="py-2.5 font-mono text-3xs text-slate-700 break-all">
                          {data.properties?.InChIKey || "غير محدد"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-start gap-2 text-2xs text-indigo-950 font-medium">
                  <Sparkles className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span>
                    البيانات مسترجعة مباشرة من المركز الوطني لمعلومات التكنولوجيا الحيوية الأمريكي (NCBI / PubChem) ومتوافقة مع المعايير السريرية.
                  </span>
                </div>
              </div>
            )}

            {/* TAB 2: FDA Clinical Drug Labeling */}
            {activeSection === "fda" && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-4xs font-bold text-slate-500 uppercase">openFDA Regulatory Directory</span>
                    <h4 className="text-sm sm:text-base font-black text-slate-950 mt-0.5">
                      النشرة المعتمدة لدى إدارة الغذاء والدواء الأمريكية (FDA Label)
                    </h4>
                  </div>
                  <span className="text-4xs font-black bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-full">
                    المصدر: openFDA API
                  </span>
                </div>

                {data.fdaLabel ? (
                  <div className="space-y-3.5 text-xs">
                    {data.fdaLabel.pharmClass && data.fdaLabel.pharmClass.length > 0 && (
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-slate-500 font-bold block text-3xs">التصنيف الدوائي لدى FDA:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {data.fdaLabel.pharmClass.map((cls, idx) => (
                            <span key={idx} className="bg-white border border-slate-300 text-slate-800 text-3xs px-2 py-0.5 rounded-md font-bold">
                              {cls}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {data.fdaLabel.boxedWarning && (
                      <div className="p-3.5 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-950 space-y-1">
                        <div className="flex items-center gap-1.5 font-black text-rose-900 text-xs">
                          <ShieldAlert className="h-4 w-4 text-rose-600" />
                          <span>تحذير الصندوق الأسود (FDA Boxed Warning):</span>
                        </div>
                        <p className="text-3xs font-medium leading-relaxed max-h-32 overflow-y-auto scrollbar-thin">
                          {data.fdaLabel.boxedWarning}
                        </p>
                      </div>
                    )}

                    {data.fdaLabel.indications && (
                      <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-1">
                        <span className="font-black text-emerald-950 block text-xs">الاستطبابات المعتمدة (Indications & Usage):</span>
                        <p className="text-3xs text-emerald-900 leading-relaxed font-medium max-h-36 overflow-y-auto scrollbar-thin">
                          {data.fdaLabel.indications}
                        </p>
                      </div>
                    )}

                    {data.fdaLabel.contraindications && (
                      <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 space-y-1">
                        <span className="font-black text-amber-950 block text-xs">موانع الاستخدام (Contraindications):</span>
                        <p className="text-3xs text-amber-900 leading-relaxed font-medium max-h-32 overflow-y-auto scrollbar-thin">
                          {data.fdaLabel.contraindications}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs font-medium">
                    لم يتم العثور على نشرة تسجيل مطابقة مباشرة في فهرس openFDA للاسم "{data.query}". يمكنك البحث باستخدام الاسم العلمي الدولي (INN).
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Peer-Reviewed Literature (Europe PMC & PubMed) */}
            {activeSection === "literature" && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-4xs font-bold text-slate-500 uppercase">Biomedical Literature Search</span>
                    <h4 className="text-sm sm:text-base font-black text-slate-950 mt-0.5">
                      أحدث الدراسات والأوراق البحثية المحكمة (Europe PMC / PubMed)
                    </h4>
                  </div>
                  <span className="text-4xs font-black bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-full">
                    المصدر: Europe PMC REST
                  </span>
                </div>

                {data.literature && data.literature.length > 0 ? (
                  <div className="space-y-2.5">
                    {data.literature.map((paper) => (
                      <div
                        key={paper.id}
                        className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-indigo-300 transition-all space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h5 className="text-xs font-bold text-slate-950 leading-snug">
                            {paper.title}
                          </h5>
                          {paper.isOpenAccess && (
                            <span className="text-4xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.2 rounded shrink-0">
                              Open Access
                            </span>
                          )}
                        </div>

                        <div className="text-3xs text-slate-500 flex flex-wrap items-center gap-2 font-medium">
                          {paper.authorString && <span className="truncate max-w-[200px]">{paper.authorString}</span>}
                          {paper.journalTitle && <span>• {paper.journalTitle}</span>}
                          {paper.pubYear && <span>• ({paper.pubYear})</span>}
                        </div>

                        <div className="pt-1 flex items-center justify-end">
                          <a
                            href={paper.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-800 font-bold text-3xs inline-flex items-center gap-1"
                          >
                            <span>قراءة الدراسة الكاملة</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs font-medium">
                    لا تتوفر أبحاث حديثة مرتبطة حالياً في Europe PMC.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
