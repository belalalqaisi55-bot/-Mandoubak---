import React, { useState, useEffect } from "react";
import { 
  X, FileSpreadsheet, Users, Download, Upload, RefreshCw, CheckCircle2, 
  ExternalLink, Sparkles, Building, Phone, User as UserIcon, ShieldCheck, Database
} from "lucide-react";
import { User, Order, Product } from "../types";
import { GoogleAuthProvider, signInWithPopup, getAuth, onAuthStateChanged } from "firebase/auth";
import { app } from "../firebase";

interface GoogleSheetsContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  orders?: Order[];
  products?: Product[];
  onImportBatchContacts?: (contacts: any[]) => void;
}

export const GoogleSheetsContactsModal: React.FC<GoogleSheetsContactsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  orders = [],
  products = [],
  onImportBatchContacts,
}) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState("");
  const [activeTab, setActiveTab] = useState<"sheets" | "contacts">("sheets");

  // Google Sheets state
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [sheetName, setSheetName] = useState("MandoubakOrders");
  const [exportingSheets, setExportingSheets] = useState(false);
  const [sheetMessage, setSheetMessage] = useState("");

  // Google Contacts state
  const [googleContacts, setGoogleContacts] = useState<any[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactMessage, setContactMessage] = useState("");

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
      provider.addScope("https://www.googleapis.com/auth/spreadsheets");
      provider.addScope("https://www.googleapis.com/auth/drive.file");
      provider.addScope("https://www.googleapis.com/auth/contacts.readonly");
      provider.addScope("https://www.googleapis.com/auth/user.phonenumbers.read");
      
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setAccessToken(credential.accessToken);
        fetchGoogleContacts(credential.accessToken);
      } else {
        throw new Error("فشل الحصول على رمز المصادقة من جوجل");
      }
    } catch (err: any) {
      console.error("Google Sheets & Contacts Auth Error:", err);
      setAuthError(err.message || "فشل تسجيل الدخول باستخدام حساب جوجل");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const fetchGoogleContacts = async (token: string) => {
    setLoadingContacts(true);
    try {
      const res = await fetch(
        "https://people.googleapis.com/v1/people/me/connections?personFields=names,phoneNumbers,organizations,emailAddresses",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        throw new Error("فشل جلب جهات الاتصال من حساب جوجل");
      }

      const data = await res.json();
      const connections = data.connections || [];
      const mapped = connections.map((c: any) => ({
        id: c.resourceName || Math.random().toString(),
        name: c.names?.[0]?.displayName || "بدون اسم",
        phone: c.phoneNumbers?.[0]?.value || "",
        entityName: c.organizations?.[0]?.name || "صيدلية / عيادة",
        email: c.emailAddresses?.[0]?.value || "",
        role: "pharmacy" as const,
        selected: true,
      })).filter((c: any) => c.phone);

      setGoogleContacts(mapped);
    } catch (err: any) {
      console.warn("Fetch Google Contacts Error:", err);
    } finally {
      setLoadingContacts(false);
    }
  };

  useEffect(() => {
    if (isOpen && accessToken) {
      fetchGoogleContacts(accessToken);
    }
  }, [isOpen, accessToken]);

  const handleExportToGoogleSheets = async () => {
    if (!accessToken) return;
    
    // MANDATORY User Confirmation for Mutating / Exporting data
    const confirmed = window.confirm("هل أنت متأكد من تصدير جميع الطلبيات والبيانات إلى Google Sheets؟");
    if (!confirmed) return;

    setExportingSheets(true);
    setSheetMessage("");

    try {
      // 1. Create a new Google Sheet if spreadsheetId is empty
      let targetId = spreadsheetId;
      if (!targetId) {
        const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            properties: {
              title: `Mandoubak Medical Rep Data - ${new Date().toLocaleDateString()}`,
            },
          }),
        });

        if (!createRes.ok) throw new Error("فشل إنشاء ملف Google Sheet جديد");
        const createData = await createRes.json();
        targetId = createData.spreadsheetId;
        setSpreadsheetId(targetId);
      }

      // 2. Format orders data into rows
      const rows = [
        ["رقم الطلبية", "اسم العميل", "الصيدلية / الجهة", "الحالة", "التاريخ", "الأصناف والمواصفات"],
        ...orders.map((o) => [
          o.id,
          o.clientName,
          o.entityName,
          o.status,
          o.createdAt,
          o.items.map((i) => `${i.productName} (${i.quantity})`).join(", "),
        ]),
      ];

      // 3. Write data to sheet
      const updateRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${targetId}/values/Sheet1!A1:F${rows.length}?valueInputOption=USER_ENTERED`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            values: rows,
          }),
        }
      );

      if (!updateRes.ok) throw new Error("فشل تحديث بيانات Google Sheet");

      setSheetMessage(`تم تصدير ${orders.length} طلبية إلى Google Sheets بنجاح 📊✨`);
      setTimeout(() => setSheetMessage(""), 5000);
    } catch (err: any) {
      console.error("Sheets export error:", err);
      alert("خطأ أثناء التصدير: " + err.message);
    } finally {
      setExportingSheets(false);
    }
  };

  const handleImportGoogleContacts = async () => {
    const selected = googleContacts.filter((c) => c.selected);
    if (selected.length === 0) {
      alert("الرجاء اختيار جهة اتصال واحدة على الأقل للاستيراد.");
      return;
    }

    // MANDATORY User Confirmation
    const confirmed = window.confirm(`هل أنت متأكد من استيراد ${selected.length} جهة اتصال إلى عملاء التطبيق؟`);
    if (!confirmed) return;

    if (onImportBatchContacts) {
      onImportBatchContacts(selected);
      setContactMessage(`تم استيراد ${selected.length} عميل من Google Contacts بنجاح! 👥`);
      setTimeout(() => setContactMessage(""), 4000);
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
              <FileSpreadsheet className="h-6 w-6 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">تكامل Google Sheets و Google Contacts</h2>
              <p className="text-xs text-emerald-200">تصدير بيانات المبيعات والطلبيات إلى جداول بيانات جوجل واستيراد جهات الاتصال</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-emerald-100 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!accessToken ? (
            <div className="p-8 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50 to-slate-50 border border-emerald-200 text-center space-y-4 shadow-sm">
              <div className="h-16 w-16 mx-auto rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md">
                <FileSpreadsheet className="h-8 w-8" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-black text-slate-900">ربط حساب جوجل للوصول إلى Sheets & Contacts</h3>
                <p className="text-xs text-slate-600">
                  سجل الدخول بحسابك في جوجل لمنح الصلاحية لتصدير الطلبيات إلى جداول بيانات جوجل واستيراد أطباء وصيادلة Google Contacts.
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
                  {isLoggingIn ? "جاري الاتصال..." : "تسجيل الدخول بحساب جوجل (Sign in with Google)"}
                </span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Tabs */}
              <div className="flex border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab("sheets")}
                  className={`flex items-center gap-2 py-3 px-5 font-bold text-xs border-b-2 transition-colors cursor-pointer ${
                    activeTab === "sheets" ? "border-emerald-600 text-emerald-700 bg-emerald-50/50" : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>تصدير Google Sheets ({orders.length} طلبية)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("contacts")}
                  className={`flex items-center gap-2 py-3 px-5 font-bold text-xs border-b-2 transition-colors cursor-pointer ${
                    activeTab === "contacts" ? "border-emerald-600 text-emerald-700 bg-emerald-50/50" : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Users className="h-4 w-4" />
                  <span>استيراد Google Contacts ({googleContacts.length})</span>
                </button>
              </div>

              {activeTab === "sheets" && (
                <div className="space-y-4">
                  {sheetMessage && (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>{sheetMessage}</span>
                    </div>
                  )}

                  <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                    <h3 className="text-sm font-black text-slate-900">تصدير قاعدة بيانات الطلبيات والمبيعات إلى Google Sheets</h3>
                    <p className="text-xs text-slate-600">
                      سيقوم النظام بإنشاء جدول بيانات جديد على Google Drive أو تحديث الجدول الحالي بمعلومات الطلبيات المسجلة.
                    </p>

                    <div>
                      <label className="block text-3xs font-bold text-slate-700 mb-1">معرف جدول البيانات (Spreadsheet ID - اتركه فارغاً لإنشاء جدول جديد)</label>
                      <input
                        type="text"
                        value={spreadsheetId}
                        onChange={(e) => setSpreadsheetId(e.target.value)}
                        placeholder="مثال: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-mono"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleExportToGoogleSheets}
                      disabled={exportingSheets}
                      className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      <span>{exportingSheets ? "جاري التصدير إلى Google Sheets..." : "تصدير الطلبيات الآن (Export to Sheets)"}</span>
                    </button>
                  </div>
                </div>
              )}

              {activeTab === "contacts" && (
                <div className="space-y-4">
                  {contactMessage && (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>{contactMessage}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-900">جهات الاتصال المستوردة من Google Contacts</h3>
                    <button
                      type="button"
                      onClick={() => accessToken && fetchGoogleContacts(accessToken)}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-3xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="h-3 w-3" />
                      <span>تحديث</span>
                    </button>
                  </div>

                  {loadingContacts ? (
                    <div className="py-12 text-center text-slate-400 text-xs">جاري جلب جهات الاتصال من حساب جوجل...</div>
                  ) : googleContacts.length === 0 ? (
                    <div className="py-12 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-slate-500 text-xs">
                      لم يتم العثور على جهات اتصال تحتوي على أرقام هواتف في حسابك.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                      {googleContacts.map((c, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-3 shadow-2xs">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={c.selected}
                              onChange={() => {
                                setGoogleContacts((prev) =>
                                  prev.map((item, i) => (i === idx ? { ...item, selected: !item.selected } : item))
                                );
                              }}
                              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <div>
                              <div className="font-bold text-slate-900 text-xs">{c.name}</div>
                              <div className="text-3xs text-slate-500 font-mono" dir="ltr">{c.phone}</div>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-3xs font-bold">
                            {c.entityName}
                          </span>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={handleImportGoogleContacts}
                        className="w-full mt-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Download className="h-4 w-4" />
                        <span>استيراد جهات الاتصال المحددة إلى التطبيق</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-3.5 flex items-center justify-between shrink-0">
          <span className="text-3xs text-slate-500">
            {accessToken ? "متصل بخدمات جوجل 🟢" : "غير متصل"} — نظام المندوب الطبي د/ بلال القيسي
          </span>
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 hover:bg-slate-900 text-white px-5 py-2 text-xs font-bold transition-colors cursor-pointer"
          >
            إغلاق النافذة
          </button>
        </div>

      </div>
    </div>
  );
};
