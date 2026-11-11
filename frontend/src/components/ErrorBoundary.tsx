import React, { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught component error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-6 bg-ob-bg text-ob-tx font-sans selection:bg-indigo-500/30">
          <div className="max-w-lg w-full border border-red-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mb-4 shadow-lg shadow-red-500/10">
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>

            <h2 className="text-xl font-bold tracking-tight text-ob-tx mb-2">
              {this.props.fallbackTitle || "Assessment View Error"}
            </h2>

            <p className="text-xs text-ob-tx2 mb-4 leading-relaxed">
              An unexpected render error occurred in this view. Your session data and progress are preserved.
            </p>

            {this.state.error && (
              <div className="w-full p-3 rounded-xl bg-ob-bg2 border border-ob-ln text-left font-mono text-[11px] text-red-400 overflow-x-auto max-h-32 mb-6">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="flex items-center gap-3 w-full">
              <button
                onClick={() => {
                  window.location.hash = "";
                  window.location.href = "/";
                }}
                className="flex-1 py-2.5 px-4 rounded-xl border border-ob-ln2 hover:bg-ob-ov/5 text-xs font-semibold text-ob-tx transition-colors cursor-pointer"
              >
                Return to Dashboard
              </button>

              <button
                onClick={this.handleReset}
                className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-ob-onac font-semibold text-xs shadow-lg shadow-indigo-600/30 transition cursor-pointer"
              >
                Reload View
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

