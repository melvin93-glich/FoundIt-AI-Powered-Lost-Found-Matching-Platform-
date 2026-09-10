"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Navbar, Footer } from "@/components/Navigation";
import { MapPin, Calendar, Tag, ArrowRight, User, ShieldCheck, Tag as TagIcon, Sparkles } from "lucide-react";
import api from "@/lib/api";

export default function ItemDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchItem();
    }
  }, [id]);

  const fetchItem = async () => {
    setLoading(true);
    try {
      // Try fetching lost item first, then found item
      let res;
      try {
        res = await api.get(`/lost/${id}`);
      } catch (e) {
        res = await api.get(`/found/${id}`);
      }
      setItem(res.data);
    } catch (err) {
      console.error("Failed to fetch item details from API:", err);
      // Fallback mock item if backend fails or mock ID
      setItem({
        id,
        type: "lost",
        title: "Hydro Flask Water Bottle (Sage Green)",
        description: "Left in the 2nd floor silent reading room near desk 14. Has a green mountain sticker on the front base.",
        category: "Personal Belongings",
        location: "Central Campus Library",
        date_time: "Today, 09:30 AM",
        user_name: "Alex Rivera",
        image_url: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500&q=80",
        status: "active",
        detected_objects: ["bottle", "container"],
        extracted_text: "HYDRO FLASK 24OZ",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading || !item) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center font-mono text-xs text-[#72787E]">
          Loading item details...
        </div>
        <Footer />
      </div>
    );
  }

  const isLost = item.type === "lost";

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 py-12 bg-[#FAF8F5]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="custom-card rounded-xl bg-white overflow-hidden space-y-6">
            
            {/* Top Image banner */}
            <div className="relative h-72 sm:h-96 bg-[#EAE7E1] flex items-center justify-center">
              {item.image_url ? (
                <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
              ) : (
                <div className="text-[#72787E] text-xs font-mono">NO IMAGE AVAILABLE</div>
              )}
              <div className="absolute top-4 left-4">
                <span
                  className={`text-xs font-semibold tracking-wide uppercase px-3 py-1 rounded-full shadow-sm text-white ${
                    isLost ? "bg-[#8C2D19]" : "bg-[#2E4A3E]"
                  }`}
                >
                  {item.type} Item
                </span>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-6 sm:p-8 space-y-6">
              
              <div className="space-y-3">
                <div className="flex items-center gap-4 text-xs font-medium text-[#72787E]">
                  <span className="flex items-center gap-1">
                    <TagIcon size={14} className="text-[#2E4A3E]" />
                    {item.category}
                  </span>
                  <span className="flex items-center gap-1 font-mono">
                    <Calendar size={14} />
                    {item.date_time}
                  </span>
                </div>

                <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#1E2022]">
                  {item.title}
                </h1>

                <div className="flex items-center gap-2 text-sm text-[#72787E]">
                  <MapPin size={16} className="text-[#D97706]" />
                  <span>{item.location}</span>
                </div>
              </div>

              <div className="border-t border-[#E5E2DC] pt-4 space-y-2">
                <h3 className="font-display font-bold text-sm text-[#1E2022]">Detailed Description</h3>
                <p className="text-sm text-[#4A5056] leading-relaxed">{item.description}</p>
              </div>

              {/* AI Features Extracted */}
              <div className="bg-[#FAF8F5] p-5 rounded-lg border border-[#E5E2DC] space-y-3">
                <h4 className="font-display font-bold text-xs text-[#1E2022] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} className="text-[#2E4A3E]" />
                  Automated AI Extracted Attributes
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[#72787E] block mb-1">YOLOv8 Detected Objects:</span>
                    <div className="flex flex-wrap gap-1">
                      {item.detected_objects?.map((obj: string, i: number) => (
                        <span key={i} className="bg-white border border-[#E5E2DC] px-2 py-0.5 rounded font-mono text-[#1E2022]">
                          {obj}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-[#72787E] block mb-1">EasyOCR Visible Text:</span>
                    <span className="font-mono bg-white border border-[#E5E2DC] px-2 py-0.5 rounded text-[#1E2022] block">
                      {item.extracted_text || "None detected"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E5E2DC] flex justify-between items-center">
                <div className="text-xs text-[#72787E] flex items-center gap-1.5">
                  <User size={14} /> Reported by <span className="font-semibold text-[#1E2022]">{item.user_name}</span>
                </div>

                <Link
                  href={`/matches/${item.id}`}
                  className="bg-[#2E4A3E] text-white px-5 py-2.5 rounded-md font-semibold text-sm hover:bg-[#233A30] transition-colors flex items-center gap-2"
                >
                  Run AI Match <ArrowRight size={16} />
                </Link>
              </div>

            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
