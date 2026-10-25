import React, { useState, useEffect } from "react";
import { 
  X, MessageSquare, Send, RefreshCw, CheckCircle2, 
  ExternalLink, Trash2, Users, Building, Plus, ShieldCheck 
} from "lucide-react";
import { User, Order } from "../types";
import { GoogleAuthProvider, signInWithPopup, getAuth, onAuthStateChanged } from "firebase/auth";
import { app } from "../firebase";

interface GoogleChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  clients?: User[];
}

interface ChatSpace {
  name: string;
  displayName?: string;
  spaceType?: string;
}

interface ChatMessage {
  name: string;
  text: string;
  sender?: { displayName?: string };
  createTime?: string;
}

export const GoogleChatModal: React.FC<GoogleChatModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  clients = [],
}) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState("");

  const [spaces, setSpaces] = useState<ChatSpace[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingSpaces, setLoadingSpaces] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  const auth = getAuth(app);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAccessToken(null);
      }
    });
    return () => unsubscribe();
  }, [auth]);

  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    setAuthError("");
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope("https://www.googleapis.com/auth/chat.spaces");
      provider.addScope("https://www.googleapis.com/auth/chat.messages");
      provider.addScope("https://www.googleapis.com/auth/chat.messages.create");
      provider.addScope("https://www.googleapis.com/auth/chat.memberships");

      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setAccessToken(credential.accessToken);
        fetchSpaces(credential.accessToken);
      } else {
        throw new Error("لم يتم الحصول على رمز المصادقة من جوجل");
      }
    } catch (err: any) {
      console.error("Google Chat Auth Error:", err);
      setAuthError(err.message || "فشل تسجيل الدخول باستخدام حساب جوجل للمحادثة");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const fetchSpaces = async (token: string) => {
    setLoadingSpaces(true);
    try {
      const res = await fetch("https://chat.googleapis.com/v1/spaces", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          setAccessToken(null);
          throw new Error("انتهت صلاحية الجلسة، يرجى إعادة تسجيل الدخول.");
        }
        throw new Error("فشل جلب مساحات المحادثة من Google Chat");
      }

      const data = await res.json();
      const list = data.spaces || [];
      setSpaces(list);
      if (list.length > 0 && !selectedSpace) {
        setSelectedSpace(list[0].name);
        fetchMessages(token, list[0].name);
      }
    } catch (err: any) {
      console.warn("Fetch Spaces Error:", err);
      setAuthError(err.message);
    } finally {
      setLoadingSpaces(false);
    }
  };

  const fetchMessages = async (token: string, spaceName: string) => {
    if (!spaceName) return;
    setLoadingMessages(true);
    try {
      const res = await fetch(`https://chat.googleapis.com/v1/${spaceName}/messages?pageSize=20`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("فشل جلب رسائل المحادثة");
      }

      const data = await res.json();
      setMessages(data.messages || []);
    } catch (err: any) {
      console.warn("Fetch Messages Error:", err);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (isOpen && accessToken) {
      fetchSpaces(accessToken);
    }
  }, [isOpen, accessToken]);

  useEffect(() => {
    if (accessToken && selectedSpace) {
      fetchMessages(accessToken, selectedSpace);
    }
  }, [selectedSpace]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !selectedSpace || !messageText.trim()) return;

    setIsSending(true);
    setActionMessage("");

    try {
      const body = {
        text: `[منصة المندوب الطبي - د/ بلال القيسي]\n${messageText}`,
      };

      const res = await fetch(`https://chat.googleapis.com/v1/${selectedSpace}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error("فشل إرسال الرسالة إلى Google Chat");
      }

      setMessageText("");
      setActionMessage("تم إرسال الرسالة بنجاح 💬✨");
      fetchMessages(accessToken, selectedSpace);
      setTimeout(() => setActionMessage(""), 3500);
    } catch (err: any) {
      console.error("Send message error:", err);
      setAuthError(err.message || "خطأ أثناء إرسال الرسالة");
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-800 to-slate-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md">
              <MessageSquare className="h-6 w-6 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">إدارة Google Chat وتنسيق المراسلات الطبية</h2>
              <p className="text-xs text-emerald-200">التواصل الفوري ومشاركة التحديثات مع الفرق الطبية والعملاء عبر Google Chat</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-emerald-100 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!accessToken ? (
            <div className="p-8 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50 to-slate-50 border border-emerald-200 text-center space-y-4 shadow-sm">
              <div className="h-16 w-16 mx-auto rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md">
                <MessageSquare className="h-8 w-8" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-black text-slate-900">ربط حساب Google Chat للتواصل السريع</h3>
                <p className="text-xs text-slate-600">
                  سجل الدخول بحسابك في جوجل لمنح الصلاحية للتطبيق بإرسال واستقبال الرسائل وإدارة مساحات الدردشة الطبية.
                </p>
              </div>

              {authError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold max-w-md mx-auto">
                  {authError}
                </div>
              )}

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoggingIn}
                className="inline-flex items-center justify-center gap-3 px-6 py-3 rounded-xl bg-white border border-slate-300 shadow-sm hover:bg-slate-50 transition-all font-bold text-slate-700 text-xs cursor-pointer disabled:opacity-50 mx-auto"
              >
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
                <span>{isLoggingIn ? "جاري الاتصال..." : "تسجيل الدخول وربط Google Chat"}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              
              {actionMessage && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{actionMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                <div className="lg:col-span-1 bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <h3 className="text-xs font-black text-slate-800 flex items-center gap-2">
                      <Users className="h-4 w-4 text-emerald-600" />
                      مساحات المحادثة (Spaces)
                    </h3>
                    <button
                      onClick={() => accessToken && fetchSpaces(accessToken)}
                      disabled={loadingSpaces}
                      className="p-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors cursor-pointer"
                      title="تحديث المساحات"
                    >
                      <RefreshCw className={`h-3 w-3 ${loadingSpaces ? "animate-spin" : ""}`} />
                    </button>
                  </div>

                  {loadingSpaces ? (
                    <div className="py-8 text-center text-slate-400 text-xs">جاري تحميل المساحات...</div>
                  ) : spaces.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 text-xs">لا توجد مساحات متاحة.</div>
                  ) : (
                    <div className="space-y-2 max-h-[350px] overflow-y-auto">
                      {spaces.map((sp) => (
                        <button
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

                <div className="lg:col-span-2 flex flex-col justify-between bg-white rounded-2xl p-4 border border-slate-200 h-[450px]">
                  
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-3">
                    {loadingMessages ? (
                      <div className="py-16 text-center text-slate-400 text-xs">جاري تحميل الرسائل...</div>
                    ) : messages.length === 0 ? (
                      <div className="py-16 text-center text-slate-400 text-xs space-y-1">
                        <MessageSquare className="h-8 w-8 mx-auto text-slate-300" />
                        <p>لا توجد رسائل في هذه المساحة بعد. ابدأ المحادثة أدناه!</p>
                      </div>
                    ) : (
                      messages.map((msg, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                          <div className="flex items-center justify-between text-3xs text-slate-500 font-bold">
                            <span>{msg.sender?.displayName || "مستخدم"}</span>
                            <span>{msg.createTime ? new Date(msg.createTime).toLocaleTimeString("ar-SA") : ""}</span>
                          </div>
                          <p className="text-slate-800 font-medium whitespace-pre-line">{msg.text}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <form onSubmit={handleSendMessage} className="pt-3 border-t border-slate-200 flex gap-2">
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
                      disabled={isSending || !selectedSpace}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-sm disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shrink-0"
                    >
                      <Send className="h-4 w-4" />
                      <span>{isSending ? "جاري الإرسال..." : "إرسال"}</span>
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
            {accessToken ? "متصل بـ Google Chat 🟢" : "غير متصل"} — نظام المندوب الطبي د/ بلال القيسي
          </span>
          <button
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
