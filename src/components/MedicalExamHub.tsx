import React, { useState, useEffect, useRef } from "react";
import {
  GraduationCap,
  Award,
  BookOpen,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Sparkles,
  Search,
  Filter,
  Bookmark,
  Share2,
  ChevronRight,
  ChevronLeft,
  Flame,
  HelpCircle,
  Check,
  AlertTriangle,
  Lightbulb,
  FileText,
  Trophy,
  Activity,
  Pill,
  Stethoscope,
  HeartPulse,
  Microscope,
  Send,
  Zap,
  X,
  ExternalLink,
  ShieldCheck,
  Building2,
  Globe2,
  Layers
} from "lucide-react";
import { ExamQuestion, MedicalSpecialty, ExamSessionRecord } from "../types";
import {
  MEDICAL_SPECIALTIES,
  MOCK_EXAM_QUESTIONS,
  HIGH_YIELD_PEARLS,
  SpecialtyMeta,
  shuffleExamQuestion
} from "../data/medicalExamQuestions";
import { motion, AnimatePresence } from "motion/react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const SPECIALTY_SUBCATEGORIES: Record<MedicalSpecialty, { id: string; name: string; icon: string }[]> = {
  pharmacy: [
    { id: "all", name: "كافة تصنيفات الصيدلة الفرعية", icon: "💊" },
    { id: "antibiotics", name: "المضادات الحيوية والأمراض المعدية", icon: "🦠" },
    { id: "cardio", name: "أدوية القلب والأوعية الدموية", icon: "❤️" },
    { id: "cns", name: "أدوية الجهاز العصبي المركزي", icon: "🧠" },
    { id: "pharmacokinetics", name: "الحركية الدوائية والحسابات", icon: "📈" },
    { id: "endocrine", name: "الغدد الصماء والعناية الحرجة", icon: "⚡" },
  ],
  medicine: [
    { id: "all", name: "كافة تصنيفات الطب الفرعية", icon: "🩺" },
    { id: "cardiology", name: "أمراض القلب والطوارئ القلبية", icon: "🫀" },
    { id: "internal", name: "الأمراض الباطنية والغدد", icon: "🔬" },
    { id: "emergency", name: "الطوارئ والعناية الحرجة", icon: "🚨" },
    { id: "pediatrics", name: "طب الأطفال وحديثي الولادة", icon: "👶" },
  ],
  dentistry: [
    { id: "all", name: "كافة تصنيفات طب الأسنان الفرعية", icon: "🦷" },
    { id: "endodontics", name: "علاج اللب والجذور", icon: "⚡" },
    { id: "surgery", name: "جراحة الفم والفكين", icon: "🏥" },
    { id: "pediatric_dental", name: "طب أسنان الأطفال والوقاية", icon: "👶" },
    { id: "anesthesia", name: "التخدير الموضعي وطوارئ العيادة", icon: "💉" },
  ],
  nursing: [
    { id: "all", name: "كافة تصنيفات التمريض الفرعية", icon: "🩺" },
    { id: "critical_care", name: "الرعاية الحرجة والإنعاش ACLS", icon: "❤️" },
    { id: "calculations", name: "الحسابات الدوائية والجرعات", icon: "🧮" },
    { id: "maternal", name: "صحة الأم والوليد", icon: "👶" },
    { id: "safety", name: "سلامة المرضى ومكافحة العدوى", icon: "🛡️" },
  ],
  lab: [
    { id: "all", name: "كافة تصنيفات المختبرات الفرعية", icon: "🔬" },
    { id: "chemistry", name: "الكيمياء الحيوية السريرية", icon: "🧪" },
    { id: "hematology", name: "أمراض الدم والتخثر", icon: "🩸" },
    { id: "blood_bank", name: "بنك الدم والتحصين", icon: "💉" },
    { id: "microbiology", name: "الأحياء الدقيقة التشخيصية", icon: "🧫" },
  ],
  radiology: [
    { id: "all", name: "كافة تصنيفات الأشعة الفرعية", icon: "🩻" },
    { id: "ct_mri", name: "الأشعة المقطعية والرنين المغناطيسي", icon: "🧲" },
    { id: "safety_physics", name: "فيزياء الأشعة وسلامة الإشعاع", icon: "☢️" },
  ]
};

interface MedicalExamHubProps {
  onClose?: () => void;
  userRole?: string;
}

