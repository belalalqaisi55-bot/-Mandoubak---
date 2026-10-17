import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, X, RefreshCw, AlertCircle, CheckCircle2, Volume2, Sparkles, Plus, Search } from "lucide-react";
import { Product } from "../types";

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onProductScanned: (product: Product, quantityToAdd?: number) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  products,
  onProductScanned,
}) => {
  const [scannerStarted, setScannerStarted] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastScannedResult, setLastScannedResult] = useState<string | null>(null);
  const [matchedProduct, setMatchedProduct] = useState<Product | null>(null);
  const [addQuantity, setAddQuantity] = useState<number>(1);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [availableCameras, setAvailableCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = "html5-qrcode-sheet-scanner";

  // Audio feedback on successful scan
  const playScanBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 tone
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch {
      // AudioContext unavailable or blocked by user gesture
    }
  };

  // Find product by barcode, qrCode, id, or normalized name
  const findProductMatch = (decodedText: string): Product | null => {
    const clean = decodedText.trim().toLowerCase();

    // 1. Direct match with product.barcode or product.qrCode
    const directCodeMatch = products.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === clean) ||
        (p.qrCode && p.qrCode.toLowerCase() === clean)
    );
    if (directCodeMatch) return directCodeMatch;

    // 2. Direct match with product id (e.g. "p1", "p2", etc.)
    const idMatch = products.find((p) => p.id.toLowerCase() === clean);
    if (idMatch) return idMatch;

    // 3. Match JSON payload if QR contains encoded object { id: "...", name: "..." }
    try {
      const parsed = JSON.parse(decodedText);
      if (parsed && typeof parsed === "object") {
        if (parsed.id) {
          const m = products.find((p) => p.id === parsed.id);
          if (m) return m;
        }
        if (parsed.barcode) {
          const m = products.find((p) => p.barcode === parsed.barcode);
          if (m) return m;
        }
        if (parsed.name) {
          const m = products.find((p) => p.name.toLowerCase().includes(parsed.name.toLowerCase()));
          if (m) return m;
        }
      }
    } catch {
      // Not JSON
    }

    // 4. Fuzzy text match within product name or scientific description
    const textMatch = products.find(
      (p) =>
        p.name.toLowerCase().includes(clean) ||
        clean.includes(p.name.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(clean))
    );
    if (textMatch) return textMatch;

    return null;
  };

  // Initialize camera and start scanning
  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    let isMounted = true;

    const startScanner = async () => {
      setCameraError(null);
      setLastScannedResult(null);
      setMatchedProduct(null);

      // Wait a tick for DOM element to mount
      await new Promise((r) => setTimeout(r, 150));

      const container = document.getElementById(readerElementId);
      if (!container || !isMounted) return;

      try {
        // Enumerate video devices
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setAvailableCameras(devices);
          if (!selectedCameraId) {
            // Pick back camera if possible
            const backCamera = devices.find(
              (d) =>
                d.label.toLowerCase().includes("back") ||
                d.label.toLowerCase().includes("rear") ||
                d.label.toLowerCase().includes("environment")
            );
            setSelectedCameraId(backCamera ? backCamera.id : devices[0].id);
          }
        }

        const scanner = new Html5Qrcode(readerElementId);
        scannerRef.current = scanner;

        const cameraConfig = selectedCameraId
          ? { deviceId: { exact: selectedCameraId } }
          : { facingMode: facingMode };

        await scanner.start(
          cameraConfig,
          {
            fps: 15,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            handleCodeScanned(decodedText);
          },
          () => {
            // Ignore scan parse failure ticks
          }
        );

        if (isMounted) {
          setScannerStarted(true);
        }
      } catch (err: any) {
        console.error("Camera scan start error:", err);
        if (isMounted) {
          setCameraError(
            err?.message ||
              "تعذر الوصول إلى الكاميرا. يرجى التأكد من منح الإذن لاستخدام الكاميرا في المتصفح أو التطبيق."
          );
          setScannerStarted(false);
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [isOpen, facingMode, selectedCameraId]);

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.debug("Stop scanner warning:", err);
      }
    }
    scannerRef.current = null;
    setScannerStarted(false);
  };

  const handleCodeScanned = (decodedText: string) => {
    setLastScannedResult(decodedText);
    playScanBeep();

    const product = findProductMatch(decodedText);
    if (product) {
      setMatchedProduct(product);
    } else {
      setMatchedProduct(null);
    }
  };

  const handleConfirmAdd = () => {
    if (matchedProduct) {
      onProductScanned(matchedProduct, addQuantity);
      // Reset match to allow scanning next item immediately
      setMatchedProduct(null);
      setLastScannedResult(null);
      setAddQuantity(1);
    }
  };

  const toggleFacingMode = async () => {
    await stopScanner();
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200" dir="rtl">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm shadow-teal-500/30">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                ماسح الباركود و QR للأصناف
              </h3>
              <p className="text-3xs text-slate-500 font-medium">
                وجّه الكاميرا نحو ملصق الدواء أو رمز QR لإضافته للطلبية
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-600 transition-colors"
            title="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Camera Scanner Viewport */}
        <div className="relative flex-1 bg-black flex flex-col items-center justify-center overflow-hidden min-h-[300px]">
          <div
            id={readerElementId}
            className="w-full h-full min-h-[280px] [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
          />

          {/* Scanner Overlay Guide Target */}
          {scannerStarted && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="w-56 h-56 border-2 border-teal-400/80 rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                {/* Corner accent lines */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-teal-400 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-teal-400 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-teal-400 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-teal-400 rounded-br-lg" />
                {/* Center scan line animation */}
                <div className="absolute left-2 right-2 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-teal-400 to-transparent animate-pulse" />
              </div>
            </div>
          )}

          {/* Camera Controls Floating Bar */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-auto">
            {availableCameras.length > 1 ? (
              <select
                value={selectedCameraId}
                onChange={async (e) => {
                  setSelectedCameraId(e.target.value);
                  await stopScanner();
                }}
                className="rounded-lg bg-slate-900/80 text-white text-3xs px-2.5 py-1.5 border border-white/20 backdrop-blur-sm focus:outline-none"
              >
                {availableCameras.map((cam) => (
                  <option key={cam.id} value={cam.id}>
                    {cam.label || `كاميرا ${cam.id.slice(0, 5)}`}
                  </option>
                ))}
              </select>
            ) : (
              <button
                type="button"
                onClick={toggleFacingMode}
                className="rounded-lg bg-slate-900/80 text-white text-3xs px-3 py-1.5 border border-white/20 backdrop-blur-sm flex items-center gap-1.5 hover:bg-slate-800"
              >
                <RefreshCw className="h-3 w-3" />
                <span>تبديل الكاميرا</span>
              </button>
            )}

            <div className="px-2.5 py-1 rounded-full bg-slate-900/80 text-teal-400 text-4xs font-bold border border-white/10 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-teal-400 animate-ping" />
              <span>جاري المسح المباشر</span>
            </div>
          </div>

          {/* Error Display */}
          {cameraError && (
            <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 p-4 rounded-2xl bg-rose-950/90 border border-rose-500/50 text-white text-center space-y-2.5 backdrop-blur-md">
              <AlertCircle className="h-8 w-8 text-rose-400 mx-auto" />
              <p className="text-xs font-bold">{cameraError}</p>
              <button
                type="button"
                onClick={() => {
                  setCameraError(null);
                  setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
                }}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 rounded-xl text-xs font-bold shadow-md transition-colors"
              >
                إعادة المحاولة
              </button>
            </div>
          )}
        </div>

        {/* Scan Results & Quick-Add Drawer */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-3">
          {matchedProduct ? (
            <div className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 space-y-2.5 animate-in slide-in-from-bottom-2 duration-150">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <span className="inline-flex items-center gap-1 text-4xs font-black text-teal-800 dark:text-teal-300 bg-teal-100 dark:bg-teal-900/60 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="h-3 w-3 text-teal-600 dark:text-teal-400" />
                    تم التعرف على الصنف بنجاح
                  </span>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white leading-snug">
                    {matchedProduct.name}
                  </h4>
                  <p className="text-3xs text-slate-500 dark:text-slate-400">
                    {matchedProduct.description || matchedProduct.category}
                  </p>
                </div>
                <div className="text-left shrink-0">
                  <span className="text-xs font-black text-teal-700 dark:text-teal-400 block font-mono">
                    {matchedProduct.price}
                  </span>
                  {matchedProduct.bonus && (
                    <span className="text-4xs font-bold text-amber-700 bg-amber-100 dark:bg-amber-950/70 px-1.5 py-0.2 rounded-full">
                      بونص {matchedProduct.bonus}
                    </span>
                  )}
                </div>
              </div>

              {/* Quantity Picker & Add Button */}
              <div className="flex items-center gap-2 pt-1 border-t border-teal-200/60 dark:border-teal-800/60">
                <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-1">
                  <button
                    type="button"
                    onClick={() => setAddQuantity(Math.max(1, addQuantity - 1))}
                    className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-black text-sm flex items-center justify-center hover:bg-slate-200"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={addQuantity}
                    onChange={(e) => setAddQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-10 text-center font-bold text-xs bg-transparent focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setAddQuantity(addQuantity + 1)}
                    className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-black text-sm flex items-center justify-center hover:bg-slate-200"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleConfirmAdd}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-xs shadow-md shadow-teal-500/20 flex items-center justify-center gap-1.5 transition-all"
                >
                  <Plus className="h-4 w-4" />
                  <span>إضافة للطلبية ({addQuantity} {matchedProduct.unit || "علبة"})</span>
                </button>
              </div>
            </div>
          ) : lastScannedResult ? (
            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-right space-y-2">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 text-xs font-bold">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>تم قراءة الرمز:</span>
                <code className="text-3xs font-mono bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-amber-300">
                  {lastScannedResult.length > 30 ? `${lastScannedResult.slice(0, 30)}...` : lastScannedResult}
                </code>
              </div>
              <p className="text-3xs text-slate-600 dark:text-slate-400">
                لم يتم العثور على صنف مطابق لهذا الرمز في الكتالوج الحالي. يمكنك إسناد الباركود لأحد الأصناف أو البحث يدوياً.
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-slate-500 text-3xs font-medium">
              <span>قم بتوجيه الكاميرا نحو باركود الصنف للتعرف الفوري</span>
              <span className="font-mono font-bold text-teal-600">{products.length} صنف مسجل</span>
            </div>
          )}

          {/* Bottom Fast Action Buttons */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                stopScanner();
                onClose();
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              إلغاء وإغلاق
            </button>

            <span className="text-4xs text-slate-400">
              يدعم EAN-13, QR Code, UPC, Code 128
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
