import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Send,
  X,
  Bot,
  User,
  Zap,
  Search,
  Brain,
  MessageSquare,
  Globe,
  Loader2,
  Trash2,
  Pill,
  HelpCircle,
  Cpu,
  Layers,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Compass,
  Navigation,
  ExternalLink,
  BookOpen,
  Briefcase
} from "lucide-react";

interface GroundingMapSource {
  uri?: string;
  title?: string;
  placeAnswerSources?: {
    reviewSnippets?: Array<{ text?: string }>;
  };
}

interface GroundingWebSource {
  uri?: string;
  title?: string;
}

interface GroundingSourceItem {
  web?: GroundingWebSource;
  maps?: GroundingMapSource;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  provider?: "gemini" | "openrouter";
  modelUsed?: string;
  groundingSources?: GroundingSourceItem[];
  timestamp: string;
}

interface ProviderInfo {
  gemini: { configured: boolean; defaultModel: string };
  openrouter: {
    configured: boolean;
    workspaceId: string;
    defaultModel: string;
    models: Array<{ id: string; name: string }>;
  };
  activeDefault: string;
}

interface GeminiChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: string;
  userName?: string;
}

export type ChatMode = "standard" | "complex" | "fast" | "search" | "maps";

export type ChatbotRole = "pharma" | "sales" | "maps_guide" | "researcher";

const ROLE_DEFINITIONS: Record<ChatbotRole, { name: string; icon: any; instruction: string; description: string }> = {
  pharma: {
    name: "المستشار الصيدلاني والسريري",
    icon: Pill,
    description: "استشارات دوائية، جرعات، بدائل علمية، وتداخلات دوائية",
    instruction: `أنت المستشار الصيدلاني والطبي الخبير لمنصة "مندوبك الطبي". تواصل بلغة عربية فصحى، علمية، دقيقة، وموثقة. قدم تحليلات فارماكولوجية موثوقة وجرعات إرشادية وتنبيهات السلامة للأطباء والصيادلة.`
  },
  sales: {
    name: "مستشار مبيعات وتسويق المندوب",
    icon: Briefcase,
    description: "استراتيجيات إقناع الأطباء، إغلاق الصفقات، وترتيب خطط الزيارات",
    instruction: `أنت كبير مستشاري المبيعات والتسويق الدوائي لمناديب الدعاية الطبية في "مندوبك الطبي". قدم نصائح عملية ومباشرة في كيفية تقديم المنتجات للأطباء والصيادلة، وتكتيكات إغلاق الصفقات وإدارة عروض البونص والخصومات باحترافية.`
  },
  maps_guide: {
    name: "دليل الصيدليات والمرافق الطبية",
    icon: MapPin,
    description: "تحديد مواقع الصيدليات، المستشفيات، والمراكز الطبية عبر خرائط Google",
    instruction: `أنت دليل الميدان الطبي المتخصص في تحديد مواقع المستشفيات، الصيدليات، والمراكز الصحية في اليمن ومحافظاتها عبر Google Maps. قدم إرشادات جغرافية واضحة ومواقع دقيقة لتسهيل جولات المندوب والوصول للعملاء.`
  },
  researcher: {
    name: "الباحث العلمي الحديث (Search)",
    icon: Globe,
    description: "أحدث الدراسات السريرية، تحديثات FDA، وبروتوكولات العلاج الحية",
    instruction: `أنت باحث علمي وطبي معتمد متخصص في جلب أحدث الأبحاث والبروتوكولات السريرية والأخبار الدوائية عبر Google Search Grounding. تأكد من توثيق المعلومات بأحدث المعطيات الميدانية والدراسات الموثقة.`
  }
};