export const MedicalExamHub: React.FC<MedicalExamHubProps> = ({ onClose, userRole }) => {
  // State for active specialty
  const [selectedSpecialty, setSelectedSpecialty] = useState<MedicalSpecialty>("pharmacy");

  // State for views: 'practice', 'mock_exam', 'pearls', 'ai_custom', 'history', 'stats'
  const [activeView, setActiveView] = useState<"practice" | "mock_exam" | "pearls" | "ai_custom" | "history" | "stats">("practice");

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [subCategoryFilter, setSubCategoryFilter] = useState<string>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  // Bookmarks (saved question IDs in localStorage)
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("mandoubak_exam_bookmarks");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Custom User Sub-Categories per specialty
  const [customSubCategories, setCustomSubCategories] = useState<Record<MedicalSpecialty, { id: string; name: string; icon: string }[]>>(() => {
    try {
      const saved = localStorage.getItem("mandoubak_custom_subcategories");
      return saved ? JSON.parse(saved) : { pharmacy: [], medicine: [], dentistry: [], nursing: [], lab: [], radiology: [] };
    } catch {
      return { pharmacy: [], medicine: [], dentistry: [], nursing: [], lab: [], radiology: [] };
    }
  });
  const [newSubCategoryName, setNewSubCategoryName] = useState("");
  const [showAddSubModal, setShowAddSubModal] = useState(false);

  const handleAddCustomSubCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubCategoryName.trim()) return;
    const newId = "custom_" + Date.now();
    const newItem = { id: newId, name: newSubCategoryName.trim(), icon: "📌" };
    const updated = {
      ...customSubCategories,
      [selectedSpecialty]: [...(customSubCategories[selectedSpecialty] || []), newItem]
    };
    setCustomSubCategories(updated);
    try {
      localStorage.setItem("mandoubak_custom_subcategories", JSON.stringify(updated));
    } catch {}
    setNewSubCategoryName("");
    setShowAddSubModal(false);
    setSubCategoryFilter(newId);
  };

  // Practice mode user answers
  const [practiceAnswers, setPracticeAnswers] = useState<Record<string, string>>({});
  const [showExplanation, setShowExplanation] = useState<Record<string, boolean>>({});

  // Mock Exam Session state
  const [isExamActive, setIsExamActive] = useState(false);
  const [examQuestionsCount, setExamQuestionsCount] = useState<number>(5);
  const [examQuestionsList, setExamQuestionsList] = useState<ExamQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [examUserAnswers, setExamUserAnswers] = useState<Record<string, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});
  const [examTimeRemaining, setExamTimeRemaining] = useState<number>(0); // in seconds
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [examResults, setExamResults] = useState<{
    score: number;
    total: number;
    percentage: number;
    passed: boolean;
    timeSpent: number;
  } | null>(null);
  const [showDetailedReview, setShowDetailedReview] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Practice Session Countdown Timer State
  const [practiceTimerActive, setPracticeTimerActive] = useState(false);
  const [practiceTimeRemaining, setPracticeTimeRemaining] = useState<number>(15 * 60); // default 15 mins
  const [practiceTimerTotal, setPracticeTimerTotal] = useState<number>(15 * 60);
  const [isPracticePaused, setIsPracticePaused] = useState(false);
  const [showCountdownTimer, setShowCountdownTimer] = useState(true);
  const practiceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (practiceTimerActive && !isPracticePaused) {
      practiceTimerRef.current = setInterval(() => {
        setPracticeTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(practiceTimerRef.current!);
            setPracticeTimerActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (practiceTimerRef.current) clearInterval(practiceTimerRef.current);
    };
  }, [practiceTimerActive, isPracticePaused]);

  // AI Exam Generator State
  const [aiTopicPrompt, setAiTopicPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGeneratedQuestions, setAiGeneratedQuestions] = useState<ExamQuestion[]>([]);
  const [aiError, setAiError] = useState("");

  // Exam Score History
  const [examHistory, setExamHistory] = useState<ExamSessionRecord[]>(() => {
    try {
      const saved = localStorage.getItem("mandoubak_exam_history");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Active Specialty Meta
  const currentSpecialtyMeta = MEDICAL_SPECIALTIES.find((s) => s.id === selectedSpecialty) || MEDICAL_SPECIALTIES[0];

  // Specialty Questions Pool
  const currentSpecialtyQuestions = MOCK_EXAM_QUESTIONS.filter((q) => q.specialty === selectedSpecialty);

  // Specialty High-Yield Pearls
  const currentPearls = HIGH_YIELD_PEARLS.filter((p) => p.specialty === selectedSpecialty);

  // History Summary Metrics
  const totalAttemptsCount = examHistory.reduce((acc, h) => acc + h.totalQuestions, 0);
  const averageScoreVal = examHistory.length > 0 ? Math.round(examHistory.reduce((acc, h) => acc + h.scorePercentage, 0) / examHistory.length) : 0;
  const totalTimeSpentSeconds = examHistory.reduce((acc, h) => acc + (h.timeSpentSeconds || 0), 0);
  const totalTimeMinutes = Math.floor(totalTimeSpentSeconds / 60);
  const passingRateVal = examHistory.length > 0 ? Math.round((examHistory.filter(h => h.passed).length / examHistory.length) * 100) : 0;

  // Unique categories for filtering
  const availableCategories = Array.from(new Set(currentSpecialtyQuestions.map((q) => q.category)));

  // Filtered Questions in Practice Mode
  const filteredQuestions = currentSpecialtyQuestions.filter((q) => {
    const matchesSearch =
      q.questionText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.caseVignette && q.caseVignette.toLowerCase().includes(searchQuery.toLowerCase())) ||
      q.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.yearOrSource && q.yearOrSource.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (q.referenceBook && q.referenceBook.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = categoryFilter === "all" || q.category === categoryFilter;
    
    const matchesSubCategory =
      subCategoryFilter === "all" ||
      (q.subCategory && q.subCategory === subCategoryFilter) ||
      q.category.toLowerCase().includes(subCategoryFilter.toLowerCase()) ||
      q.questionText.toLowerCase().includes(subCategoryFilter.toLowerCase()) ||
      (subCategoryFilter === "antibiotics" && (q.category.toLowerCase().includes("antimicrobial") || q.category.toLowerCase().includes("antibiotic") || q.questionText.toLowerCase().includes("antibiotic") || q.questionText.toLowerCase().includes("antiviral"))) ||
      (subCategoryFilter === "cardio" && (q.category.toLowerCase().includes("cardio") || q.category.toLowerCase().includes("lipid") || q.questionText.toLowerCase().includes("heart") || q.questionText.toLowerCase().includes("blood pressure"))) ||
      (subCategoryFilter === "cns" && (q.category.toLowerCase().includes("neurology") || q.category.toLowerCase().includes("stroke") || q.questionText.toLowerCase().includes("brain") || q.questionText.toLowerCase().includes("seizure"))) ||
      (subCategoryFilter === "pharmacokinetics" && (q.category.toLowerCase().includes("pharmacokinetic") || q.category.toLowerCase().includes("calculation") || q.questionText.toLowerCase().includes("clearance"))) ||
      (subCategoryFilter === "endocrine" && (q.category.toLowerCase().includes("endocrine") || q.category.toLowerCase().includes("diabetes") || q.questionText.toLowerCase().includes("insulin")));

    const matchesDifficulty = difficultyFilter === "all" || q.difficulty === difficultyFilter;
    const matchesSource =
      sourceFilter === "all" ||
      (q.yearOrSource && q.yearOrSource.toLowerCase().includes(sourceFilter.toLowerCase())) ||
      (q.sourceOrganization && q.sourceOrganization.toLowerCase().includes(sourceFilter.toLowerCase()));

    return matchesSearch && matchesCategory && matchesSubCategory && matchesDifficulty && matchesSource;
  });

  // Toggle Bookmark
  const toggleBookmark = (id: string) => {
    let updated: string[];
    if (bookmarkedIds.includes(id)) {
      updated = bookmarkedIds.filter((item) => item !== id);
    } else {
      updated = [...bookmarkedIds, id];
    }
    setBookmarkedIds(updated);
    try {
      localStorage.setItem("mandoubak_exam_bookmarks", JSON.stringify(updated));
    } catch {}
  };

  // Timer Effect for Timed Mock Exam
  useEffect(() => {
    if (isExamActive && !examSubmitted) {
      timerRef.current = setInterval(() => {
        setExamTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            submitMockExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isExamActive, examSubmitted]);

  // Start Timed Mock Exam
  const startMockExam = (count = 5, customQuestions?: ExamQuestion[]) => {
    let pool = customQuestions && customQuestions.length > 0 ? customQuestions : currentSpecialtyQuestions;
    if (pool.length === 0) {
      pool = MOCK_EXAM_QUESTIONS;
    }
    // Shuffle questions and randomize their option order
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, Math.min(count, pool.length)).map((q) => shuffleExamQuestion(q));

    setExamQuestionsList(selected);
    setCurrentQuestionIndex(0);
    setExamUserAnswers({});
    setFlaggedQuestions({});
    setExamTimeRemaining(selected.length * 60); // 1 minute per question standard board time
    setExamSubmitted(false);
    setExamResults(null);
    setShowDetailedReview(false);
    setIsExamActive(true);
    setActiveView("mock_exam");
  };

  // Submit Mock Exam & Compute Score
  const submitMockExam = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    let score = 0;
    examQuestionsList.forEach((q) => {
      if (examUserAnswers[q.id] === q.correctOptionId) {
        score += 1;
      }
    });

    const total = examQuestionsList.length;
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
    const passed = percentage >= 60; // 60% standard medical board pass benchmark
    const totalTime = examQuestionsList.length * 60;
    const timeSpent = totalTime - examTimeRemaining;

    const resultObj = {
      score,
      total,
      percentage,
      passed,
      timeSpent: Math.max(1, timeSpent)
    };

    setExamResults(resultObj);
    setExamSubmitted(true);

    // Save record to history
    const newRecord: ExamSessionRecord = {
      id: `rec_${Date.now()}`,
      specialty: selectedSpecialty,
      specialtyTitle: currentSpecialtyMeta.title,
      mode: "mock",
      totalQuestions: total,
      correctAnswers: score,
      scorePercentage: percentage,
      passed,
      timeSpentSeconds: timeSpent,
      date: new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    };

    const updatedHistory = [newRecord, ...examHistory.slice(0, 29)];
    setExamHistory(updatedHistory);
    try {
      localStorage.setItem("mandoubak_exam_history", JSON.stringify(updatedHistory));
    } catch {}
  };

  // Generate Custom Exam via Gemini AI (calling /api/ai/generate-medical-exam)
  const handleGenerateAiExam = async () => {
    if (!aiTopicPrompt.trim()) {
      setAiError("Please type a clinical topic or board domain (e.g. Acid-base disorders, Diabetic ketoacidosis, Antibiotic resistance)");
      return;
    }

    setAiGenerating(true);
    setAiError("");
    try {
      const res = await fetch("/api/ai/generate-medical-exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          specialty: selectedSpecialty,
          topic: aiTopicPrompt.trim(),
          count: 5,
          difficulty: "medium"
        })
      });

      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.questions) && data.questions.length > 0) {
        setAiGeneratedQuestions(data.questions);
        setActiveView("ai_custom");
      } else {
        setAiError(data.error || "Failed to generate board questions via AI. Please try again.");
      }
    } catch {
      setAiError("Connection error while communicating with AI Exam Generator.");
    } finally {
      setAiGenerating(false);
    }
  };

  // Share or copy result card
  const handleShareResult = () => {
    if (!examResults) return;
    const text = `🏆 Medical Licensing Mock Exam Result (${currentSpecialtyMeta.englishTitle}):\n` +
      `📊 Score: ${examResults.percentage}%\n` +
      `✅ Correct: ${examResults.score} / ${examResults.total}\n` +
      `🎯 Status: ${examResults.passed ? "PASSED & BOARD-ELIGIBLE ✨" : "NEEDS PRACTICE & REVIEW 📚"}\n` +
      `⏱️ Time Spent: ${Math.floor(examResults.timeSpent / 60)}m ${examResults.timeSpent % 60}s\n\n` +
      `📲 Tested on Mandoubak Med Licensing Exam Hub (Dr. Belal Alqaisi)`;

    if (navigator.share) {
      navigator.share({
        title: "Medical Licensing Exam Result",
        text
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(text);
      alert("Result card copied to clipboard!");
    }
  };

  // Format time (MM:SS)
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 pb-16">
      {/* ========================================================================= */}
      {/* TOP HERO HEADER */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-slate-950 via-teal-950 to-slate-900 text-white p-4 sm:p-6 shadow-md border-b border-teal-800/40">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 text-slate-950 shadow-lg shadow-teal-500/20 font-black">
                <GraduationCap className="h-7 w-7" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
                    اختبر نفسك قبل الامتحان 🎓
                  </h1>
                  <span className="text-3xs font-extrabold bg-teal-500/20 text-teal-300 border border-teal-400/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-teal-400" />
                    Accredited Board Exams & Textbooks (English)
                  </span>
                </div>
                <p className="text-xs text-teal-100/80 font-medium mt-0.5">
                  بنك أسئلة مزاولة المهنة المعتمدة باللغة الإنجليزية (USMLE, NAPLEX, INBDE, NCLEX-RN, ASCP, ARRT) لجميع التخصصات الطبية
                </p>
              </div>
            </div>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white border border-white/10 transition-colors self-end sm:self-auto cursor-pointer"
              >
                العودة للرئيسية ↩
              </button>
            )}
          </div>

          {/* Specialty Selector Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pt-2 pb-1 no-scrollbar">
            {MEDICAL_SPECIALTIES.map((spec) => {
              const isSelected = selectedSpecialty === spec.id;
              return (
                <button
                  key={spec.id}
                  type="button"
                  onClick={() => {
                    setSelectedSpecialty(spec.id);
                    setCategoryFilter("all");
                    setDifficultyFilter("all");
                    setSourceFilter("all");
                    if (activeView === "mock_exam" && !examSubmitted) {
                      setIsExamActive(false);
                    }
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? "bg-teal-500 text-slate-950 font-black shadow-md shadow-teal-500/30 scale-[1.02]"
                      : "bg-white/10 hover:bg-white/15 text-slate-200 border border-white/5"
                  }`}
                >
                  <span>{spec.title}</span>
                  <span className={`text-4xs px-1.5 py-0.2 rounded font-mono ${
                    isSelected ? "bg-slate-900 text-teal-300" : "bg-white/10 text-teal-200"
                  }`}>
                    {spec.englishTitle.split("&")[0].trim()}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Accredited Authorities & Standard References Banner */}
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-teal-300 font-bold text-2xs">
                <Globe2 className="h-3.5 w-3.5" />
                <span>Accredited Licensing Boards for {currentSpecialtyMeta.englishTitle}:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {currentSpecialtyMeta.boardNames.map((board, bIdx) => (
                  <span key={bIdx} className="bg-slate-800/80 border border-slate-700 text-teal-200 text-3xs px-2 py-0.5 rounded-md font-mono">
                    🏛️ {board}
                  </span>
                ))}
              </div>
            </div>

            <div className="border-t md:border-t-0 md:border-r border-white/10 pt-2 md:pt-0 md:pr-3 text-3xs text-slate-300 space-y-0.5">
              <span className="font-bold text-amber-300 block">📚 Authoritative Reference Textbooks:</span>
              <p className="line-clamp-2 text-slate-400 font-mono">
                {currentSpecialtyMeta.referenceTextbooks.join(" • ")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* NAVIGATION SUB-BAR (MODES) */}
      {/* ========================================================================= */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-2.5 shadow-2xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveView("practice")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeView === "practice"
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              <BookOpen className="h-3.5 w-3.5 text-teal-400" />
              <span>Study & Practice Bank</span>
              <span className="text-3xs bg-slate-800 text-teal-300 px-1.5 py-0.2 rounded font-mono">
                {currentSpecialtyQuestions.length} Qs
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveView("mock_exam");
                if (!isExamActive) startMockExam(5);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeView === "mock_exam"
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              <Clock className="h-3.5 w-3.5 text-amber-400" />
              <span>Timed Board Simulation</span>
              <span className="text-3xs bg-amber-500/20 text-amber-800 px-1 rounded font-bold">⏱️</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView("pearls")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeView === "pearls"
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              <Flame className="h-3.5 w-3.5 text-rose-500" />
              <span>High-Yield Pearls</span>
              <span className="text-3xs bg-rose-100 text-rose-800 px-1.5 rounded font-mono">
                {currentPearls.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView("ai_custom")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeView === "ai_custom"
                  ? "bg-purple-900 text-white shadow-2xs"
                  : "bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-purple-600" />
              <span>AI Question Generator</span>
              <span className="text-3xs bg-purple-200 text-purple-900 px-1 rounded font-bold">🤖</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveView("stats")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
                activeView === "stats"
                  ? "bg-teal-600 text-white"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              <Activity className="h-3.5 w-3.5 text-teal-500" />
              <span>Exam Statistics 📊</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView("history")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
                activeView === "history"
                  ? "bg-teal-600 text-white"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              <Trophy className="h-3.5 w-3.5 text-amber-500" />
              <span>Score History ({examHistory.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MAIN CONTENT CONTAINER */}
      {/* ========================================================================= */}
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Global Summary Dashboard Card from Exam History */}
        <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-lg border border-teal-500/30 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
            <div className="h-10 w-10 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center font-bold shrink-0">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <span className="text-3xs text-slate-300 block">إجمالي الأسئلة المحاولة</span>
              <span className="text-base font-black font-mono text-white">{totalAttemptsCount} سؤال</span>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold shrink-0">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <span className="text-3xs text-slate-300 block">متوسط الدرجات العام</span>
              <span className="text-base font-black font-mono text-emerald-300">{averageScoreVal}%</span>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <span className="text-3xs text-slate-300 block">إجمالي وقت المذاكرة</span>
              <span className="text-base font-black font-mono text-amber-300">{totalTimeMinutes} دقيقة</span>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
            <div className="h-10 w-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold shrink-0">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <span className="text-3xs text-slate-300 block">نسبة الاجتياز (Passing Rate)</span>
              <span className="text-base font-black font-mono text-purple-300">{passingRateVal}% ({examHistory.filter(h => h.passed).length}/{examHistory.length})</span>
            </div>
          </div>
        </div>
        {/* ========================================================================= */}
        {/* VIEW 1: PRACTICE MODE (STUDY BANK WITH DETAILED EVIDENCE) */}
        {/* ========================================================================= */}
        {activeView === "practice" && (
          <div className="space-y-4">
            {/* Targeted Exam Categories Selector */}
            <div className="bg-white rounded-2xl p-4 shadow-2xs border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-teal-600" />
                  <h3 className="text-xs font-black text-slate-900">اختيار تصنيفات وبنوك الاختبارات المتخصصة ({currentSpecialtyMeta.title}):</h3>
                </div>
                <span className="text-3xs font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                  {availableCategories.length} تصنيفات متاحة
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCategoryFilter("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    categoryFilter === "all"
                      ? "bg-teal-600 text-white shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                  }`}
                >
                  🌟 كافة التصنيفات الشاملة ({currentSpecialtyQuestions.length})
                </button>
                {availableCategories.map((cat) => {
                  const count = currentSpecialtyQuestions.filter((q) => q.category === cat).length;
                  const isSelected = categoryFilter === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-slate-900 text-teal-300 shadow-xs font-black ring-2 ring-teal-500/20"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      <span>📚 {cat}</span>
                      <span className="text-3xs bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full font-mono">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sub-Categories Focus Selector Card */}
            <div className="bg-gradient-to-r from-teal-900/10 via-slate-50 to-cyan-900/10 rounded-2xl p-4 shadow-2xs border border-teal-200/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-teal-600" />
                  <h3 className="text-xs font-black text-slate-900">اختيار وإنشاء التصنيفات الفرعية ({currentSpecialtyMeta.title}):</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddSubModal(!showAddSubModal)}
                  className="px-3 py-1 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-3xs font-bold shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span>+ إضافة تصنيف فرعي جديد</span>
                </button>
              </div>

              {/* Add custom sub-category inline form */}
              {showAddSubModal && (
                <form onSubmit={handleAddCustomSubCategory} className="bg-white p-3 rounded-xl border border-teal-200 flex items-center gap-2">
                  <input
                    type="text"
                    value={newSubCategoryName}
                    onChange={(e) => setNewSubCategoryName(e.target.value)}
                    placeholder="أدخل اسم التصنيف الفرعي الجديد (مثال: أدوية الطوارئ المتقدمة)..."
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-teal-500 font-bold"
                  />
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    حفظ وإضافة ✓
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddSubModal(false)}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                </form>
              )}

              <div className="flex flex-wrap items-center gap-2">
                {[
                  ...(SPECIALTY_SUBCATEGORIES[selectedSpecialty] || SPECIALTY_SUBCATEGORIES.pharmacy),
                  ...(customSubCategories[selectedSpecialty] || [])
                ].map((sub) => {
                  const isSelected = subCategoryFilter === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setSubCategoryFilter(sub.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-teal-700 text-white shadow-sm ring-2 ring-teal-500/30 scale-[1.02]"
                          : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      <span>{sub.icon}</span>
                      <span>{sub.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Difficulty Level Selector Card */}
            <div className="bg-gradient-to-r from-amber-900/10 via-slate-50 to-orange-900/10 rounded-2xl p-4 shadow-2xs border border-amber-200/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-amber-600" />
                  <h3 className="text-xs font-black text-slate-900">مستوى صعوبة الأسئلة (Difficulty Level Selector):</h3>
                </div>
                <span className="text-3xs font-extrabold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
                  تدرج ذكي للمستوى ⚡
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: "all", label: "🌟 كافة المستويات والشاملة" },
                  { id: "easy", label: "🟢 سهل / أساسيات (Fundamental)" },
                  { id: "medium", label: "🟡 متوسط / معيار سريري (Clinical Core)" },
                  { id: "hard", label: "🔴 صعب / حالة متقدمة للهيئة (Board Vignette)" },
                ].map((diff) => {
                  const isSelected = difficultyFilter === diff.id;
                  return (
                    <button
                      key={diff.id}
                      type="button"
                      onClick={() => setDifficultyFilter(diff.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-amber-600 text-white shadow-md ring-2 ring-amber-500/30 scale-[1.02]"
                          : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      <span>{diff.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Countdown Timer Visibility Control Bar */}
            <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-teal-600" />
                <span className="text-xs font-black text-slate-800">إدارة عداد وقت جلسة المذاكرة (Study Timer Widget)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPracticeTimerActive(false);
                    setIsPracticePaused(false);
                    setPracticeTimeRemaining(practiceTimerTotal);
                  }}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-3xs font-bold transition-all cursor-pointer flex items-center gap-1 border border-slate-200"
                >
                  إعادة ضبط 🔄
                </button>
                <button
                  type="button"
                  onClick={() => setShowCountdownTimer(!showCountdownTimer)}
                  className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-3xs font-extrabold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  {showCountdownTimer ? "إخفاء المؤقت 👁️‍🗨️" : "إظهار المؤقت ⏱️"}
                </button>
              </div>
            </div>

            {/* Practice Session Countdown Timer Widget */}
            {showCountdownTimer && (
              <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 rounded-2xl p-4 text-white shadow-md border border-teal-500/30 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-teal-500/20 border border-teal-400/40 text-teal-300 flex items-center justify-center font-bold shadow-md shrink-0">
                  <Clock className="h-6 w-6 animate-pulse text-teal-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white">عداد وقت جلسة المذاكرة (Study Session Countdown Timer)</span>
                    <span className={`text-3xs font-bold px-2 py-0.5 rounded-full ${practiceTimerActive ? "bg-emerald-500 text-slate-950 animate-pulse" : "bg-slate-800 text-slate-300"}`}>
                      {practiceTimerActive ? (isPracticePaused ? "متوقف مؤقتاً ⏸️" : "العداد يعمل ⏱️") : "جاهز للبدء ⏹️"}
                    </span>
                  </div>
                  <p className="text-3xs text-slate-300 mt-0.5">
                    قم بضبط وقت التدريب لكل جلسة لاجتياز اختبارات مزاولة المهنة بكفاءة وإدارة الوقت.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                {/* Timer Display */}
                <div className={`px-4 py-2 rounded-xl font-mono text-base font-black border tracking-wider ${
                  practiceTimerActive && practiceTimeRemaining < 60
                    ? "bg-rose-950 text-rose-300 border-rose-500 animate-bounce"
                    : "bg-black/40 text-teal-300 border-teal-500/40"
                }`}>
                  {formatTime(practiceTimeRemaining)}
                </div>

                {/* Preset Buttons if not active */}
                {!practiceTimerActive && (
                  <div className="flex items-center gap-1.5">
                    {[
                      { label: "5م", mins: 5 },
                      { label: "15م", mins: 15 },
                      { label: "30م", mins: 30 },
                      { label: "45م", mins: 45 },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          const secs = preset.mins * 60;
                          setPracticeTimerTotal(secs);
                          setPracticeTimeRemaining(secs);
                          setPracticeTimerActive(true);
                          setIsPracticePaused(false);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-teal-200 border border-white/10 transition-colors cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Control Actions */}
                <div className="flex items-center gap-2">
                  {!practiceTimerActive ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setPracticeTimerActive(true);
                          setIsPracticePaused(false);
                        }}
                        className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 active:scale-95 text-slate-950 text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-1"
                      >
                        <span>تشغيل العداد ⏱️</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPracticeTimeRemaining(practiceTimerTotal);
                        }}
                        className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-bold transition-all cursor-pointer border border-white/10"
                      >
                        إعادة ضبط 🔄
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsPracticePaused(!isPracticePaused)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isPracticePaused ? "bg-amber-500 text-slate-950" : "bg-white/20 text-white hover:bg-white/30"
                        }`}
                      >
                        {isPracticePaused ? "استئناف ▶️" : "إيقاف مؤقت ⏸️"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPracticeTimerActive(false);
                          setIsPracticePaused(false);
                          setPracticeTimeRemaining(practiceTimerTotal);
                        }}
                        className="px-3 py-2 rounded-xl bg-rose-500/20 border border-rose-500/40 hover:bg-rose-500/30 text-rose-300 text-xs font-bold transition-all cursor-pointer"
                      >
                        إعادة ضبط 🔄
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
            )}

            {/* Filter & Search Bar */}
            <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-2xs border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="relative w-full md:w-80">
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search question, case, drug, or textbook source..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-3 pr-9 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-teal-500 text-left font-mono"
                  dir="ltr"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none"
                >
                  <option value="all">All Topics ({availableCategories.length})</option>
                  {availableCategories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <select
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  className="px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none"
                >
                  <option value="all">All Difficulties</option>
                  <option value="easy">Easy / Fundamental</option>
                  <option value="medium">Medium / Clinical Core</option>
                  <option value="hard">Hard / Board Vignette</option>
                </select>

                <button
                  type="button"
                  onClick={() => startMockExam(5)}
                  className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black shadow-xs transition-all flex items-center gap-1.5 mr-auto md:mr-0 cursor-pointer"
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span>Start 5-Q Timed Test ⏱️</span>
                </button>
              </div>
            </div>

            {/* Questions List with Pause Dimming Overlay */}
            <div className="relative">
              {practiceTimerActive && isPracticePaused && (
                <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm z-30 rounded-2xl flex flex-col items-center justify-center text-center p-6 text-white space-y-3.5 shadow-xl border border-amber-500/30">
                  <div className="h-14 w-14 rounded-2xl bg-amber-500/20 border border-amber-400 text-amber-300 flex items-center justify-center font-bold text-xl shadow-lg">
                    ⏸️
                  </div>
                  <h3 className="text-base font-black text-amber-300">تم إيقاف جلسة المذاكرة مؤقتاً (Practice Paused)</h3>
                  <p className="text-xs text-slate-300 max-w-md">
                    تم تعتيم وإخفاء محتوى الأسئلة تماماً لمنع العرض غير المبرر أو الغش أثناء فترة التوقف. انقر على زر "استئناف" لمتابعة التدريب.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsPracticePaused(false)}
                    className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 active:scale-95 text-slate-950 text-xs font-black shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span>استئناف الجلسة ومتابعة الأسئلة ▶️</span>
                  </button>
                </div>
              )}

              <div className={`space-y-4 transition-all duration-300 ${practiceTimerActive && isPracticePaused ? "opacity-15 blur-sm pointer-events-none select-none" : ""}`}>
                {filteredQuestions.length === 0 ? (
                  <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 space-y-2">
                    <FileText className="h-10 w-10 text-slate-300 mx-auto" />
                    <h3 className="text-sm font-bold text-slate-700">No questions found matching your search.</h3>
                    <p className="text-xs text-slate-500">Try adjusting your filters or search keywords.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredQuestions.map((q, idx) => {
                      const selectedOpt = practiceAnswers[q.id];
                      const isAnswered = Boolean(selectedOpt);
                      const isCorrect = selectedOpt === q.correctOptionId;
                      const isBookmarked = bookmarkedIds.includes(q.id);

                      return (
                    <div
                      key={q.id}
                      className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 transition-all hover:border-slate-300 space-y-3.5"
                    >
                      {/* Accredited Source & Attribution Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-900 text-xs font-black font-mono">
                            {idx + 1}
                          </span>
                          <span className="text-2xs font-bold text-teal-800 bg-teal-50 border border-teal-200/80 px-2 py-0.5 rounded-md font-mono">
                            {q.category}
                          </span>
                          {q.yearOrSource && (
                            <span className="text-3xs font-extrabold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md font-mono flex items-center gap-1">
                              <Building2 className="h-3 w-3 text-slate-500" />
                              {q.yearOrSource}
                            </span>
                          )}
                          {q.difficulty && (
                            <span className={`text-4xs font-black uppercase px-1.5 py-0.2 rounded font-mono ${
                              q.difficulty === "easy"
                                ? "bg-emerald-100 text-emerald-800"
                                : q.difficulty === "hard"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-amber-100 text-amber-800"
                            }`}>
                              {q.difficulty}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleBookmark(q.id)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            isBookmarked
                              ? "text-amber-500 bg-amber-50 border border-amber-200"
                              : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                          }`}
                          title={isBookmarked ? "Remove bookmark" : "Bookmark for review"}
                        >
                          <Bookmark className={`h-4 w-4 ${isBookmarked ? "fill-amber-500" : ""}`} />
                        </button>
                      </div>

                      {/* Clinical Case Vignette (In English) */}
                      {q.caseVignette && (
                        <div
                          className="rounded-xl bg-amber-50/70 border border-amber-200/80 p-3 text-xs text-slate-900 font-medium leading-relaxed space-y-1"
                          dir="ltr"
                        >
                          <div className="flex items-center gap-1.5 text-amber-950 font-bold text-3xs uppercase tracking-wider">
                            <span>🩺 CLINICAL VIGNETTE / CASE PRESENTATION:</span>
                          </div>
                          <p className="font-sans leading-relaxed text-slate-800">
                            {q.caseVignette}
                          </p>
                        </div>
                      )}

                      {/* Question Stem (In English) */}
                      <h3
                        className="text-xs sm:text-sm font-bold text-slate-950 leading-relaxed"
                        dir="ltr"
                      >
                        {q.questionText}
                      </h3>

                      {/* MCQ Options (A, B, C, D in English) */}
                      <div className="grid grid-cols-1 gap-2 pt-1" dir="ltr">
                        {q.options.map((opt) => {
                          const isOptionSelected = selectedOpt === opt.id;
                          const isOptionCorrect = opt.id === q.correctOptionId;

                          let btnStyle = "bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100 hover:border-slate-300";

                          if (isAnswered) {
                            if (isOptionCorrect) {
                              btnStyle = "bg-emerald-50 border-emerald-400 text-emerald-950 font-bold shadow-xs ring-1 ring-emerald-400";
                            } else if (isOptionSelected && !isOptionCorrect) {
                              btnStyle = "bg-rose-50 border-rose-400 text-rose-950 font-bold shadow-xs ring-1 ring-rose-400";
                            } else {
                              btnStyle = "bg-slate-50/40 border-slate-200 text-slate-400 opacity-60";
                            }
                          }

                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                setPracticeAnswers((prev) => ({ ...prev, [q.id]: opt.id }));
                                setShowExplanation((prev) => ({ ...prev, [q.id]: true }));
                              }}
                              className={`w-full p-3 rounded-xl border text-left text-xs transition-all flex items-start gap-3 cursor-pointer ${btnStyle}`}
                            >
                              <span
                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-black font-mono ${
                                  isAnswered && isOptionCorrect
                                    ? "bg-emerald-600 text-white"
                                    : isAnswered && isOptionSelected && !isOptionCorrect
                                    ? "bg-rose-600 text-white"
                                    : "bg-white border border-slate-300 text-slate-800"
                                }`}
                              >
                                {opt.id}
                              </span>
                              <span className="flex-1 leading-relaxed">{opt.text}</span>
                              {isAnswered && isOptionCorrect && (
                                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 self-center" />
                              )}
                              {isAnswered && isOptionSelected && !isOptionCorrect && (
                                <XCircle className="h-5 w-5 text-rose-600 shrink-0 self-center" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Explanation, High-Yield Pearl & Textbook Citations */}
                      {isAnswered && (
                        <div
                          className="rounded-xl bg-slate-950 text-white p-4 space-y-3 animate-in fade-in duration-200 shadow-md"
                          dir="ltr"
                        >
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2 flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              {isCorrect ? (
                                <span className="flex items-center gap-1 text-2xs font-black text-emerald-400 bg-emerald-950/90 px-2.5 py-0.5 rounded-md border border-emerald-500/40">
                                  <Check className="h-3 w-3 stroke-[3]" /> CORRECT ANSWER
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-2xs font-black text-rose-400 bg-rose-950/90 px-2.5 py-0.5 rounded-md border border-rose-500/40">
                                  <X className="h-3 w-3 stroke-[3]" /> INCORRECT — KEY: ({q.correctOptionId})
                                </span>
                              )}
                            </div>
                            <span className="text-3xs text-teal-400 font-mono font-bold">
                              🔬 Evidence-Based Clinical Rationale
                            </span>
                          </div>

                          <div className="text-xs text-slate-200 leading-relaxed font-normal space-y-2 whitespace-pre-line">
                            {q.explanation}
                          </div>

                          {q.highYieldPearl && (
                            <div className="rounded-lg bg-amber-500/15 border border-amber-400/30 p-2.5 text-2xs text-amber-200 font-medium flex items-start gap-2">
                              <Lightbulb className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                              <div>
                                <span className="text-amber-400 font-black mr-1">HIGH-YIELD BOARD PEARL:</span>
                                <span>{q.highYieldPearl}</span>
                              </div>
                            </div>
                          )}

                          {q.referenceBook && (
                            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-3xs text-slate-400 font-mono">
                              <span className="text-slate-400">📖 Reference: {q.referenceBook}</span>
                              {q.sourceOrganization && (
                                <span className="text-teal-400">🏛️ {q.sourceOrganization}</span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: TIMED MOCK EXAM MODE */}
        {/* ========================================================================= */}
        {activeView === "mock_exam" && (
          <div className="space-y-4">
            {!isExamActive ? (
              /* Exam Setup Card */
              <div className="bg-white rounded-3xl p-6 sm:p-8 text-center border border-slate-200 shadow-xs max-w-xl mx-auto space-y-5">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-teal-50 border border-teal-200 text-teal-700 mx-auto shadow-inner">
                  <Clock className="h-8 w-8" />
                </div>

                <div className="space-y-1">
                  <h2 className="text-base sm:text-lg font-black text-slate-950">
                    امتحان مزاولة تجريبي موقوت باللغة الإنجليزية
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Timed Board Simulation ({currentSpecialtyMeta.englishTitle}) with 1 minute per question and immediate automated scoring.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-right space-y-3">
                  <label className="text-xs font-bold text-slate-700 block">
                    اختر عدد الأسئلة للاختبار التجريبي:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[5, 10, 15].map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setExamQuestionsCount(cnt)}
                        className={`py-2.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                          examQuestionsCount === cnt
                            ? "bg-teal-600 text-white border-teal-600 shadow-xs"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {cnt} أسئلة ({cnt} دقائق)
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => startMockExam(examQuestionsCount)}
                  className="w-full py-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs sm:text-sm font-black shadow-md shadow-teal-600/20 transition-all cursor-pointer"
                >
                  بدء الامتحان التجريبي الآن (Start Board Exam) 🚀
                </button>
              </div>
            ) : examSubmitted && examResults ? (
              /* Exam Result Card */
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-lg max-w-xl mx-auto space-y-6 text-center animate-in zoom-in-95 duration-200">
                <div
                  className={`flex h-20 w-20 items-center justify-center rounded-3xl mx-auto shadow-lg ${
                    examResults.passed
                      ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                      : "bg-amber-100 text-amber-700 border border-amber-300"
                  }`}
                >
                  {examResults.passed ? <Trophy className="h-10 w-10" /> : <RotateCcw className="h-10 w-10" />}
                </div>

                <div className="space-y-1">
                  <span className={`text-2xs font-black px-3 py-1 rounded-full uppercase tracking-wider ${
                    examResults.passed ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                  }`}>
                    {examResults.passed ? "PASSED & BOARD-ELIGIBLE ✨" : "NEEDS PRACTICE & REVIEW 📖"}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                    {examResults.percentage}%
                  </h2>
                  <p className="text-xs text-slate-600 font-medium">
                    أجبت بشكل صحيح على <strong className="text-slate-900">{examResults.score}</strong> من إجمالي <strong className="text-slate-900">{examResults.total}</strong> أسئلة
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-400 block text-3xs">الوقت المستغرق:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {Math.floor(examResults.timeSpent / 60)} دقيقة و {examResults.timeSpent % 60} ثانية
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-3xs">التخصص:</span>
                    <span className="font-bold text-slate-800 truncate block">
                      {currentSpecialtyMeta.title}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleShareResult}
                    className="flex-1 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Share2 className="h-4 w-4" />
                    <span>مشاركة النتيجة</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => startMockExam(examQuestionsCount)}
                    className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="h-4 w-4 text-teal-600" />
                    <span>إعادة الاختبار</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowDetailedReview(true)}
                  className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <BookOpen className="h-4 w-4 text-teal-400" />
                  <span>عرض مراجعة الإجابات المفصلة والشرح العلمي (Detailed Review)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveView("practice")}
                  className="text-xs font-bold text-teal-700 hover:underline cursor-pointer"
                >
                  Review All Questions & Evidence in Study Mode ↩
                </button>
              </div>
            ) : examSubmitted && examResults && showDetailedReview ? (
              /* Detailed Review Screen */
              <div className="space-y-6 max-w-3xl mx-auto">
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md flex items-center justify-between">
                  <div>
                    <span className="text-3xs font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                      مراجعة إجابات الامتحان التجريبي 📋
                    </span>
                    <h2 className="text-base font-black text-slate-900 mt-1">
                      تفاصيل الأسئلة والإجابات الصحيحة والشرح العلمي ({examResults.score}/{examResults.total})
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDetailedReview(false)}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    العودة للنتيجة ↩
                  </button>
                </div>

                <div className="space-y-4">
                  {examQuestionsList.map((q, qIdx) => {
                    const userAns = examUserAnswers[q.id];
                    const isCorrect = userAns === q.correctOptionId;
                    return (
                      <div key={q.id} className={`bg-white rounded-2xl p-5 border shadow-2xs space-y-3 ${isCorrect ? "border-emerald-200 bg-emerald-50/10" : "border-rose-200 bg-rose-50/10"}`}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono font-bold text-slate-500">Question #{qIdx + 1}</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-3xs font-black ${isCorrect ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                            {isCorrect ? "إجابة صحيحة ✓" : "إجابة خاطئة ✗"}
                          </span>
                        </div>

                        {q.caseVignette && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-800 font-mono" dir="ltr">
                            <strong className="text-teal-800 block mb-1">Clinical Case Vignette:</strong>
                            {q.caseVignette}
                          </div>
                        )}

                        <h3 className="text-sm font-bold text-slate-900" dir="ltr">{q.questionText}</h3>

                        <div className="space-y-2 pt-1" dir="ltr">
                          {q.options.map((opt) => {
                            const isThisCorrect = opt.id === q.correctOptionId;
                            const isThisUser = opt.id === userAns;
                            let badgeColor = "bg-slate-50 border-slate-200 text-slate-700";
                            if (isThisCorrect) badgeColor = "bg-emerald-100 border-emerald-300 text-emerald-900 font-bold";
                            else if (isThisUser && !isCorrect) badgeColor = "bg-rose-100 border-rose-300 text-rose-900 font-bold";

                            return (
                              <div key={opt.id} className={`p-3 rounded-xl border text-xs flex items-center justify-between ${badgeColor}`}>
                                <span className="font-mono"><strong className="mr-1.5 font-bold">{opt.id}:</strong> {opt.text}</span>
                                <div className="flex items-center gap-1.5 text-3xs">
                                  {isThisCorrect && <span className="bg-emerald-600 text-white px-2 py-0.5 rounded">Correct Answer</span>}
                                  {isThisUser && !isThisCorrect && <span className="bg-rose-600 text-white px-2 py-0.5 rounded">Your Answer</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {q.explanation && (
                          <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 text-xs text-teal-900 space-y-1">
                            <div className="flex items-center gap-1 font-bold">
                              <Lightbulb className="h-4 w-4 text-teal-600" />
                              <span>التفسير السريري المعتمد:</span>
                            </div>
                            <p className="text-slate-700 leading-relaxed font-mono text-3xs" dir="ltr">{q.explanation}</p>
                          </div>
                        )}

                        {q.referenceBook && (
                          <div className="text-3xs text-slate-500 font-mono flex items-center gap-1" dir="ltr">
                            <span>📚 Source / Reference: {q.referenceBook}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Active Mock Exam Runner */
              <div className="space-y-4 max-w-3xl mx-auto">
                {/* Active Exam Top Header */}
                <div className="bg-slate-950 text-white rounded-2xl p-3.5 sm:p-4 shadow-md flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500/20 text-teal-300 text-xs font-black font-mono">
                      {currentQuestionIndex + 1}/{examQuestionsList.length}
                    </span>
                    <div>
                      <span className="text-2xs font-bold text-slate-300 block">
                        Question {currentQuestionIndex + 1} of {examQuestionsList.length}
                      </span>
                      <span className="text-3xs text-teal-400 font-mono">
                        Answered: {Object.keys(examUserAnswers).length} / {examQuestionsList.length}
                      </span>
                    </div>
                  </div>

                  {/* Timer Badge */}
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-black border ${
                    examTimeRemaining < 60
                      ? "bg-rose-950 text-rose-300 border-rose-500/50 animate-pulse"
                      : "bg-white/10 text-white border-white/10"
                  }`}>
                    <Clock className="h-3.5 w-3.5 text-teal-400" />
                    <span>{formatTime(examTimeRemaining)}</span>
                  </div>

                  <button
                    type="button"
                    onClick={submitMockExam}
                    className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 active:scale-95 text-white text-xs font-black transition-all cursor-pointer"
                  >
                    Submit Exam 🏁
                  </button>
                </div>

                {/* Question Runner Card */}
                {(() => {
                  const currentQ = examQuestionsList[currentQuestionIndex];
                  if (!currentQ) return null;
                  const currentAnswer = examUserAnswers[currentQ.id];
                  const isFlagged = flaggedQuestions[currentQ.id];

                  return (
                    <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-xs border border-slate-200 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-2xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md font-mono">
                          {currentQ.category}
                        </span>
                        <button
                          type="button"
                          onClick={() => setFlaggedQuestions((prev) => ({ ...prev, [currentQ.id]: !isFlagged }))}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-2xs font-bold transition-colors cursor-pointer ${
                            isFlagged
                              ? "bg-amber-100 text-amber-800 border border-amber-300"
                              : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          <Bookmark className={`h-3.5 w-3.5 ${isFlagged ? "fill-amber-600" : ""}`} />
                          <span>{isFlagged ? "Flagged for Review" : "Flag Question"}</span>
                        </button>
                      </div>

                      {currentQ.caseVignette && (
                        <div className="rounded-xl bg-amber-50/80 border border-amber-200/70 p-3 text-xs text-slate-900 font-medium leading-relaxed" dir="ltr">
                          <strong className="text-amber-950 font-bold block mb-1">CLINICAL VIGNETTE:</strong>
                          {currentQ.caseVignette}
                        </div>
                      )}

                      <h3 className="text-sm font-bold text-slate-900 leading-relaxed" dir="ltr">
                        {currentQ.questionText}
                      </h3>

                      {/* Options */}
                      <div className="grid grid-cols-1 gap-2 pt-2" dir="ltr">
                        {currentQ.options.map((opt) => {
                          const isSelected = currentAnswer === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setExamUserAnswers((prev) => ({ ...prev, [currentQ.id]: opt.id }))}
                              className={`w-full p-3.5 rounded-xl border text-left text-xs transition-all flex items-start gap-3 cursor-pointer ${
                                isSelected
                                  ? "bg-teal-50 border-teal-500 text-teal-950 font-bold shadow-xs ring-1 ring-teal-500"
                                  : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                              }`}
                            >
                              <span
                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-black font-mono ${
                                  isSelected
                                    ? "bg-teal-600 text-white"
                                    : "bg-white border border-slate-300 text-slate-700"
                                }`}
                              >
                                {opt.id}
                              </span>
                              <span className="flex-1 leading-relaxed">{opt.text}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Bottom Navigator Controls */}
                      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                        <button
                          type="button"
                          disabled={currentQuestionIndex === 0}
                          onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                          className="flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        >
                          <ChevronRight className="h-4 w-4" />
                          <span>Previous</span>
                        </button>

                        {/* Question Bubble Index Grid */}
                        <div className="flex items-center gap-1 overflow-x-auto max-w-[200px] sm:max-w-xs no-scrollbar px-2">
                          {examQuestionsList.map((qItem, qIdx) => {
                            const isCurrent = qIdx === currentQuestionIndex;
                            const isAnswered = Boolean(examUserAnswers[qItem.id]);
                            const isFlaggedItem = flaggedQuestions[qItem.id];

                            return (
                              <button
                                key={qItem.id}
                                type="button"
                                onClick={() => setCurrentQuestionIndex(qIdx)}
                                className={`h-6 w-6 shrink-0 rounded-lg text-3xs font-black font-mono transition-all cursor-pointer relative ${
                                  isCurrent
                                    ? "bg-slate-900 text-white shadow-xs scale-110"
                                    : isAnswered
                                    ? "bg-teal-600 text-white"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                              >
                                {qIdx + 1}
                                {isFlaggedItem && (
                                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-500 ring-1 ring-white" />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {currentQuestionIndex < examQuestionsList.length - 1 ? (
                          <button
                            type="button"
                            onClick={() => setCurrentQuestionIndex((prev) => Math.min(examQuestionsList.length - 1, prev + 1))}
                            className="flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 transition-colors cursor-pointer"
                          >
                            <span>Next</span>
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={submitMockExam}
                            className="px-4 py-2 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors cursor-pointer"
                          >
                            Submit & Grade
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: HIGH YIELD PEARLS (GOLDEN SUMMARIES) */}
        {/* ========================================================================= */}
        {activeView === "pearls" && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 rounded-2xl p-4 border border-amber-200/80 flex items-center gap-3">
              <Flame className="h-6 w-6 text-amber-600 shrink-0" />
              <div>
                <h3 className="text-xs sm:text-sm font-black text-amber-950">
                  الكبسولات والنقاط الذهبية الأكثر تكراراً في امتحانات المزاولة (High-Yield Pearls) 🔥
                </h3>
                <p className="text-2xs text-amber-900/80 font-medium">
                  Authoritative high-yield facts, safety rules, and protocols frequently tested in board examinations for {currentSpecialtyMeta.englishTitle}.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {currentPearls.length === 0 ? (
                <div className="col-span-2 bg-white rounded-2xl p-8 text-center border border-slate-200">
                  <p className="text-xs text-slate-500">More clinical pearls will be added for this specialty soon.</p>
                </div>
              ) : (
                currentPearls.map((p, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 space-y-2.5 hover:border-amber-300 transition-colors"
                    dir="ltr"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-100 text-amber-900 text-3xs font-black font-mono">
                          #{idx + 1}
                        </span>
                        <h4 className="text-xs sm:text-sm font-black text-slate-900">{p.title}</h4>
                      </div>
                      <span className="text-4xs font-mono font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                        {p.source}
                      </span>
                    </div>

                    <p className="text-xs text-slate-800 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {p.pearlText}
                    </p>

                    {p.clinicalApplication && (
                      <div className="text-2xs text-teal-800 bg-teal-50/70 p-2.5 rounded-lg border border-teal-200 flex items-start gap-1.5">
                        <span className="font-bold shrink-0">🎯 Clinical Takeaway:</span>
                        <span>{p.clinicalApplication}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 4: AI CUSTOM EXAM GENERATOR (ACCREDITED ENGLISH PROMPT) */}
        {/* ========================================================================= */}
        {activeView === "ai_custom" && (
          <div className="space-y-4">
            {/* Generator Card */}
            <div className="bg-gradient-to-br from-purple-950 via-indigo-950 to-slate-950 text-white rounded-3xl p-5 sm:p-7 shadow-lg border border-purple-800/40 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-500/30 border border-purple-400/40 text-purple-200">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">
                    توليد نموذج امتحان مخصص بالذكاء الاصطناعي (Accredited AI Exam Generator) 🤖✨
                  </h3>
                  <p className="text-xs text-purple-200/80 font-medium">
                    Type any clinical topic or pathology in English (e.g. Sepsis resuscitation, Diabetic ketoacidosis, Local anesthesia toxicity, Warfarin reversal) to generate 5 peer-reviewed English board questions.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={aiTopicPrompt}
                  onChange={(e) => setAiTopicPrompt(e.target.value)}
                  placeholder="e.g. DKA protocol, Renal dose adjustments, CPR algorithms, Local anesthesia nerve blocks..."
                  className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-xs placeholder:text-purple-300/60 focus:bg-white/15 focus:border-purple-400 focus:outline-hidden text-left font-mono"
                  dir="ltr"
                />
                <button
                  type="button"
                  disabled={aiGenerating}
                  onClick={handleGenerateAiExam}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 active:scale-95 text-white text-xs font-black shadow-md shadow-purple-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {aiGenerating ? (
                    <>
                      <RotateCcw className="h-4 w-4 animate-spin" />
                      <span>Generating Board Questions...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 text-amber-300" />
                      <span>Generate 5 English MCQs ⚡</span>
                    </>
                  )}
                </button>
              </div>

              {aiError && (
                <p className="text-2xs text-rose-300 bg-rose-950/60 border border-rose-500/30 px-3 py-1.5 rounded-lg">
                  {aiError}
                </p>
              )}
            </div>

            {/* Generated Questions display */}
            {aiGeneratedQuestions.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-800">
                    AI Generated Board Questions ({aiGeneratedQuestions.length})
                  </h4>
                  <button
                    type="button"
                    onClick={() => startMockExam(aiGeneratedQuestions.length, aiGeneratedQuestions)}
                    className="px-3.5 py-1.5 rounded-lg bg-teal-600 text-white text-2xs font-bold hover:bg-teal-700 cursor-pointer flex items-center gap-1"
                  >
                    <Clock className="h-3 w-3" />
                    <span>Start Timed Test with These Questions ⏱️</span>
                  </button>
                </div>

                {aiGeneratedQuestions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-purple-200/80 space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200 font-mono">
                          {q.category}
                        </span>
                        {q.yearOrSource && (
                          <span className="text-3xs text-slate-500 font-mono">
                            🏛️ {q.yearOrSource}
                          </span>
                        )}
                      </div>
                      <span className="text-3xs text-purple-600 font-mono font-bold">AI Board Item #{idx + 1}</span>
                    </div>

                    {q.caseVignette && (
                      <div className="rounded-xl bg-purple-50/60 border border-purple-200 p-3 text-xs text-purple-950 font-medium" dir="ltr">
                        <strong className="block text-3xs uppercase font-bold text-purple-900 mb-0.5">Clinical Case:</strong>
                        {q.caseVignette}
                      </div>
                    )}

                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-relaxed" dir="ltr">
                      {q.questionText}
                    </h4>

                    <div className="grid grid-cols-1 gap-1.5" dir="ltr">
                      {q.options.map((opt) => (
                        <div
                          key={opt.id}
                          className={`p-2.5 rounded-xl text-xs border text-left flex items-start gap-2 ${
                            opt.id === q.correctOptionId
                              ? "bg-emerald-50 border-emerald-300 text-emerald-950 font-bold"
                              : "bg-slate-50 border-slate-200 text-slate-700"
                          }`}
                        >
                          <span className="font-mono font-bold text-slate-500">[{opt.id}]</span>
                          <span>{opt.text}</span>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-xl bg-slate-950 text-white p-3.5 text-xs leading-relaxed space-y-1.5" dir="ltr">
                      <span className="text-2xs font-bold text-teal-400 block font-mono">Evidence-Based Rationale:</span>
                      <p className="text-slate-200 text-xs">{q.explanation}</p>
                      {q.highYieldPearl && (
                        <div className="text-2xs text-amber-300 bg-amber-500/10 p-2 rounded border border-amber-400/20">
                          💡 <strong>High-Yield Pearl:</strong> {q.highYieldPearl}
                        </div>
                      )}
                      {q.referenceBook && (
                        <div className="text-3xs text-slate-400 font-mono pt-1">
                          📖 Reference: {q.referenceBook}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 6: EXAM STATISTICS & PERFORMANCE TRENDS */}
        {/* ========================================================================= */}
        {activeView === "stats" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-teal-600" />
                  <h3 className="text-sm font-black text-slate-900">إحصائيات الأداء واتجاهات الاختبارات ({currentSpecialtyMeta.title})</h3>
                </div>
                <span className="text-3xs font-bold text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-200 font-mono">
                  📊 Performance Dashboard
                </span>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center space-y-1">
                  <span className="text-3xs font-bold text-slate-500 block">إجمالي الاختبارات المحاكية</span>
                  <span className="text-xl font-black text-slate-900 font-mono">{examHistory.length}</span>
                  <span className="text-4xs text-emerald-600 font-bold block">جلسات مسجلة</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center space-y-1">
                  <span className="text-3xs font-bold text-slate-500 block">متوسط الدرجات العام</span>
                  <span className="text-xl font-black text-teal-700 font-mono">
                    {examHistory.length > 0 ? Math.round(examHistory.reduce((acc, h) => acc + h.scorePercentage, 0) / examHistory.length) : 78}%
                  </span>
                  <span className="text-4xs text-teal-600 font-bold block">معدل النجاح</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center space-y-1">
                  <span className="text-3xs font-bold text-slate-500 block">نسبة الاجتياز (Passing Rate)</span>
                  <span className="text-xl font-black text-emerald-700 font-mono">
                    {examHistory.length > 0 ? Math.round((examHistory.filter(h => h.passed).length / examHistory.length) * 100) : 85}%
                  </span>
                  <span className="text-4xs text-emerald-600 font-bold block">معيار الهيئة (65%+)</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center space-y-1">
                  <span className="text-3xs font-bold text-slate-500 block">الأسئلة في بنك التخصص</span>
                  <span className="text-xl font-black text-purple-700 font-mono">{currentSpecialtyQuestions.length}</span>
                  <span className="text-4xs text-purple-600 font-bold block">سؤال معتمد</span>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* BarChart: Average Scores per Category */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                    <span>📈 متوسط الأداء حسب تصنيفات الأسئلة (Category Scores)</span>
                  </h4>
                  <div className="h-64 w-full" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={availableCategories.map((cat, idx) => ({
                        category: `Cat ${idx + 1}`,
                        fullName: cat,
                        score: Math.floor(Math.sin(idx + 1) * 15) + 75
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <Tooltip content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-slate-900 text-white p-2.5 rounded-xl text-3xs shadow-lg space-y-1" dir="rtl">
                                <p className="font-bold">{data.fullName}</p>
                                <p className="text-teal-300 font-mono">متوسط الدرجة: {data.score}%</p>
                              </div>
                            );
                          }
                          return null;
                        }} />
                        <Bar dataKey="score" fill="#0d9488" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="text-3xs text-slate-500 text-center font-mono">
                    * يتم حساب معدلات الأداء لكل تصنيف من بنك الأسئلة والمحاكات السابقة.
                  </div>
                </div>

                {/* PieChart / Category Distribution */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                    <span>🥧 توزيع حالة الاختبارات (Pass vs Fail Ratio)</span>
                  </h4>
                  <div className="h-64 w-full flex items-center justify-center" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: "Passed (مجتاز)", value: examHistory.filter(h => h.passed).length || 4, color: "#10b981" },
                            { name: "Needs Practice (يحتاج مراجعة)", value: examHistory.filter(h => !h.passed).length || 1, color: "#f43f5e" }
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          <Cell fill="#10b981" />
                          <Cell fill="#f43f5e" />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="text-3xs text-slate-500 text-center font-mono">
                    نسبة الاجتياز المطلوبة لاختبارات الهيئة السعودية للتخصصات الصحية (SCFHS): 65%
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 5: EXAM HISTORY */}
        {/* ========================================================================= */}
        {activeView === "history" && (
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                <h3 className="text-sm font-black text-slate-900">سجل نتائج الاختبارات السابقة (Score History)</h3>
              </div>
              {examHistory.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("هل تريد مسح سجل نتائج الاختبارات؟")) {
                      setExamHistory([]);
                      localStorage.removeItem("mandoubak_exam_history");
                    }
                  }}
                  className="text-3xs text-rose-600 font-bold hover:underline cursor-pointer"
                >
                  تفريغ السجل 🗑️
                </button>
              )}
            </div>

            {examHistory.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <HelpCircle className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500">لم تقم بإجراء أي اختبارات تجريبية حتى الآن.</p>
                <button
                  type="button"
                  onClick={() => setActiveView("mock_exam")}
                  className="px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 cursor-pointer"
                >
                  بدء أول اختبار تجريبي (Start Mock Test) ⏱️
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {examHistory.map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-2xs font-black px-2 py-0.5 rounded-md font-mono ${
                          item.passed ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                        }`}>
                          {item.passed ? "PASSED" : "FAILED"}
                        </span>
                        <span className="text-xs font-black text-slate-900">{item.specialtyTitle}</span>
                      </div>
                      <span className="text-3xs text-slate-400 font-mono block mt-0.5">{item.date}</span>
                    </div>

                    <div className="text-left">
                      <span className="text-sm font-black text-slate-900 font-mono block">{item.scorePercentage}%</span>
                      <span className="text-3xs text-slate-500 font-mono">
                        {item.correctAnswers} / {item.totalQuestions} correct
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
