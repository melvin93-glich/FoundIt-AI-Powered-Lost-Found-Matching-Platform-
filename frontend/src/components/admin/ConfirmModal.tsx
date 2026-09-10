"use client";

import React from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = "Permanently Delete",
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="custom-card rounded-xl bg-white max-w-md w-full p-6 space-y-5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
        
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} />
          </div>

          <div className="space-y-1 flex-1">
            <h3 className="font-display font-bold text-lg text-[#1E2022]">
              {title}
            </h3>
            <p className="text-xs text-[#4A5056] leading-relaxed">
              {message}
            </p>
          </div>

          <button
            onClick={onCancel}
            className="text-[#72787E] hover:text-[#1E2022] p-1 rounded"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#E5E2DC]">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold bg-[#FAF8F5] border border-[#E5E2DC] text-[#1E2022] rounded-md hover:bg-[#EAE7E1] transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold bg-[#8C2D19] text-white rounded-md hover:bg-[#702414] transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Trash2 size={14} />
            {loading ? "Deleting..." : confirmLabel}
          </button>
        </div>

      </div>
    </div>
  );
}
