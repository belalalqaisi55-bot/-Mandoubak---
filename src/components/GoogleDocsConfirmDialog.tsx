import React from "react";
import { AlertTriangle, CheckCircle2, FilePlus2, FileEdit, Trash2, X } from "lucide-react";

export type DocsPendingAction =
  | {
      type: "create_doc";
      title: string;
      contentPreview: string;
    }
  | {
      type: "append_text";
      documentId: string;
      documentTitle: string;
      textPreview: string;
    }
  | {
      type: "trash_doc";
      documentId: string;
      documentTitle: string;
    };

interface GoogleDocsConfirmDialogProps {
  pendingAction: DocsPendingAction | null;
  isSubmitting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const GoogleDocsConfirmDialog: React.FC<GoogleDocsConfirmDialogProps> = ({
  pendingAction,
  isSubmitting = false,
  onConfirm,
  onCancel,
}) => {
  if (!pendingAction) return null;

  const isDestructive = pendingAction.type === "trash_doc";

  const meta = (() => {
    switch (pendingAction.type) {
      case "create_doc":
        return {
          title: "تأكيد إنشاء مستند جديد في Google Docs",
          subtitle: `سيتم إنشاء مستند جديد باسم "${pendingAction.title}" وحفظه في حسابك على Google Drive.`,
          confirmLabel: "تأكيد وإنشاء المستند",
          icon: <FilePlus2 className="h-5 w-5 text-blue-600" />,
          badgeBg: "bg-blue-100",
          previewTitle: "معاينة المحتوى الذي سيُكتب داخل المستند:",
          previewText: pendingAction.contentPreview || "(مستند فارغ)",
        };
      case "append_text":
        return {
          title: "تأكيد تعديل وإضافة نص إلى مستند Google Docs",
          subtitle: `سيتم إلحاق هذا النص في نهاية المستند: "${pendingAction.documentTitle}"`,
          confirmLabel: "تأكيد وحفظ التعديل",
          icon: <FileEdit className="h-5 w-5 text-emerald-600" />,
          badgeBg: "bg-emerald-100",
          previewTitle: "النص الذي سيتم إضافته:",
          previewText: pendingAction.textPreview,
        };
      case "trash_doc":
        return {
          title: "تأكيد نقل المستند إلى سلة المهملات",
          subtitle: "سيتم نقل هذا المستند من Google Drive إلى سلة المهملات في حسابك:",
          confirmLabel: "نعم، انقل لسلة المهملات",
          icon: <Trash2 className="h-5 w-5 text-rose-600" />,
          badgeBg: "bg-rose-100",
          previewTitle: "اسم المستند المستهدف:",
          previewText: pendingAction.documentTitle,
        };
    }
  })();

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden"
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${meta.badgeBg} shrink-0`}>{meta.icon}</div>
            <div>
              <h3 className="text-sm font-black text-slate-900">{meta.title}</h3>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{meta.subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-1.5">
            <div className="text-[11px] font-bold text-slate-500">{meta.previewTitle}</div>
            <div className="text-xs font-semibold text-slate-800 whitespace-pre-line break-words max-h-40 overflow-y-auto">
              {meta.previewText}
            </div>
          </div>

          {isDestructive && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-[11px] font-bold text-rose-800">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>تنبيه: سيختفي المستند من قائمة Drive النشطة ويمكن استعادته لاحقاً من سلة المهملات في Google Drive.</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isSubmitting}
              className={`px-4 py-2 rounded-xl text-white text-xs font-extrabold transition-colors shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1.5 ${
                isDestructive
                  ? "bg-rose-600 hover:bg-rose-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{isSubmitting ? "جاري التنفيذ..." : meta.confirmLabel}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
