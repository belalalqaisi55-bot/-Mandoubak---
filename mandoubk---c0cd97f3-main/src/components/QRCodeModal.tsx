import React, { useState } from "react";
import { QrCode, X, Download, Copy, Check, Printer, Building2, Package, Sparkles } from "lucide-react";

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  codeValue: string;
  type: "product" | "pharmacy" | "general";
  details?: {
    label1?: string;
    value1?: string;
    label2?: string;
    value2?: string;
  };
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  codeValue,
  type,
  details
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Generate high quality QR code image URL using QRServer API
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(
    codeValue
  )}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(codeValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <title>ملصق رمز QR - ${title}</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background-color: #f8fafc;
            }
            .card {
              border: 2px solid #0f172a;
              border-radius: 16px;
              padding: 24px;
              background: white;
              text-align: center;
              max-width: 320px;
              box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
            }
            .qr-img {
              width: 220px;
              height: 220px;
              margin: 16px 0;
            }
            .title {
              font-size: 18px;
              font-weight: bold;
              color: #0f172a;
              margin: 0 0 4px 0;
            }
            .sub {
              font-size: 13px;
              color: #64748b;
              margin: 0;
            }
            .code-box {
              font-family: monospace;
              background: #f1f5f9;
              padding: 6px 12px;
              border-radius: 8px;
              font-size: 12px;
              color: #334155;
              margin-top: 12px;
              display: inline-block;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h2 class="title">${title}</h2>
            ${subtitle ? `<p class="sub">${subtitle}</p>` : ""}
            <img class="qr-img" src="${qrImageUrl}" alt="QR Code" />
            <div class="code-box">ID: ${codeValue}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center p-6">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header Icon */}
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400 mb-3">
          {type === "product" ? <Package className="h-6 w-6" /> : <Building2 className="h-6 w-6" />}
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {subtitle}
          </p>
        )}

        {/* QR Code Container */}
        <div className="my-5 flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-800/50">
          <img
            src={qrImageUrl}
            alt={`QR Code for ${title}`}
            className="h-48 w-48 rounded-xl shadow-xs border border-slate-200 dark:border-slate-700 bg-white p-2"
          />
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-white dark:bg-slate-900 px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 font-mono">
            <span>{codeValue}</span>
            <button
              onClick={handleCopyCode}
              className="text-teal-600 hover:text-teal-700 dark:text-teal-400"
              title="نسخ الرمز"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Details Summary */}
        {details && (
          <div className="mb-5 grid grid-cols-2 gap-2 text-right bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
            {details.label1 && (
              <div>
                <span className="text-slate-400 block">{details.label1}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{details.value1}</span>
              </div>
            )}
            {details.label2 && (
              <div>
                <span className="text-slate-400 block">{details.label2}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{details.value2}</span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-slate-800 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-xs"
          >
            <Printer className="h-4 w-4" />
            طباعة ملصق QR
          </button>
          <a
            href={qrImageUrl}
            download={`QR_${title}.png`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors"
            title="تحميل صورة الرمز"
          >
            <Download className="h-4 w-4" />
          </a>
        </div>

      </div>
    </div>
  );
};
