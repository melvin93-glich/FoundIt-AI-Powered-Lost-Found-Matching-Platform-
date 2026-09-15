"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Search, MapPin, Compass, User, LogOut, PlusCircle, ShieldCheck, ShieldAlert, Bell, Check, CheckCheck, ExternalLink } from "lucide-react";
import api from "@/lib/api";
import { useRouter } from "next/navigation";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  related_match_id?: string;
  read: boolean;
  created_at: string;
}

export function Navbar() {
  const [user, setUser] = useState<{ name: string; email: string; role?: string } | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const fetchNotifications = async () => {
    try {
      const res = await api.get("/notifications");
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch (e) {
      // Quiet fail if not logged in or network error
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem("foundit_user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        fetchNotifications();
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Poll notifications every 30 seconds if authenticated
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Click outside to close notification dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkRead = async (notif: Notification) => {
    try {
      if (!notif.read) {
        await api.patch(`/notifications/${notif.id}/read`);
        fetchNotifications();
      }
    } catch (e) {
      console.error(e);
    }
    if (notif.related_match_id) {
      setShowNotifs(false);
      router.push(`/matches/${notif.related_match_id}`);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

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
            {user && (
              <Link href="/matches" className="hover:text-[#1E2022] transition-colors flex items-center gap-1">
                Matches
              </Link>
            )}

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
              {/* Notification Bell Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowNotifs(!showNotifs)}
                  className="relative p-2 text-[#72787E] hover:text-[#2E4A3E] transition-colors rounded-md hover:bg-[#EAE7E1]"
                  title="Notifications"
                >
                  <Bell size={19} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-[#8C2D19] text-white font-bold text-[10px] rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {showNotifs && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-[#E5E2DC] rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="p-3 bg-[#FAF8F5] border-b border-[#E5E2DC] flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-display font-bold text-xs text-[#1E2022]">
                        <Bell size={14} />
                        <span>Match Notifications</span>
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-[11px] font-semibold text-[#2E4A3E] hover:underline flex items-center gap-1"
                        >
                          <CheckCheck size={13} /> Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-[#E5E2DC]">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-xs text-[#72787E]">
                          No notifications yet. Candidate match alerts will appear here!
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => handleMarkRead(n)}
                            className={`p-3 text-xs cursor-pointer transition-colors flex gap-2.5 items-start ${
                              n.read ? "bg-white hover:bg-[#FAF8F5]" : "bg-emerald-50/60 hover:bg-emerald-50"
                            }`}
                          >
                            <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${n.read ? "bg-transparent" : "bg-[#2E4A3E]"}`} />
                            <div className="flex-1 space-y-1">
                              <div className="font-semibold text-[#1E2022] flex items-center justify-between">
                                <span>{n.title}</span>
                                <span className="text-[10px] font-mono text-[#72787E]">
                                  {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-[#4A5056] leading-relaxed">{n.message}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

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
