import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw, RotateCcw, Copy, Check, ArrowLeft, Trash2 } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
  showClearConfirm: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false,
    showClearConfirm: false
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
      showClearConfirm: false
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearStorage = () => {
    if (this.state.showClearConfirm) {
      localStorage.clear();
      window.location.reload();
    } else {
      this.setState({ showClearConfirm: true });
    }
  };

  private handleCopyError = () => {
    if (!this.state.error) return;
    const logText = `Error: ${this.state.error.message}\n` +
      `Stack: ${this.state.error.stack || 'N/A'}\n` +
      `Component Stack: ${this.state.errorInfo?.componentStack || 'N/A'}`;
    
    navigator.clipboard.writeText(logText).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div id="error-boundary-root" className="min-h-dvh bg-void text-signal flex items-center justify-center p-6 font-sans">
          <div className="max-w-xl w-full bg-void border border-neutral-900 rounded-lg p-8 shadow-2xl relative overflow-hidden">
            {/* Elegant warning indicator bar */}
            <div className="absolute top-0 inset-x-0 h-[3px] bg-human"></div>
            
            <div className="space-y-6">
              {/* Header Icon & Title */}
              <div className="flex items-center space-x-3.5 border-b border-neutral-900 pb-5">
                <div className="p-2.5 bg-human/10 rounded-full text-human">
                  <ShieldAlert size={26} />
                </div>
                <div>
                  <h1 className="font-display font-bold text-xl sm:text-2xl text-signal leading-tight">Rendering Error Detected</h1>
                  <p className="font-sans text-[10px] text-neutral-400 uppercase tracking-widest font-bold">ErrorBoundary Intervention</p>
                </div>
              </div>

              {/* Message */}
              <div className="space-y-2">
                <p className="text-sm text-neutral-300 leading-relaxed font-sans">
                  The application encountered an unexpected runtime compilation or rendering error. Your local drafts remain saved in persistent storage.
                </p>
                <div className="p-4 bg-black border border-neutral-950 rounded-md font-mono text-xs text-red-400 overflow-x-auto select-all max-h-48">
                  <div className="font-bold text-neutral-400 mb-1">ErrorMessage:</div>
                  {this.state.error?.message || "Unknown rendering exception"}
                </div>
              </div>

              {/* Call stack debug viewer */}
              {this.state.errorInfo && (
                <div className="space-y-1.5 text-left">
                  <span className="text-[10px] uppercase font-sc font-bold tracking-wider text-neutral-500">Component Stack Details</span>
                  <pre className="p-3 bg-black/80 border border-neutral-950 rounded text-[9px] font-mono text-neutral-400 overflow-auto max-h-36 whitespace-pre-wrap leading-normal">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </div>
              )}

              {/* Actions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-neutral-900">
                <button
                  id="btn-error-reset"
                   tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={this.handleReset}
                  className="px-4 py-2 bg-void border border-neutral-800 text-neutral-300 hover:text-signal hover:border-neutral-700 text-xs font-sc font-bold uppercase tracking-wider rounded transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <RotateCcw size={14} />
                  <span>Attempt Recovery</span>
                </button>

                <button
                  id="btn-error-reload"
                   tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={this.handleReload}
                  className="px-4 py-2 bg-human text-signal hover:bg-void hover:text-human border border-human text-xs font-sc font-bold uppercase tracking-wider rounded transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <RefreshCw size={14} />
                  <span>Reload Matrix</span>
                </button>

                <button
                  id="btn-error-copy"
                   tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={this.handleCopyError}
                  className="px-4 py-2 bg-void border border-neutral-800 text-neutral-400 hover:text-signal hover:border-neutral-700 text-xs font-sc font-bold uppercase tracking-wider rounded transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {this.state.copied ? (
                    <>
                      <Check size={14} className="text-emerald-400" />
                      <span className="text-emerald-400">Error Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy Log Details</span>
                    </>
                  )}
                </button>

                <button
                  id="btn-error-clear"
                   tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={this.handleClearStorage}
                  className={`px-4 py-2 border text-xs font-sc font-bold uppercase tracking-wider rounded transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                    this.state.showClearConfirm 
                      ? 'bg-red-900 border-red-700 text-white hover:bg-red-800' 
                      : 'bg-void border-red-950 text-red-500 hover:bg-red-950/20'
                  }`}
                >
                  <Trash2 size={14} />
                  <span>{this.state.showClearConfirm ? "Confirm Clear Storage?" : "Reset App State"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
