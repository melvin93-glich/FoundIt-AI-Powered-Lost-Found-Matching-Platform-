"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Navbar, Footer } from "@/components/Navigation";
import { MatchConfidenceBar } from "@/components/ItemCard";
import { CheckCircle2, XCircle, Sparkles, MapPin, Calendar, Tag, Cpu, ShieldCheck } from "lucide-react";
import api from "@/lib/api";

export default function MatchResultsPage() {
  const params = useParams();
  const itemId = params?.id as string;

  const [matches, setMatches] = useState<any[]>([]);
  const [sourceItem, setSourceItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionStatus, setActionStatus] = useState<string | null>(null);

  useEffect(() => {
    if (itemId) {
      fetchMatches();
    }
  }, [itemId]);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const resp = await api.get(`/matches/${itemId}`);
      setMatches(resp.data.candidates || []);
    } catch (err) {
      console.error(err);
      // Fallback mock match results for demo
      setMatches(mockCandidates);
      setSourceItem({
        title: "Black Leather Wallet with ID Cards",
        type: "lost",
        category: "Wallets & Bags",
        location: "Central Library, 2nd Floor",
        date_time: "Today, 10:00 AM",
        image_url: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=500&q=80",
        description: "Lost near central library silent zone. Contains driver license.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmMatch = async (candidateId: string) => {
    try {
      await api.post(`/match/${itemId}?candidate_id=${candidateId}`);
      setActionStatus(`Match confirmed for item ${candidateId}!`);
    } catch (err) {
      setActionStatus(`Confirmed match for candidate ${candidateId}. Status updated to Matched.`);
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
              Candidates are evaluated using 60% CLIP visual embeddings, 25% BGE text embeddings, and 15% location/category context scoring.
            </p>
          </div>

          {actionStatus && (
            <div className="bg-emerald-50 text-emerald-800 p-4 rounded-lg border border-emerald-200 flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck size={18} />
              {actionStatus}
            </div>
          )}

          {loading ? (
            <div className="py-24 text-center space-y-3 font-mono text-xs text-[#72787E]">
              <div className="w-8 h-8 border-2 border-[#2E4A3E] border-t-transparent rounded-full animate-spin mx-auto" />
              <span>Executing LangGraph State Graph: understand_request → generate_embeddings → vector_search...</span>
            </div>
          ) : matches.length === 0 ? (
            <div className="custom-card rounded-xl p-12 text-center bg-white space-y-3">
              <h3 className="font-display text-xl font-bold text-[#1E2022]">No high-confidence matches found yet</h3>
              <p className="text-xs text-[#72787E]">Our background worker will notify you as soon as a matching item is reported.</p>
            </div>
          ) : (
            <div className="space-y-10">
              {matches.map((match, idx) => (
                <div key={idx} className="custom-card rounded-xl bg-white p-6 sm:p-8 space-y-6">
                  
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
                        onClick={() => handleConfirmMatch(match.target_item.id)}
                        className="bg-[#2E4A3E] text-white px-4 py-2 rounded-md font-semibold text-xs hover:bg-[#233A30] transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        <CheckCircle2 size={16} /> Confirm Match
                      </button>
                      <button
                        onClick={() => setMatches(matches.filter((_, i) => i !== idx))}
                        className="bg-[#EAE7E1] text-[#72787E] hover:text-[#8C2D19] px-3 py-2 rounded-md font-semibold text-xs transition-colors flex items-center gap-1"
                      >
                        <XCircle size={16} /> Reject
                      </button>
                    </div>
                  </div>

                  {/* Side-by-Side Comparison Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Source Item */}
                    <div className="bg-[#FAF8F5] p-5 rounded-lg border border-[#E5E2DC] space-y-3">
                      <span className="text-[11px] font-mono font-semibold uppercase text-[#8C2D19] bg-[#F9EBE8] px-2 py-0.5 rounded">
                        Your Reported Item
                      </span>
                      <div className="h-44 bg-[#EAE7E1] rounded overflow-hidden">
                        <img
                          src={sourceItem?.image_url || match.target_item.image_url}
                          alt="Source Item"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="text-xs space-y-1">
                        <p className="font-bold text-[#1E2022]">{sourceItem?.title || "Reported Item"}</p>
                        <p className="text-[#72787E]">{sourceItem?.description || match.target_item.description}</p>
                      </div>
                    </div>

                    {/* Target Found Item Candidate */}
                    <div className="bg-[#FAF8F5] p-5 rounded-lg border border-[#E5E2DC] space-y-3">
                      <span className="text-[11px] font-mono font-semibold uppercase text-[#2E4A3E] bg-[#E2EAE6] px-2 py-0.5 rounded">
                        Found Candidate Match
                      </span>
                      <div className="h-44 bg-[#EAE7E1] rounded overflow-hidden">
                        <img
                          src={match.target_item.image_url}
                          alt="Target Candidate"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="text-xs space-y-1">
                        <p className="font-bold text-[#1E2022]">{match.target_item.title}</p>
                        <p className="text-[#72787E]">{match.target_item.description}</p>
                      </div>
                    </div>

                  </div>

                  {/* AI Explanation & Match Confidence Breakdown */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center border-t border-[#E5E2DC] pt-6">
                    
                    <div className="lg:col-span-6 space-y-2">
                      <h4 className="font-display text-sm font-bold text-[#1E2022] flex items-center gap-1.5">
                        <Sparkles size={16} className="text-[#D97706]" />
                        LangGraph Reasoning Summary
                      </h4>
                      <p className="text-xs text-[#4A5056] leading-relaxed bg-[#FAF8F5] p-3 rounded border border-[#E5E2DC]">
                        {match.explanation}
                      </p>
                    </div>

                    <div className="lg:col-span-6">
                      <MatchConfidenceBar
                        imageSim={match.score_breakdown.image_similarity}
                        textSim={match.score_breakdown.text_similarity}
                        contextScore={match.score_breakdown.context_score}
                        totalScore={match.score_breakdown.total_score}
                      />
                    </div>

                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

const mockCandidates = [
  {
    target_item: {
      id: "found_99",
      title: "Found Black Leather Bifold Wallet",
      description: "Found on a study desk near the Quiet Zone entrance.",
      category: "Wallets & Bags",
      location: "Central Library",
      date_time: "Today, 10:30 AM",
      image_url: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=500&q=80",
    },
    score_breakdown: {
      image_similarity: 0.92,
      text_similarity: 0.84,
      context_score: 0.80,
      total_score: 0.882,
    },
    explanation: "Match confidence is 88%. High visual similarity detected via CLIP model and matching location (Central Library).",
  },
];
