"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Search, MapPin, Compass, User, LogOut, PlusCircle, ShieldCheck, ShieldAlert } from "lucide-react";

export function Navbar() {
  const [user, setUser] = useState<{ name: string; email: string; role?: string } | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("foundit_user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("foundit_token");
    localStorage.removeItem("foundit_user");
    setUser(null);
    window.location.href = "/";
  };

  const isAdmin = user?.role === "admin";

  return (
    <header className="sticky top-0 z-50 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#E5E2DC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-md bg-[#2E4A3E] flex items-center justify-center text-white font-display font-bold text-lg shadow-sm">
              F
            </div>
            <div className="flex flex-col">
              <span className="font-display text-xl font-bold text-[#1E2022] tracking-tight group-hover:text-[#2E4A3E] transition-colors">
                FoundIt
              </span>
              <span className="text-[10px] font-mono tracking-widest text-[#72787E] uppercase -mt-1">
                Civic Lost & Found
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#4A5056]">
            <Link href="/dashboard" className="hover:text-[#1E2022] transition-colors">
              Browse Directory
            </Link>
            <Link href="/lost/new" className="hover:text-[#1E2022] transition-colors flex items-center gap-1">
              Report Lost Item
            </Link>
            <Link href="/found/new" className="hover:text-[#1E2022] transition-colors flex items-center gap-1">
              Report Found Item
            </Link>

            {/* Render Admin Dashboard link ONLY if user is admin */}
            {isAdmin && (
              <Link
                href="/admin"
                className="bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 hover:bg-amber-200 transition-colors"
              >
                <ShieldAlert size={14} className="text-amber-800" /> Admin Panel
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/profile"
                className="text-sm font-medium text-[#1E2022] hover:text-[#2E4A3E] bg-[#EAE7E1] px-3 py-1.5 rounded-md flex items-center gap-2"
                title="View & edit profile"
              >
                <User size={15} />
                <span>{user.name}</span>
                {isAdmin && (
                  <span className="text-[10px] font-mono font-bold bg-[#1E2022] text-white px-1.5 py-0.5 rounded">
                    ADMIN
                  </span>
                )}
              </Link>
              <button
                onClick={handleLogout}
                className="p-1.5 text-[#72787E] hover:text-[#D97706] transition-colors rounded-md hover:bg-[#EAE7E1]"
                title="Log out"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="text-sm font-semibold text-[#1E2022] hover:text-[#2E4A3E] px-3 py-1.5 transition-colors"
              >
                Log In
              </Link>
              <Link
                href="/register"
                className="text-sm font-semibold bg-[#2E4A3E] text-white px-4 py-2 rounded-md hover:bg-[#233A30] transition-all shadow-sm"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="bg-[#1E2022] text-[#A2A8AE] py-12 border-t border-[#313539] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#2E4A3E] text-white font-display text-xs font-bold flex items-center justify-center">
              F
            </div>
            <span className="font-display font-bold text-white text-lg tracking-tight">FoundIt</span>
          </div>
          <p className="text-xs text-[#72787E] max-w-sm">
            Automated multimodal AI lost-and-found matching infrastructure powered by CLIP visual vector embeddings and LangGraph agent workflow.
          </p>
        </div>
        <div className="flex flex-wrap gap-6 text-xs text-[#A2A8AE]">
          <span className="flex items-center gap-1.5 text-emerald-400 font-mono">
            <ShieldCheck size={14} /> System Operational
          </span>
          <span>Terms & Privacy</span>
          <span>Campus & Enterprise</span>
          <span>© 2026 FoundIt Inc.</span>
        </div>
      </div>
    </footer>
  );
}
