import React, { useState, useEffect } from "react";
import { 
  MessageSquare, Send, RefreshCw, CheckCircle2, 
  ExternalLink, Users, Building, Plus, ShieldCheck, Search, Phone, MapPin, Sparkles 
} from "lucide-react";
import { User } from "../types";
import { GoogleAuthProvider, signInWithPopup, getAuth, onAuthStateChanged } from "firebase/auth";
import { app } from "../firebase";

interface GoogleChatTabProps {
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

export const GoogleChatTab: React.FC<GoogleChatTabProps> = ({
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
  const [searchQuery, setSearchQuery] = useState("");

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
      const res = await fetch(`https://chat.googleapis.com/v1/${spaceName}/messages?pageSize=30`, {
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
    if (accessToken) {
      fetchSpaces(accessToken);
    }
  }, [accessToken]);

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
        text: `[مندوب المبيعات الطبية - ${currentUser?.name || "د. بلال القيسي"}]\n${messageText}`,
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
      setActionMessage("تم إرسال الرسالة إلى الصيدلية بنجاح 💬✨");
      fetchMessages(accessToken, selectedSpace);
      setTimeout(() => setActionMessage(""), 3500);
    } catch (err: any) {
      console.error("Send message error:", err);
      setAuthError(err.message || "خطأ أثناء إرسال الرسالة");
    } finally {
      setIsSending(false);
    }
  };

  const filteredClients = clients.filter(c => 
    (c.entityName || c.name).toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.location || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-300">
      
      {/* Top Banner Header */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-700 via-teal-800 to-slate-900 p-6 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md shadow-inner">
            <MessageSquare className="h-8 w-8 text-emerald-300" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight">نظـام Google Chat المباشر للتواصل مع الصيدليات والأطباء</h2>
            <p className="text-xs text-emerald-200 mt-1">
              تواصل فوري وذكي مع الأطباء والصيادلة، وإرسال عروض الأسعار والتحديثات الطبية عبر Google Chat API بشكل مشفر وآمن.
            </p>
          </div>
        </div>

        {accessToken && (
          <div className="flex items-center gap-2 bg-emerald-900/60 px-4 py-2 rounded-2xl border border-emerald-500/40 text-emerald-200 text-xs font-bold shrink-0">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>متصل بـ Google Chat النشط</span>
          </div>
        )}
      </div>

      {!accessToken ? (
        <div className="p-12 rounded-3xl bg-gradient-to-br from-emerald-50 via-teal-50 to-slate-50 border border-emerald-200 text-center space-y-5 shadow-sm max-w-2xl mx-auto">
          <div className="h-20 w-20 mx-auto rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg">
            <MessageSquare className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-black text-slate-900">تفعيل وتوصيل حساب Google Chat للمراسلات الطبية</h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              انقر أدناه لتسجيل الدخول بحسابك في جوجل ومنح الصلاحية للتطبيق بإدارة مساحات الدردشة والتواصل المباشر مع جميع الصيدليات والعملاء.
            </p>
          </div>

          {authError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold max-w-md mx-auto">
              {authError}
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoggingIn}
            className="inline-flex items-center justify-center gap-3 px-8 py-3.5 rounded-2xl bg-white border border-slate-300 shadow-md hover:bg-slate-50 transition-all font-bold text-slate-700 text-xs cursor-pointer disabled:opacity-50 mx-auto"
          >
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              <path fill="none" d="M0 0h48v48H0z"></path>
            </svg>
            <span>{isLoggingIn ? "جاري الاتصال بحساب جوجل..." : "تسجيل الدخول وربط Google Chat الآن"}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          
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
                    مساحات المحادثة الطبية (Spaces)
                  </h3>
                  <button
                    onClick={() => accessToken && fetchSpaces(accessToken)}
                    disabled={loadingSpaces}
                    className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                    title="تحديث المساحات"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${loadingSpaces ? "animate-spin" : ""}`} />
                  </button>
                </div>

                {loadingSpaces ? (
                  <div className="py-8 text-center text-slate-400 text-xs">جاري تحميل المساحات...</div>
                ) : spaces.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs">لا توجد مساحات دردشة نشطة.</div>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {spaces.map((sp) => (
                      <button
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
                  {filteredClients.map((client) => (
                    <div 
                      key={client.id}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200 hover:border-teal-300 transition-all flex items-center justify-between gap-2"
                    >
                      <div className="space-y-0.5 truncate">
                        <h4 className="text-xs font-black text-slate-900 truncate">{client.entityName}</h4>
                        <p className="text-3xs text-slate-500 truncate">{client.name} • {client.location || "اليمن"}</p>
                      </div>
                      <a
                        href={`https://wa.me/${client.phone ? client.phone.replace(/[^0-9]/g, "") : ""}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors shrink-0"
                        title="مراسلة عبر واتساب أو تواصل"
                      >
                        <Phone className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Right Column: Chat Messages & Input (8 Cols) */}
            <div className="lg:col-span-8 flex flex-col justify-between bg-white rounded-3xl p-6 border border-slate-200 shadow-sm h-[600px]">
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="h-3 w-3 rounded-full bg-emerald-500 animate-ping" />
                  <h3 className="text-sm font-black text-slate-900">
                    {selectedSpace ? `محادثة نشطة: ${selectedSpace.split("/").pop()}` : "اختر مساحة للمراسلة الفورية"}
                  </h3>
                </div>
                <span className="text-3xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                  مشفر وآمن عبر Google Chat API 🔒
                </span>
              </div>

              {/* Messages Box */}
              <div className="flex-1 overflow-y-auto space-y-3.5 py-4 pr-1">
                {loadingMessages ? (
                  <div className="py-24 text-center text-slate-400 text-xs">جاري تحميل رسائل المحادثة...</div>
                ) : messages.length === 0 ? (
                  <div className="py-24 text-center text-slate-400 text-xs space-y-2">
                    <MessageSquare className="h-10 w-10 mx-auto text-slate-300" />
                    <p className="font-bold">لا توجد رسائل سابقة في هذه المساحة.</p>
                    <p className="text-3xs text-slate-500">ابدأ بإرسال عرض سعر أو تحديث دوائي للصيدليات والأطباء الآن!</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between text-3xs text-slate-500 font-extrabold">
                        <span className="text-teal-700">{msg.sender?.displayName || "المندوب / الصيدلية"}</span>
                        <span>{msg.createTime ? new Date(msg.createTime).toLocaleTimeString("ar-SA") : ""}</span>
                      </div>
                      <p className="text-slate-800 font-medium whitespace-pre-line leading-relaxed">{msg.text}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Send Message Form */}
              <form onSubmit={handleSendMessage} className="pt-4 border-t border-slate-100 flex gap-3 shrink-0">
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
                  disabled={isSending || !selectedSpace}
                  className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition-colors shadow-md disabled:opacity-50 cursor-pointer flex items-center gap-2 shrink-0"
                >
                  <Send className="h-4 w-4" />
                  <span>{isSending ? "جاري الإرسال..." : "إرسال فوري"}</span>
                </button>
              </form>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};