export const GeminiChatModal: React.FC<GeminiChatModalProps> = ({
  isOpen,
  onClose,
  userRole = "rep",
  userName = "الدكتور"
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init_1",
      role: "assistant",
      text: `أهلاً بك دكتور/أستاذ ${userName}! 👨‍⚕️✨ أنا مساعد الذكاء الاصطناعي لمنصة **مندوبك الطبي** (مدعوم بنماذج Gemini المتقدمة: gemini-3.1-pro-preview للمهام المعقدة، gemini-3.5-flash للمهام العامة مع البحث والخرائط، و gemini-3.1-flash-lite للاستجابة السريعة).

يمكنك سؤالي عن:
• الاستشارات الدوائية والتداخلات السريرية 💊
• البحث الحي عن أحدث الدراسات عبر Google Search 🔍
• مواقع الصيدليات والمستشفيات عبر Google Maps 📍
• استراتيجيات تسويق وتطوير مبيعات المندوب 📈`,
      timestamp: new Date().toLocaleTimeString("ar-YE", { hour: "2-digit", minute: "2-digit" })
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>("standard");
  const [chatbotRole, setChatbotRole] = useState<ChatbotRole>("pharma");
  const [aiProvider, setAiProvider] = useState<"auto" | "gemini" | "openrouter">("auto");
  const [openRouterModel, setOpenRouterModel] = useState<string>("deepseek/deepseek-chat");
  const [providerInfo, setProviderInfo] = useState<ProviderInfo | null>(null);
  const [selectedCity, setSelectedCity] = useState<string>("sanaa");
  const [userCoordinates, setUserCoordinates] = useState<{ latitude: number; longitude: number } | null>({
    latitude: 15.3547,
    longitude: 44.2000
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      fetchProviders();

      // Try fetching precise geolocation if supported
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setUserCoordinates({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude
            });
          },
          (err) => {
            console.log("Using default Yemen coordinates for Maps Grounding:", err.message);
          },
          { timeout: 5000 }
        );
      }
    }
  }, [messages, isOpen]);

  const fetchProviders = async () => {
    try {
      const res = await fetch("/api/ai/providers");
      if (res.ok) {
        const data: ProviderInfo = await res.json();
        setProviderInfo(data);
      }
    } catch (e) {
      console.warn("Could not fetch AI providers info", e);
    }
  };

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const messageText = (textToSend || input).trim();
    if (!messageText || loading) return;

    const userMsg: ChatMessage = {
      id: "u_" + Date.now(),
      role: "user",
      text: messageText,
      timestamp: new Date().toLocaleTimeString("ar-YE", { hour: "2-digit", minute: "2-digit" })
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    if (!textToSend) setInput("");
    setLoading(true);

    try {
      const currentRole = ROLE_DEFINITIONS[chatbotRole];
      const systemInstruction = currentRole.instruction;

      // Coordinate mapping for maps grounding
      let locationPayload = userCoordinates;
      if (selectedCity === "aden") locationPayload = { latitude: 12.7855, longitude: 45.0187 };
      if (selectedCity === "taiz") locationPayload = { latitude: 13.5776, longitude: 44.0179 };
      if (selectedCity === "ibb") locationPayload = { latitude: 13.9667, longitude: 44.1833 };
      if (selectedCity === "hodeidah") locationPayload = { latitude: 14.7978, longitude: 42.9545 };

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role === "user" ? "user" : "assistant",
            text: m.text
          })),
          mode: chatMode,
          provider: aiProvider,
          openRouterModel: aiProvider === "openrouter" ? openRouterModel : undefined,
          systemInstruction,
          location: chatMode === "maps" ? locationPayload : undefined
        })
      });

      const data = await response.json();

      if (data.success) {
        const botMsg: ChatMessage = {
          id: "b_" + Date.now(),
          role: "assistant",
          text: data.reply,
          provider: data.provider,
          modelUsed: data.modelUsed,
          groundingSources: data.groundingChunks,
          timestamp: new Date().toLocaleTimeString("ar-YE", { hour: "2-digit", minute: "2-digit" })
        };
        setMessages((prev) => [...prev, botMsg]);
      } else {
        throw new Error(data.error || "خطأ في الاتصال بالذكاء الاصطناعي");
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: "err_" + Date.now(),
        role: "assistant",
        text: `عذراً، حدث خطأ: ${err.message || "تعذر الحصول على إجابة. يرجى المحاولة لاحقاً."}`,
        timestamp: new Date().toLocaleTimeString("ar-YE", { hour: "2-digit", minute: "2-digit" })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm("هل تريد مسح سجل المحادثة والبدء من جديد؟")) {
      setMessages([
        {
          id: "init_" + Date.now(),
          role: "assistant",
          text: `تم بدء محادثة جديدة! أنا جاهز لمساعدتك دكتور ${userName} بالدور المحدد (${ROLE_DEFINITIONS[chatbotRole].name}). كيف أستطيع خدمتك؟`,
          timestamp: new Date().toLocaleTimeString("ar-YE", { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    }
  };

  const quickPrompts = [
    { text: "🔍 أحدث مستجدات علاج جرثومة المعدة H. Pylori لعام 2026", mode: "search", role: "researcher" as ChatbotRole },
    { text: "📍 أين تقع مستشفى الثورة العام بصنعاء وأقرب صيدلية لها؟", mode: "maps", role: "maps_guide" as ChatbotRole },
    { text: "🧠 تحليل تداخل دوائي معقد بين Warfarin و Clarithromycin", mode: "complex", role: "pharma" as ChatbotRole },
    { text: "⚡ الجرعة المعتادة لـ Paracetamol للأطفال حسب الوزن", mode: "fast", role: "pharma" as ChatbotRole },
    { text: "💼 خطة لإقناع طبيب أطفال بوصف مضاد حيوي شراب جديد", mode: "standard", role: "sales" as ChatbotRole }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-2 sm:p-4">
      <div className="flex h-[92vh] w-full max-w-3xl flex-col rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden text-right">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-800 px-4 sm:px-6 py-3.5 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-teal-200 shadow-inner">
              <Sparkles className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">المساعد الطبي والدوائي الذكي</h2>
                <span className="bg-white/20 text-teal-100 px-2 py-0.5 rounded-full text-3xs font-semibold">
                  Gemini AI
                </span>
              </div>
              <p className="text-xs text-teal-100/90 font-medium">
                استشارات سريرية • خرائط ميدانية • بحث حي • خطط مبيعات
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleClearHistory}
              title="مسح سجل المحادثة"
              className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Chatbot Role Selection Bar */}
        <div className="bg-slate-800 text-white px-3 py-2 border-b border-slate-700/80 flex flex-wrap items-center justify-between gap-2 text-2xs sm:text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-300">
            <Bot className="h-3.5 w-3.5 text-teal-400" />
            <span>دور المساعد الذكي:</span>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto py-0.5">
            {(Object.keys(ROLE_DEFINITIONS) as ChatbotRole[]).map((rKey) => {
              const rDef = ROLE_DEFINITIONS[rKey];
              const IconComp = rDef.icon;
              const isSelected = chatbotRole === rKey;
              return (
                <button
                  key={rKey}
                  onClick={() => setChatbotRole(rKey)}
                  className={`px-2.5 py-1 rounded-xl text-3xs font-bold transition-all flex items-center gap-1 whitespace-nowrap ${
                    isSelected
                      ? "bg-teal-600 text-white shadow-xs"
                      : "bg-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-700"
                  }`}
                  title={rDef.description}
                >
                  <IconComp className="h-3 w-3" />
                  <span>{rDef.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mode Selector Tabs (Matching User Requirements) */}
        <div className="grid grid-cols-5 gap-1 bg-slate-100 p-1.5 text-3xs sm:text-2xs font-bold border-b border-slate-200">
          <button
            onClick={() => setChatMode("standard")}
            className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-xl transition-all ${
              chatMode === "standard"
                ? "bg-white text-teal-800 shadow-xs border border-teal-500/30"
                : "text-slate-600 hover:bg-slate-200/60"
            }`}
            title="مهام عامة باستخدام gemini-3.5-flash"
          >
            <Bot className="h-3.5 w-3.5 text-teal-600" />
            <span>عام (3.5 Flash)</span>
          </button>

          <button
            onClick={() => setChatMode("complex")}
            className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-xl transition-all ${
              chatMode === "complex"
                ? "bg-white text-purple-800 shadow-xs border border-purple-500/30"
                : "text-slate-600 hover:bg-slate-200/60"
            }`}
            title="مهام معقدة واستشارات سريرية متقدمة باستخدام gemini-3.1-pro-preview"
          >
            <Brain className="h-3.5 w-3.5 text-purple-600" />
            <span>معقد (3.1 Pro)</span>
          </button>

          <button
            onClick={() => setChatMode("fast")}
            className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-xl transition-all ${
              chatMode === "fast"
                ? "bg-white text-amber-800 shadow-xs border border-amber-500/30"
                : "text-slate-600 hover:bg-slate-200/60"
            }`}
            title="استجابة فائقة السرعة باستخدام gemini-3.1-flash-lite"
          >
            <Zap className="h-3.5 w-3.5 text-amber-600" />
            <span>سريع (Lite)</span>
          </button>

          <button
            onClick={() => setChatMode("search")}
            className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-xl transition-all ${
              chatMode === "search"
                ? "bg-white text-sky-800 shadow-xs border border-sky-500/30"
                : "text-slate-600 hover:bg-slate-200/60"
            }`}
            title="بحث جوجل الحي باستخدام gemini-3.5-flash مع googleSearch"
          >
            <Globe className="h-3.5 w-3.5 text-sky-600" />
            <span>بحث (Google Search)</span>
          </button>

          <button
            onClick={() => setChatMode("maps")}
            className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-xl transition-all ${
              chatMode === "maps"
                ? "bg-white text-emerald-800 shadow-xs border border-emerald-500/30"
                : "text-slate-600 hover:bg-slate-200/60"
            }`}
            title="خرائط ومواقع الصيدليات والمستشفيات باستخدام gemini-3.5-flash مع googleMaps"
          >
            <MapPin className="h-3.5 w-3.5 text-emerald-600" />
            <span>خرائط (Google Maps)</span>
          </button>
        </div>

        {/* Location selector banner if Maps mode is active */}
        {chatMode === "maps" && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 text-2xs text-emerald-900">
            <div className="flex items-center gap-1 font-bold">
              <Compass className="h-3.5 w-3.5 text-emerald-700" />
              <span>نطاق البحث الجغرافي للمرافق الطبية:</span>
            </div>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="bg-white border border-emerald-300 rounded-lg px-2 py-0.5 text-3xs font-semibold text-emerald-900 focus:outline-hidden"
            >
              <option value="sanaa">صنعاء وأمانة العاصمة</option>
              <option value="aden">عدن ومحيطها</option>
              <option value="taiz">تعز والحوبان</option>
              <option value="ibb">إب والمحافظة</option>
              <option value="hodeidah">الحديدة والساحل</option>
            </select>
          </div>
        )}

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-emerald-50/80 border-b border-emerald-200/60">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-xs font-bold ${
                  m.role === "user"
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "bg-gradient-to-br from-emerald-800 to-teal-800 text-white shadow-xs"
                }`}
              >
                {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>

              <div className={`max-w-[85%] space-y-1 ${m.role === "user" ? "text-left" : "text-right"}`}>
                <div
                  className={`rounded-2xl p-4 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-emerald-700 text-white rounded-tl-none shadow-xs font-medium"
                      : "bg-white border-2 border-emerald-200 text-black font-semibold rounded-tr-none shadow-xs"
                  }`}
                >
                  <span className={m.role === "user" ? "text-white" : "text-black"}>
                    {m.text}
                  </span>

                  {/* Grounding Sources (Google Search & Google Maps) */}
                  {m.groundingSources && m.groundingSources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-emerald-100 text-2xs space-y-2">
                      {/* Web Search Sources */}
                      {m.groundingSources.some((s) => s.web?.uri) && (
                        <div>
                          <div className="font-bold text-black flex items-center gap-1 mb-1.5">
                            <Globe className="h-3.5 w-3.5 text-emerald-700" />
                            <span>مصادر معتمدة من Google Search:</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {m.groundingSources.map((src, idx) =>
                              src.web?.uri ? (
                                <a
                                  key={"web_" + idx}
                                  href={src.web.uri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-emerald-100/70 text-black border border-emerald-300 px-2.5 py-1 rounded-lg text-3xs font-bold hover:bg-emerald-200 transition-colors inline-flex items-center gap-1 shadow-2xs"
                                >
                                  <ExternalLink className="h-2.5 w-2.5 shrink-0 text-emerald-800" />
                                  <span className="truncate max-w-[220px]">{src.web.title || `مصدر موثوق ${idx + 1}`}</span>
                                </a>
                              ) : null
                            )}
                          </div>
                        </div>
                      )}

                      {/* Google Maps Places */}
                      {m.groundingSources.some((s) => s.maps?.uri || s.maps?.title) && (
                        <div className="pt-1">
                          <div className="font-bold text-black flex items-center gap-1 mb-1.5">
                            <MapPin className="h-3.5 w-3.5 text-emerald-700" />
                            <span>مواقع ومرافق معتمدة من Google Maps:</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {m.groundingSources.map((src, idx) =>
                              src.maps?.uri ? (
                                <a
                                  key={"maps_" + idx}
                                  href={src.maps.uri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-emerald-100 text-black border border-emerald-300 px-2.5 py-1.5 rounded-xl text-3xs font-black hover:bg-emerald-200 transition-colors inline-flex items-center gap-1.5 shadow-2xs group"
                                >
                                  <Navigation className="h-3 w-3 text-emerald-800 group-hover:scale-110 transition-transform" />
                                  <span>{src.maps.title || `موقع على خرائط Google`}</span>
                                  <ExternalLink className="h-2.5 w-2.5 text-emerald-800" />
                                </a>
                              ) : null
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 text-4xs text-emerald-950 font-medium px-1">
                  <span>{m.timestamp}</span>
                  {m.provider && (
                    <span className="bg-emerald-200 text-black px-1.5 py-0.2 rounded font-bold">
                      Gemini
                    </span>
                  )}
                  {m.modelUsed && <span className="bg-emerald-100 text-black px-1.5 py-0.2 rounded font-mono font-bold">{m.modelUsed}</span>}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 items-center text-black text-xs">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-800 text-white">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
              <div className="bg-white border-2 border-emerald-200 rounded-2xl px-4 py-3 shadow-2xs flex items-center gap-2 font-bold text-black">
                <span>جاري معالجة السؤال والتحليل السريري الذكي...</span>
                <span className="text-2xs font-mono text-emerald-800">
                  {chatMode === "complex"
                    ? "(gemini-3.1-pro-preview)"
                    : chatMode === "fast"
                    ? "(gemini-3.1-flash-lite)"
                    : chatMode === "search"
                    ? "(gemini-3.5-flash + Google Search)"
                    : chatMode === "maps"
                    ? "(gemini-3.5-flash + Google Maps)"
                    : "(gemini-3.5-flash)"}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts */}
        <div className="border-t border-emerald-200 bg-emerald-100/60 px-4 py-2 overflow-x-auto">
          <div className="flex gap-2 w-max">
            {quickPrompts.map((q, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setChatMode(q.mode as ChatMode);
                  setChatbotRole(q.role);
                  handleSendMessage(q.text);
                }}
                disabled={loading}
                className="rounded-full bg-white border border-emerald-300 px-3 py-1 text-3xs sm:text-2xs font-bold text-black hover:border-emerald-600 hover:bg-emerald-50 transition-colors shadow-2xs whitespace-nowrap inline-flex items-center gap-1"
              >
                <span>{q.text}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Input Form */}
        <div className="border-t border-emerald-200 bg-white p-3 sm:p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                chatMode === "maps"
                  ? "ابحث عن صيدلية، مستشفى، أو مركز طبي على الخريطة..."
                  : chatMode === "search"
                  ? "ابحث في Google Search عن أحدث دراسة أو إرشادات دوائية..."
                  : chatMode === "complex"
                  ? "اكتب سؤالك السريري المعقد أو التداخل الدوائي الدقيق..."
                  : "اكتب استفسارك الطبي أو التجاري هنا..."
              }
              disabled={loading}
              className="flex-1 rounded-2xl border-2 border-emerald-300 bg-emerald-50/40 px-4 py-3 text-xs sm:text-sm text-black font-semibold placeholder-slate-500 focus:border-emerald-600 focus:bg-white focus:outline-hidden transition-all text-right"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-700 to-teal-800 text-white shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Send className="h-4 w-4 rotate-180" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
