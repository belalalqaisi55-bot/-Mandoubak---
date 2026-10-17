import React, { useState, useRef } from "react";
import { Product } from "../types";
import {
  PlusCircle,
  Upload,
  Image as ImageIcon,
  Trash2,
  Edit3,
  Search,
  Sparkles,
  Layers,
  X,
  CheckCircle2,
  Eye,
  Tag,
  DollarSign,
  FileText,
  AlertCircle
} from "lucide-react";
import { PHARMACEUTICAL_IMAGE_PRESETS, getProductDisplayImage } from "../utils/productImages";

interface AdminProductCatalogManagerProps {
  products: Product[];
  availableCategories: string[];
  categoryColors?: Record<string, string>;
  getCategoryColor: (cat: string, colors?: Record<string, string>) => string;
  onAddProduct: (productData: Partial<Product>) => Promise<boolean | void>;
  onUpdateProduct: (id: string, productData: Partial<Product>) => Promise<boolean | void>;
  onDeleteProduct: (id: string, name: string) => Promise<boolean | void>;
  onOpenCategoryManager: () => void;
  onPreviewClientCatalog?: () => void;
  onAddCategory?: (category: string) => void;
}

export const AdminProductCatalogManager: React.FC<AdminProductCatalogManagerProps> = ({
  products,
  availableCategories,
  categoryColors,
  getCategoryColor,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onOpenCategoryManager,
  onPreviewClientCatalog
}) => {
  // New Product Form State
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: availableCategories[0] || "عام",
    price: "",
    unit: "علبة",
    bonus: "",
    activeIngredient: "",
    image: "",
    imageUrlInput: ""
  });

  const [imagePreview, setImagePreview] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [viewLayout, setViewLayout] = useState<"grid" | "table">("grid");
  const [showPresetPicker, setShowPresetPicker] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [newCategoryForm, setNewCategoryForm] = useState({ name: "", color: "#0f766e" });
  const [categoryFilter, setCategoryFilter] = useState<"all" | "popular" | "new">("all");

  // Edit Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Product>>({});
  const [editImagePreview, setEditImagePreview] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Handle local image file upload & convert to base64
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isEditMode = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("يرجى اختيار ملف صورة صالح (JPG, PNG, WebP)");
      return;
    }

    // Limit file size to 3MB for smooth client rendering
    if (file.size > 3 * 1024 * 1024) {
      alert("حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 3 ميجابايت");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (isEditMode) {
        setEditImagePreview(base64);
        setEditFormData((prev) => ({ ...prev, image: base64, imageUrl: base64 }));
      } else {
        setImagePreview(base64);
        setFormData((prev) => ({ ...prev, image: base64 }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyPreset = (presetUrl: string, isEditMode = false) => {
    if (isEditMode) {
      setEditImagePreview(presetUrl);
      setEditFormData((prev) => ({ ...prev, image: presetUrl, imageUrl: presetUrl }));
    } else {
      setImagePreview(presetUrl);
      setFormData((prev) => ({ ...prev, image: presetUrl }));
    }
    setShowPresetPicker(false);
  };

  const handleSubmitNewProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.price.trim()) {
      alert("يرجى إدخال اسم الصنف وسعر الوحدة كحد أدنى");
      return;
    }

    setIsSubmitting(true);
    try {
      const finalCategory = formData.category.trim() || "عام";
      if (onAddCategory && !availableCategories.includes(finalCategory)) {
        onAddCategory(finalCategory);
      }

      await onAddProduct({
        name: formData.name.trim(),
        description: formData.description.trim(),
        category: finalCategory,
        price: formData.price.trim(),
        unit: formData.unit.trim() || "علبة",
        bonus: formData.bonus.trim() || undefined,
        activeIngredient: formData.activeIngredient.trim() || undefined,
        image: finalImage,
        imageUrl: finalImage
      });

      // Reset form
      setFormData({
        name: "",
        description: "",
        category: formData.category,
        price: "",
        unit: "علبة",
        bonus: "",
        activeIngredient: "",
        image: "",
        imageUrlInput: ""
      });
      setImagePreview("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (prod: Product) => {
    setEditingProduct(prod);
    setEditFormData({
      name: prod.name,
      description: prod.description,
      category: prod.category,
      price: prod.price,
      unit: prod.unit,
      bonus: prod.bonus || "",
      activeIngredient: prod.activeIngredient || "",
      image: prod.image || prod.imageUrl || ""
    });
    setEditImagePreview(prod.image || prod.imageUrl || "");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    setIsSubmitting(true);
    try {
      await onUpdateProduct(editingProduct.id, {
        ...editFormData,
        imageUrl: editFormData.image || editFormData.imageUrl
      });
      setEditingProduct(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      searchQuery.trim() === "" ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.activeIngredient && p.activeIngredient.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategoryFilter === "all" || (p.category || "عام") === selectedCategoryFilter;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-900 via-slate-900 to-teal-950 p-4 sm:p-6 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 bg-teal-800/80 px-3 py-1 rounded-full text-xs font-bold text-teal-200 border border-teal-700/50">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>لوحة المندوب الطبي والإدارة</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            إدارة كتالوج المنتجات والأصناف الدوائية 💊
          </h2>
          <p className="text-xs sm:text-sm text-teal-100/90 max-w-2xl font-medium leading-relaxed">
            رفع وتعديل تفاصيل الأدوية والمنتجات بالاسم، الوصف، السعر، والصور التوضيحية لتمكين العملاء والصيادلة من تصفحها والطلب المباشر.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onPreviewClientCatalog && (
            <button
              type="button"
              onClick={onPreviewClientCatalog}
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Eye className="h-4 w-4" />
              <span>معاينة متجر العملاء 🛒</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenCategoryManager}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-teal-100 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Layers className="h-4 w-4 text-cyan-300" />
            <span>إدارة التصنيفات ({availableCategories.length})</span>
          </button>
        </div>
      </div>

      {/* Main Upload / Add Product Form */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
              <PlusCircle className="h-5 w-5 text-teal-700" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900">
                رفع وإضافة صنف دوائي جديد للكتالوج
              </h3>
              <p className="text-3xs text-slate-500 font-medium">
                أدخل بيانات الصنف مع رفع الصورة والسعر لتظهر للعملاء في الكتالوج فوراً
              </p>
            </div>
          </div>
          <span className="text-3xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
            مزامنة سحابية وفورية
          </span>
        </div>

        <form onSubmit={handleSubmitNewProduct} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Left 2 Cols: Product Details */}
            <div className="md:col-span-2 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Product Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    اسم الصنف التجاري *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: ريفانين 500 ملغ (Revanin 500mg)"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-teal-600 focus:outline-none"
                  />
                </div>

                {/* Active Ingredient */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المادة الفعالة / الاسم العلمي
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: Paracetamol 500mg"
                    value={formData.activeIngredient}
                    onChange={(e) => setFormData({ ...formData, activeIngredient: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-teal-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Category */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    التصنيف الدوائي *
                  </label>
                  <div className="flex gap-1 mb-2">
                    {["all", "popular", "new"].map((f) => (
                      <button
                        key={f}
                        onClick={() => setCategoryFilter(f as any)}
                        className={`text-3xs px-2 py-0.5 rounded-md font-bold ${categoryFilter === f ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                      >
                        {f === "all" ? "الكل" : f === "popular" ? "الأكثر طلباً" : "جديد"}
                      </button>
                    ))}
                  </div>
                  <div id="product-category-select" className="flex flex-wrap gap-2 mt-1">
                    {availableCategories.filter(c => {
                       if (categoryFilter === "popular") return products.filter(p => p.category === c).length > 5;
                       return true;
                    }).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setFormData({ ...formData, category: cat })}
                        className={`px-3 py-1.5 rounded-full text-2xs font-black transition-all border-2 duration-200 ease-in-out ${
                          formData.category === cat
                            ? "border-slate-900 shadow-sm scale-105"
                            : "border-transparent opacity-80 hover:opacity-100 hover:scale-105 hover:shadow-sm"
                        }`}
                        style={{
                          backgroundColor: getCategoryColor(cat, categoryColors),
                          color: "#ffffff"
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                    <div className="flex items-center gap-1">
                        <input
                            type="text"
                            placeholder="+ تصنيف جديد..."
                            className="px-3 py-1.5 rounded-full text-2xs font-black bg-slate-50 border-2 border-dashed border-slate-300 focus:border-teal-500 outline-none w-32"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && newCategory.trim()) {
                                    const newCat = newCategory.trim();
                                    const saved = localStorage.getItem("mandoubak_product_categories");
                                    const cats = saved ? JSON.parse(saved) : availableCategories;
                                    if (!cats.includes(newCat)) {
                                        localStorage.setItem("mandoubak_product_categories", JSON.stringify([...cats, newCat]));
                                        if (onAddCategory) onAddCategory(newCat);
                                    }
                                    setNewCategory("");
                                }
                            }}
                        />
                        <button
                          type="button"
                          onClick={() => setIsAddCategoryModalOpen(true)}
                          className="px-2 py-1.5 rounded-full text-2xs font-black bg-slate-100 text-slate-600 hover:bg-teal-100 hover:text-teal-800 border-2 border-dashed border-slate-300 transition-all"
                        >
                          +
                        </button>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!formData.name.trim()) {
                            alert("يرجى إدخال اسم الصنف أولاً للحصول على اقتراح");
                            return;
                        }
                        try {
                            const response = await fetch("/api/ai/suggest-category", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ name: formData.name, description: formData.description })
                            });
                            const data = await response.json();
                            if (data.category) {
                                setFormData({ ...formData, category: data.category });
                            }
                        } catch (e) {
                            alert("تعذر الحصول على اقتراح");
                        }
                      }}
                      className="px-3 py-1.5 rounded-full text-2xs font-black bg-purple-100 text-purple-700 hover:bg-purple-200 border-2 border-dashed border-purple-300 transition-all"
                    >
                      ✨ اقتراح بالتصنيف (AI)
                    </button>
                  </div>
                </div>

                {/* Add Category Modal */}
                {isAddCategoryModalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4">
                      <h4 className="font-black text-slate-900">إضافة تصنيف جديد</h4>
                      <input
                        type="text"
                        placeholder="اسم التصنيف..."
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                        value={newCategoryForm.name}
                        onChange={(e) => setNewCategoryForm({ ...newCategoryForm, name: e.target.value })}
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-600">اللون:</span>
                        <input
                          type="color"
                          value={newCategoryForm.color}
                          onChange={(e) => setNewCategoryForm({ ...newCategoryForm, color: e.target.value })}
                          className="h-8 w-12 rounded cursor-pointer"
                        />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => setIsAddCategoryModalOpen(false)}
                          className="flex-1 px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold"
                        >
                          إلغاء
                        </button>
                        <button
                          onClick={() => {
                            if (newCategoryForm.name.trim()) {
                              const newCat = newCategoryForm.name.trim();
                              // Update localStorage
                              const saved = localStorage.getItem("mandoubak_product_categories");
                              const cats = saved ? JSON.parse(saved) : availableCategories;
                              if (!cats.includes(newCat)) {
                                localStorage.setItem("mandoubak_product_categories", JSON.stringify([...cats, newCat]));
                              }
                              // Update colors
                              const savedColors = localStorage.getItem("mandoubak_category_colors");
                              const colors = savedColors ? JSON.parse(savedColors) : (categoryColors || {});
                              localStorage.setItem("mandoubak_category_colors", JSON.stringify({ ...colors, [newCat]: newCategoryForm.color }));
                              
                              if (onAddCategory) onAddCategory(newCat);
                              setIsAddCategoryModalOpen(false);
                              setNewCategoryForm({ name: "", color: "#0f766e" });
                              // Show toast notification
                              const toast = document.createElement("div");
                              toast.className = "fixed bottom-5 left-5 z-[100] bg-teal-600 text-white px-4 py-2 rounded-lg shadow-lg text-xs font-bold";
                              toast.innerText = "تم حفظ التصنيف الجديد بنجاح!";
                              document.body.appendChild(toast);
                              setTimeout(() => toast.remove(), 3000);
                            }
                          }}
                          className="flex-1 px-4 py-2 rounded-lg bg-teal-600 text-white text-xs font-bold"
                        >
                          حفظ
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                </div>

                {/* Price */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    السعر للوحدة (ريال) *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="مثال: 750 ريال أو 15.00"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 pl-8 text-xs font-bold font-mono focus:border-teal-600 focus:outline-none"
                    />
                    <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  </div>
                </div>

                {/* Unit */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الوحدة المخصصة للبيع
                  </label>
                  <input
                    type="text"
                    placeholder="علبة، شريط، زجاجة..."
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-teal-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Bonus */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    البونص المجاني 🎁
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: 10% أو 10+1 أو 40%"
                    value={formData.bonus}
                    onChange={(e) => setFormData({ ...formData, bonus: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-teal-600 focus:outline-none"
                  />
                </div>

                {/* Description */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الوصف ودواعي الاستخدام
                  </label>
                  <input
                    type="text"
                    placeholder="وصف مختصر أو إرشادات الاستخدام..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-teal-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Right 1 Col: Image Upload & Preview Section */}
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-3.5 flex flex-col items-center justify-between space-y-3">
              <div className="w-full text-center">
                <span className="text-xs font-bold text-slate-700 block mb-1">
                  صورة الصنف التوضيحية 📸
                </span>
                <span className="text-4xs text-slate-400">
                  ارفع صورة عالية الدقة أو اختر نموذجاً صيدلانياً
                </span>
              </div>

              {/* Preview Box */}
              <div className="relative w-full h-36 rounded-xl overflow-hidden bg-white border border-slate-200 flex items-center justify-center group shadow-2xs">
                {imagePreview ? (
                  <>
                    <img
                      src={imagePreview}
                      alt="معاينة الصنف"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview("");
                        setFormData((prev) => ({ ...prev, image: "", imageUrlInput: "" }));
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="absolute top-2 right-2 bg-rose-600 hover:bg-rose-700 text-white p-1 rounded-lg text-xs shadow-md transition-all cursor-pointer"
                      title="إزالة الصورة"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <div className="text-center p-3 text-slate-400 flex flex-col items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-slate-300 mb-1" />
                    <span className="text-3xs font-medium">لم يتم رفع صورة بعد</span>
                    <span className="text-4xs text-slate-400 mt-0.5">سيتم استخدام صورة الفئة تلقائياً</span>
                  </div>
                )}
              </div>

              {/* Upload Controls */}
              <div className="w-full space-y-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, false)}
                  className="hidden"
                  id="product-image-upload-file"
                />

                <div className="grid grid-cols-2 gap-1.5">
                  <label
                    htmlFor="product-image-upload-file"
                    className="w-full rounded-xl bg-teal-600 hover:bg-teal-700 text-white py-1.5 px-2 text-3xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all shadow-2xs text-center"
                  >
                    <Upload className="h-3 w-3" />
                    <span>رفع من الجهاز</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowPresetPicker(!showPresetPicker)}
                    className="w-full rounded-xl bg-slate-800 hover:bg-slate-900 text-white py-1.5 px-2 text-3xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all shadow-2xs"
                  >
                    <Sparkles className="h-3 w-3 text-amber-300" />
                    <span>صور جاهزة 🎁</span>
                  </button>
                </div>

                {/* Preset Dropdown / Grid */}
                {showPresetPicker && (
                  <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-md space-y-1.5 mt-2 max-h-48 overflow-y-auto">
                    <div className="text-4xs font-bold text-slate-500 mb-1">
                      اختر نموذج صورة طبي مناسب:
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {PHARMACEUTICAL_IMAGE_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleApplyPreset(preset.url, false)}
                          className="flex items-center gap-1.5 p-1 rounded-lg border border-slate-100 hover:border-teal-300 hover:bg-teal-50/50 text-right text-4xs transition-all cursor-pointer"
                        >
                          <img
                            src={preset.url}
                            alt={preset.label}
                            className="w-6 h-6 rounded object-cover shrink-0"
                          />
                          <span className="truncate font-semibold text-slate-800">
                            {preset.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 text-xs font-black transition-all active:scale-95 shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <PlusCircle className="h-4 w-4" />
              <span>{isSubmitting ? "جاري الإضافة والتعميم..." : "حفظ وتعميم الصنف في الكتالوج"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Catalog Items Header & Controls */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
              <span>أصناف الكتالوج الحالية المعتمدة</span>
              <span className="bg-teal-100 text-teal-800 text-xs px-2.5 py-0.5 rounded-full font-mono font-bold">
                {products.length} صنف
              </span>
            </h3>
            <p className="text-3xs text-slate-500 font-medium mt-0.5">
              يمكنك تعديل أي صنف، تغيير صورته، أو تحديث سعره وبونصه في أي وقت
            </p>
          </div>

          {/* View Switcher: Grid vs Table */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewLayout("grid")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewLayout === "grid"
                  ? "bg-white text-teal-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              عرض البطاقات بالصور 🖼️
            </button>
            <button
              type="button"
              onClick={() => setViewLayout("table")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewLayout === "table"
                  ? "bg-white text-teal-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              جدول البيانات 📊
            </button>
          </div>
        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2 border-t border-slate-100">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="🔍 بحث سريع في الأصناف، المادة الفعالة، أو التصنيف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 pr-9 text-xs font-semibold focus:border-teal-600 focus:outline-none"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategoryFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-3xs font-black transition-all shrink-0 cursor-pointer ${
                selectedCategoryFilter === "all"
                  ? "bg-teal-700 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              الكل ({products.length})
            </button>
            {availableCategories.map((cat) => {
              const count = products.filter((p) => (p.category || "عام") === cat).length;
              const isSelected = selectedCategoryFilter === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategoryFilter(cat)}
                  className={`px-2.5 py-1.5 rounded-xl text-3xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                    isSelected
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getCategoryColor(cat, categoryColors) }}
                  />
                  <span>{cat}</span>
                  <span className="text-4xs opacity-80 font-mono">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Catalog Items: Grid View with Rich Images */}
        {viewLayout === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 pt-2">
            {filteredProducts.length === 0 ? (
              <div className="col-span-full p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs font-medium">
                لا توجد أصناف تطابق معايير البحث الحالية.
              </div>
            ) : (
              filteredProducts.map((prod) => {
                const displayImg = getProductDisplayImage(prod);
                const catColor = getCategoryColor(prod.category, categoryColors);

                return (
                  <div
                    key={prod.id}
                    className="rounded-2xl border border-slate-200/90 bg-white hover:border-teal-300 hover:shadow-sm transition-all flex flex-col justify-between overflow-hidden group"
                  >
                    {/* Image Thumbnail & Category Badge */}
                    <div className="relative h-40 bg-slate-100 overflow-hidden">
                      <img
                        src={displayImg}
                        alt={prod.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                      {/* Category Badge */}
                      <div className="absolute top-2.5 right-2.5">
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-3xs font-black shadow-2xs backdrop-blur-md"
                          style={{
                            backgroundColor: `${catColor}dd`,
                            color: "#ffffff"
                          }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-white" />
                          {prod.category}
                        </span>
                      </div>

                      {/* Bonus Badge */}
                      {prod.bonus && (
                        <div className="absolute top-2.5 left-2.5">
                          <span className="inline-flex items-center gap-1 bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full text-4xs font-black shadow-2xs">
                            🎁 {prod.bonus}
                          </span>
                        </div>
                      )}

                      {/* Price on Image Bottom */}
                      <div className="absolute bottom-2 right-2.5 left-2.5 flex items-baseline justify-between text-white">
                        <span className="font-black text-sm tracking-tight text-amber-300 font-mono">
                          {prod.price}
                        </span>
                        <span className="text-4xs text-slate-200 font-medium">
                          لكل {prod.unit || "علبة"}
                        </span>
                      </div>
                    </div>

                    {/* Content Details */}
                    <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                      <div className="space-y-1">
                        <h4 className="text-xs sm:text-sm font-black text-slate-900 leading-snug line-clamp-2">
                          {prod.name}
                        </h4>

                        {prod.activeIngredient && (
                          <div className="text-3xs text-teal-800 font-bold bg-teal-50 px-2 py-0.5 rounded-md inline-block">
                            🔬 {prod.activeIngredient}
                          </div>
                        )}

                        {prod.description && (
                          <p className="text-3xs text-slate-500 leading-relaxed line-clamp-2 mt-1">
                            {prod.description}
                          </p>
                        )}
                      </div>

                      {/* Action Buttons: Edit & Delete */}
                      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(prod)}
                          className="flex-1 py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-teal-50 hover:text-teal-900 text-slate-700 text-3xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="h-3.5 w-3.5 text-teal-700" />
                          <span>تعديل وتحديث</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onDeleteProduct(prod.id, prod.name)}
                          className="py-1.5 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-3xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                          title="حذف الصنف نهائياً"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>حذف</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* Catalog Items: Table View */
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <th className="p-3">الصورة والصنف</th>
                  <th className="p-3">الفئة الدوائية</th>
                  <th className="p-3 text-center">السعر والوحدة</th>
                  <th className="p-3 text-center">البونص 🎁</th>
                  <th className="p-3">المادة الفعالة / الوصف</th>
                  <th className="p-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((prod) => (
                  <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={getProductDisplayImage(prod)}
                          alt={prod.name}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                        />
                        <div>
                          <div className="font-black text-slate-900">{prod.name}</div>
                          <div className="text-3xs text-slate-400 font-mono">ID: {prod.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-3xs font-bold border shadow-3xs"
                        style={{
                          backgroundColor: `${getCategoryColor(prod.category, categoryColors)}15`,
                          borderColor: `${getCategoryColor(prod.category, categoryColors)}40`,
                          color: getCategoryColor(prod.category, categoryColors)
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: getCategoryColor(prod.category, categoryColors) }}
                        />
                        {prod.category}
                      </span>
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-teal-800">
                      {prod.price} / {prod.unit}
                    </td>
                    <td className="p-3 text-center">
                      {prod.bonus ? (
                        <span className="inline-block bg-amber-100 border border-amber-300 px-2 py-0.5 rounded text-3xs font-black text-amber-900">
                          {prod.bonus}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="p-3 text-slate-600 max-w-xs truncate">
                      {prod.activeIngredient || prod.description || "-"}
                    </td>
                    <td className="p-3 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(prod)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-teal-100 text-teal-800 transition-colors cursor-pointer"
                          title="تعديل"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteProduct(prod.id, prod.name)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors cursor-pointer"
                          title="حذف"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-5 sm:p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-teal-700" />
                <h3 className="text-base font-black text-slate-900">
                  تعديل بيانات الصنف: {editingProduct.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم الصنف *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.name || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-teal-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المادة الفعالة</label>
                  <input
                    type="text"
                    value={editFormData.activeIngredient || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, activeIngredient: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-teal-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">التصنيف الدوائي</label>
                  <select
                    value={editFormData.category || "عام"}
                    onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-800 focus:border-teal-600 focus:outline-none cursor-pointer"
                  >
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">السعر للوحدة *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.price || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold font-mono focus:border-teal-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الوحدة</label>
                  <input
                    type="text"
                    value={editFormData.unit || "علبة"}
                    onChange={(e) => setEditFormData({ ...editFormData, unit: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-teal-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">البونص 🎁</label>
                  <input
                    type="text"
                    value={editFormData.bonus || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, bonus: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-teal-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الوصف ودواعي الاستخدام</label>
                <textarea
                  rows={2}
                  value={editFormData.description || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-semibold focus:border-teal-600 focus:outline-none"
                />
              </div>

              {/* Edit Image Section */}
              <div className="rounded-2xl border border-slate-200 p-3 bg-slate-50 flex items-center gap-4">
                <img
                  src={editImagePreview || getProductDisplayImage(editingProduct)}
                  alt="معاينة"
                  className="w-16 h-16 rounded-xl object-cover border border-slate-300 shrink-0"
                />

                <div className="space-y-1.5 flex-1">
                  <div className="text-xs font-bold text-slate-800">تحديث صورة الصنف</div>
                  <input
                    type="file"
                    ref={editFileInputRef}
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, true)}
                    className="hidden"
                    id="edit-product-image-file"
                  />
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="edit-product-image-file"
                      className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-3xs font-bold cursor-pointer inline-flex items-center gap-1"
                    >
                      <Upload className="h-3 w-3" />
                      <span>رفع صورة جديدة</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => handleApplyPreset(PHARMACEUTICAL_IMAGE_PRESETS[0].url, true)}
                      className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-3xs font-bold cursor-pointer"
                    >
                      استعادة النموذج
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "جاري الحفظ..." : "حفظ التعديلات"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
