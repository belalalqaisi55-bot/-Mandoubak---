import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  MessageSquare,
  Send,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  Trash2,
  Users,
  Plus,
  AlertCircle,
  LogOut,
  FolderPlus,
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

interface GoogleChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  clients?: User[];
}

const QUICK_REACTIONS = ["👍", "✅", "❤️", "🙏"];

export const GoogleChatModal: React.FC<GoogleChatModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [apiError, setApiError] = useState("");
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

  const resetErrorState = () => {
    setApiError("");
    setIsChatAppNotConfigured(false);
    setIsConsumerAccountError(false);
  };

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
        const list = await listChatMessages(token, spaceName, 25);
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
    if (isOpen && accessToken) {
      loadSpaces(accessToken);
    }
  }, [isOpen, accessToken, loadSpaces]);

  useEffect(() => {
    if (isOpen && accessToken && selectedSpace) {
      loadMessages(accessToken, selectedSpace);
      if (showMembers) {
        loadMembers(accessToken, selectedSpace);
      }
    } else if (!selectedSpace) {
      setMessages([]);
      setMembers([]);
    }
  }, [isOpen, accessToken, selectedSpace, showMembers, loadMessages, loadMembers]);

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
    const formattedBody = `[منصة المندوب الطبي - ${currentUser?.name || "د/ بلال القيسي"}]\n${messageText.trim()}`;
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
        setActionMessage("تم إرسال الرسالة بنجاح 💬");
        await loadMessages(accessToken, selectedSpace);
      } else if (pendingAction.type === "create_space") {
        const created = await createChatSpace(accessToken, pendingAction.displayName);
        setNewSpaceName("");
        setShowCreateSpaceForm(false);
        setActionMessage(`تم إنشاء المساحة "${created.displayName || pendingAction.displayName}" بنجاح ✅`);
        await loadSpaces(accessToken);
        if (created.name) {
          setSelectedSpace(created.name);
        }
      } else if (pendingAction.type === "delete_message") {
        await deleteChatMessage(accessToken, pendingAction.messageName);
        setActionMessage("تم حذف الرسالة بنجاح.");
        await loadMessages(accessToken, selectedSpace);
      } else if (pendingAction.type === "add_reaction") {
        await addChatReaction(accessToken, pendingAction.messageName, pendingAction.emoji);
        setActionMessage(`تم إضافة التفاعل ${pendingAction.emoji}`);
        await loadMessages(accessToken, selectedSpace);
      }

      setPendingAction(null);
      setTimeout(() => setActionMessage(""), 3500);
    } catch (err) {
      setPendingAction(null);
      handleApiException(err);
    } finally {
      setIsExecutingAction(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <GoogleChatConfirmDialog
        pendingAction={pendingAction}
        isSubmitting={isExecutingAction}
        onConfirm={executeConfirmedAction}
        onCancel={() => !isExecutingAction && setPendingAction(null)}
      />

      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-800 to-slate-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md">
              <MessageSquare className="h-6 w-6 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">
                إدارة Google Chat وتنسيق المراسلات الطبية
              </h2>
              <p className="text-xs text-emerald-200">
                التواصل الفوري وإدارة المساحات والرسائل عبر Google Chat API
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {accessToken && !needsAuth && (
              <button
                type="button"
                onClick={handleDisconnect}
                className="inline-flex items-center gap-1 rounded-lg bg-white/10 hover:bg-white/20 px-2.5 py-1.5 text-[11px] font-bold text-white transition-colors cursor-pointer"
                title="قطع الاتصال بـ Google Chat"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>خروج</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-emerald-100 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {apiError && (
            <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-rose-900 space-y-2.5">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-black">تعذر إتمام العملية عبر Google Chat API</p>
                  <p className="font-medium text-rose-800 leading-relaxed">{apiError}</p>
                </div>
              </div>
              {(isChatAppNotConfigured || isConsumerAccountError) && (
                <div className="rounded-xl bg-white border border-rose-200 p-3 space-y-2 text-[11px] text-slate-700">
                  <p className="font-bold text-slate-900">
                    يتطلب Google Chat API حساب Google Workspace (Business/Enterprise) وإكمال إعداد Chat App لمرة واحدة في Cloud Console:
                  </p>
                  <a
                    href={GOOGLE_CHAT_CONSOLE_CONFIG_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 font-bold"
                  >
                    <span>فتح Google Cloud Console Configuration ({GOOGLE_CHAT_PROJECT_ID})</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}
            </div>
          )}

          {needsAuth || !accessToken ? (
            <div className="p-8 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50 to-slate-50 border border-emerald-200 text-center space-y-4 shadow-sm">
              <div className="h-16 w-16 mx-auto rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md">
                <MessageSquare className="h-8 w-8" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-black text-slate-900">
                  ربط حساب Google Chat للتواصل السريع
                </h3>
                <p className="text-xs text-slate-600">
                  سجل الدخول بحساب Google Workspace لمنح التطبيق صلاحية إدارة المساحات وإرسال الرسائل بعد موافقتك.
                </p>
              </div>

              <div className="rounded-xl bg-white/90 border border-emerald-200 p-3.5 text-right text-[11px] text-slate-600 space-y-1.5 max-w-lg mx-auto">
                <div className="flex items-center gap-1.5 font-black text-emerald-900">
                  <Info className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>متطلبات Google Chat API:</span>
                </div>
                <p>
                  • حساب <strong>Google Workspace للأعمال أو المؤسسات</strong> (حسابات @gmail.com الشخصية غير مدعومة).
                </p>
                <p>
                  • إعداد اسم ووصف التطبيق في{" "}
                  <a
                    href={GOOGLE_CHAT_CONSOLE_CONFIG_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 underline font-bold"
                  >
                    Google Chat API Configuration
                  </a>
                  .
                </p>
              </div>

              <div className="flex justify-center pt-1">
                <GoogleSignInGsiButton
                  onClick={handleGoogleSignIn}
                  loading={isLoggingIn}
                  label="Sign in with Google • ربط Google Chat"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {actionMessage && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{actionMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Spaces Column */}
                <div className="lg:col-span-1 bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <h3 className="text-xs font-black text-slate-800 flex items-center gap-2">
                      <Users className="h-4 w-4 text-emerald-600" />
                      مساحات المحادثة (Spaces)
                    </h3>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setShowCreateSpaceForm((v) => !v)}
                        className="p-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition-colors cursor-pointer"
                        title="إنشاء مساحة جديدة"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => accessToken && loadSpaces(accessToken)}
                        disabled={loadingSpaces}
                        className="p-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors cursor-pointer"
                        title="تحديث المساحات"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${loadingSpaces ? "animate-spin" : ""}`} />
                      </button>
                    </div>
                  </div>

                  {showCreateSpaceForm && (
                    <form
                      onSubmit={requestCreateSpace}
                      className="p-2.5 rounded-xl bg-white border border-emerald-200 space-y-2"
                    >
                      <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                        <FolderPlus className="h-3.5 w-3.5 text-emerald-600" />
                        <span>اسم المساحة الجديدة:</span>
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          required
                          value={newSpaceName}
                          onChange={(e) => setNewSpaceName(e.target.value)}
                          placeholder="اسم المساحة..."
                          className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <button
                          type="submit"
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-bold cursor-pointer"
                        >
                          إنشاء
                        </button>
                      </div>
                    </form>
                  )}

                  {loadingSpaces ? (
                    <div className="py-8 text-center text-slate-400 text-xs">جاري تحميل المساحات...</div>
                  ) : spaces.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 text-xs">لا توجد مساحات متاحة.</div>
                  ) : (
                    <div className="space-y-2 max-h-[340px] overflow-y-auto">
                      {spaces.map((sp) => (
                        <button
                          type="button"
                          key={sp.name}
                          onClick={() => setSelectedSpace(sp.name)}
                          className={`w-full text-right p-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                            selectedSpace === sp.name
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                              : "bg-white text-slate-800 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {sp.displayName || sp.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Messages Column */}
                <div className="lg:col-span-2 flex flex-col justify-between bg-white rounded-2xl p-4 border border-slate-200 h-[460px]">
                  {selectedSpace && (
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-2 shrink-0">
                      <span className="text-xs font-black text-slate-900 truncate">
                        {selectedSpaceTitle}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setShowMembers((m) => !m)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                            showMembers
                              ? "bg-teal-600 text-white"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          الأعضاء
                        </button>
                        <button
                          type="button"
                          onClick={() => accessToken && loadMessages(accessToken, selectedSpace)}
                          disabled={loadingMessages}
                          className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${loadingMessages ? "animate-spin" : ""}`} />
                        </button>
                      </div>
                    </div>
                  )}

                  {showMembers && selectedSpace && (
                    <div className="mb-2 p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-[11px] shrink-0 max-h-24 overflow-y-auto">
                      <span className="font-black text-teal-900 block mb-1">
                        الأعضاء ({loadingMembers ? "..." : members.length}):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {members.map((m) => (
                          <span
                            key={m.name}
                            className="px-2 py-0.5 rounded bg-white border border-teal-200 font-bold text-slate-700"
                          >
                            {m.member?.displayName || m.member?.name || m.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-3">
                    {loadingMessages ? (
                      <div className="py-16 text-center text-slate-400 text-xs">جاري تحميل الرسائل...</div>
                    ) : messages.length === 0 ? (
                      <div className="py-16 text-center text-slate-400 text-xs space-y-1">
                        <MessageSquare className="h-8 w-8 mx-auto text-slate-300" />
                        <p>لا توجد رسائل في هذه المساحة بعد. ابدأ المحادثة أدناه!</p>
                      </div>
                    ) : (
                      messages.map((msg) => (
                        <div
                          key={msg.name}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-3xs text-slate-500 font-bold">
                            <span>{msg.sender?.displayName || msg.sender?.name || "مستخدم"}</span>
                            <div className="flex items-center gap-2">
                              <span>
                                {msg.createTime ? new Date(msg.createTime).toLocaleTimeString("ar-SA") : ""}
                              </span>
                              <button
                                type="button"
                                onClick={() => requestDeleteMessage(msg)}
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                                title="حذف الرسالة"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                          <p className="text-slate-800 font-medium whitespace-pre-line">
                            {msg.text || msg.formattedText}
                          </p>
                          <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                            <div className="flex flex-wrap gap-1">
                              {(msg.emojiReactionSummaries || []).map((r, i) => (
                                <span
                                  key={i}
                                  className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-bold"
                                >
                                  {r.emoji?.unicode || "✨"} {r.reactionCount || 1}
                                </span>
                              ))}
                            </div>
                            <div className="flex gap-1">
                              {QUICK_REACTIONS.map((emoji) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => requestAddReaction(msg, emoji)}
                                  className="px-1 rounded hover:bg-white text-[11px] cursor-pointer"
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

                  <form onSubmit={requestSendMessage} className="pt-3 border-t border-slate-200 flex gap-2">
                    <input
                      type="text"
                      required
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="اكتب رسالتك الطبية أو التحديث هنا..."
                      className="flex-1 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="submit"
                      disabled={isExecutingAction || !selectedSpace || !messageText.trim()}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-sm disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shrink-0"
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

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-3.5 flex items-center justify-between shrink-0">
          <span className="text-3xs text-slate-500">
            {accessToken && !needsAuth
              ? `متصل بـ Google Chat (${googleEmail || "نشط"})`
              : "غير متصل بـ Google Chat"}{" "}
            — نظام المندوب الطبي د/ بلال القيسي
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-800 hover:bg-slate-900 text-white px-5 py-2 text-xs font-bold transition-colors cursor-pointer"
          >
            إغلاق المحادثة
          </button>
        </div>
      </div>
    </div>
  );
};
