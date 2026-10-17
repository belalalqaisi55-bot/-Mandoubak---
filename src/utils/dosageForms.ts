import { Product } from "../types";

export interface DosageFormConfig {
  id: string;
  name: string;
  english: string;
  iconName: "pill" | "capsule" | "syrup" | "injection" | "effervescent" | "drops" | "cream" | "spray" | "suppository" | "other";
  badgeBg: string;
  textColor: string;
  borderColor: string;
}

export const DOSAGE_FORMS: DosageFormConfig[] = [
  {
    id: "tablets",
    name: "أقراص (Tablets)",
    english: "Tablets",
    iconName: "pill",
    badgeBg: "bg-cyan-50",
    textColor: "text-cyan-800",
    borderColor: "border-cyan-200",
  },
  {
    id: "capsules",
    name: "كبسولات (Capsules)",
    english: "Capsules",
    iconName: "capsule",
    badgeBg: "bg-purple-50",
    textColor: "text-purple-800",
    borderColor: "border-purple-200",
  },
  {
    id: "syrup",
    name: "شراب ومعلق (Syrup)",
    english: "Syrup / Suspension",
    iconName: "syrup",
    badgeBg: "bg-amber-50",
    textColor: "text-amber-800",
    borderColor: "border-amber-200",
  },
  {
    id: "injections",
    name: "حقن وفيال (Injections)",
    english: "Injections / Vials",
    iconName: "injection",
    badgeBg: "bg-rose-50",
    textColor: "text-rose-800",
    borderColor: "border-rose-200",
  },
  {
    id: "effervescent",
    name: "فوار وحبيبات (Effervescent)",
    english: "Effervescent / Sachets",
    iconName: "effervescent",
    badgeBg: "bg-emerald-50",
    textColor: "text-emerald-800",
    borderColor: "border-emerald-200",
  },
  {
    id: "drops",
    name: "قطرات (Drops)",
    english: "Drops (Eye/Ear/Oral)",
    iconName: "drops",
    badgeBg: "bg-sky-50",
    textColor: "text-sky-800",
    borderColor: "border-sky-200",
  },
  {
    id: "topical",
    name: "مراهم وكريمات (Topical)",
    english: "Ointments / Creams / Gels",
    iconName: "cream",
    badgeBg: "bg-pink-50",
    textColor: "text-pink-800",
    borderColor: "border-pink-200",
  },
  {
    id: "inhalers",
    name: "بخاخ واستنشاق (Inhalers)",
    english: "Sprays / Inhalers",
    iconName: "spray",
    badgeBg: "bg-indigo-50",
    textColor: "text-indigo-800",
    borderColor: "border-indigo-200",
  },
  {
    id: "suppositories",
    name: "تحاميل (Suppositories)",
    english: "Suppositories",
    iconName: "suppository",
    badgeBg: "bg-teal-50",
    textColor: "text-teal-800",
    borderColor: "border-teal-200",
  },
  {
    id: "other",
    name: "أشكال دوائية أخرى",
    english: "Other Dosage Forms",
    iconName: "other",
    badgeBg: "bg-slate-100",
    textColor: "text-slate-700",
    borderColor: "border-slate-200",
  },
];

/**
 * Automatically infers dosage form if not explicitly defined on product
 */
