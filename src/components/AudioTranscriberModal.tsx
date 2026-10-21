import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  MicOff,
  Square,
  Play,
  RotateCcw,
  Copy,
  Check,
  X,
  Sparkles,
  Volume2,
  FileText,
  AlertCircle,
  Loader2,
  Share2
} from "lucide-react";

interface AudioTranscriberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertText?: (text: string) => void;
  title?: string;
  contextHint?: string;
}

export const AudioTranscriberModal: React.FC<AudioTranscriberModalProps> = ({
  isOpen,
  onClose,
  onInsertText,
  title = "المفرّغ الصوتي الذكي (Voice to Text)",
  contextHint = "تحدث وسيقوم نموذج gemini-3.5-transcribe بتحويل صوتك بدقة إلى نص مكتوب"
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcription, setTranscription] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) {
      stopRecording();
      setTranscription("");
      setAudioBlob(null);
      setAudioUrl(null);
      setError(null);
      setRecordingDuration(0);
    }
  }, [isOpen]);

  const startRecording = async () => {
    setError(null);
    setAudioBlob(null);
    setAudioUrl(null);
    setTranscription("");
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        // Auto transcribe once recorded
        transcribeAudioBlob(blob, mimeType);

        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Microphone access error:", err);
      setError("تعذر الوصول إلى الميكروفون. يرجى التأكد من منح الإذن للمتصفح.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const transcribeAudioBlob = async (blob: Blob, mimeType: string) => {
    setIsTranscribing(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(",")[1];
        if (!base64Data) {
          setError("فشل تجهيز التسجيل الصوتي للإرسال");
          setIsTranscribing(false);
          return;
        }

        try {
          const response = await fetch("/api/ai/transcribe-audio", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              audioBase64: base64Data,
              mimeType: mimeType || "audio/webm",
              prompt: "قم بتفريغ هذا التسجيل الصوتي الطبي بدقة عالية باللغة العربية أو الإنجليزية كما نُطق تماماً."
            })
          });

          const result = await response.json();
          if (result.success && result.text) {
            setTranscription(result.text);
          } else {
            setError(result.error || "تعذر تفريغ الصوت، يرجى المحاولة مرة أخرى.");
          }
        } catch (fetchErr: any) {
          setError("حدث خطأ أثناء الاتصال بالخادم: " + fetchErr.message);
        } finally {
          setIsTranscribing(false);
        }
      };

      reader.readAsDataURL(blob);
    } catch (err: any) {
      setError("حدث خطأ أثناء معالجة ملف الصوت: " + err.message);
      setIsTranscribing(false);
    }
  };

  const handleCopy = () => {
    if (!transcription) return;
    navigator.clipboard.writeText(transcription);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsert = () => {
    if (onInsertText && transcription) {
      onInsertText(transcription);
      onClose();
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-3 sm:p-4 dir-rtl">
      <div className="flex w-full max-w-lg flex-col rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden text-right">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-teal-800 to-emerald-800 px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-teal-200 shadow-inner">
              <Mic className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight">{title}</h3>
                <span className="bg-white/20 text-teal-100 px-2 py-0.2 rounded-full text-4xs font-mono font-bold">
                  gemini-3.5-transcribe
                </span>
              </div>
              <p className="text-2xs text-teal-100/90 font-medium mt-0.5">{contextHint}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-white/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Recorder Controls */}
          <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 space-y-3">
            {isRecording ? (
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="h-20 w-20 rounded-full bg-rose-500/20 animate-ping absolute inset-0" />
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="h-20 w-20 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 transition-transform active:scale-95 cursor-pointer relative z-10"
                    title="إيقاف التسجيل"
                  >
                    <Square className="h-8 w-8" />
                  </button>
                </div>
                <div className="flex items-center gap-2 text-rose-600 font-mono font-black text-sm">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-600 animate-pulse" />
                  <span>جاري التسجيل: {formatTime(recordingDuration)}</span>
                </div>
                <p className="text-3xs text-slate-500 font-medium">اضغط على الزر الأحمر لإنهاء التسجيل والبدء بالتفريغ</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={isTranscribing}
                  className="h-20 w-20 rounded-full bg-gradient-to-tr from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white flex items-center justify-center shadow-lg shadow-teal-600/30 transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
                  title="بدء التسجيل الصوتي"
                >
                  <Mic className="h-8 w-8" />
                </button>
                <div className="text-center">
                  <span className="text-xs font-black text-slate-800 block">اضغط للتحدث عبر الميكروفون</span>
                  <span className="text-3xs text-slate-500 font-medium">
                    سجل ملاحظات الزيارة، أو طلبية الصيدلية، أو استفسارك الصيدلاني
                  </span>
                </div>
              </div>
            )}

            {/* Audio playback if recorded */}
            {audioUrl && !isRecording && (
              <div className="w-full pt-3 border-t border-slate-200/80 flex items-center justify-center">
                <audio src={audioUrl} controls className="h-9 w-full max-w-sm rounded-lg" />
              </div>
            )}
          </div>

          {/* Transcribing Indicator */}
          {isTranscribing && (
            <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center gap-2.5 text-xs font-bold text-teal-900">
              <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
              <span>جاري تفريغ الصوت بالذكاء الاصطناعي (gemini-3.5-transcribe)...</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-xs font-bold text-rose-900">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Transcription Result Box */}
          {transcription && !isTranscribing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-slate-900 flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-teal-700" />
                  <span>النص المفرغ من التسجيل:</span>
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="text-3xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 cursor-pointer"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? "تم النسخ ✓" : "نسخ النص"}</span>
                </button>
              </div>

              <textarea
                value={transcription}
                onChange={(e) => setTranscription(e.target.value)}
                rows={4}
                className="w-full rounded-2xl border-2 border-teal-200 bg-white p-3.5 text-xs sm:text-sm font-semibold text-slate-900 focus:border-teal-600 focus:outline-hidden"
              />

              <div className="flex items-center gap-2 pt-1">
                {onInsertText && (
                  <button
                    type="button"
                    onClick={handleInsert}
                    className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check className="h-4 w-4" />
                    <span>إدراج في الحقل المطلوب</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all border border-slate-200 cursor-pointer"
                >
                  نسخ إلى الحافظة
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
