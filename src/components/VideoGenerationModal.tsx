import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Upload, Video, Loader2, Play } from 'lucide-react';

interface VideoGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VideoGenerationModal: React.FC<VideoGenerationModalProps> = ({ isOpen, onClose }) => {
  const [image, setImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const generateVideo = async () => {
    if (!image || !prompt) return;
    setLoading(true);
    try {
      const res = await fetch("/api/video-gen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: image.split(',')[1], prompt })
      });
      const data = await res.json();
      if (data.videoUrl) {
        setVideoUrl(data.videoUrl);
      }
    } catch (e) {
      console.error("Video generation failed", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
      <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Video className="text-indigo-600" />
            تحويل الصور إلى فيديو
          </h2>
          <button onClick={onClose}><X /></button>
        </div>
        
        {!image ? (
          <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50">
            <Upload className="text-slate-400 mb-2" />
            <span className="text-sm font-bold text-slate-600">ارفع صورة</span>
            <input type="file" onChange={handleFileChange} className="hidden" accept="image/*" />
          </label>
        ) : (
          <img src={image} alt="Preview" className="h-40 w-full object-cover rounded-xl mb-4" />
        )}

        <input 
          value={prompt} 
          onChange={(e) => setPrompt(e.target.value)} 
          placeholder="صف الحركة المطلوبة..."
          className="w-full p-3 border rounded-xl mb-4"
        />

        <button 
          onClick={generateVideo}
          disabled={loading || !image || !prompt}
          className="w-full bg-indigo-600 text-white p-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {loading ? "جاري الإنشاء..." : "إنشاء الفيديو"}
        </button>

        {videoUrl && (
          <video src={videoUrl} controls className="w-full mt-4 rounded-xl" />
        )}
      </div>
    </div>
  );
};
