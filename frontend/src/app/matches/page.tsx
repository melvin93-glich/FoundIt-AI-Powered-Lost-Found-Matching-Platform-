"use client";

import React, { useState, useEffect } from "react";
import { Navbar, Footer } from "@/components/Navigation";
import { Search, MapPin, Tag, CheckCircle2, Clock, ShieldCheck, ArrowRight, User, Mail, Phone, ExternalLink } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";

interface ItemSummary {
  id?: string;
  title?: string;
  category?: string;
  location?: string;
  image_url?: string;
  user_name?: string;
}

interface ContactDetails {
  name: string;
  email: string;
  phone?: string;
  preferred_contact?: string;
}

interface MatchRecord {
  id: string;
  lost_item_id: string;
  found_item_id: string;
  score: number;
  score_pct: number;
  status: "pending" | "confirmed";
  lost_item: ItemSummary;
  found_item: ItemSummary;
  reporter_contact?: ContactDetails;
  finder_contact?: ContactDetails;
  updated_at: string;
}

export default function MatchesOverviewPage() {
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "confirmed">("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMatches();
  }, [statusFilter]);

  const fetchMatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const param = statusFilter === "all" ? "" : `?status_filter=${statusFilter}`;
      const res = await api.get(`/matches${param}`);
      setMatches(res.data.matches || []);
    } catch (err: any) {
      console.error(err);
      if (err.response?.status !== 401) {
        setError("Failed to load match directory. Please check your connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5]">
      <Navbar />

      <main className="flex-1 py-10 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E2DC] pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-mono text-[#2E4A3E] bg-[#E2EAE6] px-2.5 py-0.5 rounded font-semibold uppercase mb-2">
              <ShieldCheck size={14} /> AI Matches Directory
            </div>
            <h1 className="font-display text-3xl font-bold text-[#1E2022] tracking-tight">
              My Match Dashboard
            </h1>
            <p className="text-sm text-[#72787E] mt-1">
              Overview of all candidate and confirmed item matches involving your lost or found reports.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex bg-[#EAE7E1] p-1 rounded-lg self-start sm:self-auto text-xs font-semibold text-[#4A5056]">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                statusFilter === "all" ? "bg-white text-[#1E2022] shadow-sm font-bold" : "hover:text-[#1E2022]"
              }`}
            >
              All Matches
            </button>
            <button
              onClick={() => setStatusFilter("pending")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                statusFilter === "pending" ? "bg-white text-[#1E2022] shadow-sm font-bold" : "hover:text-[#1E2022]"
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setStatusFilter("confirmed")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                statusFilter === "confirmed" ? "bg-white text-[#1E2022] shadow-sm font-bold" : "hover:text-[#1E2022]"
              }`}
            >
              Confirmed
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="py-20 text-center text-sm text-[#72787E] space-y-3">
            <div className="w-8 h-8 border-2 border-[#2E4A3E] border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Fetching your match records...</p>
          </div>
        ) : matches.length === 0 ? (
          /* Empty State */
          <div className="custom-card rounded-2xl p-12 text-center bg-white space-y-4 max-w-lg mx-auto border border-[#E5E2DC]">
            <div className="w-14 h-14 bg-emerald-50 text-[#2E4A3E] rounded-full flex items-center justify-center mx-auto border border-emerald-100">
              <CheckCircle2 size={30} />
            </div>
            <h3 className="font-display font-bold text-xl text-[#1E2022]">No Matches Found Yet</h3>
            <p className="text-xs text-[#72787E] leading-relaxed">
              When our CLIP, BGE, and YOLO AI models detect similarity between lost and found items in the directory, your candidate pairs will appear here!
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <Link
                href="/lost/new"
                className="bg-[#2E4A3E] text-white text-xs font-semibold px-4 py-2.5 rounded-md hover:bg-[#233A30] transition-colors"
              >
                Report Lost Item
              </Link>
              <Link
                href="/found/new"
                className="bg-[#EAE7E1] text-[#1E2022] text-xs font-semibold px-4 py-2.5 rounded-md hover:bg-[#DDD9D0] transition-colors"
              >
                Report Found Item
              </Link>
            </div>
          </div>
        ) : (
          /* Match Card List */
          <div className="space-y-6">
            {matches.map((m) => {
              const isConfirmed = m.status === "confirmed";

              return (
                <div
                  key={m.id}
                  className={`custom-card rounded-2xl bg-white border-2 overflow-hidden shadow-sm transition-all hover:shadow-md ${
                    isConfirmed ? "border-emerald-500 bg-emerald-50/20" : "border-emerald-300/60"
                  }`}
                >
                  {/* Card Top Accent Bar */}
                  <div className={`px-5 py-3 flex flex-wrap items-center justify-between gap-3 ${
                    isConfirmed ? "bg-emerald-700 text-white" : "bg-[#2E4A3E] text-white"
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-sm tracking-wide">
                        MATCH PAIR
                      </span>
                      <span className="bg-white/20 text-white text-[11px] font-mono px-2 py-0.5 rounded-full font-bold">
                        {m.score_pct}% MATCH CONFIDENCE
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                        isConfirmed ? "bg-emerald-100 text-emerald-900 font-mono" : "bg-amber-100 text-amber-900 font-mono"
                      }`}>
                        {isConfirmed ? "✓ CONFIRMED MATCH" : "⏳ PENDING REVIEW"}
                      </span>

                      <Link
                        href={`/matches/${m.lost_item_id}`}
                        className="text-xs text-white/90 hover:text-white font-semibold flex items-center gap-1 hover:underline"
                      >
                        Details <ExternalLink size={13} />
                      </Link>
                    </div>
                  </div>

                  {/* Item Pair Grid */}
                  <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
                    {/* Lost Item Side */}
                    <div className="space-y-3 bg-[#FAF8F5] p-4 rounded-xl border border-[#E5E2DC]">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 bg-red-100 text-red-800 rounded">
                          LOST ITEM
                        </span>
                        <span className="text-xs text-[#72787E] flex items-center gap-1">
                          <User size={12} /> {m.lost_item.user_name || "Reporter"}
                        </span>
                      </div>

                      <div className="flex gap-4">
                        {m.lost_item.image_url ? (
                          <img
                            src={m.lost_item.image_url}
                            alt={m.lost_item.title || "Lost Item"}
                            className="w-20 h-20 object-cover rounded-lg border border-[#E5E2DC] shrink-0"
                          />
                        ) : (
                          <div className="w-20 h-20 bg-[#EAE7E1] rounded-lg border border-[#E5E2DC] flex items-center justify-center text-xs text-[#72787E] shrink-0">
                            No Photo
                          </div>
                        )}
                        <div className="space-y-1 overflow-hidden">
                          <h4 className="font-display font-bold text-base text-[#1E2022] truncate">
                            {m.lost_item.title || "Lost Item"}
                          </h4>
                          <p className="text-xs text-[#72787E] flex items-center gap-1">
                            <Tag size={12} /> {m.lost_item.category || "Uncategorized"}
                          </p>
                          <p className="text-xs text-[#72787E] flex items-center gap-1 truncate">
                            <MapPin size={12} /> {m.lost_item.location || "Unknown Location"}
                          </p>
                        </div>
                      </div>

                      {/* Gated Reporter Contact Info */}
                      {isConfirmed && m.reporter_contact ? (
                        <div className="pt-2 border-t border-[#E5E2DC] text-xs space-y-1 bg-white p-2.5 rounded-md text-[#1E2022]">
                          <p className="font-semibold text-emerald-800">Reporter Contact (Unlocked):</p>
                          <p className="flex items-center gap-1.5"><Mail size={12} className="text-[#72787E]" /> <a href={`mailto:${m.reporter_contact.email}`} className="hover:underline text-[#2E4A3E]">{m.reporter_contact.email}</a></p>
                          {m.reporter_contact.phone && (
                            <p className="flex items-center gap-1.5"><Phone size={12} className="text-[#72787E]" /> <a href={`tel:${m.reporter_contact.phone}`} className="hover:underline text-[#2E4A3E]">{m.reporter_contact.phone}</a></p>
                          )}
                        </div>
                      ) : (
                        <div className="pt-2 border-t border-[#E5E2DC] text-[11px] text-[#72787E] italic">
                          🔒 Confirm match on detail page to reveal reporter contact.
                        </div>
                      )}
                    </div>

                    {/* Found Item Side */}
                    <div className="space-y-3 bg-[#FAF8F5] p-4 rounded-xl border border-[#E5E2DC]">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                          FOUND ITEM
                        </span>
                        <span className="text-xs text-[#72787E] flex items-center gap-1">
                          <User size={12} /> {m.found_item.user_name || "Finder"}
                        </span>
                      </div>

                      <div className="flex gap-4">
                        {m.found_item.image_url ? (
                          <img
                            src={m.found_item.image_url}
                            alt={m.found_item.title || "Found Item"}
                            className="w-20 h-20 object-cover rounded-lg border border-[#E5E2DC] shrink-0"
                          />
                        ) : (
                          <div className="w-20 h-20 bg-[#EAE7E1] rounded-lg border border-[#E5E2DC] flex items-center justify-center text-xs text-[#72787E] shrink-0">
                            No Photo
                          </div>
                        )}
                        <div className="space-y-1 overflow-hidden">
                          <h4 className="font-display font-bold text-base text-[#1E2022] truncate">
                            {m.found_item.title || "Found Item"}
                          </h4>
                          <p className="text-xs text-[#72787E] flex items-center gap-1">
                            <Tag size={12} /> {m.found_item.category || "Uncategorized"}
                          </p>
                          <p className="text-xs text-[#72787E] flex items-center gap-1 truncate">
                            <MapPin size={12} /> {m.found_item.location || "Unknown Location"}
                          </p>
                        </div>
                      </div>

                      {/* Gated Finder Contact Info */}
                      {isConfirmed && m.finder_contact ? (
                        <div className="pt-2 border-t border-[#E5E2DC] text-xs space-y-1 bg-white p-2.5 rounded-md text-[#1E2022]">
                          <p className="font-semibold text-emerald-800">Finder Contact (Unlocked):</p>
                          <p className="flex items-center gap-1.5"><Mail size={12} className="text-[#72787E]" /> <a href={`mailto:${m.finder_contact.email}`} className="hover:underline text-[#2E4A3E]">{m.finder_contact.email}</a></p>
                          {m.finder_contact.phone && (
                            <p className="flex items-center gap-1.5"><Phone size={12} className="text-[#72787E]" /> <a href={`tel:${m.finder_contact.phone}`} className="hover:underline text-[#2E4A3E]">{m.finder_contact.phone}</a></p>
                          )}
                        </div>
                      ) : (
                        <div className="pt-2 border-t border-[#E5E2DC] text-[11px] text-[#72787E] italic">
                          🔒 Confirm match on detail page to reveal finder contact.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
