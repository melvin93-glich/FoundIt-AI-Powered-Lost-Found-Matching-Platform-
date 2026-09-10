"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Users, FileQuestion, CheckCircle, GitCompare, Activity, LogOut, ShieldAlert, ArrowLeft } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [adminUser, setAdminUser] = useState<any>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const savedUser = localStorage.getItem("foundit_user");
    const token = localStorage.getItem("foundit_token");

    if (!token || !savedUser) {
      router.push("/login");
      return;
    }

    try {
      const parsed = JSON.parse(savedUser);
      if (parsed.role === "admin") {
        setAuthorized(true);
        setAdminUser(parsed);
      } else {
        setAuthorized(false);
        setTimeout(() => router.push("/"), 1500);
      }
    } catch (e) {
      setAuthorized(false);
      router.push("/");
    }
  }, [router]);

  if (authorized === null) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center font-mono text-xs text-[#72787E]">
        Verifying administrator credentials...
      </div>
    );
  }

  if (authorized === false) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4">
        <div className="custom-card rounded-xl p-8 bg-white max-w-md text-center space-y-4">
          <div className="w-12 h-12 bg-red-100 text-red-700 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert size={28} />
          </div>
          <h2 className="font-display text-2xl font-bold text-[#1E2022]">
            403 — Access Forbidden
          </h2>
          <p className="text-xs text-[#72787E]">
            You do not have administrator permissions to access the FoundIt internal admin console. Redirecting to home page...
          </p>
        </div>
      </div>
    );
  }

  const navItems = [
    { label: "Dashboard Overview", href: "/admin", icon: Activity },
    { label: "Users Directory", href: "/admin/users", icon: Users },
    { label: "Lost Items", href: "/admin/lost", icon: FileQuestion },
    { label: "Found Items", href: "/admin/found", icon: CheckCircle },
    { label: "AI Matches", href: "/admin/matches", icon: GitCompare },
  ];

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col md:flex-row">
      
      {/* Left Sidebar */}
      <aside className="w-full md:w-64 bg-[#1E2022] text-[#A2A8AE] flex flex-col shrink-0 border-r border-[#313539]">
        
        {/* Brand Header */}
        <div className="p-6 border-b border-[#313539] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-[#2E4A3E] text-white font-display font-bold text-sm flex items-center justify-center">
              F
            </div>
            <div>
              <span className="font-display font-bold text-white text-base block tracking-tight">
                FoundIt Admin
              </span>
              <span className="text-[10px] font-mono text-emerald-400 block -mt-1">
                INTERNAL CONSOLE
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-1 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-md text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-[#2E4A3E] text-white shadow-sm"
                    : "hover:bg-[#2B2F33] hover:text-white"
                }`}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Info & Exit Footer */}
        <div className="p-4 border-t border-[#313539] space-y-3">
          <div className="text-xs space-y-0.5">
            <span className="block font-semibold text-white truncate">{adminUser?.name}</span>
            <span className="block text-[11px] text-[#72787E] truncate">{adminUser?.email}</span>
          </div>
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-semibold text-[#A2A8AE] hover:text-white transition-colors"
          >
            <ArrowLeft size={14} /> Return to Public Site
          </Link>
        </div>

      </aside>

      {/* Main Content Viewport */}
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto max-w-7xl">
        {children}
      </main>

    </div>
  );
}
