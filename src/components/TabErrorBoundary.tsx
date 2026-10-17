import React, { Component, ErrorInfo, ReactNode } from "react";
import { RotateCcw, AlertTriangle, ArrowRight } from "lucide-react";

export interface TabErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
  onNavigateHome?: () => void;
}

export interface TabErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class TabErrorBoundary extends Component<TabErrorBoundaryProps, TabErrorBoundaryState> {
  public state: TabErrorBoundaryState = {
    hasError: false,
    error: null,
  };
  public props: TabErrorBoundaryProps;

  constructor(props: TabErrorBoundaryProps) {
    super(props);
    this.props = props;
  }

  public static getDerivedStateFromError(error: Error): TabErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[TabErrorBoundary caught error]:", error, errorInfo);
  }

  private handleReset = () => {
    (this as any).setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-xl mx-auto my-8 p-6 sm:p-8 bg-white rounded-3xl border border-teal-200/90 shadow-lg text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shadow-inner">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-lg font-black text-slate-900">
              {this.props.fallbackTitle || "قسم الأرشيف"}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              تم حماية بيانات الأرشيف ضد الإغلاق المفاجئ. انقر أدناه لإعادة تحميل القسم بسلاسة.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              <span>إعادة المحاولة الآن 🔄</span>
            </button>

            {this.props.onNavigateHome && (
              <button
                type="button"
                onClick={this.props.onNavigateHome}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                <ArrowRight className="h-3.5 w-3.5" />
                <span>العودة للطلبيات النشطة</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default TabErrorBoundary;
