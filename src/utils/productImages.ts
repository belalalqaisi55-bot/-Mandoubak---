// Utility for product images, stock pharmacy presets, and visual fallbacks

export interface ProductImagePreset {
  id: string;
  label: string;
  category: string;
  url: string;
  description: string;
}

export const PHARMACEUTICAL_IMAGE_PRESETS: ProductImagePreset[] = [
  {
    id: "capsules-blister",
    label: "كبسولات وأشرطة دوائية",
    category: "مضادات حيوية",
    url: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80",
    description: "كبسولات علاجية في شريط دوائي طبي"
  },
  {
    id: "tablets-bottle",
    label: "عبوة أقراص طبية",
    category: "مسكنات ومضادات حمى",
    url: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=600&auto=format&fit=crop&q=80",
    description: "عبوة حبوب وأقراص طبية علاجية"
  },
  {
    id: "syrup-bottle",
    label: "شراب دوائي وزجاجة",
    category: "شراب وأدوية أطفال",
    url: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=600&auto=format&fit=crop&q=80",
    description: "زجاجة شراب طبي سائل مع معيار"
  },
  {
    id: "effervescent-tablets",
    label: "أقراص فوارة وفيتامينات",
    category: "فوار ومسكنات",
    url: "https://images.unsplash.com/photo-1550572017-ed200f5e6343?w=600&auto=format&fit=crop&q=80",
    description: "أنبوب فوار طبي سريع الذوبان"
  },
  {
    id: "antibiotics-pack",
    label: "عبوة مضاد حيوي متكامل",
    category: "مضادات حيوية",
    url: "https://images.unsplash.com/photo-1576602976047-174e57a47881?w=600&auto=format&fit=crop&q=80",
    description: "علبة دواء مضاد حيوي صيدلاني"
  },
  {
    id: "injections-vial",
    label: "أمبولات وحقن وريدية",
    category: "حقن ومحاليل",
    url: "https://images.unsplash.com/photo-1583912267670-6575ad472688?w=600&auto=format&fit=crop&q=80",
    description: "أمبولات طبية معقمة"
  },
  {
    id: "drops-spray",
    label: "قطرات وبخاخات علاجية",
    category: "مضادات الحساسية",
    url: "https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=600&auto=format&fit=crop&q=80",
    description: "قطرات وبخاخ علاجي للأنف أو العين"
  },
  {
    id: "ointment-cream",
    label: "مراهم وكريمات موضعية",
    category: "مستحضرات جلدية",
    url: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop&q=80",
    description: "أنبوب مرهم علاجي معقم"
  }
];

export function getProductDisplayImage(product?: { image?: string; imageUrl?: string; category?: string; name?: string }): string {
  if (product?.image && product.image.trim()) {
    return product.image;
  }
  if (product?.imageUrl && product.imageUrl.trim()) {
    return product.imageUrl;
  }

  // Fallback by category or name keywords
  const cat = (product?.category || "").toLowerCase();
  const name = (product?.name || "").toLowerCase();

  if (cat.includes("شراب") || name.includes("شراب") || name.includes("syrup")) {
    return PHARMACEUTICAL_IMAGE_PRESETS[2].url; // syrup
  }
  if (cat.includes("فوار") || name.includes("فوار") || name.includes("effervescent")) {
    return PHARMACEUTICAL_IMAGE_PRESETS[3].url; // effervescent
  }
  if (cat.includes("حساسية") || name.includes("ألريد") || name.includes("allerid")) {
    return PHARMACEUTICAL_IMAGE_PRESETS[6].url; // allergy drops/tablets
  }
  if (cat.includes("مضاد") || cat.includes("حيوي") || name.includes("سيبلوكس") || name.includes("ciplox")) {
    return PHARMACEUTICAL_IMAGE_PRESETS[0].url; // capsules
  }
  if (cat.includes("مسكن") || name.includes("بارفيز") || name.includes("ريفانين")) {
    return PHARMACEUTICAL_IMAGE_PRESETS[1].url; // tablets
  }
  if (cat.includes("معدة") || name.includes("لانSEC") || name.includes("lansec")) {
    return PHARMACEUTICAL_IMAGE_PRESETS[4].url; // pack
  }

  return PHARMACEUTICAL_IMAGE_PRESETS[0].url;
}
