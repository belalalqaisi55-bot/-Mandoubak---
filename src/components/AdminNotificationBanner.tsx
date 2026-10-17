import React, { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { db } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";

interface AdminNotificationBannerProps {
  userRole: string;
}

export const AdminNotificationBanner: React.FC<AdminNotificationBannerProps> = ({ userRole }) => {
  const [notification, setNotification] = useState<{ title: string; message: string } | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Listen for admin notifications
    const unsub = onSnapshot(doc(db, "settings", "adminNotification"), (doc) => {
      if (doc.exists()) {
        setNotification(doc.data() as { title: string; message: string });
        setIsVisible(true);
      }
    });
    return () => unsub();
  }, []);

  if (!notification || !isVisible || userRole === "admin") return null;

  return (
    <div className="bg-gradient-to-r from-teal-600 to-teal-800 text-white p-4 rounded-2xl shadow-lg mb-4 flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-4">
      <div className="flex items-start gap-3">
        <Bell className="h-6 w-6 shrink-0 text-amber-300 animate-bounce" />
        <div>
          <h3 className="font-black text-sm">{notification.title}</h3>
          <p className="text-xs text-teal-100">{notification.message}</p>
        </div>
      </div>
      <button onClick={() => setIsVisible(false)} className="text-teal-100 hover:text-white cursor-pointer">
        <X className="h-5 w-5" />
      </button>
    </div>
  );
};
