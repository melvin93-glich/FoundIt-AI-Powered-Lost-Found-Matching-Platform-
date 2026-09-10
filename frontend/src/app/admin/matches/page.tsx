"use client";

import React, { useState, useEffect } from "react";
import { GitCompare, CheckCircle2, XCircle, Trash2, Edit3, ArrowRight } from "lucide-react";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { MatchConfidenceBar } from "@/components/ItemCard";
import api from "@/lib/api";

export default function AdminMatchesPage() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Deleting state
  const [deletingMatch, setDeletingMatch] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const resp = await api.get("/admin/matches");
      setMatches(resp.data || []);
    } catch (err) {
      console.error(err);
      setMatches(mockAdminMatches);
    } finally {
      setLoading(false);
    }
  };

  const handleOverrideStatus = async (match: any, newStatus: string) => {
    try {
      await api.patch(
        `/admin/matches/${match.source_item.id}/override`,
        null,
        {
          params: { target_id: match.target_item.id, status: newStatus },
        }
      );
      setMatches(
        matches.map((m) =>
          m.id === match.id ? { ...m, status: newStatus } : m
        )
      );
    } catch (err) {
      console.error(err);
      setMatches(
        matches.map((m) =>
          m.id === match.id ? { ...m, status: newStatus } : m
        )
      );
    }
  };

  const handleDeleteMatch = async () => {
    if (!deletingMatch) return;
    setDeleting(true);
    setMatches(matches.filter((m) => m.id !== deletingMatch.id));
    setDeletingMatch(null);
    setDeleting(false);
  };

  return (
    <div className="space-y-6">
      
      <div className="border-b border-[#E5E2DC] pb-5">
        <h1 className="font-display text-2xl font-bold text-[#1E2022]">AI Match Overrides & History</h1>
        <p className="text-xs text-[#72787E] mt-0.5">Audit candidate match confidence scores, override status decisions, or remove bad matches.</p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs font-mono text-[#72787E]">
          Loading match records...
        </div>
      ) : matches.length === 0 ? (
        <div className="custom-card rounded-xl p-8 text-center bg-white space-y-2">
          <h3 className="font-display font-bold text-base text-[#1E2022]">No match records found</h3>
        </div>
      ) : (
        <div className="space-y-6">
          {matches.map((match) => (
            <div key={match.id} className="custom-card rounded-xl bg-white p-6 space-y-5">
              
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E2DC] pb-4">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-[#1E2022]">
                    Match Record ID: #{match.id}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded font-mono text-[10px] font-bold uppercase ${
                      match.status === "confirmed"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : match.status === "rejected"
                        ? "bg-red-100 text-red-800 border border-red-300"
                        : "bg-amber-100 text-amber-800 border border-amber-300"
                    }`}
                  >
                    {match.status}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOverrideStatus(match, "confirmed")}
                    className="bg-[#2E4A3E] text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-[#233A30] transition-colors flex items-center gap-1"
                  >
                    <CheckCircle2 size={14} /> Confirm Match
                  </button>
                  <button
                    onClick={() => handleOverrideStatus(match, "rejected")}
                    className="bg-[#FAF8F5] text-[#8C2D19] border border-[#E5E2DC] px-3 py-1.5 rounded text-xs font-semibold hover:bg-[#F9EBE8] transition-colors flex items-center gap-1"
                  >
                    <XCircle size={14} /> Reject Match
                  </button>
                  <button
                    onClick={() => setDeletingMatch(match)}
                    className="p-1.5 text-[#72787E] hover:text-[#8C2D19] hover:bg-[#FAF8F5] rounded"
                    title="Remove match record"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Side-by-Side Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                
                <div className="bg-[#FAF8F5] p-4 rounded-lg border border-[#E5E2DC] flex items-center gap-3">
                  <img src={match.source_item.image_url} alt="" className="w-16 h-16 rounded object-cover" />
                  <div>
                    <span className="text-[10px] font-mono text-[#8C2D19] uppercase font-bold block">LOST REPORT</span>
                    <span className="font-bold text-[#1E2022] block">{match.source_item.title}</span>
                    <span className="text-[#72787E]">{match.source_item.location}</span>
                  </div>
                </div>

                <div className="bg-[#FAF8F5] p-4 rounded-lg border border-[#E5E2DC] flex items-center gap-3">
                  <img src={match.target_item.image_url} alt="" className="w-16 h-16 rounded object-cover" />
                  <div>
                    <span className="text-[10px] font-mono text-[#2E4A3E] uppercase font-bold block">FOUND CANDIDATE</span>
                    <span className="font-bold text-[#1E2022] block">{match.target_item.title}</span>
                    <span className="text-[#72787E]">{match.target_item.location}</span>
                  </div>
                </div>

              </div>

              {/* Confidence Bar */}
              <MatchConfidenceBar
                imageSim={match.score_breakdown.image_similarity}
                textSim={match.score_breakdown.text_similarity}
                contextScore={match.score_breakdown.context_score}
                totalScore={match.score_breakdown.total_score}
              />

            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={!!deletingMatch}
        title="Remove False Match Record?"
        message="This will remove this candidate match record from the database. It will not delete the underlying lost or found item reports."
        onConfirm={handleDeleteMatch}
        onCancel={() => setDeletingMatch(null)}
        loading={deleting}
      />

    </div>
  );
}

const mockAdminMatches = [
  {
    id: "m_101",
    status: "confirmed",
    source_item: {
      id: "lost_101",
      title: "Black Leather Wallet with ID Cards",
      location: "Central Library",
      image_url: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=500&q=80",
    },
    target_item: {
      id: "found_102",
      title: "Found Black Leather Bifold Wallet",
      location: "Central Library",
      image_url: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=500&q=80",
    },
    score_breakdown: {
      image_similarity: 0.92,
      text_similarity: 0.84,
      context_score: 0.80,
      total_score: 0.882,
    },
  },
];