export function getProductDosageForm(product: Partial<Product>): string {
  if (product.dosageForm && product.dosageForm.trim()) {
    const raw = product.dosageForm.trim().toLowerCase();
    const matched = DOSAGE_FORMS.find(
      (df) =>
        df.id === raw ||
        df.name.toLowerCase().includes(raw) ||
        df.english.toLowerCase().includes(raw)
    );
    if (matched) return matched.name;
    return product.dosageForm.trim();
  }

  // Smart heuristic based on product name, description, unit, and category
  const text = `${product.name || ""} ${product.description || ""} ${product.unit || ""} ${product.category || ""}`.toLowerCase();

  if (text.includes("فوار") || text.includes("effervescent") || text.includes("sachet") || text.includes("حبيبات")) {
    return "فوار وحبيبات (Effervescent)";
  }
  if (text.includes("شراب") || text.includes("syrup") || text.includes("syrp") || text.includes("معلق") || text.includes("suspension") || text.includes("زجاجة")) {
    return "شراب ومعلق (Syrup)";
  }
  if (text.includes("حقن") || text.includes("حقنة") || text.includes("injection") || text.includes("inj") || text.includes("vial") || text.includes("فيال") || text.includes("أمبول") || text.includes("ampoule")) {
    return "حقن وفيال (Injections)";
  }
  if (text.includes("كبسول") || text.includes("capsule") || text.includes("caps") || text.includes("cap")) {
    return "كبسولات (Capsules)";
  }
  if (text.includes("قطرة") || text.includes("قطرات") || text.includes("drops") || text.includes("drop")) {
    return "قطرات (Drops)";
  }
  if (text.includes("مرهم") || text.includes("كريم") || text.includes("ointment") || text.includes("cream") || text.includes("gel") || text.includes("جل") || text.includes("دهان")) {
    return "مراهم وكريمات (Topical)";
  }
  if (text.includes("بخاخ") || text.includes("spray") || text.includes("inhaler") || text.includes("رذاذ")) {
    return "بخاخ واستنشاق (Inhalers)";
  }
  if (text.includes("تحاميل") || text.includes("تحميلة") || text.includes("suppository")) {
    return "تحاميل (Suppositories)";
  }
  if (text.includes("أقراص") || text.includes("قرص") || text.includes("tablet") || text.includes("tab") || text.includes("شريط") || text.includes("strips")) {
    return "أقراص (Tablets)";
  }

  return "أقراص (Tablets)";
}

export function getDosageFormStyle(formNameOrProduct: string | Partial<Product>): DosageFormConfig {
  const formName = typeof formNameOrProduct === "string" 
    ? formNameOrProduct 
    : getProductDosageForm(formNameOrProduct);

  const matched = DOSAGE_FORMS.find(
    (df) =>
      df.name === formName ||
      df.id === formName.toLowerCase() ||
      formName.toLowerCase().includes(df.english.toLowerCase()) ||
      formName.includes(df.name.split(" ")[0])
  );

  return matched || {
    id: "custom",
    name: formName || "صنف صيدلاني",
    english: "Medical Form",
    iconName: "pill",
    badgeBg: "bg-teal-50",
    textColor: "text-teal-800",
    borderColor: "border-teal-200",
  };
}

/**
 * Extracts and counts unique active ingredients across product list
 */
export function extractActiveIngredients(products: Product[]): { ingredient: string; count: number }[] {
  const counts: Record<string, number> = {};

  products.forEach((p) => {
    if (p.activeIngredient && p.activeIngredient.trim()) {
      const full = p.activeIngredient.trim();
      counts[full] = (counts[full] || 0) + 1;

      // Also index individual components when multiple ingredients exist
      const parts = full.split(/[,+/]/).map((s) => s.trim()).filter(Boolean);
      if (parts.length > 1) {
        parts.forEach((part) => {
          if (part !== full && part.length > 2) {
            counts[part] = (counts[part] || 0) + 1;
          }
        });
      }
    }
  });

  return Object.entries(counts)
    .map(([ingredient, count]) => ({ ingredient, count }))
    .sort((a, b) => b.count - a.count || a.ingredient.localeCompare(b.ingredient));
}

/**
 * Extracts and counts dosage forms across product list
 */
export function extractDosageForms(products: Product[]): { form: string; count: number; config: DosageFormConfig }[] {
  const counts: Record<string, number> = {};

  products.forEach((p) => {
    const form = getProductDosageForm(p);
    counts[form] = (counts[form] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([form, count]) => ({
      form,
      count,
      config: getDosageFormStyle(form),
    }))
    .sort((a, b) => b.count - a.count || a.form.localeCompare(b.form, "ar"));
}
