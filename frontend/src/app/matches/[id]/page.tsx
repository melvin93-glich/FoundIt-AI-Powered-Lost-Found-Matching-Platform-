"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Navbar, Footer } from "@/components/Navigation";
import { MatchConfidenceBar } from "@/components/ItemCard";
import {
  CheckCircle2,
  XCircle,
  Sparkles,
  MapPin,
  Cpu,
  ShieldCheck,
  ImageOff,
  Mail,
  Phone,
  UserCheck,
} from "lucide-react";
import api from "@/lib/api";

interface ContactInfo {
  name: string;
  email: string;
  phone?: string | null;
  preferred_contact: string;
}

interface ConfirmedContactsState {
  reporter_contact?: ContactInfo;
  finder_contact?: ContactInfo;
  confirmed_at?: string;
}

export default function MatchResultsPage() {
  const params = useParams();
  const itemId = params?.id as string;

  const [matches, setMatches] = useState<any[]>([]);
  const [sourceItem, setSourceItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [confirmedContacts, setConfirmedContacts] = useState<ConfirmedContactsState | null>(null);

  useEffect(() => {
    if (itemId) {
      fetchMatchesAndSource();
    }
  }, [itemId]);

  const fetchMatchesAndSource = async () => {
    setLoading(true);
    try {
      // 1. Fetch AI-ranked match candidates
      const matchResp = await api.get(`/matches/${itemId}`);
      const candidates = matchResp.data.candidates || [];
      setMatches(candidates);

      // 2. Fetch source item
      let src = null;
      try {
        const srcResp = await api.get(`/lost/${itemId}`);
        src = srcResp.data;
        setSourceItem(src);
      } catch {
        try {
          const srcResp = await api.get(`/found/${itemId}`);
          src = srcResp.data;
          setSourceItem(src);
        } catch {
          setSourceItem(null);
        }
      }

      // 3. If item is already matched, fetch existing contacts
      if (src && src.status === "matched") {
        try {
          const contactsResp = await api.get(`/match/${itemId}/contacts`);
          setConfirmedContacts(contactsResp.data);
        } catch (e) {
          // User might not be owner/admin, or endpoint unavailable
        }
      }
    } catch (err) {
      console.error("Match fetch failed:", err);
      setMatches([]);
      setSourceItem(null);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmMatch = async (candidateId: string) => {
    try {
      const resp = await api.post(`/match/${itemId}?candidate_id=${candidateId}`);
      setActionStatus("Match confirmed! Both parties can now see contact details below.");
      setConfirmedContacts({
        reporter_contact: resp.data.reporter_contact,
        finder_contact: resp.data.finder_contact,
        confirmed_at: resp.data.confirmed_at,
      });
      // Refresh source item state
      if (sourceItem) {
        setSourceItem({ ...sourceItem, status: "matched" });
      }
    } catch (err: any) {
      console.error("Confirm failed:", err);
      setActionStatus(
        err.response?.data?.detail || "Confirmed match! Status updated to Matched."
      );
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 py-12 bg-[#FAF8F5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

          {/* Header */}
          <div className="border-b border-[#E5E2DC] pb-6 space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-mono font-semibold text-[#2E4A3E] bg-[#E2EAE6] px-3 py-1 rounded">
              <Cpu size={14} /> LANGGRAPH MULTIMODAL REASONING AGENT
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#1E2022]">
              AI Candidate Match Breakdown
            </h1>
            <p className="text-sm text-[#72787E] max-w-2xl">
              Candidates are evaluated using CLIP visual embeddings, BGE text
              embeddings, and location/category context scoring. Weights adapt
              automatically when no photo is available.
            </p>
          </div>

          {actionStatus && (
            <div className="bg-emerald-50 text-emerald-800 p-4 rounded-lg border border-emerald-200 flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck size={18} />
              {actionStatus}
            </div>
          )}

          {/* Confirmed Contacts Banner */}
          {confirmedContacts && (
            <div className="custom-card rounded-xl bg-white border-2 border-emerald-600 p-6 sm:p-8 space-y-6 shadow-md">
              <div className="flex items-center gap-3 border-b border-[#E5E2DC] pb-4">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <UserCheck size={22} />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                    Match Confirmed
                  </span>
                  <h2 className="font-display text-xl font-bold text-[#1E2022]">
                    Contact Details Unlocked
                  </h2>
                </div>
              </div>

              <p className="text-xs text-[#4A5056]">
                Both owners have mutually confirmed this match. Use the contact details below to arrange item handoff.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Reporter / Lost Owner */}
                {confirmedContacts.reporter_contact && (
                  <div className="bg-[#FAF8F5] p-5 rounded-lg border border-[#E5E2DC] space-y-3">
                    <span className="text-[11px] font-mono font-semibold uppercase text-[#8C2D19] bg-[#F9EBE8] px-2 py-0.5 rounded">
                      Lost Item Reporter
                    </span>
                    <h3 className="font-bold text-sm text-[#1E2022]">
                      {confirmedContacts.reporter_contact.name}
                    </h3>
                    <div className="text-xs space-y-2 pt-1">
                      <div className="flex items-center gap-2 text-[#4A5056]">
                        <Mail size={14} className="text-[#2E4A3E]" />
                        <a
                          href={`mailto:${confirmedContacts.reporter_contact.email}`}
                          className="text-[#2E4A3E] font-medium hover:underline"
                        >
                          {confirmedContacts.reporter_contact.email}
                        </a>
                      </div>

                      {confirmedContacts.reporter_contact.phone ? (
                        <div className="flex items-center gap-2 text-[#4A5056]">
                          <Phone size={14} className="text-[#2E4A3E]" />
                          <a
                            href={`tel:${confirmedContacts.reporter_contact.phone}`}
                            className="text-[#2E4A3E] font-medium hover:underline"
                          >
                            {confirmedContacts.reporter_contact.phone}
                          </a>
                        </div>
                      ) : (
                        <div className="text-[11px] text-[#72787E] italic">
                          No phone number provided
                        </div>
                      )}

                      <div className="text-[11px] text-[#72787E]">
                        Preferred Contact:{" "}
                        <span className="font-semibold text-[#1E2022] capitalize">
                          {confirmedContacts.reporter_contact.preferred_contact}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Finder / Found Owner */}
                {confirmedContacts.finder_contact && (
                  <div className="bg-[#FAF8F5] p-5 rounded-lg border border-[#E5E2DC] space-y-3">
                    <span className="text-[11px] font-mono font-semibold uppercase text-[#2E4A3E] bg-[#E2EAE6] px-2 py-0.5 rounded">
                      Found Item Finder
                    </span>
                    <h3 className="font-bold text-sm text-[#1E2022]">
                      {confirmedContacts.finder_contact.name}
                    </h3>
                    <div className="text-xs space-y-2 pt-1">
                      <div className="flex items-center gap-2 text-[#4A5056]">
                        <Mail size={14} className="text-[#2E4A3E]" />
                        <a
                          href={`mailto:${confirmedContacts.finder_contact.email}`}
                          className="text-[#2E4A3E] font-medium hover:underline"
                        >
                          {confirmedContacts.finder_contact.email}
                        </a>
                      </div>

                      {confirmedContacts.finder_contact.phone ? (
                        <div className="flex items-center gap-2 text-[#4A5056]">
                          <Phone size={14} className="text-[#2E4A3E]" />
                          <a
                            href={`tel:${confirmedContacts.finder_contact.phone}`}
                            className="text-[#2E4A3E] font-medium hover:underline"
                          >
                            {confirmedContacts.finder_contact.phone}
                          </a>
                        </div>
                      ) : (
                        <div className="text-[11px] text-[#72787E] italic">
                          No phone number provided
                        </div>
                      )}

                      <div className="text-[11px] text-[#72787E]">
                        Preferred Contact:{" "}
                        <span className="font-semibold text-[#1E2022] capitalize">
                          {confirmedContacts.finder_contact.preferred_contact}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {loading ? (
            <div className="py-24 text-center space-y-3 font-mono text-xs text-[#72787E]">
              <div className="w-8 h-8 border-2 border-[#2E4A3E] border-t-transparent rounded-full animate-spin mx-auto" />
              <span>
                Executing LangGraph State Graph: understand_request →
                generate_embeddings → vector_search...
              </span>
            </div>
          ) : matches.length === 0 ? (
            <div className="custom-card rounded-xl p-12 text-center bg-white space-y-3">
              <h3 className="font-display text-xl font-bold text-[#1E2022]">
                No high-confidence matches found yet
              </h3>
              <p className="text-xs text-[#72787E]">
                Our background worker will notify you as soon as a matching item
                is reported.
              </p>
            </div>
          ) : (
            <div className="space-y-10">
              {matches.map((match, idx) => {
                const breakdown = match.score_breakdown;
                const hasImage = breakdown.image_available !== false;

                return (
                  <div
                    key={idx}
                    className="custom-card rounded-xl bg-white p-6 sm:p-8 space-y-6"
                  >
                    {/* Match Top Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E2DC] pb-4">
                      <div>
                        <span className="text-xs font-mono font-semibold text-[#D97706] uppercase tracking-wider">
                          Candidate Match #{idx + 1}
                        </span>
                        <h2 className="font-display text-xl font-bold text-[#1E2022]">
                          {match.target_item.title}
                        </h2>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() =>
                            handleConfirmMatch(match.target_item.id)
                          }
                          className="bg-[#2E4A3E] text-white px-4 py-2 rounded-md font-semibold text-xs hover:bg-[#233A30] transition-colors flex items-center gap-1.5 shadow-sm"
                        >
                          <CheckCircle2 size={16} /> Confirm Match
                        </button>
                        <button
                          onClick={() =>
                            setMatches(matches.filter((_, i) => i !== idx))
                          }
                          className="bg-[#EAE7E1] text-[#72787E] hover:text-[#8C2D19] px-3 py-2 rounded-md font-semibold text-xs transition-colors flex items-center gap-1"
                        >
                          <XCircle size={16} /> Reject
                        </button>
                      </div>
                    </div>

                    {/* Side-by-Side Comparison Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                      {/* Source Item — fetched from backend, NOT copied from candidate */}
                      <div className="bg-[#FAF8F5] p-5 rounded-lg border border-[#E5E2DC] space-y-3">
                        <span className="text-[11px] font-mono font-semibold uppercase text-[#8C2D19] bg-[#F9EBE8] px-2 py-0.5 rounded">
                          Your Reported Item
                        </span>
                        <div className="h-44 bg-[#EAE7E1] rounded overflow-hidden flex items-center justify-center">
                          {sourceItem?.image_url ? (
                            <img
                              src={sourceItem.image_url}
                              alt="Your reported item"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-1 text-[#72787E]">
                              <ImageOff size={28} />
                              <span className="text-[10px] font-mono">No photo provided</span>
                            </div>
                          )}
                        </div>
                        <div className="text-xs space-y-1">
                          <p className="font-bold text-[#1E2022]">
                            {sourceItem?.title ?? "—"}
                          </p>
                          {sourceItem?.location && (
                            <p className="text-[#72787E] flex items-center gap-1">
                              <MapPin size={11} />
                              {sourceItem.location}
                            </p>
                          )}
                          <p className="text-[#72787E]">
                            {sourceItem?.description ?? ""}
                          </p>
                        </div>
                      </div>

                      {/* Target Found Item Candidate */}
                      <div className="bg-[#FAF8F5] p-5 rounded-lg border border-[#E5E2DC] space-y-3">
                        <span className="text-[11px] font-mono font-semibold uppercase text-[#2E4A3E] bg-[#E2EAE6] px-2 py-0.5 rounded">
                          Found Candidate Match
                        </span>
                        <div className="h-44 bg-[#EAE7E1] rounded overflow-hidden flex items-center justify-center">
                          {match.target_item.image_url ? (
                            <img
                              src={match.target_item.image_url}
                              alt="Candidate found item"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-1 text-[#72787E]">
                              <ImageOff size={28} />
                              <span className="text-[10px] font-mono">No photo</span>
                            </div>
                          )}
                        </div>
                        <div className="text-xs space-y-1">
                          <p className="font-bold text-[#1E2022]">
                            {match.target_item.title}
                          </p>
                          {match.target_item.location && (
                            <p className="text-[#72787E] flex items-center gap-1">
                              <MapPin size={11} />
                              {match.target_item.location}
                            </p>
                          )}
                          <p className="text-[#72787E]">
                            {match.target_item.description}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* AI Explanation & Match Confidence Breakdown */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center border-t border-[#E5E2DC] pt-6">

                      <div className="lg:col-span-6 space-y-2">
                        <h4 className="font-display text-sm font-bold text-[#1E2022] flex items-center gap-1.5">
                          <Sparkles size={16} className="text-[#D97706]" />
                          LangGraph Reasoning Summary
                          {!hasImage && (
                            <span className="text-[10px] font-mono font-normal text-[#72787E] ml-1">
                              (text-only mode)
                            </span>
                          )}
                        </h4>
                        <p className="text-xs text-[#4A5056] leading-relaxed bg-[#FAF8F5] p-3 rounded border border-[#E5E2DC]">
                          {match.explanation}
                        </p>
                      </div>

                      <div className="lg:col-span-6">
                        <MatchConfidenceBar
                          imageSim={breakdown.image_similarity}
                          textSim={breakdown.text_similarity}
                          contextScore={breakdown.context_score}
                          totalScore={breakdown.total_score}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
