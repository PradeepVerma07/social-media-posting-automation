import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface RootErrorBoundaryProps {
  children: React.ReactNode;
}

interface RootErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends React.Component<RootErrorBoundaryProps, RootErrorBoundaryState> {
  constructor(props: RootErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): RootErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Webtrionix 360 RootErrorBoundary caught:', error, errorInfo);
  }

  handleResetSession = () => {
    try {
      localStorage.removeItem('ci360_auth_user');
      localStorage.removeItem('ci360_auth_token');
      localStorage.removeItem('ci360_active_tab');
      localStorage.removeItem('ci360_is_signed_out');
      sessionStorage.clear();
    } catch {}
    window.location.hash = '';
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#F6F8FC] p-4 font-sans text-[#101828]">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-xl p-8 space-y-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto text-2xl">
              ⚠️
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Webtrionix 360 Workspace Recovery
              </h1>
              <p className="text-xs text-slate-600 leading-relaxed">
                An unexpected interface state occurred. Your session data and workflows are safe on the server.
              </p>
            </div>
            {this.state.error?.message && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left">
                <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block mb-1">
                  Diagnostic Message
                </span>
                <code className="text-xs font-mono text-rose-600 break-words block">
                  {this.state.error.message}
                </code>
              </div>
            )}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#1336E8] hover:bg-[#0E27B3] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                Reload Workspace
              </button>
              <button
                type="button"
                onClick={this.handleResetSession}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Reset Session & Sign In
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>
);
