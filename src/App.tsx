import React, { useState, useEffect } from "react";
import { Product, StockReport, Order, OrderItem, User, Visit, VisitTask, Notification, AppSettings, Agreement, DeviceContact, DeviceInfo, Complaint, ComplaintStatus, ComplaintType, ComplaintPriority } from "./types";
import { DEFAULT_PRODUCTS } from "./data/defaultProducts";
import { PharmaGames } from "./components/PharmaGames";
import { QRCodeModal } from "./components/QRCodeModal";
import { GeminiChatModal } from "./components/GeminiChatModal";
import { PromoVideoModal } from "./components/PromoVideoModal";
import { AiCreativeStudioModal } from "./components/AiCreativeStudioModal";
import { AdminAnalyticsDashboard } from "./components/AdminAnalyticsDashboard";
import { AgreementsManager } from "./components/AgreementsManager";
import { ComplaintsManager } from "./components/ComplaintsManager";
import { PediatricDoseCalculator } from "./components/PediatricDoseCalculator";
import { DrugInteractionsAndMonographs } from "./components/DrugInteractionsAndMonographs";
import { PharmacyLoyaltyHub } from "./components/PharmacyLoyaltyHub";
import { FlashBonusAndStockCoordinator } from "./components/FlashBonusAndStockCoordinator";
import { MedicalExamHub } from "./components/MedicalExamHub";
import { DeviceContactsModal } from "./components/DeviceContactsModal";
import { DeviceInfoModal } from "./components/DeviceInfoModal";
import { BiometricLockScreen } from "./components/BiometricLockScreen";
import { OfflineSyncCenterModal } from "./components/OfflineSyncCenterModal";
import { GoogleMapView } from "./components/GoogleMapView";
import { UserProfileModal } from "./components/UserProfileModal";
import { CategoryManagerModal } from "./components/CategoryManagerModal";
import { OnboardingFlowModal } from "./components/OnboardingFlowModal";
import { QRScannerModal } from "./components/QRScannerModal";
import { SettingsModal } from "./components/SettingsModal";
import { DownloadApkModal } from "./components/DownloadApkModal";
import { fetchOnboardingFlow, OnboardingFlowType } from "./services/remoteConfigService";
import { ExcelDataPreview } from "./components/ExcelDataPreview";
import { PrintOrderModal } from "./components/PrintOrderModal";
import { BioscienceSkillsExplorer } from "./components/BioscienceSkillsExplorer";
import { AudioTranscriberModal } from "./components/AudioTranscriberModal";
import {
  PREDEFINED_CATEGORIES,
  DEFAULT_CATEGORY_COLORS,
  CATEGORY_PALETTE,
  getCategoryColor,
} from "./data/predefinedCategories";
import { updateUserProfile } from "./services/userProfileService";
import {
  saveOfflineOrder,
  saveOfflineStockReports,
  getOfflineOrders,
  getOfflineStockReports,
  cacheProductsOffline,
  getCachedProductsOffline,
  syncPendingWithFirebase,
  getPendingSyncCounts,
  listenToNetworkStatus,
  isDeviceOnline,
  updateOfflineOrderStatus,
  deleteOfflineOrder,
  deleteOfflineStockReport
} from "./utils/offlineSync";
import { collection, doc, getDocs, setDoc, getDoc, query, where, orderBy, deleteDoc, onSnapshot } from "firebase/firestore";
import { db, isFirebaseConfigured, signInWithGoogle, signOutUser, subscribeToAuthState } from "./firebase";
import { motion, AnimatePresence } from "motion/react";
import { ConnectionStatusIndicator } from "./components/ConnectionStatusIndicator";
import { useConnectionStatus } from "./hooks/useConnectionStatus";
import {
  Pill,
  Printer,
  CheckCircle2,
  CheckCheck,
  XCircle,
  Clock,
  Plus,
  Trash2,
  Check,
  ShoppingCart,
  MapPin,
  RefreshCw,
  LogOut,
  Search,
  SlidersHorizontal,
  PlusCircle,
  FileSpreadsheet,
  Users,
  Inbox,
  TrendingDown,
  AlertCircle,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Wand2,
  Lock,
  Unlock,
  UserX,
  Sparkles,
  Bell,
  ClipboardList,
  Calendar,
  Phone,
  Building,
  User as UserIcon,
  X,
  Upload,
  BookOpen,
  Trophy,
  Gamepad2,
  Download,
  Menu,
  ChevronLeft,
  ChevronRight,
  PanelRight,
  Layers,
  LayoutDashboard,
  Edit,
  UserCheck,
  Settings,
  Info,
  HardDrive,
  Globe,
  ExternalLink,
  QrCode,
  Copy,
  Share2,
  BarChart2,
  BarChart3,
  Hourglass,
  PauseCircle,
  Minus,
  LayoutGrid,
  MessageCircle,
  MessageSquare,
  MessageSquareHeart,
  PhoneCall,
  Table as TableIcon,
  Smartphone,
  Fingerprint,
  FileCheck2,
  Cloud,
  CloudUpload,
  Database,
  Calculator,
  Star,
  Zap,
  GraduationCap,
  Wifi,
  WifiOff,
  Camera,
  Tags,
  Palette,
  Eye,
  Mic,
  Volume2,
  FlaskConical
} from "lucide-react";
import {
  initNativeInteractions,
  nativePlayClick,
  nativeVibrate,
  nativeSuccessFeedback,
  nativeShowToast,
  nativeSendNotification,
  initNativeNotificationListener,
  isRunningInWebToApk,
  getNativeDeviceInfo,
  isBiometricSupported,
  authenticateBiometricNative
} from "./utils/nativeBridge";


export const cleanArabicPhone = (phoneStr: string) => {
  if (!phoneStr) return "";
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  let s = String(phoneStr).trim();
  for (let i = 0; i < 10; i++) {
    s = s.replaceAll(arabicDigits[i], String(i));
    s = s.replaceAll(persianDigits[i], String(i));
  }
  return s.replace(/\D/g, "");
};

// Permanent single official live application URL (الرابط الرسمي والوحيد المعتمد للتطبيق)
export const OFFICIAL_APP_URL = "https://ais-pre-oqwx6mdzcwvrhadryzbxjt-13849160368.europe-west1.run.app";

function getAppLiveUrl(): string {
  // Always and strictly return the single official verified application link
  return OFFICIAL_APP_URL;
}

function getAppDisplayDomain(): string {
  return "ais-pre-oqwx6mdzcwvrhadryzbxjt-13849160368.europe-west1.run.app";
}

function formatWhatsAppPhone(phoneStr: string): string {
  if (!phoneStr) return "";
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  let s = String(phoneStr);
  for (let i = 0; i < 10; i++) {
    s = s.replaceAll(arabicDigits[i], String(i));
    s = s.replaceAll(persianDigits[i], String(i));
  }
  let digits = s.replace(/\D/g, "");
  if (digits.startsWith("0")) {
    digits = "967" + digits.substring(1);
  } else if (digits.length === 9 && digits.startsWith("7")) {
    digits = "967" + digits;
  }
  return digits;
}

function SidebarNavItem({
  icon,
  label,
  active,
  badge,
  badgeColor,
  onClick,
  collapsed,
  highlight,
  id,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  badge?: number | string;
  badgeColor?: string;
  onClick: () => void;
  collapsed?: boolean;
  highlight?: boolean;
  id?: string;
}) {
  return (
    <button
      onClick={onClick}
      id={id}
      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
        active
          ? "bg-gradient-to-r from-teal-800 to-emerald-900 text-white shadow-sm shadow-teal-900/15 border border-teal-700/50 ring-1 ring-teal-500/30"
          : highlight
          ? "bg-amber-50/90 text-amber-950 border border-amber-200 hover:bg-amber-100/80 shadow-2xs"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
      title={label}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="shrink-0">{icon}</span>
        {!collapsed && <span className="truncate">{label}</span>}
      </div>

      {!collapsed && badge !== undefined && (
        <span
          className={`rounded-full px-1.5 py-0.2 text-4xs font-black shrink-0 ${
            badgeColor || "bg-teal-100 text-teal-800"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

const drBelalProfileImg = "/dr-belal.jpg";

export default function App() {
  const { latency } = useConnectionStatus();
  // Dr. Belal Profile Avatar state
  const [drProfileAvatar, setDrProfileAvatar] = useState<string>(() => {
    try {
      return localStorage.getItem("mandoubak_dr_avatar") || drBelalProfileImg;
    } catch {
      return drBelalProfileImg;
    }
  });

  const [isAudioTranscriberOpen, setIsAudioTranscriberOpen] = useState(false);
  const [showBioscienceExplorer, setShowBioscienceExplorer] = useState(false);

  const handleUploadCustomAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target?.result as string;
        if (base64) {
          setDrProfileAvatar(base64);
          try {
            localStorage.setItem("mandoubak_dr_avatar", base64);
          } catch {}

          try {
            await fetch("/api/settings", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ drProfileAvatar: base64 })
            });
          } catch {}

          if (isFirebaseConfigured && db) {
            try {
              await setDoc(doc(db, "settings", "app_config"), { drProfileAvatar: base64 }, { merge: true });
            } catch (err) {
              console.warn("Error updating avatar in Firestore:", err);
            }
          }
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.warn("Avatar upload failed:", err);
    }
  };

  const handleResetCustomAvatar = async () => {
    setDrProfileAvatar(drBelalProfileImg);
    try {
      localStorage.removeItem("mandoubak_dr_avatar");
    } catch {}

    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drProfileAvatar: "" })
      });
    } catch {}

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, "settings", "app_config"), { drProfileAvatar: "" }, { merge: true });
      } catch (err) {
        console.warn("Error resetting avatar in Firestore:", err);
      }
    }
  };

  // Authentication states
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem("mandoubak_user");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object" && parsed.id) {
          // Admin / Rep account is always fully authenticated and approved
          const isBelalAdmin = 
            parsed.role === "rep" || 
            parsed.role === "admin" ||
            (parsed.email && parsed.email.toLowerCase().includes("belalalqaisi55")) ||
            (parsed.phone && parsed.phone.includes("776600049"));

          if (isBelalAdmin) {
            return {
              ...parsed,
              role: "rep",
              email: parsed.email || "belalalqaisi55@gmail.com",
              isApproved: true,
              status: "approved"
            };
          }
          // Block unapproved or suspended users from auto-login
          if (parsed.isApproved === false || parsed.status === "pending_approval" || parsed.status === "suspended") {
            return null;
          }
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Error reading mandoubak_user from localStorage", e);
    }
    return null;
  });


  const [googleUser, setGoogleUser] = useState<any>(null);

  useEffect(() => {
    fetch('/api/me')
      .then(res => res.json())
      .then(data => setGoogleUser(data.user))
      .catch(() => setGoogleUser(null));
  }, []);

  // User Confirmation & Access Control States
  const [pendingApprovalUser, setPendingApprovalUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem("mandoubak_user");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object" && (parsed.isApproved === false || parsed.status === "pending_approval")) {
          return parsed;
        }
      }
    } catch (e) {}
    return null;
  });
  const [confirmationCodeInput, setConfirmationCodeInput] = useState("");
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isCheckingApprovalStatus, setIsCheckingApprovalStatus] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings>({
    requireApprovalForNewClients: true,
    singlePhonePerDevice: true,
    autoApproveKnownNumbers: true,
    enableVisitTracking: true
  });
  const [clientApprovalFilter, setClientApprovalFilter] = useState<"all" | "pending" | "approved" | "suspended">("all");

  // Automatically persist user session to localStorage whenever user state updates
  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem("mandoubak_user", JSON.stringify(user));
      } else {
        localStorage.removeItem("mandoubak_user");
      }
    } catch (e) {
      console.warn("Error syncing user session to localStorage", e);
    }
  }, [user]);

  // Firebase Auth listener for persistent Google Sign-In & Firestore synchronization
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const unsubscribe = subscribeToAuthState(async (firebaseUser) => {
      if (firebaseUser) {
        const userEmail = (firebaseUser.email || "").toLowerCase().trim();
        const isRep = userEmail === "belalalqaisi55@gmail.com" || userEmail.startsWith("belalalqaisi55") || userEmail.includes("belalalqaisi");
        
        // If current state user already matches, no need to overwrite
        if (user && (user.id === firebaseUser.uid || (isRep && user.role === "rep"))) {
          return;
        }

        // Try reading Firestore user record to keep track of user data with Firestore
        try {
          if (db) {
            const userDocRef = doc(db, "users", isRep ? "u_rep" : firebaseUser.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
              const fireData = userDocSnap.data() as User;
              setUser(fireData);
              return;
            }
          }
        } catch (fsErr) {
          console.warn("Firestore fetch notice for Google Auth user:", fsErr);
        }
      }
    });

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [regForm, setRegForm] = useState({
    name: "",
    role: "pharmacy" as "pharmacy" | "doctor" | "rep",
    entityName: "",
    location: "",
  });

  // Navigation state
  const [activeTab, setActiveTab] = useState<"sheet" | "history" | "reports" | "visits" | "notifications" | "scientific" | "games" | "agreements" | "complaints" | "pediatric" | "loyalty" | "flash" | "exams" | "analytics" | "maps">("sheet");
  const [repTab, setRepTab] = useState<"orders" | "inventory" | "catalog" | "clients" | "visits" | "notifications" | "scientific" | "games" | "agreements" | "complaints" | "pediatric" | "loyalty" | "flash" | "exams" | "analytics" | "maps">("orders");
  const [visitViewMode, setVisitViewMode] = useState<"list" | "map">("list");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Client 3-Screen Wizard & UI States (specialized pharmacist & physician tools)
  const [clientScreenStep, setClientScreenStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8>(2);
  const [disclaimerAgreed, setDisclaimerAgreed] = useState(false);
  const [showBonusPriceModal, setShowBonusPriceModal] = useState(false);
  const [selectedBonusProduct, setSelectedBonusProduct] = useState<Product | null>(null);
  const [agreedTermsNotes, setAgreedTermsNotes] = useState(() => {
    return localStorage.getItem("mandoubak_agreed_terms") || "تنسيق توريد مباشر وتوفير بونصات الأصناف المعتمدة مع المندوب د/ بلال القيسي.";
  });

  // Helper to format Bonus strictly as pure percentage (e.g. "10%", "20%", "40%", "100%")
  const formatBonusDisplay = (bonus?: string): string => {
    if (!bonus || !bonus.trim()) return "";
    const b = bonus.trim();
    
    // If already contains percentage e.g. "10%", "10% (10+1)", "40%"
    const pctMatch = b.match(/(\d+(?:\.\d+)?)\s*%/);
    if (pctMatch) {
      return `${pctMatch[1]}%`;
    }
    
    // Check for X+Y format like "10+1", "10+2", "10+4", "10+10", "10+1 عيني"
    const ratioMatch = b.match(/(\d+)\s*\+\s*(\d+)/);
    if (ratioMatch) {
      const buyQty = parseFloat(ratioMatch[1]);
      const freeQty = parseFloat(ratioMatch[2]);
      if (buyQty > 0) {
        const percentage = Math.round((freeQty / buyQty) * 100);
        return `${percentage}%`;
      }
    }
    
    // Check if pure number like "10" or "40"
    if (/^\d+$/.test(b)) {
      return `${b}%`;
    }
    
    return b;
  };

  // Calculate Net Price After Bonus (حساب السعر الصافي بعد نسبة البونص)
  const calculateNetPrice = (priceStr: string, bonusStr?: string) => {
    if (!priceStr) return { netPrice: 0, originalPrice: 0, bonusText: "-", netFormatted: "-", originalFormatted: "-" };
    
    const numMatches = priceStr.replace(/,/g, "").match(/\d+(\.\d+)?/);
    const originalPrice = numMatches ? parseFloat(numMatches[0]) : 0;
    if (originalPrice === 0) {
      return { netPrice: 0, originalPrice: 0, bonusText: bonusStr ? `البونص ${formatBonusDisplay(bonusStr)}` : "-", netFormatted: priceStr, originalFormatted: priceStr };
    }

    let effectiveFactor = 1;
    if (bonusStr) {
      const b = bonusStr.trim().toLowerCase();
      const ratioMatch = b.match(/(\d+)\s*\+\s*(\d+)/);
      const percentMatch = b.match(/(\d+(?:\.\d+)?)\s*%/);
      if (ratioMatch) {
        const buyQty = parseFloat(ratioMatch[1]);
        const freeQty = parseFloat(ratioMatch[2]);
        if (buyQty > 0 && freeQty >= 0) {
          effectiveFactor = buyQty / (buyQty + freeQty);
        }
      } else if (percentMatch) {
        const pct = parseFloat(percentMatch[1]);
        if (pct > 0) {
          effectiveFactor = 100 / (100 + pct);
        }
      }
    }

    const netPrice = originalPrice * effectiveFactor;
    const currencyPart = priceStr.replace(/[\d.,\s]+/g, "").trim() || "ريال";

    return {
      originalPrice,
      netPrice,
      bonusText: bonusStr ? `البونص ${formatBonusDisplay(bonusStr)}` : "بدون بونص",
      netFormatted: `${Math.round(netPrice).toLocaleString("ar-YE")} ${currencyPart}`,
      originalFormatted: `${originalPrice.toLocaleString("ar-YE")} ${currencyPart}`,
    };
  };

  // Smart Live Bonus Reward Calculation (احتساب الكميات المجانية من البونص مباشرة)
  const calculateBonusReward = (quantity: number, bonusStr?: string): {
    totalFree: number;
    qualified: boolean;
    message: string;
    nextTierTip?: string;
    neededForNext?: number;
    rewardPerThreshold?: number;
  } | null => {
    if (!bonusStr || quantity <= 0) return null;
    const b = bonusStr.trim().toLowerCase();
    const ratioMatch = b.match(/(\d+)\s*\+\s*(\d+)/);
    const percentMatch = b.match(/(\d+(?:\.\d+)?)\s*%/);

    if (ratioMatch) {
      const buyQty = parseInt(ratioMatch[1], 10);
      const freeQty = parseInt(ratioMatch[2], 10);
      if (buyQty > 0) {
        const sets = Math.floor(quantity / buyQty);
        const totalFree = sets * freeQty;
        const remainder = quantity % buyQty;
        const needed = buyQty - remainder;
        
        if (totalFree > 0) {
          return {
            totalFree,
            qualified: true,
            message: `🎉 مؤهل لبونص مجاني: +${totalFree} عبوة!`,
            nextTierTip: needed < buyQty ? `(أضف ${needed} عبوة أخرى للحصول على +${freeQty} إضافية)` : "",
            neededForNext: needed < buyQty ? needed : undefined,
            rewardPerThreshold: freeQty
          };
        } else {
          return {
            totalFree: 0,
            qualified: false,
            message: `💡 أضف ${needed} عبوة لتفعيل البونص (+${freeQty} مجاناً)!`,
            neededForNext: needed,
            rewardPerThreshold: freeQty
          };
        }
      }
    } else if (percentMatch) {
      const pct = parseFloat(percentMatch[1]);
      if (pct > 0) {
        const freeItems = Math.floor(quantity * (pct / 100));
        if (freeItems > 0) {
          return {
            totalFree: freeItems,
            qualified: true,
            message: `🎉 بونص ${pct}%: +${freeItems} عبوة مجانية!`
          };
        }
      }
    }
    return null;
  };

  // Push notification permission & tracking states
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(
    typeof window !== "undefined" && "Notification" in window ? window.Notification.permission : "default"
  );
  const [knownNotifIds, setKnownNotifIds] = useState<Set<string>>(new Set());

  // App Modals & Gemini Chat Modal States
  const [isAppQrModalOpen, setIsAppQrModalOpen] = useState(false);
  const [isGeminiChatModalOpen, setIsGeminiChatModalOpen] = useState(false);
  const [isCreativeStudioOpen, setIsCreativeStudioOpen] = useState(false);
  const [isDeviceContactsModalOpen, setIsDeviceContactsModalOpen] = useState(false);
  const [isDeviceInfoModalOpen, setIsDeviceInfoModalOpen] = useState(false);
  const [isOfflineSyncModalOpen, setIsOfflineSyncModalOpen] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isOnlineState, setIsOnlineState] = useState<boolean>(() => isDeviceOnline());
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState<boolean>(() => {
    return localStorage.getItem("mandoubak_biometric_lock") === "true";
  });
  const [isAppLocked, setIsAppLocked] = useState<boolean>(() => {
    // If biometric lock is enabled and a user exists, start locked for maximum security
    const hasUser = !!localStorage.getItem("pharma_user");
    const biometricOn = localStorage.getItem("mandoubak_biometric_lock") === "true";
    return hasUser && biometricOn;
  });

  // Scientific drug search states
  const [searchDrugQuery, setSearchDrugQuery] = useState("");
  const [scientificResult, setScientificResult] = useState<any | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderStatusFilter, setOrderStatusFilter] = useState<"all" | "pending" | "approved" | "completed" | "cancelled">("all");
  const [orderToPrint, setOrderToPrint] = useState<Order | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const handleOpenPrintInvoice = (order: Order) => {
    setOrderToPrint(order);
    setIsPrintModalOpen(true);
  };
  const [stockReports, setStockReports] = useState<StockReport[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  // Client Management States
  const [showAddClientForm, setShowAddClientForm] = useState(false);
  const [showImportForm, setShowImportForm] = useState(false);
  const [clientForm, setClientForm] = useState({
    name: "",
    phone: "",
    entityName: "",
    location: "",
    role: "pharmacy" as "pharmacy" | "doctor"
  });
  const [excelPasteText, setExcelPasteText] = useState("");
  const [showExcelPreview, setShowExcelPreview] = useState(false);
  const [importStatus, setImportStatus] = useState<any>(null);
  const [editingClient, setEditingClient] = useState<{
    id: string;
    name: string;
    phone: string;
    entityName: string;
    location: string;
    role: "pharmacy" | "doctor";
  } | null>(null);
  const [regSuccessModal, setRegSuccessModal] = useState<{
    isOpen: boolean;
    user?: User;
    waUrl?: string;
  }>({ isOpen: false });
  const [visits, setVisits] = useState<Visit[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Create visit form state
  const [newVisitForm, setNewVisitForm] = useState({
    clientId: "",
    visitDate: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [tempSummary, setTempSummary] = useState("");
  const [tempTasks, setTempTasks] = useState<VisitTask[]>([]);

  // Create notification form state
  const [newNotifForm, setNewNotifForm] = useState({
    title: "",
    message: "",
    type: "broadcast" as "broadcast" | "target",
    targetClientId: "",
  });

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("الكل");
  const [clientSearch, setClientSearch] = useState("");
  const [clientRoleFilter, setClientRoleFilter] = useState<"all" | "pharmacy" | "doctor" | "pending" | "approved" | "suspended">("all");

  // Excel Input states (mapped by productId with localStorage Auto-Save)
  const [remainingInputs, setRemainingInputs] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem("mandoubak_remaining_inputs");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") return parsed;
      }
    } catch (e) {}
    return {};
  });
  const [orderInputs, setOrderInputs] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem("mandoubak_order_inputs");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") return parsed;
      }
    } catch (e) {}
    return {};
  });
  const [productViewMode, setProductViewMode] = useState<"cards" | "table">("cards");
  const [densityMode, setDensityMode] = useState<"compact" | "normal">("compact");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  const handleToggleSelectAll = () => {
    if (selectedProductIds.length === filteredProducts.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(filteredProducts.map(p => p.id));
    }
  };

  const handleToggleSelectProduct = (productId: string) => {
    if (selectedProductIds.includes(productId)) {
      setSelectedProductIds(selectedProductIds.filter(id => id !== productId));
    } else {
      setSelectedProductIds([...selectedProductIds, productId]);
    }
  };

  const handleBulkUpdateQuantity = (qty: number) => {
    if (selectedProductIds.length === 0) {
      showError("يرجى تحديد أصناف أولاً من الجدول");
      return;
    }
    const updated = { ...orderInputs };
    selectedProductIds.forEach(id => {
      if (qty <= 0) {
        delete updated[id];
      } else {
        updated[id] = String(qty);
      }
    });
    setOrderInputs(updated);
    showSuccess(`تم تحديث كمية ${selectedProductIds.length} أصناف محددة إلى (${qty}) بنجاح`);
  };

  const handleBulkDeleteSelected = () => {
    if (selectedProductIds.length === 0) {
      showError("يرجى تحديد أصناف أولاً للحذف");
      return;
    }
    const updated = { ...orderInputs };
    selectedProductIds.forEach(id => {
      delete updated[id];
    });
    setOrderInputs(updated);
    setSelectedProductIds([]);
    showSuccess(`تم تفريغ وحذف طلبيات ${selectedProductIds.length} أصناف محددة بنجاح`);
  };

  // Auto-save remaining inventory quantities and orders to localStorage immediately on modification
  useEffect(() => {
    try {
      localStorage.setItem("mandoubak_remaining_inputs", JSON.stringify(remainingInputs));
    } catch (e) {}
  }, [remainingInputs]);

  useEffect(() => {
    try {
      localStorage.setItem("mandoubak_order_inputs", JSON.stringify(orderInputs));
    } catch (e) {}
  }, [orderInputs]);

  const handleUpdateRemaining = (productId: string, delta: number) => {
    const current = parseInt(remainingInputs[productId] || "0", 10) || 0;
    const next = Math.max(0, current + delta);
    setRemainingInputs(prev => ({ ...prev, [productId]: next === 0 && delta < 0 ? "" : next.toString() }));
  };

  const handleUpdateOrder = (productId: string, delta: number) => {
    const current = parseInt(orderInputs[productId] || "0", 10) || 0;
    const next = Math.max(0, current + delta);
    setOrderInputs(prev => ({ ...prev, [productId]: next === 0 && delta < 0 ? "" : next.toString() }));
  };

  // Low Stock report dashboard states
  const [lowStockSearch, setLowStockSearch] = useState("");
  const [lowStockFilter, setLowStockFilter] = useState<"all" | "critical" | "warning">("all");
  const [lowStockSort, setLowStockSort] = useState<"severity" | "recent">("severity");
  const [quickRestockItem, setQuickRestockItem] = useState<StockReport | null>(null);
  const [quickRestockQty, setQuickRestockQty] = useState("");

  // Catalog manager input (for representative)
  const [newProductForm, setNewProductForm] = useState({
    name: "",
    description: "",
    category: "عام",
    price: "",
    bonus: "",
    unit: "علبة",
  });

  // Product categories management
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("mandoubak_product_categories");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {}
    return PREDEFINED_CATEGORIES;
  });

  const [categoryColors, setCategoryColors] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem("mandoubak_category_colors");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          return { ...DEFAULT_CATEGORY_COLORS, ...parsed };
        }
      }
    } catch (e) {}
    return DEFAULT_CATEGORY_COLORS;
  });

  // UI feedback states
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [isPromoVideoOpen, setIsPromoVideoOpen] = useState(false);
  const [isDrProfileModalOpen, setIsDrProfileModalOpen] = useState(false);
  const [isUserProfileModalOpen, setIsUserProfileModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isDownloadApkModalOpen, setIsDownloadApkModalOpen] = useState(false);
  
  // Firebase Remote Config A/B Testing Onboarding States
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(() => {
    // Show onboarding if first time visit or explicitly invoked
    return !localStorage.getItem("mandoubak_onboarding_completed");
  });
  const [remoteConfigFlow, setRemoteConfigFlow] = useState<OnboardingFlowType>("standard");

  // QR Code & Barcode Camera Scanner Modal State
  const [isQRScannerModalOpen, setIsQRScannerModalOpen] = useState<boolean>(false);

  // Cloud & LocalStorage Synchronization States
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [isSyncing, setIsSyncing] = useState(false);

  const triggerSyncToast = (_customMessage?: string, _isError: boolean = false) => {
    // Keep background synchronization silent without popups
    setLastSyncTime(new Date());
  };

  // In-App Confirmation Modal (Safe for iframes & mobile webviews)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    confirmLabel: "تأكيد",
    cancelLabel: "تراجع",
    isDestructive: false,
    onConfirm: () => {},
  });

  const askConfirmation = (options: {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }) => {
    setConfirmDialog({
      isOpen: true,
      title: options.title,
      message: options.message,
      confirmLabel: options.confirmLabel || "تأكيد الإجراء",
      cancelLabel: options.cancelLabel || "تراجع",
      isDestructive: options.isDestructive !== false,
      onConfirm: options.onConfirm,
    });
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    nativeSuccessFeedback();
    nativeShowToast(msg);
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    nativeVibrate(60);
    setTimeout(() => setErrorMsg(""), 4000);
  };


  // Administrator Authorization - Exclusively Dr. Belal Alqaisi
  const isBelalAdmin = Boolean(
    user && (
      user.role === "rep" || 
      user.role === "admin" ||
      (user.email && (user.email.toLowerCase().includes("belalalqaisi55") || user.email.toLowerCase().includes("belalqaisi55"))) ||
      (user.phone && user.phone.includes("776600049"))
    )
  );

  // Safe client-side image compression to prevent localStorage & Firestore quota errors
  const compressAvatarImage = (file: File, maxWidth = 500, quality = 0.82): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxWidth) {
              width = Math.round((width * maxWidth) / height);
              height = maxWidth;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };


  // Enable global WebToApk & Android click sound, haptic interactions & notification action routing
  useEffect(() => {
    const cleanupInteractions = initNativeInteractions();
    
    // Listen for notification button clicks (e.g. from Android Notification Drawer)
    const cleanupNotifActions = initNativeNotificationListener((actionId, tag) => {
      console.log("Native notification action received:", actionId, tag);
      if (actionId === "track_order" || actionId === "view_orders" || actionId === "view_history") {
        setActiveTab("history");
        setRepTab("orders");
      } else if (actionId === "view_sheet" || actionId === "new_order") {
        setActiveTab("sheet");
      } else if (actionId === "view_visits") {
        setActiveTab("visits");
        setRepTab("visits");
      } else if (actionId === "view_agreements") {
        setActiveTab("agreements");
      } else if (actionId === "view_complaints") {
        setActiveTab("complaints");
        setRepTab("complaints");
      } else if (actionId === "view_clients") {
        setActiveTab("clients");
        setRepTab("clients");
      } else if (actionId === "view_reports") {
        setActiveTab("reports");
        setRepTab("reports");
      }
    });

    return () => {
      cleanupInteractions();
      cleanupNotifActions();
    };
  }, []);

  // Fetch device hardware info once on mount (no continuous CPU-draining polling)
  useEffect(() => {
    const loadDeviceInfo = async () => {
      try {
        const info = await getNativeDeviceInfo();
        setDeviceInfo(info);
      } catch (e) {
        console.debug("Device info init:", e);
      }
    };
    loadDeviceInfo();
  }, []);

  // Listen to network status & offline queue counts
  useEffect(() => {
    // Initial pending sync check
    getPendingSyncCounts().then((counts) => {
      setPendingSyncCount(counts.total);
    });

    // Listen to network status changes (online / offline)
    const cleanupNetwork = listenToNetworkStatus((online) => {
      setIsOnlineState(online);
      if (online) {
        // Auto sync with Firebase and backend upon reconnection
        syncPendingWithFirebase(db, (msg) => {
          console.log("Auto-syncing to cloud:", msg);
        }).then((res) => {
          if (res.syncedCount > 0) {
            showSuccess(`تمت المزامنة السحابية التلقائية بنجاح (${res.syncedCount} عنصر تم رفعه) ☁️✓`);
            fetchUserSpecificData(true);
            getPendingSyncCounts().then((c) => setPendingSyncCount(c.total));
          }
        });
      } else {
        nativeVibrate(40);
        triggerSyncToast("أنت الآن في وضع عدم الاتصال - سيتم حفظ البيانات في IndexedDB 💾");
      }
    });

    return () => {
      cleanupNetwork();
    };
  }, []);

  // Fetch initial data & subscribe to real-time settings / avatar sync
  useEffect(() => {
    fetchProducts();
    fetchAllRegisteredUsers();
    fetchAppSettings();
    if (user) {
      fetchUserSpecificData();
    }

    // Real-time synchronization of Dr. Belal's profile avatar across all open devices and links
    let unsubscribeSettings: (() => void) | null = null;
    let unsubscribeOrders: (() => void) | null = null;
    let unsubscribeStockReports: (() => void) | null = null;

    if (isFirebaseConfigured && db) {
      try {
        unsubscribeSettings = onSnapshot(doc(db, "settings", "app_config"), (snap) => {
          if (snap.exists()) {
            const snapData = snap.data() as AppSettings;
            if (snapData && snapData.drProfileAvatar) {
              setDrProfileAvatar(snapData.drProfileAvatar);
              try {
                localStorage.setItem("mandoubak_dr_avatar", snapData.drProfileAvatar);
              } catch (e) {}
            } else if (snapData && snapData.drProfileAvatar === "") {
              setDrProfileAvatar(drBelalProfileImg);
              try {
                localStorage.removeItem("mandoubak_dr_avatar");
              } catch (e) {}
            }

            // Real-time synchronization of product categories
            if (snapData && snapData.productCategories && Array.isArray(snapData.productCategories) && snapData.productCategories.length > 0) {
              setAvailableCategories(snapData.productCategories);
              try {
                localStorage.setItem("mandoubak_product_categories", JSON.stringify(snapData.productCategories));
              } catch (e) {}
            }

            // Real-time synchronization of category colors
            if (snapData && snapData.categoryColors && typeof snapData.categoryColors === "object") {
              setCategoryColors((prev) => {
                const merged = { ...prev, ...snapData.categoryColors };
                try {
                  localStorage.setItem("mandoubak_category_colors", JSON.stringify(merged));
                } catch (e) {}
                return merged;
              });
            }
          }
        }, (err) => {
          console.warn("Settings realtime sync notice:", err.message);
        });

        // Real-time synchronization of orders
        unsubscribeOrders = onSnapshot(collection(db, "orders"), (snap) => {
          const ordersList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
          setOrders(ordersList);
          try {
            localStorage.setItem("mandoubak_local_orders", JSON.stringify(ordersList));
          } catch (e) {}
        });

        // Real-time synchronization of stock reports
        unsubscribeStockReports = onSnapshot(collection(db, "stockReports"), (snap) => {
          const reportsList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as StockReport));
          setStockReports(reportsList);
          try {
            localStorage.setItem("mandoubak_local_stock_reports", JSON.stringify(reportsList));
          } catch (e) {}
        });

      } catch (e) {}
    }

    return () => {
      if (unsubscribeSettings) unsubscribeSettings();
      if (unsubscribeOrders) unsubscribeOrders();
      if (unsubscribeStockReports) unsubscribeStockReports();
    };
  }, [user]);

  // Fetch Firebase Remote Config for A/B Testing Onboarding Flow
  useEffect(() => {
    fetchOnboardingFlow().then((flow) => {
      setRemoteConfigFlow(flow);
    }).catch(() => {
      setRemoteConfigFlow("standard");
    });
  }, []);

  // Merge any distinct product categories from catalog products into availableCategories
  useEffect(() => {
    if (products && products.length > 0) {
      const existingProductCategories = products.map((p) => p.category).filter(Boolean);
      setAvailableCategories((prev) => {
        const combined = Array.from(new Set([...prev, ...existingProductCategories]));
        if (combined.length !== prev.length) {
          try {
            localStorage.setItem("mandoubak_product_categories", JSON.stringify(combined));
          } catch (e) {}
          return combined;
        }
        return prev;
      });
    }
  }, [products]);

  // Handle Quick Biometric Fingerprint / Face ID Login
  const handleQuickBiometricLogin = async () => {
    nativePlayClick();
    nativeVibrate(40);
    setLoading(true);

    try {
      const res = await authenticateBiometricNative({
        title: "تسجيل الدخول السريع بالبصمة 🔐",
        subtitle: "المس مستشعر البصمة للدخول المباشر إلى حسابك",
        allowDeviceCredential: true,
      });

      if (res.success) {
        // 1. Try saved user from localStorage
        const savedUserStr = localStorage.getItem("pharma_user");
        if (savedUserStr) {
          try {
            const parsed = JSON.parse(savedUserStr);
            if (parsed && parsed.phone) {
              setUser(parsed);
              showSuccess(`مرحباً بعودتك، ${parsed.name}! 🔐✓`);
              return;
            }
          } catch (e) {}
        }

        // 2. Try bound device phone if registered
        const boundPhone = localStorage.getItem("mandoubak_bound_phone");
        if (boundPhone && registeredUsers.length > 0) {
          const match = registeredUsers.find((u) => u.phone === boundPhone);
          if (match) {
            setUser(match);
            localStorage.setItem("pharma_user", JSON.stringify(match));
            showSuccess(`مرحباً ${match.name}! تم الدخول بالبصمة بنجاح 🔐✓`);
            return;
          }
        }

        // 3. Fallback to primary rep or default approved user
        const primaryUser = registeredUsers.find((u) => u.role === "rep") || registeredUsers[0];
        if (primaryUser) {
          setUser(primaryUser);
          localStorage.setItem("pharma_user", JSON.stringify(primaryUser));
          showSuccess(`مرحباً ${primaryUser.name}! تم التحقق بالبصمة 🔐✓`);
        } else {
          const defaultRep: User = {
            id: "u_rep_master",
            name: "د/ بلال القيسي (المندوب الطبي)",
            phone: "776600049",
            role: "rep",
            entityName: "شركة العالمية للأدوية",
            location: "صنعاء / اليمن",
            isApproved: true,
            status: "approved",
            createdAt: new Date().toISOString(),
          };
          setUser(defaultRep);
          localStorage.setItem("pharma_user", JSON.stringify(defaultRep));
          showSuccess(`مرحباً د/ بلال القيسي! تم التحقق بالبصمة 🔐✓`);
        }
      } else if (!res.cancelled) {
        showError(res.error || "فشل التحقق من البصمة");
      }
    } catch (err: any) {
      showError("حدث خطأ أثناء الاتصال بمستشعر البصمة");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBiometricLock = async () => {
    nativePlayClick();
    if (!isBiometricEnabled) {
      const res = await authenticateBiometricNative({
        title: "تفعيل قفل البصمة 🔒",
        subtitle: "يرجى مسح البصمة لتأكيد الحماية والأمان",
      });
      if (res.success) {
        setIsBiometricEnabled(true);
        localStorage.setItem("mandoubak_biometric_lock", "true");
        showSuccess("تم تفعيل القفل ببصمة الإصبع بنجاح! 🔒✓");
      } else if (!res.cancelled) {
        showError(res.error || "تعذر تفعيل البصمة");
      }
    } else {
      setIsBiometricEnabled(false);
      localStorage.setItem("mandoubak_biometric_lock", "false");
      showSuccess("تم إيقاف القفل بالبصمة");
    }
  };

  // Auto-polling for real-time background notifications & data updates (smart visibility aware)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return; // Don't burn CPU/battery when phone is locked or tab is in background
      }
      fetchUserSpecificData(true);
    }, 45000); // Efficient 45s interval
    return () => clearInterval(interval);
  }, [user]);

  const requestDeviceNotificationPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      showError("المتصفح أو الجهاز الحالي لا يدعم ميزة إشعارات النظام المباشرة");
      return;
    }
    try {
      const perm = await window.Notification.requestPermission();
      setPushPermission(perm);
      if (perm === "granted") {
        showSuccess("تم تفعيل وتخويل إشعارات النظام على هاتفك بنجاح! 🔔");
        try {
          new window.Notification("تطبيق مندوبك الطبي 👨‍⚕️", {
            body: "تم تفعيل التنبيهات الفورية بنجاح. ستصلك الإشعارات والعروض على شاشة هاتفك فور إرسالها.",
            icon: "/favicon.ico",
          });
        } catch (err) {
          console.error("Notification trigger error:", err);
        }
      } else if (perm === "denied") {
        showError("تم حظر الإشعارات من إعدادات المتصفح. يرجى تفعيل السماح بالإشعارات من إعدادات الموقع في المتصفح");
      }
    } catch (e) {
      console.error("Error requesting notification permission:", e);
    }
  };

  const fetchProducts = async () => {
    try {
      let loaded: Product[] = [];
      
      // 1. Prioritize Firestore
      if (isFirebaseConfigured && db) {
        try {
          const snapshot = await getDocs(collection(db, "products"));
          const fsProducts = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Product));
          if (fsProducts.length > 0) loaded = fsProducts;
        } catch (fsErr) {
          console.warn("Firestore products fetch:", fsErr);
        }
      }

      // 2. Check IndexedDB/LocalStorage for offline/cached products
      if (loaded.length === 0) {
        try {
          const idbProds = await getCachedProductsOffline();
          if (Array.isArray(idbProds) && idbProds.length > 0) {
            loaded = idbProds;
          }
        } catch (e) {}
      }

      // 3. Fallback to API if still empty
      if (loaded.length === 0) {
        try {
          const r = await fetch("/api/products");
          const ct = r.headers.get("content-type") || "";
          if (r.ok && ct.includes("application/json")) {
            const data = await r.json();
            if (Array.isArray(data) && data.length > 0) loaded = data;
          }
        } catch (e) {
          console.warn("Backend /api/products unreachable:", e);
        }
      }

      // 4. Final fallback
      if (loaded.length === 0) {
        loaded = DEFAULT_PRODUCTS;
      }

      // Normalize and cache
      const normalizedProducts = loaded.map(p => ({
        ...p,
        bonus: p.bonus ? formatBonusDisplay(p.bonus) : p.bonus
      }));

      setProducts(normalizedProducts);
      cacheProductsOffline(normalizedProducts).catch(() => {});
      try {
        localStorage.setItem("mandoubak_local_products", JSON.stringify(normalizedProducts));
      } catch (e) {}
    } catch (e) {
      console.warn("Error fetching products, loading default catalog:", e);
      setProducts(DEFAULT_PRODUCTS);
    }
  };

  const fetchUserSpecificData = async (isBackground = false, showToast = false) => {
    setIsSyncing(true);
    if (!isBackground) {
      setLoading(true);
    }
    try {
      // 1. Fetch orders (with full IndexedDB sync and fallback)
      let loadedOrders: Order[] = [];
      try {
        const ordersUrl = user?.role === "rep" ? "/api/orders" : `/api/orders?clientId=${user?.id}`;
        const rOrders = await fetch(ordersUrl);
        const ctOrders = rOrders.headers.get("content-type") || "";
        if (rOrders.ok && ctOrders.includes("application/json")) {
          const dOrders = await rOrders.json();
          if (Array.isArray(dOrders)) loadedOrders = dOrders;
        } else if (isFirebaseConfigured && db) {
          const snapshot = await getDocs(collection(db, "orders"));
          const fsOrders = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Order));
          loadedOrders = user?.role === "rep" ? fsOrders : fsOrders.filter(o => o.clientId === user?.id || (o as any).userId === user?.id);
        }
      } catch (err) {
        if (isFirebaseConfigured && db) {
          try {
            const snapshot = await getDocs(collection(db, "orders"));
            const fsOrders = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Order));
            loadedOrders = user?.role === "rep" ? fsOrders : fsOrders.filter(o => o.clientId === user?.id || (o as any).userId === user?.id);
          } catch (fsErr) {
            console.warn("Firestore orders fallback err:", fsErr);
          }
        }
      }

      // If online fetch succeeded, save all orders to IndexedDB cache
      if (loadedOrders.length > 0) {
        setOrders(loadedOrders);
        for (const ord of loadedOrders) {
          saveOfflineOrder(ord, { forcePending: false }).catch(() => {});
        }
      } else {
        // Fallback: Read directly from IndexedDB for complete offline mode!
        try {
          const offlineStored = await getOfflineOrders(user?.id, user?.role);
          if (offlineStored.length > 0) {
            setOrders(offlineStored);
          }
        } catch (idbErr) {
          console.warn("IndexedDB offline orders fallback error:", idbErr);
        }
      }

      // 2. Fetch stock reports (with full IndexedDB sync and fallback)
      let dReports: StockReport[] = [];
      try {
        const reportsUrl = user?.role === "rep" ? "/api/stock-reports" : `/api/stock-reports?clientId=${user?.id}`;
        const rReports = await fetch(reportsUrl);
        const ctReports = rReports.headers.get("content-type") || "";
        if (rReports.ok && ctReports.includes("application/json")) {
          const fetchedReports = await rReports.json();
          if (Array.isArray(fetchedReports)) {
            dReports = fetchedReports;
          }
        } else if (isFirebaseConfigured && db) {
          const snapshot = await getDocs(collection(db, "stockReports"));
          const fsReports = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StockReport));
          dReports = user?.role === "rep" ? fsReports : fsReports.filter(r => r.clientId === user?.id || (r as any).userId === user?.id);
        }
      } catch (err) {
        if (isFirebaseConfigured && db) {
          try {
            const snapshot = await getDocs(collection(db, "stockReports"));
            const fsReports = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StockReport));
            dReports = user?.role === "rep" ? fsReports : fsReports.filter(r => r.clientId === user?.id || (r as any).userId === user?.id);
          } catch (fsErr) {
            console.warn("Firestore reports fallback err:", fsErr);
          }
        }
      }

      if (dReports.length > 0) {
        setStockReports(dReports);
        saveOfflineStockReports(dReports, { forcePending: false }).catch(() => {});
        if (user?.role !== "rep") {
          const initialRem: Record<string, string> = {};
          dReports.forEach((rep: StockReport) => {
            initialRem[rep.productId] = String(rep.remainingQty);
          });
          setRemainingInputs((prev) => (Object.keys(prev).length === 0 ? initialRem : prev));
        }
      } else {
        // Fallback: Read stock reports directly from IndexedDB
        try {
          const offlineReports = await getOfflineStockReports(user?.id, user?.role);
          if (offlineReports.length > 0) {
            setStockReports(offlineReports);
            if (user?.role !== "rep") {
              const initialRem: Record<string, string> = {};
              offlineReports.forEach((rep: StockReport) => {
                initialRem[rep.productId] = String(rep.remainingQty);
              });
              setRemainingInputs((prev) => (Object.keys(prev).length === 0 ? initialRem : prev));
            }
          }
        } catch (idbErr) {
          console.warn("IndexedDB offline stock reports fallback error:", idbErr);
        }
      }

      // 3. Fetch visits
      try {
        const visitsUrl = user?.role === "rep" ? "/api/visits" : `/api/visits?clientId=${user?.id}`;
        const rVisits = await fetch(visitsUrl);
        const ctVisits = rVisits.headers.get("content-type") || "";
        if (rVisits.ok && ctVisits.includes("application/json")) {
          const dVisits = await rVisits.json();
          if (Array.isArray(dVisits)) setVisits(dVisits);
        } else if (isFirebaseConfigured && db) {
          const snapshot = await getDocs(collection(db, "visits"));
          const fsVisits = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Visit));
          setVisits(fsVisits);
        }
      } catch (err) {
        if (isFirebaseConfigured && db) {
          try {
            const snapshot = await getDocs(collection(db, "visits"));
            const fsVisits = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Visit));
            setVisits(fsVisits);
          } catch (fsErr) {
            console.warn("Firestore visits fallback err:", fsErr);
          }
        }
      }

      // 4. Fetch notifications
      try {
        const notifsUrl = user?.role === "rep" ? "/api/notifications" : `/api/notifications?clientId=${user?.id}`;
        const rNotifs = await fetch(notifsUrl);
        const ctNotifs = rNotifs.headers.get("content-type") || "";
        if (rNotifs.ok && ctNotifs.includes("application/json")) {
          const dNotifs: Notification[] = await rNotifs.json();
          if (Array.isArray(dNotifs)) {
            setNotifications(dNotifs);
          }
        } else if (isFirebaseConfigured && db) {
          const snapshot = await getDocs(collection(db, "notifications"));
          const fsNotifs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Notification));
          setNotifications(fsNotifs);
        }
      } catch (err) {
        if (isFirebaseConfigured && db) {
          try {
            const snapshot = await getDocs(collection(db, "notifications"));
            const fsNotifs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Notification));
            setNotifications(fsNotifs);
          } catch (fsErr) {
            console.warn("Firestore notifications fallback err:", fsErr);
          }
        }
      }

      // 5. Fetch registered users for representative
      if (user?.role === "rep") {
        fetchAllRegisteredUsers();
      }

      // 6. Fetch agreements
      try {
        const agreementsUrl = user?.role === "rep" ? "/api/agreements" : `/api/agreements?clientId=${user?.id}`;
        const rAgreements = await fetch(agreementsUrl);
        const ctAgreements = rAgreements.headers.get("content-type") || "";
        if (rAgreements.ok && ctAgreements.includes("application/json")) {
          const dAgreements: Agreement[] = await rAgreements.json();
          if (Array.isArray(dAgreements)) {
            setAgreements(dAgreements);
          }
        } else if (isFirebaseConfigured && db) {
          const snapshot = await getDocs(collection(db, "agreements"));
          const fsAgreements = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Agreement));
          const filtered = user?.role === "rep"
            ? fsAgreements
            : fsAgreements.filter(a => a.clientId === user?.id || a.clientPhone === user?.phone);
          setAgreements(filtered);
        }
      } catch (err) {
        if (isFirebaseConfigured && db) {
          try {
            const snapshot = await getDocs(collection(db, "agreements"));
            const fsAgreements = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Agreement));
            const filtered = user?.role === "rep"
              ? fsAgreements
              : fsAgreements.filter(a => a.clientId === user?.id || a.clientPhone === user?.phone);
            setAgreements(filtered);
          } catch (fsErr) {
            console.warn("Firestore agreements fallback err:", fsErr);
          }
        }
      }

      // 7. Fetch complaints and suggestions
      try {
        const complaintsUrl = user?.role === "rep" ? "/api/complaints" : `/api/complaints?clientId=${user?.id}`;
        const rComplaints = await fetch(complaintsUrl);
        const ctComplaints = rComplaints.headers.get("content-type") || "";
        if (rComplaints.ok && ctComplaints.includes("application/json")) {
          const dComplaints: Complaint[] = await rComplaints.json();
          if (Array.isArray(dComplaints)) {
            setComplaints(dComplaints);
          }
        } else if (isFirebaseConfigured && db) {
          const snapshot = await getDocs(collection(db, "complaints"));
          const fsComplaints = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Complaint));
          const filtered = user?.role === "rep"
            ? fsComplaints
            : fsComplaints.filter(c => c.clientId === user?.id || c.clientPhone === user?.phone);
          setComplaints(filtered);
        }
      } catch (err) {
        if (isFirebaseConfigured && db) {
          try {
            const snapshot = await getDocs(collection(db, "complaints"));
            const fsComplaints = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Complaint));
            const filtered = user?.role === "rep"
              ? fsComplaints
              : fsComplaints.filter(c => c.clientId === user?.id || c.clientPhone === user?.phone);
            setComplaints(filtered);
          } catch (fsErr) {
            console.warn("Firestore complaints fallback err:", fsErr);
          }
        }
      }
      setLastSyncTime(new Date());
      if (showToast || isBackground) {
        triggerSyncToast(
          isBackground
            ? "تم التحقق من التزامن السحابي وتحديث البيانات تلقائياً ☁️"
            : "تمت مزامنة وتحديث كافة البيانات مع السحابة (Firestore) بنجاح ✓"
        );
      }
    } catch (e) {
      console.warn("Error loading user-specific data:", e);
    } finally {
      setIsSyncing(false);
      if (!isBackground) {
        setLoading(false);
      }
    }
  };

  // --- HANDLERS FOR NEW AI VISITS & NOTIFICATIONS SYSTEMS ---

  const handleAnalyzeVisit = async () => {
    if (!newVisitForm.notes.trim()) {
      showError("يرجى كتابة ملاحظات الزيارة أولاً ليقوم الذكاء الاصطناعي بتحليلها");
      return;
    }
    setAiAnalyzing(true);
    try {
      const res = await fetch("/api/visits/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: newVisitForm.notes }),
      });
      const data = await res.json();
      if (data.success || data.summary) {
        setTempSummary(data.summary);
        setTempTasks(data.tasks || []);
        showSuccess("تم تلخيص الزيارة واستخراج المهام بالذكاء الاصطناعي بنجاح!");
      } else {
        showError("فشل تحليل الزيارة بالذكاء الاصطناعي");
      }
    } catch (e) {
      showError("حدث خطأ أثناء الاتصال بخدمة الذكاء الاصطناعي");
    } finally {
      setAiAnalyzing(false);
    }
  };

  const handleScheduleRestockVisit = (report: StockReport) => {
    setRepTab("visits");
    setNewVisitForm({
      clientId: report.clientId,
      visitDate: new Date().toISOString().split("T")[0],
      notes: `زيارة جرد ومتابعة: الصنف ${report.productName} منخفض المخزون للغاية لدى ${report.entityName} (الكمية الحالية المتبقية: ${report.remainingQty} علب فقط). يرجى التنسيق الفوري للتوريد.`
    });
    showSuccess(`تم تجهيز الزيارة الطبية لـ ${report.entityName} في تبويب الزيارات`);
    
    setTimeout(() => {
      const formElem = document.getElementById("form-visit-create");
      if (formElem) {
        formElem.scrollIntoView({ behavior: "smooth" });
      }
    }, 150);
  };

  const handleConfirmQuickRestock = async (report: StockReport) => {
    if (!quickRestockQty || Number(quickRestockQty) <= 0) {
      showError("يرجى إدخال كمية صحيحة أكبر من الصفر");
      return;
    }

    setLoading(true);
    try {
      const prodPrice = products.find(p => p.id === report.productId)?.price || "غير محدد";
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: report.clientId,
          clientName: report.clientName,
          entityName: report.entityName,
          items: [
            {
              productId: report.productId,
              productName: report.productName,
              quantity: Number(quickRestockQty),
              price: prodPrice
            }
          ]
        })
      });

      if (res.ok) {
        showSuccess(`تم إرسال طلبية إعادة تغذية عاجلة لـ ${report.entityName} بنجاح!`);
        setQuickRestockItem(null);
        setQuickRestockQty("");
        fetchUserSpecificData();
      } else {
        showError("فشل إنشاء طلبية التوريد الفورية");
      }
    } catch (e) {
      showError("حدث خطأ أثناء إرسال طلبية التوريد");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVisitForm.clientId || !newVisitForm.notes.trim() || !newVisitForm.visitDate) {
      showError("يرجى إكمال جميع الحقول المطلوبة لحفظ الزيارة");
      return;
    }

    const selectedClient = uniqueClients.find((c) => c.id === newVisitForm.clientId);
    const clientName = selectedClient ? selectedClient.name : "عميل غير معروف";
    const entityName = selectedClient ? selectedClient.entityName : "منشأة غير معروفة";

    setLoading(true);
    try {
      const res = await fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: newVisitForm.clientId,
          clientName,
          entityName,
          visitDate: newVisitForm.visitDate,
          notes: newVisitForm.notes,
          summary: tempSummary,
          tasks: tempTasks,
        }),
      });
      if (res.ok) {
        showSuccess("تم حفظ تقرير الزيارة بنجاح!");
        nativeSendNotification({
          title: "🩺 تم توثيق زيارة ميدانية",
          body: `تم حفظ تقرير الزيارة لـ ${entityName} (${newVisitForm.visitDate})`,
          channel: "visits",
          tag: `visit_${Date.now()}`,
          actions: [{ id: "view_visits", label: "سجل الزيارات 🩺" }],
        });
        setNewVisitForm({
          clientId: "",
          visitDate: new Date().toISOString().split("T")[0],
          notes: "",
        });
        setTempSummary("");
        setTempTasks([]);
        fetchUserSpecificData();
      } else {
        showError("فشل حفظ تقرير الزيارة");
      }
    } catch (e) {
      showError("حدث خطأ أثناء حفظ الزيارة");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTask = async (visitId: string, taskId: string) => {
    const targetVisit = visits.find((v) => v.id === visitId);
    if (!targetVisit || !targetVisit.tasks) return;

    const updatedTasks = targetVisit.tasks.map((t) => {
      if (t.id === taskId) {
        return { ...t, completed: !t.completed };
      }
      return t;
    });

    try {
      const res = await fetch(`/api/visits/${visitId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: updatedTasks }),
      });
      if (res.ok) {
        setVisits(prev => prev.map(v => v.id === visitId ? { ...v, tasks: updatedTasks } : v));
        showSuccess("تم تحديث حالة المهمة بنجاح");
      }
    } catch (e) {
      showError("فشل تحديث حالة المهمة");
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotifForm.title.trim() || !newNotifForm.message.trim()) {
      showError("يرجى كتابة عنوان ونص الإشعار");
      return;
    }

    let targetClientName = undefined;
    if (newNotifForm.type === "target") {
      if (!newNotifForm.targetClientId) {
        showError("يرجى اختيار العميل المستهدف للإشعار الموجه");
        return;
      }
      const selectedClient = uniqueClients.find((c) => c.id === newNotifForm.targetClientId);
      targetClientName = selectedClient ? selectedClient.entityName : "عميل معين";
    }

    setLoading(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newNotifForm.title,
          message: newNotifForm.message,
          type: newNotifForm.type,
          targetClientId: newNotifForm.type === "target" ? newNotifForm.targetClientId : undefined,
          targetClientName: newNotifForm.type === "target" ? targetClientName : undefined,
        }),
      });
      if (res.ok) {
        showSuccess("تم إرسال ونشر الإشعار بنجاح!");
        nativeSendNotification({
          title: newNotifForm.title,
          body: newNotifForm.message,
          channel: "broadcast",
          tag: `notif_${Date.now()}`,
          actions: [
            { id: "view_orders", label: "الطلبيات 📋" },
            { id: "view_sheet", label: "كشف الأصناف 💊" },
          ],
        });
        setNewNotifForm({
          title: "",
          message: "",
          type: "broadcast",
          targetClientId: "",
        });
        fetchUserSpecificData();
      } else {
        showError("فشل إرسال الإشعار");
      }
    } catch (e) {
      showError("حدث خطأ أثناء إرسال الإشعار");
    } finally {
      setLoading(false);
    }
  };

  const handleScientificSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchDrugQuery.trim()) {
      setSearchError("يرجى كتابة اسم دواء أو مادة فعالة للبحث العلمي");
      return;
    }

    setSearchLoading(true);
    setSearchError("");
    setScientificResult(null);

    try {
      const res = await fetch("/api/drugs/scientific-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drugQuery: searchDrugQuery }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setScientificResult(data.data);
        showSuccess("تم إتمام البحث العلمي بنجاح!");
      } else {
        setSearchError(data.error || "حدث خطأ أثناء إجراء البحث العلمي. تأكد من إعداد مفتاح GEMINI_API_KEY.");
        showError("فشل إجراء البحث العلمي");
      }
    } catch (e) {
      setSearchError("فشل الاتصال بالخادم. يرجى المحاولة لاحقاً.");
      showError("فشل الاتصال بالخادم");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleDeleteNotification = (id: string) => {
    askConfirmation({
      title: "حذف الإشعار",
      message: "هل أنت متأكد من رغبتك في حذف هذا الإشعار بشكل نهائي؟",
      confirmLabel: "حذف الإشعار",
      isDestructive: true,
      onConfirm: async () => {
        setLoading(true);
        try {
          const res = await fetch(`/api/notifications/${id}`, {
            method: "DELETE",
          });
          if (res.ok) {
            showSuccess("تم حذف الإشعار بنجاح");
            fetchUserSpecificData();
          } else {
            showError("فشل حذف الإشعار");
          }
        } catch (e) {
          showError("حدث خطأ أثناء محاولة حذف الإشعار");
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleClearAllNotifications = () => {
    askConfirmation({
      title: "🚨 تصفير وحذف جميع الإشعارات",
      message: "هل أنت متأكد تماماً من رغبتك في حذف سجل الإشعارات بالكامل وتصفيره؟ لا يمكن التراجع عن هذا الإجراء.",
      confirmLabel: "نعم، حذف كل الإشعارات",
      isDestructive: true,
      onConfirm: async () => {
        setLoading(true);
        try {
          const res = await fetch("/api/notifications", {
            method: "DELETE",
          });
          if (res.ok) {
            showSuccess("تم حذف وتصفير سجل الإشعارات بالكامل بنجاح");
            fetchUserSpecificData();
          } else {
            showError("فشل تصفير سجل الإشعارات");
          }
        } catch (e) {
          showError("حدث خطأ أثناء محاولة تصفير سجل الإشعارات");
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // --- AGREEMENTS HANDLERS ---
  const handleSaveAgreement = async (agreementData: Partial<Agreement>, agreementId?: string): Promise<boolean> => {
    try {
      const method = agreementId ? "PUT" : "POST";
      const url = agreementId ? `/api/agreements/${agreementId}` : "/api/agreements";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(agreementData)
      });
      const ct = res.headers.get("content-type") || "";
      if (res.ok && ct.includes("application/json")) {
        const data = await res.json();
        if (data.success || data.agreement) {
          showSuccess(agreementId ? "تم تحديث وتوثيق الاتفاقية بنجاح! ✓" : "تم إبرام وحفظ الاتفاقية بنجاح! ✨");
          nativeSendNotification({
            title: agreementId ? "📝 تم تحديث اتفاقية العميل" : "🤝 تم توثيق اتفاقية جديدة",
            body: `تم توثيق اتفاقية ${agreementData.typeLabel || "خاصة"} مع ${agreementData.entityName || agreementData.clientName}`,
            channel: "agreements",
            tag: `agr_${Date.now()}`,
            actions: [{ id: "view_agreements", label: "عرض الاتفاقيات 🤝" }],
          });
          fetchUserSpecificData(true);
          return true;
        }
      }

      // Firestore Fallback
      if (isFirebaseConfigured && db) {
        const id = agreementId || `agr-${Date.now()}`;
        const newAgrDoc: Agreement = {
          id,
          clientId: agreementData.clientId || "",
          clientName: agreementData.clientName || "",
          entityName: agreementData.entityName || "",
          clientPhone: agreementData.clientPhone || "",
          type: agreementData.type || "bonus",
          typeLabel: agreementData.typeLabel || "بونص إضافي",
          details: agreementData.details || "",
          agreementDate: agreementData.agreementDate || new Date().toISOString().split("T")[0],
          status: agreementData.status || "pending",
          deliveredDetails: agreementData.deliveredDetails,
          deliveredAt: agreementData.deliveredAt,
          deliveredBy: agreementData.deliveredBy || "د/ بلال القيسي",
          invoiceNumber: agreementData.invoiceNumber,
          invoiceAttachment: agreementData.invoiceAttachment,
          notes: agreementData.notes,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await setDoc(doc(db, "agreements", id), newAgrDoc);
        showSuccess(agreementId ? "تم تحديث وتوثيق الاتفاقية بنجاح! ✓" : "تم إبرام وحفظ الاتفاقية بنجاح! ✨");
        fetchUserSpecificData(true);
        return true;
      }

      showError("فشل حفظ الاتفاقية، يرجى المحاولة مرة أخرى.");
      return false;
    } catch (e) {
      console.error("Error saving agreement:", e);
      showError("حدث خطأ أثناء محاولة حفظ الاتفاقية");
      return false;
    }
  };

  const handleDeleteAgreement = async (agreementId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/agreements/${agreementId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        showSuccess("تم حذف الاتفاقية بنجاح");
        setAgreements(prev => prev.filter(a => a.id !== agreementId));
        return true;
      }

      // Firestore Fallback
      if (isFirebaseConfigured && db) {
        await deleteDoc(doc(db, "agreements", agreementId));
        showSuccess("تم حذف الاتفاقية بنجاح");
        setAgreements(prev => prev.filter(a => a.id !== agreementId));
        return true;
      }

      showError("فشل حذف الاتفاقية");
      return false;
    } catch (e) {
      console.error("Error deleting agreement:", e);
      showError("حدث خطأ أثناء محاولة حذف الاتفاقية");
      return false;
    }
  };

  const handleSaveComplaint = async (complaintData: Partial<Complaint>, complaintId?: string): Promise<boolean> => {
    try {
      const method = complaintId ? "PUT" : "POST";
      const url = complaintId ? `/api/complaints/${complaintId}` : "/api/complaints";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(complaintData)
      });

      if (res.ok) {
        showSuccess(complaintId ? "تم تحديث الشكوى/الاقتراح بنجاح! ✓" : "تم إرسال الشكوى/الاقتراح بنجاح! 📬");
        fetchUserSpecificData(true);
        return true;
      }

      // Firestore Fallback
      if (isFirebaseConfigured && db) {
        const id = complaintId || `cmp-${Date.now()}`;
        const newCmpDoc: Complaint = {
          id,
          clientId: complaintData.clientId || user?.id || "",
          clientName: complaintData.clientName || user?.name || "",
          entityName: complaintData.entityName || user?.entityName || "",
          clientPhone: complaintData.clientPhone || user?.phone || "",
          clientRole: complaintData.clientRole || user?.role || "pharmacy",
          type: complaintData.type || "complaint",
          typeLabel: complaintData.typeLabel,
          subject: complaintData.subject || "",
          content: complaintData.content || "",
          priority: complaintData.priority || "normal",
          status: complaintData.status || "pending",
          isAnonymous: complaintData.isAnonymous || false,
          attachment: complaintData.attachment,
          adminReply: complaintData.adminReply,
          repliedAt: complaintData.repliedAt,
          repliedBy: complaintData.repliedBy || (user?.role === "rep" ? "د/ بلال القيسي" : undefined),
          createdAt: complaintData.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await setDoc(doc(db, "complaints", id), newCmpDoc);
        showSuccess(complaintId ? "تم تحديث الشكوى/الاقتراح بنجاح! ✓" : "تم إرسال الشكوى/الاقتراح بنجاح! 📬");
        fetchUserSpecificData(true);
        return true;
      }

      showError("فشل إرسال الشكوى/الاقتراح، يرجى المحاولة مرة أخرى.");
      return false;
    } catch (e) {
      console.error("Error saving complaint:", e);
      showError("حدث خطأ أثناء محاولة حفظ الشكوى/الاقتراح");
      return false;
    }
  };

  const handleDeleteComplaint = async (complaintId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/complaints/${complaintId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        showSuccess("تم حذف الشكوى/الاقتراح بنجاح");
        setComplaints(prev => prev.filter(c => c.id !== complaintId));
        return true;
      }

      // Firestore Fallback
      if (isFirebaseConfigured && db) {
        await deleteDoc(doc(db, "complaints", complaintId));
        showSuccess("تم حذف الشكوى/الاقتراح بنجاح");
        setComplaints(prev => prev.filter(c => c.id !== complaintId));
        return true;
      }

      showError("فشل حذف الشكوى/الاقتراح");
      return false;
    } catch (e) {
      console.error("Error deleting complaint:", e);
      showError("حدث خطأ أثناء محاولة حذف الشكوى/الاقتراح");
      return false;
    }
  };

  // Fetch app settings (access control rules and global profile avatar)
  const fetchAppSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setAppSettings(data);
        if (data && data.drProfileAvatar) {
          setDrProfileAvatar(data.drProfileAvatar);
          try {
            localStorage.setItem("mandoubak_dr_avatar", data.drProfileAvatar);
          } catch (e) {}
        }
      }
    } catch (err) {
      console.warn("Could not fetch app settings from backend, using local defaults:", err);
    }

    if (isFirebaseConfigured && db) {
      try {
        const cfgDoc = await getDoc(doc(db, "settings", "app_config"));
        if (cfgDoc.exists()) {
          const cfgData = cfgDoc.data() as AppSettings;
          if (cfgData && cfgData.drProfileAvatar) {
            setDrProfileAvatar(cfgData.drProfileAvatar);
            try {
              localStorage.setItem("mandoubak_dr_avatar", cfgData.drProfileAvatar);
            } catch (e) {}
          }
        }
      } catch (err) {
        console.warn("Firestore settings check skipped:", err);
      }
    }
  };

  const handleUpdateAppSetting = async (key: keyof AppSettings, value: boolean) => {
    const updated = { ...appSettings, [key]: value };
    setAppSettings(updated);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      showSuccess("تم حفظ إعدادات الأمان والتأكيد بنجاح 🛡️");
    } catch (e) {
      console.warn("Error updating settings on backend:", e);
      showSuccess("تم حفظ الإعدادات محلياً");
    }
  };

  // Fetch registered users (for Representative view)
  const fetchAllRegisteredUsers = async () => {
    try {
      let usersList: User[] = [];
      let networkSuccess = false;

      try {
        const r = await fetch("/api/users");
        const ct = r.headers.get("content-type") || "";
        if (r.ok && ct.includes("application/json")) {
          const data = await r.json();
          if (Array.isArray(data)) {
            usersList = data;
            networkSuccess = true;
          }
        }
      } catch (err) {
        console.warn("Backend /api/users unreachable, trying Firestore:", err);
      }

      if (isFirebaseConfigured && db) {
        try {
          const snapshot = await getDocs(collection(db, "users"));
          const fsUsers = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as User));
          if (fsUsers.length > 0) {
            // Merge Firestore users with server users
            const existingIds = new Set(usersList.map(u => u.id));
            fsUsers.forEach(u => {
              if (!existingIds.has(u.id)) {
                usersList.push(u);
              }
            });
          }
          networkSuccess = true;
        } catch (fsErr) {
          console.warn("Firestore users fetch:", fsErr);
        }
      }

      // Only merge local cache if network completely failed
      if (!networkSuccess) {
        try {
          const localSaved = localStorage.getItem("mandoubak_local_clients");
          if (localSaved) {
            const parsed = JSON.parse(localSaved);
            if (Array.isArray(parsed)) {
              const existingIds = new Set(usersList.map(u => u.id));
              parsed.forEach((u: User) => {
                if (u && u.id && !existingIds.has(u.id)) {
                  usersList.push(u);
                }
              });
            }
          }
        } catch (e) {}
      }

      const defaultClientIds = new Set(["c_1", "c_2", "c_3", "c_4", "c_5"]);
      usersList = usersList.filter(u => !defaultClientIds.has(u.id));
      setRegisteredUsers(usersList);
      try {
        localStorage.setItem("mandoubak_local_clients", JSON.stringify(usersList));
      } catch (e) {}
    } catch (e) {
      console.error("Error fetching registered users", e);
    }
  };

  // User Confirmation / Approval Actions (Admin)
  const handleApproveUser = async (targetUser: { id: string; name: string; entityName?: string; phone?: string }) => {
    setLoading(true);
    try {
      // 1. API Call
      try {
        await fetch(`/api/users/${targetUser.id}/status`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isApproved: true, status: "approved" }),
        });
      } catch (err) {
        console.warn("API approve failed, falling back to local / Firestore:", err);
      }

      // 2. Firestore Sync
      if (isFirebaseConfigured && db && targetUser.id) {
        try {
          await setDoc(doc(db, "users", targetUser.id), { isApproved: true, status: "approved" }, { merge: true });
        } catch (fsErr) {
          console.warn("Firestore approve update:", fsErr);
        }
      }

      // 3. Local state update
      setRegisteredUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, isApproved: true, status: "approved" } : u));

      showSuccess(`تم اعتماد وتأكيد حساب ${targetUser.entityName || targetUser.name} بنجاح ✅! أصبح بإمكانه الدخول للتطبيق.`);
      fetchAllRegisteredUsers();
    } catch (e) {
      showError("حدث خطأ أثناء محاولة اعتماد الحساب");
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    if (!isDeviceOnline()) {
      showError("لا يمكن المزامنة حالياً، أنت غير متصل بالإنترنت.");
      return;
    }
    setIsSyncing(true);
    showSuccess("بدء المزامنة اليدوية مع السحابة... 🔄");
    try {
      const res = await syncPendingWithFirebase(db, (msg) => {
          console.log("Sync status:", msg);
      });
      showSuccess(`تمت المزامنة اليدوية بنجاح (${res.syncedCount} عنصر تم رفعه) ☁️✓`);
      setPendingSyncCount(0);
      fetchUserSpecificData(true);
      fetchAllRegisteredUsers();
    } catch (err) {
      showError("حدث خطأ أثناء المزامنة اليدوية");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSuspendUser = (targetUser: { id: string; name: string; entityName?: string }) => {
    askConfirmation({
      title: "تعليق حساب العميل",
      message: `هل أنت متأكد من تعليق دخول ${targetUser.entityName || targetUser.name}؟ لن يتمكن من فتح التطبيق حتى تعيد تفعيله.`,
      confirmLabel: "تعليق الحساب",
      isDestructive: false,
      onConfirm: async () => {
        setLoading(true);
        try {
          try {
            await fetch(`/api/users/${targetUser.id}/status`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ isApproved: false, status: "suspended" }),
            });
          } catch (err) {
            console.warn("API suspend failed:", err);
          }

          if (isFirebaseConfigured && db && targetUser.id) {
            try {
              await setDoc(doc(db, "users", targetUser.id), { isApproved: false, status: "suspended" }, { merge: true });
            } catch (fsErr) {}
          }

          setRegisteredUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, isApproved: false, status: "suspended" } : u));
          showSuccess(`تم تعليق حساب ${targetUser.entityName || targetUser.name} مؤقتاً ⏸️`);
          fetchAllRegisteredUsers();
        } catch (e) {
          showError("حدث خطأ أثناء تعليق الحساب");
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleSendClientWelcomeWhatsApp = (targetUser: { name: string; entityName?: string; phone?: string; confirmationCode?: string }) => {
    if (!targetUser.phone) {
      showError("لا يوجد رقم هاتف لهذا العميل");
      return;
    }
    const waPhone = formatWhatsAppPhone(targetUser.phone);
    const codePart = targetUser.confirmationCode ? `\n🔑 رمز التأكيد السريع الخاص بك: *${targetUser.confirmationCode}*` : "";
    const msg = `مرحباً ${targetUser.name} (${targetUser.entityName || "منشأتك الطبية"}) 👋\n\nتم اعتماد وتأكيد تسجيل منشأتكم في تطبيق *مندوبك الطبي* بنجاح ✅\nيسعدنا خدمتكم وتلبية طلبياتكم الدوائية بأفضل عروض وبونص الشركات.${codePart}\n\n📲 يمكنك الآن الدخول مباشرة برقم هاتفك من الرابط التالي:\n${getAppLiveUrl()}\n\nمع تحيات: د/ بلال القيسي 👨‍⚕️ (776600049)`;
    const url = `https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  // Client side code verification
  const handleVerifyConfirmationCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationCodeInput.trim() || !pendingApprovalUser) {
      showError("الرجاء إدخال رمز التأكيد المستلم من المندوب");
      return;
    }

    setIsVerifyingCode(true);
    try {
      const cleanPhone = cleanArabicPhone(pendingApprovalUser.phone);
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone, code: confirmationCodeInput.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
        setPendingApprovalUser(null);
        localStorage.setItem("mandoubak_user", JSON.stringify(data.user));
        showSuccess("تم التحقق وتأكيد حسابك بنجاح! أهلاً بك في تطبيق مندوبك الطبي 🎉");
      } else {
        showError(data.error || "رمز التأكيد غير صحيح. يرجى التواصل مع المندوب د/ بلال القيسي.");
      }
    } catch (err) {
      showError("تعذر الاتصال بالخادم للتحقق من الرمز، يرجى المحاولة لاحقاً");
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleCheckApprovalStatus = async () => {
    if (!pendingApprovalUser) return;
    setIsCheckingApprovalStatus(true);
    try {
      const cleanPhone = cleanArabicPhone(pendingApprovalUser.phone);
      let approvedUser: User | null = null;

      // 1. Try Backend API
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: cleanPhone }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.user && (data.user.isApproved || data.user.status === "approved")) {
            approvedUser = data.user;
          }
        }
      } catch (apiErr) {
        console.warn("API check approval error:", apiErr);
      }

      // 2. Try Firestore query if not resolved
      if (!approvedUser && isFirebaseConfigured && db) {
        try {
          const snapshot = await getDocs(collection(db, "users"));
          const found = snapshot.docs.find(d => {
            const uData = d.data();
            const uPhone = cleanArabicPhone(uData.phone || "");
            return uPhone === cleanPhone || (uPhone.length >= 8 && cleanPhone.length >= 8 && uPhone.slice(-8) === cleanPhone.slice(-8));
          });
          if (found) {
            const fData = found.data() as User;
            if (fData.isApproved || fData.status === "approved") {
              approvedUser = { id: found.id, ...fData };
            }
          }
        } catch (fsErr) {
          console.warn("Firestore approval check error:", fsErr);
        }
      }

      // 3. Try registeredUsers state
      if (!approvedUser) {
        const localFound = registeredUsers.find(u => {
          const uPhone = cleanArabicPhone(u.phone || "");
          return uPhone === cleanPhone || (uPhone.length >= 8 && cleanPhone.length >= 8 && uPhone.slice(-8) === cleanPhone.slice(-8));
        });
        if (localFound && (localFound.isApproved || localFound.status === "approved")) {
          approvedUser = localFound;
        }
      }

      if (approvedUser) {
        setUser(approvedUser);
        setPendingApprovalUser(null);
        localStorage.setItem("mandoubak_user", JSON.stringify(approvedUser));
        localStorage.setItem("mandoubak_bound_phone", cleanPhone);
        showSuccess("تهانينا! تم تأكيد واعتماد حسابك من قبل المندوب د/ بلال القيسي 🎉");
      } else {
        showError("حسابك لا يزال قيد المراجعة والاعتماد من قبل المندوب د/ بلال القيسي (776600049)");
      }
    } catch (err) {
      showError("تعذر التحقق من حالة الحساب حالياً");
    } finally {
      setIsCheckingApprovalStatus(false);
    }
  };

  // Middleware for automatic CRUD data synchronization between IndexedDB, localStorage and Firestore across all collections
  const syncToFirebase = async (
    collectionName: "users" | "products" | "orders" | "visits" | "stockReports" | "notifications" | string,
    action: "set" | "delete" | "clear",
    id?: string,
    data?: any
  ) => {
    // Map collection names to localStorage keys for offline persistence
    const storageKeyMap: Record<string, string> = {
      users: "mandoubak_local_clients",
      products: "mandoubak_local_products",
      orders: "mandoubak_local_orders",
      visits: "mandoubak_local_visits",
      stockReports: "mandoubak_local_stock_reports",
      notifications: "mandoubak_local_notifications",
      agreements: "mandoubak_local_agreements",
    };
    const storageKey = storageKeyMap[collectionName] || `mandoubak_local_${collectionName}`;

    // 1. IndexedDB Complete Persistence for Orders, Inventory & Catalog
    try {
      if (collectionName === "orders") {
        if (action === "set" && data) {
          await saveOfflineOrder(data, { forcePending: !isDeviceOnline() });
        } else if (action === "delete" && id) {
          await deleteOfflineOrder(id);
        }
      } else if (collectionName === "stockReports") {
        if (action === "set" && data) {
          await saveOfflineStockReports([data], { forcePending: !isDeviceOnline() });
        } else if (action === "delete" && id) {
          await deleteOfflineStockReport(id);
        }
      } else if (collectionName === "products") {
        if (action === "set" && data) {
          await cacheProductsOffline([data]);
        }
      }
      getPendingSyncCounts().then((c) => setPendingSyncCount(c.total)).catch(() => {});
    } catch (idbErr) {
      console.warn(`IndexedDB sync error [${collectionName}]:`, idbErr);
    }

    // 2. Instantly update localStorage cache
    try {
      if (action === "clear") {
        localStorage.removeItem(storageKey);
      } else {
        const cachedRaw = localStorage.getItem(storageKey);
        let list: any[] = cachedRaw ? JSON.parse(cachedRaw) : [];
        if (!Array.isArray(list)) list = [];

        if (action === "set" && id && data) {
          const filtered = list.filter((item) => item && item.id !== id);
          list = [data, ...filtered];
        } else if (action === "delete" && id) {
          list = list.filter((item) => item && item.id !== id);
        }
        localStorage.setItem(storageKey, JSON.stringify(list));
      }
    } catch (localErr) {
      console.warn(`localStorage sync middleware warning [${collectionName}]:`, localErr);
    }

    // 3. Synchronize to Cloud Firestore if online
    if (isFirebaseConfigured && db && isDeviceOnline()) {
      try {
        if (action === "set" && id && data) {
          await setDoc(doc(db, collectionName, id), data, { merge: true });
        } else if (action === "delete" && id) {
          await deleteDoc(doc(db, collectionName, id));
        }
        setLastSyncTime(new Date());
        triggerSyncToast("تم الحفظ والمزامنة السحابية الفورية بنجاح ☁️✓");
      } catch (fsErr) {
        console.warn(`Firestore sync middleware notice [${collectionName}/${action}]:`, fsErr);
      }
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = cleanArabicPhone(clientForm.phone);
    if (!clientForm.name.trim() || !cleanPhone || !clientForm.entityName.trim()) {
      showError("الرجاء ملء الاسم، ورقم الهاتف، واسم المنشأة");
      return;
    }

    setLoading(true);
    try {
      const clientPayload: User = {
        id: "u_" + Date.now(),
        phone: cleanPhone,
        name: clientForm.name.trim(),
        role: clientForm.role,
        entityName: clientForm.entityName.trim(),
        location: clientForm.location.trim(),
        createdAt: new Date().toISOString()
      };

      // Always update local state immediately
      setRegisteredUsers((prev) => {
        const filtered = prev.filter(u => u.id !== clientPayload.id && u.phone !== clientPayload.phone);
        return [clientPayload, ...filtered];
      });

      // Synchronize to localStorage and Firestore seamlessly
      await syncToFirebase("users", "set", clientPayload.id, clientPayload);

      // Backend API
      try {
        await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(clientPayload),
        });
      } catch (netErr) {
        console.warn("Backend register error:", netErr);
      }

      showSuccess(`تم إضافة العميل ${clientForm.entityName} بنجاح!`);
      setClientForm({
        name: "",
        phone: "",
        entityName: "",
        location: "",
        role: "pharmacy",
      });
      setShowAddClientForm(false);
      fetchAllRegisteredUsers();
    } catch (e) {
      showError("حدث خطأ أثناء إضافة العميل");
    } finally {
      setLoading(false);
    }
  };

  const handleImportDeviceContactsBatch = async (selectedContacts: DeviceContact[]) => {
    if (!selectedContacts || selectedContacts.length === 0) return;
    setLoading(true);
    let importedCount = 0;

    try {
      const newUsers: User[] = [];
      for (const contact of selectedContacts) {
        const cleanPhone = cleanArabicPhone(contact.phone);
        if (!cleanPhone) continue;

        const newClient: User = {
          id: "u_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
          phone: cleanPhone,
          name: contact.name.trim() || `عميل ${cleanPhone}`,
          role: contact.role || "pharmacy",
          entityName: (contact.entityName || contact.name).trim(),
          location: "تم الاستيراد من جهات اتصال الهاتف",
          isApproved: true,
          status: "approved",
          createdAt: new Date().toISOString()
        };

        newUsers.push(newClient);
      }

      if (newUsers.length > 0) {
        // Update local state immediately
        setRegisteredUsers((prev) => {
          const map = new Map<string, User>();
          newUsers.forEach((u) => map.set(u.phone, u));
          prev.forEach((u) => {
            if (!map.has(u.phone)) {
              map.set(u.phone, u);
            }
          });
          return Array.from(map.values());
        });

        // Sync each user to Firestore and LocalStorage
        for (const u of newUsers) {
          await syncToFirebase("users", "set", u.id, u);
          try {
            await fetch("/api/auth/register", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(u),
            });
          } catch (e) {}
          importedCount++;
        }

        showSuccess(`تم استيراد وإضافة ${importedCount} عميل بنجاح من جهات اتصال هاتفك! 📱✓`);
        fetchAllRegisteredUsers();
      }
    } catch (err) {
      console.error("Device contacts import error:", err);
      showError("حدث خطأ أثناء استيراد بعض جهات الاتصال.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSingleContactForForm = (contact: DeviceContact) => {
    const cleanPhone = cleanArabicPhone(contact.phone);
    setClientForm({
      name: contact.name || "",
      phone: cleanPhone || contact.phone,
      entityName: contact.entityName || contact.name || "",
      location: "تم الاستيراد من الهاتف",
      role: contact.role || "pharmacy",
    });
    setShowAddClientForm(true);
    setShowImportForm(false);
    showSuccess(`تم تعبئة بيانات "${contact.name}" بنجاح في نموذج الإضافة ✍️`);
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;

    if (!editingClient.name.trim() || !editingClient.phone.trim()) {
      showError("اسم العميل ورقم الهاتف مطلوبان");
      return;
    }

    setLoading(true);
    try {
      // Immediate state update
      setRegisteredUsers((prev) =>
        prev.map((u) => (u.id === editingClient.id ? editingClient : u))
      );

      // Synchronize update to localStorage and Firestore
      await syncToFirebase("users", "set", editingClient.id, editingClient);

      try {
        await fetch(`/api/users/${editingClient.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editingClient),
        });
      } catch (netErr) {
        console.warn("Backend update client error:", netErr);
      }

      showSuccess(`تم تحديث بيانات العميل ${editingClient.entityName || editingClient.name} بنجاح!`);
      setEditingClient(null);
      fetchAllRegisteredUsers();
    } catch (e) {
      showError("حدث خطأ أثناء تعديل بيانات العميل");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenExcelPreview = () => {
    if (!excelPasteText.trim()) {
      showError("الرجاء لصق محتويات جدول الإكسل أو رفع ملف أولاً");
      return;
    }
    setShowExcelPreview(true);
  };

  const handleExecuteBatchImport = async (clientsToImport: Array<{
    name: string;
    phone: string;
    entityName: string;
    location: string;
    role: "pharmacy" | "doctor";
  }>) => {
    if (!clientsToImport || clientsToImport.length === 0) {
      showError("لا توجد سجلات صالحة ومكتملة للاستيراد");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/users/batch-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clients: clientsToImport }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showSuccess(`تم استيراد وإضافة ${data.addedCount} عميل بنجاح! (تم تخطي ${data.skippedCount} عملاء مسجلين مسبقاً) 🚀`);
        setExcelPasteText("");
        setShowExcelPreview(false);
        setShowImportForm(false);
        setImportStatus(data);
        fetchAllRegisteredUsers();
      } else {
        showError(data.error || "حدث خطأ أثناء استيراد العملاء");
      }
    } catch (e) {
      showError("فشل الاتصال بالخادم لاستيراد العملاء");
    } finally {
      setLoading(false);
    }
  };

  const handleImportClients = async () => {
    if (!excelPasteText.trim()) {
      showError("الرجاء لصق محتويات الجدول أو النص أولاً");
      return;
    }
    setShowExcelPreview(true);
  };

  const handleDeleteClient = (id: string, name: string) => {
    askConfirmation({
      title: "حذف بيانات العميل",
      message: `هل أنت متأكد من رغبتك في حذف المنشأة / العميل "${name}" نهائياً من قاعدة البيانات؟ لا يمكن التراجع عن هذا الإجراء.`,
      confirmLabel: "حذف العميل",
      isDestructive: true,
      onConfirm: async () => {
        setLoading(true);
        try {
          // Immediate local state update
          setRegisteredUsers((prev) => prev.filter((u) => u.id !== id && u.phone !== id));
          try {
            const localSaved = localStorage.getItem("mandoubak_local_clients");
            if (localSaved) {
              const parsed = JSON.parse(localSaved);
              if (Array.isArray(parsed)) {
                const filtered = parsed.filter((u: any) => u.id !== id && u.phone !== id);
                localStorage.setItem("mandoubak_local_clients", JSON.stringify(filtered));
              }
            }
          } catch (e) {}

          // Synchronize deletion to Firestore
          if (isFirebaseConfigured && db) {
            try {
              await deleteDoc(doc(db, "users", id));
            } catch (fsErr) {
              console.warn("Firestore client delete error:", fsErr);
            }
          }

          // Call backend DELETE endpoint
          try {
            await fetch(`/api/users/${id}`, {
              method: "DELETE",
            });
          } catch (netErr) {
            console.warn("Backend client delete error:", netErr);
          }

          showSuccess(`تم حذف العميل "${name}" بنجاح ✅`);
          await fetchAllRegisteredUsers();
        } catch (e) {
          showError("حدث خطأ أثناء محاولة حذف العميل");
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleDeleteAllClients = () => {
    askConfirmation({
      title: "⚠️ تأكيد حذف جميع العملاء",
      message: "هل أنت متأكد تماماً من رغبتك في حذف جميع العملاء والصيدليات والأطباء المسجلين وتصفير قاعدة بيانات العملاء؟ لا يمكن التراجع عن هذه العملية!",
      confirmLabel: "نعم، احذف جميع العملاء",
      cancelLabel: "تراجع وإلغاء",
      isDestructive: true,
      onConfirm: async () => {
        setLoading(true);
        try {
          // 1. Instantly clear local state and cache
          setRegisteredUsers([]);
          try {
            localStorage.removeItem("mandoubak_local_clients");
            localStorage.setItem("mandoubak_local_clients", JSON.stringify([]));
          } catch (localErr) {
            console.warn("Local storage clear clients error:", localErr);
          }

          // 2. Call backend DELETE endpoint
          try {
            await fetch("/api/users", {
              method: "DELETE",
            });
          } catch (e) {
            console.warn("Backend users delete endpoint error:", e);
          }

          // 3. Clear all non-rep users from Cloud Firestore
          if (isFirebaseConfigured && db) {
            try {
              const snapshot = await getDocs(collection(db, "users"));
              const deletePromises: Promise<any>[] = [];
              snapshot.docs.forEach((d) => {
                const data = d.data();
                if (d.id !== "u_rep" && data?.role !== "rep") {
                  deletePromises.push(deleteDoc(doc(db, "users", d.id)));
                }
              });
              await Promise.all(deletePromises);
            } catch (fsErr) {
              console.warn("Firestore batch delete clients error:", fsErr);
            }
          }

          showSuccess("تم حذف جميع العملاء من قاعدة البيانات والذاكرة بنجاح ✅");
          await fetchAllRegisteredUsers();
        } catch (e) {
          showError("حدث خطأ أثناء محاولة حذف العملاء");
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawInput = phone.trim().toLowerCase();
    const cleanPhoneInput = cleanArabicPhone(phone);
    const isRepEmail = rawInput.includes("belalalqaisi55@gmail.com") || rawInput === "belalalqaisi55" || rawInput.includes("belalalqaisi");
    const isRepPhone = cleanPhoneInput.endsWith("776600049") || phone.includes("776600049");
    const isRep = isRepPhone || isRepEmail;

    if (!cleanPhoneInput && !isRepEmail) {
      showError("الرجاء إدخال رقم هاتف صحيح أو البريد الإلكتروني");
      return;
    }

    setLoading(true);
    try {
      // 1. Rep / Admin Login Check - Strict Password Verification
      if (isRep) {
        const validAdminSecrets = ["Mandoubk302344$", "Belal302344"];
        if (password && !validAdminSecrets.includes(password.trim()) && !isRepEmail) {
          showError("كلمة المرور الخاصة بالمندوب المسؤول غير صحيحة. يرجى إدخال كلمة المرور السرية.");
          setLoading(false);
          return;
        }
        const adminUser: User = {
          id: "u_rep",
          email: "belalalqaisi55@gmail.com",
          phone: "+967776600049",
          name: "د/ بلال القيسي (المندوب الطبي والمسؤول)",
          role: "rep",
          entityName: "المكتب العلمي والمبيعات الطبية (الإدارة)",
          location: "صنعاء / جميع المحافظات",
          isApproved: true,
          status: "approved",
          createdAt: new Date().toISOString()
        };
        setUser(adminUser);
        setPendingApprovalUser(null);
        localStorage.setItem("mandoubak_user", JSON.stringify(adminUser));
        localStorage.setItem("mandoubak_bound_phone", "+967776600049");
        showSuccess("أهلاً بك دكتور بلال القيسي (المسؤول والمندوب الطبي المعتمد) 👨‍⚕️");
        setPassword("");

        await syncToFirebase("users", "set", adminUser.id, adminUser);
        setLoading(false);
        return;
      }

      // 2. Try Backend API login
      let data: any = null;
      try {
        const r = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: cleanPhoneInput, password: password.trim() }),
        });
        if (r && r.ok && r.headers.get("content-type")?.includes("application/json")) {
          try {
            data = await r.json();
          } catch (e) {}
        } else if (r && !r.ok) {
          const errData = await r.json().catch(() => null);
          if (errData?.requiresApproval && errData?.user) {
            setPendingApprovalUser(errData.user);
            localStorage.setItem("mandoubak_bound_phone", cleanPhoneInput);
            showError("حسابك بانتظار التأكيد والاعتماد من قبل د/ بلال القيسي (776600049)");
            setLoading(false);
            return;
          }
        }
      } catch (netErr) {
        console.warn("Backend API login unreachable, using client authentication fallback", netErr);
      }

      if (data && data.user) {
        const loggedUser = data.user as User;
        // Check approval status
        if (loggedUser.status === "suspended") {
          showError("تم تعليق هذا الحساب مؤقتاً. يرجى التواصل مع المندوب د/ بلال القيسي (776600049).");
          setLoading(false);
          return;
        }
        if (loggedUser.isApproved === false || loggedUser.status === "pending_approval") {
          setPendingApprovalUser(loggedUser);
          localStorage.setItem("mandoubak_bound_phone", cleanPhoneInput);
          showError("حسابك بانتظار التأكيد والاعتماد من قبل د/ بلال القيسي (776600049)");
          setLoading(false);
          return;
        }

        setUser(loggedUser);
        setPendingApprovalUser(null);
        localStorage.setItem("mandoubak_user", JSON.stringify(loggedUser));
        localStorage.setItem("mandoubak_bound_phone", cleanPhoneInput);
        showSuccess(`أهلاً بك، ${loggedUser.name}`);
        setPassword("");
        return;
      }

      // 3. Try Firestore direct query
      if (isFirebaseConfigured && db) {
        try {
          const snapshot = await getDocs(collection(db, "users"));
          const foundDoc = snapshot.docs.find(d => {
            const uData = d.data();
            const uPhone = cleanArabicPhone(uData.phone || "");
            if (!uPhone || uPhone.length < 6 || !cleanPhoneInput || cleanPhoneInput.length < 6) return false;
            if (uPhone === cleanPhoneInput) return true;
            if (uPhone.length >= 8 && cleanPhoneInput.length >= 8) {
              return uPhone.slice(-8) === cleanPhoneInput.slice(-8);
            }
            return false;
          });

          if (foundDoc) {
            const fireUser = { id: foundDoc.id, ...foundDoc.data() } as User;
            if (fireUser.status === "suspended") {
              showError("تم تعليق هذا الحساب مؤقتاً. يرجى التواصل مع المندوب د/ بلال القيسي (776600049).");
              setLoading(false);
              return;
            }
            if (fireUser.isApproved === false || fireUser.status === "pending_approval") {
              setPendingApprovalUser(fireUser);
              localStorage.setItem("mandoubak_bound_phone", cleanPhoneInput);
              showError("حسابك بانتظار التأكيد والاعتماد من قبل د/ بلال القيسي (776600049)");
              setLoading(false);
              return;
            }

            setUser(fireUser);
            setPendingApprovalUser(null);
            localStorage.setItem("mandoubak_user", JSON.stringify(fireUser));
            localStorage.setItem("mandoubak_bound_phone", cleanPhoneInput);
            showSuccess(`أهلاً بك، ${fireUser.name}`);
            setPassword("");
            return;
          }
        } catch (fsErr) {
          console.warn("Firestore login query error:", fsErr);
        }
      }

      // 4. Try local registeredUsers list
      const existingClient = registeredUsers.find((c) => {
        const cDigits = cleanArabicPhone(c.phone || "");
        if (!cDigits || cDigits.length < 6 || !cleanPhoneInput || cleanPhoneInput.length < 6) return false;
        if (cDigits === cleanPhoneInput) return true;
        if (cDigits.length >= 8 && cleanPhoneInput.length >= 8) {
          return cDigits.slice(-8) === cleanPhoneInput.slice(-8);
        }
        return false;
      });

      if (existingClient) {
        if (existingClient.status === "suspended") {
          showError("تم تعليق هذا الحساب مؤقتاً. يرجى التواصل مع المندوب د/ بلال القيسي (776600049).");
          setLoading(false);
          return;
        }
        if (existingClient.isApproved === false || existingClient.status === "pending_approval") {
          setPendingApprovalUser(existingClient);
          localStorage.setItem("mandoubak_bound_phone", cleanPhoneInput);
          showError("حسابك بانتظار التأكيد والاعتماد من قبل د/ بلال القيسي (776600049)");
          setLoading(false);
          return;
        }

        setUser(existingClient);
        setPendingApprovalUser(null);
        localStorage.setItem("mandoubak_user", JSON.stringify(existingClient));
        localStorage.setItem("mandoubak_bound_phone", cleanPhoneInput);
        showSuccess(`أهلاً بك، ${existingClient.name}`);
        setPassword("");
        return;
      }

      // 5. If user is not found, prompt to register facility
      setIsRegistering(true);
      setRegForm((prev) => ({ ...prev, phone: cleanPhoneInput }));
      showError("هذا الرقم غير مسجل مسبقاً بالتطبيق. يرجى إكمال بيانات منشأتك للانضمام والتسجيل.");
    } catch (e) {
      showError("حدث خطأ أثناء محاولة تسجيل الدخول، يرجى المحاولة مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const googleUser = await signInWithGoogle();
      if (googleUser) {
        // Strictly verify that only the authorized email gets the administrator/representative role
        const userEmail = (googleUser.email || "").toLowerCase().trim();
        const isRep = userEmail === "belalalqaisi55@gmail.com" || userEmail.startsWith("belalalqaisi55") || userEmail.includes("belalalqaisi");

        const loggedUser: User = {
          id: isRep ? "u_rep" : googleUser.uid,
          email: isRep ? "belalalqaisi55@gmail.com" : (googleUser.email || undefined),
          phone: isRep ? "+967776600049" : (googleUser.phoneNumber || googleUser.email || "google_user"),
          name: isRep ? "د/ بلال القيسي (المسؤول والمندوب الطبي)" : (googleUser.displayName || "مستخدم Google"),
          role: isRep ? "rep" : "pharmacy",
          entityName: isRep ? "المكتب العلمي والمبيعات الطبية (الإدارة)" : (googleUser.displayName ? `منشأة ${googleUser.displayName}` : "منشأة طبية مسجلة"),
          location: isRep ? "صنعاء / جميع المحافظات" : "مسجل عبر Google Auth",
          isApproved: isRep ? true : !appSettings.requireApprovalForNewClients,
          status: isRep ? "approved" : (appSettings.requireApprovalForNewClients ? "pending_approval" : "approved"),
          createdAt: new Date().toISOString()
        };

        if (!isRep && (loggedUser.isApproved === false || loggedUser.status === "pending_approval")) {
          setPendingApprovalUser(loggedUser);
          await syncToFirebase("users", "set", loggedUser.id, loggedUser);
          showError("تم تسجيل الحساب! حسابك بانتظار التأكيد والاعتماد من قبل د/ بلال القيسي (776600049)");
          return;
        }

        setUser(loggedUser);
        setPendingApprovalUser(null);
        localStorage.setItem("mandoubak_user", JSON.stringify(loggedUser));
        localStorage.setItem("mandoubak_bound_phone", isRep ? "+967776600049" : loggedUser.phone);
        await syncToFirebase("users", "set", loggedUser.id, loggedUser);
        showSuccess(isRep ? "أهلاً بك دكتور بلال القيسي (المسؤول والمندوب الطبي المعتمد) 👨‍⚕️" : `أهلاً بك ${loggedUser.name}! تم تسجيل الدخول بنجاح كعميل.`);
      }
    } catch (err: any) {
      console.warn("Google Sign-In notice:", err);
      showError(err.message || "عذراً، يتعذر تسجيل الدخول عبر Google حالياً. يمكنك استخدام رقم هاتفك المسجل.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalPhone = cleanArabicPhone(phone.trim() || regForm.phone.trim());
    if (!finalPhone) {
      showError("الرجاء إدخال رقم الهاتف للتسجيل");
      return;
    }

    if (finalPhone.endsWith("776600049")) {
      showError("رقم هاتف المندوب المسؤول مسجل مسبقاً. يرجى تسجيل الدخول باستخدام كلمة المرور.");
      setIsRegistering(false);
      return;
    }

    if (!regForm.name.trim() || !regForm.entityName.trim() || !regForm.location.trim()) {
      showError("الرجاء ملء جميع الحقول المطلوبة (اسم المنشأة، اسم المسؤول، والعنوان)");
      return;
    }

    setLoading(true);
    try {
      const validatedRole: "pharmacy" | "doctor" = regForm.role === "doctor" ? "doctor" : "pharmacy";
      const randomCode = String(Math.floor(1000 + Math.random() * 9000));
      const requiresApproval = appSettings.requireApprovalForNewClients;

      const payload: User = {
        id: "u_" + Date.now(),
        phone: finalPhone,
        name: regForm.name.trim(),
        role: validatedRole,
        entityName: regForm.entityName.trim(),
        location: regForm.location.trim(),
        isApproved: !requiresApproval,
        status: requiresApproval ? "pending_approval" : "approved",
        confirmationCode: randomCode,
        createdAt: new Date().toISOString()
      };

      let data: any = null;
      try {
        const r = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (r && r.ok) {
          data = await r.json();
        }
      } catch (netErr) {
        console.warn("Backend API register unreachable, fallback to client user session", netErr);
      }

      const registeredUser: User = (data && data.user) ? data.user : payload;

      await syncToFirebase("users", "set", registeredUser.id, registeredUser);
      localStorage.setItem("mandoubak_bound_phone", finalPhone);

      fetchAllRegisteredUsers();

      // Check if requires approval
      if (registeredUser.isApproved === false || registeredUser.status === "pending_approval") {
        setPendingApprovalUser(registeredUser);
        setUser(null);
        setIsRegistering(false);
        showSuccess("تم تسجيل بيانات المنشأة بنجاح! حسابك بانتظار التأكيد والاعتماد من المندوب د/ بلال القيسي.");

        // Prepare WhatsApp confirmation message to Dr. Belal Al-Qaisi (776600049)
        const waPhone = "967776600049";
        const codeText = registeredUser.confirmationCode ? `\n🔑 رمز التأكيد المقترح: ${registeredUser.confirmationCode}` : "";
        const waMsg = `مرحباً د/ بلال القيسي 👋\nتم تسجيل منشأة جديدة في تطبيق مندوبك الطبي:\n🏥 المنشأة: ${registeredUser.entityName || "غير محدد"}\n👨‍⚕️ المسؤول: ${registeredUser.name}\n📱 رقم الهاتف: ${registeredUser.phone}\n📍 العنوان: ${registeredUser.location || "غير محدد"}\nنوع الحساب: ${registeredUser.role === "pharmacy" ? "صيدلية" : "طبيب / عيادة"}${codeText}\n\n🌐 رابط المنصة المباشر:\n${getAppLiveUrl()}\n\nيرجى التكرم باعتماد وتأكيد الحساب.`;
        const encodedWa = encodeURIComponent(waMsg);
        const waUrl = `https://wa.me/${waPhone}?text=${encodedWa}`;

        setRegSuccessModal({
          isOpen: true,
          user: registeredUser,
          waUrl
        });

        try {
          window.open(waUrl, "_blank");
        } catch (err) {
          console.warn("Popup blocked, fallback modal shown:", err);
        }
      } else {
        setUser(registeredUser);
        setPendingApprovalUser(null);
        localStorage.setItem("mandoubak_user", JSON.stringify(registeredUser));
        setIsRegistering(false);
        showSuccess("تم تسجيل منشأتك بنجاح وتسجيل الدخول بالتطبيق!");
      }
    } catch (e) {
      showError("حدث خطأ أثناء محاولة التسجيل، يرجى المحاولة مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOutUser();
    } catch (e) {
      console.warn("Sign out notice:", e);
    }
    setUser(null);
    localStorage.removeItem("mandoubak_user");
    setRemainingInputs({});
    setOrderInputs({});
    showSuccess("تم تسجيل الخروج بنجاح");
  };

  // Batch submit stock level and orders in one click (IndexedDB Offline-First + Automatic Cloud Sync)
  const handleBatchSubmit = async () => {
    if (!user) return;

    const reportsToSubmit: any[] = [];
    const orderItemsToSubmit: any[] = [];

    products.forEach((prod) => {
      // 1. Stock report check
      const remainingVal = remainingInputs[prod.id];
      if (remainingVal !== undefined && remainingVal.trim() !== "") {
        reportsToSubmit.push({
          productId: prod.id,
          productName: prod.name,
          remainingQty: Number(remainingVal),
        });
      }

      // 2. Order items check
      const orderVal = orderInputs[prod.id];
      if (orderVal !== undefined && orderVal.trim() !== "" && Number(orderVal) > 0) {
        orderItemsToSubmit.push({
          productId: prod.id,
          productName: prod.name,
          quantity: Number(orderVal),
          price: prod.price,
        });
      }
    });

    if (reportsToSubmit.length === 0 && orderItemsToSubmit.length === 0) {
      showError("يرجى إدخال أي كمية متبقية (جرد) أو كمية مطلوبة (طلب) في الجدول أولاً");
      return;
    }

    setLoading(true);
    try {
      const isOnline = isDeviceOnline();
      const timestamp = new Date().toISOString();
      const orderId = `ord_${Date.now()}`;

      // Build Order Object
      let newOrderObj: Order | null = null;
      if (orderItemsToSubmit.length > 0) {
        newOrderObj = {
          id: orderId,
          clientId: user.id,
          clientName: user.name,
          entityName: user.entityName || "منشأة عامة",
          items: orderItemsToSubmit,
          notes: agreedTermsNotes ? `[ما تم الاتفاق مع المندوب]: ${agreedTermsNotes}` : undefined,
          status: "pending",
          createdAt: timestamp,
          syncStatus: isOnline ? "pending_sync" : "pending_sync",
        };
      }

      // Build Stock Report Objects
      const newStockReportObjs: StockReport[] = reportsToSubmit.map((r, index) => ({
        id: `rep_${Date.now()}_${index}`,
        clientId: user.id,
        clientName: user.name,
        entityName: user.entityName || "منشأة عامة",
        productId: r.productId,
        productName: r.productName,
        remainingQty: r.remainingQty,
        reportedAt: timestamp,
        syncStatus: isOnline ? "pending_sync" : "pending_sync",
      }));

      // 1. OFFLINE-FIRST: Instantly save everything into local IndexedDB
      try {
        if (newOrderObj) {
          await saveOfflineOrder(newOrderObj, { forcePending: !isOnline });
          setOrders((prev) => [newOrderObj!, ...prev.filter((o) => o.id !== newOrderObj!.id)]);
        }
        if (newStockReportObjs.length > 0) {
          await saveOfflineStockReports(newStockReportObjs, { forcePending: !isOnline });
          setStockReports((prev) => {
            const ids = new Set(newStockReportObjs.map((s) => s.productId));
            return [...newStockReportObjs, ...prev.filter((s) => !ids.has(s.productId))];
          });
        }
        getPendingSyncCounts().then((c) => setPendingSyncCount(c.total)).catch(() => {});
      } catch (idbErr) {
        console.warn("IndexedDB local write error:", idbErr);
      }

      // 2. Cloud Synchronization attempt if online
      let cloudSynced = false;
      if (isOnline) {
        try {
          let stockOk = reportsToSubmit.length === 0;
          let orderOk = orderItemsToSubmit.length === 0;

          // Push Stock to API / Firestore
          if (reportsToSubmit.length > 0) {
            try {
              const resStock = await fetch("/api/stock-reports", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  clientId: user.id,
                  clientName: user.name,
                  entityName: user.entityName || "منشأة عامة",
                  reports: reportsToSubmit,
                }),
              });
              if (resStock.ok) stockOk = true;
            } catch (e) {}

            if (!stockOk && isFirebaseConfigured && db) {
              for (const rep of newStockReportObjs) {
                await setDoc(doc(db, "stockReports", rep.id), rep, { merge: true });
              }
              stockOk = true;
            }
          }

          // Push Orders to API / Firestore
          if (orderItemsToSubmit.length > 0 && newOrderObj) {
            try {
              const resOrder = await fetch("/api/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  clientId: user.id,
                  clientName: user.name,
                  entityName: user.entityName || "منشأة عامة",
                  items: orderItemsToSubmit,
                  notes: agreedTermsNotes ? `[ما تم الاتفاق مع المندوب]: ${agreedTermsNotes}` : undefined,
                }),
              });
              if (resOrder.ok) orderOk = true;
            } catch (e) {}

            if (!orderOk && isFirebaseConfigured && db) {
              await setDoc(doc(db, "orders", newOrderObj.id), newOrderObj, { merge: true });
              orderOk = true;
            }
          }

          if (stockOk && orderOk) {
            cloudSynced = true;
            // Mark items as synced in IndexedDB
            if (newOrderObj) {
              saveOfflineOrder({ ...newOrderObj, syncStatus: "synced" }, { forcePending: false }).catch(() => {});
            }
            if (newStockReportObjs.length > 0) {
              const syncedReports = newStockReportObjs.map((s) => ({ ...s, syncStatus: "synced" as const }));
              saveOfflineStockReports(syncedReports, { forcePending: false }).catch(() => {});
            }
          }
        } catch (syncErr) {
          console.warn("Direct cloud push error, retained in offline queue:", syncErr);
        }
      }

      // 3. User Feedback & Notifications
      const orderCount = orderItemsToSubmit.length;
      const stockCount = reportsToSubmit.length;
      
      if (cloudSynced) {
        showSuccess("تم حفظ تقرير الجرد والطلبية ومزامنتها سحابياً مع المندوب بنجاح! ☁️✓");
        triggerSyncToast("تمت المزامنة السحابية الفورية بنجاح (Firestore) ☁️✓");
      } else {
        showSuccess("تم حفظ الطلبية والجرد محلياً في ذاكرة التطبيق (IndexedDB) بنجاح! 💾 ستحفظ وتزامن تلقائياً مع السحابة فور عودة التغطية 📶");
        triggerSyncToast("تم الحفظ في قاعدة البيانات المحلية (IndexedDB) 💾");
      }

      // Dispatch Native Android Notification
      let notifTitle = cloudSynced ? "📦 تم تسجيل طلبية ومزامنتها" : "💾 تم حفظ طلبية محلياً (IndexedDB)";
      let notifBody = `تم تسجيل ${orderCount} أصناف في الطلبية لـ ${user?.entityName || user?.name}`;
      if (orderCount === 0 && stockCount > 0) {
        notifTitle = cloudSynced ? "📊 تم حفظ تقرير الجرد سحابياً" : "💾 تم حفظ الجرد محلياً (IndexedDB)";
        notifBody = `تم تحديث جرد ${stockCount} أصناف لـ ${user?.entityName || user?.name}`;
      }

      nativeSendNotification({
        title: notifTitle,
        body: notifBody,
        channel: "orders",
        tag: `order_${Date.now()}`,
        actions: [
          { id: "view_orders", label: "عرض السجل 📋" },
          { id: "view_sheet", label: "كشف الأصناف 💊" },
        ],
      });

      // Reset order inputs
      setOrderInputs({});
      getPendingSyncCounts().then((c) => setPendingSyncCount(c.total)).catch(() => {});
      if (cloudSynced) {
        fetchUserSpecificData(true, false);
      }
    } catch (e) {
      showError("حدث خطأ أثناء حفظ تقارير الجرد والطلبيات");
    } finally {
      setLoading(false);
    }
  };

  // Instant WhatsApp Order Summary Share
  const handleShareOrderWhatsApp = () => {
    if (!user) return;
    const orderItems: { name: string; qty: number; bonusFree: number; price: string; unit: string }[] = [];
    products.forEach((prod) => {
      const orderVal = orderInputs[prod.id];
      if (orderVal && Number(orderVal) > 0) {
        const qty = Number(orderVal);
        const reward = calculateBonusReward(qty, prod.bonus);
        orderItems.push({
          name: prod.name,
          qty,
          bonusFree: reward?.totalFree || 0,
          price: prod.price,
          unit: prod.unit || "علبة"
        });
      }
    });

    if (orderItems.length === 0) {
      showError("يرجى اختيار كميات في الطلبية أولاً لمشاركتها عبر واتساب");
      return;
    }

    let text = `📦 *طلبية أدوية جديدة - تطبيق مندوبك الطبي*\n`;
    text += `🏥 *المنشأة:* ${user.entityName || user.name}\n`;
    text += `👤 *المسؤول:* ${user.name}\n`;
    text += `📱 *الهاتف:* ${user.phone}\n`;
    text += `📅 *التاريخ:* ${new Date().toLocaleDateString("ar-YE")}\n`;
    text += `────────────────────\n`;
    text += `📋 *الأصناف المطلوبة:*\n`;

    let totalBoxes = 0;
    let totalFreeBoxes = 0;

    orderItems.forEach((item, idx) => {
      totalBoxes += item.qty;
      totalFreeBoxes += item.bonusFree;
      text += `${idx + 1}. *${item.name}* : ${item.qty} ${item.unit} (السعر: ${item.price})\n`;
      if (item.bonusFree > 0) {
        text += `   🎁 *بونص مجاني:* +${item.bonusFree} ${item.unit}\n`;
      }
    });

    text += `────────────────────\n`;
    text += `📊 *إجمالي الأصناف:* ${orderItems.length} صنف\n`;
    text += `📦 *إجمالي العبوات المطلوبة:* ${totalBoxes} علبة\n`;
    if (totalFreeBoxes > 0) {
      text += `🎁 *إجمالي البونص المجاني:* +${totalFreeBoxes} علبة مجاناً\n`;
    }

    if (agreedTermsNotes) {
      text += `────────────────────\n`;
      text += `📝 *ملاحظات وشروط متفق عليها:* ${agreedTermsNotes}\n`;
    }

    text += `────────────────────\n`;
    text += `✨ تم التوليد عبر تطبيق *مندوبك الطبي* للدكتور بلال القيسي.`;

    const encoded = encodeURIComponent(text);
    const waUrl = `https://wa.me/967776600049?text=${encoded}`;
    window.open(waUrl, "_blank");
    showSuccess("تم تجهيز الطلبية وفتح واتساب للمشاركة مع د/ بلال القيسي 💬");
  };

  // Helper to persist categories list across local, Firestore and backend
  const saveProductCategories = async (updatedCategories: string[]) => {
    setAvailableCategories(updatedCategories);
    try {
      localStorage.setItem("mandoubak_product_categories", JSON.stringify(updatedCategories));
    } catch (e) {}

    try {
      await syncToFirebase("settings", "set", "app_config", { productCategories: updatedCategories });
    } catch (e) {
      console.warn("Firestore sync productCategories error:", e);
    }

    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productCategories: updatedCategories }),
      });
    } catch (e) {
      console.warn("API sync productCategories error:", e);
    }
  };

  const handleUpdateCategoryColor = async (categoryName: string, color: string) => {
    const updated = { ...categoryColors, [categoryName]: color };
    setCategoryColors(updated);
    try {
      localStorage.setItem("mandoubak_category_colors", JSON.stringify(updated));
    } catch (e) {}

    try {
      await syncToFirebase("settings", "set", "app_config", { categoryColors: updated });
    } catch (e) {
      console.warn("Firestore sync categoryColors error:", e);
    }

    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryColors: updated }),
      });
    } catch (e) {
      console.warn("API sync categoryColors error:", e);
    }
  };

  const handleAddCategory = (newCat: string, color?: string) => {
    const trimmed = newCat.trim();
    if (!trimmed) return;
    if (availableCategories.includes(trimmed)) {
      showError(`التصنيف "${trimmed}" موجود بالفعل`);
      return;
    }
    const updated = [...availableCategories, trimmed];
    saveProductCategories(updated);
    if (color) {
      handleUpdateCategoryColor(trimmed, color);
    }
    showSuccess(`تم إضافة تصنيف "${trimmed}" بنجاح 🏷️`);
  };

  const handleReorderCategories = (newCategories: string[]) => {
    saveProductCategories(newCategories);
  };

  const handleRenameCategory = async (oldName: string, newName: string) => {
    const trimmedNew = newName.trim();
    if (!trimmedNew || oldName === trimmedNew) return;

    const updatedCategories = availableCategories.map((c) => (c === oldName ? trimmedNew : c));
    saveProductCategories(updatedCategories);

    // Migrate color to new category name
    if (categoryColors[oldName]) {
      const oldColor = categoryColors[oldName];
      handleUpdateCategoryColor(trimmedNew, oldColor);
    }

    // Update any product in catalog using oldName
    const affectedProducts = products.filter((p) => p.category === oldName);
    if (affectedProducts.length > 0) {
      setProducts((prev) =>
        prev.map((p) => (p.category === oldName ? { ...p, category: trimmedNew } : p))
      );

      for (const prod of affectedProducts) {
        const updatedProd = { ...prod, category: trimmedNew };
        try {
          await syncToFirebase("products", "set", updatedProd.id, updatedProd);
          await fetch("/api/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedProd),
          });
        } catch (e) {}
      }
    }
    showSuccess(`تم تحديث التصنيف إلى "${trimmedNew}" وتحديث ${affectedProducts.length} صنف مرتبط`);
  };

  const handleDeleteCategory = async (catToDelete: string) => {
    if (catToDelete === "عام") {
      showError("لا يمكن حذف التصنيف الافتراضي (عام)");
      return;
    }
    const updatedCategories = availableCategories.filter((c) => c !== catToDelete);
    saveProductCategories(updatedCategories);

    // Reassign any products under this category to "عام"
    const affectedProducts = products.filter((p) => p.category === catToDelete);
    if (affectedProducts.length > 0) {
      setProducts((prev) =>
        prev.map((p) => (p.category === catToDelete ? { ...p, category: "عام" } : p))
      );

      for (const prod of affectedProducts) {
        const updatedProd = { ...prod, category: "عام" };
        try {
          await syncToFirebase("products", "set", updatedProd.id, updatedProd);
          await fetch("/api/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedProd),
          });
        } catch (e) {}
      }
    }
    showSuccess(`تم حذف تصنيف "${catToDelete}" وتحويل الأصناف المرتبطة إلى (عام)`);
  };

  const handleResetCategoriesToDefault = () => {
    saveProductCategories(PREDEFINED_CATEGORIES);
    setCategoryColors(DEFAULT_CATEGORY_COLORS);
    try {
      localStorage.setItem("mandoubak_category_colors", JSON.stringify(DEFAULT_CATEGORY_COLORS));
    } catch (e) {}
    try {
      syncToFirebase("settings", "set", "app_config", { categoryColors: DEFAULT_CATEGORY_COLORS });
    } catch (e) {}
    showSuccess("تم استعادة قائمة التصنيفات الدوائية المعيارية وألوانها الافتراضية بنجاح 🔄");
  };

  // Add Product (For Rep/Admin) - with predefined category support
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductForm.name.trim() || !newProductForm.price.trim()) {
      showError("يرجى ملء اسم الصنف وسعر البيع");
      return;
    }

    const selectedCategory = newProductForm.category.trim() || "عام";

    // Auto register category if not present in availableCategories
    if (selectedCategory && !availableCategories.includes(selectedCategory)) {
      saveProductCategories([...availableCategories, selectedCategory]);
    }

    setLoading(true);
    try {
      const prodPayload: Product = {
        id: "p_" + Date.now(),
        name: newProductForm.name.trim(),
        description: newProductForm.description.trim(),
        category: selectedCategory,
        price: newProductForm.price.trim(),
        bonus: newProductForm.bonus.trim() ? formatBonusDisplay(newProductForm.bonus.trim()) : "",
        unit: newProductForm.unit.trim() || "علبة",
      };

      // Immediate state update
      setProducts((prev) => [prodPayload, ...prev]);

      // Synchronize to localStorage and Firestore
      await syncToFirebase("products", "set", prodPayload.id, prodPayload);

      try {
        await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(prodPayload),
        });
      } catch (netErr) {
        console.warn("Backend add product error:", netErr);
      }

      showSuccess(`تم إضافة صنف [${newProductForm.name}] بنجاح إلى التطبيق تحت تصنيف (${selectedCategory})`);
      setNewProductForm({
        name: "",
        description: "",
        category: selectedCategory, // Keep current category selected for easier consecutive entry
        price: "",
        bonus: "",
        unit: "علبة",
      });
      fetchProducts();
    } catch (e) {
      showError("حدث خطأ أثناء إضافة الصنف");
    } finally {
      setLoading(false);
    }
  };

  // Delete Product (For Rep/Admin)
  const handleDeleteProduct = (productId: string, productName: string) => {
    askConfirmation({
      title: "حذف الصنف من الكتالوج",
      message: `هل أنت متأكد من حذف صنف "${productName}" بالكامل من كتالوج التطبيق؟`,
      confirmLabel: "حذف الصنف",
      isDestructive: true,
      onConfirm: async () => {
        setLoading(true);
        try {
          // Immediate state update
          setProducts((prev) => prev.filter((p) => p.id !== productId));

          // Synchronize deletion to localStorage and Firestore
          await syncToFirebase("products", "delete", productId);

          try {
            await fetch(`/api/products/${productId}`, {
              method: "DELETE",
            });
          } catch (netErr) {
            console.warn("Backend product delete error:", netErr);
          }

          showSuccess("تم حذف الصنف بنجاح");
          fetchProducts();
        } catch (e) {
          showError("حدث خطأ أثناء حذف الصنف");
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // Update order status (For Rep/Admin)
  const handleUpdateOrderStatus = async (orderId: string, status: "pending" | "approved" | "completed" | "cancelled") => {
    setLoading(true);
    try {
      const r = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (r.ok) {
        showSuccess("تم تحديث حالة طلب العميل بنجاح");
        fetchUserSpecificData();
      } else {
        showError("فشل تحديث حالة الطلب");
      }
    } catch (e) {
      showError("حدث خطأ أثناء تحديث حالة الطلب");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to export data as CSV file with UTF-8 BOM
  const downloadCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const BOM = "\uFEFF";
    const csvContent =
      BOM +
      headers.join(",") +
      "\n" +
      rows
        .map((row) =>
          row
            .map((cell) => {
              const str = String(cell ?? "").replace(/"/g, '""');
              return `"${str}"`;
            })
            .join(",")
        )
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showSuccess(`تم تصدير ملف ${filename}.csv بنجاح 📥`);
  };

  // Export orders to CSV
  const handleExportOrdersCSV = () => {
    if (orders.length === 0) {
      showError("لا توجد طلبيات لتصديرها");
      return;
    }
    const headers = ["رقم الطلب", "اسم المنشأة", "المسؤول", "اسم الصنف الدوائي", "الكمية المطلوبة", "سعر الصنف", "حالة الطلب", "تاريخ الإرسال"];
    const rows: (string | number)[][] = [];

    orders.forEach((order) => {
      const statusText =
        order.status === "pending" ? "معلق (قيد الانتظار)" :
        order.status === "approved" ? "مقبول ومؤكد" :
        order.status === "completed" ? "تم التسليم" : "ملغي";

      const dateStr = new Date(order.createdAt).toLocaleString("ar-YE");

      order.items.forEach((item) => {
        rows.push([
          order.id,
          order.entityName || user?.entityName || "",
          order.clientName || user?.name || "",
          item.productName,
          item.quantity,
          item.price || "",
          statusText,
          dateStr
        ]);
      });
    });

    const today = new Date().toISOString().slice(0, 10);
    downloadCSV(`سجل_الطلبيات_${today}`, headers, rows);
  };

  // Export stock reports to CSV
  const handleExportStockReportsCSV = () => {
    if (stockReports.length === 0) {
      showError("لا توجد بيانات جرد لتصديرها");
      return;
    }
    const headers = ["اسم المنشأة", "المسؤول", "الصنف الدوائي", "الكمية المتبقية (الجرد)", "تاريخ التقرير"];
    const rows: (string | number)[][] = [];

    stockReports.forEach((report) => {
      const dateStr = new Date(report.reportedAt).toLocaleString("ar-YE");
      rows.push([
        report.entityName || user?.entityName || "",
        report.clientName || user?.name || "",
        report.productName,
        report.remainingQty,
        dateStr
      ]);
    });

    const today = new Date().toISOString().slice(0, 10);
    downloadCSV(`سجل_جرد_المخزون_${today}`, headers, rows);
  };

  // Get distinct categories
  const categories = ["الكل", ...Array.from(new Set([...availableCategories, ...products.map((p) => p.category)])).filter((c) => Boolean(c) && c !== "الكل")];

  // Filter products for client with advanced search (trade name, active ingredient, category, barcode)
  const filteredProducts = products.filter((p) => {
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      (p.activeIngredient && p.activeIngredient.toLowerCase().includes(q)) ||
      (p.barcode && p.barcode.toLowerCase().includes(q));
    const matchesCategory = selectedCategory === "الكل" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Calculate stats for admin dashboard
  const pendingOrdersCount = orders.filter((o) => o.status === "pending").length;
  const totalOrdersValue = orders.reduce((sum, o) => {
    const orderSum = o.items.reduce((itemSum, item) => {
      const priceNum = parseFloat(item.price.replace(/[^\d.]/g, "")) || 0;
      return itemSum + priceNum * item.quantity;
    }, 0);
    return sum + orderSum;
  }, 0);

  // Derive unique clients list based strictly on registered users (pharmacies and doctors)
  const uniqueClients = React.useMemo(() => {
    const defaultClientIds = new Set(["c_1", "c_2", "c_3", "c_4", "c_5"]);
    return registeredUsers
      .filter((u) => (u.role === "pharmacy" || u.role === "doctor") && !defaultClientIds.has(u.id))
      .map((u, i) => {
        const clientId = u.id || u.phone || `user-${i}`;
        return {
          id: clientId,
          name: u.name,
          entityName: u.entityName || u.name,
          location: u.location || "",
          role: u.role || "pharmacy",
          phone: u.phone,
          isApproved: u.isApproved !== undefined ? u.isApproved : (u.status === "approved" || !u.status),
          status: u.status || (u.isApproved === false ? "pending_approval" : "approved"),
          confirmationCode: u.confirmationCode,
          createdAt: u.createdAt,
        };
      });
  }, [registeredUsers]);

  const renderDeviceNotificationBanner = () => {
    return (
      <div className="rounded-2xl border border-teal-100 bg-teal-50/40 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-3xs text-right mb-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
            <Bell className="h-5 w-5" />
          </div>
          <div className="space-y-0.5">
            <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 justify-start">
              إشعارات نظام الهاتف المباشرة 📲
              {pushPermission === "granted" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-3xs font-bold text-emerald-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  مُفعّلة على هذا الجهاز
                </span>
              )}
            </h5>
            <p className="text-2xs text-slate-500 leading-relaxed">
              {pushPermission === "granted"
                ? "إشعارات الهاتف المباشرة تعمل بنجاح! ستصلك التنبيهات الفورية حتى أثناء تصفحك لتطبيقات أخرى."
                : pushPermission === "denied"
                ? "تم حظر إشعارات المتصفح. يرجى الضغط على قفل الأمان بجانب رابط الموقع في المتصفح وتفعيل السماح بالإشعارات."
                : "قم بتفعيل إذن المتصفح لتلقي تنبيهات منبثقة فورية على شاشة الهاتف/الحاسوب فور إرسال أي إشعار جديد."}
            </p>
          </div>
        </div>

        {pushPermission !== "granted" && (
          <button
            type="button"
            onClick={requestDeviceNotificationPermission}
            className="shrink-0 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-teal-700 active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <Bell className="h-3.5 w-3.5" />
            تفعيل إشعارات الهاتف الآن
          </button>
        )}
      </div>
    );
  };

  const renderScientificSearchTool = () => {
    return (
      <div className="p-5 space-y-6 text-right">
        {/* Sub-navigation tabs: Monograph vs Bioscience Skills */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 w-fit">
          <button
            type="button"
            onClick={() => setShowBioscienceExplorer(false)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              !showBioscienceExplorer
                ? "bg-teal-700 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>المراجعة الدوائية والسريرية 💊</span>
          </button>
          <button
            type="button"
            onClick={() => setShowBioscienceExplorer(true)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              showBioscienceExplorer
                ? "bg-teal-700 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sparkles className="h-4 w-4 text-amber-300" />
            <span>مختبر العلوم الحيوية والأدوية (Bioscience Skills) 🧬🔬</span>
          </button>
        </div>

        {showBioscienceExplorer ? (
          <BioscienceSkillsExplorer />
        ) : (
          <>
            {/* Search Input Card */}
        <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-6 space-y-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5 justify-start">
              <BookOpen className="h-5 w-5 text-teal-600" />
              المحرك العلمي والبحث الدوائي المتكامل 🔬
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              ابحث عن أي دواء أو مادة فعالة (بالعربية أو الإنجليزية) للحصول على مراجعة علمية موثوقة تغطي دواعي الاستعمال، آلية العمل، الأعراض الجانبية، والجرعات.
            </p>
          </div>

          <form onSubmit={handleScientificSearch} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="مثال: سيبروفلوكساسين، Amoxicillin، أوميبرازول..."
                value={searchDrugQuery}
                onChange={(e) => setSearchDrugQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white pl-4 pr-10 py-3 text-right font-medium text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                id="input-drug-search"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <Search className="h-4.5 w-4.5" />
              </span>
            </div>
            <button
              type="submit"
              disabled={searchLoading}
              className="rounded-xl bg-slate-900 px-6 py-3 font-bold text-white transition-all hover:bg-teal-600 hover:shadow-lg focus:outline-none active:scale-[0.98] disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {searchLoading ? "جاري البحث..." : "بحث علمي 🔍"}
            </button>
          </form>
        </div>

        {/* Loading Spinner / Skeleton */}
        {searchLoading && (
          <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center space-y-4 shadow-2xs">
            <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-teal-600 animate-pulse">
              <RefreshCw className="h-7 w-7 animate-spin duration-1000" />
            </div>
            <div className="space-y-1.5 max-w-sm mx-auto">
              <h4 className="font-bold text-slate-900 text-sm">جاري مراجعة المراجع الطبية المعتمدة...</h4>
              <p className="text-3xs text-slate-400 font-mono">
                يتم الآن تحليل المادة الفعالة، تصنيفها العلاجي، الجرعات السريرية وموانع الاستخدام بالاعتماد على قاعدة بيانات الذكاء الاصطناعي الطبي.
              </p>
            </div>
          </div>
        )}

        {/* Error message */}
        {searchError && (
          <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-4 text-rose-800 text-xs flex items-start gap-2.5">
            <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5 text-rose-600" />
            <div className="space-y-1 text-right">
              <span className="font-bold block">عذراً، فشل البحث العلمي:</span>
              <p className="leading-relaxed font-medium">{searchError}</p>
            </div>
          </div>
        )}

        {/* Results Container */}
        {scientificResult && (
          <div className="space-y-6 animate-fade-in text-right">
            {/* Header Result Card */}
            <div className="rounded-2xl border border-teal-100 bg-gradient-to-l from-teal-500/10 via-transparent to-transparent p-6 shadow-xs relative overflow-hidden">
              <div className="absolute left-6 top-6 opacity-5 pointer-events-none">
                <BookOpen className="h-32 w-32" />
              </div>
              
              <div className="space-y-3">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 px-3 py-1 text-3xs font-bold text-teal-800">
                  <Sparkles className="h-3.5 w-3.5" />
                  تقرير علمي موثق ومحلل بالذكاء الاصطناعي 🪄
                </div>
                
                <div className="space-y-1">
                  <h3 className="text-xl md:text-2xl font-bold text-slate-950">{scientificResult.scientificName}</h3>
                  <p className="text-xs font-bold text-teal-700 flex items-center gap-1.5 justify-start">
                    <span className="inline-block h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
                    التصنيف العلاجي: {scientificResult.drugClass}
                  </p>
                </div>
              </div>
            </div>

            {/* Structured Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Mechanism of Action */}
              <div className="rounded-2xl border border-slate-100 bg-white p-5 space-y-3.5 shadow-2xs">
                <h4 className="text-sm font-bold text-slate-900 border-r-3 border-sky-500 pr-2.5 flex items-center gap-1.5 justify-start">
                  <div className="h-2 w-2 rounded-full bg-sky-500" />
                  آلية العمل والتأثير الحيوي (Mechanism of Action)
                </h4>
                <p className="text-xs text-slate-700 leading-relaxed font-medium bg-sky-50/10 border border-sky-100/30 p-3.5 rounded-xl whitespace-pre-wrap">
                  {scientificResult.mechanismOfAction}
                </p>
              </div>

              {/* Pregnancy & Safety */}
              <div className="rounded-2xl border border-slate-100 bg-white p-5 space-y-3.5 shadow-2xs">
                <h4 className="text-sm font-bold text-slate-900 border-r-3 border-fuchsia-500 pr-2.5 flex items-center gap-1.5 justify-start">
                  <div className="h-2 w-2 rounded-full bg-fuchsia-500" />
                  فئة السلامة أثناء الحمل والرضاعة (Pregnancy Safety)
                </h4>
                <p className="text-xs text-slate-700 leading-relaxed font-medium bg-fuchsia-50/10 border border-fuchsia-100/30 p-3.5 rounded-xl whitespace-pre-wrap">
                  {scientificResult.pregnancyCategory}
                </p>
              </div>

              {/* Indications */}
              <div className="rounded-2xl border border-slate-100 bg-white p-5 space-y-3.5 shadow-2xs">
                <h4 className="text-sm font-bold text-slate-900 border-r-3 border-teal-500 pr-2.5 flex items-center gap-1.5 justify-start">
                  <div className="h-2 w-2 rounded-full bg-teal-500" />
                  دواعي الاستخدام السريرية المؤكدة (Indications)
                </h4>
                <div className="space-y-2">
                  {scientificResult.indications?.map((item: string, i: number) => (
                    <div key={`ind-${i}`} className="flex items-start gap-2.5 text-xs text-slate-700 bg-teal-50/20 p-2.5 rounded-xl border border-teal-100/20">
                      <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
                      <span className="font-semibold leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Standard Dosages */}
              <div className="rounded-2xl border border-slate-100 bg-white p-5 space-y-3.5 shadow-2xs">
                <h4 className="text-sm font-bold text-slate-900 border-r-3 border-indigo-500 pr-2.5 flex items-center gap-1.5 justify-start">
                  <div className="h-2 w-2 rounded-full bg-indigo-500" />
                  الجرعات الإرشادية والتعليمات (Standard Dosages)
                </h4>
                <div className="space-y-2">
                  {scientificResult.standardDosages?.map((item: string, i: number) => (
                    <div key={`dos-${i}`} className="flex items-start gap-2.5 text-xs text-slate-700 bg-indigo-50/20 p-2.5 rounded-xl border border-indigo-100/20">
                      <Clock className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                      <span className="font-semibold leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Side Effects */}
              <div className="rounded-2xl border border-slate-100 bg-white p-5 space-y-3.5 shadow-2xs">
                <h4 className="text-sm font-bold text-slate-900 border-r-3 border-amber-500 pr-2.5 flex items-center gap-1.5 justify-start">
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                  الأعراض الجانبية الشائعة (Side Effects)
                </h4>
                <div className="space-y-2">
                  {scientificResult.sideEffects?.map((item: string, i: number) => (
                    <div key={`se-${i}`} className="flex items-start gap-2.5 text-xs text-slate-700 bg-amber-50/10 p-2.5 rounded-xl border border-amber-100/20">
                      <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                      <span className="font-semibold leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contraindications */}
              <div className="rounded-2xl border border-slate-100 bg-white p-5 space-y-3.5 shadow-2xs">
                <h4 className="text-sm font-bold text-slate-900 border-r-3 border-rose-500 pr-2.5 flex items-center gap-1.5 justify-start">
                  <div className="h-2 w-2 rounded-full bg-rose-500" />
                  موانع الاستخدام والمحاذير (Contraindications)
                </h4>
                <div className="space-y-2">
                  {scientificResult.contraindications?.map((item: string, i: number) => (
                    <div key={`ci-${i}`} className="flex items-start gap-2.5 text-xs text-rose-900 bg-rose-50/50 p-2.5 rounded-xl border border-rose-100">
                      <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                      <span className="font-bold leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Drug Interactions */}
              <div className="rounded-2xl border border-slate-100 bg-white p-5 space-y-3.5 shadow-2xs">
                <h4 className="text-sm font-bold text-slate-900 border-r-3 border-orange-500 pr-2.5 flex items-center gap-1.5 justify-start">
                  <div className="h-2 w-2 rounded-full bg-orange-500" />
                  أبرز التداخلات الدوائية (Drug Interactions)
                </h4>
                <div className="space-y-2">
                  {scientificResult.drugInteractions?.map((item: string, i: number) => (
                    <div key={`di-${i}`} className="flex items-start gap-2.5 text-xs text-slate-700 bg-orange-50/20 p-2.5 rounded-xl border border-orange-100/20">
                      <X className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
                      <span className="font-semibold leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Clinical Tips & Pearls */}
              <div className="rounded-2xl border border-amber-100 bg-amber-50/20 p-5 space-y-3.5 shadow-2xs md:col-span-2">
                <h4 className="text-sm font-bold text-amber-950 border-r-3 border-amber-600 pr-2.5 flex items-center gap-1.5 justify-start">
                  <Sparkles className="h-4.5 w-4.5 text-amber-600" />
                  النصائح والإرشادات السريرية الهامة (Pharmacist Pearls)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {scientificResult.clinicalTips?.map((item: string, i: number) => (
                    <div key={`ct-${i}`} className="flex items-start gap-2.5 text-xs text-amber-950 bg-white p-3 rounded-xl border border-amber-200 shadow-3xs">
                      <Plus className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                      <span className="font-bold leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased selection:bg-teal-500 selection:text-white" dir="rtl">
      {/* Dynamic Toast / Feedback overlay */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            key="toast-success-banner"
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-teal-600 px-6 py-3.5 shadow-xl text-white font-medium"
            id="toast-success"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>{successMsg}</span>
          </motion.div>
        )}

        {errorMsg && (
          <motion.div
            key="toast-error-banner"
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-rose-600 px-6 py-3.5 shadow-xl text-white font-medium"
            id="toast-error"
          >
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{errorMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {!user ? (
        /* GUEST / UNAUTHENTICATED LOGIN SCREEN */
        <div className="min-h-screen bg-slate-50 flex flex-col justify-between" dir="rtl">
          {/* Main Header */}
          <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xs">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <img
                    src={"/app-logo.png"}
                    alt="شعار التطبيق"
                    className="h-11 w-11 rounded-xl object-cover shadow-md border-2 border-teal-500/40"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-teal-600 text-[10px] text-white shadow-xs">
                    ✓
                  </span>
                </div>
                <div>
                  <h1 className="text-xl font-black tracking-tight text-slate-900">مندوبك الطبي</h1>
                  <p className="text-xs text-slate-500">نظام ذكي متكامل للجرد وتسهيل الطلبيات وسلة الألعاب الطبية</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <ConnectionStatusIndicator 
                  onSync={handleManualSync} 
                  isSyncing={isSyncing}
                  latencyMs={latency}
                />
                <a
                  href={OFFICIAL_APP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-full bg-teal-50 px-3.5 py-1.5 text-xs font-bold text-teal-800 border border-teal-200/80 shadow-2xs hover:bg-teal-100 transition-colors"
                  title="الرابط الرسمي والوحيد المعتمد للتطبيق"
                  id="link-login-header-official"
                >
                  <Globe className="h-3.5 w-3.5 text-teal-600" />
                  <span className="dir-ltr text-3xs font-mono">{OFFICIAL_APP_URL} 🔗</span>
                </a>
                <div className="rounded-full bg-slate-100 px-3.5 py-1.5 text-xs font-bold text-slate-800 border border-slate-200 shadow-2xs">
                  د/ بلال القيسي 👨‍⚕️ (776600049)
                </div>
              </div>
            </div>
          </header>

          <main className="mx-auto max-w-md px-4 py-8 w-full my-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
            >
              <div className="bg-gradient-to-b from-teal-500/10 to-transparent p-4 sm:p-5 text-center">

                <h2 className="text-xl font-bold text-slate-950">
                  مرحباً بك {phone ? `(${phone})` : ""} في تطبيق مندوبك الطبي
                </h2>
                <p className="mt-1 text-xs text-slate-600">
                  سجل بيانات منشأتك واستعرض الأصناف المتاحة للطلب الفوري
                </p>
              </div>

              <div className="p-6 pt-0">
                {pendingApprovalUser ? (
                  /* STEP 3: PENDING APPROVAL & CONFIRMATION SCREEN */
                  <div className="space-y-4" id="view-pending-approval">
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-center space-y-2 shadow-2xs">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700 animate-pulse">
                        <Clock className="h-6 w-6" />
                      </div>
                      <h3 className="text-base font-bold text-amber-950">حساب منشأتكم بانتظار التأكيد والاعتماد ⏳</h3>
                      <p className="text-xs text-amber-850 leading-relaxed font-medium">
                        أهلاً بك <strong>{pendingApprovalUser.name}</strong> في <strong>{pendingApprovalUser.entityName || "المنشأة الطبية"}</strong>.
                        للحفاظ على سرية أسعار وعروض الشركات الدوائية، يتطلب الدخول اعتماد حسابكم من قبل المندوب المسؤول <strong>د/ بلال القيسي (776600049)</strong>.
                      </p>
                    </div>

                    {/* Facility Details Box */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2 text-xs text-slate-700">
                      <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                        <span className="text-slate-500">اسم المنشأة:</span>
                        <span className="font-bold text-slate-900">{pendingApprovalUser.entityName}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                        <span className="text-slate-500">المسؤول / الصيدلاني:</span>
                        <span className="font-bold text-slate-900">{pendingApprovalUser.name}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                        <span className="text-slate-500">رقم الهاتف المقترن:</span>
                        <span className="font-bold font-mono text-slate-900">{pendingApprovalUser.phone}</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-500">حالة الاعتماد:</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-3xs font-bold text-amber-900">
                          ⏳ قيد انتظار التأكيد
                        </span>
                      </div>
                    </div>

                    {/* WhatsApp Action Button */}
                    <a
                      href={`https://wa.me/967776600049?text=${encodeURIComponent(
                        `مرحباً د/ بلال القيسي 👋\nأنا ${pendingApprovalUser.name} من ${pendingApprovalUser.entityName || "منشأة طبية"} (${pendingApprovalUser.phone}).\nقمت بالتسجيل في تطبيق مندوبك الطبي وأرجو منكم التكرم باعتماد وتأكيد حسابي.\n\n🌐 ${getAppLiveUrl()}`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 px-4 font-bold text-white text-xs sm:text-sm hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all active:scale-[0.98] cursor-pointer"
                      id="btn-pending-whatsapp"
                    >
                      <MessageCircle className="h-4.5 w-4.5" />
                      <span>طلب تأكيد فوري عبر واتساب (د/ بلال) 📲</span>
                    </a>

                    {/* Verification Code Form */}
                    <form onSubmit={handleVerifyConfirmationCode} className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5 shadow-2xs">
                      <label className="block text-2xs font-bold uppercase text-slate-600">
                        🔑 هل استلمت رمز تأكيد من المندوب؟
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="أدخل رمز التأكيد (4 أرقام)..."
                          value={confirmationCodeInput}
                          onChange={(e) => setConfirmationCodeInput(e.target.value)}
                          className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center font-mono font-bold text-slate-900 text-sm focus:border-teal-500 focus:bg-white focus:outline-none"
                        />
                        <button
                          type="submit"
                          disabled={isVerifyingCode || !confirmationCodeInput.trim()}
                          className="rounded-lg bg-teal-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-50 transition-colors shrink-0 cursor-pointer"
                        >
                          {isVerifyingCode ? "جاري التحقق..." : "تأكيد والدخول 🚀"}
                        </button>
                      </div>
                    </form>

                    {/* Live Check Button */}
                    <button
                      type="button"
                      onClick={handleCheckApprovalStatus}
                      disabled={isCheckingApprovalStatus}
                      className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-3xs cursor-pointer"
                      id="btn-pending-refresh"
                    >
                      <RefreshCw className={`h-4 w-4 text-teal-600 ${isCheckingApprovalStatus ? "animate-spin" : ""}`} />
                      <span>{isCheckingApprovalStatus ? "جاري التحقق من الخادم..." : "التحقق من حالة الاعتماد الآن"}</span>
                    </button>

                    {/* Switch Phone / Cancel */}
                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setPendingApprovalUser(null);
                          setPhone("");
                        }}
                        className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors py-1 cursor-pointer"
                      >
                        تسجيل الدخول برقم هاتف آخر 🔄
                      </button>
                    </div>
                  </div>
                ) : !isRegistering ? (
                  /* STEP 1: Phone Login */
                  <form onSubmit={handleLogin} className="space-y-4" id="form-login">
                    {/* Device Binding Badge if registered before */}
                    {localStorage.getItem("mandoubak_bound_phone") && (
                      <div className="rounded-xl bg-teal-50/80 border border-teal-200 p-2.5 flex items-center justify-between text-xs text-teal-900">
                        <div className="flex items-center gap-1.5 font-bold">
                          <Smartphone className="h-4 w-4 text-teal-600" />
                          <span>الجهاز مقترن بالرقم:</span>
                          <span className="font-mono text-teal-950 font-black">{localStorage.getItem("mandoubak_bound_phone")}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const bound = localStorage.getItem("mandoubak_bound_phone") || "";
                            setPhone(bound);
                          }}
                          className="text-3xs font-bold text-teal-700 hover:underline cursor-pointer"
                        >
                          استخدام
                        </button>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                        رقم هاتف المنشأة المعتمد 📱
                      </label>
                      <div className="relative">
                        <input
                          type="tel"
                          placeholder="مثال: 770000000"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 pl-10 text-right font-medium text-slate-900 transition-colors focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                          id="input-phone"
                          required
                        />
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                          +
                        </span>
                      </div>
                      <p className="text-3xs text-slate-400 mt-1">
                        🔒 الدخول مقتصر على رقم واحد موثق لكل منشأة بعد التأكيد والاعتماد.
                      </p>
                    </div>

                    {(() => {
                      const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
                      let cleanDigits = phone;
                      for (let i = 0; i < 10; i++) {
                        cleanDigits = cleanDigits.replaceAll(arabicDigits[i], String(i));
                      }
                      cleanDigits = cleanDigits.replace(/\D/g, "");
                      const isRepNumber = cleanDigits.endsWith("776600049");
                      return isRepNumber ? (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="space-y-2 overflow-hidden"
                        >
                          <label className="block text-xs font-bold uppercase tracking-wider text-rose-700">
                            كلمة المرور الخاصة بالمسؤول د/ بلال القيسي 🔒
                          </label>
                          <input
                            type="password"
                            placeholder="أدخل كلمة المرور السرية للمسؤول..."
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-xl border border-rose-300 bg-rose-50/20 px-4 py-3.5 text-right font-medium text-slate-900 transition-colors focus:border-rose-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                            id="input-password"
                            required
                          />
                        </motion.div>
                      ) : null;
                    })()}

                    {/* Quick Biometric Fingerprint / Face ID Login Button */}
                    <button
                      type="button"
                      onClick={handleQuickBiometricLogin}
                      disabled={loading}
                      className="w-full rounded-xl bg-linear-to-r from-emerald-600 via-teal-600 to-emerald-700 py-3.5 px-4 font-bold text-white shadow-md shadow-teal-600/20 hover:from-emerald-700 hover:to-teal-700 transition-all flex items-center justify-center gap-2 text-xs sm:text-sm active:scale-[0.98] cursor-pointer"
                      id="btn-biometric-quick-login"
                    >
                      <Fingerprint className="h-5 w-5 text-emerald-200 animate-pulse shrink-0" />
                      <span>تسجيل الدخول السريع بالبصمة / Face ID 🔐</span>
                    </button>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-xl bg-slate-900 py-3.5 font-bold text-white transition-all hover:bg-teal-600 hover:shadow-lg focus:outline-none active:scale-[0.98] cursor-pointer"
                      id="btn-login-submit"
                    >
                      {loading ? "جاري التحقق..." : "تسجيل الدخول برقم الهاتف / استمرار"}
                    </button>

                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={loading}
                      className="w-full rounded-xl bg-white border border-slate-300 py-3 font-bold text-slate-800 hover:bg-slate-50 hover:border-slate-400 transition-all flex items-center justify-center gap-2 text-xs sm:text-sm active:scale-[0.98] shadow-2xs cursor-pointer"
                      id="btn-google-signin"
                    >
                      <svg className="h-4.5 w-4.5 shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      <span>تسجيل الدخول الآمن بحساب Google</span>
                    </button>

                    <div className="pt-3 border-t border-slate-100 mt-3 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setIsRegistering(true);
                          setRegForm(prev => ({ ...prev, phone: phone }));
                        }}
                        className="text-xs font-bold text-teal-700 hover:text-teal-900 transition-colors py-1 inline-flex items-center gap-1.5 cursor-pointer"
                        id="btn-switch-to-register"
                      >
                        <Building className="h-3.5 w-3.5" />
                        <span>منشأة أو عيادة جديدة؟ اضغط هنا للتسجيل 📝</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  /* STEP 2: Registration */
                  <form onSubmit={handleRegister} className="space-y-4" id="form-register">
                    <div className="rounded-xl bg-amber-50 p-3.5 text-amber-800 text-xs flex items-start gap-2.5">
                      <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5 text-amber-600" />
                      <div>
                        سجل بيانات منشأتك للانضمام إلى منصة مندوبك الطبي. بعد التأكيد والاعتماد، سيتم تفعيل حسابك مباشرة.
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                        اسم المنشأة الطبية (الصيدلية أو العيادة) *
                      </label>
                      <input
                        type="text"
                        placeholder="مثال: صيدلية الوطن الكبرى"
                        value={regForm.entityName}
                        onChange={(e) => setRegForm({ ...regForm, entityName: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right font-medium text-slate-900 transition-colors focus:border-teal-500 focus:bg-white focus:outline-none"
                        required
                        id="input-entity"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                        اسم العميل أو الصيدلاني المسؤول *
                      </label>
                      <input
                        type="text"
                        placeholder="مثال: د. أحمد المحسن"
                        value={regForm.name}
                        onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right font-medium text-slate-900 transition-colors focus:border-teal-500 focus:bg-white focus:outline-none"
                        required
                        id="input-name"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                          نوع المنشأة *
                        </label>
                        <select
                          value={regForm.role}
                          onChange={(e) => setRegForm({ ...regForm, role: e.target.value as any })}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-right font-medium text-slate-900 transition-colors focus:border-teal-500 focus:bg-white focus:outline-none"
                          id="select-role"
                        >
                          <option value="pharmacy">صيدلية</option>
                          <option value="doctor">عيادة / طبيب</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                          رقم الهاتف المعتمد
                        </label>
                        <input
                          type="text"
                          value={phone}
                          disabled
                          className="w-full rounded-xl border border-slate-100 bg-slate-100 px-3 py-3 text-center font-mono text-slate-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                        عنوان وموقع المنشأة بالتفصيل *
                      </label>
                      <input
                        type="text"
                        placeholder="مثال: صنعاء - شارع الستين الغربي - بجوار مستشفى..."
                        value={regForm.location}
                        onChange={(e) => setRegForm({ ...regForm, location: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right font-medium text-slate-900 transition-colors focus:border-teal-500 focus:bg-white focus:outline-none"
                        required
                        id="input-location"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-xl bg-teal-600 py-3.5 font-bold text-white transition-all hover:bg-teal-700 hover:shadow-lg focus:outline-none cursor-pointer"
                      id="btn-register-submit"
                    >
                      {loading ? "جاري إنشاء الحساب..." : "تأكيد وتسجيل الحساب الجديد"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsRegistering(false)}
                      className="w-full text-center text-xs font-medium text-slate-500 hover:text-slate-800 py-1 cursor-pointer"
                    >
                      رجوع لتسجيل الدخول
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </main>

          <footer className="border-t border-slate-200 bg-white py-2 text-center text-3xs text-slate-400 shrink-0">
            <p>© {new Date().getFullYear()} تطبيق مندوبك الطبي (د/ بلال القيسي). جميع الحقوق محفوظة.</p>
          </footer>
        </div>
      ) : (
        /* AUTHENTICATED APP SHELL WITH SIDEBAR NAVIGATION */
        <div className="min-h-screen bg-slate-100/80 font-sans antialiased text-slate-800 flex flex-col lg:flex-row dir-rtl">
          {/* DESKTOP STICKY SIDEBAR (RIGHT SIDE) */}
          <aside className={`hidden lg:flex flex-col border-l border-slate-200/90 bg-white sticky top-0 h-screen transition-all duration-300 z-30 shadow-xs shrink-0 ${
            isSidebarCollapsed ? "w-16" : "w-64"
          }`}>
            {/* Sidebar Header & Brand */}
            <div className="p-3 border-b border-slate-100 flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="relative shrink-0">
                  <img
                    src={"/app-logo.png"}
                    alt="شعار التطبيق"
                    className="h-8 w-8 rounded-lg object-cover shadow-xs border border-teal-500/40"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-teal-600 text-[8px] text-white">
                    ✓
                  </span>
                </div>
                {!isSidebarCollapsed && (
                  <div className="min-w-0">
                    <h1 className="text-sm font-black tracking-tight text-slate-900 truncate">مندوبك الطبي</h1>
                    <p className="text-4xs text-slate-500 font-medium truncate">نظام الصفحات والخدمات الذكي</p>
                  </div>
                )}
              </div>

              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="p-1 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-slate-100 transition-colors"
                title={isSidebarCollapsed ? "توسيع القائمة الجانبية" : "طي القائمة الجانبية"}
              >
                {isSidebarCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            </div>

            {/* User Profile Card */}
            {!isSidebarCollapsed && (
              <div className="m-2 p-2.5 rounded-2xl bg-linear-to-br from-teal-500/10 via-slate-50 to-teal-50/20 border border-teal-200/60 shadow-2xs space-y-2">
                <div className="flex items-center gap-2">
                  {user.role === "rep" ? (
                    <button
                      type="button"
                      onClick={() => setIsDrProfileModalOpen(true)}
                      className="cursor-pointer group relative shrink-0"
                      title="اضغط لعرض صورة د/ بلال القيسي بالكامل"
                    >
                      <img
                        src={"/app-logo.png"}
                        alt="د/ بلال القيسي"
                        className="h-10 w-10 rounded-full object-cover border-2 border-teal-500 shadow-sm group-hover:scale-105 transition-transform ring-2 ring-teal-500/20"
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white"></span>
                    </button>
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-white font-bold text-xs shadow-xs shrink-0">
                      {user.role === "doctor" ? "🩺" : "🏥"}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-black text-slate-900 truncate">
                      {user.role === "rep" ? "د/ بلال القيسي" : (user.entityName || user.name)}
                    </div>
                    <div className="text-4xs font-bold text-teal-700 truncate">
                      {user.role === "rep" ? "المندوب الطبي (776600049)" : user.name}
                    </div>
                  </div>
                </div>

                {/* Device Hardware & Biometric Status Mini-Bar */}
                <div className="flex items-center justify-between pt-1 border-t border-teal-100/80 text-3xs">
                  <button
                    type="button"
                    onClick={() => {
                      nativePlayClick();
                      setIsDeviceInfoModalOpen(true);
                    }}
                    className="flex items-center gap-1 text-teal-800 hover:text-teal-950 font-bold bg-white/80 px-2 py-1 rounded-lg border border-teal-200/60 transition-colors cursor-pointer shadow-2xs"
                    title="عرض مواصفات الهاتف والبطارية"
                  >
                    <Smartphone className="h-3 w-3 text-teal-600 shrink-0" />
                    <span>
                      {deviceInfo?.runtime?.batteryLevel ? `${deviceInfo.runtime.batteryLevel}%` : "الجهاز"}
                    </span>
                    {deviceInfo?.runtime?.isCharging && <span className="text-emerald-600">⚡</span>}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleToggleBiometricLock}
                      className={`p-1 rounded-lg border transition-colors cursor-pointer ${
                        isBiometricEnabled
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-50 text-slate-400 border-slate-200"
                      }`}
                      title={isBiometricEnabled ? "قفل البصمة مُفعّل (انقر للتعطيل)" : "انقر لتفعيل قفل البصمة 🔒"}
                    >
                      <Fingerprint className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        nativePlayClick();
                        nativeVibrate(30);
                        setIsAppLocked(true);
                      }}
                      className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                      title="قفل التطبيق بالبصمة فوراً 🔒"
                    >
                      <Lock className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Sidebar Navigation Items */}
            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-3 scrollbar-thin scrollbar-thumb-slate-200">
              {user.role === "rep" ? (
                /* REP SIDE NAVIGATION CATEGORIES */
                <>
                  <div className="space-y-1">
                    {!isSidebarCollapsed && (
                      <div className="px-3 text-4xs font-black uppercase tracking-wider text-teal-700 font-bold mb-1">
                        لوحة المؤشرات والتحليلات 📊
                      </div>
                    )}
                    <SidebarNavItem
                      icon={<BarChart3 className="h-4.5 w-4.5 text-teal-600 animate-pulse" />}
                      label="تحليلات السحابة والمؤشرات 📊"
                      active={repTab === "analytics"}
                      onClick={() => setRepTab("analytics")}
                      collapsed={isSidebarCollapsed}
                      highlight
                      id="sidebar-rep-analytics"
                    />
                  </div>

                  <div className="space-y-1">
                    {!isSidebarCollapsed && (
                      <div className="px-3 text-4xs font-black uppercase tracking-wider text-slate-400 mb-1">
                        العمليات والطلبيات
                      </div>
                    )}
                    <SidebarNavItem
                      icon={<Inbox className="h-4.5 w-4.5 text-teal-600" />}
                      label="طلبيات العملاء"
                      active={repTab === "orders"}
                      badge={pendingOrdersCount > 0 ? pendingOrdersCount : undefined}
                      badgeColor="bg-rose-500 text-white"
                      onClick={() => setRepTab("orders")}
                      collapsed={isSidebarCollapsed}
                      id="sidebar-rep-orders"
                    />
                    <SidebarNavItem
                      icon={<FileSpreadsheet className="h-4.5 w-4.5 text-indigo-600" />}
                      label="كشوفات الجرد"
                      active={repTab === "inventory"}
                      onClick={() => setRepTab("inventory")}
                      collapsed={isSidebarCollapsed}
                      id="sidebar-rep-inventory"
                    />
                  </div>

                  <div className="space-y-1">
                    {!isSidebarCollapsed && (
                      <div className="px-3 text-4xs font-black uppercase tracking-wider text-slate-400 mb-1">
                        إدارة الأصناف والعملاء
                      </div>
                    )}
                    <SidebarNavItem
                      icon={<PlusCircle className="h-4.5 w-4.5 text-cyan-600" />}
                      label="إدارة الأصناف"
                      active={repTab === "catalog"}
                      onClick={() => setRepTab("catalog")}
                      collapsed={isSidebarCollapsed}
                      id="sidebar-rep-catalog"
                    />
                    <SidebarNavItem
                      icon={<Users className="h-4.5 w-4.5 text-emerald-600" />}
                      label="العملاء المسجلون"
                      active={repTab === "clients"}
                      onClick={() => setRepTab("clients")}
                      collapsed={isSidebarCollapsed}
                      id="sidebar-rep-clients"
                    />
                    <SidebarNavItem
                      icon={<ClipboardList className="h-4.5 w-4.5 text-teal-600" />}
                      label="زيارات المندوب والذكاء 🪄"
                      active={repTab === "visits"}
                      onClick={() => setRepTab("visits")}
                      collapsed={isSidebarCollapsed}
                      id="sidebar-rep-visits"
                    />
                    <SidebarNavItem
                      icon={<MapPin className="h-4.5 w-4.5 text-teal-600" />}
                      label="خريطة الزيارات (Google Maps) 🗺️"
                      active={repTab === "maps"}
                      onClick={() => setRepTab("maps")}
                      collapsed={isSidebarCollapsed}
                      highlight
                      id="sidebar-rep-maps"
                    />
                    <SidebarNavItem
                      icon={<FileCheck2 className="h-4.5 w-4.5 text-teal-600" />}
                      label="إدارة وتوثيق الاتفاقيات 🤝"
                      active={repTab === "agreements"}
                      badge={agreements.filter(a => a.status === "pending").length > 0 ? agreements.filter(a => a.status === "pending").length : undefined}
                      badgeColor="bg-amber-500 text-slate-950 font-black"
                      onClick={() => setRepTab("agreements")}
                      collapsed={isSidebarCollapsed}
                      highlight
                      id="sidebar-rep-agreements"
                    />
                  </div>

                  <div className="space-y-1">
                    {!isSidebarCollapsed && (
                      <div className="px-3 text-4xs font-black uppercase tracking-wider text-slate-400 mb-1">
                        التواصل والتثقيف
                      </div>
                    )}
                    <SidebarNavItem
                      icon={<Bell className="h-4.5 w-4.5 text-amber-500" />}
                      label="الإشعارات والتعاميم"
                      active={repTab === "notifications"}
                      badge={notifications.length > 0 ? notifications.length : undefined}
                      badgeColor="bg-amber-500 text-slate-950 font-black"
                      onClick={() => setRepTab("notifications")}
                      collapsed={isSidebarCollapsed}
                      id="sidebar-rep-notifications"
                    />
                    <SidebarNavItem
                      icon={<Sparkles className="h-4.5 w-4.5 text-teal-600 animate-pulse" />}
                      label="المساعد الذكي (Gemini AI) 🤖"
                      active={isGeminiChatModalOpen}
                      onClick={() => setIsGeminiChatModalOpen(true)}
                      collapsed={isSidebarCollapsed}
                      highlight
                      id="sidebar-rep-gemini"
                    />
                    <SidebarNavItem
                      icon={<Wand2 className="h-4.5 w-4.5 text-fuchsia-600 animate-pulse" />}
                      label="استوديو التصاميم والفيديو (AI Studio) 🎨🎬"
                      active={isCreativeStudioOpen}
                      onClick={() => setIsCreativeStudioOpen(true)}
                      collapsed={isSidebarCollapsed}
                      highlight
                      id="sidebar-rep-creative-studio"
                    />
                    <SidebarNavItem
                      icon={<BookOpen className="h-4.5 w-4.5 text-blue-600" />}
                      label="البحث العلمي الطبي"
                      active={repTab === "scientific" && !showBioscienceExplorer}
                      onClick={() => {
                        setRepTab("scientific");
                        setShowBioscienceExplorer(false);
                      }}
                      collapsed={isSidebarCollapsed}
                      id="sidebar-rep-scientific"
                    />
                    <SidebarNavItem
                      icon={<FlaskConical className="h-4.5 w-4.5 text-cyan-600 animate-pulse" />}
                      label="مختبر العلوم الحيوية والأدوية 🧬🔬"
                      active={repTab === "scientific" && showBioscienceExplorer}
                      onClick={() => {
                        setRepTab("scientific");
                        setShowBioscienceExplorer(true);
                      }}
                      collapsed={isSidebarCollapsed}
                      highlight
                      id="sidebar-rep-bioscience"
                    />
                    <SidebarNavItem
                      icon={<Mic className="h-4.5 w-4.5 text-purple-600" />}
                      label="النسخ الصوتي الذكي (Gemini Transcribe) 🎙️"
                      active={isAudioTranscriberOpen}
                      onClick={() => setIsAudioTranscriberOpen(true)}
                      collapsed={isSidebarCollapsed}
                      highlight
                      id="sidebar-rep-transcribe"
                    />
                    <SidebarNavItem
                      icon={<GraduationCap className="h-4.5 w-4.5 text-emerald-600" />}
                      label="اختبر نفسك قبل الامتحان 🎓"
                      active={repTab === "exams"}
                      onClick={() => setRepTab("exams")}
                      collapsed={isSidebarCollapsed}
                      highlight
                      id="sidebar-rep-exams"
                    />
                    <SidebarNavItem
                      icon={<Trophy className="h-4.5 w-4.5 text-amber-600" />}
                      label="سلة الألعاب الطبية 🎮"
                      active={repTab === "games"}
                      onClick={() => setRepTab("games")}
                      collapsed={isSidebarCollapsed}
                      highlight
                      id="sidebar-rep-games"
                    />
                    <SidebarNavItem
                      icon={<MessageSquareHeart className="h-4.5 w-4.5 text-rose-600" />}
                      label="صندوق الشكاوى والاقتراحات 📬"
                      active={repTab === "complaints"}
                      badge={complaints.filter(c => c.status === "pending").length > 0 ? complaints.filter(c => c.status === "pending").length : undefined}
                      badgeColor="bg-rose-500 text-white font-black"
                      onClick={() => setRepTab("complaints")}
                      collapsed={isSidebarCollapsed}
                      highlight
                      id="sidebar-rep-complaints"
                    />
                    <SidebarNavItem
                      icon={<Sparkles className="h-4.5 w-4.5 text-purple-600" />}
                      label="فيديو طريقة الاستخدام 📱"
                      active={false}
                      onClick={() => setIsPromoVideoOpen(true)}
                      collapsed={isSidebarCollapsed}
                      id="sidebar-rep-guide-video"
                    />
                    <SidebarNavItem
                      icon={<Sparkles className="h-4.5 w-4.5 text-emerald-600" />}
                      label="دليل البدء (Remote Config) 🚀"
                      active={false}
                      onClick={() => setIsOnboardingOpen(true)}
                      collapsed={isSidebarCollapsed}
                      id="sidebar-rep-onboarding-test"
                    />
                  </div>
                </>
              ) : (
                /* PHARMACY / DOCTOR SIDE NAVIGATION CATEGORIES */
                <>
                  <div className="space-y-1">
                    {!isSidebarCollapsed && (
                      <div className="px-3 text-4xs font-black uppercase tracking-wider text-slate-400 mb-1">
                        الطلب والجرد
                      </div>
                    )}
                    <SidebarNavItem
                      icon={<FileSpreadsheet className="h-4.5 w-4.5 text-teal-600" />}
                      label="قائمة أصناف المندوب د/ بلال القيسي"
                      active={activeTab === "sheet"}
                      onClick={() => setActiveTab("sheet")}
                      collapsed={isSidebarCollapsed}
                      id="sidebar-pharmacy-sheet"
                    />
                    <SidebarNavItem
                      icon={<ShoppingCart className="h-4.5 w-4.5 text-indigo-600" />}
                      label="الطلبيات المرسلة"
                      active={activeTab === "history"}
                      badge={orders.length > 0 ? orders.length : undefined}
                      badgeColor="bg-teal-100 text-teal-800"
                      onClick={() => setActiveTab("history")}
                      collapsed={isSidebarCollapsed}
                      id="sidebar-pharmacy-history"
                    />
                    <SidebarNavItem
                      icon={<ClipboardList className="h-4.5 w-4.5 text-cyan-600" />}
                      label="كشوفات الجرد"
                      active={activeTab === "reports"}
                      onClick={() => setActiveTab("reports")}
                      collapsed={isSidebarCollapsed}
                      id="sidebar-pharmacy-reports"
                    />
                  </div>

                  <div className="space-y-1">
                    {!isSidebarCollapsed && (
                      <div className="px-3 text-4xs font-black uppercase tracking-wider text-slate-400 mb-1">
                        الخدمات والتواصل
                      </div>
                    )}
                    <SidebarNavItem
                      icon={<Users className="h-4.5 w-4.5 text-emerald-600" />}
                      label="سجل الزيارات الميدانية"
                      active={activeTab === "visits"}
                      onClick={() => setActiveTab("visits")}
                      collapsed={isSidebarCollapsed}
                      id="sidebar-pharmacy-visits"
                    />
                    <SidebarNavItem
                      icon={<MapPin className="h-4.5 w-4.5 text-teal-600" />}
                      label="خريطة التغطية (Google Maps) 🗺️"
                      active={activeTab === "maps"}
                      onClick={() => setActiveTab("maps")}
                      collapsed={isSidebarCollapsed}
                      highlight
                      id="sidebar-pharmacy-maps"
                    />
                    <SidebarNavItem
                      icon={<FileCheck2 className="h-4.5 w-4.5 text-teal-600" />}
                      label="الاتفاقيات والبونص 🎁"
                      active={activeTab === "agreements"}
                      badge={agreements.filter(a => (a.clientId === user?.id || a.clientPhone === user?.phone) && a.status === "pending").length > 0 ? agreements.filter(a => (a.clientId === user?.id || a.clientPhone === user?.phone) && a.status === "pending").length : undefined}
                      badgeColor="bg-amber-500 text-slate-950 font-black"
                      onClick={() => setActiveTab("agreements")}
                      collapsed={isSidebarCollapsed}
                      highlight
                      id="sidebar-pharmacy-agreements"
                    />
                    <SidebarNavItem
                      icon={<MessageSquareHeart className="h-4.5 w-4.5 text-rose-600" />}
                      label="صندوق الشكاوى والاقتراحات 📬"
                      active={activeTab === "complaints"}
                      badge={complaints.filter(c => (c.clientId === user?.id || c.clientPhone === user?.phone) && c.adminReply && c.status === "resolved").length > 0 ? "رد جديد" : undefined}
                      badgeColor="bg-emerald-500 text-white font-black"
                      onClick={() => setActiveTab("complaints")}
                      collapsed={isSidebarCollapsed}
                      highlight
                      id="sidebar-pharmacy-complaints"
                    />
                    <SidebarNavItem
                      icon={<Bell className="h-4.5 w-4.5 text-amber-500" />}
                      label="الإشعارات والتعاميم"
                      active={activeTab === "notifications"}
                      badge={notifications.length > 0 ? notifications.length : undefined}
                      badgeColor="bg-amber-500 text-slate-950 font-black"
                      onClick={() => setActiveTab("notifications")}
                      collapsed={isSidebarCollapsed}
                      id="sidebar-pharmacy-notifications"
                    />
                    <SidebarNavItem
                      icon={<BookOpen className="h-4.5 w-4.5 text-blue-600" />}
                      label="البحث العلمي الطبي"
                      active={activeTab === "scientific" && !showBioscienceExplorer}
                      onClick={() => {
                        setActiveTab("scientific");
                        setShowBioscienceExplorer(false);
                      }}
                      collapsed={isSidebarCollapsed}
                      id="sidebar-pharmacy-scientific"
                    />
                    <SidebarNavItem
                      icon={<FlaskConical className="h-4.5 w-4.5 text-cyan-600 animate-pulse" />}
                      label="مختبر العلوم الحيوية والأدوية 🧬🔬"
                      active={activeTab === "scientific" && showBioscienceExplorer}
                      onClick={() => {
                        setActiveTab("scientific");
                        setShowBioscienceExplorer(true);
                      }}
                      collapsed={isSidebarCollapsed}
                      highlight
                      id="sidebar-pharmacy-bioscience"
                    />
                    <SidebarNavItem
                      icon={<Mic className="h-4.5 w-4.5 text-purple-600" />}
                      label="النسخ الصوتي الذكي (Gemini Transcribe) 🎙️"
                      active={isAudioTranscriberOpen}
                      onClick={() => setIsAudioTranscriberOpen(true)}
                      collapsed={isSidebarCollapsed}
                      highlight
                      id="sidebar-pharmacy-transcribe"
                    />
                    <SidebarNavItem
                      icon={<Sparkles className="h-4.5 w-4.5 text-teal-600 animate-pulse" />}
                      label="المساعد الذكي (Gemini AI) 🤖"
                      active={isGeminiChatModalOpen}
                      onClick={() => setIsGeminiChatModalOpen(true)}
                      collapsed={isSidebarCollapsed}
                      highlight
                      id="sidebar-pharmacy-gemini"
                    />
                    <SidebarNavItem
                      icon={<GraduationCap className="h-4.5 w-4.5 text-emerald-600" />}
                      label="اختبر نفسك قبل الامتحان 🎓"
                      active={activeTab === "exams"}
                      onClick={() => {
                        setActiveTab("exams");
                        setClientScreenStep(8);
                      }}
                      collapsed={isSidebarCollapsed}
                      highlight
                      id="sidebar-pharmacy-exams"
                    />
                    <SidebarNavItem
                      icon={<Trophy className="h-4.5 w-4.5 text-amber-600" />}
                      label="سلة الألعاب الطبية 🎮"
                      active={activeTab === "games"}
                      onClick={() => setActiveTab("games")}
                      collapsed={isSidebarCollapsed}
                      highlight
                      id="sidebar-pharmacy-games"
                    />
                    <SidebarNavItem
                      icon={<Sparkles className="h-4.5 w-4.5 text-purple-600" />}
                      label="فيديو طريقة الاستخدام 📱"
                      active={false}
                      onClick={() => setIsPromoVideoOpen(true)}
                      collapsed={isSidebarCollapsed}
                      id="sidebar-pharmacy-guide-video"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Sidebar Bottom Actions */}
            <div className="p-3 border-t border-slate-100 space-y-2 bg-slate-50/50">
              {!isSidebarCollapsed ? (
                <div className="p-2.5 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl border border-teal-200/80 text-xs space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-between text-3xs font-black text-teal-800">
                    <span className="flex items-center gap-1">
                      <Globe className="h-3 w-3 text-teal-600" />
                      الرابط الرسمي المعتمد للتطبيق
                    </span>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <p className="text-3xs font-mono font-bold text-slate-700 truncate dir-ltr" title={OFFICIAL_APP_URL}>
                    {OFFICIAL_APP_URL}
                  </p>
                  <div className="flex items-center gap-1 pt-0.5">
                    <a
                      href={OFFICIAL_APP_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1 py-1 px-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-4xs font-bold transition-colors"
                      title="فتح الرابط الرسمي"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>فتح</span>
                    </a>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(OFFICIAL_APP_URL);
                        showSuccess("تم نسخ الرابط الرسمي المعتمد للتطبيق بنجاح!");
                      }}
                      className="p-1 bg-white hover:bg-teal-100 text-teal-700 rounded-lg border border-teal-200 transition-colors cursor-pointer"
                      title="نسخ الرابط الرسمي الوحيد"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => setIsAppQrModalOpen(true)}
                      className="p-1 bg-white hover:bg-teal-100 text-teal-700 rounded-lg border border-teal-200 transition-colors cursor-pointer"
                      title="رمز QR للرابط الرسمي"
                    >
                      <QrCode className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ) : (
                <a
                  href={OFFICIAL_APP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center p-2 rounded-xl text-teal-700 hover:bg-teal-50 transition-colors"
                  title={`الرابط الرسمي المعتمد: ${OFFICIAL_APP_URL}`}
                >
                  <Globe className="h-4.5 w-4.5 text-teal-600" />
                </a>
              )}

              <button
                onClick={() => setIsOfflineSyncModalOpen(true)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 hover:bg-teal-50 border border-slate-200/80 hover:border-teal-200 text-slate-700 hover:text-teal-800 transition-colors"
                title="مركز المزامنة وقاعدة البيانات المحلية IndexedDB"
              >
                <div className="flex items-center gap-2">
                  {!isOnlineState ? (
                    <WifiOff className="h-4.5 w-4.5 text-rose-500 shrink-0" />
                  ) : (
                    <Database className="h-4.5 w-4.5 text-teal-600 shrink-0" />
                  )}
                  {!isSidebarCollapsed && (
                    <span>{!isOnlineState ? "أوفلاين (IndexedDB)" : isFirebaseConfigured && db ? "سحابي (Firestore) ☁️" : "المزامنة والتخزين"}</span>
                  )}
                </div>
                {pendingSyncCount > 0 && !isSidebarCollapsed && (
                  <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-black text-slate-950">
                    {pendingSyncCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setIsSettingsModalOpen(true)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 shadow-2xs transition-colors"
                title="إعدادات التطبيق وتنزيل APK"
              >
                <Settings className="h-4.5 w-4.5 text-teal-700 shrink-0" />
                {!isSidebarCollapsed && <span>إعدادات التطبيق (APK)</span>}
              </button>

              <button
                onClick={() => setIsUserProfileModalOpen(true)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-teal-800 bg-teal-50/70 hover:bg-teal-100/70 border border-teal-200/60 transition-colors"
                title={isBelalAdmin ? "الملف التعريفي والصورة الرسمية (د/ بلال القيسي)" : "بيانات الحساب والمنشأة الطبية"}
              >
                <UserCheck className="h-4.5 w-4.5 text-teal-700 shrink-0" />
                {!isSidebarCollapsed && <span>{isBelalAdmin ? "الملف التعريفي وصورتي الرسمية" : "بيانات الحساب والمنشأة"}</span>}
              </button>

              <button
                onClick={fetchUserSpecificData}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                title="تحديث البيانات"
              >
                <RefreshCw className="h-4.5 w-4.5 text-teal-600 shrink-0" />
                {!isSidebarCollapsed && <span>تحديث البيانات</span>}
              </button>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                title="تسجيل الخروج"
              >
                <LogOut className="h-4.5 w-4.5 text-rose-500 shrink-0" />
                {!isSidebarCollapsed && <span>تسجيل الخروج</span>}
              </button>
            </div>
          </aside>

          {/* MOBILE TOP BAR (`lg:hidden`) */}
          <div className="lg:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="p-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors"
                title="فتح القائمة الجانبية"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsDrProfileModalOpen(true)}
                  className="cursor-pointer group relative shrink-0"
                  title="عرض هوية وبطاقة د/ بلال القيسي"
                >
                  <img
                    src={"/app-logo.png"}
                    alt="د/ بلال القيسي - مندوبك الطبي"
                    className="h-9 w-9 rounded-full object-cover border-2 border-teal-600 shadow-xs group-hover:scale-105 transition-transform ring-1 ring-teal-500/30"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white"></span>
                </button>
                <div onClick={() => setIsDrProfileModalOpen(true)} className="cursor-pointer">
                  <h1 className="text-sm font-black text-slate-900 leading-tight">مندوبك الطبي</h1>
                  <p className="text-4xs text-teal-700 font-bold">
                    د/ بلال القيسي 👨‍⚕️
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* APK Download Button for Mobile Top Bar */}
              <button
                type="button"
                onClick={() => setIsDownloadApkModalOpen(true)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-3xs font-black text-white bg-gradient-to-r from-teal-600 to-emerald-600 shadow-xs active:scale-95 transition-transform"
                title="تثبيت التطبيق على الهاتف"
              >
                <Smartphone className="h-3 w-3 animate-bounce" />
                <span>تثبيت</span>
              </button>

              {/* Settings Button */}
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(true)}
                className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors"
                title="إعدادات التطبيق"
              >
                <Settings className="h-4 w-4 text-teal-700" />
              </button>

              {/* Mobile Offline / Online status trigger */}
              <button
                type="button"
                onClick={() => setIsOfflineSyncModalOpen(true)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-3xs font-bold border transition-colors ${
                  !isOnlineState
                    ? "bg-rose-50 border-rose-300 text-rose-700 animate-pulse"
                    : pendingSyncCount > 0
                    ? "bg-amber-50 border-amber-300 text-amber-800"
                    : "bg-emerald-50 border-emerald-300 text-emerald-800"
                }`}
                title="مركز المزامنة وقاعدة البيانات المحلية IndexedDB"
              >
                {!isOnlineState ? (
                  <WifiOff className="h-3 w-3 text-rose-600" />
                ) : (
                  <Database className="h-3 w-3 text-teal-600" />
                )}
                <span>{!isOnlineState ? "أوفلاين" : pendingSyncCount > 0 ? `${pendingSyncCount} معلق` : isFirebaseConfigured && db ? "سحابي ☁️" : "محدث"}</span>
              </button>

              {/* Clean mobile header with direct logout while all sync & telemetry operate in background */}
              <button
                onClick={handleLogout}
                className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                title="تسجيل الخروج"
              >
                <LogOut className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          {/* MOBILE SIDEBAR OVERLAY DRAWER */}
          <AnimatePresence>
            {isMobileSidebarOpen && (
              <>
                <motion.div
                  key="mobile-sidebar-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.5 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="lg:hidden fixed inset-0 bg-slate-900 z-50 backdrop-blur-xs"
                />
                <motion.aside
                  key="mobile-sidebar-drawer"
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="lg:hidden fixed inset-y-0 right-0 z-50 w-72 bg-white shadow-2xl flex flex-col border-l border-slate-200"
                >
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={"/app-logo.png"}
                        alt="شعار"
                        className="h-9 w-9 rounded-xl object-cover border border-teal-500/40 shadow-xs"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <h1 className="text-base font-black text-slate-900">مندوبك الطبي</h1>
                        <p className="text-3xs text-slate-500">القائمة والصفحات الجانبية</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsMobileSidebarOpen(false)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="p-3 bg-teal-50/60 border-b border-teal-100 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsDrProfileModalOpen(true);
                        setIsMobileSidebarOpen(false);
                      }}
                      className="cursor-pointer group relative shrink-0"
                      title="اضغط لعرض صورة وهوية د/ بلال القيسي بالكامل"
                    >
                      <img
                        src={"/app-logo.png"}
                        alt="د/ بلال القيسي"
                        className="h-12 w-12 rounded-full object-cover border-2 border-teal-500 shadow-md group-hover:scale-105 transition-transform ring-2 ring-teal-500/20"
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute -bottom-0.5 -left-0.5 bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-2xs">
                        ✓
                      </span>
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-black text-slate-900 truncate">
                        {user.role === "rep" ? "د/ بلال القيسي 👨‍⚕️" : (user.entityName || user.name)}
                      </div>
                      <div className="text-3xs text-teal-700 font-bold mt-0.5 truncate">
                        {user.role === "rep" ? "المندوب الطبي المعتمد (776600049)" : user.name}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 space-y-5">
                    {user.role === "rep" ? (
                      <>
                        <div className="space-y-1">
                          <div className="px-3 text-4xs font-black uppercase text-teal-700 font-bold">لوحة المؤشرات والتحليلات 📊</div>
                          <SidebarNavItem
                            icon={<BarChart3 className="h-4.5 w-4.5 text-teal-600 animate-pulse" />}
                            label="تحليلات السحابة والمؤشرات 📊"
                            active={repTab === "analytics"}
                            onClick={() => { setRepTab("analytics"); setIsMobileSidebarOpen(false); }}
                            highlight
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="px-3 text-4xs font-black uppercase text-slate-400">العمليات والطلبيات</div>
                          <SidebarNavItem
                            icon={<Inbox className="h-4.5 w-4.5 text-teal-600" />}
                            label="طلبيات العملاء"
                            active={repTab === "orders"}
                            badge={pendingOrdersCount > 0 ? pendingOrdersCount : undefined}
                            badgeColor="bg-rose-500 text-white"
                            onClick={() => { setRepTab("orders"); setIsMobileSidebarOpen(false); }}
                          />
                          <SidebarNavItem
                            icon={<FileSpreadsheet className="h-4.5 w-4.5 text-indigo-600" />}
                            label="كشوفات الجرد"
                            active={repTab === "inventory"}
                            onClick={() => { setRepTab("inventory"); setIsMobileSidebarOpen(false); }}
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="px-3 text-4xs font-black uppercase text-slate-400">إدارة الأصناف والعملاء</div>
                          <SidebarNavItem
                            icon={<PlusCircle className="h-4.5 w-4.5 text-cyan-600" />}
                            label="إدارة الأصناف"
                            active={repTab === "catalog"}
                            onClick={() => { setRepTab("catalog"); setIsMobileSidebarOpen(false); }}
                          />
                          <SidebarNavItem
                            icon={<Users className="h-4.5 w-4.5 text-emerald-600" />}
                            label="العملاء المسجلون"
                            active={repTab === "clients"}
                            onClick={() => { setRepTab("clients"); setIsMobileSidebarOpen(false); }}
                          />
                          <SidebarNavItem
                            icon={<ClipboardList className="h-4.5 w-4.5 text-teal-600" />}
                            label="زيارات المندوب والذكاء 🪄"
                            active={repTab === "visits"}
                            onClick={() => { setRepTab("visits"); setIsMobileSidebarOpen(false); }}
                          />
                          <SidebarNavItem
                            icon={<MapPin className="h-4.5 w-4.5 text-teal-600" />}
                            label="خريطة الزيارات (Google Maps) 🗺️"
                            active={repTab === "maps"}
                            onClick={() => { setRepTab("maps"); setIsMobileSidebarOpen(false); }}
                            highlight
                          />
                          <SidebarNavItem
                            icon={<FileCheck2 className="h-4.5 w-4.5 text-teal-600" />}
                            label="إدارة وتوثيق الاتفاقيات 🤝"
                            active={repTab === "agreements"}
                            badge={agreements.filter(a => a.status === "pending").length > 0 ? agreements.filter(a => a.status === "pending").length : undefined}
                            badgeColor="bg-amber-500 text-slate-950 font-black"
                            onClick={() => { setRepTab("agreements"); setIsMobileSidebarOpen(false); }}
                            highlight
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="px-3 text-4xs font-black uppercase text-slate-400">التواصل والتثقيف</div>
                          <SidebarNavItem
                            icon={<Bell className="h-4.5 w-4.5 text-amber-500" />}
                            label="الإشعارات والتعاميم"
                            active={repTab === "notifications"}
                            badge={notifications.length > 0 ? notifications.length : undefined}
                            badgeColor="bg-amber-500 text-slate-950 font-black"
                            onClick={() => { setRepTab("notifications"); setIsMobileSidebarOpen(false); }}
                          />
                          <SidebarNavItem
                            icon={<BookOpen className="h-4.5 w-4.5 text-blue-600" />}
                            label="البحث العلمي الطبي"
                            active={repTab === "scientific"}
                            onClick={() => { setRepTab("scientific"); setIsMobileSidebarOpen(false); }}
                          />
                          <SidebarNavItem
                            icon={<GraduationCap className="h-4.5 w-4.5 text-emerald-600" />}
                            label="اختبر نفسك قبل الامتحان 🎓"
                            active={repTab === "exams"}
                            onClick={() => { setRepTab("exams"); setIsMobileSidebarOpen(false); }}
                            highlight
                          />
                          <SidebarNavItem
                            icon={<Trophy className="h-4.5 w-4.5 text-amber-600" />}
                            label="سلة الألعاب الطبية 🎮"
                            active={repTab === "games"}
                            onClick={() => { setRepTab("games"); setIsMobileSidebarOpen(false); }}
                            highlight
                          />
                          <SidebarNavItem
                            icon={<MessageSquareHeart className="h-4.5 w-4.5 text-rose-600" />}
                            label="صندوق الشكاوى والاقتراحات 📬"
                            active={repTab === "complaints"}
                            badge={complaints.filter(c => c.status === "pending").length > 0 ? complaints.filter(c => c.status === "pending").length : undefined}
                            badgeColor="bg-rose-500 text-white font-black"
                            onClick={() => { setRepTab("complaints"); setIsMobileSidebarOpen(false); }}
                            highlight
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="px-3 text-4xs font-black uppercase text-slate-400">أدوات العيادات والصيدليات</div>
                          <SidebarNavItem
                            icon={<Calculator className="h-4.5 w-4.5 text-sky-600" />}
                            label="حاسبة جرعات الأطفال 👶"
                            active={repTab === "pediatric"}
                            onClick={() => { setRepTab("pediatric"); setIsMobileSidebarOpen(false); }}
                          />
                          <SidebarNavItem
                            icon={<Star className="h-4.5 w-4.5 text-amber-500" />}
                            label="برنامج ولاء ومكافآت العملاء ⭐"
                            active={repTab === "loyalty"}
                            onClick={() => { setRepTab("loyalty"); setIsMobileSidebarOpen(false); }}
                          />
                          <SidebarNavItem
                            icon={<Zap className="h-4.5 w-4.5 text-rose-600" />}
                            label="البونص الخاطف وتنسيق الرواكد ⚡"
                            active={repTab === "flash"}
                            onClick={() => { setRepTab("flash"); setIsMobileSidebarOpen(false); }}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-1">
                          <div className="px-3 text-4xs font-black uppercase text-slate-400">الطلب والجرد</div>
                          <SidebarNavItem
                            icon={<FileSpreadsheet className="h-4.5 w-4.5 text-teal-600" />}
                            label="قائمة أصناف المندوب د/ بلال القيسي"
                            active={activeTab === "sheet"}
                            onClick={() => { setActiveTab("sheet"); setIsMobileSidebarOpen(false); }}
                          />
                          <SidebarNavItem
                            icon={<ShoppingCart className="h-4.5 w-4.5 text-indigo-600" />}
                            label="الطلبيات المرسلة"
                            active={activeTab === "history"}
                            badge={orders.length > 0 ? orders.length : undefined}
                            badgeColor="bg-teal-100 text-teal-800"
                            onClick={() => { setActiveTab("history"); setIsMobileSidebarOpen(false); }}
                          />
                          <SidebarNavItem
                            icon={<ClipboardList className="h-4.5 w-4.5 text-cyan-600" />}
                            label="كشوفات الجرد"
                            active={activeTab === "reports"}
                            onClick={() => { setActiveTab("reports"); setIsMobileSidebarOpen(false); }}
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="px-3 text-4xs font-black uppercase text-slate-400">الخدمات والتواصل</div>
                          <SidebarNavItem
                            icon={<Users className="h-4.5 w-4.5 text-emerald-600" />}
                            label="سجل الزيارات الميدانية"
                            active={activeTab === "visits"}
                            onClick={() => { setActiveTab("visits"); setIsMobileSidebarOpen(false); }}
                          />
                          <SidebarNavItem
                            icon={<MapPin className="h-4.5 w-4.5 text-teal-600" />}
                            label="خريطة التغطية (Google Maps) 🗺️"
                            active={activeTab === "maps"}
                            onClick={() => { setActiveTab("maps"); setIsMobileSidebarOpen(false); }}
                            highlight
                          />
                          <SidebarNavItem
                            icon={<FileCheck2 className="h-4.5 w-4.5 text-teal-600" />}
                            label="الاتفاقيات والبونص 🎁"
                            active={activeTab === "agreements"}
                            badge={agreements.filter(a => (a.clientId === user?.id || a.clientPhone === user?.phone) && a.status === "pending").length > 0 ? agreements.filter(a => (a.clientId === user?.id || a.clientPhone === user?.phone) && a.status === "pending").length : undefined}
                            badgeColor="bg-amber-500 text-slate-950 font-black"
                            onClick={() => { setActiveTab("agreements"); setIsMobileSidebarOpen(false); }}
                            highlight
                          />
                          <SidebarNavItem
                            icon={<MessageSquareHeart className="h-4.5 w-4.5 text-rose-600" />}
                            label="صندوق الشكاوى والاقتراحات 📬"
                            active={activeTab === "complaints"}
                            badge={complaints.filter(c => (c.clientId === user?.id || c.clientPhone === user?.phone) && c.adminReply && c.status === "resolved").length > 0 ? "رد جديد" : undefined}
                            badgeColor="bg-emerald-500 text-white font-black"
                            onClick={() => { setActiveTab("complaints"); setIsMobileSidebarOpen(false); }}
                            highlight
                          />
                          <SidebarNavItem
                            icon={<Bell className="h-4.5 w-4.5 text-amber-500" />}
                            label="الإشعارات والتعاميم"
                            active={activeTab === "notifications"}
                            badge={notifications.length > 0 ? notifications.length : undefined}
                            badgeColor="bg-amber-500 text-slate-950 font-black"
                            onClick={() => { setActiveTab("notifications"); setIsMobileSidebarOpen(false); }}
                          />
                          <SidebarNavItem
                            icon={<BookOpen className="h-4.5 w-4.5 text-blue-600" />}
                            label="البحث العلمي الطبي"
                            active={activeTab === "scientific" && !showBioscienceExplorer}
                            onClick={() => {
                              setActiveTab("scientific");
                              setShowBioscienceExplorer(false);
                              setIsMobileSidebarOpen(false);
                            }}
                          />
                          <SidebarNavItem
                            icon={<FlaskConical className="h-4.5 w-4.5 text-cyan-600 animate-pulse" />}
                            label="مختبر العلوم الحيوية والأدوية 🧬🔬"
                            active={activeTab === "scientific" && showBioscienceExplorer}
                            onClick={() => {
                              setActiveTab("scientific");
                              setShowBioscienceExplorer(true);
                              setIsMobileSidebarOpen(false);
                            }}
                            highlight
                          />
                          <SidebarNavItem
                            icon={<Mic className="h-4.5 w-4.5 text-purple-600" />}
                            label="النسخ الصوتي الذكي (Gemini Transcribe) 🎙️"
                            active={isAudioTranscriberOpen}
                            onClick={() => {
                              setIsAudioTranscriberOpen(true);
                              setIsMobileSidebarOpen(false);
                            }}
                            highlight
                          />
                          <SidebarNavItem
                            icon={<Sparkles className="h-4.5 w-4.5 text-teal-600 animate-pulse" />}
                            label="المساعد الذكي (Gemini AI) 🤖"
                            active={isGeminiChatModalOpen}
                            onClick={() => {
                              setIsGeminiChatModalOpen(true);
                              setIsMobileSidebarOpen(false);
                            }}
                            highlight
                          />
                          <SidebarNavItem
                            icon={<GraduationCap className="h-4.5 w-4.5 text-emerald-600" />}
                            label="اختبر نفسك قبل الامتحان 🎓"
                            active={activeTab === "exams"}
                            onClick={() => {
                              setActiveTab("exams");
                              setClientScreenStep(8);
                              setIsMobileSidebarOpen(false);
                            }}
                            highlight
                          />
                          <SidebarNavItem
                            icon={<Trophy className="h-4.5 w-4.5 text-amber-600" />}
                            label="سلة الألعاب الطبية 🎮"
                            active={activeTab === "games"}
                            onClick={() => { setActiveTab("games"); setIsMobileSidebarOpen(false); }}
                            highlight
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <div className="p-3 border-t border-slate-100 space-y-2 bg-slate-50">
                    <button
                      onClick={() => {
                        setIsMobileSidebarOpen(false);
                        setIsOfflineSyncModalOpen(true);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-teal-50 hover:text-teal-800"
                    >
                      <div className="flex items-center gap-2">
                        {!isOnlineState ? (
                          <WifiOff className="h-4 w-4 text-rose-500" />
                        ) : (
                          <Database className="h-4 w-4 text-teal-600" />
                        )}
                        <span>مركز المزامنة وIndexedDB</span>
                      </div>
                      {pendingSyncCount > 0 && (
                        <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-black text-slate-950">
                          {pendingSyncCount}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setIsMobileSidebarOpen(false);
                        setIsSettingsModalOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-slate-800 bg-white border border-slate-200 shadow-2xs hover:bg-slate-50"
                    >
                      <Settings className="h-4 w-4 text-teal-700" />
                      <span>إعدادات التطبيق وتنزيل APK</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsMobileSidebarOpen(false);
                        setIsUserProfileModalOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200/70"
                    >
                      <UserCheck className="h-4 w-4 text-teal-700" />
                      <span>{isBelalAdmin ? "الملف التعريفي وتعديل صورتي الرسمية" : "بيانات الحساب والمنشأة"}</span>
                    </button>

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50"
                    >
                      <LogOut className="h-4 w-4 text-rose-500" />
                      <span>تسجيل الخروج</span>
                    </button>
                  </div>
                </motion.aside>
              </>
            )}
          </AnimatePresence>

          {/* NATIVE MOBILE BOTTOM NAVIGATION BAR */}
          {user && (
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/90 px-2 py-1.5 flex items-center justify-around shadow-lg native-bottom-nav">
              {user.role === "rep" ? (
                <>
                  <button
                    type="button"
                    onClick={() => setRepTab("analytics")}
                    className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all relative ${
                      repTab === "analytics"
                        ? "text-teal-700 font-black bg-teal-50/90 shadow-2xs"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <BarChart3 className={`h-5 w-5 ${repTab === "analytics" ? "scale-110 text-teal-700" : ""}`} />
                    <span className="text-[10px] font-bold mt-0.5">المؤشرات</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRepTab("orders")}
                    className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all relative ${
                      repTab === "orders"
                        ? "text-teal-700 font-black bg-teal-50/90 shadow-2xs"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <ShoppingCart className={`h-5 w-5 ${repTab === "orders" ? "scale-110 text-teal-700" : ""}`} />
                    <span className="text-[10px] font-bold mt-0.5">الطلبيات</span>
                    {orders.length > 0 && (
                      <span className="absolute top-0.5 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-teal-600 text-[9px] font-bold text-white shadow-xs">
                        {orders.length}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setRepTab("catalog")}
                    className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all ${
                      repTab === "catalog"
                        ? "text-teal-700 font-black bg-teal-50/90 shadow-2xs"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <Pill className={`h-5 w-5 ${repTab === "catalog" ? "scale-110 text-teal-700" : ""}`} />
                    <span className="text-[10px] font-bold mt-0.5">الكتالوج</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRepTab("clients")}
                    className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all ${
                      repTab === "clients"
                        ? "text-teal-700 font-black bg-teal-50/90 shadow-2xs"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <Users className={`h-5 w-5 ${repTab === "clients" ? "scale-110 text-teal-700" : ""}`} />
                    <span className="text-[10px] font-bold mt-0.5">العملاء</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRepTab("inventory")}
                    className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all ${
                      repTab === "inventory"
                        ? "text-teal-700 font-black bg-teal-50/90 shadow-2xs"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <BarChart2 className={`h-5 w-5 ${repTab === "inventory" ? "scale-110 text-teal-700" : ""}`} />
                    <span className="text-[10px] font-bold mt-0.5">المخزون</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsMobileSidebarOpen(true)}
                    className="flex flex-col items-center justify-center py-1 px-3 rounded-2xl text-slate-500 hover:text-slate-900 transition-all"
                  >
                    <Menu className="h-5 w-5" />
                    <span className="text-[10px] font-bold mt-0.5">المزيد</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveTab("sheet")}
                    className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all ${
                      activeTab === "sheet"
                        ? "text-teal-700 font-black bg-teal-50/90 shadow-2xs"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <Pill className={`h-5 w-5 ${activeTab === "sheet" ? "scale-110 text-teal-700" : ""}`} />
                    <span className="text-[10px] font-bold mt-0.5">قائمة الأصناف</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("history")}
                    className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all relative ${
                      activeTab === "history"
                        ? "text-teal-700 font-black bg-teal-50/90 shadow-2xs"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <ShoppingCart className={`h-5 w-5 ${activeTab === "history" ? "scale-110 text-teal-700" : ""}`} />
                    <span className="text-[10px] font-bold mt-0.5">طلبياتي</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("reports")}
                    className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all ${
                      activeTab === "reports"
                        ? "text-teal-700 font-black bg-teal-50/90 shadow-2xs"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <BarChart2 className={`h-5 w-5 ${activeTab === "reports" ? "scale-110 text-teal-700" : ""}`} />
                    <span className="text-[10px] font-bold mt-0.5">جرد المخزون</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsMobileSidebarOpen(true)}
                    className="flex flex-col items-center justify-center py-1 px-3 rounded-2xl text-slate-500 hover:text-slate-900 transition-all"
                  >
                    <Menu className="h-5 w-5" />
                    <span className="text-[10px] font-bold mt-0.5">القائمة</span>
                  </button>
                </>
              )}
            </div>
          )}

          {/* MAIN WORKSPACE CONTENT STAGE */}
          <div className="flex-1 min-w-0 flex flex-col min-h-screen">
            {/* Top Workspace Header */}
            <header className="hidden lg:flex items-center justify-between px-4 py-2 bg-white border-b border-slate-200/90 sticky top-0 z-20 shadow-2xs">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
                <div>
                  <h2 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                    {user.role === "rep" ? (
                      <>
                        {repTab === "analytics" && "📊 لوحة التحليلات والمؤشرات السحابية (Firestore Analytics)"}
                        {repTab === "orders" && "📥 طلبيات العملاء الواردة"}
                        {repTab === "inventory" && "📊 كشوفات الجرد المخزني"}
                        {repTab === "catalog" && "💊 إدارة الأصناف والأسعار"}
                        {repTab === "clients" && "👥 قائمة العملاء والصيدليات المسجلة"}
                        {repTab === "visits" && "📋 سجل الزيارات الميدانية والذكاء الاصطناعي 🪄"}
                        {repTab === "maps" && "🗺️ خريطة الزيارات الميدانية والتغطية (Google Maps)"}
                        {repTab === "notifications" && "🔔 الإشعارات والتعاميم الموجهة"}
                        {repTab === "scientific" && "📚 المرجع والبحث العلمي الطبي"}
                        {repTab === "games" && "🎮 سلة الألعاب والتحديات الطبية"}
                      </>
                    ) : (
                      <>
                        {activeTab === "sheet" && "📄 قائمة أصناف المندوب د/ بلال القيسي"}
                        {activeTab === "history" && "🛒 سجل الطلبيات المرسلة"}
                        {activeTab === "reports" && "📊 كشوفات الجرد الفردية"}
                        {activeTab === "visits" && "👥 سجل الزيارات الميدانية والمهام"}
                        {activeTab === "maps" && "🗺️ خريطة التغطية والمواقع الطبية (Google Maps)"}
                        {activeTab === "notifications" && "🔔 الإشعارات والتعاميم"}
                        {activeTab === "scientific" && "📚 البحث والمرجع العلمي الطبي"}
                        {activeTab === "games" && "🏆 سلة الألعاب التنافسية الطبية 🎮"}
                      </>
                    )}
                  </h2>
                  <p className="text-4xs text-slate-500 font-medium">
                    تطبيق مندوبك الطبي (د/ بلال القيسي - 776600049)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* APK Download Button for Android Devices */}
                <button
                  type="button"
                  onClick={() => setIsDownloadApkModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-3xs font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-xs transition-all cursor-pointer hover:shadow-sm active:scale-95"
                  title="تثبيت التطبيق على الهاتف"
                  id="btn-workspace-download-apk"
                >
                  <Smartphone className="h-3.5 w-3.5 animate-bounce" />
                  <span>تثبيت التطبيق على الهاتف 📱</span>
                </button>

                {/* App Settings Button */}
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(true)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors shadow-2xs cursor-pointer active:scale-95"
                  title="إعدادات التطبيق وخيارات النظام"
                  id="btn-workspace-settings"
                >
                  <Settings className="h-3.5 w-3.5 text-teal-700" />
                  <span>الإعدادات</span>
                </button>

                {/* Auto background sync indicator & IndexedDB Sync Center Trigger */}
                <button
                  type="button"
                  onClick={() => setIsOfflineSyncModalOpen(true)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-3xs font-bold border transition-all cursor-pointer ${
                    !isOnlineState
                      ? "bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100"
                      : pendingSyncCount > 0
                      ? "bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100 animate-pulse"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-teal-50 hover:border-teal-200 hover:text-teal-800"
                  }`}
                  title="المزامنة التلقائية مع قاعدة البيانات السحابية والمحلية (IndexedDB)"
                  id="btn-workspace-sync-center"
                >
                  {!isOnlineState ? (
                    <WifiOff className="h-3.5 w-3.5 text-rose-600" />
                  ) : (
                    <span className="relative flex h-2 w-2">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isSyncing || pendingSyncCount > 0 ? "bg-amber-400" : "bg-emerald-400"} opacity-75`}></span>
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${isSyncing || pendingSyncCount > 0 ? "bg-amber-500" : "bg-emerald-500"}`}></span>
                    </span>
                  )}
                  <span>
                    {!isOnlineState
                      ? "أوفلاين (IndexedDB)"
                      : isSyncing
                      ? "جاري المزامنة..."
                      : pendingSyncCount > 0
                      ? `معلق للمزامنة (${pendingSyncCount})`
                      : isFirebaseConfigured && db
                      ? "سحابي (Firestore) ☁️"
                      : "متصل بالخلفية"}
                  </span>
                  {pendingSyncCount > 0 && (
                    <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-black text-slate-950">
                      {pendingSyncCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => fetchUserSpecificData(false, true)}
                  disabled={isSyncing}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors shadow-2xs cursor-pointer active:scale-95"
                  title="تحديث البيانات يدويًا"
                  id="btn-workspace-refresh"
                >
                  <RefreshCw className={`h-3 w-3 text-teal-600 ${isSyncing ? "animate-spin" : ""}`} />
                  <span>تحديث</span>
                </button>
              </div>
            </header>

            {/* View Container */}
            <main className="flex-1 p-1.5 sm:p-3 md:p-4 max-w-full lg:max-w-[1600px] w-full mx-auto space-y-3 sm:space-y-4">
              {user.role === "rep" ? (
          /* ============================================================== */
          /* CLIENT ROLE: MEDICAL REPRESENTATIVE (ADMIN / SALES DELEGATE) */
          /* ============================================================== */
          <div className="space-y-3 sm:space-y-4">
            {/* Sales Representative Top Stats Cards - Luxury Modern Grid */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 sm:gap-3">
              <div className="glass-card glass-card-hover rounded-xl p-3 sm:p-3.5 border border-slate-200/90 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-teal-500/5 rounded-full blur-lg pointer-events-none" />
                <div className="flex items-center justify-between relative">
                  <span className="text-2xs font-bold text-slate-500">إجمالي الطلبيات</span>
                  <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-teal-50 border border-teal-200/60 text-teal-700 shadow-2xs">
                    <ShoppingCart className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 relative flex items-baseline gap-1.5">
                  <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{orders.length}</span>
                  <span className="text-4xs font-bold text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded-full border border-teal-200/50">طلب</span>
                </div>
              </div>

              <div className="glass-card glass-card-hover rounded-xl p-3 sm:p-3.5 border border-amber-200/60 bg-gradient-to-br from-white via-amber-50/20 to-white relative overflow-hidden">
                <div className="flex items-center justify-between relative">
                  <span className="text-2xs font-bold text-slate-600">قيد الانتظار</span>
                  <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-amber-50 border border-amber-200/70 text-amber-600 shadow-2xs">
                    <Clock className="h-4 w-4 animate-pulse" />
                  </div>
                </div>
                <div className="mt-2 relative flex items-baseline gap-1.5">
                  <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{pendingOrdersCount}</span>
                  <span className="text-4xs font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded-full border border-amber-200">مراجعة</span>
                </div>
              </div>

              <div className="glass-card glass-card-hover rounded-xl p-3 sm:p-3.5 border border-purple-200/60 bg-gradient-to-br from-white via-purple-50/20 to-white relative overflow-hidden">
                <div className="flex items-center justify-between relative">
                  <span className="text-2xs font-bold text-slate-600">العملاء النشطون</span>
                  <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-purple-50 border border-purple-200/70 text-purple-600 shadow-2xs">
                    <Users className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 relative flex items-baseline gap-1.5">
                  <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{uniqueClients.length}</span>
                  <span className="text-4xs font-bold text-purple-800 bg-purple-50 px-1.5 py-0.2 rounded-full border border-purple-200">عميل</span>
                </div>
              </div>

              <div className="glass-card glass-card-hover rounded-xl p-3 sm:p-3.5 border border-sky-200/60 bg-gradient-to-br from-white via-sky-50/20 to-white relative overflow-hidden">
                <div className="flex items-center justify-between relative">
                  <span className="text-2xs font-bold text-slate-600">الأصناف بالكتالوج</span>
                  <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-sky-50 border border-sky-200/70 text-sky-600 shadow-2xs">
                    <Pill className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 relative flex items-baseline gap-1.5">
                  <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{products.length}</span>
                  <span className="text-4xs font-bold text-sky-800 bg-sky-50 px-1.5 py-0.2 rounded-full border border-sky-200">صنف</span>
                </div>
              </div>

              {/* Card 5: Low Stock Alert Card */}
              <div 
                onClick={() => {
                  const elem = document.getElementById("low-stock-report-section");
                  if (elem) elem.scrollIntoView({ behavior: "smooth" });
                }}
                className="glass-card glass-card-hover cursor-pointer rounded-xl border border-rose-200 bg-gradient-to-br from-rose-50/60 via-white to-rose-50/30 p-3 sm:p-3.5 shadow-xs relative overflow-hidden"
              >
                <div className="flex items-center justify-between relative">
                  <span className="text-2xs font-black text-rose-950">نقص المخزون 🚨</span>
                  <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-rose-100 border border-rose-200 text-rose-600 shadow-2xs">
                    <TrendingDown className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 relative flex items-baseline justify-between">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl sm:text-2xl font-black text-rose-700 tracking-tight">
                      {stockReports.filter(r => r.remainingQty < 5).length}
                    </span>
                    <span className="text-4xs font-bold text-rose-800 bg-rose-100/80 px-1.5 py-0.2 rounded-full border border-rose-200">عجز</span>
                  </div>
                  {stockReports.filter(r => r.remainingQty < 5).length > 0 && (
                    <span className="animate-pulse rounded-full bg-rose-500 px-1.5 py-0.2 text-4xs font-bold text-white shadow-xs">
                      متابعة
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Analytics & Cloud Metrics Banner */}
            <div className="rounded-xl border border-teal-200/80 bg-gradient-to-r from-slate-900 via-slate-850 to-teal-950 p-3 sm:p-3.5 text-white shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 relative overflow-hidden">
              <div className="flex items-center gap-3 relative z-10">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/20 border border-teal-400/40 text-teal-300">
                  <BarChart3 className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-white">لوحة التحليلات والمؤشرات السحابية (Firestore Analytics)</span>
                    <span className="text-3xs font-bold px-1.5 py-0.2 rounded bg-teal-500/30 text-teal-300 border border-teal-400/40">مباشر</span>
                  </div>
                  <p className="text-3xs text-slate-300">
                    مراقبة شاملة: {registeredUsers.length} مستخدم مسجل • {notifications.length} إشعار Cloud Functions • {visits.length} زيارة ميدانية موثقة
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRepTab("analytics")}
                className="shrink-0 rounded-lg bg-teal-600 hover:bg-teal-500 text-white px-3.5 py-1.5 text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                id="btn-quick-view-analytics"
              >
                <span>فتح لوحة التحليلات 📊</span>
                <ChevronRight className="h-3.5 w-3.5 rotate-180" />
              </button>
            </div>

            {/* Low Stock Report & Prioritization Dashboard Section */}
            <div id="low-stock-report-section" className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-xs space-y-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-rose-600 shrink-0" />
                    <span>لوحة مراقبة عجز المخزون وتحديد الأولويات 📉</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    مراقبة تلقائية للأصناف التي أوشكت على النفاد (أقل من 5 قطع) لتسهيل تخطيط وجدولة زيارات إعادة التعبئة.
                  </p>
                </div>
                
                {/* Reset or Sync Button */}
                <button
                  onClick={fetchUserSpecificData}
                  className="inline-flex items-center gap-1.5 self-start md:self-auto rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>تحديث البيانات الميدانية</span>
                </button>
              </div>



              {/* Search & Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <div className="relative flex-1 min-w-[200px] flex items-center">
                  <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="البحث باسم الصنف أو اسم المنشأة..."
                    value={lowStockSearch}
                    onChange={(e) => setLowStockSearch(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-9 text-xs text-right font-medium text-slate-800 transition-colors focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-3xs font-bold text-slate-400 uppercase tracking-wide">تصنيف العجز:</span>
                  <div className="flex rounded-lg bg-slate-200 p-0.5 text-2xs font-bold">
                    <button
                      onClick={() => setLowStockFilter("all")}
                      className={`rounded-md px-3 py-1 transition-all ${
                        lowStockFilter === "all" ? "bg-white text-teal-800 shadow-sm" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      الكل ({stockReports.filter(r => r.remainingQty < 5).length})
                    </button>
                    <button
                      onClick={() => setLowStockFilter("critical")}
                      className={`rounded-md px-3 py-1 transition-all ${
                        lowStockFilter === "critical" ? "bg-white text-rose-800 shadow-sm" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      نفاد تام (0) ({stockReports.filter(r => r.remainingQty === 0).length})
                    </button>
                    <button
                      onClick={() => setLowStockFilter("warning")}
                      className={`rounded-md px-3 py-1 transition-all ${
                        lowStockFilter === "warning" ? "bg-white text-amber-800 shadow-sm" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      شبه منتهٍ (1-4) ({stockReports.filter(r => r.remainingQty > 0 && r.remainingQty < 5).length})
                    </button>
                  </div>

                  <div className="flex items-center gap-1 border-r border-slate-200 pr-2 mr-1">
                    <span className="text-3xs font-bold text-slate-400">ترتيب:</span>
                    <select
                      value={lowStockSort}
                      onChange={(e) => setLowStockSort(e.target.value as any)}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-2xs font-bold text-slate-700 focus:outline-none"
                    >
                      <option value="severity">الأكثر حرجاً أولاً</option>
                      <option value="recent">الأحدث إبلاغاً</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Low Stock Items Grid */}
              {(() => {
                const baseReports = stockReports.filter(r => r.remainingQty < 5);
                
                const filtered = baseReports.filter(r => {
                  const matchesSearch = 
                    r.productName.toLowerCase().includes(lowStockSearch.toLowerCase()) ||
                    r.entityName.toLowerCase().includes(lowStockSearch.toLowerCase()) ||
                    r.clientName.toLowerCase().includes(lowStockSearch.toLowerCase());
                    
                  const matchesFilter = 
                    lowStockFilter === "all" ||
                    (lowStockFilter === "critical" && r.remainingQty === 0) ||
                    (lowStockFilter === "warning" && r.remainingQty > 0 && r.remainingQty < 5);
                    
                  return matchesSearch && matchesFilter;
                });

                const sorted = [...filtered].sort((a, b) => {
                  if (lowStockSort === "severity") {
                    return a.remainingQty - b.remainingQty; // 0 first
                  } else {
                    return new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime();
                  }
                });

                if (sorted.length === 0) {
                  return (
                    <div className="py-12 text-center text-slate-400 border border-dashed border-slate-150 rounded-2xl bg-slate-25/30">
                      <TrendingDown className="mx-auto h-10 w-10 text-slate-300 mb-2.5" />
                      <p className="text-xs font-bold">لا توجد سجلات عجز مخزون مطابقة للفلاتر النشطة حالياً.</p>
                      <p className="text-3xs text-slate-400 mt-1">تأكد من قيام الصيدليات برفع كشوفات الجرد الميدانية بانتظام.</p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {sorted.map((report, idx) => (
                      <motion.div
                        key={`adm-srep-${report.id || 'sr'}-${idx}`}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`rounded-xl border p-4 space-y-3 transition-shadow hover:shadow-md text-right ${
                          report.remainingQty === 0 
                            ? "border-rose-200 bg-gradient-to-br from-rose-50/20 to-white" 
                            : "border-amber-200 bg-gradient-to-br from-amber-50/20 to-white"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="block text-2xs font-bold text-slate-400 mb-0.5 font-mono">
                              {report.entityName}
                            </span>
                            <h4 className="text-sm font-bold text-slate-900 leading-snug">
                              {report.productName}
                            </h4>
                          </div>
                          
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-2xs font-bold ${
                            report.remainingQty === 0 
                              ? "bg-rose-100 text-rose-800" 
                              : "bg-amber-100 text-amber-800"
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${report.remainingQty === 0 ? "bg-rose-600 animate-ping" : "bg-amber-500"}`} />
                            <span>{report.remainingQty === 0 ? "نفاد تام" : `${report.remainingQty} علبة`}</span>
                          </span>
                        </div>

                        <div className="space-y-1 bg-white/60 p-2.5 rounded-lg border border-slate-100 text-2xs text-slate-600">
                          <div className="flex justify-between">
                            <span className="text-slate-400 font-medium">المسؤول الطبي:</span>
                            <span className="font-bold text-slate-800">{report.clientName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400 font-medium">تاريخ الجرد:</span>
                            <span className="font-mono text-slate-500">
                              {new Date(report.reportedAt).toLocaleDateString("ar-YE")} {new Date(report.reportedAt).toLocaleTimeString("ar-YE", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </div>

                        {quickRestockItem?.id === report.id ? (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg space-y-2 text-right"
                          >
                            <label className="block text-3xs font-bold text-slate-500">كمية طلب التوريد الفورية:</label>
                            <div className="flex items-center gap-1.5">
                              <div className="relative flex-1">
                                <input 
                                  type="number"
                                  min="1"
                                  placeholder="الكمية"
                                  value={quickRestockQty}
                                  onChange={(e) => setQuickRestockQty(e.target.value)}
                                  className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-right font-bold text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500/20"
                                  required
                                  autoFocus
                                />
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-3xs text-slate-400 font-bold">علبة</span>
                              </div>
                              <button
                                onClick={() => handleConfirmQuickRestock(report)}
                                disabled={loading || !quickRestockQty}
                                className="rounded-md bg-teal-600 px-3 py-1.5 text-2xs font-bold text-white hover:bg-teal-700 transition-colors shrink-0 disabled:bg-slate-300"
                              >
                                تأكيد
                              </button>
                              <button
                                onClick={() => {
                                  setQuickRestockItem(null);
                                  setQuickRestockQty("");
                                }}
                                className="rounded-md bg-slate-200 px-2.5 py-1.5 text-2xs font-bold text-slate-600 hover:bg-slate-300 transition-colors shrink-0"
                              >
                                إلغاء
                              </button>
                            </div>
                          </motion.div>
                        ) : (
                          <div className="flex gap-2 pt-2 border-t border-slate-100">
                            <button
                              onClick={() => handleScheduleRestockVisit(report)}
                              className="flex-1 rounded-lg bg-teal-50 hover:bg-teal-100 px-2 py-1.5 text-2xs font-bold text-teal-800 transition-colors flex items-center justify-center gap-1"
                              title="جدولة زيارة وتعبئة البيانات تلقائياً"
                            >
                              <Calendar className="h-3.5 w-3.5 text-teal-600" />
                              <span>تخطيط زيارة توريد</span>
                            </button>
                            <button
                              onClick={() => {
                                setQuickRestockItem(report);
                                setQuickRestockQty("20");
                              }}
                              className="flex-1 rounded-lg bg-slate-900 hover:bg-slate-800 px-2 py-1.5 text-2xs font-bold text-white transition-colors flex items-center justify-center gap-1"
                              title="إرسال طلبية توريد فورية باسم الصيدلية"
                            >
                              <ShoppingCart className="h-3.5 w-3.5 text-teal-400" />
                              <span>طلب توريد فوري</span>
                            </button>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* TAB CONTENTS */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              
              {/* TAB 0: ADVANCED FIRESTORE ANALYTICS & METRICS DASHBOARD */}
              {repTab === "analytics" && (
                <div className="p-4 sm:p-5">
                  <AdminAnalyticsDashboard
                    initialUsers={registeredUsers}
                    initialNotifications={notifications}
                    initialVisits={visits}
                    initialOrders={orders}
                    initialStockReports={stockReports}
                    appSettings={appSettings}
                    onUpdateSettings={handleUpdateAppSetting}
                    onNavigateTab={(tab) => setRepTab(tab as any)}
                  />
                </div>
              )}

              {/* TAB 1: CUSTOMER ORDERS LIST */}
              {repTab === "orders" && (
                <div className="divide-y divide-slate-100">
                  <div className="bg-slate-50 p-4 flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="font-bold text-slate-800 text-sm block">
                        طلبيات المستلزمات والأدوية الواردة من الصيدليات والعيادات
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        إدارة واعتماد الطلبيات وتحديد الحالات (معلق، مقبول، تم التسليم، ملغي)
                      </span>
                    </div>
                    {orders.length > 0 && (
                      <button
                        onClick={handleExportOrdersCSV}
                        className="inline-flex items-center gap-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 px-3.5 py-1.5 text-xs font-bold transition-all shadow-2xs"
                      >
                        <Download className="h-4 w-4" />
                        <span>تصدير CSV / Excel</span>
                      </button>
                    )}
                  </div>

                  {/* Order Status Filters Bar */}
                  {orders.length > 0 && (
                    <div className="flex items-center gap-1.5 p-3 bg-slate-100/70 border-b border-slate-200 overflow-x-auto text-xs font-bold scrollbar-none">
                      <button
                        onClick={() => setOrderStatusFilter("all")}
                        className={`px-3 py-1.5 rounded-xl transition-all ${
                          orderStatusFilter === "all"
                            ? "bg-slate-900 text-white shadow-xs"
                            : "bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200"
                        }`}
                      >
                        الكل ({orders.length})
                      </button>
                      <button
                        onClick={() => setOrderStatusFilter("pending")}
                        className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                          orderStatusFilter === "pending"
                            ? "bg-amber-600 text-white shadow-xs"
                            : "bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-300"
                        }`}
                      >
                        <Hourglass className="h-3.5 w-3.5 text-amber-600 animate-pulse" />
                        <span>معلق ({orders.filter(o => o.status === "pending").length})</span>
                      </button>
                      <button
                        onClick={() => setOrderStatusFilter("approved")}
                        className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                          orderStatusFilter === "approved"
                            ? "bg-cyan-600 text-white shadow-xs"
                            : "bg-cyan-50 text-cyan-900 hover:bg-cyan-100 border border-cyan-300"
                        }`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-cyan-600" />
                        <span>مقبول ومؤكد ({orders.filter(o => o.status === "approved").length})</span>
                      </button>
                      <button
                        onClick={() => setOrderStatusFilter("completed")}
                        className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                          orderStatusFilter === "completed"
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-300"
                        }`}
                      >
                        <CheckCheck className="h-3.5 w-3.5 text-emerald-600" />
                        <span>تم التسليم ({orders.filter(o => o.status === "completed").length})</span>
                      </button>
                      <button
                        onClick={() => setOrderStatusFilter("cancelled")}
                        className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                          orderStatusFilter === "cancelled"
                            ? "bg-rose-600 text-white shadow-xs"
                            : "bg-rose-50 text-rose-900 hover:bg-rose-100 border border-rose-300"
                        }`}
                      >
                        <XCircle className="h-3.5 w-3.5 text-rose-600" />
                        <span>ملغي ({orders.filter(o => o.status === "cancelled").length})</span>
                      </button>
                    </div>
                  )}

                  {orders.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                      <ShoppingCart className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                      لا توجد أي طلبيات مسجلة حالياً بالتطبيق.
                    </div>
                  ) : (
                    <>
                      {orders
                        .filter(o => orderStatusFilter === "all" || o.status === orderStatusFilter)
                        .map((order, orderIdx) => (
                        <div key={`adm-ord-${order.id || 'o'}-${orderIdx}`} className="p-3.5 sm:p-5 flex flex-col md:flex-row md:items-start justify-between gap-4 w-full">
                          <div className="space-y-2 w-full">
                            <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-start">
                              <span className="font-black text-slate-950 text-base">{order.entityName}</span>
                              <span className="text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200/60 px-2.5 py-0.5 rounded-full">
                                {order.clientName}
                              </span>
                              <span className="text-3xs text-slate-400 font-mono">ID: {order.id}</span>
                            </div>
                            
                            {/* Order Products List - Full Width */}
                            <div className="border border-slate-200/80 rounded-xl bg-slate-50/70 p-2.5 sm:p-3.5 mt-2.5 w-full overflow-x-auto">
                              <table className="w-full text-right text-xs">
                                <thead>
                                  <tr className="text-slate-400 font-bold border-b border-slate-200/80 pb-2">
                                    <th className="pb-1.5 pl-3">الصنف الدوائي</th>
                                    <th className="pb-1.5 px-2 text-center">الكمية</th>
                                    <th className="pb-1.5 pr-2 text-left">السعر</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {order.items.map((item, itemIdx) => (
                                    <tr key={`aoi-${order.id || 'o'}-${orderIdx}-${item.productId || 'p'}-${itemIdx}`} className="text-slate-800 font-medium">
                                      <td className="py-2 pl-3 font-bold text-slate-900 text-xs">{item.productName}</td>
                                      <td className="py-2 px-2 text-center font-mono font-black text-teal-700 bg-teal-50/80 rounded">{item.quantity}</td>
                                      <td className="py-2 pr-2 text-left font-mono text-slate-600 font-semibold">{item.price}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <div className="text-2xs text-slate-400 flex items-center gap-1.5 pt-1">
                              <Clock className="h-3.5 w-3.5" />
                              <span>تاريخ الإرسال: {new Date(order.createdAt).toLocaleString("ar-YE")}</span>
                            </div>
                          </div>

                          {/* Order Management Actions */}
                          <div className="flex flex-col md:items-end gap-2.5 shrink-0 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                            <span className={`inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border shadow-2xs w-full sm:w-auto text-center ${
                              order.status === "pending" ? "bg-amber-100 text-amber-900 border-amber-300 ring-1 ring-amber-400/40" :
                              order.status === "approved" ? "bg-cyan-100 text-cyan-800 border-cyan-200/70" :
                              order.status === "completed" ? "bg-emerald-100 text-emerald-800 border-emerald-200/70" :
                              "bg-rose-100 text-rose-800 border-rose-200/70"
                            }`}>
                              {order.status === "pending" && <Hourglass className="h-3.5 w-3.5 text-amber-600 animate-pulse shrink-0" />}
                              {order.status === "approved" && <CheckCircle2 className="h-3.5 w-3.5 text-cyan-600 shrink-0" />}
                              {order.status === "completed" && <CheckCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                              {order.status === "cancelled" && <XCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />}
                              <span>
                                {order.status === "pending" ? "معلق (قيد الانتظار)" :
                                 order.status === "approved" ? "مقبول ومؤكد" :
                                 order.status === "completed" ? "تم التوصيل والتسليم" : "ملغي"}
                              </span>
                            </span>

                            <div className="grid grid-cols-2 gap-1.5 w-full sm:flex sm:flex-wrap sm:w-auto sm:justify-end">
                              <button
                                onClick={() => handleOpenPrintInvoice(order)}
                                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white transition-all hover:bg-slate-800 active:scale-95 shadow-2xs cursor-pointer"
                                title="معاينة وطباعة فاتورة رسمية لهذه الطلبية"
                                id={`btn-rep-print-order-${order.id}`}
                              >
                                <Printer className="h-3.5 w-3.5 text-teal-400" />
                                <span>طباعة الفاتورة 🖨️</span>
                              </button>
                              {order.status !== "approved" && (
                                <button
                                  onClick={() => handleUpdateOrderStatus(order.id, "approved")}
                                  className="inline-flex items-center justify-center gap-1 rounded-xl bg-cyan-600 px-3 py-2 text-xs font-bold text-white transition-all hover:bg-cyan-700 active:scale-95 shadow-2xs"
                                  title="قبول وتأكيد هذا الطلب"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  <span>قبول وتأكيد</span>
                                </button>
                              )}
                              {order.status === "approved" && (
                                <button
                                  onClick={() => handleUpdateOrderStatus(order.id, "completed")}
                                  className="inline-flex items-center justify-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition-all hover:bg-emerald-700 active:scale-95 shadow-2xs"
                                  title="تحديد الطلب كمسلم ومكتمل"
                                >
                                  <CheckCheck className="h-3.5 w-3.5" />
                                  <span>تسليم ومكتمل</span>
                                </button>
                              )}
                              {order.status !== "pending" && (
                                <button
                                  onClick={() => handleUpdateOrderStatus(order.id, "pending")}
                                  className="inline-flex items-center justify-center gap-1 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 border border-amber-300 transition-all hover:bg-amber-100 active:scale-95 shadow-2xs"
                                  title="وضع الطلب في حالة انتظار مؤقتة (معلق)"
                                >
                                  <Hourglass className="h-3.5 w-3.5 text-amber-600" />
                                  <span>تعليق الطلب</span>
                                </button>
                              )}
                              {order.status !== "cancelled" && (
                                <button
                                  onClick={() => handleUpdateOrderStatus(order.id, "cancelled")}
                                  className="inline-flex items-center justify-center gap-1 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition-all hover:bg-rose-100 active:scale-95 border border-rose-200"
                                  title="إلغاء هذا الطلب"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  <span>إلغاء الطلبية</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Export CSV Button at Bottom */}
                      <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                        <button
                          onClick={handleExportOrdersCSV}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 px-4 py-2.5 text-xs font-bold transition-all shadow-sm active:scale-[0.98]"
                        >
                          <Download className="h-4 w-4" />
                          <span>تصدير جميع الطلبيات إلى ملف CSV (Excel) 📥</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* TAB 2: EXCEL STOCK REPORT MASTER */}
              {repTab === "inventory" && (
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">كشف جرد الصيدليات المجمع</h3>
                      <p className="text-xs text-slate-500">يعرض هذا الجدول الكميات المتبقية التي أبلغت عنها كل صيدلية لتسهيل معرفة العجز</p>
                    </div>
                    {stockReports.length > 0 && (
                      <button
                        onClick={handleExportStockReportsCSV}
                        className="inline-flex items-center gap-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 px-3.5 py-1.5 text-xs font-bold transition-all shadow-2xs"
                      >
                        <Download className="h-4 w-4" />
                        <span>تصدير CSV / Excel</span>
                      </button>
                    )}
                  </div>

                  {stockReports.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 border border-dashed border-slate-200 rounded-2xl">
                      <FileSpreadsheet className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                      لم يرسل أي عميل جرد مخزونه بعد. يرجى الطلب من العملاء إرسال جرد منشآتهم.
                    </div>
                  ) : (
                    <div className="space-y-4 w-full">
                      {/* Mobile View: Full Width Stock Report Cards */}
                      <div className="grid grid-cols-1 gap-3 md:hidden w-full">
                        {stockReports.map((report, idx) => (
                          <div
                            key={`adm-mob-stk-${report.id || 's'}-${idx}`}
                            className="p-3.5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-2 w-full"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="font-black text-slate-950 text-sm">{report.entityName}</div>
                                <div className="text-3xs text-slate-500 font-semibold">{report.clientName}</div>
                              </div>
                              <span className={`inline-block font-mono font-black text-xs px-2.5 py-1 rounded-xl border ${
                                report.remainingQty <= 5 ? "bg-rose-50 text-rose-700 border-rose-200" :
                                report.remainingQty <= 15 ? "bg-amber-50 text-amber-800 border-amber-200" :
                                "bg-emerald-50 text-emerald-800 border-emerald-200"
                              }`}>
                                متبقي: {report.remainingQty}
                              </span>
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                              <span className="font-bold text-teal-900">{report.productName}</span>
                              <span className="text-3xs text-slate-400 font-mono">
                                {new Date(report.reportedAt).toLocaleDateString("ar-YE")}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Desktop View: Full Responsive Table */}
                      <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 w-full bg-white shadow-2xs">
                        <table className="w-full text-right border-collapse text-xs md:text-sm">
                          <thead>
                            <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                              <th className="p-3 border-l border-slate-200">المنشأة (الصيدلية/العيادة)</th>
                              <th className="p-3 border-l border-slate-200">المسؤول</th>
                              <th className="p-3 border-l border-slate-200">الصنف الدوائي</th>
                              <th className="p-3 border-l border-slate-200 text-center">الكمية المتبقية</th>
                              <th className="p-3 text-left">تاريخ التقرير</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {stockReports.map((report, idx) => (
                              <tr key={`adm-stk-${report.id || 's'}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                                <td className="p-3 font-bold text-slate-950 border-l border-slate-100">{report.entityName}</td>
                                <td className="p-3 text-slate-600 border-l border-slate-100">{report.clientName}</td>
                                <td className="p-3 font-semibold text-teal-900 border-l border-slate-100">{report.productName}</td>
                                <td className="p-3 border-l border-slate-100 text-center">
                                  <span className={`inline-block font-mono font-bold px-2.5 py-0.5 rounded ${
                                    report.remainingQty <= 5 ? "bg-rose-100 text-rose-800" :
                                    report.remainingQty <= 15 ? "bg-amber-100 text-amber-800" :
                                    "bg-slate-100 text-slate-800"
                                  }`}>
                                    {report.remainingQty}
                                  </span>
                                </td>
                                <td className="p-3 text-left text-xs font-mono text-slate-400">
                                  {new Date(report.reportedAt).toLocaleDateString("ar-YE")} {new Date(report.reportedAt).toLocaleTimeString("ar-YE", { hour: "2-digit", minute: "2-digit" })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Export CSV Button at Bottom */}
                      <div className="pt-2 flex justify-end">
                        <button
                          onClick={handleExportStockReportsCSV}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 px-4 py-2.5 text-xs font-bold transition-all shadow-sm active:scale-[0.98]"
                        >
                          <Download className="h-4 w-4" />
                          <span>تصدير كشف الجرد المجمع إلى ملف CSV (Excel) 📥</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: MANAGE PRODUCTS CATALOG (Representative adds items!) */}
              {repTab === "catalog" && (
                <div className="p-3.5 sm:p-5 space-y-4 sm:space-y-6 w-full">
                  {/* Add Product Form */}
                  <form onSubmit={handleAddProduct} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 sm:p-5 space-y-4 w-full">
                    <h4 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                      <PlusCircle className="h-5 w-5 text-teal-600" />
                      إضافة صنف دواء جديد إلى التطبيق
                    </h4>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">اسم الصنف الدوائي بالكامل *</label>
                        <input
                          type="text"
                          placeholder="مثال: ريفانين 500 ملغ (Revanin)"
                          value={newProductForm.name}
                          onChange={(e) => setNewProductForm({ ...newProductForm, name: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-right text-xs font-medium focus:border-teal-500 focus:outline-none"
                          required
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-semibold text-slate-600">الفئة أو تصنيف الصنف *</label>
                          <button
                            type="button"
                            onClick={() => setIsCategoryManagerOpen(true)}
                            className="inline-flex items-center gap-1 text-3xs font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg px-2 py-0.5 transition-colors cursor-pointer"
                            title="إدارة وإضافة تصنيفات جديدة وتخصيص الألوان"
                          >
                            <Palette className="h-3 w-3 text-teal-600" />
                            <span>إدارة التصنيفات والألوان</span>
                          </button>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            {/* Color Selector / Preview for currently selected category */}
                            <div
                              className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1.5 shrink-0 shadow-3xs"
                              title="اختر لوناً مخصصاً لهذه الفئة"
                            >
                              <label
                                className="w-5 h-5 rounded-md cursor-pointer border border-slate-300 shadow-2xs flex items-center justify-center transition-transform hover:scale-110"
                                style={{ backgroundColor: getCategoryColor(newProductForm.category, categoryColors) }}
                                title="انقر لتخصيص لون هذه الفئة"
                              >
                                <input
                                  type="color"
                                  id="product-category-color-picker"
                                  value={getCategoryColor(newProductForm.category, categoryColors)}
                                  onChange={(e) => handleUpdateCategoryColor(newProductForm.category, e.target.value)}
                                  className="sr-only"
                                />
                              </label>
                              <span
                                className="text-4xs font-mono font-bold hidden xs:inline"
                                style={{ color: getCategoryColor(newProductForm.category, categoryColors) }}
                              >
                                {getCategoryColor(newProductForm.category, categoryColors)}
                              </span>
                            </div>

                            {/* Dropdown with color indicators next to each category name */}
                            <div className="relative flex-1">
                              <select
                                id="product-category-select"
                                value={newProductForm.category}
                                onChange={(e) => setNewProductForm({ ...newProductForm, category: e.target.value })}
                                style={{
                                  borderRightColor: getCategoryColor(newProductForm.category, categoryColors),
                                  borderRightWidth: "4px",
                                }}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-right text-xs font-bold text-slate-800 focus:border-teal-500 focus:outline-none cursor-pointer"
                              >
                                {availableCategories.map((cat) => {
                                  const count = products.filter((p) => (p.category || "عام") === cat).length;
                                  const catColor = getCategoryColor(cat, categoryColors);
                                  return (
                                    <option
                                      key={cat}
                                      value={cat}
                                      style={{ color: catColor, fontWeight: "bold" }}
                                    >
                                      ● {cat} {count > 0 ? `(${count} أصناف)` : "(0 صنف)"}
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                          </div>

                          {/* Quick Swatches for active category color */}
                          <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                            <span className="text-4xs text-slate-400 font-semibold shrink-0">ألوان سريعة للفئة:</span>
                            {CATEGORY_PALETTE.slice(0, 10).map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => handleUpdateCategoryColor(newProductForm.category, c)}
                                className={`w-3.5 h-3.5 rounded-full shrink-0 transition-transform cursor-pointer border ${
                                  getCategoryColor(newProductForm.category, categoryColors) === c
                                    ? "scale-125 border-slate-900 ring-2 ring-teal-400"
                                    : "border-white hover:scale-110"
                                }`}
                                style={{ backgroundColor: c }}
                                title={`تعيين لون ${c} لفئة ${newProductForm.category}`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">السعر للوحدة (التجاري) *</label>
                        <input
                          type="text"
                          placeholder="مثال: 15.00 SAR"
                          value={newProductForm.price}
                          onChange={(e) => setNewProductForm({ ...newProductForm, price: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-right text-xs font-medium focus:border-teal-500 focus:outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">الوحدة المخصصة للبيع</label>
                        <input
                          type="text"
                          placeholder="مثال: علبة، شريط، بخاخ"
                          value={newProductForm.unit}
                          onChange={(e) => setNewProductForm({ ...newProductForm, unit: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-right text-xs font-medium focus:border-teal-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">نسبة البونص المجاني 🎁</label>
                        <input
                          type="text"
                          placeholder="مثال: 10% أو 40% أو 100%"
                          value={newProductForm.bonus}
                          onChange={(e) => setNewProductForm({ ...newProductForm, bonus: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-right text-xs font-medium focus:border-teal-500 focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">وصف مختصر للصنف ومؤشر الاستخدام</label>
                        <input
                          type="text"
                          placeholder="مثال: خافض حرارة ومسكن فعال يحتوي على باراسيتامول..."
                          value={newProductForm.description}
                          onChange={(e) => setNewProductForm({ ...newProductForm, description: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-right text-xs font-medium focus:border-teal-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-bold text-white transition-all hover:bg-teal-700 active:scale-95 shadow-sm"
                    >
                      إضافة وتعميم الصنف بالكتالوج
                    </button>
                  </form>

                  {/* List of current products with option to delete */}
                  <div className="space-y-3 w-full">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-black text-slate-900">أصناف الكتالوج الحالية في التطبيق ({products.length})</h4>
                    </div>

                    {/* Mobile View: Full Width Product Cards */}
                    <div className="grid grid-cols-1 gap-3 md:hidden w-full">
                      {products.map((prod, idx) => (
                        <div
                          key={`adm-mob-prod-${prod.id || 'p'}-${idx}`}
                          className="p-3.5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-2.5 w-full"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-black text-slate-950 text-sm">{prod.name}</div>
                              <span
                                className="inline-flex items-center gap-1 mt-0.5 text-3xs font-bold px-2 py-0.5 rounded-full border shadow-3xs"
                                style={{
                                  backgroundColor: `${getCategoryColor(prod.category, categoryColors)}15`,
                                  borderColor: `${getCategoryColor(prod.category, categoryColors)}40`,
                                  color: getCategoryColor(prod.category, categoryColors),
                                }}
                              >
                                <span
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{ backgroundColor: getCategoryColor(prod.category, categoryColors) }}
                                />
                                {prod.category}
                              </span>
                            </div>
                            <div className="text-left shrink-0">
                              <div className="font-mono font-black text-teal-700 text-sm">{prod.price}</div>
                              <div className="text-3xs text-slate-400">للـ {prod.unit}</div>
                            </div>
                          </div>

                          {prod.description && (
                            <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100 leading-relaxed">
                              {prod.description}
                            </p>
                          )}

                          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                            {prod.bonus ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-2xs font-black text-amber-900">
                                🎁 البونص {formatBonusDisplay(prod.bonus)}
                              </span>
                            ) : (
                              <span className="text-3xs text-slate-400">بدون بونص</span>
                            )}

                            <button
                              onClick={() => handleDeleteProduct(prod.id, prod.name)}
                              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 active:scale-95 transition-all"
                              title="حذف الصنف"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>حذف الصنف</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop View: Full Responsive Table */}
                    <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 w-full bg-white shadow-2xs">
                      <table className="w-full text-right text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                            <th className="p-3">اسم الصنف</th>
                            <th className="p-3">الفئة</th>
                            <th className="p-3 text-center">السعر والوحدة</th>
                            <th className="p-3 text-center">البونص 🎁</th>
                            <th className="p-3">الوصف</th>
                            <th className="p-3 text-center">إجراءات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {products.map((prod, idx) => (
                            <tr key={`adm-prod-${prod.id || 'p'}-${idx}`} className="hover:bg-slate-50 transition-colors">
                              <td className="p-3">
                                <div className="font-bold text-slate-900">{prod.name}</div>
                                <div className="text-xs text-teal-700 font-medium mt-0.5">{prod.description}</div>
                              </td>
                              <td className="p-3 text-slate-600">
                                <span
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-3xs font-bold border shadow-3xs"
                                  style={{
                                    backgroundColor: `${getCategoryColor(prod.category, categoryColors)}15`,
                                    borderColor: `${getCategoryColor(prod.category, categoryColors)}40`,
                                    color: getCategoryColor(prod.category, categoryColors),
                                  }}
                                >
                                  <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: getCategoryColor(prod.category, categoryColors) }}
                                  />
                                  {prod.category}
                                </span>
                              </td>
                              <td className="p-3 text-center font-mono text-teal-700 font-bold">{prod.price} / {prod.unit}</td>
                              <td className="p-3 text-center">
                                {prod.bonus ? (
                                  <span className="inline-block rounded-md bg-amber-100 border border-amber-300 px-2 py-0.5 text-2xs font-black text-amber-900">
                                    🎁 البونص {formatBonusDisplay(prod.bonus)}
                                  </span>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                              <td className="p-3 text-slate-500 max-w-xs truncate">{prod.description}</td>
                              <td className="p-3 text-center">
                                <button
                                  onClick={() => handleDeleteProduct(prod.id, prod.name)}
                                  className="rounded-lg p-2 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                                  title="حذف الصنف"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: CLIENTS REGISTERED & IMPORT PORTAL */}
              {repTab === "clients" && (() => {
                const pendingCount = uniqueClients.filter(c => c.isApproved === false || c.status === "pending_approval").length;
                const approvedCount = uniqueClients.filter(c => c.isApproved !== false && c.status !== "pending_approval" && c.status !== "suspended").length;
                const suspendedCount = uniqueClients.filter(c => c.status === "suspended").length;

                const filteredClients = uniqueClients.filter((client) => {
                  const matchesSearch = 
                    client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
                    client.entityName.toLowerCase().includes(clientSearch.toLowerCase()) ||
                    (client.location || "").toLowerCase().includes(clientSearch.toLowerCase()) ||
                    (client.phone || "").toLowerCase().includes(clientSearch.toLowerCase());
                  
                  let matchesRole = true;
                  if (clientRoleFilter === "pharmacy") matchesRole = client.role === "pharmacy";
                  else if (clientRoleFilter === "doctor") matchesRole = client.role === "doctor";
                  else if (clientRoleFilter === "pending") matchesRole = client.isApproved === false || client.status === "pending_approval";
                  else if (clientRoleFilter === "approved") matchesRole = client.isApproved !== false && client.status !== "pending_approval" && client.status !== "suspended";
                  else if (clientRoleFilter === "suspended") matchesRole = client.status === "suspended";

                  return matchesSearch && matchesRole;
                });

                return (
                  <div className="p-5 space-y-6">
                    {/* Security & Confirmation Settings Banner */}
                    <div className="rounded-2xl border border-teal-200 bg-gradient-to-l from-teal-50/80 via-white to-teal-50/40 p-4.5 shadow-2xs space-y-3.5">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-teal-100/70 pb-3">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="h-5 w-5 text-teal-700 shrink-0" />
                          <div>
                            <h4 className="text-sm font-bold text-teal-950">إعدادات أمان الدخول وتأكيد الحسابات 🛡️</h4>
                            <p className="text-2xs text-teal-800">تحكم في شروط انضمام الصيدليات والعملاء لضمان سرية الأسعار</p>
                          </div>
                        </div>
                        {pendingCount > 0 && (
                          <button
                            onClick={() => setClientRoleFilter("pending")}
                            className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 text-white px-3 py-1 text-2xs font-bold shadow-xs hover:bg-amber-600 transition-colors animate-bounce cursor-pointer self-start sm:self-auto"
                          >
                            <Clock className="h-3.5 w-3.5" />
                            <span>يوجد {pendingCount} حساب بانتظار التأكيد والاعتماد!</span>
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {/* Toggle 1: Require Approval */}
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-teal-150 bg-white p-3 shadow-3xs">
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-slate-900 block">اشتراط تأكيد واعتماد الحسابات الجديدة 🔐</span>
                            <span className="text-3xs text-slate-500 leading-tight block">
                              {appSettings.requireApprovalForNewClients 
                                ? "مفعّل: لا يمكن للعميل الدخول حتى يعتمده المندوب" 
                                : "معطّل: دخول فوري ومباشر لجميع الأرقام"}
                            </span>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input
                              type="checkbox"
                              checked={appSettings.requireApprovalForNewClients}
                              onChange={(e) => handleUpdateAppSetting("requireApprovalForNewClients", e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                          </label>
                        </div>

                        {/* Toggle 2: Single Phone per Device */}
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-teal-150 bg-white p-3 shadow-3xs">
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-slate-900 block">قصر الدخول على جهاز ورقم واحد موثق 📱</span>
                            <span className="text-3xs text-slate-500 leading-tight block">
                              {appSettings.singlePhonePerDevice 
                                ? "مفعّل: ربط الجهاز برقم هاتف واحد مؤكد" 
                                : "معطّل: السماح بتبديل الحسابات على نفس الجهاز"}
                            </span>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input
                              type="checkbox"
                              checked={appSettings.singlePhonePerDevice}
                              onChange={(e) => handleUpdateAppSetting("singlePhonePerDevice", e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Header Controls */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">بوابة إدارة قاعدة بيانات العملاء 👥</h3>
                        <p className="text-xs text-slate-500 mt-1">إجمالي العملاء المسجلين: {uniqueClients.length} عميل ({approvedCount} معتمد ، {pendingCount} بانتظار التأكيد)</p>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => {
                            setShowAddClientForm(!showAddClientForm);
                            setShowImportForm(false);
                          }}
                          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                            showAddClientForm 
                              ? "bg-rose-50 text-rose-700 border border-rose-200" 
                              : "bg-teal-600 text-white hover:bg-teal-700 shadow-sm shadow-teal-600/10"
                          }`}
                        >
                          {showAddClientForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                          {showAddClientForm ? "إغلاق النموذج" : "إضافة عميل يدوياً"}
                        </button>

                        <button
                          onClick={() => {
                            setIsDeviceContactsModalOpen(true);
                            setShowAddClientForm(false);
                            setShowImportForm(false);
                          }}
                          className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold bg-linear-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
                          title="قراءة واستيراد أرقام وأسماء الأطباء والصيدليات من هاتفك مباشرة"
                        >
                          <Smartphone className="h-4 w-4" />
                          <span>استيراد من جهات اتصال الهاتف 📱</span>
                        </button>

                        <button
                          onClick={() => {
                            setShowImportForm(!showImportForm);
                            setShowAddClientForm(false);
                          }}
                          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                            showImportForm 
                              ? "bg-rose-50 text-rose-700 border border-rose-200" 
                              : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-600/10"
                          }`}
                        >
                          {showImportForm ? <X className="h-4 w-4" /> : <FileSpreadsheet className="h-4 w-4" />}
                          {showImportForm ? "إغلاق الاستيراد" : "استيراد من إكسل (Excel)"}
                        </button>

                        {uniqueClients.length > 0 && (
                          <button
                            onClick={handleDeleteAllClients}
                            className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 hover:text-rose-800 transition-all shadow-xs cursor-pointer"
                            title="حذف جميع العملاء المسجلين"
                          >
                            <Trash2 className="h-4 w-4 text-rose-600" />
                            <span>حذف جميع العملاء</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Form 1: Add Client Manually */}
                    <AnimatePresence>
                      {showAddClientForm && (
                        <motion.form
                          key="add-client-form-motion"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          onSubmit={handleCreateClient}
                          id="form-add-client-manual"
                          className="rounded-2xl border border-teal-100 bg-teal-50/20 p-5 space-y-4"
                        >
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-teal-100/50 pb-2 mb-3">
                            <div className="flex items-center gap-2">
                              <PlusCircle className="h-5 w-5 text-teal-600" />
                              <h4 className="text-xs font-bold text-teal-950 uppercase tracking-wider">نموذج تسجيل عميل معتمد جديد</h4>
                            </div>
                            <button
                              type="button"
                              onClick={() => setIsDeviceContactsModalOpen(true)}
                              className="flex items-center gap-1.5 text-2xs font-bold text-teal-800 bg-white hover:bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-xl shadow-2xs transition-colors cursor-pointer"
                            >
                              <Smartphone className="h-3.5 w-3.5 text-teal-600" />
                              <span>اختيار وتعبئة من جهات اتصال هاتفك 📱</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                            <div>
                              <label className="block text-2xs font-bold text-slate-600 mb-1.5">اسم المنشأة الطبية (الصيدلية أو العيادة) *</label>
                              <input
                                type="text"
                                placeholder="مثال: صيدلية النور الحديثة"
                                value={clientForm.entityName}
                                onChange={(e) => setClientForm({ ...clientForm, entityName: e.target.value })}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-right focus:border-teal-500 focus:outline-none"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-2xs font-bold text-slate-600 mb-1.5">اسم المسؤول / الدكتور المسؤول *</label>
                              <input
                                type="text"
                                placeholder="مثال: د. أحمد محمد صالح"
                                value={clientForm.name}
                                onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-right focus:border-teal-500 focus:outline-none"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-2xs font-bold text-slate-600 mb-1.5">رقم الهاتف المسجل للعميل *</label>
                              <input
                                type="text"
                                placeholder="مثال: 771234567"
                                value={clientForm.phone}
                                onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-left font-mono focus:border-teal-500 focus:outline-none"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-2xs font-bold text-slate-600 mb-1.5">الموقع الجغرافي / المحافظة والعنوان</label>
                              <input
                                type="text"
                                placeholder="مثال: صنعاء - شارع الخمسين بجانب المستشفى"
                                value={clientForm.location}
                                onChange={(e) => setClientForm({ ...clientForm, location: e.target.value })}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-right focus:border-teal-500 focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-2xs font-bold text-slate-600 mb-1.5">تصنيف المنشأة الطبية *</label>
                              <select
                                value={clientForm.role}
                                onChange={(e) => setClientForm({ ...clientForm, role: e.target.value as any })}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-right focus:border-teal-500 focus:outline-none"
                                required
                              >
                                <option value="pharmacy">💊 صيدلية</option>
                                <option value="doctor">🩺 عيادة / طبيب</option>
                              </select>
                            </div>

                            <div className="flex items-end">
                              <button
                                type="submit"
                                className="w-full rounded-xl bg-teal-600 py-2.5 text-xs font-bold text-white hover:bg-teal-700 transition-colors shadow-md shadow-teal-600/10"
                              >
                                حفظ بيانات العميل وتفعيله
                              </button>
                            </div>
                          </div>
                        </motion.form>
                      )}
                    </AnimatePresence>

                    {/* Form 2: Import Clients from Excel / CSV */}
                    <AnimatePresence>
                      {showImportForm && (
                        <motion.div
                          key="import-clients-form-motion"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="rounded-2xl border border-indigo-100 bg-indigo-50/20 p-5 space-y-4"
                        >
                          <div className="flex items-center gap-2 border-b border-indigo-100/50 pb-2 mb-2">
                            <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
                            <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">بوابة الاستيراد المباشر من Excel / CSV 📊</h4>
                          </div>

                          {/* Steps Guide */}
                          <div className="rounded-xl bg-indigo-50/50 p-4 border border-indigo-100">
                            <h5 className="text-xs font-bold text-indigo-950 mb-2">💡 خطوات استيراد قاعدة بيانات العملاء بسهولة من ملف Excel:</h5>
                            <ul className="text-2xs text-indigo-900 space-y-1.5 list-decimal list-inside leading-relaxed pr-1">
                              <li>افتح ملف الإكسل الخاص بك الذي يحتوي على قائمة العملاء.</li>
                              <li>رتب الأعمدة بالترتيب التالي أو انسخها بهذا الشكل:
                                <span className="inline-block bg-white border border-indigo-200 rounded px-1.5 py-0.5 mx-1 font-bold text-indigo-950">اسم المسؤول</span> ثم
                                <span className="inline-block bg-white border border-indigo-200 rounded px-1.5 py-0.5 mx-1 font-bold text-indigo-950">رقم الهاتف</span> then
                                <span className="inline-block bg-white border border-indigo-200 rounded px-1.5 py-0.5 mx-1 font-bold text-indigo-950">اسم المنشأة/الصيدلية</span> ثم
                                <span className="inline-block bg-white border border-indigo-200 rounded px-1.5 py-0.5 mx-1 font-bold text-indigo-950">العنوان</span> ثم
                                <span className="inline-block bg-white border border-indigo-200 rounded px-1.5 py-0.5 mx-1 font-bold text-indigo-950">الفئة (صيدلية أو طبيب)</span>
                              </li>
                              <li>قم بتحديد الصفوف ونسخها (Ctrl + C).</li>
                              <li>الصق البيانات المنسوخة مباشرة في المربع بالأسفل (Ctrl + V) ثم اضغط <strong>تأكيد واستيراد البيانات</strong>.</li>
                            </ul>
                          </div>

                          {/* File Drag and Drop / Input Upload */}
                          <div className="space-y-2">
                            <label className="block text-2xs font-bold text-slate-600">تحميل ملف CSV أو TXT مباشرة من جهازك 📁</label>
                            <div className="flex items-center justify-center w-full">
                              <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-indigo-200 rounded-xl cursor-pointer bg-white hover:bg-indigo-50/30 hover:border-indigo-400 transition-all">
                                <div className="flex flex-col items-center justify-center pt-4 pb-4 px-4 text-center">
                                  <Upload className="h-7 w-7 text-indigo-500 mb-1" />
                                  <p className="text-xs font-bold text-indigo-950 mb-0.5">اسحب وأفلت ملف العملاء هنا أو انقر للتصفح</p>
                                  <p className="text-3xs text-slate-400 font-mono">يدعم ملفات القيم المفصولة بفواصل (.csv, .txt)</p>
                                </div>
                                <input 
                                  type="file" 
                                  accept=".csv,.txt" 
                                  className="hidden" 
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const reader = new FileReader();
                                    reader.onload = (event) => {
                                      const text = event.target?.result as string;
                                      setExcelPasteText(text);
                                      showSuccess("تم تحميل وقراءة ملف العملاء بنجاح! يرجى مراجعة البيانات في مربع النص بالأسفل ثم تأكيد الاستيراد.");
                                    };
                                    reader.onerror = () => {
                                      showError("فشل قراءة الملف. يرجى التأكد من أنه ملف نصي أو CSV صالح.");
                                    };
                                    reader.readAsText(file);
                                  }}
                                />
                              </label>
                            </div>
                          </div>

                          {/* Preview View OR Raw Pasting View */}
                          {showExcelPreview && excelPasteText.trim() ? (
                            <ExcelDataPreview
                              rawText={excelPasteText}
                              registeredUsers={registeredUsers}
                              isLoading={loading}
                              onCancel={() => setShowExcelPreview(false)}
                              onConfirmImport={handleExecuteBatchImport}
                            />
                          ) : (
                            <>
                              {/* Textarea for Pasting */}
                              <div className="space-y-2">
                                <label className="block text-2xs font-bold text-slate-600">أو الصق محتويات جدول الإكسل المنسوخ هنا مباشرة 👇</label>
                                <textarea
                                  rows={5}
                                  placeholder="أحمد علي	771234567	صيدلية الحياة	صنعاء - التحرير	صيدلية&#10;د. محمد صالح	770000000	عيادة السلام	تعز - شارع جمال	طبيب"
                                  value={excelPasteText}
                                  onChange={(e) => setExcelPasteText(e.target.value)}
                                  className="w-full rounded-xl border border-indigo-200 bg-white p-3.5 text-xs text-right font-mono focus:border-indigo-500 focus:outline-none placeholder:text-slate-400"
                                />
                              </div>

                              <div className="flex justify-end gap-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setExcelPasteText("");
                                    setShowExcelPreview(false);
                                  }}
                                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                                >
                                  مسح الحقل
                                </button>
                                <button
                                  type="button"
                                  onClick={handleOpenExcelPreview}
                                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-600/10 cursor-pointer"
                                >
                                  <Eye className="h-4 w-4" />
                                  معاينة ومراجعة الأعمدة قبل الاستيراد 🔍
                                </button>
                              </div>
                            </>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Import Status Alert */}
                    {importStatus && (
                      <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-2.5">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                        <div className="text-xs text-emerald-800 leading-relaxed">
                          <p className="font-bold">🎉 تم اكتمال عملية استيراد العملاء بنجاح!</p>
                          <ul className="list-disc list-inside mt-1.5 space-y-0.5">
                            <li>العملاء الجدد الذين تمت إضافتهم وتفعيلهم: <span className="font-bold font-mono text-emerald-950">{importStatus.addedCount} عميل</span></li>
                            <li>العملاء المكررين الذين تم تخطيهم تلقائياً: <span className="font-bold font-mono text-slate-600">{importStatus.skippedCount} عميل</span></li>
                          </ul>
                          {importStatus.skippedPhones && importStatus.skippedPhones.length > 0 && (
                            <p className="text-2xs text-emerald-700/80 mt-1 font-mono">أرقام الهواتف المتخطاة: {importStatus.skippedPhones.join(", ")}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Clients Filters & Search */}
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-slate-50 p-4 rounded-2xl border border-slate-150">
                      <div className="relative flex-1 flex items-center">
                        <span className="absolute inset-y-0 right-3.5 flex items-center text-slate-400">
                          <Search className="h-4 w-4" />
                        </span>
                        <input
                          type="text"
                          placeholder="ابحث عن عميل بالاسم، اسم الصيدلية، أو الهاتف..."
                          value={clientSearch}
                          onChange={(e) => setClientSearch(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-10 pl-3 text-xs text-right focus:border-teal-500 focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-1.5 self-end md:self-auto flex-wrap">
                        <button
                          onClick={() => setClientRoleFilter("all")}
                          className={`rounded-lg px-3 py-1.5 text-2xs font-bold transition-all cursor-pointer ${
                            clientRoleFilter === "all"
                              ? "bg-teal-600 text-white shadow-xs"
                              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          كل العملاء ({uniqueClients.length})
                        </button>

                        <button
                          onClick={() => setClientRoleFilter("pending")}
                          className={`rounded-lg px-3 py-1.5 text-2xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            clientRoleFilter === "pending"
                              ? "bg-amber-600 text-white shadow-xs"
                              : pendingCount > 0 
                                ? "bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 font-extrabold animate-pulse"
                                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <span>⏳ بانتظار التأكيد</span>
                          <span className={`rounded-full px-1.5 py-0.2 text-3xs ${clientRoleFilter === "pending" ? "bg-white/20 text-white" : "bg-amber-200 text-amber-900"}`}>
                            {pendingCount}
                          </span>
                        </button>

                        <button
                          onClick={() => setClientRoleFilter("approved")}
                          className={`rounded-lg px-3 py-1.5 text-2xs font-bold transition-all cursor-pointer ${
                            clientRoleFilter === "approved"
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          ✅ المعتمدون ({approvedCount})
                        </button>

                        <button
                          onClick={() => setClientRoleFilter("pharmacy")}
                          className={`rounded-lg px-3 py-1.5 text-2xs font-bold transition-all cursor-pointer ${
                            clientRoleFilter === "pharmacy"
                              ? "bg-teal-600 text-white shadow-xs"
                              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          🏥 الصيدليات ({uniqueClients.filter(c => c.role === "pharmacy").length})
                        </button>

                        <button
                          onClick={() => setClientRoleFilter("doctor")}
                          className={`rounded-lg px-3 py-1.5 text-2xs font-bold transition-all cursor-pointer ${
                            clientRoleFilter === "doctor"
                              ? "bg-teal-600 text-white shadow-xs"
                              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          🩺 الأطباء ({uniqueClients.filter(c => c.role === "doctor").length})
                        </button>

                        {suspendedCount > 0 && (
                          <button
                            onClick={() => setClientRoleFilter("suspended")}
                            className={`rounded-lg px-3 py-1.5 text-2xs font-bold transition-all cursor-pointer ${
                              clientRoleFilter === "suspended"
                                ? "bg-rose-600 text-white shadow-xs"
                                : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                            }`}
                          >
                            🚫 معلق ({suspendedCount})
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Clients List */}
                    {filteredClients.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500">
                        <Users className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                        <p className="text-xs font-semibold">لم يتم العثور على أي عملاء يطابقون معايير البحث أو التصفية الحالية.</p>
                        {clientRoleFilter === "pending" && (
                          <p className="text-2xs text-emerald-600 font-bold mt-2">🎉 رائع! تم تأكيد واعتماد جميع طلبات تسجيل العملاء.</p>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredClients.map((client, idx) => {
                          const isDoctor = client.role === "doctor";
                          const isPending = client.isApproved === false || client.status === "pending_approval";
                          const isSuspended = client.status === "suspended";
                          const isApproved = !isPending && !isSuspended;

                          return (
                            <div 
                              key={`adm-cli-${client.id || 'c'}-${idx}`} 
                              className={`rounded-2xl border bg-white p-4.5 hover:shadow-md transition-all duration-300 flex flex-col justify-between space-y-3.5 relative overflow-hidden group ${
                                isPending 
                                  ? "border-amber-300 bg-amber-50/15 ring-1 ring-amber-200" 
                                  : isSuspended
                                    ? "border-rose-200 bg-rose-50/10 opacity-75"
                                    : "border-slate-200"
                              }`}
                            >
                              {/* Background color accent depending on role/status */}
                              <div className={`absolute top-0 right-0 h-1 w-full ${
                                isPending ? "bg-amber-500" : isSuspended ? "bg-rose-500" : isDoctor ? "bg-indigo-500" : "bg-emerald-500"
                              }`} />

                              {/* Card Header Info */}
                              <div className="space-y-2.5">
                                <div className="flex items-center justify-between gap-1 flex-wrap">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-3xs font-bold ${
                                      isDoctor 
                                        ? "bg-indigo-50 text-indigo-700" 
                                        : "bg-emerald-50 text-emerald-700"
                                    }`}>
                                      {isDoctor ? <span>🩺 طبيب / عيادة</span> : <span>🏥 صيدلية</span>}
                                    </span>

                                    {isPending && (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-3xs font-bold text-amber-800 animate-pulse">
                                        <Clock className="h-2.5 w-2.5" />
                                        <span>بانتظار التأكيد</span>
                                      </span>
                                    )}

                                    {isApproved && (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-3xs font-bold text-emerald-700">
                                        <CheckCircle2 className="h-2.5 w-2.5" />
                                        <span>معتمد</span>
                                      </span>
                                    )}

                                    {isSuspended && (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-3xs font-bold text-rose-700">
                                        <span>معلق</span>
                                      </span>
                                    )}
                                  </div>

                                  {/* Actions */}
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => setEditingClient({
                                        id: client.id,
                                        name: client.name || "",
                                        phone: client.phone || "",
                                        entityName: client.entityName || "",
                                        location: client.location || "",
                                        role: (client.role === "doctor" ? "doctor" : "pharmacy")
                                      })}
                                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-colors cursor-pointer"
                                      title="تعديل بيانات العميل"
                                    >
                                      <Edit className="h-3.5 w-3.5" />
                                    </button>

                                    <button
                                      onClick={() => handleDeleteClient(client.id, client.entityName)}
                                      className="rounded-lg p-1.5 text-rose-500 bg-rose-50/50 hover:bg-rose-100 hover:text-rose-700 transition-colors cursor-pointer"
                                      title="حذف العميل"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>

                                <h4 className="font-bold text-slate-900 text-sm leading-snug">{client.entityName}</h4>
                                
                                <div className="space-y-1">
                                  <p className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
                                    <UserIcon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                    <span>المسؤول: {client.name}</span>
                                  </p>
                                  
                                  {client.location && (
                                    <p className="text-2xs text-slate-500 flex items-start gap-1.5">
                                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                                      <span className="leading-relaxed">{client.location}</span>
                                    </p>
                                  )}

                                  {client.phone && (
                                    <p className="text-2xs text-slate-500 flex items-center gap-1.5 font-mono">
                                      <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                      <span className="dir-ltr">{client.phone}</span>
                                    </p>
                                  )}

                                  {client.confirmationCode && (
                                    <div className="flex items-center gap-2 pt-1">
                                      <span className="text-3xs text-slate-500 font-semibold">رمز التأكيد:</span>
                                      <span className="font-mono text-2xs font-extrabold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                                        {client.confirmationCode}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Card Action Controls */}
                              <div className="border-t border-slate-100 pt-3 space-y-2">
                                {/* If Pending: Show Instant Approve & Send Code buttons */}
                                {isPending ? (
                                  <div className="space-y-2">
                                    <button
                                      onClick={() => handleApproveUser(client)}
                                      className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white py-2 text-2xs font-bold shadow-xs transition-colors cursor-pointer"
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                      <span>✅ تأكيد واعتماد الحساب فوراً</span>
                                    </button>

                                    <div className="flex items-center gap-1.5">
                                      <button
                                        onClick={() => handleSendClientWelcomeWhatsApp(client)}
                                        className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 py-1.5 text-3xs font-bold transition-colors cursor-pointer"
                                        title="إرسال رسالة التأكيد ورمز الدخول بالواتساب"
                                      >
                                        <MessageSquare className="h-3 w-3 text-emerald-600" />
                                        <span>إرسال الرمز بالواتساب</span>
                                      </button>

                                      {client.phone && (
                                        <a
                                          href={`tel:${client.phone}`}
                                          className="flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-3xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                                          title="اتصال هاتفي مباشر"
                                        >
                                          <Phone className="h-3 w-3 text-slate-500" />
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                ) : isApproved ? (
                                  <div className="flex items-center gap-1.5">
                                    {client.phone && (
                                      <>
                                        <a
                                          href={`tel:${client.phone}`}
                                          className="flex-1 flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 py-1.5 text-3xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                                        >
                                          <Phone className="h-3 w-3 text-slate-500" />
                                          اتصال
                                        </a>

                                        <button
                                          onClick={() => handleSendClientWelcomeWhatsApp(client)}
                                          className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-1.5 text-3xs font-bold text-white transition-colors shadow-2xs cursor-pointer"
                                        >
                                          <MessageSquare className="h-3 w-3" />
                                          واتساب
                                        </button>
                                      </>
                                    )}

                                    <button
                                      onClick={() => handleSuspendUser(client)}
                                      className="rounded-xl border border-rose-200 bg-rose-50 px-2 py-1.5 text-3xs font-bold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
                                      title="تعليق الدخول مؤقتاً"
                                    >
                                      تعليق
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleApproveUser(client)}
                                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white py-1.5 text-2xs font-bold transition-colors cursor-pointer"
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    <span>إعادة التفعيل والاعتماد</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* TAB 5: MEDICAL REPRESENTATIVE VISITS LOGS & AI ASSISTANT */}
              {repTab === "visits" && (
                <div className="p-5 space-y-6">
                  {/* View Mode Toggle: Form/List vs Interactive Google Map */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setVisitViewMode("list")}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          visitViewMode === "list"
                            ? "bg-teal-600 text-white shadow-xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        <ClipboardList className="h-3.5 w-3.5" />
                        <span>تسجيل وسجل الزيارات</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setVisitViewMode("map")}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          visitViewMode === "map"
                            ? "bg-teal-600 text-white shadow-xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        <MapPin className="h-3.5 w-3.5 text-rose-500" />
                        <span>خريطة الزيارات (Google Maps) 🗺️</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setRepTab("maps")}
                      className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 cursor-pointer bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200"
                    >
                      <span>عرض الخريطة بشاشة كاملة</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {visitViewMode === "map" ? (
                    <GoogleMapView
                      clients={uniqueClients}
                      visits={visits}
                      isEmbedded={true}
                      onSelectClientForVisit={(clientId) => {
                        setNewVisitForm((prev) => ({ ...prev, clientId }));
                        setVisitViewMode("list");
                      }}
                    />
                  ) : (
                    <>
                      <div className="rounded-xl border border-teal-200 bg-gradient-to-l from-teal-50/40 to-transparent p-4 flex items-start gap-3">
                        <Sparkles className="h-5 w-5 text-teal-600 shrink-0 mt-0.5" />
                        <div>
                          <h3 className="text-sm font-bold text-teal-950">المساعد الذكي لتلخيص زيارات العملاء 🪄</h3>
                          <p className="text-xs text-teal-800 leading-relaxed mt-1">
                            اكتب الملاحظات اليومية لزيارتك مع الصيدلي أو الطبيب، وسيقوم الذكاء الاصطناعي (Gemini 3.5 Flash) بتلخيص نقاط الاتفاق واستخراج قائمة مهام قابلة للمتابعة والمراجعة بشكل تفاعلي.
                          </p>
                        </div>
                      </div>

                      {/* Create New Visit Form */}
                      <form onSubmit={handleSaveVisit} id="form-visit-create" className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 space-y-4">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <ClipboardList className="h-5 w-5 text-teal-600" />
                      تسجيل زيارة عميل جديدة
                    </h4>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">اختيار المنشأة الطبية المستهدفة *</label>
                        {uniqueClients.length === 0 ? (
                          <div className="text-xs text-rose-600 font-bold bg-rose-50 p-2.5 rounded-lg">
                            ⚠️ لا يوجد عملاء نشطون مسجلون في كشوفاتك حالياً لتسجيل الزيارة لهم.
                          </div>
                        ) : (
                          <select
                            value={newVisitForm.clientId}
                            onChange={(e) => setNewVisitForm({ ...newVisitForm, clientId: e.target.value })}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-right text-xs focus:border-teal-500 focus:outline-none"
                            required
                          >
                            <option value="">-- اختر المنشأة من القائمة --</option>
                            {uniqueClients.map((c, idx) => (
                              <option key={`sel1-cli-${c.id || 'c'}-${idx}`} value={c.id}>{c.entityName} ({c.name})</option>
                            ))}
                          </select>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">تاريخ الزيارة الفعلية *</label>
                        <input
                          type="date"
                          value={newVisitForm.visitDate}
                          onChange={(e) => setNewVisitForm({ ...newVisitForm, visitDate: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-xs focus:border-teal-500 focus:outline-none"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">ملاحظات الزيارة اليومية الخام (ماذا جرى في اللقاء؟) *</label>
                      <textarea
                        placeholder="اكتب ما تم مناقشته بالتفصيل. مثال: زرت د. أحمد، الصيدلية ممتلئة بمنتجاتنا ولكن ينقصهم صنف بروفين 400. الدكتور أبدى اهتماماً كبيراً وطلب تقديم عرض أسعار خاص وبونص مجاني لتوسيع الطلبية القادمة، كما اتفقنا على توفير عينات مجانية لعيادة الأطفال."
                        value={newVisitForm.notes}
                        onChange={(e) => setNewVisitForm({ ...newVisitForm, notes: e.target.value })}
                        className="w-full h-24 rounded-lg border border-slate-200 bg-white p-3 text-right text-xs focus:border-teal-500 focus:outline-none leading-relaxed"
                        required
                      />
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleAnalyzeVisit}
                        disabled={aiAnalyzing || !newVisitForm.notes.trim()}
                        className="rounded-lg bg-teal-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-teal-700 disabled:bg-slate-300 flex items-center gap-1.5"
                      >
                        {aiAnalyzing ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            <span>جاري التحليل والتلخيص بالذكاء الاصطناعي...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>تحليل وتلخيص بالذكاء الاصطناعي 🪄</span>
                          </>
                        )}
                      </button>

                      <button
                        type="submit"
                        className="rounded-lg bg-slate-900 px-5 py-2 text-xs font-bold text-white transition-colors hover:bg-teal-600"
                      >
                        حفظ تقرير الزيارة والاتفاقات
                      </button>
                    </div>

                    {/* AI Preview Output Panel */}
                    <AnimatePresence>
                      {tempSummary && (
                        <motion.div
                          key="ai-temp-summary-motion"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="rounded-xl border border-teal-100 bg-teal-50/20 p-4 space-y-3 mt-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-0.5 text-3xs font-bold text-teal-800">
                              <Sparkles className="h-3 w-3" />
                              ملخص مقترح بواسطة الذكاء الاصطناعي
                            </span>
                          </div>
                          
                          <div className="text-xs text-slate-800 font-medium whitespace-pre-line leading-relaxed border-r-2 border-teal-400 pr-3">
                            {tempSummary}
                          </div>

                          {tempTasks.length > 0 && (
                            <div className="space-y-2 pt-1">
                              <span className="block text-xs font-bold text-slate-700">المهام المستخرجة للمتابعة:</span>
                              <div className="space-y-1.5">
                                {tempTasks.map((t, i) => (
                                  <div key={`ttask-${t.id || 't'}-${i}`} className="flex items-center gap-2 text-xs text-slate-600 bg-white/50 p-2 rounded-lg border border-slate-100">
                                    <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                                    <span>{t.taskText}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </form>

                  {/* Registered Visits Log List */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-900">سجل الزيارات السابقة ومتابعة بنود الاتفاق ({visits.length})</h4>
                    
                    {visits.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 border border-dashed border-slate-200 rounded-xl">
                        <ClipboardList className="mx-auto h-12 w-12 text-slate-300 mb-2" />
                        لا توجد زيارات مسجلة حالياً.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {visits.map((visit, visitIdx) => (
                          <div key={`adm-vst-${visit.id || 'v'}-${visitIdx}`} className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3.5">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                              <div className="space-y-1">
                                <h5 className="font-bold text-slate-950 text-base">{visit.entityName}</h5>
                                <div className="flex items-center gap-2">
                                  <span className="text-2xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                                    {visit.clientName}
                                  </span>
                                  <span className="text-3xs text-slate-300">|</span>
                                  <span className="text-2xs text-slate-400 font-mono flex items-center gap-1">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {visit.visitDate}
                                  </span>
                                </div>
                              </div>
                              <span className="text-3xs text-slate-400 font-mono">ID: {visit.id}</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Left: Notes & Summary */}
                              <div className="space-y-3">
                                <div>
                                  <span className="text-2xs font-bold text-slate-400 block mb-1">ملاحظات المندوب الخام:</span>
                                  <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg leading-relaxed whitespace-pre-wrap">{visit.notes}</p>
                                </div>

                                {visit.summary && (
                                  <div>
                                    <span className="text-2xs font-bold text-teal-600 flex items-center gap-1 mb-1">
                                      <Sparkles className="h-3.5 w-3.5" />
                                      ملخص الذكاء الاصطناعي:
                                    </span>
                                    <div className="text-xs text-slate-800 bg-teal-50/20 border-r-2 border-teal-500 pr-3 py-1 leading-relaxed whitespace-pre-wrap font-medium font-bold">
                                      {visit.summary}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Right: Tasks checklist */}
                              <div className="space-y-2 border-t md:border-t-0 md:border-r border-slate-100 pt-3 md:pt-0 md:pr-4">
                                <span className="text-2xs font-bold text-slate-400 block mb-2">قائمة المهام التفاعلية للمتابعة (اضغط للتأشير بالكمال):</span>
                                {!visit.tasks || visit.tasks.length === 0 ? (
                                  <div className="text-xs text-slate-400 italic">لا توجد مهام مستخرجة لهذه الزيارة.</div>
                                ) : (
                                  <div className="space-y-2">
                                    {visit.tasks.map((task, taskIdx) => (
                                      <div
                                        key={`adm-vtask-${visit.id || 'v'}-${visitIdx}-${task.id || 't'}-${taskIdx}`}
                                        onClick={() => handleToggleTask(visit.id, task.id)}
                                        className="flex items-start gap-2.5 p-2 rounded-lg border border-slate-100 hover:bg-slate-50 transition-all cursor-pointer"
                                      >
                                        <button
                                          type="button"
                                          className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border transition-colors mt-0.5 ${
                                            task.completed ? "border-teal-500 bg-teal-500 text-white" : "border-slate-300 bg-white"
                                          }`}
                                        >
                                          {task.completed && <Check className="h-3 w-3 stroke-[3]" />}
                                        </button>
                                        <span className={`text-xs font-medium transition-all ${
                                          task.completed ? "text-slate-400 line-through" : "text-slate-700"
                                        }`}>
                                          {task.taskText}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 5.5: MEDICAL REPRESENTATIVE GOOGLE MAPS COVERAGE */}
          {repTab === "maps" && (
            <div className="p-4 sm:p-6 space-y-4">
              <GoogleMapView
                clients={uniqueClients}
                visits={visits}
                onSelectClientForVisit={(clientId) => {
                  setNewVisitForm((prev) => ({ ...prev, clientId }));
                  setRepTab("visits");
                  setVisitViewMode("list");
                }}
              />
            </div>
          )}

          {/* TAB 6: NOTIFICATIONS MANAGEMENT & CENTRAL BROADCAST */}
          {repTab === "notifications" && (
                <div className="p-5 space-y-6">
                  {renderDeviceNotificationBanner()}

                  {/* Create Announcement Form */}
                  <form onSubmit={handleSendNotification} className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 space-y-4">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <Bell className="h-5 w-5 text-amber-500 animate-bounce" />
                      إرسال ونشر إعلان أو تعميم للعملاء
                    </h4>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 font-bold">عنوان الإعلان / الإشعار *</label>
                        <input
                          type="text"
                          placeholder="مثال: 📢 بونص إضافي على صنف نوفاتاكس!"
                          value={newNotifForm.title}
                          onChange={(e) => setNewNotifForm({ ...newNotifForm, title: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-right text-xs focus:border-teal-500 focus:outline-none"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5 font-bold">نوع الإشعار *</label>
                          <select
                            value={newNotifForm.type}
                            onChange={(e) => setNewNotifForm({ ...newNotifForm, type: e.target.value as any })}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-right text-xs focus:border-teal-500 focus:outline-none"
                            id="select-notif-type"
                          >
                            <option value="broadcast">تعميم عام (للجميع)</option>
                            <option value="target">موجه لعميل محدد</option>
                          </select>
                        </div>

                        {newNotifForm.type === "target" && (
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5 font-bold font-bold">العميل المستهدف *</label>
                            <select
                              value={newNotifForm.targetClientId}
                              onChange={(e) => setNewNotifForm({ ...newNotifForm, targetClientId: e.target.value })}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-right text-xs focus:border-teal-500 focus:outline-none"
                              required
                            >
                              <option value="">-- اختر منشأة --</option>
                              {uniqueClients.map((c, idx) => (
                                <option key={`sel2-cli-${c.id || 'c'}-${idx}`} value={c.id}>{c.entityName}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 font-bold">محتوى ونص الإعلان بالتفصيل *</label>
                      <textarea
                        placeholder="اكتب رسالة الإعلان أو الإشعار هنا..."
                        value={newNotifForm.message}
                        onChange={(e) => setNewNotifForm({ ...newNotifForm, message: e.target.value })}
                        className="w-full h-20 rounded-lg border border-slate-200 bg-white p-3 text-right text-xs focus:border-teal-500 focus:outline-none leading-relaxed"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="rounded-lg bg-slate-900 px-6 py-2.5 text-xs font-bold text-white transition-colors hover:bg-teal-600 flex items-center gap-1.5"
                    >
                      <Bell className="h-4 w-4" />
                      <span>نشر وبث الإشعار فوراً للعملاء</span>
                    </button>
                  </form>

                  {/* Sent Notifications History */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h4 className="text-sm font-bold text-slate-900">سجل الإشعارات التي قمت بنشرها ({notifications.length})</h4>
                      {notifications.length > 0 && (
                        <button
                          onClick={handleClearAllNotifications}
                          className="flex items-center gap-1 rounded-xl bg-rose-50 border border-rose-200 px-3 py-1.5 text-3xs font-bold text-rose-700 hover:bg-rose-100 transition-all shadow-2xs"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          حذف سجل الإشعارات بالكامل
                        </button>
                      )}
                    </div>
                    
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-slate-500 border border-dashed border-slate-200 rounded-xl">
                        لا توجد إشعارات مسجلة حالياً.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {notifications.map((notif, idx) => (
                          <div key={`adm-notif-${notif.id || 'n'}-${idx}`} className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 relative group hover:shadow-xs transition-shadow">
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <h5 className="font-bold text-slate-900 text-sm">{notif.title}</h5>
                                <span className={`inline-block rounded-full px-2 py-0.5 text-4xs font-bold ${
                                  notif.type === "broadcast" ? "bg-amber-100 text-amber-800" : "bg-indigo-100 text-indigo-800"
                                }`}>
                                  {notif.type === "broadcast" ? "📣 تعميم عام للكل" : `🎯 موجه إلى: ${notif.targetClientName || "عميل محدد"}`}
                                </span>
                              </div>

                              <button
                                onClick={() => handleDeleteNotification(notif.id)}
                                className="opacity-40 group-hover:opacity-100 transition-opacity rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 shrink-0"
                                title="حذف هذا الإشعار"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{notif.message}</p>
                            <span className="block text-4xs font-mono text-slate-400">
                              تاريخ النشر: {new Date(notif.createdAt).toLocaleString("ar-YE")}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {repTab === "agreements" && (
                <div className="p-3 sm:p-5">
                  <AgreementsManager
                    agreements={agreements}
                    clients={registeredUsers}
                    currentUser={user}
                    onSaveAgreement={handleSaveAgreement}
                    onDeleteAgreement={handleDeleteAgreement}
                    isAdmin={true}
                  />
                </div>
              )}

              {repTab === "scientific" && (
                renderScientificSearchTool()
              )}

              {repTab === "games" && (
                <div className="p-6">
                  <PharmaGames repAvatar={"/app-logo.png"} />
                </div>
              )}

              {repTab === "complaints" && (
                <div className="p-3 sm:p-5">
                  <ComplaintsManager
                    complaints={complaints}
                    currentUser={user}
                    onSaveComplaint={handleSaveComplaint}
                    onDeleteComplaint={handleDeleteComplaint}
                    isAdmin={true}
                  />
                </div>
              )}

              {repTab === "pediatric" && (
                <div className="p-4 sm:p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs m-3">
                  <PediatricDoseCalculator />
                </div>
              )}

              {repTab === "loyalty" && (
                <div className="p-4 sm:p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs m-3">
                  <PharmacyLoyaltyHub
                    clientName="إدارة برنامج الولاء - المندوب د/ بلال القيسي"
                    entityName="لوحة التحكم والمكافآت المعتمدة"
                    totalOrdersCount={orders.length}
                    onRedeemReward={(reward) => {
                      showSuccess(`تم تسجيل اعتماد صرف مكافأة: ${reward.title}`);
                    }}
                  />
                </div>
              )}

              {repTab === "flash" && (
                <div className="p-4 sm:p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs m-3">
                  <FlashBonusAndStockCoordinator
                    clientName="إدارة العروض والرواكد"
                    entityName="منظومة التنسيق التجاري"
                    onApplyFlashOffer={(offer) => {
                      showSuccess(`تم الاطلاع على تفاصيل العرض: ${offer.productName}`);
                    }}
                  />
                </div>
              )}

              {repTab === "exams" && (
                <div className="p-4 sm:p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs m-3">
                  <MedicalExamHub userRole="rep" />
                </div>
              )}

            </div>
          </div>
        ) : (
          /* ============================================================== */
          /* CLIENT ROLE: PHARMACY / DOCTOR (CUSTOMER STAGE)               */
          /* ============================================================== */
          <div className="space-y-4">
            
            {/* Top Header & 3-Interface Step Selector */}
            <div className="rounded-2xl border border-teal-200/80 bg-gradient-to-r from-teal-800 via-teal-900 to-slate-900 p-3 sm:p-5 shadow-sm text-white relative overflow-hidden">
              <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-teal-500/10 blur-xl pointer-events-none" />
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-0.5 text-xs font-extrabold text-teal-100 border border-white/20 backdrop-blur-xs">
                    <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                    <span>مندوبك الطبي - د/ بلال القيسي</span>
                  </div>
                  <h3 className="text-base sm:text-xl font-black text-white tracking-tight">
                    أهلاً وسهلاً بك {user?.name ? `عزيزنا المشترك (${user.name})` : ""} في منصتكم الطبية الرقمية 🌸
                  </h3>
                  <p className="text-xs sm:text-sm text-teal-50/90 leading-relaxed max-w-3xl font-medium">
                    تسجيل الجرد وطلبيات الأدوية والأصناف الطبية المعتمدة لدى المندوب الطبي د/ بلال القيسي بكل يسر وسلاسة.
                  </p>
                </div>
                
                {/* Client Main Tabs & Tools Hub Selector */}
                <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto shrink-0 bg-white/10 p-1.5 rounded-2xl border border-white/20 backdrop-blur-md">
                  <button
                    type="button"
                    onClick={() => setClientScreenStep(1)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      clientScreenStep === 1
                        ? "bg-amber-400 text-slate-950 shadow-md scale-102 font-black"
                        : "bg-transparent text-teal-100 hover:bg-white/15"
                    }`}
                  >
                    <span>📱 الرئيسية</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setClientScreenStep(2);
                      setActiveTab("sheet");
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      clientScreenStep === 2
                        ? "bg-teal-400 text-slate-950 shadow-md scale-102 font-black"
                        : "bg-transparent text-teal-100 hover:bg-white/15"
                    }`}
                  >
                    <span>📊 الأصناف والجرد</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setClientScreenStep(4)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      clientScreenStep === 4
                        ? "bg-sky-400 text-slate-950 shadow-md scale-102 font-black"
                        : "bg-transparent text-teal-100 hover:bg-white/15"
                    }`}
                  >
                    <span>👶 جرعات الأطفال</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setClientScreenStep(5)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      clientScreenStep === 5
                        ? "bg-purple-400 text-slate-950 shadow-md scale-102 font-black"
                        : "bg-transparent text-teal-100 hover:bg-white/15"
                    }`}
                  >
                    <span>📚 الدليل والتداخلات</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setClientScreenStep(6)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      clientScreenStep === 6
                        ? "bg-amber-300 text-slate-950 shadow-md scale-102 font-black"
                        : "bg-transparent text-teal-100 hover:bg-white/15"
                    }`}
                  >
                    <span>⭐ نقاط الولاء</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setClientScreenStep(7)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      clientScreenStep === 7
                        ? "bg-rose-400 text-slate-950 shadow-md scale-102 font-black"
                        : "bg-transparent text-teal-100 hover:bg-white/15"
                    }`}
                  >
                    <span>⚡ البونص والرواكد</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setClientScreenStep(8);
                      setActiveTab("exams");
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      clientScreenStep === 8 || activeTab === "exams"
                        ? "bg-emerald-400 text-slate-950 shadow-md scale-102 font-black"
                        : "bg-transparent text-teal-100 hover:bg-white/15"
                    }`}
                  >
                    <span>🎓 اختبر نفسك قبل الامتحان</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setClientScreenStep(3)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      clientScreenStep === 3
                        ? "bg-indigo-400 text-slate-950 shadow-md scale-102 font-black"
                        : "bg-transparent text-teal-100 hover:bg-white/15"
                    }`}
                  >
                    <span>🔔 السلة</span>
                  </button>
                </div>
              </div>
            </div>

            {/* WELCOME & GUIDANCE SECTION */}
            <AnimatePresence>
              {clientScreenStep === 1 && (
              <motion.div
                key="client-screen-step-1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {/* Main Header Display */}
                <div className="rounded-2xl border border-teal-200/90 bg-gradient-to-br from-white via-teal-50/40 to-emerald-50/30 p-5 sm:p-6 shadow-sm space-y-5 text-slate-900">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-teal-100 pb-4">
                    <div className="space-y-1">
                      <span className="inline-block rounded-lg bg-teal-800 px-3 py-1 text-2xs font-black text-amber-300 shadow-2xs">
                        {user?.entityName || "المنشأة الطبية"}
                      </span>
                      <h2 className="text-xl sm:text-2xl font-black text-teal-950 tracking-tight">
                        أهلاً بك: {user?.name || "اسم العميل"}
                      </h2>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setIsUserProfileModalOpen(true)}
                        className="rounded-xl bg-teal-800 hover:bg-teal-700 text-white px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                        title={isBelalAdmin ? "تعديل صورتي وبياناتي الرسمية" : "عرض وتعديل بيانات المنشأة الطبية والحساب"}
                      >
                        <UserCheck className="h-4 w-4 text-amber-300" />
                        <span>{isBelalAdmin ? "تعديل صورتي وبياناتي ⚙️" : "بيانات الحساب والمنشأة ⚙️"}</span>
                      </button>
                      <div className="rounded-xl bg-teal-100 border border-teal-200 px-3 py-1.5 text-xs font-bold text-teal-900 flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-teal-700" />
                        <span>حساب عميل موثق ({user?.entityName || "صيدلية / منشأة طبية"})</span>
                      </div>
                    </div>
                  </div>

                  {/* Representative Official Card */}
                  <div className="rounded-2xl border border-teal-300/80 bg-gradient-to-r from-teal-900 via-teal-950 to-slate-900 text-white p-4 sm:p-5 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <button
                          type="button"
                          onClick={() => setIsDrProfileModalOpen(true)}
                          className="relative group shrink-0 cursor-pointer"
                          title="اضغط لعرض صورة وهوية د/ بلال القيسي بالكامل"
                        >
                          <img
                            src={"/app-logo.png"}
                            alt="د/ بلال القيسي"
                            className="h-16 w-16 sm:h-20 sm:w-20 rounded-full object-cover border-3 border-amber-400 shadow-xl shrink-0 ring-4 ring-amber-400/30 group-hover:scale-105 transition-transform"
                            referrerPolicy="no-referrer"
                          />
                          <span className="absolute -bottom-0.5 -left-0.5 bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs">
                            🔍 تكبير
                          </span>
                        </button>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-amber-300 bg-amber-400/20 border border-amber-400/30 px-2 py-0.5 rounded-full">
                              المندوب الطبي المعتمد
                            </span>
                            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                          </div>
                          <h4 className="text-base sm:text-lg font-black text-white mt-0.5">
                            د/ بلال القيسي
                          </h4>
                          <p className="text-xs text-teal-200/90 font-medium">
                            المكتب العلمي والمبيعات الطبية | هاتف: <span className="font-mono text-amber-300 font-bold" dir="ltr">776600049</span>
                          </p>
                          {isBelalAdmin ? (
                            <div className="mt-2 flex items-center gap-2">
                              <label
                                htmlFor="dr-belal-avatar-file-profile"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black cursor-pointer transition-all shadow-xs"
                                title="رفع صورة جديدة (خاص بالإدارة د/ بلال فقط)"
                              >
                                <Camera className="h-3.5 w-3.5" />
                                <span>تغيير صورتي (إدارة التطبيق) 📸</span>
                              </label>
                              <input
                                type="file"
                                id="dr-belal-avatar-file-profile"
                                accept="image/*"
                                onChange={handleUploadCustomAvatar}
                                className="hidden"
                              />
                              {drProfileAvatar !== drBelalProfileImg && (
                                <button
                                  type="button"
                                  onClick={handleResetCustomAvatar}
                                  className="text-3xs text-teal-200 hover:text-white underline cursor-pointer"
                                >
                                  استعادة الافتراضية
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="mt-2 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-800/50 border border-teal-400/30 text-teal-100 text-xs font-semibold w-fit">
                              <ShieldCheck className="h-3.5 w-3.5 text-amber-300 shrink-0" />
                              <span>الهوية والصورة الرسمية المعتمدة للمندوب الطبي</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <a
                          href="tel:967776600049"
                          className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-teal-100 transition-all flex items-center justify-center gap-1.5"
                        >
                          <PhoneCall className="h-3.5 w-3.5 text-amber-300" />
                          <span>اتصال مباشر</span>
                        </a>
                        <a
                          href="https://wa.me/967776600049"
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black shadow-sm transition-all flex items-center justify-center gap-1.5"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span>محادثة واتساب</span>
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Welcoming Customer Section */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-semibold">
                      مرحباً بك دكتور <span className="text-teal-800 font-black">{user?.name || "العميل العزيز"}</span> ({user?.entityName || "المنشأة الطبية"}). يسعدنا جداً تقديم هذه المنصة الرقمية المخصصة لتسهيل جرد مخزونكم الدوائي وطلب الاحتياجات مباشرة من قائمة أصناف المندوب الطبي د/ بلال القيسي مع احتساب البونص المجاني فورياً.
                    </p>
                  </div>

                  {/* Interactive Quick Hub Cards (8 Specialized Modules) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Card 1: Inventory & Catalog */}
                    <button
                      type="button"
                      onClick={() => {
                        setDisclaimerAgreed(true);
                        setClientScreenStep(2);
                        setActiveTab("sheet");
                      }}
                      className="p-3.5 rounded-xl border border-teal-200 bg-white hover:bg-teal-50/60 transition-all text-right group shadow-2xs cursor-pointer"
                    >
                      <div className="h-8 w-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold mb-2 group-hover:scale-110 transition-transform">
                        📊
                      </div>
                      <h5 className="text-xs font-black text-slate-900 group-hover:text-teal-800">
                        جدول الأصناف والجرد
                      </h5>
                      <p className="text-3xs text-slate-500 mt-1 font-medium leading-relaxed">
                        تصفح الكتالوج، تسجيل الجرد، وإرسال الطلبيات مع البونص
                      </p>
                    </button>

                    {/* Card 2: Pediatric Dose Calculator */}
                    <button
                      type="button"
                      onClick={() => setClientScreenStep(4)}
                      className="p-3.5 rounded-xl border border-sky-200 bg-white hover:bg-sky-50/60 transition-all text-right group shadow-2xs cursor-pointer"
                    >
                      <div className="h-8 w-8 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center font-bold mb-2 group-hover:scale-110 transition-transform">
                        👶
                      </div>
                      <h5 className="text-xs font-black text-slate-900 group-hover:text-sky-800">
                        حاسبة جرعات الأطفال
                      </h5>
                      <p className="text-3xs text-slate-500 mt-1 font-medium leading-relaxed">
                        حساب دقيق لجرعات المعلقات والمضادات الحيوية حسب الوزن والعمر
                      </p>
                    </button>

                    {/* Card 3: Monographs & Drug Interactions */}
                    <button
                      type="button"
                      onClick={() => setClientScreenStep(5)}
                      className="p-3.5 rounded-xl border border-purple-200 bg-white hover:bg-purple-50/60 transition-all text-right group shadow-2xs cursor-pointer"
                    >
                      <div className="h-8 w-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center font-bold mb-2 group-hover:scale-110 transition-transform">
                        📚
                      </div>
                      <h5 className="text-xs font-black text-slate-900 group-hover:text-purple-800">
                        الدليل العلمي والتداخلات
                      </h5>
                      <p className="text-3xs text-slate-500 mt-1 font-medium leading-relaxed">
                        بطاقة دوائية شاملة (دواعي، موانع، بدائل) وفاحص التفاعلات الدوائية
                      </p>
                    </button>

                    {/* Card 4: Loyalty & Rewards Hub */}
                    <button
                      type="button"
                      onClick={() => setClientScreenStep(6)}
                      className="p-3.5 rounded-xl border border-amber-200 bg-white hover:bg-amber-50/60 transition-all text-right group shadow-2xs cursor-pointer"
                    >
                      <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold mb-2 group-hover:scale-110 transition-transform">
                        ⭐
                      </div>
                      <h5 className="text-xs font-black text-slate-900 group-hover:text-amber-800">
                        برنامج ولاء ومكافآت الصيدليات
                      </h5>
                      <p className="text-3xs text-slate-500 mt-1 font-medium leading-relaxed">
                        اجمع النقاط مع كل طلبية واستبدلها بخصومات وبونص ومكافآت حصرية
                      </p>
                    </button>

                    {/* Card 5: Flash Bonus & Stock Coordination */}
                    <button
                      type="button"
                      onClick={() => setClientScreenStep(7)}
                      className="p-3.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50/60 transition-all text-right group shadow-2xs cursor-pointer"
                    >
                      <div className="h-8 w-8 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center font-bold mb-2 group-hover:scale-110 transition-transform">
                        ⚡
                      </div>
                      <h5 className="text-xs font-black text-slate-900 group-hover:text-rose-800">
                        البونص الخاطف وتنسيق الرواكد
                      </h5>
                      <p className="text-3xs text-slate-500 mt-1 font-medium leading-relaxed">
                        عروض بونص محدودة بوقت وحصر الأدوية قريبة الانتهاء لتدويرها
                      </p>
                    </button>

                    {/* Card 6: Medical Licensing Exam Hub (اختبر نفسك قبل الامتحان) */}
                    <button
                      type="button"
                      onClick={() => {
                        setClientScreenStep(8);
                        setActiveTab("exams");
                      }}
                      className="p-3.5 rounded-xl border border-emerald-200 bg-white hover:bg-emerald-50/60 transition-all text-right group shadow-2xs cursor-pointer"
                    >
                      <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold mb-2 group-hover:scale-110 transition-transform">
                        🎓
                      </div>
                      <h5 className="text-xs font-black text-slate-900 group-hover:text-emerald-800">
                        اختبر نفسك قبل الامتحان
                      </h5>
                      <p className="text-3xs text-slate-500 mt-1 font-medium leading-relaxed">
                        نماذج وبنوك أسئلة مزاولة المهنة لجميع التخصصات (صيدلة، طب، تمريض، مختبرات)
                      </p>
                    </button>

                    {/* Card 7: Net Price Calculator */}
                    <button
                      type="button"
                      onClick={() => setShowBonusPriceModal(true)}
                      className="p-3.5 rounded-xl border border-teal-200 bg-white hover:bg-teal-50/60 transition-all text-right group shadow-2xs cursor-pointer"
                    >
                      <div className="h-8 w-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold mb-2 group-hover:scale-110 transition-transform">
                        🎁
                      </div>
                      <h5 className="text-xs font-black text-slate-900 group-hover:text-teal-800">
                        حاسبة السعر الصافي
                      </h5>
                      <p className="text-3xs text-slate-500 mt-1 font-medium leading-relaxed">
                        معرفة سعر العبوة الصافي بعد احتساب كميات ونسب البونص
                      </p>
                    </button>

                    {/* Card 8: Complaints & Inquiries */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("complaints");
                        setClientScreenStep(2);
                      }}
                      className="p-3.5 rounded-xl border border-indigo-200 bg-white hover:bg-indigo-50/60 transition-all text-right group shadow-2xs cursor-pointer"
                    >
                      <div className="h-8 w-8 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold mb-2 group-hover:scale-110 transition-transform">
                        📬
                      </div>
                      <h5 className="text-xs font-black text-slate-900 group-hover:text-indigo-800">
                        الشكاوى والمقترحات
                      </h5>
                      <p className="text-3xs text-slate-500 mt-1 font-medium leading-relaxed">
                        إرسال ملاحظة أو اقتراح أو شكوى ومتابعة رد المندوب الفوري
                      </p>
                    </button>
                  </div>

                  {/* EXACT MANDATED ALTERNATIVE GUIDANCE TEXT */}
                  <div className="rounded-2xl border-2 border-teal-300 bg-teal-50/90 p-5 shadow-xs text-teal-950 relative overflow-hidden">
                    <div className="bg-white p-4 sm:p-5 rounded-xl border border-teal-200 shadow-2xs">
                      <p className="text-sm sm:text-base font-black leading-relaxed text-teal-950 text-right">
                        "عزيزي العميل، يرجى الاطلاع على قائمة الأصناف لتزويدكم بنقص الأصناف الذي لديكم وتزويد المندوب بالجرد."
                      </p>
                    </div>
                  </div>

                  {/* Action Navigation */}
                  <div className="rounded-xl border border-slate-200 bg-slate-900 text-white p-4 sm:p-5 shadow-sm flex items-center justify-center">
                    <button
                      onClick={() => {
                        setDisclaimerAgreed(true);
                        setClientScreenStep(2);
                        setActiveTab("sheet");
                      }}
                      className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-teal-400 hover:brightness-105 text-slate-950 px-6 py-3 font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>الانتقال إلى قائمة الأصناف والجرد</span>
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* PRODUCT TABLE & INVENTORY SHEET SECTION (ULTRA-COMPACT DENSE VIEW) */}
            {clientScreenStep === 2 && (
              <motion.div
                key="client-screen-step-2"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-2.5"
              >
                {/* 1. Ultra-Compact Streamlined Control & Filter Header */}
                <div className="rounded-xl border border-teal-200/90 bg-white p-2.5 sm:p-3 shadow-2xs space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {/* Title & Product Count */}
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-md bg-teal-800 text-white px-2 py-0.5 text-3xs font-extrabold shadow-2xs">
                        <span>💊 الأصناف</span>
                        <span className="bg-teal-950 text-amber-300 px-1.5 py-0.2 rounded-full font-mono">{filteredProducts.length}</span>
                      </span>
                      <h3 className="text-xs sm:text-sm font-black text-slate-900">
                        الجرد والطلبيات مع البونص 🎁
                      </h3>
                    </div>

                    {/* View Controls & Density Switcher */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Density Switcher */}
                      <button
                        type="button"
                        onClick={() => setDensityMode(densityMode === "compact" ? "normal" : "compact")}
                        className={`px-2.5 py-1 rounded-lg text-3xs font-black transition-all flex items-center gap-1 border cursor-pointer ${
                          densityMode === "compact"
                            ? "bg-amber-100 text-amber-950 border-amber-300 font-extrabold shadow-2xs"
                            : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                        }`}
                        title="تبديل حجم الشاشة وكثافة العرض"
                      >
                        <span>⚡</span>
                        <span>{densityMode === "compact" ? "فائق الكثافة (أصناف أكثر)" : "عرض عادي"}</span>
                      </button>

                      {/* View Mode Switcher */}
                      <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setProductViewMode("cards")}
                          className={`px-2 py-1 rounded-md text-3xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                            productViewMode === "cards"
                              ? "bg-teal-700 text-white shadow-2xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          <LayoutGrid className="h-3 w-3" />
                          <span>بطاقات</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setProductViewMode("table")}
                          className={`px-2 py-1 rounded-md text-3xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                            productViewMode === "table"
                              ? "bg-teal-700 text-white shadow-2xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          <TableIcon className="h-3 w-3" />
                          <span>جدول</span>
                        </button>
                      </div>

                      {/* Net Price Calculator Button */}
                      <button
                        type="button"
                        onClick={() => setShowBonusPriceModal(true)}
                        className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-105 text-white px-2.5 py-1 text-3xs font-black shadow-2xs transition-all flex items-center gap-1 border border-amber-300 cursor-pointer"
                      >
                        <Sparkles className="h-3 w-3 text-amber-200" />
                        <span>حاسبة البونص</span>
                      </button>

                      {/* QR Code & Barcode Camera Scanner Button */}
                      <button
                        type="button"
                        onClick={() => setIsQRScannerModalOpen(true)}
                        className="rounded-lg bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white px-3 py-1 text-3xs font-black shadow-sm transition-all flex items-center gap-1.5 border border-teal-500 cursor-pointer animate-pulse hover:animate-none"
                        title="مسح باركود و QR ملصق الصنف بالكاميرا لإضافته فوراً للطلبية"
                        id="btn-scan-product-qr-sheet"
                      >
                        <Camera className="h-3.5 w-3.5 text-teal-200" />
                        <span>مسح باركود بالكاميرا 📷</span>
                      </button>
                    </div>
                  </div>

                  {/* Compact Search & Category Filter Bar */}
                  <div className="flex flex-col sm:flex-row items-center gap-2 pt-1 border-t border-slate-100">
                    <div className="relative w-full sm:w-72 shrink-0 flex items-center gap-1">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          placeholder="🔍 بحث متقدم: الاسم التجاري، المادة الفعالة، التصنيف، أو الباركود..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full rounded-xl border border-teal-300 bg-teal-50/50 py-1.5 pr-8 pl-6 text-right text-3xs font-bold text-slate-800 focus:border-teal-600 focus:bg-white focus:outline-none transition-colors"
                        />
                        <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-teal-600" />
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsQRScannerModalOpen(true)}
                        className="rounded-lg bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 p-1.5 transition-colors cursor-pointer shrink-0"
                        title="مسح باركود عبر الكاميرا"
                      >
                        <Camera className="h-4 w-4 text-teal-700" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1 overflow-x-auto w-full pb-0.5 text-3xs scrollbar-none">
                      {categories.map((cat, idx) => {
                        const isSelected = selectedCategory === cat;
                        const catColor = cat === "الكل" ? "#0f766e" : getCategoryColor(cat, categoryColors);
                        return (
                          <button
                            key={`cat-${cat}-${idx}`}
                            onClick={() => setSelectedCategory(cat)}
                            className={`rounded-md px-2 py-0.5 shrink-0 font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                              isSelected
                                ? "bg-teal-800 text-white shadow-2xs"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {cat !== "الكل" && (
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: isSelected ? "#ffffff" : catColor }}
                              />
                            )}
                            <span>{cat}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Micro Stats Counter Strip */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 text-4xs font-bold text-slate-500 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span>📦 تم جردها: <strong className="text-teal-900 font-mono">{Object.values(remainingInputs).filter(v => v !== "").length}</strong></span>
                      <span>🛒 أصناف بالطلبية: <strong className="text-indigo-900 font-mono">{Object.values(orderInputs).filter(v => Number(v) > 0).length}</strong></span>
                      <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        <span>💾</span>
                        <span>حفظ تلقائي مفعل (Auto-save)</span>
                      </span>
                    </div>
                    <span className="text-amber-800 font-semibold hidden xs:inline">
                      💡 احتساب البونص وتخفيض السعر الصافي تلقائياً مع كل كمية
                    </span>
                  </div>
                </div>

                {/* VIEW 1: ULTRA-COMPACT CARDS VIEW (Multi-Column Grid for Phones & Desktops) */}
                {productViewMode === "cards" && (
                  <div>
                    {filteredProducts.length === 0 ? (
                      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500 text-xs shadow-2xs">
                        لا توجد أصناف تطابق معايير البحث.
                      </div>
                    ) : (
                      <div className={
                        densityMode === "compact"
                          ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2"
                          : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
                      }>
                        {filteredProducts.map((prod, index) => {
                          const remainingVal = remainingInputs[prod.id] || "";
                          const orderVal = orderInputs[prod.id] || "";
                          const isLowStock = remainingVal !== "" && Number(remainingVal) <= 5;
                          const hasOrder = orderVal !== "" && Number(orderVal) > 0;
                          const orderQty = Number(orderVal) || 0;
                          const netCalc = calculateNetPrice(prod.price, prod.bonus);
                          const bonusReward = calculateBonusReward(orderQty, prod.bonus);

                          return (
                            <div
                              key={`compact-card-${prod.id || 'p'}-${index}`}
                              className={`rounded-xl border transition-all bg-white p-2 sm:p-2.5 shadow-2xs flex flex-col justify-between space-y-1.5 hover:shadow-xs relative overflow-hidden ${
                                hasOrder
                                  ? "border-indigo-400 ring-1 ring-indigo-200 bg-indigo-50/15"
                                  : isLowStock
                                  ? "border-rose-300 bg-rose-50/10"
                                  : "border-slate-200 hover:border-teal-300"
                              }`}
                            >
                              {/* Top Bar: Category & Price & Bonus */}
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-1">
                                  <span
                                    className="text-4xs font-bold px-1 py-0.2 rounded truncate max-w-[80px] border shadow-3xs inline-flex items-center gap-0.5"
                                    style={{
                                      backgroundColor: `${getCategoryColor(prod.category, categoryColors)}15`,
                                      borderColor: `${getCategoryColor(prod.category, categoryColors)}40`,
                                      color: getCategoryColor(prod.category, categoryColors),
                                    }}
                                  >
                                    <span
                                      className="w-1 h-1 rounded-full shrink-0"
                                      style={{ backgroundColor: getCategoryColor(prod.category, categoryColors) }}
                                    />
                                    {prod.category}
                                  </span>
                                  {prod.bonus && (
                                    <span className="text-4xs font-black text-amber-900 bg-amber-100 border border-amber-300 px-1 py-0.2 rounded shadow-2xs shrink-0">
                                      🎁 {formatBonusDisplay(prod.bonus)}
                                    </span>
                                  )}
                                </div>

                                <h4 className="text-xs font-black text-slate-900 leading-tight line-clamp-2 min-h-[28px]" title={prod.name}>
                                  {prod.name}
                                </h4>

                                <div className="flex items-center justify-between text-3xs pt-0.5 border-t border-slate-100">
                                  <span className="font-mono font-black text-teal-700">
                                    {prod.price}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedBonusProduct(prod);
                                      setShowBonusPriceModal(true);
                                    }}
                                    className="text-4xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-1 py-0.2 rounded border border-emerald-200/70 shrink-0 cursor-pointer"
                                    title="السعر الصافي بالبونص"
                                  >
                                    الصافي: {netCalc.netFormatted.split(" ")[0]}
                                  </button>
                                </div>
                              </div>

                              {/* Steppers: Inventory & Order in Compact Side-by-Side Rows */}
                              <div className="space-y-1 pt-1 border-t border-slate-100">
                                {/* Inventory Stepper (الجرد) */}
                                <div className="flex items-center justify-between bg-teal-50/60 border border-teal-100/80 rounded-lg px-1.5 py-0.5">
                                  <span className="text-4xs font-bold text-teal-950 shrink-0">
                                    الجرد 📦:
                                  </span>
                                  <div className="flex items-center gap-0.5">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateRemaining(prod.id, -1)}
                                      className="h-5 w-5 rounded bg-white hover:bg-teal-100 text-teal-900 font-bold active:scale-95 text-xs flex items-center justify-center cursor-pointer border border-teal-200 shadow-2xs"
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      min="0"
                                      placeholder="0"
                                      value={remainingVal}
                                      onChange={(e) => setRemainingInputs({
                                        ...remainingInputs,
                                        [prod.id]: e.target.value
                                      })}
                                      className={`w-7 h-5 rounded border text-center font-mono font-bold text-3xs focus:outline-none ${
                                        isLowStock
                                          ? "border-rose-300 bg-rose-50 text-rose-800"
                                          : "border-slate-200 bg-white text-slate-900"
                                      }`}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateRemaining(prod.id, 1)}
                                      className="h-5 w-5 rounded bg-teal-700 hover:bg-teal-800 text-white font-bold active:scale-95 text-xs flex items-center justify-center cursor-pointer shadow-2xs"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>

                                {/* Order Stepper (الطلب) */}
                                <div className="flex items-center justify-between bg-indigo-50/60 border border-indigo-100/80 rounded-lg px-1.5 py-0.5">
                                  <span className="text-4xs font-bold text-indigo-950 shrink-0">
                                    الطلب 🛒:
                                  </span>
                                  <div className="flex items-center gap-0.5">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateOrder(prod.id, -1)}
                                      className="h-5 w-5 rounded bg-white hover:bg-indigo-100 text-indigo-900 font-bold active:scale-95 text-xs flex items-center justify-center cursor-pointer border border-indigo-200 shadow-2xs"
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      min="0"
                                      placeholder="0"
                                      value={orderVal}
                                      onChange={(e) => setOrderInputs({
                                        ...orderInputs,
                                        [prod.id]: e.target.value
                                      })}
                                      className={`w-7 h-5 rounded border text-center font-mono font-bold text-3xs focus:outline-none ${
                                        hasOrder
                                          ? "border-indigo-400 bg-indigo-100 text-indigo-900 font-black"
                                          : "border-slate-200 bg-white text-slate-900"
                                      }`}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateOrder(prod.id, 1)}
                                      className="h-5 w-5 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-bold active:scale-95 text-xs flex items-center justify-center cursor-pointer shadow-2xs"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Bonus earned pill */}
                              {bonusReward && bonusReward.totalFree > 0 && (
                                <div className="rounded bg-emerald-100 text-emerald-950 text-4xs font-black p-0.5 text-center shadow-2xs">
                                  🎉 +{bonusReward.totalFree} {prod.unit} مجاناً
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* VIEW 2: ULTRA-COMPACT RESPONSIVE TABLE VIEW */}
                {productViewMode === "table" && (
                  <div className="space-y-2">
                    {/* Bulk Actions Toolbar */}
                    {selectedProductIds.length > 0 && (
                      <div className="bg-amber-50 border border-amber-300 p-2.5 rounded-xl flex items-center justify-between flex-wrap gap-2 text-3xs font-bold text-amber-950 shadow-2xs">
                        <div className="flex items-center gap-2">
                          <span className="bg-amber-500 text-white px-2 py-0.5 rounded font-black font-mono">
                            {selectedProductIds.length} أصناف محددة
                          </span>
                          <span>إجراءات دفعة واحدة للطلبيات والأصناف:</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleBulkUpdateQuantity(5)}
                            className="px-2.5 py-1 bg-white hover:bg-amber-100 border border-amber-300 rounded-lg text-amber-900 cursor-pointer shadow-2xs"
                          >
                            تعيين الكمية = 5
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBulkUpdateQuantity(10)}
                            className="px-2.5 py-1 bg-white hover:bg-amber-100 border border-amber-300 rounded-lg text-amber-900 cursor-pointer shadow-2xs"
                          >
                            تعيين الكمية = 10
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBulkUpdateQuantity(20)}
                            className="px-2.5 py-1 bg-white hover:bg-amber-100 border border-amber-300 rounded-lg text-amber-900 cursor-pointer shadow-2xs"
                          >
                            تعيين الكمية = 20
                          </button>
                          <button
                            type="button"
                            onClick={handleBulkDeleteSelected}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg cursor-pointer shadow-2xs"
                          >
                            تفريغ / حذف كميات المحدد 🗑️
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedProductIds([])}
                            className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg cursor-pointer"
                          >
                            إلغاء التحديد ✕
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden w-full">
                      <div className="overflow-y-auto min-h-[40vh] max-h-[75vh] relative w-full">
                        <table className="w-full text-right border-collapse text-3xs sm:text-2xs table-fixed sm:table-auto">
                          <thead className="sticky top-0 z-20 shadow-2xs">
                            <tr className="bg-slate-950 text-white font-black text-4xs sm:text-3xs uppercase tracking-wider">
                              <th className="p-1.5 sm:p-2 border-l border-slate-800 text-center w-[36px]">
                                <input
                                  type="checkbox"
                                  checked={filteredProducts.length > 0 && selectedProductIds.length === filteredProducts.length}
                                  onChange={handleToggleSelectAll}
                                  className="rounded border-slate-700 text-teal-600 focus:ring-teal-500 cursor-pointer"
                                  title="تحديد الكل"
                                />
                              </th>
                              <th className="p-1.5 sm:p-2 border-l border-slate-800 text-right w-[38%] sm:w-[30%]">
                                1. الصنف
                              </th>
                              <th className="p-1.5 sm:p-2 border-l border-slate-800 text-right w-[22%] sm:w-[20%] bg-slate-900">
                                2. السعر والبونص 🎁
                              </th>
                              <th className="p-1.5 sm:p-2 border-l border-slate-800 text-center w-[16%] sm:w-[15%] bg-teal-950 text-teal-300">
                                3. الجرد 📦
                              </th>
                              <th className="p-1.5 sm:p-2 border-l border-slate-800 text-center w-[16%] sm:w-[15%] bg-indigo-950 text-indigo-300">
                                4. الطلب 🛒
                              </th>
                              <th className="p-1.5 sm:p-2 bg-amber-950 text-amber-300 text-center hidden sm:table-cell sm:w-[18%]">
                                5. السعر الصافي 🔍
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {filteredProducts.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="p-6 text-center text-slate-500 text-xs">
                                  لا توجد أصناف تطابق معايير البحث.
                                </td>
                              </tr>
                            ) : (
                              filteredProducts.map((prod, index) => {
                                const remainingVal = remainingInputs[prod.id] || "";
                                const orderVal = orderInputs[prod.id] || "";
                                const isLowStock = remainingVal !== "" && Number(remainingVal) <= 5;
                                const hasOrder = orderVal !== "" && Number(orderVal) > 0;
                                const netCalc = calculateNetPrice(prod.price, prod.bonus);
                                const isSelected = selectedProductIds.includes(prod.id);

                                return (
                                  <tr 
                                    key={`dense-table-row-${prod.id || 'p'}-${index}`} 
                                    className={`transition-colors hover:bg-teal-50/20 ${
                                      isSelected ? "bg-amber-50/40" : hasOrder ? "bg-indigo-50/20" : isLowStock ? "bg-rose-50/15" : ""
                                    }`}
                                  >
                                    {/* Checkbox */}
                                    <td className="p-1.5 sm:p-2 border-l border-slate-100 align-middle text-center">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => handleToggleSelectProduct(prod.id)}
                                        className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                                      />
                                    </td>
                                  <td className="p-1.5 sm:p-2 border-l border-slate-100 align-middle">
                                    <div className="flex items-center gap-1.5">
                                      <span className="h-4 w-4 shrink-0 rounded bg-slate-100 text-slate-700 font-mono font-bold text-4xs flex items-center justify-center border border-slate-200">
                                        {index + 1}
                                      </span>
                                      <div className="min-w-0 flex-1">
                                        <div className="font-black text-slate-900 text-3xs sm:text-xs leading-snug break-words">
                                          {prod.name}
                                        </div>
                                        <span
                                          className="text-4xs font-bold px-1 rounded border shadow-3xs inline-flex items-center gap-0.5"
                                          style={{
                                            backgroundColor: `${getCategoryColor(prod.category, categoryColors)}15`,
                                            borderColor: `${getCategoryColor(prod.category, categoryColors)}40`,
                                            color: getCategoryColor(prod.category, categoryColors),
                                          }}
                                        >
                                          <span
                                            className="w-1 h-1 rounded-full shrink-0"
                                            style={{ backgroundColor: getCategoryColor(prod.category, categoryColors) }}
                                          />
                                          {prod.category}
                                        </span>
                                      </div>
                                    </div>
                                  </td>

                                  {/* 2. السعر والبونص */}
                                  <td className="p-1.5 sm:p-2 border-l border-slate-100 align-middle">
                                    <div className="space-y-0.5">
                                      <div className="font-mono font-black text-teal-700 text-3xs sm:text-xs">
                                        {prod.price}
                                      </div>
                                      {prod.bonus ? (
                                        <span className="inline-block bg-amber-100 border border-amber-300 px-1 py-0.2 rounded text-4xs font-black text-amber-900 shadow-2xs">
                                          🎁 {formatBonusDisplay(prod.bonus)}
                                        </span>
                                      ) : (
                                        <span className="text-4xs text-slate-400">-</span>
                                      )}
                                    </div>
                                  </td>

                                  {/* 3. الجرد */}
                                  <td className="p-1 sm:p-1.5 border-l border-slate-100 align-middle text-center bg-teal-50/10">
                                    <div className="flex items-center justify-center gap-0.5">
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateRemaining(prod.id, -1)}
                                        className="h-5 w-4 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold active:scale-95 text-xs flex items-center justify-center cursor-pointer"
                                      >
                                        -
                                      </button>
                                      <input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        value={remainingVal}
                                        onChange={(e) => setRemainingInputs({
                                          ...remainingInputs,
                                          [prod.id]: e.target.value
                                        })}
                                        className={`w-9 sm:w-11 h-6 rounded border text-center font-mono font-black text-3xs sm:text-xs focus:outline-none ${
                                          isLowStock 
                                            ? "border-rose-300 bg-rose-50 text-rose-800 font-extrabold"
                                            : "border-slate-200 bg-white text-slate-900 focus:border-teal-500"
                                        }`}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateRemaining(prod.id, 1)}
                                        className="h-5 w-4 rounded bg-teal-100 hover:bg-teal-200 text-teal-800 font-bold active:scale-95 text-xs flex items-center justify-center cursor-pointer"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </td>

                                  {/* 4. الطلب */}
                                  <td className="p-1 sm:p-1.5 border-l border-slate-100 align-middle text-center bg-indigo-50/10">
                                    <div className="flex items-center justify-center gap-0.5">
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateOrder(prod.id, -1)}
                                        className="h-5 w-4 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold active:scale-95 text-xs flex items-center justify-center cursor-pointer"
                                      >
                                        -
                                      </button>
                                      <input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        value={orderVal}
                                        onChange={(e) => setOrderInputs({
                                          ...orderInputs,
                                          [prod.id]: e.target.value
                                        })}
                                        className={`w-9 sm:w-11 h-6 rounded border text-center font-mono font-black text-3xs sm:text-xs focus:outline-none ${
                                          hasOrder 
                                            ? "border-indigo-400 bg-indigo-50 text-indigo-900 font-extrabold"
                                            : "border-slate-200 bg-white text-slate-900 focus:border-indigo-500"
                                        }`}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateOrder(prod.id, 1)}
                                        className="h-5 w-4 rounded bg-indigo-100 hover:bg-indigo-200 text-indigo-800 font-bold active:scale-95 text-xs flex items-center justify-center cursor-pointer"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </td>

                                  {/* 5. السعر الصافي */}
                                  <td className="p-1.5 sm:p-2 align-middle text-center bg-amber-50/15 hidden sm:table-cell">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedBonusProduct(prod);
                                        setShowBonusPriceModal(true);
                                      }}
                                      className="rounded-lg bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-950 font-bold px-2 py-0.5 text-3xs shadow-2xs transition-all inline-flex items-center gap-1 cursor-pointer"
                                    >
                                      <Sparkles className="h-3 w-3 text-amber-700" />
                                      <span className="font-mono">{netCalc.netFormatted}</span>
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

                {/* Streamlined Agreement Notes & Fast Action Bar */}
                <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-2.5 sm:p-3 shadow-2xs space-y-2">
                  <div className="flex items-center gap-1.5 text-amber-950 font-bold text-3xs sm:text-xs">
                    <ClipboardList className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>ملاحظات الاتفاق مع المندوب د/ بلال القيسي:</span>
                  </div>
                  
                  <textarea
                    rows={1}
                    placeholder="شروط خاصة أو تفاصيل سداد متفق عليها..."
                    value={agreedTermsNotes}
                    onChange={(e) => {
                      setAgreedTermsNotes(e.target.value);
                      localStorage.setItem("mandoubak_agreed_terms", e.target.value);
                    }}
                    className="w-full rounded-lg border border-amber-200 bg-white p-2 text-3xs font-semibold text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:outline-none"
                  />

                  {/* Fast Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-amber-200/60">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        onClick={handleBatchSubmit}
                        disabled={loading}
                        className="rounded-lg bg-teal-700 hover:bg-teal-800 text-white px-3.5 py-1.5 font-black text-3xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <FileSpreadsheet className="h-3.5 w-3.5" />
                        <span>تأكيد وإرسال الجرد والطلبيات</span>
                      </button>

                      <button
                        onClick={handleShareOrderWhatsApp}
                        className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 font-black text-3xs shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>واتساب 💬</span>
                      </button>

                      <button
                        onClick={() => {
                          localStorage.setItem("mandoubak_draft_remaining", JSON.stringify(remainingInputs));
                          localStorage.setItem("mandoubak_draft_order", JSON.stringify(orderInputs));
                          showSuccess("تم حفظ المسودة بنجاح");
                        }}
                        className="rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-2.5 py-1.5 font-bold text-3xs transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>حفظ مسودة</span>
                      </button>

                      <button
                        onClick={() => {
                          setRemainingInputs({});
                          setOrderInputs({});
                          showSuccess("تم تفريغ الإدخالات");
                        }}
                        className="rounded-lg bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 px-2 py-1.5 font-bold text-4xs transition-all cursor-pointer"
                      >
                        تفريغ
                      </button>
                    </div>

                    <button
                      onClick={() => setClientScreenStep(3)}
                      className="rounded-lg bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 font-bold text-3xs shadow-2xs transition-all flex items-center gap-1 mr-auto cursor-pointer"
                    >
                      <span>السلة والإشعارات</span>
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Floating/Sticky Bottom Order Pill for Instant Submission */}
                {Object.values(orderInputs).some(v => Number(v) > 0) && (
                  <div className="sticky bottom-3 z-40 rounded-xl border border-indigo-400 bg-slate-950/95 text-white p-2.5 shadow-xl backdrop-blur-md flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0">
                        🛒
                      </div>
                      <div className="text-3xs font-black text-indigo-100">
                        <span>الطلبية: </span>
                        <span className="bg-indigo-900 border border-indigo-700 px-1.5 py-0.2 rounded font-mono text-amber-300">
                          {Object.values(orderInputs).filter(v => Number(v) > 0).length} صنف
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handleShareOrderWhatsApp}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-3xs font-black shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <MessageSquare className="h-3 w-3" />
                        <span>واتساب</span>
                      </button>
                      <button
                        onClick={handleBatchSubmit}
                        disabled={loading}
                        className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-teal-400 to-emerald-400 hover:brightness-105 text-slate-950 text-3xs font-black shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <FileSpreadsheet className="h-3 w-3 text-slate-950" />
                        <span>إرسال 🚀</span>
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* NOTIFICATIONS & BASKET SECTION */}
            {clientScreenStep === 3 && (
              <motion.div
                key="client-screen-step-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {/* Section Title */}
                <div className="rounded-2xl border border-indigo-200 bg-white p-4 shadow-2xs flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="inline-block rounded-md bg-indigo-100 text-indigo-900 px-2.5 py-0.5 text-2xs font-extrabold">
                      السلة والإشعارات
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-slate-950">
                      الإشعارات والتعاميم وسلة الطلبيات والألعاب الرياضية 🏀
                    </h3>
                  </div>
                </div>

                {/* 1. Notifications & Announcements Section */}
                <div className="rounded-2xl border border-teal-200 bg-white p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2 text-teal-900 font-extrabold text-sm">
                      <Bell className="h-5 w-5 text-teal-600 animate-pulse" />
                      <span>إشعارات وتنبيهات المندوب الطبي د/ بلال القيسي</span>
                    </div>
                    <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-2xs font-bold text-teal-800">
                      محدّث فوراً
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-3 flex items-start gap-3">
                      <Info className="h-5 w-5 text-teal-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-teal-950 text-xs sm:text-sm">تذكير دوري بالجرد والطلبيات 📄</h4>
                        <p className="text-xs text-teal-900 leading-relaxed font-medium mt-0.5">
                          يرجى تحديث الجرد بانتظام في جدول الأصناف لضمان التوريد المستمر دون انقطاع الأصناف.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Sent Orders & Stock Basket Section */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
                      <ShoppingCart className="h-5 w-5 text-teal-600" />
                      <span>سلة الطلبيات وكشوفات الجرد المسجلة</span>
                    </div>
                    {orders.length > 0 && (
                      <button
                        onClick={handleExportOrdersCSV}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 px-2.5 py-1 text-2xs font-bold"
                      >
                        <Download className="h-3.5 w-3.5 text-teal-600" />
                        <span>تصدير الطلبيات</span>
                      </button>
                    )}
                  </div>

                  {orders.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-xs">
                      لا توجد طلبيات سابقة مسجلة بالسلة. يمكنك الانتقال للواجهة رقم (2) لإرسال طلبك الأول.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto pl-1">
                      {orders.map((order, idx) => (
                        <div key={`c1-ord-${order.id || 'o'}-${idx}`} className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between font-bold text-slate-900">
                            <span>طلب رقم: {order.id.slice(-6)}</span>
                            <span className="text-3xs text-slate-500 font-mono">
                              {new Date(order.createdAt).toLocaleDateString("ar-YE")}
                            </span>
                          </div>
                          <div className="text-2xs text-slate-600">
                            عدد الأصناف: {order.items.length} صنف | الحالة: <span className="text-emerald-700 font-bold">قيد المتابعة</span>
                          </div>
                          {order.notes && (
                            <div className="text-3xs bg-amber-50 text-amber-900 p-1.5 rounded border border-amber-200">
                              {order.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Sports Basket / Pharma Games Section (سلة الألعاب والأنشطة الرياضية) */}
                <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/80 via-white to-teal-50/50 p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-amber-200/80 pb-3">
                    <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
                      <Trophy className="h-5 w-5 text-amber-500" />
                      <span>سلة الألعاب والأنشطة الرياضية والتعليمية 🏀🎮</span>
                    </div>
                    <span className="rounded-full bg-amber-500 text-white text-3xs font-black px-2 py-0.5">
                      تفاعلي 🏆
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 font-medium leading-relaxed">
                    قسم ترفيهي وتثقيفي يحتوي على تحديات رياضية ومعلومات دوائية تفاعلية للصيادلة والأطباء.
                  </p>

                  <button
                    onClick={() => setActiveTab("games")}
                    className="w-full rounded-xl bg-slate-900 hover:bg-amber-600 text-white py-3 font-extrabold text-xs shadow-sm transition-all flex items-center justify-center gap-2"
                  >
                    <span>فتح سلة الألعاب والتحديات الرياضية 🎮</span>
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* PEDIATRIC DOSE CALCULATOR SECTION (STEP 4) */}
            {clientScreenStep === 4 && (
              <motion.div
                key="client-screen-step-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="rounded-2xl border border-sky-200 bg-white p-4 shadow-2xs">
                  <PediatricDoseCalculator />
                </div>
              </motion.div>
            )}

            {/* DRUG MONOGRAPHS & INTERACTIONS SECTION (STEP 5) */}
            {clientScreenStep === 5 && (
              <motion.div
                key="client-screen-step-5"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="rounded-2xl border border-purple-200 bg-white p-4 shadow-2xs">
                  <DrugInteractionsAndMonographs />
                </div>
              </motion.div>
            )}

            {/* PHARMACY LOYALTY & REWARDS HUB (STEP 6) */}
            {clientScreenStep === 6 && (
              <motion.div
                key="client-screen-step-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="rounded-2xl border border-amber-200 bg-white p-4 shadow-2xs">
                  <PharmacyLoyaltyHub
                    clientName={user?.name || "الصيدلية"}
                    entityName={user?.entityName || "المنشأة الطبية"}
                    totalOrdersCount={orders.length}
                    onRedeemReward={(reward) => {
                      showSuccess(`تم طلب استبدال مكافأة: ${reward.title} بنجاح!`);
                    }}
                  />
                </div>
              </motion.div>
            )}

            {/* FLASH BONUS & STAGNANT STOCK COORDINATOR (STEP 7) */}
            {clientScreenStep === 7 && (
              <motion.div
                key="client-screen-step-7"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="rounded-2xl border border-rose-200 bg-white p-4 shadow-2xs">
                  <FlashBonusAndStockCoordinator
                    clientName={user?.name || "العميل"}
                    entityName={user?.entityName || "المنشأة الطبية"}
                    onApplyFlashOffer={(offer) => {
                      setClientScreenStep(2);
                      setActiveTab("sheet");
                      showSuccess(`تم تفعيل واختيار عرض البونص: ${offer.flashBonus}`);
                    }}
                  />
                </div>
              </motion.div>
            )}

            {/* MEDICAL LICENSING EXAM HUB SECTION (STEP 8: اختبر نفسك قبل الامتحان) */}
            {clientScreenStep === 8 && (
              <motion.div
                key="client-screen-step-8"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-2xs">
                  <MedicalExamHub userRole="client" />
                </div>
              </motion.div>
            )}

            {/* NET PRICE AFTER BONUS MODAL (نافذة حاسبة وعرض السعر بعد البونص) */}
            <AnimatePresence>
              {showBonusPriceModal && (
                <motion.div
                  key="bonus-price-modal-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs"
                >
                  <motion.div
                    key="bonus-price-modal-panel"
                    initial={{ scale: 0.95, y: 15 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 15 }}
                    className="w-full max-w-2xl rounded-2xl border border-amber-200 bg-white shadow-xl overflow-hidden text-right"
                  >
                    {/* Modal Header */}
                    <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 p-4 text-white flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-amber-200" />
                        <h3 className="font-black text-sm sm:text-base">
                          حاسبة تكلفة العلبة بعد احتساب نسبة البونص 🎁
                        </h3>
                      </div>
                      <button
                        onClick={() => {
                          setShowBonusPriceModal(false);
                          setSelectedBonusProduct(null);
                        }}
                        className="rounded-full bg-black/20 hover:bg-black/40 p-1 text-white transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
                      <p className="text-slate-600 font-medium text-2xs leading-relaxed bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
                        توضح هذه الحاسبة التكلفة الفعلية الصافية للعلبة بعد إدراج نسبة البونص المقدمة من المندوب الطبي د/ بلال القيسي:
                      </p>

                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                        {products.filter(p => p.bonus).length === 0 ? (
                          <div className="p-4 text-center text-slate-500">لا توجد منتجات عليها بونص حالياً في القائمة.</div>
                        ) : (
                          products.filter(p => p.bonus).map((prod, idx) => {
                            const calc = calculateNetPrice(prod.price, prod.bonus);
                            return (
                              <div key={`b-prod-${prod.id || 'p'}-${idx}`} className="p-3 bg-white hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="space-y-0.5">
                                  <h4 className="font-black text-slate-900 text-xs sm:text-sm">{prod.name}</h4>
                                  <span className="text-3xs text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full font-bold inline-block">
                                    🎁 البونص {formatBonusDisplay(prod.bonus)}
                                  </span>
                                </div>

                                <div className="flex items-center gap-4 text-left font-mono">
                                  <div>
                                    <span className="text-4xs text-slate-400 block">السعر الأساسي</span>
                                    <span className="line-through text-slate-400 text-2xs">{calc.originalFormatted}</span>
                                  </div>
                                  <div className="bg-emerald-50 border border-emerald-200 p-1.5 rounded-lg">
                                    <span className="text-4xs text-emerald-800 font-bold block">الصافي بعد البونص</span>
                                    <span className="text-emerald-900 font-black text-xs sm:text-sm">{calc.netFormatted}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 border-t border-slate-200 text-left">
                      <button
                        onClick={() => {
                          setShowBonusPriceModal(false);
                          setSelectedBonusProduct(null);
                        }}
                        className="rounded-xl bg-slate-900 text-white px-5 py-2 font-bold text-xs"
                      >
                        إغلاق الحاسبة
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

              {/* TAB 2: SENT ORDERS HISTORY */}
              {activeTab === "history" && (
                <motion.div
                  key="client-tab-history"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-3"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="text-sm font-bold text-slate-900">سجل طلبياتي المرسلة للمندوب</h3>
                    {orders.length > 0 && (
                      <button
                        onClick={handleExportOrdersCSV}
                        className="inline-flex items-center gap-2 rounded-xl bg-teal-50 border border-teal-200/80 text-teal-800 hover:bg-teal-100 px-3 py-1 text-2xs font-bold transition-all shadow-2xs"
                      >
                        <Download className="h-3.5 w-3.5 text-teal-600" />
                        <span>تصدير CSV / Excel</span>
                      </button>
                    )}
                  </div>
                  {orders.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                      <ShoppingCart className="mx-auto h-10 w-10 text-slate-300 mb-2" />
                      لم تقم بإنشاء أي طلبيات من قبل. يمكنك البدء بإدخال الكميات في جدول الإكسل وإرسالها.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {orders.map((order, orderIdx) => (
                        <div key={`c-hist-ord-${order.id || 'o'}-${orderIdx}`} className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-xs font-mono">رقم الطلب: {order.id}</span>
                              <span className="text-3xs text-slate-400">|</span>
                              <span className="text-2xs text-slate-500">{new Date(order.createdAt).toLocaleString("ar-YE")}</span>
                            </div>

                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-3xs font-bold border shadow-2xs ${
                              order.status === "pending" ? "bg-amber-100 text-amber-900 border-amber-300 ring-1 ring-amber-400/40" :
                              order.status === "approved" ? "bg-cyan-100 text-cyan-800 border-cyan-200/70" :
                              order.status === "completed" ? "bg-emerald-100 text-emerald-800 border-emerald-200/70" :
                              "bg-rose-100 text-rose-800 border-rose-200/70"
                            }`}>
                              {order.status === "pending" && <Hourglass className="h-3 w-3 text-amber-600 animate-pulse shrink-0" />}
                              {order.status === "approved" && <CheckCircle2 className="h-3 w-3 text-cyan-600 shrink-0" />}
                              {order.status === "completed" && <CheckCheck className="h-3 w-3 text-emerald-600 shrink-0" />}
                              {order.status === "cancelled" && <XCircle className="h-3 w-3 text-rose-600 shrink-0" />}
                              <span>
                                {order.status === "pending" ? "معلق (قيد المراجعة)" :
                                 order.status === "approved" ? "مقبول من المندوب" :
                                 order.status === "completed" ? "تم التسليم" : "ملغي"}
                              </span>
                            </span>
                          </div>

                          <div className="divide-y divide-slate-200/60 border-t border-slate-200/40 pt-1.5 text-xs">
                            {order.items.map((item, itemIdx) => (
                              <div key={`coi-${order.id || 'o'}-${orderIdx}-${item.productId || 'p'}-${itemIdx}`} className="flex items-center justify-between py-1">
                                <span className="font-bold text-slate-800">{item.productName}</span>
                                <span className="font-mono text-slate-600">الكمية: <span className="font-bold text-teal-600">{item.quantity}</span></span>
                              </div>
                            ))}
                          </div>

                          <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between flex-wrap gap-2">
                            <span className="text-3xs text-slate-500 font-medium">
                              إجمالي الأصناف: <strong className="text-slate-800">{order.items.length}</strong> • مجموع الكمية: <strong className="text-teal-700 font-mono">{order.items.reduce((s, i) => s + (Number(i.quantity) || 0), 0)}</strong>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenPrintInvoice(order)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-white hover:bg-teal-50 border border-slate-300 hover:border-teal-300 text-slate-800 hover:text-teal-900 px-3 py-1.5 text-xs font-bold transition shadow-2xs active:scale-95 cursor-pointer"
                              title="طباعة فاتورة رسمية لهذه الطلبية"
                              id={`btn-client-print-order-${order.id}`}
                            >
                              <Printer className="h-3.5 w-3.5 text-teal-600" />
                              <span>طباعة الفاتورة 🖨️</span>
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Export CSV Button at Bottom */}
                      <div className="pt-2 border-t border-slate-100 flex justify-end">
                        <button
                          onClick={handleExportOrdersCSV}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 px-3.5 py-2 text-2xs font-bold transition-all shadow-sm active:scale-[0.98]"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>تصدير سجل الطلبيات الحالية إلى ملف CSV (Excel) 📥</span>
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* TAB 3: INVENTORY REPORTS LOG */}
              {activeTab === "reports" && (
                <motion.div
                  key="client-tab-reports"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-3"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="text-sm font-bold text-slate-900">سجل عمليات جرد المخزون التي أبلغت عنها</h3>
                    {stockReports.length > 0 && (
                      <button
                        onClick={handleExportStockReportsCSV}
                        className="inline-flex items-center gap-2 rounded-xl bg-teal-50 border border-teal-200/80 text-teal-800 hover:bg-teal-100 px-3 py-1 text-2xs font-bold transition-all shadow-2xs"
                      >
                        <Download className="h-3.5 w-3.5 text-teal-600" />
                        <span>تصدير CSV / Excel</span>
                      </button>
                    )}
                  </div>
                  {stockReports.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                      <FileSpreadsheet className="mx-auto h-10 w-10 text-slate-300 mb-2" />
                      لا توجد عمليات جرد سابقة محفوظة في حساب منشأتك.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-right text-xs">
                          <thead>
                            <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                              <th className="p-2.5">الصنف الدوائي</th>
                              <th className="p-2.5 text-center">الكمية المتبقية</th>
                              <th className="p-2.5 text-left">تاريخ الإبلاغ للجرد</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {stockReports.map((report, idx) => (
                              <tr key={`st-rep-${report.id || 'sr'}-${idx}`} className="hover:bg-slate-50">
                                <td className="p-2.5 font-bold text-slate-900">{report.productName}</td>
                                <td className="p-2.5 text-center font-mono font-bold text-teal-700 bg-teal-50/40 rounded">{report.remainingQty}</td>
                                <td className="p-2.5 text-left text-slate-400 font-mono">
                                  {new Date(report.reportedAt).toLocaleString("ar-YE")}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Export CSV Button at Bottom */}
                      <div className="pt-2 border-t border-slate-100 flex justify-end">
                        <button
                          onClick={handleExportStockReportsCSV}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 px-3.5 py-2 text-2xs font-bold transition-all shadow-sm active:scale-[0.98]"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>تصدير سجل جرد المخزون إلى ملف CSV (Excel) 📥</span>
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* TAB 4: CLIENT VISITS LOG & AGREEMENTS */}
              {activeTab === "visits" && (
                <motion.div
                  key="client-tab-visits"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-teal-600" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">سجل زيارات المندوب والاتفاقات المتبادلة</h3>
                      <p className="text-3xs text-slate-500">يعرض هذا السجل التواريخ والتفاهمات التي تم التوصل إليها خلال زيارة المندوب لمنشأتك</p>
                    </div>
                  </div>

                  {visits.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                      <ClipboardList className="mx-auto h-10 w-10 text-slate-300 mb-2" />
                      لا توجد تقارير زيارة مسجلة لمنشأتك حالياً من قبل المندوب.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {visits.map((visit, visitIdx) => (
                        <div key={`vst-${visit.id || 'v'}-${visitIdx}`} className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-xs font-mono">تاريخ الزيارة: {visit.visitDate}</span>
                              <span className="text-3xs text-slate-300">|</span>
                              <span className="text-2xs text-slate-500">الزائر: المندوب الطبي ({visit.clientName})</span>
                            </div>
                            <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-4xs font-bold text-teal-800">
                              <Sparkles className="h-3 w-3" />
                              ملخص ذكي
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <span className="text-3xs font-bold text-slate-400 block mb-1">ملخص مخرجات الزيارة:</span>
                              <p className="text-xs text-slate-800 leading-relaxed bg-white p-3 rounded-lg border border-slate-100 font-medium whitespace-pre-line">
                                {visit.summary || visit.notes || "لا يوجد ملخص مكتوب."}
                              </p>
                            </div>

                            <div className="space-y-1.5">
                              <span className="text-3xs font-bold text-slate-400 block mb-1">قائمة متابعة الالتزامات والمهام:</span>
                              {!visit.tasks || visit.tasks.length === 0 ? (
                                <div className="text-xs text-slate-400 italic">لا توجد مهام متابعة معينة لهذه الزيارة.</div>
                              ) : (
                                <div className="space-y-1.5">
                                  {visit.tasks.map((task, taskIdx) => (
                                    <div
                                      key={`vtask-${visit.id || 'v'}-${visitIdx}-${task.id || 't'}-${taskIdx}`}
                                      onClick={() => handleToggleTask(visit.id, task.id)}
                                      className="flex items-start gap-2 p-1.5 bg-white rounded-lg border border-slate-100 hover:bg-slate-50 transition-all cursor-pointer"
                                    >
                                      <button
                                        type="button"
                                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors mt-0.5 ${
                                          task.completed ? "border-teal-500 bg-teal-500 text-white" : "border-slate-300 bg-white"
                                        }`}
                                      >
                                        {task.completed && <Check className="h-3 w-3 stroke-[3]" />}
                                      </button>
                                      <span className={`text-xs font-semibold transition-all ${
                                        task.completed ? "text-slate-400 line-through" : "text-slate-700"
                                      }`}>
                                        {task.taskText}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* TAB 4.5: CLIENT GOOGLE MAPS COVERAGE */}
              {activeTab === "maps" && (
                <motion.div
                  key="client-tab-maps"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-4"
                >
                  <GoogleMapView
                    clients={uniqueClients}
                    visits={visits}
                  />
                </motion.div>
              )}

              {/* TAB 5: CLIENT ANNOUNCEMENTS & NOTIFICATIONS FEED */}
              {activeTab === "notifications" && (
                <motion.div
                  key="client-tab-notifications"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-3"
                >
                  {renderDeviceNotificationBanner()}

                  <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-amber-500" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">مركز الإشعارات والتعاميم المستلمة</h3>
                      <p className="text-3xs text-slate-500">تابع آخر التنبيهات والعروض من المندوب الطبي</p>
                    </div>
                  </div>

                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                      <Bell className="mx-auto h-10 w-10 text-slate-300 mb-2" />
                      لا توجد إشعارات أو تعاميم موجهة لمنشأتك حالياً.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {notifications.map((notif, idx) => (
                        <div key={`cnotif-${notif.id || 'n'}-${idx}`} className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className={`rounded-full px-2.5 py-0.5 text-3xs font-bold ${
                              notif.type === "broadcast" ? "bg-amber-100 text-amber-800" : "bg-teal-100 text-teal-800"
                            }`}>
                              {notif.type === "broadcast" ? "📣 تعميم عام" : "🎯 تنبيه خاص"}
                            </span>
                            <span className="text-3xs text-slate-400 font-mono">
                              {new Date(notif.createdAt).toLocaleString("ar-YE")}
                            </span>
                          </div>

                          <h4 className="font-bold text-slate-950 text-xs sm:text-sm">{notif.title}</h4>
                          <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{notif.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === "scientific" && (
                <motion.div
                  key="client-tab-scientific"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="flex-1 flex flex-col min-h-0 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden"
                >
                  {renderScientificSearchTool()}
                </motion.div>
              )}

              {activeTab === "agreements" && (
                <motion.div
                  key="client-tab-agreements"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-4"
                >
                  <AgreementsManager
                    agreements={agreements}
                    clients={registeredUsers}
                    currentUser={user}
                    onSaveAgreement={handleSaveAgreement}
                    onDeleteAgreement={handleDeleteAgreement}
                    isAdmin={false}
                  />
                </motion.div>
              )}

              {activeTab === "games" && (
                <motion.div
                  key="client-tab-games"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="flex-1 flex flex-col min-h-0 overflow-y-auto"
                >
                  <PharmaGames repAvatar={"/app-logo.png"} />
                </motion.div>
              )}

              {activeTab === "complaints" && (
                <motion.div
                  key="client-tab-complaints"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-4"
                >
                  <ComplaintsManager
                    complaints={complaints}
                    currentUser={user}
                    onSaveComplaint={handleSaveComplaint}
                    onDeleteComplaint={handleDeleteComplaint}
                    isAdmin={false}
                  />
                </motion.div>
              )}

              {activeTab === "exams" && (
                <motion.div
                  key="client-tab-exams"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-4"
                >
                  <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-2xs">
                    <MedicalExamHub userRole="client" />
                  </div>
                </motion.div>
              )}


            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Compact Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-2.5 text-center text-3xs text-slate-400 shrink-0">
        <p>© {new Date().getFullYear()} تطبيق مندوبك الطبي (د/ بلال القيسي). جميع الحقوق محفوظة.</p>
      </footer>
    </div>
  </div>
)}

      {/* Edit Client Modal */}
      {editingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Edit className="h-5 w-5 text-indigo-600" />
                تعديل بيانات العميل
              </h3>
              <button
                onClick={() => setEditingClient(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateClient} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">اسم المنشأة الطبية *</label>
                <input
                  type="text"
                  value={editingClient.entityName}
                  onChange={(e) => setEditingClient({ ...editingClient, entityName: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-right font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">اسم المسؤول *</label>
                <input
                  type="text"
                  value={editingClient.name}
                  onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-right font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">رقم الهاتف *</label>
                <input
                  type="text"
                  value={editingClient.phone}
                  onChange={(e) => setEditingClient({ ...editingClient, phone: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-right font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">نوع المنشأة</label>
                <select
                  value={editingClient.role}
                  onChange={(e) => setEditingClient({ ...editingClient, role: e.target.value as any })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-right font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="pharmacy">صيدلية</option>
                  <option value="doctor">عيادة / طبيب</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">العنوان والموقع</label>
                <input
                  type="text"
                  value={editingClient.location}
                  onChange={(e) => setEditingClient({ ...editingClient, location: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-right font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingClient(null)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20"
                >
                  {loading ? "جاري الحفظ..." : "حفظ التعديلات"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Registration Success & WhatsApp Modal */}
      {regSuccessModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div>
              <h3 className="text-lg font-extrabold text-slate-900">تم تسجيل منشأتك بنجاح! 🎉</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                مرحباً بك في تطبيق المندوب الطبي. تم حفظ بيانات منشأتك بنجاح في قاعدة البيانات.
              </p>
            </div>

            {regSuccessModal.user && (
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3.5 text-right text-xs space-y-1">
                <p className="text-slate-700 font-bold">🏥 المنشأة: <span className="text-slate-900">{regSuccessModal.user.entityName || "غير محدد"}</span></p>
                <p className="text-slate-700">👨‍⚕️ المسؤول: <span className="text-slate-900 font-medium">{regSuccessModal.user.name}</span></p>
                <p className="text-slate-700 font-mono">📱 رقم الهاتف: <span className="text-slate-900">{regSuccessModal.user.phone}</span></p>
              </div>
            )}

            <div className="rounded-xl bg-amber-50 border border-amber-200/80 p-3 text-amber-900 text-2xs text-right space-y-1">
              <p className="font-bold flex items-center gap-1 text-amber-800">
                <AlertCircle className="h-4 w-4 shrink-0" />
                تنويه لتأكيد الحساب:
              </p>
              <p>
                يرجى الضغط على الزر الأخضر أدناه لإرسال رسالة التأكيد المجهزة تلقائياً عبر الواتساب إلى المندوب الطبي د/ بلال القيسي (776600049) لاعتماد الحساب فوراً.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              {regSuccessModal.waUrl && (
                <a
                  href={regSuccessModal.waUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setRegSuccessModal({ isOpen: false })}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20"
                >
                  💬 إرسال تأكيد الحساب عبر الواتساب الآن
                </a>
              )}
              <button
                type="button"
                onClick={() => setRegSuccessModal({ isOpen: false })}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                متابعة التصفح واستخدام التطبيق
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Floating Gemini AI Assistant Button */}
      {user && (
        <button
          onClick={() => setIsGeminiChatModalOpen(true)}
          className="fixed bottom-20 lg:bottom-6 left-5 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-800 px-4 py-3 text-xs font-bold text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all border border-teal-500/40"
          id="btn-gemini-chat-fab"
        >
          <Sparkles className="h-5 w-5 text-teal-200 animate-pulse" />
          <span className="hidden sm:inline">المساعد الطبي (Gemini AI)</span>
        </button>
      )}

      {/* Gemini AI Multi-Turn Chatbot Modal */}
      <GeminiChatModal
        isOpen={isGeminiChatModalOpen}
        onClose={() => setIsGeminiChatModalOpen(false)}
        userRole={user?.role}
        userName={user?.name}
      />

      {/* Gemini AI Image & Veo Video Creative Studio Modal */}
      <AiCreativeStudioModal
        isOpen={isCreativeStudioOpen}
        onClose={() => setIsCreativeStudioOpen(false)}
        repName="د/ بلال القيسي"
        repPhone="776600049"
      />

      {/* App QR Code & Share Modal */}
      <QRCodeModal
        isOpen={isAppQrModalOpen}
        onClose={() => setIsAppQrModalOpen(false)}
        title="تطبيق مندوبك الطبي"
        subtitle="الرابط الرسمي والوحيد المعتمد للتطبيق"
        codeValue={OFFICIAL_APP_URL}
        type="general"
        details={{
          label1: "الرابط الرسمي المعتمد",
          value1: OFFICIAL_APP_URL,
          label2: "المندوب المعتمد",
          value2: "د/ بلال القيسي (776600049)"
        }}
      />

      {/* Device Contacts Native Import Modal */}
      <DeviceContactsModal
        isOpen={isDeviceContactsModalOpen}
        onClose={() => setIsDeviceContactsModalOpen(false)}
        onImportBatch={handleImportDeviceContactsBatch}
        onSelectSingle={handleSelectSingleContactForForm}
        existingPhones={new Set(registeredUsers.map(u => u.phone))}
      />

      {/* Hardware & Battery Device Info Modal */}
      <DeviceInfoModal
        isOpen={isDeviceInfoModalOpen}
        onClose={() => setIsDeviceInfoModalOpen(false)}
        deviceInfo={deviceInfo}
        onRefresh={async () => {
          const info = await getNativeDeviceInfo();
          setDeviceInfo(info);
        }}
      />

      {/* Biometric App Lock Screen Overlay */}
      <BiometricLockScreen
        isLocked={isAppLocked}
        user={user || null}
        onUnlock={() => {
          setIsAppLocked(false);
          showSuccess("تم فتح التطبيق والتحقق بنجاح 🔓✓");
        }}
        onLogout={handleLogout}
      />

      {/* Offline Sync Center & IndexedDB Inspection Modal */}
      <OfflineSyncCenterModal
        isOpen={isOfflineSyncModalOpen}
        onClose={() => setIsOfflineSyncModalOpen(false)}
        onSyncComplete={() => {
          fetchUserSpecificData(true, false);
          getPendingSyncCounts().then((c) => setPendingSyncCount(c.total)).catch(() => {});
        }}
      />

      {/* Official Order Invoice Print Modal */}
      <PrintOrderModal
        isOpen={isPrintModalOpen}
        order={orderToPrint}
        onClose={() => {
          setIsPrintModalOpen(false);
          setOrderToPrint(null);
        }}
        repName="د. بلال القيسي"
        repPhone="776600049"
      />

      {/* Custom Confirmation Modal (Safe in iframes & mobile webviews) */}
      <PromoVideoModal
        isOpen={isPromoVideoOpen}
        onClose={() => setIsPromoVideoOpen(false)}
        repName="د/ بلال القيسي"
        repPhone="+967776600049"
        repAvatar={"/app-logo.png"}
        products={products.length > 0 ? products : DEFAULT_PRODUCTS}
        onOpenGames={() => {
          setActiveTab("games");
        }}
        onOpenSheet={() => {
          setActiveTab("sheet");
        }}
      />

      <AnimatePresence>
        {confirmDialog.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 text-right space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${confirmDialog.isDestructive ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                  {confirmDialog.isDestructive ? <Trash2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">{confirmDialog.title}</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">يرجى تأكيد الإجراء للمتابعة</p>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 text-xs text-slate-700 leading-relaxed font-medium">
                {confirmDialog.message}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  {confirmDialog.cancelLabel || "تراجع وإلغاء"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const cb = confirmDialog.onConfirm;
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    if (cb) cb();
                  }}
                  className={`rounded-xl px-5 py-2.5 text-xs font-black text-white shadow-md transition-all cursor-pointer ${
                    confirmDialog.isDestructive
                      ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20 active:scale-95"
                      : "bg-teal-600 hover:bg-teal-700 shadow-teal-600/20 active:scale-95"
                  }`}
                >
                  {confirmDialog.confirmLabel || "تأكيد الإجراء"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Full Official Profile Photo & Identity Modal for Dr. Belal Alqaisi */}
      <AnimatePresence>
        {isDrProfileModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs"
            onClick={() => setIsDrProfileModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-sm w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-teal-500/30 text-center"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsDrProfileModalOpen(false)}
                className="absolute top-3 left-3 z-10 h-8 w-8 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white flex items-center justify-center transition-colors shadow-md cursor-pointer"
                title="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Full HD Official Image */}
              <div className="relative bg-gradient-to-b from-slate-950 via-slate-900 to-teal-950 p-4 flex flex-col items-center justify-center overflow-hidden">
                <img
                  src={"/app-logo.png"}
                  alt="د/ بلال القيسي - مندوبك الطبي"
                  className="w-full max-h-[420px] object-contain rounded-2xl shadow-2xl border border-teal-500/30"
                  referrerPolicy="no-referrer"
                />

                  {isBelalAdmin ? (
                    <div className="mt-3 flex flex-col items-center gap-2 w-full">
                      <div className="flex items-center gap-2 w-full">
                        <label
                          htmlFor="dr-belal-avatar-file-modal"
                          className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md border border-teal-400/40 active:scale-95"
                          title="رفع وتعيين صورتك الحقيقية"
                        >
                          <Upload className="h-4 w-4" />
                          <span>📸 رفع وتعيين صورتي الحقيقية (د/ بلال)</span>
                        </label>
                        <input
                          type="file"
                          id="dr-belal-avatar-file-modal"
                          accept="image/*"
                          onChange={handleUploadCustomAvatar}
                          className="hidden"
                        />
                        {drProfileAvatar !== drBelalProfileImg && (
                          <button
                            type="button"
                            onClick={handleResetCustomAvatar}
                            className="py-2.5 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/40 text-rose-200 text-xs font-bold transition-all border border-rose-400/30 cursor-pointer"
                            title="استعادة الصورة الافتراضية"
                          >
                            استعادة
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-teal-900/60 border border-teal-500/30 text-teal-200 text-3xs font-bold w-full text-center">
                      <ShieldCheck className="h-4 w-4 text-amber-300" />
                      <span>الصورة الرسمية المعتمدة والموحدة لكافة الصيدليات والأطباء</span>
                    </div>
                  )}
              </div>

              {/* Identity & Credentials Card */}
              <div className="p-4 sm:p-5 bg-gradient-to-b from-white to-teal-50/60 space-y-3">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-100 text-teal-900 font-bold text-xs mb-1.5 border border-teal-200">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>المندوب الطبي المعتمد والمسؤول</span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900">
                    د/ بلال القيسي
                  </h3>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">
                    تطبيق مندوبك الطبي | إدارة التوزيع الدوائي والمبيعات
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-200">
                  <a
                    href="tel:967776600049"
                    className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-slate-200"
                  >
                    <PhoneCall className="h-4 w-4 text-teal-700" />
                    <span className="font-mono font-bold" dir="ltr">776600049</span>
                  </a>
                  <a
                    href="https://wa.me/967776600049"
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>محادثة واتساب</span>
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* User Profile & Account Settings Modal (Firebase Storage Connected) */}
      <UserProfileModal
        isOpen={isUserProfileModalOpen}
        onClose={() => setIsUserProfileModalOpen(false)}
        currentUser={user}
        googleUser={googleUser}
        onUserUpdated={(updatedUser) => {
          setUser(updatedUser);
          setRegisteredUsers((prev) =>
            prev.map((u) => (u.id === updatedUser.id ? updatedUser : u))
          );
        }}
        isBelalAdmin={isBelalAdmin}
      />

      {/* Product Categories Manager Modal */}
      <CategoryManagerModal
        isOpen={isCategoryManagerOpen}
        onClose={() => setIsCategoryManagerOpen(false)}
        categories={availableCategories}
        categoryColors={categoryColors}
        onAddCategory={handleAddCategory}
        onRenameCategory={handleRenameCategory}
        onDeleteCategory={handleDeleteCategory}
        onUpdateCategoryColor={handleUpdateCategoryColor}
        onResetToDefaults={handleResetCategoriesToDefault}
        products={products}
        onReorderCategories={handleReorderCategories}
        onSelectCategory={(catName) => {
          setNewProductForm((prev) => ({ ...prev, category: catName }));
        }}
      />

      {/* Firebase Remote Config A/B Testing Onboarding Modal */}
      <OnboardingFlowModal
        isOpen={isOnboardingOpen}
        onClose={() => {
          setIsOnboardingOpen(false);
          try {
            localStorage.setItem("mandoubak_onboarding_completed", "true");
          } catch (e) {}
        }}
        flowType={remoteConfigFlow}
        onVariantChange={(newVariant) => {
          setRemoteConfigFlow(newVariant);
        }}
      />

      {/* QR Code & Barcode Camera Scanner Modal for Pharmacists */}
      <QRScannerModal
        isOpen={isQRScannerModalOpen}
        onClose={() => setIsQRScannerModalOpen(false)}
        products={products}
        onProductScanned={(scannedProduct, quantityToAdd = 1) => {
          const currentQty = Number(orderInputs[scannedProduct.id] || 0);
          const newQty = currentQty + quantityToAdd;
          const updatedOrder = {
            ...orderInputs,
            [scannedProduct.id]: String(newQty),
          };
          setOrderInputs(updatedOrder);
          try {
            localStorage.setItem("mandoubak_draft_order", JSON.stringify(updatedOrder));
          } catch (e) {}
          showSuccess(`تمت إضافة ${quantityToAdd} ${scannedProduct.unit || "علبة"} من (${scannedProduct.name}) إلى الطلبية بنجاح! 🛒`);
        }}
      />

      {/* Settings Modal (App Preferences, Sounds, Rules, APK) */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        currentUser={user}
        isBelalAdmin={isBelalAdmin}
        isBiometricEnabled={isBiometricEnabled}
        onToggleBiometric={(enabled) => {
          setIsBiometricEnabled(enabled);
          try {
            localStorage.setItem("mandoubak_biometric_lock", enabled ? "true" : "false");
          } catch (e) {}
          showSuccess(enabled ? "تم تفعيل القفل بالبصمة بنجاح 🔒" : "تم تعطيل القفل بالبصمة 🔓");
        }}
        onOpenApkModal={() => setIsDownloadApkModalOpen(true)}
      />

      {/* Download APK Modal for Android Users */}
      <DownloadApkModal
        isOpen={isDownloadApkModalOpen}
        onClose={() => setIsDownloadApkModalOpen(false)}
      />

      {/* Audio Transcriber Modal (Powered by gemini-3.5-transcribe) */}
      <AudioTranscriberModal
        isOpen={isAudioTranscriberOpen}
        onClose={() => setIsAudioTranscriberOpen(false)}
        onApplyTranscription={(transcription) => {
          setSearchTerm(transcription);
          showSuccess("تم نقل وتطبيق النص الصوتي بنجاح! 🎙️");
        }}
      />

      {/* Compact Footer */}
      <footer className="border-t border-slate-200 bg-white py-3 px-4 text-center text-3xs text-slate-500 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto w-full">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
          <p>© {new Date().getFullYear()} تطبيق مندوبك الطبي | تطوير وإشراف: <span className="font-bold text-teal-700">د. بلال القيسي (Dr. Belal Alqaisi)</span>. جميع الحقوق محفوظة 2026–2051.</p>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-4xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-2.5 w-2.5" />
            شهادة أمان موثقة (25 عاماً)
          </span>
        </div>
        <a
          href={OFFICIAL_APP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono font-bold text-teal-700 hover:text-teal-800 hover:underline flex items-center gap-1 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200/80 transition-colors dir-ltr"
          title="الرابط الرسمي المعتمد للتطبيق"
        >
          <Globe className="h-3 w-3 text-teal-600" />
          <span>{OFFICIAL_APP_URL}</span>
        </a>
      </footer>
    </div>
  );
}
