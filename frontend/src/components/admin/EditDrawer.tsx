"use client";

import React from "react";
import { X, Save } from "lucide-react";

interface EditDrawerProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  onSave: () => void;
  loading?: boolean;
  children: React.ReactNode;
}

export function EditDrawer({
  isOpen,
  title,
  onClose,
  onSave,
  loading = false,
  children,
}: EditDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col justify-between p-6 sm:p-8 animate-in slide-in-from-right duration-200">
        
        <div className="space-y-6 overflow-y-auto pr-1">
          <div className="flex items-center justify-between border-b border-[#E5E2DC] pb-4">
            <h2 className="font-display font-bold text-xl text-[#1E2022]">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded text-[#72787E] hover:text-[#1E2022] hover:bg-[#FAF8F5]"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            {children}
          </div>
        </div>

        <div className="pt-4 border-t border-[#E5E2DC] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold bg-[#FAF8F5] border border-[#E5E2DC] text-[#1E2022] rounded-md hover:bg-[#EAE7E1] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={loading}
            className="px-5 py-2 text-xs font-semibold bg-[#2E4A3E] text-white rounded-md hover:bg-[#233A30] transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Save size={14} />
            {loading ? "Saving Changes..." : "Save Changes"}
          </button>
        </div>

      </div>
    </div>
  );
}
