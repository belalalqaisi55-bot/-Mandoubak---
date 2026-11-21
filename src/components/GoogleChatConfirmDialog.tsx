import React from "react";
import { AlertTriangle, CheckCircle2, Trash2, Send, FolderPlus, SmilePlus, X } from "lucide-react";

export type ChatPendingAction =
  | {
      type: "send_message";
      spaceDisplayName: string;
      textPreview: string;
    }
  | {
      type: "create_space";
      displayName: string;
    }
  | {
      type: "delete_message";
      messageName: string;
      textPreview: string;
    }
  | {
      type: "add_reaction";
      messageName: string;
      emoji: string;
      textPreview: string;
    };

interface GoogleChatConfirmDialogProps {
  pendingAction: ChatPendingAction | null;
  isSubmitting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const GoogleChatConfirmDialog: React.FC<GoogleChatConfirmDialogProps> = ({
  pendingAction,
  isSubmitting = false,
  onConfirm,
  onCancel,
}) => {
  if (!pendingAction) return null;

  const isDestructive = pendingAction.type === "delete_message";

  const meta = (() => {
    switch (pendingAction.type) {
      case "send_message":
        return {
          title: "تأكيد إرسال رسالة عبر Google Chat",
          subtitle: `سيتم إرسال هذه الرسالة فوراً باسم حسابك إلى مساحة: ${pendingAction.spaceDisplayName}`,
          confirmLabel: "تأكيد وإرسال الرسالة",
          icon: <Send className="h-5 w-5 text-emerald-600" />,
          badgeBg: "bg-emerald-100",
          previewTitle: "محتوى الرسالة:",
          previewText: pendingAction.textPreview,
        };
      case "create_space":
        return {
          title: "تأكيد إنشاء مساحة محادثة جديدة",
          subtitle: "سيتم إنشاء مساحة عمل جديدة في حسابك على Google Chat بالاسم التالي:",
          confirmLabel: "تأكيد إنشاء المساحة",
          icon: <FolderPlus className="h-5 w-5 text-teal-600" />,
          badgeBg: "bg-teal-100",
          previewTitle: "اسم المساحة الجديدة:",
          previewText: pendingAction.displayName,
        };
      case "delete_message":
        return {
          title: "تأكيد حذف الرسالة نهائياً",
          subtitle: "هل أنت متأكد من حذف هذه الرسالة من Google Chat؟ لا يمكن التراجع عن هذا الإجراء.",
          confirmLabel: "نعم، احذف الرسالة",
          icon: <Trash2 className="h-5 w-5 text-rose-600" />,
          badgeBg: "bg-rose-100",
          previewTitle: "الرسالة التي سيتم حذفها:",
          previewText: pendingAction.textPreview || "(رسالة نصية)",
        };
      case "add_reaction":
        return {
          title: "تأكيد إضافة تفاعل على الرسالة",
          subtitle: `سيتم إضافة التفاعل (${pendingAction.emoji}) على هذه الرسالة في Google Chat:`,
          confirmLabel: `تأكيد إضافة ${pendingAction.emoji}`,
          icon: <SmilePlus className="h-5 w-5 text-amber-600" />,
          badgeBg: "bg-amber-100",
          previewTitle: "الرسالة المستهدفة:",
          previewText: pendingAction.textPreview || "(رسالة)",
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
            <div className="text-xs font-semibold text-slate-800 whitespace-pre-line break-words max-h-36 overflow-y-auto">
              {meta.previewText}
            </div>
          </div>

          {isDestructive && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-[11px] font-bold text-rose-800">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>تحذير: الحذف نهائي وسيزيل الرسالة من سجل المحادثة لدى جميع الأعضاء.</span>
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
                  : "bg-emerald-600 hover:bg-emerald-700"
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
