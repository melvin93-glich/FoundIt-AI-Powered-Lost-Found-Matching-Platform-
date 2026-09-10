"use client";

import React, { useState, useEffect } from "react";
import { Navbar, Footer } from "@/components/Navigation";
import { ItemCard, ItemCardProps } from "@/components/ItemCard";
import { Search, Filter, RefreshCw, AlertCircle } from "lucide-react";
import api from "@/lib/api";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<"all" | "lost" | "found">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");

  const [items, setItems] = useState<ItemCardProps[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const [lostRes, foundRes] = await Promise.all([
        api.get("/lost"),
        api.get("/found"),
      ]);

      const combined: ItemCardProps[] = [
        ...lostRes.data.map((i: any) => ({ ...i, type: "lost" })),
        ...foundRes.data.map((i: any) => ({ ...i, type: "found" })),
      ];

      if (combined.length === 0) {
        // Mock items if backend returned empty array
        setItems(mockItems);
      } else {
        setItems(combined);
      }
    } catch (err) {
      console.error(err);
      // Fallback mock items
      setItems(mockItems);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter((item) => {
    if (activeTab !== "all" && item.type !== activeTab) return false;
    if (selectedCategory !== "All Categories" && item.category !== selectedCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 py-10 bg-[#FAF8F5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          {/* Header & Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E2DC] pb-6">
            <div>
              <h1 className="font-display text-3xl font-bold text-[#1E2022]">
                Directory & My Reports
              </h1>
              <p className="text-sm text-[#72787E] mt-1">
                Filter and inspect reported lost and found items. Click any item to calculate live AI match confidence scores.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchItems}
                className="p-2 text-[#72787E] hover:text-[#1E2022] hover:bg-[#EAE7E1] rounded-md transition-colors"
                title="Refresh listings"
              >
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {/* Search Bar & Filters */}
          <div className="custom-card rounded-xl p-4 bg-white space-y-4 md:space-y-0 md:flex md:items-center md:justify-between gap-4">
            
            {/* Search Input */}
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3.5 top-3 text-[#72787E]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by keyword, brand, location..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-[#FAF8F5] border border-[#E5E2DC] rounded-md focus:outline-none focus:border-[#2E4A3E]"
              />
            </div>

            {/* Type Tabs */}
            <div className="flex bg-[#FAF8F5] p-1 rounded-md border border-[#E5E2DC] text-xs font-semibold">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1.5 rounded ${
                  activeTab === "all" ? "bg-white text-[#1E2022] shadow-sm" : "text-[#72787E]"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab("lost")}
                className={`px-3 py-1.5 rounded ${
                  activeTab === "lost" ? "bg-[#8C2D19] text-white shadow-sm" : "text-[#72787E]"
                }`}
              >
                Lost Only
              </button>
              <button
                onClick={() => setActiveTab("found")}
                className={`px-3 py-1.5 rounded ${
                  activeTab === "found" ? "bg-[#2E4A3E] text-white shadow-sm" : "text-[#72787E]"
                }`}
              >
                Found Only
              </button>
            </div>

            {/* Category Dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 text-sm bg-[#FAF8F5] border border-[#E5E2DC] rounded-md focus:outline-none focus:border-[#2E4A3E]"
            >
              <option>All Categories</option>
              <option>Electronics</option>
              <option>Wallets & Bags</option>
              <option>Keys & Identification</option>
              <option>Clothing & Accessories</option>
              <option>Personal Belongings</option>
            </select>
          </div>

          {/* Grid of Items */}
          {loading ? (
            <div className="py-20 text-center text-sm font-mono text-[#72787E]">
              Loading items directory...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-16 text-center custom-card rounded-xl bg-white space-y-3">
              <AlertCircle size={32} className="mx-auto text-[#72787E]" />
              <h3 className="font-display font-bold text-lg text-[#1E2022]">No reports found</h3>
              <p className="text-xs text-[#72787E]">Try adjusting your search query or filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item) => (
                <ItemCard key={item.id} {...item} />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

const mockItems: ItemCardProps[] = [
  {
    id: "lost_101",
    type: "lost",
    title: "Black Leather Wallet with ID Cards",
    description: "Lost near central library at 10am. Contains driver license and credit cards.",
    category: "Wallets & Bags",
    location: "Central Library, 2nd Floor",
    date_time: "Today, 10:00 AM",
    image_url: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=500&q=80",
    status: "active",
  },
  {
    id: "found_102",
    type: "found",
    title: "Found Black Leather Bifold Wallet",
    description: "Found on a study desk near the Quiet Zone entrance.",
    category: "Wallets & Bags",
    location: "Central Library",
    date_time: "Today, 10:30 AM",
    image_url: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=500&q=80",
    status: "active",
  },
  {
    id: "lost_103",
    type: "lost",
    title: "Sage Green Hydro Flask Water Bottle",
    description: "Left on lecture hall desk 14 with a National Park sticker.",
    category: "Personal Belongings",
    location: "Science Building, Rm 302",
    date_time: "Yesterday",
    image_url: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500&q=80",
    status: "active",
  },
];
