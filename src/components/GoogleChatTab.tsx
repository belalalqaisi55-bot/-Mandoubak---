import React, { useState, useEffect, useCallback } from "react";
import {
  MessageSquare,
  Send,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  Users,
  Building,
  Plus,
  Search,
  Phone,
  Trash2,
  AlertCircle,
  LogOut,
  FolderPlus,
  Sparkles,
  Info,
} from "lucide-react";
import { User } from "../types";
import {
  ChatSpace,
  ChatMessage,
  ChatMember,
  GoogleChatApiError,
  GOOGLE_CHAT_CONSOLE_CONFIG_URL,
  GOOGLE_CHAT_PROJECT_ID,
  initGoogleChatAuth,
  subscribeGoogleChatToken,
  signInToGoogleChat,
  signOutGoogleChat,
  listChatSpaces,
  createChatSpace,
  listChatMessages,
  sendChatMessage,
  deleteChatMessage,
  listChatMembers,
  addChatReaction,
} from "../services/googleChatService";
import { GoogleSignInGsiButton } from "./GoogleSignInGsiButton";
import { GoogleChatConfirmDialog, ChatPendingAction } from "./GoogleChatConfirmDialog";

interface GoogleChatTabProps {
  currentUser: User | null;
  clients?: User[];
}

const QUICK_REACTIONS = ["👍", "✅", "❤️", "🙏"];

const QUICK_TEMPLATES = [
  { label: "عرض سعر دوائي", text: "مرحباً بكم، نود مشاركتكم قائمة عروض الأسعار والبونص المحدثة لهذا الأسبوع." },
  { label: "تأكيد جاهزية طلبية", text: "تم تجهيز طلبيتكم الدوائية وهي قيد التسليم عبر المندوب الآن." },
  { label: "تحديث توفر أصناف", text: "نحيطكم علماً بتوفر الأصناف الدوائية المطلوبة بكميات جديدة في المستودع." },
];

