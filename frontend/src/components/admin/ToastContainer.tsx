"use client";

import React, { createContext, useContext, useState } from "react";
import { CheckCircle2, AlertTriangle, Info, X, History } from "lucide-react";

interface Toast {
  id: string;
  type: "success" | "error" | "info";
  message: string;
  timestamp: Date;
}

interface ToastContextType {
  addToast: (message: string, type?: "success" | "error" | "info") => void;
  toasts: Toast[];
  history: Toast[];
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [history, setHistory] = useState<Toast[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const addToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const newToast: Toast = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      message,
      timestamp: new Date(),
    };

    setToasts((prev) => [newToast, ...prev]);
    setHistory((prev) => [newToast, ...prev]);

    // Auto dismiss active toast after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast, toasts, history }}>
      {children}

      {/* Floating Active Toast Stack */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`custom-card rounded-lg p-3.5 shadow-xl flex items-start gap-3 border text-xs animate-in slide-in-from-bottom-5 duration-200 ${
              toast.type === "success"
                ? "bg-white border-emerald-300 text-[#1E2022]"
                : toast.type === "error"
                ? "bg-white border-red-300 text-[#1E2022]"
                : "bg-white border-[#E5E2DC] text-[#1E2022]"
            }`}
          >
            {toast.type === "success" && <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />}
            {toast.type === "error" && <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />}
            {toast.type === "info" && <Info size={16} className="text-[#2E4A3E] shrink-0 mt-0.5" />}

            <div className="flex-1 space-y-0.5">
              <p className="font-semibold">{toast.message}</p>
              <span className="text-[10px] font-mono text-[#72787E]">
                {toast.timestamp.toLocaleTimeString()}
              </span>
            </div>

            <button onClick={() => removeToast(toast.id)} className="text-[#72787E] hover:text-[#1E2022]">
              <X size={14} />
            </button>
          </div>
        ))}

        {/* Action History Drawer Trigger Button */}
        {history.length > 0 && (
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="self-end bg-[#1E2022] text-white text-[11px] font-mono font-semibold px-3 py-1.5 rounded-full shadow-md hover:bg-[#313539] transition-colors flex items-center gap-1.5"
          >
            <History size={13} /> Session History ({history.length})
          </button>
        )}
      </div>

      {/* Session Toast History Modal Drawer */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm h-full p-6 shadow-2xl flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E2DC] pb-3">
              <h3 className="font-display font-bold text-sm text-[#1E2022] flex items-center gap-1.5">
                <History size={16} /> Admin Session Action Log
              </h3>
              <button onClick={() => setShowHistory(false)} className="text-[#72787E]">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs font-mono">
              {history.map((h, i) => (
                <div key={i} className="p-2.5 rounded bg-[#FAF8F5] border border-[#E5E2DC] space-y-1">
                  <div className="flex justify-between text-[10px] text-[#72787E]">
                    <span className="uppercase font-bold text-[#1E2022]">{h.type}</span>
                    <span>{h.timestamp.toLocaleTimeString()}</span>
                  </div>
                  <p className="text-[#1E2022] leading-tight font-sans text-xs">{h.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
