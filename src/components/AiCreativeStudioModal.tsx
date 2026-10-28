import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Image as ImageIcon,
  Video,
  Wand2,
  Download,
  Share2,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sliders,
  Layers,
  Play,
  Film,
  Camera,
  MessageCircle,
  FileImage,
  Flame,
  Pill,
  Send
} from "lucide-react";

interface AiCreativeStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  repName?: string;
  repPhone?: string;
}

export const AiCreativeStudioModal: React.FC<AiCreativeStudioModalProps> = ({
  isOpen,
  onClose,
  repName = "د/ بلال القيسي",
  repPhone = "776600049"
}) => {
  const [activeTab, setActiveTab] = useState<"image" | "video" | "edit">("image");

  // Image Generation State
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "16:9" | "9:16" | "4:3">("1:1");
  const [imageSize, setImageSize] = useState<"1K" | "2K" | "4K">("1K");
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  // Image Edit State
  const [editPrompt, setEditPrompt] = useState("");
  const [editingImage, setEditingImage] = useState(false);
  const [sourceImageForEdit, setSourceImageForEdit] = useState<string | null>(null);

  // Video Generation State (Veo)
  const [videoPrompt, setVideoPrompt] = useState("");
  const [videoAspectRatio, setVideoAspectRatio] = useState<"16:9" | "9:16">("16:9");
  const [videoResolution, setVideoResolution] = useState<"720p" | "1080p">("720p");
  const [sourceImageForVideo, setSourceImageForVideo] = useState<string | null>(null);
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [videoProgressMsg, setVideoProgressMsg] = useState("");
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoImageInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Preset Prompts for Dr. Belal's catalog
  const PRESET_PROMPTS = [
    {
      title: "كبسولات لوماك 20 (LOMAC)",
      desc: "تصميم فاخر لعلاج قرحة المعدة والحموضة مع خلفية صيدلانية نقية وعرض بونص خاص",
      prompt: "Luxury pharmaceutical promotional poster for LOMAC 20mg Omeprazole gastro-resistant capsules, crisp white and medical blue background with stomach protection shield illustration, modern clean pharmacy aesthetic, high resolution lighting."
    },
    {
      title: "قطرات ومحلول سيبلوكس (CIPLOX)",
      desc: "بوستر دعائي مضاد للبكتيريا لمستحضر سيبلوكس للعيون والأذن",
      prompt: "Professional clean medical advertisement for CIPLOX Ciprofloxacin ophthalmic and otic drops, pristine crystal-clear drops with soothing blue and teal medical lighting, highly detailed pharmaceutical packaging."
    },
    {
      title: "حقن نوفاتاكس 1 جم (NOVATAX)",
      desc: "بوستر دعائي قوي لمضاد حيوي واسع المجال في أجواء مستشفى احترافية",
      prompt: "Modern clinical advertisement banner for NOVATAX Cefotaxime 1g injectable vial, hospital ICU sterile environment, subtle golden and blue light beams highlighting supreme quality and efficacy."
    },
    {
      title: "شراب وأقراص ألريد (ALLERID)",
      desc: "بانر ربيعي منعش لعلاج الحساسية والرشح لجميع أفراد الأسرة",
      prompt: "Fresh spring allergy relief promotional graphic for ALLERID Cetirizine, clean pollen-free fresh air concept, soft green and bright blue aesthetic, clear family wellness feel."
    },
    {
      title: "كبسولات فوركان 150 (FORCAN)",
      desc: "بوستر طبي مميز لمضاد الفطريات الفعال فوركان",
      prompt: "High-end pharmaceutical product showcase for FORCAN Fluconazole 150mg single dose antifungal, deep purple and clean silver medical gradient, pristine lab background."
    },
    {
      title: "بطاقة تهنئة وبونص الصيدليات",
      desc: "بطاقة راقية لتهنئة الصيادلة مع باقة عروض البونص الميدانية",
      prompt: "Elegant pharmacy appreciation card with golden stethoscope and gift ribbon, clean modern medical clinic ambient, premium pharmacist partner recognition."
    }
  ];

  // Handle Image Generation
  const handleGenerateImage = async () => {
    if (!prompt.trim() || generatingImage) return;
    setGeneratingImage(true);
    setImageError(null);

    try {
      const res = await fetch("/api/ai/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          aspectRatio,
          imageSize
        })
      });

      const data = await res.json();
      if (data.success && data.imageUrl) {
        setGeneratedImageUrl(data.imageUrl);
        setSourceImageForEdit(data.imageUrl);
        setSourceImageForVideo(data.imageUrl);
      } else {
        setImageError(data.error || "فشل توليد الصورة. يرجى المحاولة مرة أخرى.");
      }
    } catch (err: any) {
      setImageError("حدث خطأ أثناء الاتصال بخادم الذكاء الاصطناعي: " + (err.message || "عطل في الشبكة"));
    } finally {
      setGeneratingImage(false);
    }
  };

  // Handle Image Edit
  const handleEditImage = async () => {
    if (!editPrompt.trim() || !sourceImageForEdit || editingImage) return;
    setEditingImage(true);
    setImageError(null);

    try {
      const res = await fetch("/api/ai/edit-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: editPrompt,
          imageBase64: sourceImageForEdit
        })
      });

      const data = await res.json();
      if (data.success && data.imageUrl) {
        setGeneratedImageUrl(data.imageUrl);
        setSourceImageForEdit(data.imageUrl);
        setSourceImageForVideo(data.imageUrl);
        setActiveTab("image");
      } else {
        setImageError(data.error || "فشل تعديل الصورة.");
      }
    } catch (err: any) {
      setImageError("حدث خطأ أثناء تعديل الصورة: " + (err.message || "عطل في الشبكة"));
    } finally {
      setEditingImage(false);
    }
  };

  // Handle Video Generation with Veo (3-Step polling pattern)
  const handleGenerateVideo = async () => {
    if ((!videoPrompt.trim() && !sourceImageForVideo) || generatingVideo) return;
    setGeneratingVideo(true);
    setVideoError(null);
    setGeneratedVideoUrl(null);
    setVideoProgressMsg("🚀 جاري بدء نموذج Veo 3.1 وتجهيز المشهد السينمائي...");

    try {
      // Step 1: Start operation
      const startRes = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: videoPrompt || "Smooth cinematic promotional rotation and lighting on pharmaceutical medicine box with clean sparkles",
          imageBase64: sourceImageForVideo,
          aspectRatio: videoAspectRatio,
          resolution: videoResolution
        })
      });

      const startData = await startRes.json();
      if (!startData.success) {
        throw new Error(startData.error || "فشل بدء جلسة توليد الفيديو.");
      }

      // If video is returned directly by the server (Gemini Omni Flash)
      if (startData.videoUrl) {
        setGeneratedVideoUrl(startData.videoUrl);
        setVideoProgressMsg("✅ تم تجهيز الفيديو الترويجي بنجاح!");
        return;
      }

      if (!startData.operationName) {
        throw new Error(startData.error || "فشل بدء جلسة توليد الفيديو.");
      }

      const operationName = startData.operationName;
      setVideoProgressMsg("⏳ يتم الآن رندرة وتحريك الفيديو بواسطة Veo (قد يستغرق 30-60 ثانية)...");

      // Step 2: Poll operation status
      let isDone = false;
      let attempts = 0;
      const maxAttempts = 60; // Up to ~2-3 minutes

      while (!isDone && attempts < maxAttempts) {
        await new Promise((r) => setTimeout(r, 4000));
        attempts++;

        const statusRes = await fetch("/api/video-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operationName })
        });

        const statusData = await statusRes.json();
        if (!statusData.success) {
          throw new Error(statusData.error || "خطأ أثناء متابعة حالة الرندرة");
        }

        if (statusData.done) {
          isDone = true;
          break;
        } else {
          setVideoProgressMsg(`✨ جاري توليد إطارات الحركة والإضاءة (${attempts * 4} ثانية)...`);
        }
      }

      if (!isDone) {
        throw new Error("استغرقت عملية توليد الفيديو وقتاً أطول من المتوقع. يرجى المحاولة مرة أخرى.");
      }

      // Step 3: Download video
      setVideoProgressMsg("📥 جاري استقبال وتحميل ملف الفيديو MP4...");
      const downloadRes = await fetch("/api/video-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operationName })
      });

      if (!downloadRes.ok) {
        throw new Error("فشل استلام ملف الفيديو من الخادم.");
      }

      const videoBlob = await downloadRes.blob();
      const videoUrl = URL.createObjectURL(videoBlob);
      setGeneratedVideoUrl(videoUrl);
      setVideoProgressMsg("✅ تم تجهيز الفيديو الترويجي بنجاح!");
    } catch (err: any) {
      console.error("Video generate error:", err);
      setVideoError(err.message || "حدث خطأ أثناء توليد الفيديو.");
    } finally {
      setGeneratingVideo(false);
    }
  };

  // Upload local image for editing or video animation
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: "edit" | "video") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      if (target === "edit") {
        setSourceImageForEdit(base64);
        setActiveTab("edit");
      } else {
        setSourceImageForVideo(base64);
        setActiveTab("video");
      }
    };
    reader.readAsDataURL(file);
  };

  // Share to WhatsApp
  const handleShareToWhatsApp = () => {
    const text = encodeURIComponent(
      `🌹 تحية طيبة من مندوبكم الطبي: ${repName} (${repPhone})\n\nيسعدني مشاركتكم هذا البوستر الترويجي لأحدث عروضنا وبونص الأصناف المعتمدة.\n\n📲 رابط منصتنا: https://tinyurl.com/mandoubak-med`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <div
      id="ai-creative-studio-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  استوديو التصاميم والفيديو الدعائي الذكي
                </h2>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 font-semibold px-2 py-0.5 rounded-full border border-cyan-500/30">
                  Gemini Flash Image & Veo
                </span>
              </div>
              <p className="text-xs text-slate-400">
                توليد بوسترات صيدلانية احترافية وتحريك علب الأدوية إلى فيديو سينمائي للمشاركة مع العملاء
              </p>
            </div>
          </div>

          <button
            id="close-creative-studio-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/90 px-4 pt-2 gap-2 flex-shrink-0">
          <button
            id="tab-image-generation"
            onClick={() => setActiveTab("image")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all border-b-2 ${
              activeTab === "image"
                ? "text-cyan-400 border-cyan-400 bg-slate-800/80"
                : "text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>توليد بوستر دوائي (1K / 2K / 4K)</span>
          </button>

          <button
            id="tab-video-animation"
            onClick={() => setActiveTab("video")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all border-b-2 ${
              activeTab === "video"
                ? "text-fuchsia-400 border-fuchsia-400 bg-slate-800/80"
                : "text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            <Video className="w-4 h-4" />
            <span>تحريك فيديو بالذكاء الاصطناعي (Veo)</span>
          </button>

          <button
            id="tab-image-editing"
            onClick={() => setActiveTab("edit")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all border-b-2 ${
              activeTab === "edit"
                ? "text-amber-400 border-amber-400 bg-slate-800/80"
                : "text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            <Wand2 className="w-4 h-4" />
            <span>تعديل وإضافة عناصر للصور</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* TAB 1: IMAGE GENERATION */}
          {activeTab === "image" && (
            <div className="space-y-6">
              {/* Presets Grid */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-400" />
                  قوالب جاهزة لأصناف كتالوج د/ بلال القيسي (اضغط للتطبيق الفوري):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {PRESET_PROMPTS.map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => setPrompt(preset.prompt)}
                      className="text-right p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-cyan-500/50 transition-all text-xs group"
                    >
                      <div className="font-bold text-cyan-300 group-hover:text-cyan-200 mb-1 flex items-center justify-between">
                        <span>{preset.title}</span>
                        <Pill className="w-3.5 h-3.5 text-cyan-400/70" />
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {preset.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Prompt Input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>وصف التصميم والبوستر المطلوب (بالعربية أو الإنجليزية):</span>
                  <span className="text-[11px] text-slate-400 font-normal">Gemini 3.1 Flash Image</span>
                </label>
                <div className="relative">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="مثال: تصميم بوستر إعلاني صيدلاني فاخر لدواء لوماك 20 كبسول، مع خلفية طبية هادئة باللون الأبيض والأزرق وإضاءة نظيفة فائقة الوضوح..."
                    rows={3}
                    className="w-full bg-slate-950/70 border border-slate-700 rounded-xl p-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all resize-none"
                  />
                </div>
              </div>

              {/* Settings (Aspect Ratio & Resolution) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                {/* Aspect Ratio */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2">
                    أبعاد ومقاس الصورة (Aspect Ratio):
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: "1:1", label: "1:1 مربع", sub: "إنستغرام" },
                      { id: "16:9", label: "16:9 عريض", sub: "بانر / شاشة" },
                      { id: "9:16", label: "9:16 طولي", sub: "حالة واتساب" },
                      { id: "4:3", label: "4:3 كلاسيك", sub: "مطبوعات" }
                    ].map((ar) => (
                      <button
                        key={ar.id}
                        type="button"
                        onClick={() => setAspectRatio(ar.id as any)}
                        className={`p-2 rounded-lg text-center border transition-all ${
                          aspectRatio === ar.id
                            ? "bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold"
                            : "bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <div className="text-xs">{ar.label}</div>
                        <div className="text-[10px] opacity-70">{ar.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Resolution */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2">
                    دقة وجودة الصورة (Resolution):
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "1K", label: "1K Standard", sub: "سريع وخفيف" },
                      { id: "2K", label: "2K High Res", sub: "عالي الوضوح" },
                      { id: "4K", label: "4K Ultra HD", sub: "للطباعة الفاخرة" }
                    ].map((sz) => (
                      <button
                        key={sz.id}
                        type="button"
                        onClick={() => setImageSize(sz.id as any)}
                        className={`p-2 rounded-lg text-center border transition-all ${
                          imageSize === sz.id
                            ? "bg-indigo-500/20 border-indigo-500 text-indigo-300 font-bold"
                            : "bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <div className="text-xs">{sz.label}</div>
                        <div className="text-[10px] opacity-70">{sz.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  id="generate-image-btn"
                  onClick={handleGenerateImage}
                  disabled={generatingImage || !prompt.trim()}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-cyan-600/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-w-[200px]"
                >
                  {generatingImage ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري توليد التصميم الذكي...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      <span>توليد البوستر الدوائي الآن</span>
                    </>
                  )}
                </button>

                {generatedImageUrl && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSourceImageForVideo(generatedImageUrl);
                        setActiveTab("video");
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-fuchsia-600/20 text-fuchsia-300 border border-fuchsia-500/30 hover:bg-fuchsia-600/30 text-xs font-semibold transition-all"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>تحريك هذا التصميم إلى فيديو (Veo)</span>
                    </button>

                    <button
                      onClick={() => {
                        setSourceImageForEdit(generatedImageUrl);
                        setActiveTab("edit");
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600/20 text-amber-300 border border-amber-500/30 hover:bg-amber-600/30 text-xs font-semibold transition-all"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>تعديل الصورة</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {imageError && (
                <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{imageError}</span>
                </div>
              )}

              {/* Generated Image Result Card */}
              {generatedImageUrl && (
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      التصميم الجاهز للمشاركة:
                    </h3>
                    <div className="flex items-center gap-2">
                      <a
                        href={generatedImageUrl}
                        download={`medical-flyer-${Date.now()}.png`}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>تحميل PNG</span>
                      </a>
                      <button
                        onClick={handleShareToWhatsApp}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-all"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>مشاركة واتساب</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-center bg-slate-900/90 p-2 rounded-xl border border-slate-800/80 overflow-hidden">
                    <img
                      src={generatedImageUrl}
                      alt="Generated Pharmaceutical Design"
                      referrerPolicy="no-referrer"
                      className="max-h-[420px] w-auto object-contain rounded-lg shadow-2xl"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: VEO VIDEO ANIMATION */}
          {activeTab === "video" && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-gradient-to-r from-fuchsia-950/40 to-indigo-950/40 border border-fuchsia-800/40 space-y-2">
                <div className="flex items-center gap-2 text-fuchsia-300 font-bold text-xs sm:text-sm">
                  <Film className="w-4 h-4 text-fuchsia-400" />
                  <span>محرك تحريك الفيديو السينمائي Veo 3.1 Fast</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  يمكنك تحويل أي بوستر أو صورة علبة دواء إلى فيديو سينمائي ثلاثي الأبعاد مع مؤثرات إضاءة وحركة انسيابية، لمشاركتها كحالة واتساب أو فيديو ترويجي.
                </p>
              </div>

              {/* Source Image Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">
                  الصورة المراد تحريكها (من التصاميم السابقة أو رفع صورة من جهازك):
                </label>

                <div className="flex flex-wrap items-center gap-3">
                  {sourceImageForVideo ? (
                    <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-800/80 border border-slate-700">
                      <img
                        src={sourceImageForVideo}
                        alt="Source Preview"
                        className="w-12 h-12 object-cover rounded-lg border border-slate-600"
                      />
                      <div className="text-xs">
                        <div className="text-emerald-300 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>تم اختيار الصورة بنجاح</span>
                        </div>
                        <button
                          onClick={() => videoImageInputRef.current?.click()}
                          className="text-[11px] text-cyan-400 hover:underline mt-0.5"
                        >
                          تغيير الصورة
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => videoImageInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-dashed border-slate-600 text-xs text-slate-300 hover:text-white transition-all"
                    >
                      <Camera className="w-4 h-4 text-cyan-400" />
                      <span>رفع صورة علبة دواء من الهاتف / الكمبيوتر</span>
                    </button>
                  )}

                  <input
                    type="file"
                    ref={videoImageInputRef}
                    onChange={(e) => handleFileUpload(e, "video")}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
              </div>

              {/* Video Prompt */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">
                  توجيهات الحركة والإخراج السينمائي (اختياري):
                </label>
                <textarea
                  value={videoPrompt}
                  onChange={(e) => setVideoPrompt(e.target.value)}
                  placeholder="مثال: حركة دوران سينمائية بطيئة لعلبة الدواء مع إضاءة ناعمة ولمعان فاخر في الخلفية..."
                  rows={2}
                  className="w-full bg-slate-950/70 border border-slate-700 rounded-xl p-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 transition-all resize-none"
                />
              </div>

              {/* Video Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2">
                    مقاس الفيديو (Orientation):
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "16:9", label: "16:9 أفقي", sub: "شاشات وعروض" },
                      { id: "9:16", label: "9:16 طولي", sub: "حالات واتساب وReels" }
                    ].map((vo) => (
                      <button
                        key={vo.id}
                        type="button"
                        onClick={() => setVideoAspectRatio(vo.id as any)}
                        className={`p-2 rounded-lg text-center border transition-all ${
                          videoAspectRatio === vo.id
                            ? "bg-fuchsia-500/20 border-fuchsia-500 text-fuchsia-300 font-bold"
                            : "bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <div className="text-xs">{vo.label}</div>
                        <div className="text-[10px] opacity-70">{vo.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2">
                    دقة الفيديو (Resolution):
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "720p", label: "720p HD", sub: "سريع وسلس" },
                      { id: "1080p", label: "1080p Full HD", sub: "فائق الوضوح" }
                    ].map((vr) => (
                      <button
                        key={vr.id}
                        type="button"
                        onClick={() => setVideoResolution(vr.id as any)}
                        className={`p-2 rounded-lg text-center border transition-all ${
                          videoResolution === vr.id
                            ? "bg-indigo-500/20 border-indigo-500 text-indigo-300 font-bold"
                            : "bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <div className="text-xs">{vr.label}</div>
                        <div className="text-[10px] opacity-70">{vr.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Start Video Button */}
              <div>
                <button
                  id="generate-video-btn"
                  onClick={handleGenerateVideo}
                  disabled={generatingVideo || (!videoPrompt.trim() && !sourceImageForVideo)}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-fuchsia-600/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-w-[220px]"
                >
                  {generatingVideo ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري المعالجة والرندرة...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-white" />
                      <span>بدء رندرة وتوليد الفيديو (Veo 3.1)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Progress Tracker */}
              {generatingVideo && (
                <div className="p-4 rounded-xl bg-slate-950/70 border border-fuchsia-800/50 space-y-3 animate-pulse">
                  <div className="flex items-center gap-3 text-xs text-fuchsia-300 font-semibold">
                    <Loader2 className="w-4 h-4 animate-spin text-fuchsia-400" />
                    <span>{videoProgressMsg}</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-fuchsia-500 to-cyan-500 h-full rounded-full animate-indeterminate" />
                  </div>
                </div>
              )}

              {/* Video Error */}
              {videoError && (
                <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{videoError}</span>
                </div>
              )}

              {/* Video Result */}
              {generatedVideoUrl && (
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-fuchsia-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      الفيديو الترويجي المكتمل:
                    </h3>
                    <a
                      href={generatedVideoUrl}
                      download={`medical-promo-video-${Date.now()}.mp4`}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>تحميل MP4</span>
                    </a>
                  </div>

                  <div className="flex justify-center bg-black/80 p-2 rounded-xl border border-slate-800/80 overflow-hidden">
                    <video
                      src={generatedVideoUrl}
                      controls
                      autoPlay
                      loop
                      className="max-h-[400px] w-auto rounded-lg shadow-2xl"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: IMAGE EDITING */}
          {activeTab === "edit" && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">
                  الصورة المراد تعديلها:
                </label>

                <div className="flex flex-wrap items-center gap-3">
                  {sourceImageForEdit ? (
                    <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-800/80 border border-slate-700">
                      <img
                        src={sourceImageForEdit}
                        alt="Source Edit Preview"
                        className="w-14 h-14 object-cover rounded-lg border border-slate-600"
                      />
                      <div className="text-xs">
                        <div className="text-amber-300 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>الصورة جاهزة للتعديل</span>
                        </div>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="text-[11px] text-cyan-400 hover:underline mt-0.5"
                        >
                          تغيير الصورة
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-dashed border-slate-600 text-xs text-slate-300 hover:text-white transition-all"
                    >
                      <FileImage className="w-4 h-4 text-amber-400" />
                      <span>رفع صورة من جهازك لتعديلها</span>
                    </button>
                  )}

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => handleFileUpload(e, "edit")}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
              </div>

              {/* Edit Instruction Prompt */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">
                  التعديل المطلوب تنفيذه على الصورة بالذكاء الاصطناعي:
                </label>
                <textarea
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  placeholder="مثال: أضف شعار ختم الجودة المعتمد بجانب العلبة، واجعل الإضاءة أكثر دفئاً وأضف لمسات قطرات ندى خفيفة..."
                  rows={3}
                  className="w-full bg-slate-950/70 border border-slate-700 rounded-xl p-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all resize-none"
                />
              </div>

              {/* Edit Action Button */}
              <div>
                <button
                  id="edit-image-btn"
                  onClick={handleEditImage}
                  disabled={editingImage || !editPrompt.trim() || !sourceImageForEdit}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-amber-600/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-w-[200px]"
                >
                  {editingImage ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري تطبيق التعديل الذكي...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      <span>تطبيق التعديلات الآن</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>متصل بمحركات Google GenAI الرسمية عبر السيرفر الآمن</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
