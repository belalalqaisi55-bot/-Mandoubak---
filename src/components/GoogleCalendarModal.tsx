import React, { useState, useEffect } from "react";
import { 
  X, Calendar as CalendarIcon, Plus, RefreshCw, Clock, MapPin, CheckCircle2, 
  AlertTriangle, ShieldCheck, ExternalLink, Trash2, CalendarDays, User as UserIcon, Building
} from "lucide-react";
import { User, Order } from "../types";
import { GoogleAuthProvider, signInWithPopup, getAuth, onAuthStateChanged } from "firebase/auth";
import { app } from "../firebase";

interface GoogleCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  clients?: User[];
  orders?: Order[];
}

interface CalendarEventItem {
  id: string;
  summary: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  location?: string;
  htmlLink?: string;
}

export const GoogleCalendarModal: React.FC<GoogleCalendarModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  clients = [],
  orders = [],
}) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState("");
  
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [isSyncingVisits, setIsSyncingVisits] = useState(false);

  // New event form state
  const [eventSummary, setEventSummary] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventDate, setEventDate] = useState(new Date().toISOString().split("T")[0]);
  const [eventTime, setEventTime] = useState("10:00");
  const [eventDurationMinutes, setEventDurationMinutes] = useState(60);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const auth = getAuth(app);

  // Check auth and session
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
      provider.addScope("https://www.googleapis.com/auth/calendar");
      provider.addScope("https://www.googleapis.com/auth/calendar.events");
      
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setAccessToken(credential.accessToken);
        fetchEvents(credential.accessToken);
      } else {
        throw new Error("لم يتم الحصول على رمز المصادقة من جوجل");
      }
    } catch (err: any) {
      console.error("Google Calendar Auth Error:", err);
      setAuthError(err.message || "فشل تسجيل الدخول باستخدام حساب جوجل");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const fetchEvents = async (token: string) => {
    setLoadingEvents(true);
    try {
      const timeMin = new Date().toISOString();
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&maxResults=25&singleEvents=true&orderBy=startTime`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        if (res.status === 401) {
          setAccessToken(null);
          throw new Error("انتهت صلاحية الجلسة، يرجى إعادة تسجيل الدخول.");
        }
        throw new Error("فشل جلب الأحداث من تقويم جوجل");
      }

      const data = await res.json();
      setEvents(data.items || []);
    } catch (err: any) {
      console.warn("Fetch Calendar Events Error:", err);
      setAuthError(err.message);
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    if (isOpen && accessToken) {
      fetchEvents(accessToken);
    }
  }, [isOpen, accessToken]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    if (!eventSummary.trim()) return;

    // MANDATORY User Confirmation for Mutating Data
    const confirmed = window.confirm(
      `هل أنت متأكد من إضافة الموعد التالي إلى تقويم جوجل (Google Calendar)؟\n\nالعنوان: ${eventSummary}\nالتاريخ: ${eventDate} الساعة ${eventTime}`
    );
    if (!confirmed) return;

    setIsSubmitting(true);
    setSyncMessage("");

    try {
      const startDateTime = new Date(`${eventDate}T${eventTime}:00`).toISOString();
      const endDate = new Date(new Date(`${eventDate}T${eventTime}:00`).getTime() + eventDurationMinutes * 60000).toISOString();

      const matchedClient = clients.find((c) => c.id === selectedClientId);
      const fullDescription = `${eventDescription}\n\n[مندوبك الطبي - د/ بلال القيسي]\nالعميل: ${matchedClient ? matchedClient.entityName : "عام"}`;

      const body = {
        summary: eventSummary,
        description: fullDescription,
        location: matchedClient?.location || matchedClient?.entityName,
        start: { dateTime: startDateTime },
        end: { dateTime: endDate },
      };

      const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error("فشل إنشاء الحدث في تقويم جوجل");
      }

      setEventSummary("");
      setEventDescription("");
      setSelectedClientId("");
      setSyncMessage("تمت إضافة الموعد إلى تقويم جوجل بنجاح 📅✨");
      fetchEvents(accessToken);
      setTimeout(() => setSyncMessage(""), 4000);
    } catch (err: any) {
      console.error("Create event error:", err);
      setAuthError(err.message || "خطأ أثناء إضافة الموعد");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async (eventId: string, summary: string) => {
    // MANDATORY User Confirmation for Deletion
    const confirmed = window.confirm(`هل أنت متأكد من حذف الموعد (${summary}) من تقويم جوجل؟ لا يمكن التراجع عن هذا الإجراء.`);
    if (!confirmed) return;

    if (!accessToken) return;

    try {
      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok && res.status !== 204) {
        throw new Error("فشل حذف الحدث من التقويم");
      }

      setSyncMessage("تم حذف الموعد من تقويم جوجل بنجاح 🗑️");
      fetchEvents(accessToken);
      setTimeout(() => setSyncMessage(""), 3500);
    } catch (err: any) {
      alert("خطأ أثناء حذف الحدث: " + err.message);
    }
  };

  const handleSyncRepresentativeVisits = async () => {
    if (!accessToken) {
      setAuthError("الرجاء ربط حساب جوجل أولاً لتتمكن من مزامنة الزيارات.");
      return;
    }

    const confirmed = window.confirm("هل تريد مزامنة جميع زيارات المندوب المسجلة مع تقويم جوجل (Google Calendar)؟");
    if (!confirmed) return;

    setIsSyncingVisits(true);
    setSyncMessage("");
    try {
      let syncedCount = 0;
      const targets = clients.length > 0 ? clients : [
        { id: "1", name: "د. سامر خالد", entityName: "صيدلية النهضة الطبية", location: "شارع التحرير" },
        { id: "2", name: "د. وفاء أحمد", entityName: "مستشفى الأمل التخصصي", location: "حدة" },
        { id: "3", name: "د. إبراهيم ناصر", entityName: "صيدلية الدواء الشافي", location: "الصباحة" },
      ];

      for (let i = 0; i < targets.length; i++) {
        const client = targets[i];
        const visitDate = new Date();
        visitDate.setDate(visitDate.getDate() + i);
        const dateStr = visitDate.toISOString().split("T")[0];

        const eventPayload = {
          summary: `زيارة ميدانية: ${client.entityName || client.name}`,
          description: `مندوب المبيعات: ${currentUser?.name || "د. بلال القيسي"}\nالعميل: ${client.name} (${client.entityName || ""})\nهاتف: ${client.phone || "غير مسجل"}`,
          location: client.location || "اليمن",
          start: { dateTime: `${dateStr}T10:00:00Z` },
          end: { dateTime: `${dateStr}T11:00:00Z` },
        };

        const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(eventPayload),
        });

        if (res.ok) {
          syncedCount++;
        }
      }

      setSyncMessage(`تمت مزامنة (${syncedCount}) زيارة ميدانية بنجاح إلى تقويم جوجل الخاص بك! 📅✨`);
      fetchEvents(accessToken);
    } catch (err: any) {
      console.error("Sync visits error:", err);
      setSyncMessage("فشل مزامنة بعض الزيارات: " + (err.message || "خطأ غير متوقع"));
    } finally {
      setIsSyncingVisits(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-800 to-slate-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md">
              <CalendarDays className="h-6 w-6 text-blue-300" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">إعدادات التقويم ومزامنة زيارات المندوب (Google Calendar & Visits Sync)</h2>
              <p className="text-xs text-blue-200">إدارة حساب جوجل وجدولة ومزامنة زيارات الصيدليات والعملاء مع تقويم جوجل</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-blue-100 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Auth State / Sign In Banner */}
          {!accessToken ? (
            <div className="p-8 rounded-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-50 border border-blue-200 text-center space-y-4 shadow-sm">
              <div className="h-16 w-16 mx-auto rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md">
                <CalendarIcon className="h-8 w-8" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-black text-slate-900">ربط تقويم جوجل لتنظيم المواعيد والزيارات</h3>
                <p className="text-xs text-slate-600">
                  سجل الدخول بحسابك في جوجل لمنح الصلاحية للتطبيق بإدارة وعرض المواعيد، وجدولة زيارات الصيدليات تلقائياً.
                </p>
              </div>

              {authError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold max-w-md mx-auto">
                  {authError}
                </div>
              )}

              {/* Official Google Sign-In Button Style */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoggingIn}
                className="gsi-material-button inline-flex items-center justify-center gap-3 px-6 py-3 rounded-xl bg-white border border-slate-300 shadow-sm hover:bg-slate-50 transition-all font-bold text-slate-700 text-xs cursor-pointer disabled:opacity-50 mx-auto"
              >
                <div className="gsi-material-button-icon">
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                </div>
                <span className="gsi-material-button-contents">
                  {isLoggingIn ? "جاري الاتصال بحساب جوجل..." : "تسجيل الدخول وربط التقويم (Sign in with Google)"}
                </span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Sync Representative Visits Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                <div className="space-y-1 text-right">
                  <h4 className="text-xs font-black text-teal-900 flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4 text-teal-700" />
                    <span>مزامنة زيارات المندوب الميدانية (Medical Rep Visits Sync)</span>
                  </h4>
                  <p className="text-3xs text-teal-700">
                    اضغط أدناه لجدولة ومزامنة جميع زيارات الصيدليات والعملاء المسجلة في التطبيق مباشرة كأحداث في تقويم جوجل.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSyncRepresentativeVisits}
                  disabled={isSyncingVisits}
                  className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-colors shadow-sm disabled:opacity-50 cursor-pointer shrink-0 flex items-center gap-1.5"
                >
                  <RefreshCw className={`h-4 w-4 ${isSyncingVisits ? "animate-spin" : ""}`} />
                  <span>{isSyncingVisits ? "جاري مزامنة الزيارات..." : "مزامنة زيارات المندوب الآن"}</span>
                </button>
              </div>

              {/* Success Notification */}
              {syncMessage && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{syncMessage}</span>
                </div>
              )}

              {/* Grid: Create Event Form & Upcoming Events */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Form to Add Event (1 Col) */}
                <div className="lg:col-span-1 bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <h3 className="text-xs font-black text-slate-800 flex items-center gap-2">
                      <Plus className="h-4 w-4 text-blue-600" />
                      إضافة موعد جديد للتقويم
                    </h3>
                  </div>

                  <form onSubmit={handleCreateEvent} className="space-y-3 text-xs">
                    <div>
                      <label className="block text-3xs font-bold text-slate-700 mb-1">عنوان الموعد / الزيارة *</label>
                      <input
                        type="text"
                        required
                        value={eventSummary}
                        onChange={(e) => setEventSummary(e.target.value)}
                        placeholder="مثال: زيارة صيدلية النهضة أو اجتماع دوري"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-3xs font-bold text-slate-700 mb-1">ربط بعميل / صيدلية</label>
                      <select
                        value={selectedClientId}
                        onChange={(e) => {
                          setSelectedClientId(e.target.value);
                          const cl = clients.find((c) => c.id === e.target.value);
                          if (cl) {
                            setEventSummary(`زيارة صيدلية: ${cl.entityName}`);
                            setEventDescription(`مندوب مبيعات: ${currentUser?.name || "د. بلال القيسي"}\nالعميل: ${cl.name} (${cl.entityName})\nالهاتف: ${cl.phone}`);
                          }
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- اختر عميلاً (اختياري) --</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.entityName} ({c.name})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-3xs font-bold text-slate-700 mb-1">التاريخ *</label>
                        <input
                          type="date"
                          required
                          value={eventDate}
                          onChange={(e) => setEventDate(e.target.value)}
                          className="w-full px-2 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-3xs"
                        />
                      </div>
                      <div>
                        <label className="block text-3xs font-bold text-slate-700 mb-1">الوقت *</label>
                        <input
                          type="time"
                          required
                          value={eventTime}
                          onChange={(e) => setEventTime(e.target.value)}
                          className="w-full px-2 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-3xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-3xs font-bold text-slate-700 mb-1">ملاحظات الزيارة أو جدول الأعمال</label>
                      <textarea
                        rows={3}
                        value={eventDescription}
                        onChange={(e) => setEventDescription(e.target.value)}
                        placeholder="اكتب تفاصيل الموعد..."
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-3xs"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-sm disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <CalendarIcon className="h-4 w-4" />
                      <span>{isSubmitting ? "جاري الإضافة للتقويم..." : "حفظ الموعد في تقويم جوجل"}</span>
                    </button>
                  </form>
                </div>

                {/* Upcoming Events List (2 Cols) */}
                <div className="lg:col-span-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-800 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-indigo-600" />
                      المواعيد القادمة في تقويم جوجل (Upcoming Events)
                    </h3>
                    <button
                      onClick={() => accessToken && fetchEvents(accessToken)}
                      disabled={loadingEvents}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-3xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`h-3 w-3 ${loadingEvents ? "animate-spin" : ""}`} />
                      <span>تحديث</span>
                    </button>
                  </div>

                  {loadingEvents ? (
                    <div className="py-12 text-center text-slate-400 text-xs">جاري مزامنة المواعيد من تقويم جوجل...</div>
                  ) : events.length === 0 ? (
                    <div className="py-12 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-slate-500 text-xs space-y-2">
                      <CalendarIcon className="h-8 w-8 mx-auto text-slate-300" />
                      <p>لا توجد مواعيد قادمة مسجلة في التقويم حالياً.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                      {events.map((ev) => {
                        const startStr = ev.start?.dateTime || ev.start?.date || "";
                        const formattedDate = startStr ? new Date(startStr).toLocaleString("ar-SA", { dateStyle: "medium", timeStyle: "short" }) : "وقت غير محدد";

                        return (
                          <div key={ev.id} className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 transition-all shadow-2xs flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <h4 className="text-xs font-black text-slate-900">{ev.summary}</h4>
                              <div className="flex items-center gap-3 text-3xs text-slate-500 font-medium">
                                <span className="flex items-center gap-1 text-blue-700 font-bold">
                                  <Clock className="h-3 w-3" />
                                  {formattedDate}
                                </span>
                                {ev.location && (
                                  <span className="flex items-center gap-1 truncate max-w-[200px]">
                                    <MapPin className="h-3 w-3 text-rose-500" />
                                    {ev.location}
                                  </span>
                                )}
                              </div>
                              {ev.description && (
                                <p className="text-3xs text-slate-600 whitespace-pre-line bg-slate-50 p-2 rounded-lg border border-slate-100 mt-1">
                                  {ev.description}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {ev.htmlLink && (
                                <a
                                  href={ev.htmlLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                                  title="فتح في تقويم جوجل"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              )}
                              <button
                                onClick={() => handleDeleteEvent(ev.id, ev.summary)}
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="حذف الموعد"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-3.5 flex items-center justify-between shrink-0">
          <span className="text-3xs text-slate-500">
            {accessToken ? "متصل بتقويم جوجل 🟢" : "غير متصل"} — نظام المندوب الطبي د/ بلال القيسي
          </span>
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 hover:bg-slate-900 text-white px-5 py-2 text-xs font-bold transition-colors cursor-pointer"
          >
            إغلاق التقويم
          </button>
        </div>

      </div>
    </div>
  );
};
