export type UserRole = "rep" | "pharmacy" | "doctor" | "admin";
export type UserStatus = "approved" | "pending_approval" | "suspended" | "rejected";
export type SyncStatus = "synced" | "pending_sync" | "failed_sync";

export interface SyncQueueItem {
  id: string;
  entityType: "order" | "stockReport" | "visit" | "agreement" | "complaint";
  action: "create" | "update" | "delete";
  data: any;
  createdAt: string;
  retryCount: number;
  lastError?: string;
  status: "pending" | "processing" | "failed" | "completed";
  priority?: number; // 1 = High (Orders), 2 = Medium (Stock Updates), 3 = Normal
}

export interface OfflineSyncStats {
  ordersCount: number;
  pendingOrdersCount: number;
  stockReportsCount: number;
  pendingStockReportsCount: number;
  productsCount: number;
  lastSyncTime: string | null;
  isOnline: boolean;
}

export interface KeepNote {
  id: string;
  title: string;
  content: string;
  color: string; // 'yellow' | 'green' | 'blue' | 'pink' | 'purple' | 'slate'
  isPinned: boolean;
  isArchived: boolean;
  labels: string[];
  checklist?: { id: string; text: string; completed: boolean }[];
  clientId?: string;
  clientName?: string;
  clientEntityName?: string;
  updatedAt: string;
  createdAt?: string;
}

export interface User {
  id: string;
  phone: string;
  name: string;
  role: UserRole;
  email?: string;
  entityName?: string; // Pharmacy or clinic name
  location?: string;
  notes?: string;
  avatar?: string;
  isApproved?: boolean;
  status?: UserStatus;
  confirmationCode?: string;
  password?: string;
  deviceRegistered?: boolean;
  createdAt: string;
}

export interface AppSettings {
  requireApprovalForNewClients: boolean;
  requireApprovalForNewAccounts: boolean;
  singlePhonePerDevice: boolean;
  autoApproveKnownNumbers: boolean;
  enableVisitTracking?: boolean;
  drProfileAvatar?: string;
  productCategories?: string[];
  categoryColors?: Record<string, string>;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  price: string;
  unit: string;
  bonus?: string;
  image?: string;
  imageUrl?: string;
  qrCode?: string;
  barcode?: string;
  activeIngredient?: string;
  dosageForm?: string;
  createdAt?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  addedAt?: string;
}

export interface StockReport {
  id: string;
  clientId: string;
  clientName: string;
  entityName: string;
  productId: string;
  productName: string;
  remainingQty: number;
  reportedAt: string;
  syncStatus?: SyncStatus;
  syncedAt?: string;
  syncError?: string;
  isCritical?: boolean;
  isWarning?: boolean;
  urgencyLevel?: "critical" | "warning" | "normal";
  criticalAlertThreshold?: number;
  repNotes?: string;
  auditedByRepId?: string;
  auditedByRepName?: string;
  clientPhone?: string;
  location?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: string;
}

export interface Order {
  id: string;
  clientId: string;
  clientName: string;
  entityName: string;
  items: OrderItem[];
  status: "pending" | "approved" | "completed" | "cancelled";
  createdAt: string;
  notes?: string;
  syncStatus?: SyncStatus;
  syncedAt?: string;
  syncError?: string;
  isArchived?: boolean;
  archivedAt?: string;
  completedAt?: string;
}

export interface VisitTask {
  id: string;
  taskText: string;
  completed: boolean;
}

export interface Visit {
  id: string;
  clientId: string;
  clientName: string;
  entityName: string;
  repId?: string;
  repName?: string;
  visitDate: string;
  notes: string;
  summary?: string;
  tasks?: VisitTask[];
  status?: "scheduled" | "completed" | "in_progress" | "cancelled";
  createdAt: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "broadcast" | "target";
  targetClientId?: string;
  targetClientName?: string;
  sentVia?: "cloud_function" | "system" | "manual";
  deliveryStatus?: "sent" | "delivered" | "queued";
  createdAt: string;
  isArchived?: boolean;
  archivedAt?: string;
}

export type AgreementType = "bonus" | "samples" | "gift_support" | "discount_terms" | "other";
export type AgreementStatus = "pending" | "delivered" | "cancelled";

export interface Agreement {
  id: string;
  clientId: string;
  clientName: string;
  entityName: string;
  clientPhone?: string;
  type: AgreementType;
  typeLabel?: string; // e.g. "بونص إضافي", "عينات مجانية"
  details: string; // Original agreement terms (تفاصيل الاتفاق الأصلي)
  agreementDate: string; // ISO date YYYY-MM-DD or full timestamp
  status: AgreementStatus; // "pending" | "delivered" | "cancelled"
  
  // Proof of delivery documentation (إثبات وتوثيق التسليم)
  deliveredDetails?: string; // What was delivered (ما تم تسليمه فعلياً)
  deliveredAt?: string; // Date & time delivered
  deliveredBy?: string; // Name of representative (e.g. د/ بلال القيسي)
  invoiceNumber?: string; // Invoice / delivery reference number
  invoiceAttachment?: string; // Base64 / image URL of invoice or delivery receipt
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export type ComplaintType = "complaint" | "suggestion" | "quality_issue" | "financial_bonus" | "compliment" | "other";
export type ComplaintStatus = "pending" | "in_progress" | "resolved" | "closed";
export type ComplaintPriority = "normal" | "medium" | "urgent";

export interface Complaint {
  id: string;
  clientId: string;
  clientName: string;
  entityName?: string;
  clientPhone?: string;
  clientRole?: UserRole;
  type: ComplaintType;
  typeLabel?: string;
  subject: string;
  content: string;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  isAnonymous?: boolean;
  attachment?: string;
  
