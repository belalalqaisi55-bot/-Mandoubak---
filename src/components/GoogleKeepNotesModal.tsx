import React, { useState, useEffect } from "react";
import { 
  X, Plus, Search, Pin, PinOff, Tag, CheckSquare, Square, Palette, 
  Trash2, Archive, Share2, Sparkles, RefreshCw, CheckCircle2, FileText, Bookmark,
  Building, User as UserIcon, Phone, ExternalLink, Filter, ChevronDown
} from "lucide-react";
import { User, KeepNote } from "../types";
import { 
  fetchKeepNotes, 
  saveKeepNotes, 
  deleteKeepNote, 
  subscribeKeepNotes 
} from "../services/keepNotesService";

interface GoogleKeepNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  clients?: User[];
  initialClientId?: string | null;
  onViewClientProfile?: (client: User) => void;
}

const NOTE_COLORS = [
  { id: "yellow", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-900", header: "bg-amber-100/60" },
  { id: "green", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-900", header: "bg-emerald-100/60" },
  { id: "blue", bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-900", header: "bg-sky-100/60" },
  { id: "pink", bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-900", header: "bg-rose-100/60" },
  { id: "purple", bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-900", header: "bg-purple-100/60" },
  { id: "slate", bg: "bg-white", border: "border-slate-200", text: "text-slate-900", header: "bg-slate-100/60" },
];

const PRESET_TAGS = [
  "أدوية 💊",
  "طلبية 📦",
  "متابعة 🩺",
  "شكوى ⚠️",
  "عينة 🎁",
  "عاجل ⚡",
  "دفعات 💰",
];

export const GoogleKeepNotesModal: React.FC<GoogleKeepNotesModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  clients = [],
  initialClientId = null,
  onViewClientProfile,
}) => {
  const [notes, setNotes] = useState<KeepNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [filterClientId, setFilterClientId] = useState<string | null>(initialClientId || null);

  // New note form state
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newColor, setNewColor] = useState("yellow");
  const [newLabelInput, setNewLabelInput] = useState("");
  const [newLabels, setNewLabels] = useState<string[]>([]);
  const [isCreatingChecklist, setIsCreatingChecklist] = useState(false);
  const [checklistItems, setChecklistItems] = useState<{ id: string; text: string; completed: boolean }[]>([]);
  const [newItemText, setNewItemText] = useState("");
  const [selectedClientForNewNote, setSelectedClientForNewNote] = useState<string>(initialClientId || "");

  const [successMsg, setSuccessMsg] = useState("");

  const loadNotes = async () => {
    setLoading(true);
    try {
      const data = await fetchKeepNotes();
      setNotes(data);
    } catch (e) {
      console.warn("Error loading notes:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadNotes();
      if (initialClientId) {
        setFilterClientId(initialClientId);
        setSelectedClientForNewNote(initialClientId);
      }
    }
  }, [isOpen, initialClientId]);

  // Subscribe to changes from other components (like ClientProfileModal)
  useEffect(() => {
    const unsubscribe = subscribeKeepNotes((updated) => {
      setNotes(updated);
    });
    return () => unsubscribe();
  }, []);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() && !newContent.trim() && checklistItems.length === 0) return;

    const matchedClient = clients.find((c) => c.id === selectedClientForNewNote);

    const newNote: KeepNote = {
      id: `keep-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      title: newTitle.trim() || (matchedClient ? `ملاحظة لـ ${matchedClient.entityName}` : "ملاحظة جديدة"),
      content: newContent.trim(),
      color: newColor,
      isPinned: false,
      isArchived: false,
      labels: newLabels,
      checklist: isCreatingChecklist ? checklistItems : undefined,
      clientId: matchedClient?.id,
      clientName: matchedClient?.name,
      clientEntityName: matchedClient?.entityName,
      updatedAt: new Date().toISOString(),
    };

    const updated = [newNote, ...notes];
    setNotes(updated);
    await saveKeepNotes(updated);

    // Reset form
    setNewTitle("");
    setNewContent("");
    setNewLabels([]);
    setChecklistItems([]);
    setIsCreatingChecklist(false);
    if (!initialClientId) {
      setSelectedClientForNewNote("");
    }
    setSuccessMsg(matchedClient ? `تم حفظ الملاحظة وربطها بملف (${matchedClient.entityName}) بنجاح 📋` : "تمت إضافة الملاحظة بنجاح 📝");
    setTimeout(() => setSuccessMsg(""), 3500);
  };

  const togglePin = async (id: string) => {
    const updated = notes.map((n) => (n.id === id ? { ...n, isPinned: !n.isPinned } : n));
    setNotes(updated);
    await saveKeepNotes(updated);
  };

  const toggleArchive = async (id: string) => {
    const updated = notes.map((n) => (n.id === id ? { ...n, isArchived: !n.isArchived } : n));
    setNotes(updated);
    await saveKeepNotes(updated);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه الملاحظة نهائياً؟")) return;
    const updated = await deleteKeepNote(id);
    setNotes(updated);
  };

  const toggleChecklistItem = async (noteId: string, itemId: string) => {
    const updated = notes.map((n) => {
      if (n.id === noteId && n.checklist) {
        const newChecklist = n.checklist.map((item) =>
          item.id === itemId ? { ...item, completed: !item.completed } : item
        );
        return { ...n, checklist: newChecklist, updatedAt: new Date().toISOString() };
      }
      return n;
    });
    setNotes(updated);
    await saveKeepNotes(updated);
  };

  // Change or assign a client to an existing note
  const handleChangeNoteClient = async (noteId: string, newClientId: string) => {
    const matchedClient = clients.find((c) => c.id === newClientId);
    const updated = notes.map((n) => {
      if (n.id === noteId) {
        return {
          ...n,
          clientId: matchedClient?.id || undefined,
          clientName: matchedClient?.name || undefined,
          clientEntityName: matchedClient?.entityName || undefined,
          updatedAt: new Date().toISOString(),
        };
      }
      return n;
    });
    setNotes(updated);
    await saveKeepNotes(updated);
    setSuccessMsg(matchedClient ? `تم تحديث ربط الملاحظة بـ (${matchedClient.entityName}) ✅` : "تم إلغاء ربط الملاحظة بالعميل");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  // Extract all unique labels present in notes + preset tags
  const allLabels = Array.from(new Set([...PRESET_TAGS, ...notes.flatMap((n) => n.labels || [])]));

  const filteredNotes = notes.filter((n) => {
    const matchesSearch =
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.clientEntityName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.clientName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.labels || []).some(l => l.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesLabel = selectedLabel ? (n.labels || []).includes(selectedLabel) : true;
    
    const matchesClient = filterClientId ? n.clientId === filterClientId : true;

    return matchesSearch && matchesLabel && matchesClient && !n.isArchived;
  });

  const pinnedNotes = filteredNotes.filter((n) => n.isPinned);
  const otherNotes = filteredNotes.filter((n) => !n.isPinned);

  const selectedFilterClient = clients.find((c) => c.id === filterClientId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-5xl rounded-3xl bg-amber-50/40 shadow-2xl border border-amber-200 overflow-hidden flex flex-col h-[92vh]">
        {/* Google Keep Header */}
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 px-6 py-4 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-md shadow-inner">
              <Bookmark className="h-6 w-6 text-amber-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">Google Keep — مفكرة المندوب الطبي والعملاء</h2>
                <span className="px-2 py-0.5 rounded-full text-3xs font-extrabold bg-white/20 text-amber-100">
                  تصنيفات ووسوم طبية 🏷️
                </span>
              </div>
              <p className="text-xs text-amber-100">
                دوّن ملاحظاتك وطلبياتك مع تصنيفها بوسوم مخصصة وربطها بالعملاء
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-amber-100 hover:bg-white/20 transition-colors cursor-pointer"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white px-6 py-3 border-b border-amber-100 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-2xs">
          {/* Search box */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث في الملاحظات أو الوسوم أو اسم المنشأة..."
              className="w-full pl-4 pr-10 py-2 rounded-xl bg-slate-100 border border-transparent focus:border-amber-400 focus:bg-white text-xs font-bold text-slate-800 transition-all outline-hidden"
            />
          </div>

          {/* Client Filter Dropdown */}
          {clients.length > 0 && (
            <div className="flex items-center gap-1.5 shrink-0">
              <Building className="h-4 w-4 text-teal-700 shrink-0" />
              <select
                value={filterClientId || ""}
                onChange={(e) => setFilterClientId(e.target.value ? e.target.value : null)}
                className="py-1.5 px-3 rounded-xl border border-teal-200 bg-teal-50/70 text-xs font-bold text-teal-900 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer max-w-[220px]"
              >
                <option value="">🏢 كل العملاء ({notes.filter((n) => !n.isArchived).length})</option>
                {clients.map((c) => {
                  const count = notes.filter((n) => n.clientId === c.id && !n.isArchived).length;
                  return (
                    <option key={`flt-cli-${c.id}`} value={c.id}>
                      {c.role === "doctor" ? "🩺" : "🏥"} {c.entityName} ({count})
                    </option>
                  );
                })}
              </select>
              {filterClientId && (
                <button
                  onClick={() => setFilterClientId(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="إلغاء تصفية العميل"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Labels Horizontal Filter with Counts */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <button
              onClick={() => setSelectedLabel(null)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                selectedLabel === null
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <span>جميع الوسوم</span>
              <span className="text-3xs px-1.5 py-0.2 rounded-full bg-black/10">
                {notes.filter(n => !n.isArchived).length}
              </span>
            </button>
            {allLabels.map((lbl) => {
              const count = notes.filter((n) => !n.isArchived && (n.labels || []).includes(lbl)).length;
              return (
                <button
                  key={lbl}
                  onClick={() => setSelectedLabel(lbl)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    selectedLabel === lbl
                      ? "bg-amber-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <Tag className="h-3 w-3 opacity-75" />
                  <span>{lbl}</span>
                  {count > 0 && (
                    <span className={`text-3xs px-1.5 py-0.2 rounded-full ${selectedLabel === lbl ? "bg-white/20 text-white" : "bg-amber-100 text-amber-900 font-black"}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Client Filter Notice */}
        {selectedFilterClient && (
          <div className="bg-teal-50 px-6 py-2 border-b border-teal-200 flex items-center justify-between text-xs text-teal-900 font-bold shrink-0">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-teal-700" />
              <span>ملاحظات مخصصة للمنشأة: {selectedFilterClient.entityName} ({selectedFilterClient.name})</span>
            </div>
            {onViewClientProfile && (
              <button
                type="button"
                onClick={() => onViewClientProfile(selectedFilterClient)}
                className="text-xs text-teal-700 hover:text-teal-900 underline flex items-center gap-1 cursor-pointer"
              >
                <span>فتح ملف العميل الكامل</span>
                <ExternalLink className="h-3 w-3" />
              </button>
            )}
          </div>
        )}

        {/* Success Feedback banner */}
        {successMsg && (
          <div className="bg-emerald-600 text-white px-6 py-2 text-xs font-bold flex items-center gap-2 shadow-inner shrink-0">
            <CheckCircle2 className="h-4 w-4" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* New Note Form Creator */}
          <form onSubmit={handleAddNote} className="bg-white rounded-2xl border border-amber-200 p-4 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="عنوان الملاحظة أو الطلبية..."
                className="text-xs font-black text-slate-800 placeholder:text-slate-400 bg-transparent border-none outline-hidden flex-1 min-w-[200px]"
              />

              {/* Select Client for this Note */}
              {clients.length > 0 && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <Building className="h-3.5 w-3.5 text-teal-700" />
                  <select
                    value={selectedClientForNewNote}
                    onChange={(e) => setSelectedClientForNewNote(e.target.value)}
                    className="py-1 px-2 rounded-lg border border-slate-200 bg-slate-50 text-3xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                  >
                    <option value="">-- ربط بملف عميل (اختياري) --</option>
                    {clients.map((c) => (
                      <option key={`new-note-cli-${c.id}`} value={c.id}>
                        {c.role === "doctor" ? "🩺" : "🏥"} {c.entityName} ({c.name})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Note Content / Checklist */}
            {isCreatingChecklist ? (
              <div className="space-y-2 py-1">
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
                      {item.completed ? (
                        <CheckSquare className="h-4 w-4 text-amber-600" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-400" />
                      )}
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
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="خذ ملاحظة أو دوّن تفاصيل الطلبية الدوائية والزيارة..."
                rows={2}
                className="w-full text-xs text-slate-700 placeholder:text-slate-400 border-none outline-hidden resize-none"
              />
            )}

            {/* Quick Preset Tags Bar */}
            <div className="flex items-center gap-1 overflow-x-auto py-1">
              <span className="text-3xs font-bold text-slate-400 shrink-0">وسوم سريعة:</span>
              {PRESET_TAGS.map((tag) => {
                const isSelected = newLabels.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setNewLabels(newLabels.filter(t => t !== tag));
                      } else {
                        setNewLabels([...newLabels, tag]);
                      }
                    }}
                    className={`px-2 py-0.5 rounded-md text-3xs font-bold transition-all cursor-pointer shrink-0 ${
                      isSelected 
                        ? "bg-amber-600 text-white shadow-2xs" 
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-black/5"
                    }`}
                  >
                    {tag} {isSelected ? "✓" : "+"}
                  </button>
                );
              })}
            </div>

            {/* Formatting & Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                {/* Color Palette Selector */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  {NOTE_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setNewColor(c.id)}
                      className={`h-5 w-5 rounded-full ${c.bg} border-2 ${
                        newColor === c.id ? "border-amber-700 scale-110" : "border-transparent"
                      } transition-transform cursor-pointer`}
                      title={c.id}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setIsCreatingChecklist(!isCreatingChecklist)}
                  className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                    isCreatingChecklist ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                  title="قائمة مهام"
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
                      if (!newLabels.includes(newLabelInput.trim())) {
                        setNewLabels([...newLabels, newLabelInput.trim()]);
                      }
                      setNewLabelInput("");
                    }
                  }}
                  placeholder="وسم مخصص + Enter"
                  className="px-2.5 py-1 rounded-lg bg-slate-100 text-3xs font-bold text-slate-700 outline-hidden w-28"
                />
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
                >
                  حفظ الملاحظة
                </button>
              </div>
            </div>

            {/* Labels preview */}
            {newLabels.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {newLabels.map((l) => (
                  <span key={l} className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-3xs font-bold flex items-center gap-1">
                    {l}
                    <button type="button" onClick={() => setNewLabels(newLabels.filter((x) => x !== l))}>×</button>
                  </span>
                ))}
              </div>
            )}
          </form>

          {/* Notes Grid */}
          {loading ? (
            <div className="py-12 text-center text-slate-500 font-bold text-xs">جاري تحميل الملاحظات...</div>
          ) : filteredNotes.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <Bookmark className="h-12 w-12 text-amber-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">لا توجد ملاحظات مطابقة للبحث أو الوسم أو العميل المختار</p>
              <p className="text-xs text-slate-400">ابدأ بتدوين أول ملاحظة طبية وإضافة وسوم التصنيف إليها.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Pinned Notes */}
              {pinnedNotes.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Pin className="h-3.5 w-3.5" />
                    <span>الملاحظات المثبتة</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {pinnedNotes.map((note) => renderNoteCard(note))}
                  </div>
                </div>
              )}

              {/* Other Notes */}
              {otherNotes.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-slate-600 uppercase tracking-wider">
                    الملاحظات الأخرى
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {otherNotes.map((note) => renderNoteCard(note))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-amber-200 bg-white px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-3xs text-slate-500">
            <span>مندوبك الطبي — مفكرة Google Keep المرتبطة بقاعدة بيانات العملاء</span>
            <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">
              إجمالي الملاحظات: {notes.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white px-5 py-2 text-xs font-bold transition-colors shadow-sm cursor-pointer"
          >
            إغلاق المفكرة
          </button>
        </div>
      </div>
    </div>
  );

  function renderNoteCard(note: KeepNote) {
    const colorObj = NOTE_COLORS.find((c) => c.id === note.color) || NOTE_COLORS[0];
    const linkedClient = clients.find((c) => c.id === note.clientId);

    return (
      <div
        key={note.id}
        className={`rounded-2xl border ${colorObj.border} ${colorObj.bg} p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative group`}
      >
        <div>
          {/* Card Header & Pin */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className={`text-sm font-black ${colorObj.text} leading-snug flex-1`}>{note.title}</h4>
            <button
              onClick={() => togglePin(note.id)}
              className={`cursor-pointer transition-transform hover:scale-110 ${
                note.isPinned ? "text-amber-600 fill-amber-500" : "text-slate-400 opacity-40 group-hover:opacity-100"
              }`}
              title={note.isPinned ? "إلغاء التثبيت" : "تثبيت الملاحظة"}
            >
              <Pin className={`h-4 w-4 ${note.isPinned ? "fill-amber-500 text-amber-600" : ""}`} />
            </button>
          </div>

          {/* Linked Client Badge */}
          {note.clientEntityName ? (
            <div className="mb-2 flex items-center justify-between gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  if (linkedClient && onViewClientProfile) {
                    onViewClientProfile(linkedClient);
                  } else if (note.clientId) {
                    setFilterClientId(note.clientId);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-teal-100/90 hover:bg-teal-200 text-teal-900 border border-teal-300/80 text-3xs font-extrabold transition-all cursor-pointer shadow-2xs"
                title="عرض ملف هذا العميل وملاحظاته"
              >
                <Building className="h-3 w-3 text-teal-700 shrink-0" />
                <span className="truncate max-w-[160px]">{note.clientEntityName}</span>
                {note.clientName && <span className="opacity-75 font-medium">({note.clientName})</span>}
                <ExternalLink className="h-2.5 w-2.5 opacity-60" />
              </button>
            </div>
          ) : (
            clients.length > 0 && (
              <div className="mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleChangeNoteClient(note.id, e.target.value);
                    }
                  }}
                  className="text-4xs font-bold text-slate-500 bg-white/60 border border-black/10 rounded px-1.5 py-0.5 outline-none cursor-pointer"
                >
                  <option value="">+ ربط بملف عميل...</option>
                  {clients.map((c) => (
                    <option key={`bind-${note.id}-${c.id}`} value={c.id}>
                      {c.entityName} ({c.name})
                    </option>
                  ))}
                </select>
              </div>
            )
          )}

          {/* Note Text Content */}
          {note.content && (
            <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed mb-3">
              {note.content}
            </p>
          )}

          {/* Checklist */}
          {note.checklist && note.checklist.length > 0 && (
            <div className="space-y-1.5 my-2">
              {note.checklist.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleChecklistItem(note.id, item.id)}
                  className="w-full flex items-center gap-2 text-xs text-left cursor-pointer hover:bg-black/5 p-1 rounded-lg transition-colors"
                >
                  {item.completed ? (
                    <CheckSquare className="h-4 w-4 text-amber-700 shrink-0" />
                  ) : (
                    <Square className="h-4 w-4 text-slate-500 shrink-0" />
                  )}
                  <span className={`truncate ${item.completed ? "line-through text-slate-400" : "text-slate-800 font-bold"}`}>
                    {item.text}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Labels */}
          {note.labels && note.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {note.labels.map((l) => (
                <span
                  key={l}
                  onClick={() => setSelectedLabel(l)}
                  className="px-2 py-0.5 rounded-md bg-white/80 text-slate-700 text-3xs font-bold border border-black/5 hover:bg-amber-100 hover:text-amber-900 cursor-pointer transition-colors"
                >
                  {l}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Card Footer Actions */}
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-black/5 opacity-80 group-hover:opacity-100 transition-opacity">
          <span className="text-3xs text-slate-500">
            {new Date(note.updatedAt).toLocaleDateString("ar-SA")}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => toggleArchive(note.id)}
              className="p-1 rounded-lg hover:bg-black/10 text-slate-600 transition-colors"
              title="أرشفة"
            >
              <Archive className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => handleDelete(note.id)}
              className="p-1 rounded-lg hover:bg-rose-100 text-rose-600 transition-colors"
              title="حذف الملاحظة"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }
};
