"use client";

import React from "react";
import Link from "next/link";
import { Navbar, Footer } from "@/components/Navigation";
import { ItemCard } from "@/components/ItemCard";
import { Search, MapPin, ArrowRight, ShieldCheck, Cpu, Layers, Sparkles } from "lucide-react";

export default function Home() {
  const recentItems = [
    {
      id: "demo_1",
      type: "lost" as const,
      title: "Hydro Flask Water Bottle (Sage Green)",
      description: "Left in the 2nd floor silent reading room near desk 14. Has a mountain sticker.",
      category: "Personal Belongings",
      location: "Central Campus Library",
      date_time: "Today, 09:30 AM",
      image_url: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500&q=80",
      status: "active",
    },
    {
      id: "demo_2",
      type: "found" as const,
      title: "Matte Black Wireless Earbuds Case",
      description: "Found under bench outside Student Union building near cafe entrance.",
      category: "Electronics",
      location: "Student Union Plaza",
      date_time: "Today, 11:15 AM",
      image_url: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&q=80",
      status: "active",
    },
    {
      id: "demo_3",
      type: "found" as const,
      title: "Leather Bifold Wallet with ID Cards",
      description: "Handed to security desk at Science Quad block B.",
      category: "Wallets & Cards",
      location: "Science Quadrangle",
      date_time: "Yesterday, 04:00 PM",
      image_url: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=500&q=80",
      status: "matched",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-[#FAF8F5] border-b border-[#E5E2DC] py-16 md:py-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Asymmetric Typography */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAE7E1] text-[#2E4A3E] text-xs font-mono font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                CIVIC RECOVERY NETWORK
              </div>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1E2022] leading-[1.08] tracking-tight">
                Lost your water bottle in the library at 10am? <br />
                <span className="text-[#2E4A3E]">We’ll find it.</span>
              </h1>

              <p className="text-base sm:text-lg text-[#4A5056] max-w-2xl leading-relaxed">
                FoundIt uses multimodal vision transformers, OCR text extraction, and location context scoring to match lost items with community reports in seconds.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row gap-4">
                <Link
                  href="/lost/new"
                  className="inline-flex items-center justify-center gap-2 bg-[#8C2D19] text-white px-6 py-3.5 rounded-md font-semibold text-sm hover:bg-[#702414] transition-all shadow-sm"
                >
                  Report Lost Item <ArrowRight size={16} />
                </Link>
                <Link
                  href="/found/new"
                  className="inline-flex items-center justify-center gap-2 bg-[#2E4A3E] text-white px-6 py-3.5 rounded-md font-semibold text-sm hover:bg-[#233A30] transition-all shadow-sm"
                >
                  I Found Something <ArrowRight size={16} />
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="pt-6 grid grid-cols-3 gap-6 border-t border-[#E5E2DC] text-xs font-mono text-[#72787E]">
                <div>
                  <span className="block font-bold text-base text-[#1E2022] font-display">0.60 Weight</span>
                  CLIP Image Embeddings
                </div>
                <div>
                  <span className="block font-bold text-base text-[#1E2022] font-display">0.25 Weight</span>
                  BGE Text Vector
                </div>
                <div>
                  <span className="block font-bold text-base text-[#1E2022] font-display">0.15 Weight</span>
                  Location & Time Rank
                </div>
              </div>
            </div>

            {/* Right Column: Information Dense Live Preview Card */}
            <div className="lg:col-span-5">
              <div className="custom-card rounded-xl p-6 space-y-5 bg-white shadow-lg relative">
                <div className="flex items-center justify-between border-b border-[#E5E2DC] pb-4">
                  <div className="flex items-center gap-2">
                    <Cpu size={18} className="text-[#2E4A3E]" />
                    <span className="font-display font-bold text-sm text-[#1E2022]">
                      Multimodal Match Engine
                    </span>
                  </div>
                  <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-semibold">
                    LANGGRAPH ACTIVE
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="bg-[#FAF8F5] p-3 rounded-lg border border-[#E5E2DC] flex items-center justify-between text-xs font-mono">
                    <span className="text-[#72787E]">Pipeline State</span>
                    <span className="font-semibold text-[#2E4A3E]">understand → vector_search → rank</span>
                  </div>

                  <div className="bg-[#FAF8F5] p-3 rounded-lg border border-[#E5E2DC] space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-[#1E2022]">Confidence Formula</span>
                      <span className="font-mono text-[#D97706]">94% Match</span>
                    </div>
                    <div className="w-full bg-[#EAE7E1] h-2 rounded-full overflow-hidden flex">
                      <div className="bg-[#2E4A3E] h-full" style={{ width: "55%" }} />
                      <div className="bg-[#D97706] h-full" style={{ width: "24%" }} />
                      <div className="bg-[#4A5056] h-full" style={{ width: "15%" }} />
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-[#F4F1EA] rounded-lg text-xs text-[#4A5056] leading-relaxed">
                  <strong>AI Explanation:</strong> High visual similarity (CLIP score 0.88) matched with identical category (Electronics) and location proximity (Student Union Plaza).
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Directory Section */}
      <section className="py-16 bg-[#FAF8F5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E5E2DC] pb-5">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#1E2022]">
                Active Reports Directory
              </h2>
              <p className="text-sm text-[#72787E] mt-1">
                Real-time reported lost and found items in your civic community area.
              </p>
            </div>

            <Link
              href="/dashboard"
              className="text-sm font-semibold text-[#2E4A3E] hover:text-[#1E2022] flex items-center gap-1.5"
            >
              View All Reports <ArrowRight size={15} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recentItems.map((item) => (
              <ItemCard key={item.id} {...item} />
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
