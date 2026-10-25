import './utils/suppressViteHmrErrors.ts';
import React, { StrictMode, Component } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initGlobalApiProxy } from './utils/apiConfig.ts';

// Initialize API proxy for Android APK and native mobile runtimes
initGlobalApiProxy();

// Error Boundary to prevent any blank white screen
interface ErrorBoundaryProps {
  children: React.ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };
  public props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Root Application Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'Tajawal, sans-serif',
          backgroundColor: '#f8fafc',
          color: '#1e293b',
          textAlign: 'center',
          direction: 'rtl'
        }}>
          <div style={{
            maxWidth: '480px',
            backgroundColor: '#ffffff',
            padding: '32px',
            borderRadius: '16px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#ecfdf5',
              color: '#0f766e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              margin: '0 auto 16px auto'
            }}>
              🏥
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f766e', marginBottom: '8px' }}>
              مندوبك الطبي | جارٍ إعادة التهيئة
            </h2>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px', lineHeight: 1.6 }}>
              حدث خطأ غير متوقع أثناء تحميل الواجهة، يرجى النقر على الزر أدناه لتحديث الصفحة ومسح التخزين المؤقت.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  try {
                    localStorage.removeItem('mandoubak_active_tab');
                  } catch (e) {}
                  window.location.reload();
                }}
                style={{
                  backgroundColor: '#0f766e',
                  color: '#ffffff',
                  padding: '12px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '15px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                🔄 إعادة تحميل التطبيق
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Service Worker registration for PWA installability and offline support
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((err) => {
      console.debug('Service Worker registration notice:', err);
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>,
);


