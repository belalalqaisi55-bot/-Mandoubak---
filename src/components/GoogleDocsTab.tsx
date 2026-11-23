import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  FileText,
  FilePlus2,
  Search,
  RefreshCw,
  ExternalLink,
  Trash2,
  LogOut,
  AlertCircle,
  CheckCircle2,
  FileEdit,
  Sparkles,
  BookOpenCheck,
} from "lucide-react";
import { Product, User, Agreement } from "../types";
import {
  DriveDocFile,
  ParsedGoogleDoc,
  GoogleDocsApiError,
  initGoogleDocsAuth,
  subscribeGoogleDocsToken,
  signInToGoogleDocs,
  signOutGoogleDocs,
  listGoogleDocs,
  getGoogleDoc,
  createGoogleDoc,
  appendTextToGoogleDoc,
  trashGoogleDoc,
} from "../services/googleDocsService";
import { GoogleSignInGsiButton } from "./GoogleSignInGsiButton";
import { GoogleDocsConfirmDialog, DocsPendingAction } from "./GoogleDocsConfirmDialog";

interface GoogleDocsTabProps {
  currentUser: User | null;
  products?: Product[];
  agreements?: Agreement[];
}

export const GoogleDocsTab: React.FC<GoogleDocsTabProps> = ({
  currentUser,
  products = [],
  agreements = [],
}) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [apiError, setApiError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const [docs, setDocs] = useState<DriveDocFile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingDocs, setLoadingDocs] = useState(false);

  const [selectedDocId, setSelectedDocId] = useState<string>("");
  const [selectedDoc, setSelectedDoc] = useState<ParsedGoogleDoc | null>(null);
  const [selectedDocLink, setSelectedDocLink] = useState<string>("");
  const [loadingDocContent, setLoadingDocContent] = useState(false);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocContent, setNewDocContent] = useState("");

  const [appendText, setAppendText] = useState("");
  const [pendingAction, setPendingAction] = useState<DocsPendingAction | null>(null);
  const [isExecutingAction, setIsExecutingAction] = useState(false);

  useEffect(() => {
    const unsubToken = subscribeGoogleDocsToken(({ token, user }) => {
      setAccessToken(token);
      setGoogleEmail(user?.email || null);
      setNeedsAuth(!token);
    });

    const unsubAuth = initGoogleDocsAuth(
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
    const docsErr = err as GoogleDocsApiError;
    setApiError(docsErr?.message || "حدث خطأ أثناء الاتصال بخدمة Google Docs");
    if (docsErr?.isAuthError) {
      setAccessToken(null);
      setNeedsAuth(true);
    }
  }, []);

  const loadDocs = useCallback(
    async (queryText = searchQuery) => {
      if (!accessToken) return;
      setLoadingDocs(true);
      setApiError("");
      try {
        const files = await listGoogleDocs(accessToken, queryText);
        setDocs(files);
        if (files.length > 0 && !selectedDocId) {
          setSelectedDocId(files[0].id);
          setSelectedDocLink(files[0].webViewLink || "");
        }
      } catch (err) {
        handleApiException(err);
      } finally {
        setLoadingDocs(false);
      }
    },
    [accessToken, searchQuery, selectedDocId, handleApiException]
  );

  const loadDocContent = useCallback(
    async (docId: string, webViewLink?: string) => {
      if (!accessToken || !docId) return;
      setLoadingDocContent(true);
      setApiError("");
      if (webViewLink) setSelectedDocLink(webViewLink);
      try {
        const parsed = await getGoogleDoc(accessToken, docId);
        setSelectedDoc(parsed);
      } catch (err) {
        handleApiException(err);
      } finally {
        setLoadingDocContent(false);
      }
    },
    [accessToken, handleApiException]
  );

  useEffect(() => {
    if (accessToken && !needsAuth) {
      loadDocs("");
    }
  }, [accessToken, needsAuth]);

  useEffect(() => {
    if (accessToken && selectedDocId) {
      const match = docs.find((d) => d.id === selectedDocId);
      loadDocContent(selectedDocId, match?.webViewLink);
    } else if (!selectedDocId) {
      setSelectedDoc(null);
    }
  }, [accessToken, selectedDocId]);

  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    setApiError("");
    try {
      const res = await signInToGoogleDocs();
      setAccessToken(res.accessToken);
      setGoogleEmail(res.user.email || null);
      setNeedsAuth(false);
    } catch (err: any) {
      setApiError(err?.message || "تعذر إتمام تسجيل الدخول بحساب Google.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    await signOutGoogleDocs();
    setDocs([]);
    setSelectedDocId("");
    setSelectedDoc(null);
    setNeedsAuth(true);
    setApiError("");
  };

  const todayFormatted = useMemo(() => new Date().toLocaleDateString("ar-EG"), []);

  const applyMedicalTemplate = (templateKey: "quote" | "agreement" | "visit" | "blank") => {
    setShowCreateForm(true);
    const authorLabel = currentUser?.entityName || currentUser?.name || "المندوب الطبي د/ بلال القيسي";

    if (templateKey === "quote") {
      const topProducts = products.slice(0, 12);
      const productLines =
        topProducts.length > 0
          ? topProducts
              .map(
                (p, idx) =>
                  `${idx + 1}. ${p.name} (${p.unit}) — السعر: ${p.price} — البونص: ${p.bonus || "لا يوجد"}`
              )
              .join("\n")
          : "1. (أضف الأصناف الدوائية هنا)";

      setNewDocTitle(`عرض أسعار دوائي - ${todayFormatted}`);
      setNewDocContent(
        `مندوبك الطبي - Mandoubak Med\nعرض أسعار رسمي ومعتمد\nالتاريخ: ${todayFormatted}\nالمُعد: ${authorLabel}\n\nقائمة الأصناف المتوفرة:\n${productLines}\n\nملاحظات التوريد:\n- الأسعار شاملة العروض السارية حتى نفاد الكمية.\n- للتواصل والاعتماد: د. بلال القيسي`
      );
      return;
    }

    if (templateKey === "agreement") {
      const latestAgreement = agreements[0];
      setNewDocTitle(
        latestAgreement
          ? `اتفاقية صيدلية - ${latestAgreement.entityName || latestAgreement.clientName}`
          : `مسودة اتفاقية توريد وبونص - ${todayFormatted}`
      );
      setNewDocContent(
        latestAgreement
          ? `وثيقة اتفاقية توريد دوائية\nالجهة: ${latestAgreement.entityName || latestAgreement.clientName}\nنوع الاتفاقية: ${latestAgreement.typeLabel || latestAgreement.type}\nالمندوب المسؤول: د. بلال القيسي\nالتاريخ: ${latestAgreement.agreementDate || todayFormatted}\nالحالة: ${latestAgreement.status}\n\nتفاصيل الاتفاقية والشروط:\n${latestAgreement.details}${latestAgreement.notes ? `\n\nملاحظات: ${latestAgreement.notes}` : ""}\n\nالتوقيع والاعتماد:`
          : `وثيقة اتفاقية توريد وبونص صيدلية\nالتاريخ: ${todayFormatted}\nالطرف الأول: المندوب الطبي د. بلال القيسي\nالطرف الثاني: صيدلية / مستودع ......................\n\nبنود الاتفاقية:\n1. نسبة البونص المتفق عليها: ......\n2. مدة السداد والتوريد: ......\n3. ملاحظات إضافية: ......`
      );
      return;
    }

    if (templateKey === "visit") {
      setNewDocTitle(`تقرير زيارة ميدانية - ${todayFormatted}`);
      setNewDocContent(
        `تقرير زيارة ميدانية\nالتاريخ: ${todayFormatted}\nبواسطة: ${authorLabel}\n\nاسم الصيدلية / الطبيب: ......................\nالأصناف المطلوبة أو الناقصة:\n- \n\nملاحظات الزيارة والتوصيات:\n- `
      );
      return;
    }

    setNewDocTitle(`مستند جديد - ${todayFormatted}`);
    setNewDocContent("");
  };

  const executeConfirmedAction = async () => {
    if (!accessToken || !pendingAction) return;
    setIsExecutingAction(true);
    setApiError("");
    setActionMessage("");

    try {
      if (pendingAction.type === "create_doc") {
        const created = await createGoogleDoc(
          accessToken,
          pendingAction.title,
          pendingAction.contentPreview
        );
        setShowCreateForm(false);
        setNewDocTitle("");
        setNewDocContent("");
        await loadDocs("");
        setSelectedDocId(created.documentId);
        setSelectedDoc(created);
        setActionMessage(`تم إنشاء مستند "${created.title}" في Google Docs بنجاح.`);
      } else if (pendingAction.type === "append_text") {
        const updated = await appendTextToGoogleDoc(
          accessToken,
          pendingAction.documentId,
          pendingAction.textPreview
        );
        setSelectedDoc(updated);
        setAppendText("");
        setActionMessage(`تم حفظ الإضافة داخل مستند "${updated.title}" بنجاح.`);
      } else if (pendingAction.type === "trash_doc") {
        await trashGoogleDoc(accessToken, pendingAction.documentId);
        if (selectedDocId === pendingAction.documentId) {
          setSelectedDocId("");
          setSelectedDoc(null);
        }
        await loadDocs(searchQuery);
        setActionMessage(`تم نقل "${pendingAction.documentTitle}" إلى سلة المهملات في Google Drive.`);
      }
      setPendingAction(null);
    } catch (err) {
      handleApiException(err);
    } finally {
      setIsExecutingAction(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-l from-blue-50 via-white to-teal-50 p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-sm shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                مستندات وتقارير Google Docs
              </h2>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                أنشئ عروض الأسعار الدوائية، مسودات الاتفاقيات، وتقارير الزيارات الميدانية واحفظها مباشرة في Google Docs & Drive الخاص بك.
              </p>
            </div>
          </div>

          {!needsAuth && accessToken && (
            <div className="flex items-center gap-2 flex-wrap">
              {googleEmail && (
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-800 dir-ltr">
                  {googleEmail}
                </span>
              )}
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>فصل الاتصال</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {apiError && (
        <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 font-semibold">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{apiError}</span>
        </div>
      )}

      {actionMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 font-bold">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {needsAuth || !accessToken ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 text-center space-y-4 shadow-2xs">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <BookOpenCheck className="h-7 w-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-sm sm:text-base font-black text-slate-900">
              اربط حساب Google للوصول إلى مستنداتك
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              بعد المصادقة، يمكنك تصفح مستندات Google Docs، قراءة محتواها، وتصدير عروض الأسعار واتفاقيات الصيدليات كملفات رسمية قابلة للطباعة والمشاركة.
            </p>
          </div>
          <div className="pt-1 flex justify-center">
            <GoogleSignInGsiButton
              onClick={handleGoogleSignIn}
              loading={isLoggingIn}
              label="Sign in with Google • ربط Google Docs و Drive"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Quick Templates Bar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-extrabold text-slate-700">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span>إنشاء مستند جاهز في Google Docs:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyMedicalTemplate("quote")}
                className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 text-xs font-bold cursor-pointer"
              >
                + عرض أسعار من الكتالوج
              </button>
              <button
                type="button"
                onClick={() => applyMedicalTemplate("agreement")}
                className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 text-xs font-bold cursor-pointer"
              >
                + مسودة اتفاقية صيدلية
              </button>
              <button
                type="button"
                onClick={() => applyMedicalTemplate("visit")}
                className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-bold cursor-pointer"
              >
                + تقرير زيارة ميدانية
              </button>
              <button
                type="button"
                onClick={() => applyMedicalTemplate("blank")}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-bold cursor-pointer"
              >
                + مستند مخصص
              </button>
            </div>
          </div>

          {/* Create Form */}
          {showCreateForm && (
            <div className="rounded-2xl border border-blue-200 bg-white p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <FilePlus2 className="h-4 w-4 text-blue-600" />
                  إعداد مستند Google Docs جديد
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
              <input
                type="text"
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
                placeholder="عنوان المستند (مثال: عرض أسعار صيدلية الشفاء)"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                rows={6}
                value={newDocContent}
                onChange={(e) => setNewDocContent(e.target.value)}
                placeholder="محتوى المستند..."
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={!newDocTitle.trim()}
                  onClick={() =>
                    setPendingAction({
                      type: "create_doc",
                      title: newDocTitle.trim(),
                      contentPreview: newDocContent,
                    })
                  }
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-extrabold cursor-pointer flex items-center gap-1.5"
                >
                  <FilePlus2 className="h-3.5 w-3.5" />
                  <span>حفظ وإنشاء في Google Docs</span>
                </button>
              </div>
            </div>
          )}

          {/* Split Layout: Docs List & Reader */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Documents Sidebar */}
            <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-3.5 space-y-3 shadow-2xs">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="h-3.5 w-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") loadDocs(searchQuery);
                    }}
                    placeholder="ابحث في مستندات Drive..."
                    className="w-full rounded-xl border border-slate-300 pr-8 pl-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => loadDocs(searchQuery)}
                  disabled={loadingDocs}
                  title="تحديث القائمة"
                  className="p-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingDocs ? "animate-spin" : ""}`} />
                </button>
              </div>

              <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-0.5">
                {loadingDocs ? (
                  <div className="py-8 text-center text-xs text-slate-500">جاري تحميل المستندات...</div>
                ) : docs.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    لا توجد مستندات Google Docs مطابقة حالياً. يمكنك إنشاء مستند جديد من القوالب أعلاه.
                  </div>
                ) : (
                  docs.map((file) => {
                    const isSelected = file.id === selectedDocId;
                    return (
                      <button
                        key={file.id}
                        type="button"
                        onClick={() => {
                          setSelectedDocId(file.id);
                          setSelectedDocLink(file.webViewLink || "");
                        }}
                        className={`w-full text-right rounded-xl border p-3 transition-colors cursor-pointer flex items-start justify-between gap-2 ${
                          isSelected
                            ? "bg-blue-50 border-blue-300 text-blue-950"
                            : "bg-white border-slate-200 hover:bg-slate-50 text-slate-800"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-extrabold truncate">{file.name}</div>
                          {file.modifiedTime && (
                            <div className="text-[10px] text-slate-500 mt-1">
                              آخر تعديل: {new Date(file.modifiedTime).toLocaleString("ar-EG")}
                            </div>
                          )}
                        </div>
                        <FileText
                          className={`h-4 w-4 shrink-0 mt-0.5 ${
                            isSelected ? "text-blue-600" : "text-slate-400"
                          }`}
                        />
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Selected Document Viewer & Append Editor */}
            <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-4 space-y-4 shadow-2xs flex flex-col">
              {loadingDocContent ? (
                <div className="py-16 text-center text-xs text-slate-500">جاري قراءة المستند...</div>
              ) : !selectedDoc ? (
                <div className="py-16 text-center text-xs text-slate-500">
                  اختر مستنداً من القائمة لعرض محتواه أو إضافة ملاحظات جديدة إليه.
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-slate-900">
                        {selectedDoc.title}
                      </h3>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {selectedDoc.paragraphCount} فقرة • {selectedDoc.tableCount} جدول
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {(selectedDocLink || selectedDoc.documentId) && (
                        <a
                          href={
                            selectedDocLink ||
                            `https://docs.google.com/document/d/${selectedDoc.documentId}/edit`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-bold"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span>فتح في Google Docs</span>
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setPendingAction({
                            type: "trash_doc",
                            documentId: selectedDoc.documentId,
                            documentTitle: selectedDoc.title,
                          })
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>حذف</span>
                      </button>
                    </div>
                  </div>

                  {/* Extracted Document Content */}
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed max-h-[280px] overflow-y-auto">
                    {selectedDoc.bodyText || "هذا المستند فارغ حالياً."}
                  </div>

                  {/* Append Update Box */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <label className="block text-xs font-extrabold text-slate-700">
                      إلحاق ملاحظة أو تحديث في نهاية المستند:
                    </label>
                    <textarea
                      rows={3}
                      value={appendText}
                      onChange={(e) => setAppendText(e.target.value)}
                      placeholder="اكتب نصاً لإضافته في نهاية هذا المستند..."
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        disabled={!appendText.trim()}
                        onClick={() =>
                          setPendingAction({
                            type: "append_text",
                            documentId: selectedDoc.documentId,
                            documentTitle: selectedDoc.title,
                            textPreview: appendText.trim(),
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-extrabold cursor-pointer"
                      >
                        <FileEdit className="h-3.5 w-3.5" />
                        <span>إضافة النص للمستند</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <GoogleDocsConfirmDialog
        pendingAction={pendingAction}
        isSubmitting={isExecutingAction}
        onConfirm={executeConfirmedAction}
        onCancel={() => !isExecutingAction && setPendingAction(null)}
      />
    </div>
  );
};
