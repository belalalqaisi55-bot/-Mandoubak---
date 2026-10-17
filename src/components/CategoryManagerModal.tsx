import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Check,
  RotateCcw,
  Tags,
  AlertCircle,
  PackageCheck,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Palette,
} from "lucide-react";
import { Product } from "../types";
import { getCategoryColor, CATEGORY_PALETTE, DEFAULT_CATEGORY_COLORS } from "../data/predefinedCategories";

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  categoryColors?: Record<string, string>;
  onAddCategory: (categoryName: string, color?: string) => boolean | void;
  onRenameCategory: (oldName: string, newName: string) => boolean | void;
  onDeleteCategory: (categoryName: string) => boolean | void;
  onUpdateCategoryColor?: (categoryName: string, color: string) => void;
  onResetToDefaults: () => void;
  products: Product[];
  onSelectCategory?: (categoryName: string) => void;
  onReorderCategories?: (newCategories: string[]) => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  categoryColors = {},
  onAddCategory,
  onRenameCategory,
  onDeleteCategory,
  onUpdateCategoryColor,
  onResetToDefaults,
  products,
  onSelectCategory,
  onReorderCategories,
}) => {
  const [newCatInput, setNewCatInput] = useState("");
  const [newCatColor, setNewCatColor] = useState("#0d9488");
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [activeColorPickerCat, setActiveColorPickerCat] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const showTempFeedback = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(null);
    }, 3000);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatInput.trim();
    if (!trimmed) {
      showTempFeedback("error", "يرجى كتابة اسم التصنيف أولاً");
      return;
    }
    if (categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      showTempFeedback("error", `التصنيف "${trimmed}" موجود مسبقاً في القائمة`);
      return;
    }

    onAddCategory(trimmed, newCatColor);
    setNewCatInput("");
    setNewCatColor("#0d9488");
    showTempFeedback("success", `تمت إضافة تصنيف "${trimmed}" وتعيين لونه بنجاح ✨`);
  };

  const startEditing = (cat: string) => {
    setEditingCat(cat);
    setEditValue(cat);
  };

  const handleSaveRename = (oldName: string) => {
    const trimmed = editValue.trim();
    if (!trimmed) {
      showTempFeedback("error", "لا يمكن أن يكون اسم التصنيف فارغاً");
      return;
    }
    if (trimmed !== oldName && categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      showTempFeedback("error", `يوجد تصنيف آخر بنفس الاسم "${trimmed}"`);
      return;
    }

    onRenameCategory(oldName, trimmed);
    setEditingCat(null);
    showTempFeedback("success", `تم تحديث التصنيف إلى "${trimmed}" وتعديل كافة الأصناف المرتبطة`);
  };

  const handleDelete = (cat: string) => {
    const count = products.filter((p) => p.category === cat).length;
    if (cat === "عام") {
      showTempFeedback("error", "لا يمكن حذف التصنيف الافتراضي (عام)");
      return;
    }
    if (count > 0) {
      const confirmMsg = window.confirm(
        `تنبيه: يوجد (${count}) صنف مرتبط بتصنيف "${cat}".\nعند الحذف، سيتم تحويل هذه الأصناف تلقائياً إلى تصنيف (عام).\nهل ترغب بالاستمرار في الحذف؟`
      );
      if (!confirmMsg) return;
    }

    onDeleteCategory(cat);
    showTempFeedback("success", `تم حذف تصنيف "${cat}"`);
  };

  const handleColorChange = (cat: string, color: string) => {
    if (onUpdateCategoryColor) {
      onUpdateCategoryColor(cat, color);
      showTempFeedback("success", `تم تحديث لون تصنيف "${cat}" إلى ${color} 🎨`);
    }
  };

  // Count products per category
  const productCountMap = products.reduce((acc, p) => {
    const cat = p.category || "عام";
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    const updated = [...categories];
    const [movedItem] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, movedItem);
    setDraggedIndex(null);
    if (onReorderCategories) {
      onReorderCategories(updated);
      showTempFeedback("success", "تم إعادة ترتيب الفئات بالسحب والإفلات بنجاح 🔄");
    }
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;
    const updated = [...categories];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    if (onReorderCategories) {
      onReorderCategories(updated);
      showTempFeedback("success", "تم إعادة ترتيب الفئات بنجاح 🔄");
    }
  };

  const handleAutoSortByUsage = () => {
    const updated = [...categories].sort((a, b) => {
      if (a === "عام") return -1;
      if (b === "عام") return 1;
      const countA = productCountMap[a] || 0;
      const countB = productCountMap[b] || 0;
      return countB - countA;
    });
    if (onReorderCategories) {
      onReorderCategories(updated);
      showTempFeedback("success", "تم ترتيب الفئات الأكثر استخداماً في الأعلى تلقائياً ✨");
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
          id="category-manager-modal"
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-linear-to-r from-teal-800 to-teal-900 px-5 py-3.5 text-white">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-teal-700/60 border border-teal-600 text-teal-100">
                <Tags className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black">إدارة تصنيفات الأصناف وألوانها الدوائية</h3>
                <p className="text-3xs sm:text-2xs text-teal-200">
                  إضافة وتعديل الفئات وتعيين ألوان مخصصة لكل فئة لتظهر في القوائم المنسدلة
                </p>
              </div>
            </div>
            <button
              id="close-category-manager-btn"
              onClick={onClose}
              className="rounded-full p-1.5 text-teal-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Feedback banner */}
          {feedback && (
            <div
              className={`px-4 py-2 text-xs font-bold flex items-center gap-2 border-b ${
                feedback.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-rose-50 text-rose-800 border-rose-200"
              }`}
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Body */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
            {/* Add New Category Form */}
            <form onSubmit={handleAdd} className="space-y-2 rounded-xl bg-slate-50 p-3 border border-slate-200">
              <label className="block text-xs font-bold text-slate-700">
                إضافة تصنيف دوائي جديد مع تخصيص لونه:
              </label>
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                {/* Color Selector for new category */}
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2 py-1.5 shrink-0 shadow-3xs" title="اختر لون الفئة الجديدة">
                  <span className="text-3xs font-bold text-slate-500">اللون:</span>
                  <input
                    type="color"
                    id="new-category-color-picker"
                    value={newCatColor}
                    onChange={(e) => setNewCatColor(e.target.value)}
                    className="w-6 h-6 rounded-md cursor-pointer border-0 p-0 bg-transparent"
                    title="انقر لاختيار لون"
                  />
                  <div
                    className="w-3.5 h-3.5 rounded-full border border-slate-300 shadow-2xs"
                    style={{ backgroundColor: newCatColor }}
                  />
                </div>

                <input
                  id="new-category-input"
                  type="text"
                  placeholder="مثال: أدوية العيون والقطرات، مكملات كبار السن..."
                  value={newCatInput}
                  onChange={(e) => setNewCatInput(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:outline-none transition-all min-w-[160px]"
                />
                <button
                  id="submit-add-category-btn"
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white px-4 py-2 text-xs font-bold shadow-xs transition-all shrink-0 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>إضافة</span>
                </button>
              </div>

              {/* Quick Color Swatches */}
              <div className="flex items-center gap-1 pt-1.5 overflow-x-auto pb-0.5">
                <span className="text-3xs text-slate-400 shrink-0 font-medium ml-1">ألوان سريعة:</span>
                {CATEGORY_PALETTE.slice(0, 10).map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewCatColor(color)}
                    className={`w-4 h-4 rounded-full transition-transform shrink-0 cursor-pointer border ${
                      newCatColor === color ? "scale-125 border-slate-900 ring-2 ring-teal-400" : "border-white hover:scale-110"
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </form>

            {/* Existing Categories List */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 flex-wrap gap-2">
                <div className="flex items-center gap-1.5">
                  <span>التصنيفات وألوانها المعتمدة (اسحب لترتيب القائمة ↕️)</span>
                  <span className="rounded-full bg-teal-100 text-teal-800 px-2 py-0.5 text-3xs font-black">
                    {categories.length}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAutoSortByUsage}
                    className="inline-flex items-center gap-1 text-3xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    title="ترتيب الفئات الأكثر استخداماً في الأعلى تلقائياً"
                  >
                    <span>🔄 الأكثر استخداماً</span>
                  </button>

                  <button
                    type="button"
                    onClick={onResetToDefaults}
                    className="inline-flex items-center gap-1 text-3xs font-bold text-slate-500 hover:text-teal-700 transition-colors cursor-pointer"
                    title="استعادة القائمة الدوائية المعيارية والألوان الافتراضية"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>استعادة الافتراضيات</span>
                  </button>
                </div>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white max-h-[340px] overflow-y-auto shadow-2xs">
                {categories.map((cat, index) => {
                  const isEditing = editingCat === cat;
                  const count = productCountMap[cat] || 0;
                  const catColor = getCategoryColor(cat, categoryColors);
                  const isColorPaletteOpen = activeColorPickerCat === cat;

                  return (
                    <div
                      key={cat}
                      draggable={!isEditing}
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, index)}
                      className={`p-2.5 sm:p-3 hover:bg-slate-50 transition-colors space-y-2 ${
                        draggedIndex === index ? "opacity-50 bg-teal-50" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        {isEditing ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="flex-1 rounded-lg border border-teal-500 bg-white px-2.5 py-1 text-xs text-slate-800 focus:outline-none"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveRename(cat);
                                if (e.key === "Escape") setEditingCat(null);
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveRename(cat)}
                              className="p-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition-colors cursor-pointer"
                              title="حفظ"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCat(null)}
                              className="p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors cursor-pointer"
                              title="إلغاء"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span
                                className="text-slate-400 hover:text-slate-700 cursor-grab shrink-0"
                                title="اسحب لإعادة الترتيب"
                              >
                                <GripVertical className="h-4 w-4" />
                              </span>

                              {/* Category Color Dot and Picker Button */}
                              <div className="relative shrink-0 flex items-center gap-1">
                                <label
                                  className="w-5 h-5 rounded-full border border-slate-300 cursor-pointer shadow-3xs flex items-center justify-center transition-transform hover:scale-110"
                                  style={{ backgroundColor: catColor }}
                                  title="انقر لتغيير لون هذا التصنيف"
                                >
                                  <input
                                    type="color"
                                    value={catColor}
                                    onChange={(e) => handleColorChange(cat, e.target.value)}
                                    className="sr-only"
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setActiveColorPickerCat(isColorPaletteOpen ? null : cat)
                                  }
                                  className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                                  title="باليت الألوان السريعة"
                                >
                                  <Palette className="h-3 w-3" />
                                </button>
                              </div>

                              {/* Category Name & Count */}
                              <span
                                className="text-xs font-black truncate flex items-center gap-1.5"
                                style={{ color: catColor }}
                              >
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: catColor }}
                                />
                                {cat}
                              </span>

                              {count > 0 ? (
                                <span
                                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-3xs font-bold shrink-0 border"
                                  style={{
                                    backgroundColor: `${catColor}15`,
                                    borderColor: `${catColor}40`,
                                    color: catColor,
                                  }}
                                >
                                  <PackageCheck className="h-3 w-3" />
                                  <span>{count} صنف</span>
                                </span>
                              ) : (
                                <span className="text-3xs text-slate-400 shrink-0">0 أصناف</span>
                              )}
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {/* Move Up / Down Buttons */}
                              <div className="flex flex-col gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleMove(index, "up")}
                                  disabled={index === 0}
                                  className="p-0.5 rounded text-slate-400 hover:text-teal-700 hover:bg-slate-100 disabled:opacity-30 transition-colors cursor-pointer"
                                  title="تحريك لأعلى"
                                >
                                  <ChevronUp className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMove(index, "down")}
                                  disabled={index === categories.length - 1}
                                  className="p-0.5 rounded text-slate-400 hover:text-teal-700 hover:bg-slate-100 disabled:opacity-30 transition-colors cursor-pointer"
                                  title="تحريك لأسفل"
                                >
                                  <ChevronDown className="h-3 w-3" />
                                </button>
                              </div>

                              {onSelectCategory && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onSelectCategory(cat);
                                    onClose();
                                  }}
                                  className="rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-teal-700 border border-slate-200 px-2 py-1 text-3xs font-bold text-slate-700 transition-colors cursor-pointer"
                                  title="اختيار هذا التصنيف للنموذج"
                                >
                                  اختيار
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => startEditing(cat)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-teal-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                title="تعديل اسم التصنيف"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>

                              {cat !== "عام" && (
                                <button
                                  type="button"
                                  onClick={() => handleDelete(cat)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="حذف التصنيف"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Expandable Quick Color Palette for this category */}
                      {isColorPaletteOpen && (
                        <div className="flex items-center gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl flex-wrap">
                          <span className="text-3xs font-bold text-slate-500 ml-1">اختر لوناً سريعاً:</span>
                          {CATEGORY_PALETTE.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => {
                                handleColorChange(cat, c);
                                setActiveColorPickerCat(null);
                              }}
                              className={`w-5 h-5 rounded-full transition-transform border ${
                                catColor === c ? "scale-125 border-slate-900 ring-2 ring-teal-400" : "border-white hover:scale-115"
                              }`}
                              style={{ backgroundColor: c }}
                              title={c}
                            />
                          ))}
                          <label className="text-3xs font-bold text-teal-700 bg-white border border-teal-200 rounded-lg px-2 py-0.5 cursor-pointer hover:bg-teal-50 flex items-center gap-1 mr-auto">
                            <span>مخصص</span>
                            <input
                              type="color"
                              value={catColor}
                              onChange={(e) => handleColorChange(cat, e.target.value)}
                              className="w-4 h-4 cursor-pointer border-0 p-0 bg-transparent"
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 flex items-center justify-between">
            <span className="text-3xs text-slate-500">
              يتم حفظ التعديلات والألوان وتعميمها تلقائياً على كل القوائم المنسدلة
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white px-5 py-1.5 text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              تم
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
