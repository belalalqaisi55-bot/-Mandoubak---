import React, { useState, useMemo } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Trash2,
  Edit2,
  Check,
  X,
  Building2,
  Stethoscope,
  Phone,
  UserCheck,
  Search,
  ArrowRight,
  Sparkles,
  HelpCircle,
  FileSpreadsheet
} from "lucide-react";
import { User } from "../types";

export interface ParsedClientRow {
  id: string;
  originalIndex: number;
  name: string;
  phone: string;
  entityName: string;
  location: string;
  role: "pharmacy" | "doctor";
  isValid: boolean;
  isDuplicate: boolean;
  errors: string[];
  warnings: string[];
}

interface ExcelDataPreviewProps {
  rawText: string;
  registeredUsers: User[];
  onConfirmImport: (validClients: Array<{
    name: string;
    phone: string;
    entityName: string;
    location: string;
    role: "pharmacy" | "doctor";
  }>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ExcelDataPreview: React.FC<ExcelDataPreviewProps> = ({
  rawText,
  registeredUsers,
  onConfirmImport,
  onCancel,
  isLoading = false,
}) => {
  // Existing registered phone set for fast duplicate detection
  const existingPhones = useMemo(() => {
    const set = new Set<string>();
    registeredUsers.forEach((u) => {
      const clean = u.phone.replace(/[^\d]/g, "");
      if (clean) set.add(clean);
    });
    return set;
  }, [registeredUsers]);

  // Initial parsing of text
  const initialRows = useMemo(() => {
    const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const parsed: ParsedClientRow[] = [];

    // Check if the first line is a header row
    const firstLine = lines[0] || "";
    const isHeaderLine =
      firstLine.includes("اسم") ||
      firstLine.includes("هاتف") ||
      firstLine.includes("صيدلية") ||
      firstLine.includes("جوال") ||
      firstLine.includes("العنوان") ||
      firstLine.toLowerCase().includes("phone") ||
      firstLine.toLowerCase().includes("name");

    const dataLines = isHeaderLine ? lines.slice(1) : lines;

    dataLines.forEach((line, idx) => {
      let cols = line.split("\t");
      if (cols.length <= 1) cols = line.split(",");
      if (cols.length <= 1) cols = line.split(";");
      cols = cols.map((c) => c.replace(/^["']|["']$/g, "").trim());

      const name = cols[0] || "";
      let phone = cols[1] || "";
      const entityName = cols[2] || name || "";
      const location = cols[3] || "";
      const rawRole = cols[4] || "";

      let role: "pharmacy" | "doctor" = "pharmacy";
      if (
        rawRole.includes("طبيب") ||
        rawRole.includes("دكتور") ||
        rawRole.toLowerCase().includes("doc") ||
        name.startsWith("د.") ||
        name.startsWith("دكتور")
      ) {
        role = "doctor";
      }

      // Clean phone
      const cleanPhoneDigits = phone.replace(/[^\d+]/g, "");
      const digitsOnly = cleanPhoneDigits.replace(/[^\d]/g, "");

      const errors: string[] = [];
      const warnings: string[] = [];

      if (!name.trim()) {
        errors.push("اسم المسؤول مفقود");
      }

      if (!phone.trim()) {
        errors.push("رقم الهاتف مفقود");
      } else if (digitsOnly.length < 7) {
        errors.push("رقم الهاتف قصير جداً وغير صالح");
      }

      const isDuplicate = existingPhones.has(digitsOnly);
      if (isDuplicate) {
        warnings.push("مسجل مسبقاً في النظام (سيتم تحديث بياناته أو تخطيه)");
      }

      parsed.push({
        id: `row_${idx}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        originalIndex: idx + 1,
        name,
        phone: cleanPhoneDigits || phone,
        entityName,
        location,
        role,
        isValid: errors.length === 0,
        isDuplicate,
        errors,
        warnings,
      });
    });

    return parsed;
  }, [rawText, existingPhones]);

  const [rows, setRows] = useState<ParsedClientRow[]>(initialRows);
  const [filterMode, setFilterMode] = useState<"all" | "valid" | "invalid" | "duplicate">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<ParsedClientRow>>({});

  // Recalculate row validity whenever row is modified
  const validateRow = (r: Partial<ParsedClientRow>): { isValid: boolean; errors: string[]; warnings: string[]; isDuplicate: boolean } => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const name = (r.name || "").trim();
    const phone = (r.phone || "").trim();
    const digitsOnly = phone.replace(/[^\d]/g, "");

    if (!name) errors.push("اسم المسؤول مفقود");
    if (!phone) {
      errors.push("رقم الهاتف مفقود");
    } else if (digitsOnly.length < 7) {
      errors.push("رقم الهاتف قصير جداً وغير صالح");
    }

    const isDuplicate = existingPhones.has(digitsOnly);
    if (isDuplicate) {
      warnings.push("مسجل مسبقاً في النظام");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      isDuplicate,
    };
  };

  const handleStartEdit = (row: ParsedClientRow) => {
    setEditingRowId(row.id);
    setEditFormData({ ...row });
  };

  const handleSaveEdit = (rowId: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const updated = { ...r, ...editFormData };
        const validation = validateRow(updated);
        return {
          ...updated,
          isValid: validation.isValid,
          isDuplicate: validation.isDuplicate,
          errors: validation.errors,
          warnings: validation.warnings,
        };
      })
    );
    setEditingRowId(null);
  };

  const handleDeleteRow = (rowId: string) => {
    setRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  const handleToggleRole = (rowId: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const newRole = r.role === "pharmacy" ? "doctor" : "pharmacy";
        return { ...r, role: newRole };
      })
    );
  };

  // Stats
  const totalCount = rows.length;
  const validCount = rows.filter((r) => r.isValid && !r.isDuplicate).length;
  const duplicateCount = rows.filter((r) => r.isValid && r.isDuplicate).length;
  const invalidCount = rows.filter((r) => !r.isValid).length;

  // Filtered rows
  const displayedRows = useMemo(() => {
    return rows.filter((r) => {
      if (filterMode === "valid" && (!r.isValid || r.isDuplicate)) return false;
      if (filterMode === "duplicate" && !r.isDuplicate) return false;
      if (filterMode === "invalid" && r.isValid) return false;

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = r.name.toLowerCase().includes(query);
        const matchesPhone = r.phone.includes(query);
        const matchesEntity = r.entityName.toLowerCase().includes(query);
        const matchesLocation = r.location.toLowerCase().includes(query);
        return matchesName || matchesPhone || matchesEntity || matchesLocation;
      }
      return true;
    });
  }, [rows, filterMode, searchTerm]);

  const handleConfirm = () => {
    const validClients = rows
      .filter((r) => r.isValid)
      .map((r) => ({
        name: r.name.trim(),
        phone: r.phone.trim(),
        entityName: r.entityName.trim() || r.name.trim(),
        location: r.location.trim() || "تم الاستيراد من إكسل",
        role: r.role,
      }));

    onConfirmImport(validClients);
  };

  return (
    <div className="rounded-2xl border border-indigo-200 bg-white shadow-xl overflow-hidden text-right" dir="rtl" id="excel-preview-container">
      {/* Header */}
      <div className="border-b border-indigo-100 bg-linear-to-r from-indigo-900 to-indigo-800 p-4 sm:p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-700/60 border border-indigo-500 text-indigo-100">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black">معاينة ومراجعة بيانات الإكسل قبل الاستيراد</h3>
              <span className="rounded-full bg-indigo-500/40 border border-indigo-400/40 px-2.5 py-0.5 text-3xs font-bold">
                خطوة التحقق الذكي 🔍
              </span>
            </div>
            <p className="text-2xs text-indigo-200 mt-0.5">
              تحقق من صحة أسماء وأرقام وفئات العملاء وصحح أي خطأ بالنقر على الحقول قبل إضافتها
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 self-end sm:self-auto rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1.5 text-xs font-bold text-white transition-all cursor-pointer"
        >
          <ArrowRight className="h-4 w-4" />
          <span>تعديل النص المنسوخ</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setFilterMode("all")}
          className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
            filterMode === "all"
              ? "bg-white border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs"
              : "bg-white/70 border-slate-200 hover:bg-white"
          }`}
        >
          <span className="block text-3xs font-bold text-slate-500">إجمالي السجلات</span>
          <span className="text-lg font-black text-slate-900 font-mono">{totalCount}</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterMode("valid")}
          className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
            filterMode === "valid"
              ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs"
              : "bg-white/70 border-slate-200 hover:bg-white"
          }`}
        >
          <span className="block text-3xs font-bold text-emerald-700 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            جاهز ومكتمل
          </span>
          <span className="text-lg font-black text-emerald-700 font-mono">{validCount}</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterMode("duplicate")}
          className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
            filterMode === "duplicate"
              ? "bg-amber-50 border-amber-500 ring-2 ring-amber-500/20 shadow-xs"
              : "bg-white/70 border-slate-200 hover:bg-white"
          }`}
        >
          <span className="block text-3xs font-bold text-amber-700 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            مكرر في النظام
          </span>
          <span className="text-lg font-black text-amber-700 font-mono">{duplicateCount}</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterMode("invalid")}
          className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
            filterMode === "invalid"
              ? "bg-rose-50 border-rose-500 ring-2 ring-rose-500/20 shadow-xs"
              : "bg-white/70 border-slate-200 hover:bg-white"
          }`}
        >
          <span className="block text-3xs font-bold text-rose-700 flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            أخطاء تحتاج تصحيح
          </span>
          <span className="text-lg font-black text-rose-700 font-mono">{invalidCount}</span>
        </button>
      </div>

      {/* Toolbar: Search and Filter Info */}
      <div className="p-3 sm:px-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="relative w-full sm:w-72">
          <Search className="absolute right-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="بحث في السجلات المستخرجة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-1.5 pr-8 pl-3 text-xs focus:bg-white focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 text-3xs text-slate-500">
          <span className="font-bold">ملاحظة:</span>
          <span>يمكنك تصحيح أي حقل مباشرة أو النقر على الفئة للتبديل بين (طبيب / صيدلية)</span>
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
        <table className="w-full text-right text-xs">
          <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200 text-slate-700 text-3xs font-black uppercase">
            <tr>
              <th className="p-2.5 w-10 text-center">#</th>
              <th className="p-2.5">اسم المسؤول</th>
              <th className="p-2.5">رقم الهاتف</th>
              <th className="p-2.5">اسم الصيدلية / العيادة</th>
              <th className="p-2.5">العنوان / المنطقة</th>
              <th className="p-2.5 text-center">الفئة</th>
              <th className="p-2.5 text-center">الحالة</th>
              <th className="p-2.5 text-center w-20">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayedRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400 text-xs font-bold">
                  لا توجد سجلات تطابق الفلتر أو البحث الحالي
                </td>
              </tr>
            ) : (
              displayedRows.map((row, idx) => {
                const isEditing = editingRowId === row.id;

                return (
                  <tr
                    key={row.id}
                    className={`transition-colors ${
                      !row.isValid
                        ? "bg-rose-50/40 hover:bg-rose-50/70"
                        : row.isDuplicate
                        ? "bg-amber-50/30 hover:bg-amber-50/60"
                        : "hover:bg-slate-50/80"
                    }`}
                  >
                    {/* Index */}
                    <td className="p-2.5 text-center font-mono text-slate-400 text-3xs">
                      {idx + 1}
                    </td>

                    {/* Name */}
                    <td className="p-2.5">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFormData.name ?? ""}
                          onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                          className="w-full rounded-lg border border-indigo-400 bg-white p-1.5 text-xs text-slate-900"
                        />
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className={`font-bold ${!row.name.trim() ? "text-rose-600 italic font-normal" : "text-slate-900"}`}>
                            {row.name.trim() || "⚠ اسم المسؤول مفقود"}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Phone */}
                    <td className="p-2.5">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFormData.phone ?? ""}
                          onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                          className="w-full rounded-lg border border-indigo-400 bg-white p-1.5 text-xs font-mono text-slate-900"
                        />
                      ) : (
                        <div className="flex items-center gap-1 font-mono text-3xs">
                          <Phone className="h-3 w-3 text-slate-400" />
                          <span className={!row.phone.trim() || row.phone.length < 7 ? "text-rose-600 font-bold" : "text-slate-700 font-bold"}>
                            {row.phone || "⚠ رقم مفقود"}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Entity Name */}
                    <td className="p-2.5">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFormData.entityName ?? ""}
                          onChange={(e) => setEditFormData({ ...editFormData, entityName: e.target.value })}
                          className="w-full rounded-lg border border-indigo-400 bg-white p-1.5 text-xs text-slate-900"
                        />
                      ) : (
                        <span className="text-slate-800 font-medium">{row.entityName || "-"}</span>
                      )}
                    </td>

                    {/* Location */}
                    <td className="p-2.5">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFormData.location ?? ""}
                          onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                          className="w-full rounded-lg border border-indigo-400 bg-white p-1.5 text-xs text-slate-900"
                        />
                      ) : (
                        <span className="text-slate-600 text-3xs">{row.location || "تم الاستيراد من إكسل"}</span>
                      )}
                    </td>

                    {/* Role */}
                    <td className="p-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleRole(row.id)}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-3xs font-black transition-all cursor-pointer ${
                          row.role === "doctor"
                            ? "bg-purple-100 text-purple-800 hover:bg-purple-200 border border-purple-200"
                            : "bg-teal-100 text-teal-800 hover:bg-teal-200 border border-teal-200"
                        }`}
                        title="انقر لتغيير الفئة بين طبيب وصيدلية"
                      >
                        {row.role === "doctor" ? (
                          <>
                            <Stethoscope className="h-3 w-3" />
                            <span>طبيب</span>
                          </>
                        ) : (
                          <>
                            <Building2 className="h-3 w-3" />
                            <span>صيدلية</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Status / Errors */}
                    <td className="p-2.5 text-center">
                      {!row.isValid ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 text-3xs font-bold"
                          title={row.errors.join("، ")}
                        >
                          <XCircle className="h-3 w-3 text-rose-600" />
                          <span>خطأ</span>
                        </span>
                      ) : row.isDuplicate ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 text-3xs font-bold"
                          title="مسجل في النظام مسبقاً"
                        >
                          <AlertTriangle className="h-3 w-3 text-amber-600" />
                          <span>مكرر</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-3xs font-bold">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          <span>سليم</span>
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(row.id)}
                              className="p-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                              title="حفظ التعديل"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingRowId(null)}
                              className="p-1 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300"
                              title="إلغاء"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleStartEdit(row)}
                              className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
                              title="تعديل هذا السجل"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(row.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              title="حذف من قائمة الاستيراد"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Actions */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-2xs text-slate-600 flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-indigo-600 shrink-0" />
          <span>
            سيتم استيراد السجلات الصالحة (<strong>{rows.filter((r) => r.isValid).length}</strong> عميل) مباشرة وتفعيلها في قاعدة البيانات.
          </span>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            إلغاء وتعديل النص
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading || rows.filter((r) => r.isValid).length === 0}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            <UserCheck className="h-4 w-4" />
            <span>
              {isLoading ? "جاري الاستيراد..." : `تأكيد واستيراد (${rows.filter((r) => r.isValid).length}) عميل`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
