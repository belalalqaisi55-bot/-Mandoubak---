import React, { useState, useEffect } from "react";
import { 
  X, User as UserIcon, Building, Phone, MapPin, CheckCircle2, Clock, 
  AlertCircle, Bookmark, Plus, CheckSquare, Square, Trash2, Pin, Tag,
  ExternalLink, MessageSquare, Edit, ShieldCheck, Calendar, Sparkles, RefreshCw
} from "lucide-react";
import { User, KeepNote } from "../types";
import { 
  fetchKeepNotes, 
  saveKeepNotes, 
  addKeepNote, 
  deleteKeepNote, 
  subscribeKeepNotes 
} from "../services/keepNotesService";

interface ClientProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: User | null;
  onOpenKeepFullModal?: (clientId: string) => void;
  onEditClient?: (client: User) => void;
  onApproveClient?: (client: User) => void;
  onOpenAudit?: (clientId: string) => void;
}

const NOTE_COLORS = [
  { id: "yellow", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-900" },
  { id: "green", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-900" },
  { id: "blue", bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-900" },
  { id: "pink", bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-900" },
  { id: "purple", bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-900" },
  { id: "slate", bg: "bg-white", border: "border-slate-200", text: "text-slate-900" },
];

export const ClientProfileModal: React.FC<ClientProfileModalProps> = ({
  isOpen,
  onClose,
  client,
  onOpenKeepFullModal,
  onEditClient,
  onApproveClient,
  onOpenAudit,
}) => {
  const [activeTab, setActiveTab] = useState<"notes" | "info" | "actions">("notes");
  const [notes, setNotes] = useState<KeepNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // New Note State inside profile
  const [showAddNoteForm, setShowAddNoteForm] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteColor, setNoteColor] = useState("yellow");
  const [isChecklist, setIsChecklist] = useState(false);
  const [checklistItems, setChecklistItems] = useState<{ id: string; text: string; completed: boolean }[]>([]);
  const [newItemText, setNewItemText] = useState("");
  const [newLabelInput, setNewLabelInput] = useState("");
  const [noteLabels, setNoteLabels] = useState<string[]>([]);

  const loadClientNotes = async () => {
    if (!client) return;
    setLoadingNotes(true);
    try {
      const allNotes = await fetchKeepNotes();
      // Filter notes that belong to this client (by ID or exact entityName)
      const matched = allNotes.filter(
        (n) => n.clientId === client.id || (n.clientEntityName && n.clientEntityName === client.entityName)
      );
      setNotes(matched);
    } catch (e) {
      console.warn("Could not load client notes:", e);
    } finally {
      setLoadingNotes(false);
    }
  };

  useEffect(() => {
    if (isOpen && client) {
      loadClientNotes();
    }
  }, [isOpen, client]);

  // Subscribe to live notes updates
  useEffect(() => {
    const unsubscribe = subscribeKeepNotes((allNotes) => {
      if (!client) return;
      const matched = allNotes.filter(
        (n) => n.clientId === client.id || (n.clientEntityName && n.clientEntityName === client.entityName)
      );
      setNotes(matched);
    });
    return () => unsubscribe();
  }, [client]);

  if (!isOpen || !client) return null;

  const isDoctor = client.role === "doctor";
  const isPending = client.isApproved === false || client.status === "pending_approval";
  const isSuspended = client.status === "suspended";
  const isApproved = !isPending && !isSuspended;

  const handleAddNoteToClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() && !noteContent.trim() && checklistItems.length === 0) return;

    await addKeepNote({
      title: noteTitle.trim() || `ملاحظة لـ ${client.entityName}`,
      content: noteContent.trim(),
      color: noteColor,
      isPinned: false,
      isArchived: false,
      labels: noteLabels.length > 0 ? noteLabels : ["ملف_العميل"],
      checklist: isChecklist ? checklistItems : undefined,
      clientId: client.id,
      clientName: client.name,
      clientEntityName: client.entityName,
    });

    setNoteTitle("");
    setNoteContent("");
    setNoteLabels([]);
    setChecklistItems([]);
    setIsChecklist(false);
    setShowAddNoteForm(false);
    setSuccessMsg("تم تدوين الملاحظة وحفظها بملف العميل بنجاح 📋");
    setTimeout(() => setSuccessMsg(""), 3500);
  };

  const handleToggleChecklist = async (noteId: string, itemId: string) => {
    const all = await fetchKeepNotes();
    const updated = all.map((n) => {
      if (n.id === noteId && n.checklist) {
        const updatedList = n.checklist.map((item) =>
          item.id === itemId ? { ...item, completed: !item.completed } : item
        );
        return { ...n, checklist: updatedList, updatedAt: new Date().toISOString() };
      }
      return n;
    });
    await saveKeepNotes(updated);
  };

  const handleDeleteNoteFromClient = async (noteId: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه الملاحظة من ملف العميل؟")) return;
    await deleteKeepNote(noteId);
    setSuccessMsg("تم حذف الملاحظة");
    setTimeout(() => setSuccessMsg(""), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-slate-900 px-6 py-4 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md shadow-inner text-teal-200">
              {isDoctor ? <UserIcon className="h-6 w-6" /> : <Building className="h-6 w-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black tracking-tight">{client.entityName}</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-3xs font-extrabold ${
                  isDoctor ? "bg-indigo-500/30 text-indigo-100 border border-indigo-400/40" : "bg-teal-500/30 text-teal-100 border border-teal-400/40"
                }`}>
                  {isDoctor ? "🩺 عيادة / طبيب" : "🏥 صيدلية"}
                </span>
                {isApproved && (
                  <span className="px-2 py-0.5 rounded-full text-3xs font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    معتمد
                  </span>
                )}
                {isPending && (
                  <span className="px-2 py-0.5 rounded-full text-3xs font-bold bg-amber-500/20 text-amber-200 border border-amber-400/40 flex items-center gap-1 animate-pulse">
                    <Clock className="h-3 w-3" />
                    بانتظار التأكيد
                  </span>
                )}
              </div>
              <p className="text-xs text-teal-100 mt-0.5">
                المسؤول: {client.name} | رقم الهاتف: {client.phone}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-teal-100 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-50 px-6 py-2.5 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("notes")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "notes"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <Bookmark className="h-4 w-4" />
              <span>ملاحظات Google Keep الطبية ({notes.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("info")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "info"
                  ? "bg-teal-700 text-white shadow-xs"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <Building className="h-4 w-4" />
              <span>بيانات المنشأة والتواصل</span>
            </button>

            <button
              onClick={() => setActiveTab("actions")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "actions"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <span>الإجراءات السريعة</span>
            </button>
          </div>

          {activeTab === "notes" && onOpenKeepFullModal && (
            <button
              onClick={() => {
                onOpenKeepFullModal(client.id);
                onClose();
              }}
              className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 hover:underline cursor-pointer"
            >
              <span>فتح في مفكرة Google Keep</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {successMsg && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: GOOGLE KEEP MEDICAL NOTES */}
          {activeTab === "notes" && (
            <div className="space-y-4">
              {/* Top Banner & Add Note Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-amber-950 flex items-center gap-1.5">
                    <Bookmark className="h-4 w-4 text-amber-600" />
                    <span>سجل الملاحظات الطبية الخاصة بـ ({client.entityName})</span>
                  </h3>
                  <p className="text-2xs text-amber-800">
                    هذه الملاحظات مربوطة حصراً بهذا العميل وتظهر في ملفه ومفكرة Google Keep السحابية.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddNoteForm(!showAddNoteForm)}
                  className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  <span>{showAddNoteForm ? "إلغاء التدوين" : "تدوين ملاحظة جديدة للعميل"}</span>
                </button>
              </div>

              {/* Add Note Form */}
              {showAddNoteForm && (
                <form onSubmit={handleAddNoteToClient} className="p-4 rounded-2xl bg-white border border-amber-300 shadow-md space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      إضافة ملاحظة أو طلبية لملف: {client.entityName}
                    </span>
                    <button type="button" onClick={() => setShowAddNoteForm(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <input
                    type="text"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    placeholder="عنوان الملاحظة (مثال: طلبية عاجلة لبونص بنادول أو موعد زيارة)..."
                    className="w-full text-xs font-bold text-slate-900 border-b border-slate-200 pb-1.5 outline-none focus:border-amber-500"
                  />

                  {isChecklist ? (
                    <div className="space-y-1.5 py-1">
                      {checklistItems.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() =>
                              setChecklistItems(
                                checklistItems.map((i) => (i.id === item.id ? { ...i, completed: !i.completed } : i))
                              )
                            }
                          >
                            {item.completed ? <CheckSquare className="h-4 w-4 text-amber-600" /> : <Square className="h-4 w-4 text-slate-400" />}
                          </button>
                          <span className={`flex-1 ${item.completed ? "line-through text-slate-400" : "text-slate-800 font-bold"}`}>
                            {item.text}
                          </span>
                          <button
                            type="button"
                            onClick={() => setChecklistItems(checklistItems.filter((i) => i.id !== item.id))}
                            className="text-slate-400 hover:text-rose-600"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                      <div className="flex items-center gap-2 pt-1">
                        <Plus className="h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          value={newItemText}
                          onChange={(e) => setNewItemText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newItemText.trim()) {
                              e.preventDefault();
                              setChecklistItems([...checklistItems, { id: Date.now().toString(), text: newItemText.trim(), completed: false }]);
                              setNewItemText("");
                            }
                          }}
                          placeholder="إضافة عنصر للقائمة..."
                          className="w-full text-xs outline-hidden text-slate-800"
                        />
                      </div>
                    </div>
                  ) : (
                    <textarea
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      placeholder="تفاصيل الملاحظة الطبية، متطلبات الصيدلية، تفضيلات الأدوية، إلخ..."
                      rows={3}
                      className="w-full text-xs text-slate-700 outline-none resize-none border border-slate-200 rounded-xl p-2.5 focus:border-amber-400"
                    />
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                        {NOTE_COLORS.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setNoteColor(c.id)}
                            className={`h-5 w-5 rounded-full ${c.bg} border-2 ${
                              noteColor === c.id ? "border-amber-700 scale-110" : "border-transparent"
                            } transition-transform cursor-pointer`}
                          />
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsChecklist(!isChecklist)}
                        className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${
                          isChecklist ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        <CheckSquare className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newLabelInput}
                        onChange={(e) => setNewLabelInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newLabelInput.trim()) {
                            e.preventDefault();
                            if (!noteLabels.includes(newLabelInput.trim())) {
                              setNoteLabels([...noteLabels, newLabelInput.trim()]);
                            }
                            setNewLabelInput("");
                          }
                        }}
                        placeholder="وسم (#) + Enter"
                        className="px-2 py-1 rounded-lg bg-slate-100 text-3xs font-bold text-slate-700 outline-hidden w-24"
                      />
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                      >
                        حفظ الملاحظة بملف العميل
                      </button>
                    </div>
                  </div>

                  {noteLabels.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {noteLabels.map((l) => (
                        <span key={l} className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-3xs font-bold flex items-center gap-1">
                          #{l}
                          <button type="button" onClick={() => setNoteLabels(noteLabels.filter((x) => x !== l))}>×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </form>
              )}

              {/* Notes List */}
              {loadingNotes ? (
                <div className="py-12 text-center text-slate-500 font-bold text-xs">جاري تحميل ملاحظات العميل...</div>
              ) : notes.length === 0 ? (
                <div className="py-12 text-center rounded-2xl border border-dashed border-amber-200 bg-amber-50/20 p-8 space-y-2">
                  <Bookmark className="h-10 w-10 text-amber-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">لا توجد ملاحظات طبية مسجلة لهذا العميل بعد</p>
                  <p className="text-2xs text-slate-500 max-w-sm mx-auto">
                    يمكنك تدوين احتياجات الصيدلية، تفضيلات البونص، أو ملاحظات الزيارات الميدانية بالضغط على الزر أعلاه.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAddNoteForm(true)}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold shadow-xs hover:bg-amber-700 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>تدوين أول ملاحظة الآن</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {notes.map((note) => {
                    const colorObj = NOTE_COLORS.find((c) => c.id === note.color) || NOTE_COLORS[0];
                    return (
                      <div
                        key={note.id}
                        className={`rounded-2xl border ${colorObj.border} ${colorObj.bg} p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className={`text-xs font-black ${colorObj.text} leading-snug`}>{note.title}</h4>
                            <button
                              onClick={() => handleDeleteNoteFromClient(note.id)}
                              className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                              title="حذف الملاحظة"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {note.content && (
                            <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed mb-3">
                              {note.content}
                            </p>
                          )}

                          {note.checklist && note.checklist.length > 0 && (
                            <div className="space-y-1.5 my-2">
                              {note.checklist.map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => handleToggleChecklist(note.id, item.id)}
                                  className="w-full flex items-center gap-2 text-xs text-left cursor-pointer hover:bg-black/5 p-1 rounded-lg transition-colors"
                                >
                                  {item.completed ? (
                                    <CheckSquare className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                                  ) : (
                                    <Square className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                  )}
                                  <span className={`truncate ${item.completed ? "line-through text-slate-400" : "text-slate-800 font-bold"}`}>
                                    {item.text}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}

                          {note.labels && note.labels.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {note.labels.map((l) => (
                                <span key={l} className="px-2 py-0.5 rounded-md bg-white/80 text-slate-700 text-3xs font-bold border border-black/5">
                                  #{l}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="pt-2 mt-3 border-t border-black/5 flex items-center justify-between text-3xs text-slate-500">
                          <span>{new Date(note.updatedAt).toLocaleDateString("ar-SA")}</span>
                          <span className="text-amber-800 font-bold">Google Keep Sync ✅</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DETAILED INFO */}
          {activeTab === "info" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-1">
                  <span className="text-2xs font-bold text-slate-500">اسم المنشأة الطبية</span>
                  <p className="text-sm font-black text-slate-900">{client.entityName}</p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-1">
                  <span className="text-2xs font-bold text-slate-500">المسؤول الطبي المباشر</span>
                  <p className="text-sm font-black text-slate-900">{client.name}</p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-1">
                  <span className="text-2xs font-bold text-slate-500">رقم الهاتف والتواصل</span>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-900 font-mono dir-ltr">{client.phone}</p>
                    <div className="flex items-center gap-1">
                      <a
                        href={`tel:${client.phone}`}
                        className="p-1.5 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100"
                        title="اتصال هاتف"
                      >
                        <Phone className="h-3.5 w-3.5" />
                      </a>
                      <a
                        href={`https://wa.me/${client.phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        title="واتساب"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-1">
                  <span className="text-2xs font-bold text-slate-500">العنوان والموقع الجغرافي</span>
                  <p className="text-xs font-bold text-slate-900 flex items-start gap-1">
                    <MapPin className="h-3.5 w-3.5 text-teal-600 shrink-0 mt-0.5" />
                    <span>{client.location || "غير محدد"}</span>
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-1">
                  <span className="text-2xs font-bold text-slate-500">رمز التأكيد المعتمد</span>
                  <p className="text-xs font-mono font-black text-teal-800 bg-teal-50 inline-block px-2 py-0.5 rounded border border-teal-200">
                    {client.confirmationCode || "لا يوجد"}
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-1">
                  <span className="text-2xs font-bold text-slate-500">حالة اعتماد الحساب</span>
                  <p className="text-xs font-bold">
                    {isApproved ? (
                      <span className="text-emerald-700">حساب معتمد ومفعل ✅</span>
                    ) : isPending ? (
                      <span className="text-amber-700">بانتظار موافقة واعتماد المندوب ⏳</span>
                    ) : (
                      <span className="text-rose-700">حساب معلق مؤقتاً 🚫</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: QUICK ACTIONS */}
          {activeTab === "actions" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {onEditClient && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEditClient(client);
                  }}
                  className="p-4 rounded-2xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/40 text-right transition-all group flex items-start gap-3"
                >
                  <div className="p-2 rounded-xl bg-slate-100 group-hover:bg-teal-100 text-teal-700">
                    <Edit className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">تعديل بيانات المنشأة الطبية</h4>
                    <p className="text-2xs text-slate-500">تعديل الاسم، العنوان، الهاتف أو نوع المنشأة.</p>
                  </div>
                </button>
              )}

              {onOpenAudit && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAudit(client.id);
                  }}
                  className="p-4 rounded-2xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/40 text-right transition-all group flex items-start gap-3"
                >
                  <div className="p-2 rounded-xl bg-slate-100 group-hover:bg-indigo-100 text-indigo-700">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">تدقيق وجرد مخزون الصيدلية</h4>
                    <p className="text-2xs text-slate-500">فتح استمارة الجرد الميداني ورادار النواقص الحرج.</p>
                  </div>
                </button>
              )}

              {isPending && onApproveClient && (
                <button
                  type="button"
                  onClick={() => {
                    onApproveClient(client);
                    setSuccessMsg("تم تأكيد واعتماد العميل بنجاح! ✅");
                  }}
                  className="p-4 rounded-2xl border border-emerald-300 bg-emerald-50 text-right transition-all hover:bg-emerald-100 flex items-start gap-3"
                >
                  <div className="p-2 rounded-xl bg-emerald-200 text-emerald-800">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-950">تأكيد واعتماد الحساب فوراً</h4>
                    <p className="text-2xs text-emerald-800">تفعيل صلاحيات إرسال الطلبيات والاستفادة من عروض البونص.</p>
                  </div>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-3xs text-slate-500">
            <span>ملف العميل الموحد — متزامن سحابياً ومحلياً</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl bg-teal-700 hover:bg-teal-800 text-white px-5 py-2 text-xs font-bold transition-colors shadow-sm cursor-pointer"
          >
            إغلاق الملف
          </button>
        </div>
      </div>
    </div>
  );
};
