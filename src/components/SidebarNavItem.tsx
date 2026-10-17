import React from 'react';

export function SidebarNavItem({
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
