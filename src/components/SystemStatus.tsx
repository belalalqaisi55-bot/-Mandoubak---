import React from "react";
import { AlertCircle, CheckCircle, Clock, Info } from "lucide-react";

interface Incident {
  id: string;
  title: string;
  published: string;
  link: string;
  content: string;
}

const INCIDENTS: Incident[] = [
  {
    id: "31102238",
    title: "This is an example incident",
    published: "2026-08-05T01:11:54Z",
    link: "https://mandoubakmed1.statuspage.io/incidents/bvwtcky51kpr",
    content: "Resolved - Empathize with those affected and let them know everything is operating as normal. Monitoring - Let your users know once a fix is in place, and keep communication clear and precise. Identified - As you continue to work through the incident, update your customers frequently. Investigating - When your product or service isn’t functioning as expected, let your customers know by creating an incident."
  }
];

export const SystemStatus: React.FC = () => {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-slate-900">حالة النظام (System Status)</h2>
        <a 
          href="https://mandoubakmed1.statuspage.io" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xs font-bold text-teal-600 hover:text-teal-800"
        >
          زيارة صفحة الحالة الرسمية
        </a>
      </div>

      <div className="space-y-4">
        {INCIDENTS.map((incident) => (
          <div key={incident.id} className="border border-slate-200 rounded-2xl p-4 bg-white shadow-sm">
            <h3 className="font-bold text-sm text-slate-900 mb-2">{incident.title}</h3>
            <p className="text-xs text-slate-600 mb-2">{incident.content}</p>
            <div className="flex items-center gap-2 text-3xs text-slate-400">
              <Clock className="h-3 w-3" />
              <span>{new Date(incident.published).toLocaleString("ar-YE")}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
