import React, { useState, useMemo } from "react";
import { Product, CartItem, User } from "../types";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Sparkles,
  Info,
  Check,
  ChevronDown,
  Tag,
  Filter,
  CheckCircle2,
  X,
  Eye,
  SlidersHorizontal,
  Pill,
  FlaskConical,
  Syringe,
  Droplet,
  Layers,
  RotateCcw
} from "lucide-react";
import { getProductDisplayImage } from "../utils/productImages";
import {
  getProductDosageForm,
  getDosageFormStyle,
  extractActiveIngredients,
  extractDosageForms,
  DosageFormConfig
} from "../utils/dosageForms";

interface ClientProductCatalogProps {
  products: Product[];
  cartItems: CartItem[];
  availableCategories: string[];
  categoryColors?: Record<string, string>;
  getCategoryColor: (cat: string, colors?: Record<string, string>) => string;
  onAddToCart: (product: Product, quantity?: number) => void;
  onOpenCart: () => void;
  user: User | null;
}

const renderDosageFormIcon = (iconName: string, className = "h-3.5 w-3.5") => {
  switch (iconName) {
    case "pill":
    case "capsule":
      return <Pill className={className} />;
    case "syrup":
      return <FlaskConical className={className} />;
    case "injection":
      return <Syringe className={className} />;
    case "effervescent":
      return <Sparkles className={className} />;
    case "drops":
      return <Droplet className={className} />;
    case "cream":
      return <Layers className={className} />;
    case "spray":
    case "suppository":
    default:
      return <Pill className={className} />;
  }
};