  // Response / Resolution from Rep or Management
  adminReply?: string;
  repliedAt?: string;
  repliedBy?: string;
  
  createdAt: string;
  updatedAt?: string;
}

export interface PediatricDrugProfile {
  id: string;
  brandName: string;
  genericName: string;
  category: string;
  concentration: string; // e.g. "5mg/5ml" or "125mg/5ml"
  mgPerMl: number; // e.g. 1 (for 5mg/5ml) or 25 (for 125mg/5ml)
  standardDoseMgPerKgPerDay: number; // e.g. 0.25 mg/kg or 20-40 mg/kg
  dosesPerDay: number; // e.g. 2 (every 12 hrs) or 3 (every 8 hrs)
  minAgeMonths: number;
  maxDailyMg: number;
  clinicalNotes: string;
  administrationWithFood: string; // "مع أو بعد الأكل", "قبل الأكل بساعة"
}

export interface DrugInteractionItem {
  id: string;
  drugA: string;
  drugB: string;
  severity: "minor" | "moderate" | "major" | "contraindicated";
  description: string;
  recommendation: string;
}

export type MedicalSpecialty = "pharmacy" | "medicine" | "dentistry" | "nursing" | "lab" | "radiology";

export interface ExamQuestion {
  id: string;
  specialty: MedicalSpecialty;
  category: string;
  subCategory?: string;
  questionText: string;
  caseVignette?: string;
  options: { id: string; text: string }[];
  correctOptionId: string;
  explanation: string;
  highYieldPearl?: string;
  difficulty?: "easy" | "medium" | "hard";
  yearOrSource?: string;
  sourceOrganization?: string;
  referenceBook?: string;
}

export interface ExamSessionRecord {
  id: string;
  specialty: MedicalSpecialty;
  specialtyTitle: string;
  mode: "mock" | "practice" | "ai_custom";
  totalQuestions: number;
  correctAnswers: number;
  scorePercentage: number;
  passed: boolean;
  timeSpentSeconds: number;
  date: string;
}

export interface LoyaltyReward {
  id: string;
  title: string;
  pointsRequired: number;
  category: "bonus_boost" | "gift" | "marketing_support" | "voucher";
  description: string;
  icon: string;
}

export interface ExpiryStockItem {
  id: string;
  clientId: string;
  clientName: string;
  entityName: string;
  productName: string;
  batchNumber?: string;
  quantity: number;
  expiryDate: string; // YYYY-MM
  status: "reported" | "coordinator_review" | "exchanged" | "resolved";
  reportedAt: string;
  notes?: string;
}

export interface FlashBonusOffer {
  id: string;
  productName: string;
  originalBonus: string;
  flashBonus: string;
  endsAt: string; // ISO string
  minOrderQty: number;
  badge: string;
  active: boolean;
}

export interface DeviceContact {
  id?: string;
  name: string;
  phone: string;
  emails?: string[];
  entityName?: string;
  role?: "pharmacy" | "doctor";
  selected?: boolean;
}

export interface WebToApkNotificationOptions {
  title: string;
  body: string;
  channel?: string;
  image?: string;
  icon?: string;
  actions?: Array<{ id: string; label: string }>;
  tag?: string;
  data?: Record<string, any>;
}

export interface DeviceInfo {
  android?: {
    release?: string;
    buildId?: string;
    sdkInt?: number;
  };
  hardware?: {
    model?: string;
    brand?: string;
    manufacturer?: string;
  };
  runtime?: {
    batteryLevel?: number;
    isCharging?: boolean;
  };
  platform?: string;
}

export interface WebToApkInterface {
  playClick?: () => void;
  vibrate?: (durationMs?: number) => void;
  showToast?: (message: string) => void;
  share?: (text: string) => void;
  openUrl?: (url: string) => void;
  exitApp?: () => void;
  copyToClipboard?: (text: string) => void;
  listContacts?: (tag: string, count: number, offset: number) => void;
  pickContact?: (tag?: string) => void;
  notify?: (payloadJson: string) => void;
  cancelNotification?: (tag: string) => void;
  getDeviceInfo?: () => string;
  authenticateBiometricEx?: (tag: string, optionsJson: string) => void;
  authenticateBiometric?: (tag: string, promptInfoJson?: string) => void;
  canAuthenticateBiometric?: () => boolean | string;
}

declare global {
  interface Window {
    WebToApk?: WebToApkInterface;
    Android?: WebToApkInterface;
    __webToApkAuth?: Record<string, (json: string) => void>;
  }
  interface Navigator {
    contacts?: {
      select: (
        properties: Array<"name" | "tel" | "email" | "address" | "icon">,
        options?: { multiple?: boolean }
      ) => Promise<Array<{ name?: string[]; tel?: string[]; email?: string[] }>>;
      getProperties: () => Promise<string[]>;
    };
    getBattery?: () => Promise<{
      level: number;
      charging: boolean;
      addEventListener: (type: string, listener: () => void) => void;
    }>;
  }
}

export interface GeminiWebhookEvent {
  id: string;
  webhookId?: string;
  eventType: string; // "batch.succeeded" | "batch.failed" | "batch.cancelled" | "batch.expired" | string
  batchId?: string;
  model?: string;
  status: "succeeded" | "failed" | "processing" | "received" | "cancelled" | "expired";
  outputUri?: string;
  totalCount?: number;
  completedCount?: number;
  failedCount?: number;
  error?: string | null;
  payload: any;
  headers?: Record<string, string>;
  verified: boolean;
  receivedAt: string;
  summary?: string;
}


