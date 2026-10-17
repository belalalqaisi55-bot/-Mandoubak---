export const PREDEFINED_CATEGORIES: string[] = [
  "عام",
  "مضادات حيوية",
  "حقن مضاد حيوي",
  "مسكنات وخافض حرارة",
  "مسكنات ألم ومضادات التهاب",
  "أدوية المعدة والحموضة",
  "مضادات الحساسية",
  "مضادات الفطريات",
  "مضادات طفيليات مطهرة",
  "أدوية القلب والضغط",
  "أدوية السكري والغدد",
  "فيتامينات ومكملات غذائية",
  "أدوية السعال والجهاز التنفسي",
  "قطرات ومراهم عيون وأذن",
  "مستحضرات جلدية ومطهرات",
  "أدوية الطوارئ والمحاليل",
];

export const DEFAULT_CATEGORY_COLORS: Record<string, string> = {
  "عام": "#475569", // slate
  "مضادات حيوية": "#dc2626", // red
  "حقن مضاد حيوي": "#b91c1c", // deep red
  "مسكنات وخافض حرارة": "#ea580c", // orange
  "مسكنات ألم ومضادات التهاب": "#d97706", // amber
  "أدوية المعدة والحموضة": "#ca8a04", // yellow-gold
  "مضادات الحساسية": "#65a30d", // lime
  "مضادات الفطريات": "#059669", // emerald
  "مضادات طفيليات مطهرة": "#0d9488", // teal
  "أدوية القلب والضغط": "#0284c7", // light blue
  "أدوية السكري والغدد": "#2563eb", // blue
  "فيتامينات ومكملات غذائية": "#4f46e5", // indigo
  "أدوية السعال والجهاز التنفسي": "#7c3aed", // violet
  "قطرات ومراهم عيون وأذن": "#9333ea", // purple
  "مستحضرات جلدية ومطهرات": "#c026d3", // fuchsia
  "أدوية الطوارئ والمحاليل": "#e11d48", // rose
};

export const CATEGORY_PALETTE: string[] = [
  "#0d9488", // Teal
  "#0284c7", // Sky Blue
  "#2563eb", // Blue
  "#4f46e5", // Indigo
  "#7c3aed", // Violet
  "#9333ea", // Purple
  "#c026d3", // Fuchsia
  "#e11d48", // Rose
  "#dc2626", // Red
  "#ea580c", // Orange
  "#d97706", // Amber
  "#65a30d", // Lime
  "#059669", // Emerald
  "#475569", // Slate
  "#0f766e", // Dark Teal
  "#b45309", // Warm Amber
];

export function getCategoryColor(categoryName?: string, customColors?: Record<string, string>): string {
  if (!categoryName) return "#475569";
  if (customColors && customColors[categoryName]) {
    return customColors[categoryName];
  }
  if (DEFAULT_CATEGORY_COLORS[categoryName]) {
    return DEFAULT_CATEGORY_COLORS[categoryName];
  }
  // Deterministic fallback based on category name string
  let hash = 0;
  for (let i = 0; i < categoryName.length; i++) {
    hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % CATEGORY_PALETTE.length;
  return CATEGORY_PALETTE[idx];
}
