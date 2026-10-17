import React from 'react';

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased" dir="rtl">
      {children}
    </div>
  );
};