const ClientProductCatalog: React.FC<ClientProductCatalogProps> = ({
  products,
  cartItems,
  availableCategories,
  categoryColors,
  getCategoryColor,
  onAddToCart,
  onOpenCart,
  user
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDosageForm, setSelectedDosageForm] = useState("all");
  const [selectedActiveIngredient, setSelectedActiveIngredient] = useState("all");
  const [sortBy, setSortBy] = useState<"default" | "price-asc" | "price-desc" | "name" | "bonus">("default");
  const [selectedProductDetails, setSelectedProductDetails] = useState<Product | null>(null);

  // Modal for browsing and selecting from all active ingredients
  const [isIngredientModalOpen, setIsIngredientModalOpen] = useState(false);
  const [ingredientModalSearch, setIngredientModalSearch] = useState("");

  // Local quantity buffer for each product card before adding to cart
  const [cardQuantities, setCardQuantities] = useState<Record<string, number>>({});
  const [justAddedProductIds, setJustAddedProductIds] = useState<Record<string, boolean>>({});

  const getCardQuantity = (productId: string) => cardQuantities[productId] || 1;

  const handleUpdateCardQuantity = (productId: string, delta: number) => {
    setCardQuantities((prev) => {
      const current = prev[productId] || 1;
      const next = Math.max(1, current + delta);
      return { ...prev, [productId]: next };
    });
  };

  const handleSetCardQuantity = (productId: string, qty: number) => {
    setCardQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(1, qty)
    }));
  };

  const handleTriggerAddToCart = (product: Product) => {
    const qty = getCardQuantity(product.id);
    onAddToCart(product, qty);

    // Trigger visual check animation
    setJustAddedProductIds((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setJustAddedProductIds((prev) => ({ ...prev, [product.id]: false }));
    }, 1500);
  };

  // Helper to parse price string to number for sorting
  const parsePrice = (priceStr: string): number => {
    if (!priceStr) return 0;
    const num = parseFloat(priceStr.replace(/[^0-9.]/g, ""));
    return isNaN(num) ? 0 : num;
  };

  // Extract distinct dosage forms and active ingredients
  const availableDosageForms = useMemo(() => extractDosageForms(products), [products]);
  const availableActiveIngredients = useMemo(() => extractActiveIngredients(products), [products]);

  // Top active ingredients to show directly as quick chips
  const topActiveIngredients = useMemo(() => availableActiveIngredients.slice(0, 6), [availableActiveIngredients]);

  // Filter & Sort Products
  const filteredAndSortedProducts = useMemo(() => {
    let list = products.filter((p) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        q === "" ||
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.activeIngredient && p.activeIngredient.toLowerCase().includes(q)) ||
        (p.dosageForm && p.dosageForm.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.includes(q));

      const matchesCat =
        selectedCategory === "all" || (p.category || "عام") === selectedCategory;

      const pDosageForm = getProductDosageForm(p);
      const matchesDosageForm =
        selectedDosageForm === "all" ||
        pDosageForm === selectedDosageForm ||
        (p.dosageForm && p.dosageForm.toLowerCase().includes(selectedDosageForm.toLowerCase()));

      const matchesActiveIngredient =
        selectedActiveIngredient === "all" ||
        Boolean(
          p.activeIngredient &&
          p.activeIngredient.toLowerCase().includes(selectedActiveIngredient.toLowerCase())
        );

      return matchesSearch && matchesCat && matchesDosageForm && matchesActiveIngredient;
    });

    // Sorting
    if (sortBy === "price-asc") {
      list = [...list].sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
    } else if (sortBy === "price-desc") {
      list = [...list].sort((a, b) => parsePrice(b.price) - parsePrice(a.price));
    } else if (sortBy === "name") {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name, "ar"));
    } else if (sortBy === "bonus") {
      list = [...list].sort((a, b) => (b.bonus ? 1 : 0) - (a.bonus ? 1 : 0));
    }

    return list;
  }, [products, searchQuery, selectedCategory, selectedDosageForm, selectedActiveIngredient, sortBy]);

  // Cart stats
  const totalCartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  // Check if any filter is active
  const hasActiveFilters =
    selectedCategory !== "all" ||
    selectedDosageForm !== "all" ||
    selectedActiveIngredient !== "all" ||
    searchQuery.trim() !== "";

  const handleResetAllFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedDosageForm("all");
    setSelectedActiveIngredient("all");
  };

  // Filtered list of ingredients in the modal
  const modalIngredientsList = useMemo(() => {
    const q = ingredientModalSearch.trim().toLowerCase();
    if (!q) return availableActiveIngredients;
    return availableActiveIngredients.filter((item) =>
      item.ingredient.toLowerCase().includes(q)
    );
  }, [availableActiveIngredients, ingredientModalSearch]);

  return (
    <div className="space-y-4">
      {/* Top Banner / Store Header */}
      <div className="rounded-2xl border border-teal-200/90 bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 p-4 sm:p-6 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="space-y-1.5 relative z-10">
          <div className="inline-flex items-center gap-1.5 bg-white/15 px-3 py-0.5 rounded-full text-xs font-bold text-teal-100 border border-white/20 backdrop-blur-xs">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>الكتالوج والمتجر الدوائي المعتمد</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            الأصناف والأدوية الطبية المعتمدة 💊
          </h2>
          <p className="text-xs sm:text-sm text-teal-100/90 max-w-2xl font-medium leading-relaxed">
            استعرض قائمة الأدوية بكامل المواصفات والأسعار التنافسية وعروض البونص المعتمدة لدى المندوب الطبي د/ بلال القيسي. يمكنك الآن التصفية بدقة حسب المادة الفعالة والشكل الصيدلاني والتصنيف الطبي.
          </p>
        </div>

        {/* View Cart Button */}
        <button
          type="button"
          onClick={onOpenCart}
          className="relative px-5 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer z-10 shrink-0"
        >
          <ShoppingCart className="h-4 w-4" />
          <span>سلة الطلبيات</span>
          {totalCartCount > 0 && (
            <span className="bg-slate-950 text-amber-300 font-mono text-xs px-2 py-0.5 rounded-full">
              {totalCartCount}
            </span>
          )}
        </button>
      </div>

      {/* Comprehensive Search & Multi-Level Medical Filter Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs space-y-3">
        {/* Top Search Input & Sort Selector */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="🔍 بحث باسم الدواء، المادة الفعالة، الشكل الدوائي، التصنيف أو الباركود..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-teal-200 bg-teal-50/30 px-3.5 py-2.5 pr-10 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-teal-600 focus:bg-white focus:outline-none transition-all"
            />
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-teal-700" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="مسح البحث"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 shrink-0">
            <SlidersHorizontal className="h-4 w-4 text-slate-400 hidden sm:block" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 focus:border-teal-600 focus:outline-none cursor-pointer"
            >
              <option value="default">الترتيب الافتراضي</option>
              <option value="bonus">🎁 عروض البونص أولاً</option>
              <option value="price-asc">السعر: من الأقل للأعلى</option>
              <option value="price-desc">السعر: من الأعلى للأقل</option>
              <option value="name">أبجدياً (أ - ي)</option>
            </select>
          </div>
        </div>

        {/* Level 1: Medical Categories Bar */}
        <div className="space-y-1.5 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-3xs font-extrabold text-slate-600">
              <Tag className="h-3.5 w-3.5 text-teal-600" />
              <span>التصنيف الدوائي:</span>
            </div>
            {selectedCategory !== "all" && (
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className="text-4xs text-teal-700 font-bold hover:underline"
              >
                عرض كل الفئات
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-1.5 rounded-xl text-3xs font-black transition-all shrink-0 cursor-pointer ${
                selectedCategory === "all"
                  ? "bg-teal-700 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              الكل ({products.length})
            </button>

            {availableCategories.map((cat) => {
              const count = products.filter((p) => (p.category || "عام") === cat).length;
              const isSelected = selectedCategory === cat;
              const catColor = getCategoryColor(cat, categoryColors);

              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1.5 rounded-xl text-3xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-slate-900 text-white shadow-2xs ring-2 ring-teal-500"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: catColor }}
                  />
                  <span>{cat}</span>
                  <span className="text-4xs opacity-80 font-mono">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Level 2: Specific Dosage Forms Bar (الأشكال والجرعات الدوائية) */}
        <div className="space-y-1.5 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-3xs font-extrabold text-slate-600">
              <Pill className="h-3.5 w-3.5 text-cyan-600" />
              <span>الشكل الصيدلاني (Dosage Form):</span>
            </div>
            {selectedDosageForm !== "all" && (
              <button
                type="button"
                onClick={() => setSelectedDosageForm("all")}
                className="text-4xs text-cyan-700 font-bold hover:underline"
              >
                عرض كل الأشكال
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedDosageForm("all")}
              className={`px-3 py-1.5 rounded-xl text-3xs font-black transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                selectedDosageForm === "all"
                  ? "bg-cyan-700 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span>جميع الأشكال</span>
              <span className="text-4xs font-mono opacity-80">({products.length})</span>
            </button>

            {availableDosageForms.map(({ form, count, config }) => {
              const isSelected = selectedDosageForm === form;
              return (
                <button
                  key={form}
                  type="button"
                  onClick={() => setSelectedDosageForm(isSelected ? "all" : form)}
                  className={`px-2.5 py-1.5 rounded-xl text-3xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 border ${
                    isSelected
                      ? "bg-cyan-900 text-cyan-100 border-cyan-700 shadow-2xs ring-2 ring-cyan-400"
                      : `${config.badgeBg} ${config.textColor} ${config.borderColor} hover:brightness-95`
                  }`}
                  title={`${form} (${config.english}) - ${count} صنف`}
                >
                  {renderDosageFormIcon(config.iconName, "h-3.5 w-3.5 shrink-0")}
                  <span>{form}</span>
                  <span className="text-4xs font-mono px-1 py-0.2 rounded bg-black/10">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Level 3: Active Ingredients Filter (المادة الفعالة) */}
        <div className="space-y-1.5 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-3xs font-extrabold text-slate-600">
              <FlaskConical className="h-3.5 w-3.5 text-purple-600" />
              <span>المادة الفعالة (Active Ingredient):</span>
            </div>
            <button
              type="button"
              onClick={() => setIsIngredientModalOpen(true)}
              className="text-4xs text-purple-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>تصفح كافة المواد الفعالة ({availableActiveIngredients.length})</span>
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedActiveIngredient("all")}
              className={`px-3 py-1.5 rounded-xl text-3xs font-black transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                selectedActiveIngredient === "all"
                  ? "bg-purple-700 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span>جميع المواد</span>
              <span className="text-4xs font-mono opacity-80">({availableActiveIngredients.length})</span>
            </button>

            {topActiveIngredients.map(({ ingredient, count }) => {
              const isSelected = selectedActiveIngredient === ingredient;
              return (
                <button
                  key={ingredient}
                  type="button"
                  onClick={() => setSelectedActiveIngredient(isSelected ? "all" : ingredient)}
                  className={`px-2.5 py-1.5 rounded-xl text-3xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 border ${
                    isSelected
                      ? "bg-purple-900 text-purple-100 border-purple-700 shadow-2xs ring-2 ring-purple-400"
                      : "bg-purple-50 text-purple-900 border-purple-200 hover:bg-purple-100"
                  }`}
                  title={`${ingredient} - ${count} صنف`}
                >
                  <FlaskConical className="h-3 w-3 text-purple-600 shrink-0" />
                  <span className="truncate max-w-[150px]">{ingredient}</span>
                  <span className="text-4xs font-mono px-1 py-0.2 rounded bg-purple-200/60 text-purple-900">
                    {count}
                  </span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setIsIngredientModalOpen(true)}
              className="px-2.5 py-1.5 rounded-xl text-3xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-all shrink-0 cursor-pointer flex items-center gap-1"
            >
              <span>+ المزيد...</span>
            </button>
          </div>
        </div>

        {/* Active Filter Badges Strip & Results Summary */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-200/80 bg-slate-50/70 p-2.5 rounded-xl">
            <div className="flex flex-wrap items-center gap-1.5 text-3xs">
              <span className="font-extrabold text-slate-700 flex items-center gap-1">
                <Filter className="h-3 w-3 text-teal-600" />
                <span>الفلاتر النشطة:</span>
              </span>

              {/* Category Filter Badge */}
              {selectedCategory !== "all" && (
                <span className="inline-flex items-center gap-1 bg-teal-100 text-teal-900 border border-teal-300 px-2 py-0.5 rounded-md font-bold">
                  <span>فئة: {selectedCategory}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("all")}
                    className="hover:text-red-700 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}

              {/* Dosage Form Filter Badge */}
              {selectedDosageForm !== "all" && (
                <span className="inline-flex items-center gap-1 bg-cyan-100 text-cyan-900 border border-cyan-300 px-2 py-0.5 rounded-md font-bold">
                  <span>الشكل: {selectedDosageForm}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedDosageForm("all")}
                    className="hover:text-red-700 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}

              {/* Active Ingredient Filter Badge */}
              {selectedActiveIngredient !== "all" && (
                <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-900 border border-purple-300 px-2 py-0.5 rounded-md font-bold">
                  <span>مادة: {selectedActiveIngredient}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedActiveIngredient("all")}
                    className="hover:text-red-700 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}

              {/* Search Query Filter Badge */}
              {searchQuery.trim() !== "" && (
                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-md font-bold">
                  <span>بحث: "{searchQuery}"</span>
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="hover:text-red-700 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}

              {/* Reset All Filters Button */}
              <button
                type="button"
                onClick={handleResetAllFilters}
                className="text-4xs text-red-600 hover:text-red-800 font-extrabold flex items-center gap-0.5 px-2 py-0.5 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md cursor-pointer transition-colors"
              >
                <RotateCcw className="h-2.5 w-2.5" />
                <span>إلغاء جميع الفلاتر</span>
              </button>
            </div>

            {/* Results Count */}
            <div className="text-3xs font-extrabold text-teal-800">
              تم العثور على{" "}
              <span className="font-mono bg-teal-100 px-1.5 py-0.2 rounded text-teal-950">
                {filteredAndSortedProducts.length}
              </span>{" "}
              صنف مطابق
            </div>
          </div>
        )}
      </div>

      {/* Catalog Grid View */}
      {filteredAndSortedProducts.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center space-y-3">
          <div className="h-16 w-16 mx-auto rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center">
            <Search className="h-8 w-8 text-slate-300" />
          </div>
          <h4 className="text-sm font-black text-slate-800">
            لم يتم العثور على أي صنف يطابق معايير التصفية والبحث
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            جرب إلغاء بعض الفلاتر (مثل الشكل الدوائي أو المادة الفعالة) أو إعادة ضبط البحث للوصول لكامل الأصناف.
          </p>
          <button
            type="button"
            onClick={handleResetAllFilters}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            إعادة ضبط كافة الفلاتر والبحث
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {filteredAndSortedProducts.map((prod) => {
            const displayImg = getProductDisplayImage(prod);
            const catColor = getCategoryColor(prod.category, categoryColors);
            const currentQty = getCardQuantity(prod.id);
            const isJustAdded = justAddedProductIds[prod.id];

            // Resolve dosage form & styling
            const dosageFormName = getProductDosageForm(prod);
            const dosageFormConfig = getDosageFormStyle(dosageFormName);

            // Check if already in cart
            const inCartItem = cartItems.find((c) => c.product.id === prod.id);

            return (
              <div
                key={prod.id}
                className="rounded-2xl border border-slate-200 bg-white hover:border-teal-400 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group relative"
              >
                {/* Top Image Section */}
                <div
                  className="relative h-44 bg-slate-100 overflow-hidden cursor-pointer"
                  onClick={() => setSelectedProductDetails(prod)}
                >
                  <img
                    src={displayImg}
                    alt={prod.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent pointer-events-none" />

                  {/* Category Chip */}
                  <div className="absolute top-2.5 right-2.5">
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-3xs font-black shadow-xs backdrop-blur-md"
                      style={{
                        backgroundColor: `${catColor}ee`,
                        color: "#ffffff"
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      {prod.category}
                    </span>
                  </div>

                  {/* Bonus Tag */}
                  {prod.bonus && (
                    <div className="absolute top-2.5 left-2.5">
                      <span className="inline-flex items-center gap-1 bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full text-4xs font-black shadow-xs">
                        🎁 {prod.bonus}
                      </span>
                    </div>
                  )}

                  {/* Price Banner at Bottom of Image */}
                  <div className="absolute bottom-2 right-2.5 left-2.5 flex items-baseline justify-between text-white">
                    <span className="font-black text-sm tracking-tight text-amber-300 font-mono">
                      {prod.price}
                    </span>
                    <span className="text-4xs text-slate-200 font-medium">
                      لكل {prod.unit || "علبة"}
                    </span>
                  </div>

                  {/* Quick View Eye Overlay */}
                  <div className="absolute inset-0 bg-teal-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <span className="px-3 py-1 bg-white/90 text-teal-950 rounded-xl text-3xs font-black shadow-md flex items-center gap-1 backdrop-blur-xs">
                      <Eye className="h-3 w-3" />
                      <span>تفاصيل الصنف</span>
                    </span>
                  </div>
                </div>

                {/* Details Section */}
                <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <h4
                      onClick={() => setSelectedProductDetails(prod)}
                      className="text-xs sm:text-sm font-black text-slate-900 leading-snug line-clamp-2 cursor-pointer hover:text-teal-700 transition-colors"
                      title={prod.name}
                    >
                      {prod.name}
                    </h4>

                    {/* Dosage Form & Active Ingredient Interactive Badges */}
                    <div className="flex flex-wrap items-center gap-1">
                      {/* Dosage Form Badge - Clickable to filter */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDosageForm(dosageFormName);
                        }}
                        title={`تصفية حسب الشكل الدوائي: ${dosageFormName}`}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-4xs font-bold border transition-all cursor-pointer ${dosageFormConfig.badgeBg} ${dosageFormConfig.textColor} ${dosageFormConfig.borderColor} hover:brightness-95`}
                      >
                        {renderDosageFormIcon(dosageFormConfig.iconName, "h-3 w-3 shrink-0")}
                        <span>{dosageFormName}</span>
                      </button>

                      {/* Active Ingredient Badge - Clickable to filter */}
                      {prod.activeIngredient && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedActiveIngredient(prod.activeIngredient || "all");
                          }}
                          title={`تصفية حسب المادة الفعالة: ${prod.activeIngredient}`}
                          className="text-4xs text-purple-900 font-bold bg-purple-50 hover:bg-purple-100 border border-purple-200/80 px-2 py-0.5 rounded-md inline-flex items-center gap-1 cursor-pointer transition-colors max-w-full"
                        >
                          <FlaskConical className="h-3 w-3 text-purple-600 shrink-0" />
                          <span className="truncate">{prod.activeIngredient}</span>
                        </button>
                      )}
                    </div>

                    {prod.description && (
                      <p className="text-3xs text-slate-500 leading-relaxed line-clamp-2 mt-0.5">
                        {prod.description}
                      </p>
                    )}
                  </div>

                  {/* Order & Quantity Controls */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    {inCartItem && (
                      <div className="text-4xs font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md flex items-center justify-between">
                        <span>بالسلة حالياً:</span>
                        <span className="font-mono font-black">{inCartItem.quantity} {prod.unit || "علبة"}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5">
                      {/* Quantity Stepper */}
                      <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleUpdateCardQuantity(prod.id, -1)}
                          className="h-7 w-6 rounded-lg bg-white hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center cursor-pointer shadow-3xs"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={currentQty}
                          onChange={(e) => handleSetCardQuantity(prod.id, parseInt(e.target.value) || 1)}
                          className="w-8 text-center font-mono font-bold text-xs text-slate-900 bg-transparent focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateCardQuantity(prod.id, 1)}
                          className="h-7 w-6 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center justify-center cursor-pointer shadow-3xs"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Add to Cart Button */}
                      <button
                        type="button"
                        onClick={() => handleTriggerAddToCart(prod)}
                        className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer ${
                          isJustAdded
                            ? "bg-emerald-600 text-white scale-102"
                            : "bg-teal-600 hover:bg-teal-700 active:scale-95 text-white"
                        }`}
                      >
                        {isJustAdded ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>تمت الإضافة!</span>
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="h-3.5 w-3.5" />
                            <span>أضف للسلة</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Sticky Cart Quick Bar if items in cart */}
      {totalCartCount > 0 && (
        <div className="sticky bottom-3 z-30 rounded-2xl border border-teal-300 bg-slate-950/95 text-white p-3 shadow-xl backdrop-blur-md flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
              <ShoppingCart className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-black text-teal-100 flex items-center gap-1.5">
                <span>سلة طلبيات الأدوية</span>
                <span className="bg-teal-900 border border-teal-700 px-1.5 py-0.2 rounded font-mono text-amber-300">
                  {cartItems.length} صنف ({totalCartCount} وحدة)
                </span>
              </div>
              <div className="text-4xs text-slate-400">
                جاهزة للمراجعة والإرسال المباشر للمندوب
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenCart}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-105 text-slate-950 text-xs font-black shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>فتح السلة وإتمام الطلب</span>
            <span className="font-mono bg-slate-950 text-amber-300 px-1.5 py-0.2 rounded-full text-3xs">
              ←
            </span>
          </button>
        </div>
      )}

      {/* All Active Ingredients Search & Select Modal */}
      {isIngredientModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-purple-900 via-purple-800 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center">
                  <FlaskConical className="h-4 w-4 text-purple-200" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">
                    تصفية بالمواد الفعالة (Active Ingredients)
                  </h3>
                  <p className="text-4xs text-purple-200">
                    اختر مادة فعالة لعرض كافة الأدوية والمستحضرات التي تحتوي عليها
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsIngredientModalOpen(false)}
                className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Search Bar */}
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <div className="relative">
                <input
                  type="text"
                  placeholder="ابحث في أسماء المواد الفعالة..."
                  value={ingredientModalSearch}
                  onChange={(e) => setIngredientModalSearch(e.target.value)}
                  className="w-full rounded-xl border border-purple-200 bg-white px-3.5 py-2.5 pr-9 text-xs font-bold text-slate-800 placeholder-slate-400 focus:border-purple-600 focus:outline-none"
                  autoFocus
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-600" />
                {ingredientModalSearch && (
                  <button
                    type="button"
                    onClick={() => setIngredientModalSearch("")}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Ingredients Grid / List */}
            <div className="p-4 max-h-80 overflow-y-auto space-y-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedActiveIngredient("all");
                  setIsIngredientModalOpen(false);
                }}
                className={`w-full p-2.5 rounded-xl text-xs font-black text-right transition-all flex items-center justify-between border cursor-pointer ${
                  selectedActiveIngredient === "all"
                    ? "bg-purple-700 text-white border-purple-800 shadow-2xs"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200"
                }`}
              >
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-300" />
                  <span>عرض جميع المواد الفعالة (إلغاء التصفية)</span>
                </span>
                <span className="font-mono text-3xs opacity-80">({products.length} صنف)</span>
              </button>

              {modalIngredientsList.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">
                  لا توجد مادة فعالة تطابق بحثك.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                  {modalIngredientsList.map(({ ingredient, count }) => {
                    const isSelected = selectedActiveIngredient === ingredient;
                    return (
                      <button
                        key={ingredient}
                        type="button"
                        onClick={() => {
                          setSelectedActiveIngredient(ingredient);
                          setIsIngredientModalOpen(false);
                        }}
                        className={`p-2.5 rounded-xl text-xs font-bold text-right transition-all flex items-center justify-between border cursor-pointer ${
                          isSelected
                            ? "bg-purple-900 text-purple-100 border-purple-700 shadow-2xs ring-2 ring-purple-400"
                            : "bg-purple-50/70 hover:bg-purple-100/80 text-purple-950 border-purple-200/80"
                        }`}
                      >
                        <span className="truncate pr-1 font-semibold">{ingredient}</span>
                        <span className="font-mono text-3xs px-2 py-0.5 rounded-full bg-purple-200/70 text-purple-900 shrink-0 font-bold">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-4xs text-slate-500 font-bold">
                إجمالي المواد المسجلة: {availableActiveIngredients.length}
              </span>
              <button
                type="button"
                onClick={() => setIsIngredientModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Quick-View Modal */}
      {selectedProductDetails && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Image Header */}
            <div className="relative h-60 bg-slate-100">
              <img
                src={getProductDisplayImage(selectedProductDetails)}
                alt={selectedProductDetails.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

              <button
                type="button"
                onClick={() => setSelectedProductDetails(null)}
                className="absolute top-3 left-3 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="absolute top-3 right-3 flex items-center gap-1.5 flex-wrap">
                <span
                  className="px-3 py-1 rounded-full text-xs font-black text-white shadow-sm"
                  style={{ backgroundColor: getCategoryColor(selectedProductDetails.category, categoryColors) }}
                >
                  {selectedProductDetails.category}
                </span>

                {/* Dosage Form Badge in Modal */}
                {(() => {
                  const dfName = getProductDosageForm(selectedProductDetails);
                  const dfConfig = getDosageFormStyle(dfName);
                  return (
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-black shadow-sm flex items-center gap-1 ${dfConfig.badgeBg} ${dfConfig.textColor} border ${dfConfig.borderColor}`}
                    >
                      {renderDosageFormIcon(dfConfig.iconName, "h-3.5 w-3.5")}
                      <span>{dfName}</span>
                    </span>
                  );
                })()}

                {selectedProductDetails.bonus && (
                  <span className="bg-amber-400 text-slate-950 px-2.5 py-1 rounded-full text-xs font-black shadow-sm">
                    🎁 بونص {selectedProductDetails.bonus}
                  </span>
                )}
              </div>

              <div className="absolute bottom-3 right-4 left-4 text-white">
                <h3 className="text-lg sm:text-xl font-black text-white">
                  {selectedProductDetails.name}
                </h3>
                {selectedProductDetails.activeIngredient && (
                  <p className="text-xs text-teal-200 font-semibold mt-0.5 flex items-center gap-1">
                    <FlaskConical className="h-3 w-3 text-teal-300" />
                    <span>المادة الفعالة: {selectedProductDetails.activeIngredient}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Quick Filter Buttons based on this item */}
              <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-2xl bg-purple-50/60 border border-purple-100">
                <span className="text-4xs font-black text-purple-900 w-full sm:w-auto">
                  تصفية سريعة بالكتالوج:
                </span>
                {selectedProductDetails.activeIngredient && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedActiveIngredient(selectedProductDetails.activeIngredient || "all");
                      setSelectedProductDetails(null);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-purple-100 text-purple-900 border border-purple-200 text-3xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <FlaskConical className="h-3 w-3 text-purple-600" />
                    <span>أدوية بمادة: {selectedProductDetails.activeIngredient}</span>
                  </button>
                )}

                {(() => {
                  const dfName = getProductDosageForm(selectedProductDetails);
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDosageForm(dfName);
                        setSelectedProductDetails(null);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-cyan-100 text-cyan-900 border border-cyan-200 text-3xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Pill className="h-3 w-3 text-cyan-600" />
                      <span>أدوية بنفس الشكل: {dfName}</span>
                    </button>
                  );
                })()}
              </div>

              {/* Price & Unit Details */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div>
                  <span className="text-3xs text-slate-500 font-bold block">السعر للوحدة</span>
                  <span className="text-base font-black text-teal-800 font-mono">
                    {selectedProductDetails.price}
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-3xs text-slate-500 font-bold block">الوحدة المقررة</span>
                  <span className="text-xs font-bold text-slate-800">
                    {selectedProductDetails.unit || "علبة"}
                  </span>
                </div>
                {selectedProductDetails.bonus && (
                  <div className="text-left">
                    <span className="text-3xs text-slate-500 font-bold block">عرض البونص</span>
                    <span className="text-xs font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                      {selectedProductDetails.bonus}
                    </span>
                  </div>
                )}
              </div>

              {/* Full Description */}
              {selectedProductDetails.description && (
                <div className="space-y-1">
                  <h5 className="text-xs font-bold text-slate-700">دواعي الاستعمال والوصف:</h5>
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {selectedProductDetails.description}
                  </p>
                </div>
              )}

              {/* Barcode & Codes if present */}
              {selectedProductDetails.barcode && (
                <div className="flex items-center gap-2 text-3xs text-slate-400 font-mono">
                  <span>الباركود:</span>
                  <span>{selectedProductDetails.barcode}</span>
                </div>
              )}

              {/* Add to Cart Actions */}
              <div className="pt-2 flex items-center gap-2">
                <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => handleUpdateCardQuantity(selectedProductDetails.id, -1)}
                    className="h-8 w-8 rounded-lg bg-white hover:bg-slate-200 text-slate-800 font-bold text-sm flex items-center justify-center cursor-pointer shadow-3xs"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={getCardQuantity(selectedProductDetails.id)}
                    onChange={(e) => handleSetCardQuantity(selectedProductDetails.id, parseInt(e.target.value) || 1)}
                    className="w-10 text-center font-mono font-bold text-sm text-slate-900 bg-transparent focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleUpdateCardQuantity(selectedProductDetails.id, 1)}
                    className="h-8 w-8 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm flex items-center justify-center cursor-pointer shadow-3xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    handleTriggerAddToCart(selectedProductDetails);
                    setSelectedProductDetails(null);
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span>إضافة للطلبية ({getCardQuantity(selectedProductDetails.id)} وحدة)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientProductCatalog;
export { ClientProductCatalog };