export const GoogleChatTab: React.FC<GoogleChatTabProps> = ({
  currentUser,
  clients = [],
}) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [apiError, setApiError] = useState<string>("");
  const [isChatAppNotConfigured, setIsChatAppNotConfigured] = useState(false);
  const [isConsumerAccountError, setIsConsumerAccountError] = useState(false);

  const [spaces, setSpaces] = useState<ChatSpace[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<ChatMember[]>([]);
  const [showMembers, setShowMembers] = useState(false);

  const [loadingSpaces, setLoadingSpaces] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const [messageText, setMessageText] = useState("");
  const [showCreateSpaceForm, setShowCreateSpaceForm] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");

  const [pendingAction, setPendingAction] = useState<ChatPendingAction | null>(null);
  const [isExecutingAction, setIsExecutingAction] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const unsubToken = subscribeGoogleChatToken(({ token, user }) => {
      setAccessToken(token);
      setGoogleEmail(user?.email || null);
      setNeedsAuth(!token);
    });

    const unsubAuth = initGoogleChatAuth(
      (user, token) => {
        setAccessToken(token);
        setGoogleEmail(user.email || null);
        setNeedsAuth(false);
      },
      () => {
        setNeedsAuth(true);
      }
    );

    return () => {
      unsubToken();
      unsubAuth();
    };
  }, []);

  const handleApiException = useCallback((err: any) => {
    const chatErr = err as GoogleChatApiError;
    setApiError(chatErr?.message || "حدث خطأ أثناء الاتصال بـ Google Chat");
    setIsChatAppNotConfigured(Boolean(chatErr?.isChatAppNotConfigured));
    setIsConsumerAccountError(Boolean(chatErr?.isConsumerAccountError));
    if (chatErr?.isAuthError) {
      setAccessToken(null);
      setNeedsAuth(true);
    }
  }, []);

  const resetErrorState = () => {
    setApiError("");
    setIsChatAppNotConfigured(false);
    setIsConsumerAccountError(false);
  };

  const loadSpaces = useCallback(
    async (token: string) => {
      setLoadingSpaces(true);
      resetErrorState();
      try {
        const list = await listChatSpaces(token);
        setSpaces(list);
        setSelectedSpace((prev) => {
          if (prev && list.some((s) => s.name === prev)) return prev;
          return list.length > 0 ? list[0].name : "";
        });
      } catch (err) {
        handleApiException(err);
      } finally {
        setLoadingSpaces(false);
      }
    },
    [handleApiException]
  );

  const loadMessages = useCallback(
    async (token: string, spaceName: string) => {
      if (!spaceName) return;
      setLoadingMessages(true);
      try {
        const list = await listChatMessages(token, spaceName, 35);
        setMessages(list);
      } catch (err) {
        handleApiException(err);
      } finally {
        setLoadingMessages(false);
      }
    },
    [handleApiException]
  );

  const loadMembers = useCallback(
    async (token: string, spaceName: string) => {
      if (!spaceName) return;
      setLoadingMembers(true);
      try {
        const list = await listChatMembers(token, spaceName);
        setMembers(list);
      } catch (err) {
        handleApiException(err);
      } finally {
        setLoadingMembers(false);
      }
    },
    [handleApiException]
  );

  useEffect(() => {
    if (accessToken) {
      loadSpaces(accessToken);
    }
  }, [accessToken, loadSpaces]);

  useEffect(() => {
    if (accessToken && selectedSpace) {
      loadMessages(accessToken, selectedSpace);
      if (showMembers) {
        loadMembers(accessToken, selectedSpace);
      }
    } else {
      setMessages([]);
      setMembers([]);
    }
  }, [accessToken, selectedSpace, showMembers, loadMessages, loadMembers]);

  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    resetErrorState();
    try {
      const result = await signInToGoogleChat();
      setAccessToken(result.accessToken);
      setGoogleEmail(result.user.email || null);
      setNeedsAuth(false);
    } catch (err: any) {
      setApiError(err?.message || "فشل تسجيل الدخول باستخدام حساب Google للمحادثة");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleDisconnect = async () => {
    await signOutGoogleChat();
    setSpaces([]);
    setSelectedSpace("");
    setMessages([]);
    setMembers([]);
    resetErrorState();
  };

  const selectedSpaceObj = spaces.find((s) => s.name === selectedSpace);
  const selectedSpaceTitle = selectedSpaceObj?.displayName || selectedSpace.split("/").pop() || selectedSpace;

  const requestSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !selectedSpace || !messageText.trim()) return;
    const formattedBody = `[${currentUser?.name || "المندوب الطبي - د. بلال القيسي"}]\n${messageText.trim()}`;
    setPendingAction({
      type: "send_message",
      spaceDisplayName: selectedSpaceTitle,
      textPreview: formattedBody,
    });
  };

  const requestCreateSpace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !newSpaceName.trim()) return;
    setPendingAction({
      type: "create_space",
      displayName: newSpaceName.trim(),
    });
  };

  const requestDeleteMessage = (msg: ChatMessage) => {
    setPendingAction({
      type: "delete_message",
      messageName: msg.name,
      textPreview: msg.text || msg.formattedText || "(رسالة)",
    });
  };

  const requestAddReaction = (msg: ChatMessage, emoji: string) => {
    setPendingAction({
      type: "add_reaction",
      messageName: msg.name,
      emoji,
      textPreview: msg.text || msg.formattedText || "(رسالة)",
    });
  };

  const executeConfirmedAction = async () => {
    if (!pendingAction || !accessToken) return;
    setIsExecutingAction(true);
    resetErrorState();
    setActionMessage("");

    try {
      if (pendingAction.type === "send_message") {
        await sendChatMessage(accessToken, selectedSpace, pendingAction.textPreview);
        setMessageText("");
        setActionMessage("تم إرسال الرسالة عبر Google Chat بنجاح 💬");
        await loadMessages(accessToken, selectedSpace);
      } else if (pendingAction.type === "create_space") {
        const created = await createChatSpace(accessToken, pendingAction.displayName);
        setNewSpaceName("");
        setShowCreateSpaceForm(false);
        setActionMessage(`تم إنشاء مساحة "${created.displayName || pendingAction.displayName}" بنجاح ✅`);
        await loadSpaces(accessToken);
        if (created.name) {
          setSelectedSpace(created.name);
        }
      } else if (pendingAction.type === "delete_message") {
        await deleteChatMessage(accessToken, pendingAction.messageName);
        setActionMessage("تم حذف الرسالة من Google Chat.");
        await loadMessages(accessToken, selectedSpace);
      } else if (pendingAction.type === "add_reaction") {
        await addChatReaction(accessToken, pendingAction.messageName, pendingAction.emoji);
        setActionMessage(`تم إضافة التفاعل ${pendingAction.emoji} على الرسالة.`);
        await loadMessages(accessToken, selectedSpace);
      }

      setPendingAction(null);
      setTimeout(() => setActionMessage(""), 4000);
    } catch (err) {
      setPendingAction(null);
      handleApiException(err);
    } finally {
      setIsExecutingAction(false);
    }
  };

  const filteredClients = clients.filter(
    (c) =>
      (c.entityName || c.name).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.location || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderPrerequisitesOrErrorBanner = () => {
    if (!apiError) return null;

    return (
      <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-rose-900 space-y-2.5 shadow-2xs">
        <div className="flex items-start gap-2.5">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <p className="font-black">تعذر إتمام الطلب عبر Google Chat API</p>
            <p className="font-medium leading-relaxed text-rose-800">{apiError}</p>
          </div>
        </div>

        {(isChatAppNotConfigured || isConsumerAccountError) && (
          <div className="rounded-xl bg-white/90 border border-rose-200/80 p-3 space-y-2 text-[11px] text-slate-700">
            <p className="font-bold text-slate-900">متطلبات تشغيل Google Chat API:</p>
            <ul className="list-disc list-inside space-y-1 leading-relaxed">
              <li>
                يتطلب حساب <strong>Google Workspace للأعمال أو المؤسسات</strong> (Business/Enterprise)، حيث لا تدعم حسابات <code>@gmail.com</code> الشخصية واجهة Google Chat API.
              </li>
              <li>
                يجب تهيئة تطبيق Chat مرة واحدة من صفحة <strong>Configuration</strong> في Google Cloud Console للمشروع (<code>{GOOGLE_CHAT_PROJECT_ID}</code>): إدخال اسم التطبيق، رابط الأيقونة، والوصف.
              </li>
            </ul>
            <a
              href={GOOGLE_CHAT_CONSOLE_CONFIG_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 font-bold text-[11px] transition-colors"
            >
              <span>فتح صفحة إعداد Google Chat App في Cloud Console</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-300">
      <GoogleChatConfirmDialog
        pendingAction={pendingAction}
        isSubmitting={isExecutingAction}
        onConfirm={executeConfirmedAction}
        onCancel={() => !isExecutingAction && setPendingAction(null)}
      />

      {/* Top Banner Header */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-700 via-teal-800 to-slate-900 p-6 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md shadow-inner">
            <MessageSquare className="h-8 w-8 text-emerald-300" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight">
              نظام Google Chat المباشر للتواصل مع الصيدليات والأطباء
            </h2>
            <p className="text-xs text-emerald-200 mt-1">
              إدارة مساحات الدردشة، متابعة الأعضاء، وإرسال عروض الأسعار والتحديثات الطبية عبر Google Chat API.
            </p>
          </div>
        </div>

        {accessToken && !needsAuth && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <div className="flex items-center gap-2 bg-emerald-900/60 px-4 py-2 rounded-2xl border border-emerald-500/40 text-emerald-100 text-xs font-bold">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{googleEmail || "متصل بـ Google Chat"}</span>
            </div>
            <button
              type="button"
              onClick={handleDisconnect}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer"
              title="تسجيل الخروج من جلسة Google Chat"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>قطع الاتصال</span>
            </button>
          </div>
        )}
      </div>

      {needsAuth || !accessToken ? (
        <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-emerald-50 via-teal-50 to-slate-50 border border-emerald-200 text-center space-y-5 shadow-sm max-w-2xl mx-auto">
          <div className="h-20 w-20 mx-auto rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg">
            <MessageSquare className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-black text-slate-900">
              ربط حساب Google Chat للمراسلات الطبية
            </h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              سجّل الدخول بحساب Google Workspace لمنح التطبيق صلاحية عرض مساحات المحادثة، إرسال الرسائل، وإدارة التفاعلات بموافقتك الصريحة.
            </p>
          </div>

          <div className="rounded-2xl bg-white/90 border border-emerald-200 p-4 text-right text-[11px] text-slate-700 space-y-2 max-w-lg mx-auto">
            <div className="flex items-center gap-2 font-black text-emerald-900">
              <Info className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>ملاحظات هامة قبل الاتصال بـ Google Chat:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-600 leading-relaxed">
              <li>
                يتطلب تشغيل Google Chat API حساب <strong>Google Workspace (أعمال/مؤسسات)</strong>؛ حسابات <code>@gmail.com</code> الشخصية غير مدعومة من جوجل لهذه الواجهة.
              </li>
              <li>
                يتطلب إكمال إعداد تطبيق Chat مرة واحدة في{" "}
                <a
                  href={GOOGLE_CHAT_CONSOLE_CONFIG_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-700 underline font-bold hover:text-emerald-900"
                >
                  Google Cloud Console Configuration
                </a>{" "}
                للمشروع <code>{GOOGLE_CHAT_PROJECT_ID}</code> لتجنب خطأ 404.
              </li>
            </ul>
          </div>

          {renderPrerequisitesOrErrorBanner()}

          <div className="pt-1 flex justify-center">
            <GoogleSignInGsiButton
              onClick={handleGoogleSignIn}
              loading={isLoggingIn}
              label="تسجيل الدخول بحساب Google وربط Google Chat"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {renderPrerequisitesOrErrorBanner()}

          {actionMessage && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-3 shadow-xs">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <span>{actionMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Spaces & Clients Directory (4 Cols) */}
            <div className="lg:col-span-4 space-y-4">
              {/* Spaces List Card */}
              <div className="rounded-3xl bg-white border border-slate-200 p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-black text-slate-900 flex items-center gap-2">
                    <Users className="h-4 w-4 text-emerald-600" />
                    مساحات المحادثة (Spaces)
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowCreateSpaceForm((v) => !v)}
                      className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors cursor-pointer"
                      title="إنشاء مساحة جديدة"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => accessToken && loadSpaces(accessToken)}
                      disabled={loadingSpaces}
                      className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                      title="تحديث المساحات"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${loadingSpaces ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                </div>

                {showCreateSpaceForm && (
                  <form
                    onSubmit={requestCreateSpace}
                    className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2"
                  >
                    <label className="text-[11px] font-bold text-emerald-950 flex items-center gap-1.5">
                      <FolderPlus className="h-3.5 w-3.5 text-emerald-700" />
                      <span>اسم المساحة الجديدة:</span>
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        required
                        value={newSpaceName}
                        onChange={(e) => setNewSpaceName(e.target.value)}
                        placeholder="مثال: صيدليات قطاع صنعاء"
                        className="flex-1 px-3 py-1.5 rounded-xl bg-white border border-emerald-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer shrink-0"
                      >
                        إنشاء
                      </button>
                    </div>
                  </form>
                )}

                {loadingSpaces ? (
                  <div className="py-8 text-center text-slate-400 text-xs">جاري تحميل المساحات...</div>
                ) : spaces.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs space-y-2">
                    <p>لا توجد مساحات دردشة نشطة في هذا الحساب.</p>
                    <button
                      type="button"
                      onClick={() => setShowCreateSpaceForm(true)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-[11px] hover:bg-emerald-100 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>إنشاء أول مساحة</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                    {spaces.map((sp) => (
                      <button
                        type="button"
                        key={sp.name}
                        onClick={() => setSelectedSpace(sp.name)}
                        className={`w-full text-right p-3 rounded-2xl text-xs font-bold transition-all border cursor-pointer flex items-center justify-between ${
                          selectedSpace === sp.name
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                            : "bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <span className="truncate">{sp.displayName || sp.name}</span>
                        <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-70" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Pharmacies & Doctors Directory Card */}
              <div className="rounded-3xl bg-white border border-slate-200 p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-black text-slate-900 flex items-center gap-2">
                    <Building className="h-4 w-4 text-teal-600" />
                    الصيدليات والأطباء المسجلين
                  </h3>
                </div>

                <div className="relative">
                  <Search className="absolute right-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث عن صيدلية أو طبيب..."
                    className="w-full pl-3 pr-9 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-3xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                  {filteredClients.length === 0 ? (
                    <p className="py-6 text-center text-3xs text-slate-400">لا توجد جهات مطابقة للبحث</p>
                  ) : (
                    filteredClients.map((client) => (
                      <div
                        key={client.id}
                        className="p-3 rounded-2xl bg-slate-50 border border-slate-200 hover:border-teal-300 transition-all flex items-center justify-between gap-2"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setMessageText((prev) =>
                              prev
                                ? `${prev} @${client.entityName || client.name}`
                                : `مرحباً ${client.entityName || client.name}، `
                            )
                          }
                          className="space-y-0.5 truncate text-right cursor-pointer flex-1"
                          title="إدراج اسم العميل في مسودة الرسالة"
                        >
                          <h4 className="text-xs font-black text-slate-900 truncate">
                            {client.entityName || client.name}
                          </h4>
                          <p className="text-3xs text-slate-500 truncate">
                            {client.name} • {client.location || "اليمن"}
                          </p>
                        </button>
                        {client.phone && (
                          <a
                            href={`https://wa.me/${client.phone.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-xl bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors shrink-0"
                            title="تواصل عبر الهاتف / واتساب"
                          >
                            <Phone className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Chat Messages & Input (8 Cols) */}
            <div className="lg:col-span-8 flex flex-col justify-between bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm min-h-[620px]">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="text-sm font-black text-slate-900">
                    {selectedSpace ? `مساحة: ${selectedSpaceTitle}` : "اختر مساحة للمراسلة الفورية"}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  {selectedSpace && (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowMembers((m) => !m)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-colors cursor-pointer ${
                          showMembers
                            ? "bg-teal-600 text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        <Users className="h-3.5 w-3.5" />
                        <span>الأعضاء</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => accessToken && loadMessages(accessToken, selectedSpace)}
                        disabled={loadingMessages}
                        className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                        title="تحديث الرسائل"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${loadingMessages ? "animate-spin" : ""}`} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Members Drawer */}
              {showMembers && selectedSpace && (
                <div className="mt-3 p-3.5 rounded-2xl bg-teal-50/70 border border-teal-200 space-y-2 shrink-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-teal-950">أعضاء المساحة الحالية</span>
                    <span className="text-[11px] font-bold text-teal-700">
                      {loadingMembers ? "جاري الجلب..." : `${members.length} عضو`}
                    </span>
                  </div>
                  {members.length > 0 && (
                    <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                      {members.map((m) => (
                        <span
                          key={m.name}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-teal-200 text-[11px] font-bold text-slate-800"
                        >
                          <span>{m.member?.displayName || m.member?.name || m.name}</span>
                          {m.role && (
                            <span className="text-[10px] text-teal-700 font-semibold">
                              ({m.role === "ROLE_MANAGER" ? "مشرف" : "عضو"})
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Messages Box */}
              <div className="flex-1 overflow-y-auto space-y-3.5 py-4 pr-1 max-h-[420px]">
                {loadingMessages ? (
                  <div className="py-24 text-center text-slate-400 text-xs">جاري تحميل رسائل المحادثة...</div>
                ) : messages.length === 0 ? (
                  <div className="py-24 text-center text-slate-400 text-xs space-y-2">
                    <MessageSquare className="h-10 w-10 mx-auto text-slate-300" />
                    <p className="font-bold">لا توجد رسائل سابقة في هذه المساحة.</p>
                    <p className="text-3xs text-slate-500">
                      ابدأ بكتابة رسالة أو اختر قالباً سريعاً بالأسفل لإرساله بعد التأكيد.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.name}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2 shadow-2xs group"
                    >
                      <div className="flex items-center justify-between gap-2 text-3xs text-slate-500 font-extrabold">
                        <span className="text-teal-700">
                          {msg.sender?.displayName || msg.sender?.name || "عضو المساحة"}
                        </span>
                        <div className="flex items-center gap-2">
                          <span>
                            {msg.createTime ? new Date(msg.createTime).toLocaleString("ar-SA") : ""}
                          </span>
                          <button
                            type="button"
                            onClick={() => requestDeleteMessage(msg)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="حذف الرسالة (يتطلب تأكيداً)"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-slate-800 font-medium whitespace-pre-line leading-relaxed">
                        {msg.text || msg.formattedText}
                      </p>

                      {/* Emoji Reactions Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {(msg.emojiReactionSummaries || []).map((r, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-700"
                            >
                              <span>{r.emoji?.unicode || "✨"}</span>
                              <span>{r.reactionCount || 1}</span>
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-1">
                          {QUICK_REACTIONS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => requestAddReaction(msg, emoji)}
                              className="px-1.5 py-0.5 rounded-md hover:bg-white border border-transparent hover:border-slate-200 text-xs transition-colors cursor-pointer"
                              title={`إضافة تفاعل ${emoji}`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Quick Draft Templates */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-1.5 shrink-0">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 ml-1">
                  <Sparkles className="h-3 w-3 text-emerald-600" />
                  <span>قوالب سريعة:</span>
                </span>
                {QUICK_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.label}
                    type="button"
                    onClick={() => setMessageText(tpl.text)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-[11px] font-bold text-slate-700 transition-colors cursor-pointer"
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>

              {/* Send Message Form */}
              <form onSubmit={requestSendMessage} className="pt-3 flex gap-3 shrink-0">
                <input
                  type="text"
                  required
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="اكتب رسالتك أو عرض السعر للصيدليات والأطباء هنا..."
                  className="flex-1 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  disabled={isExecutingAction || !selectedSpace || !messageText.trim()}
                  className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition-colors shadow-md disabled:opacity-50 cursor-pointer flex items-center gap-2 shrink-0"
                >
                  <Send className="h-4 w-4" />
                  <span>إرسال</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
