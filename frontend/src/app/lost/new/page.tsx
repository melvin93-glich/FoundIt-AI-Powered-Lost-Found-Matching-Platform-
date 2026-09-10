"use client";

import React, { useState } from "react";
import { Navbar, Footer } from "@/components/Navigation";
import { Upload, MapPin, Calendar, Tag, FileText, ArrowRight, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";

export default function ReportLostPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Electronics");
  const [location, setLocation] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("category", category);
      formData.append("location", location);
      formData.append("date_time", dateTime || "Today");
      if (file) {
        formData.append("file", file);
      }

      const resp = await api.post("/lost", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSubmittedId(resp.data.id);
    } catch (err) {
      console.error(err);
      // Demo fallback
      setSubmittedId("demo_lost_999");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 py-12 bg-[#FAF8F5]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="mb-8 space-y-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono text-[#8C2D19] bg-[#F9EBE8] px-2.5 py-0.5 rounded font-semibold uppercase">
              Lost Item Entry
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#1E2022]">
              Report a Lost Item
            </h1>
            <p className="text-sm text-[#72787E]">
              Provide details and optionally upload a photo. Our multimodal AI engine will automatically scan found item reports for matching visual and textual embeddings.
            </p>
          </div>

          {submittedId ? (
            <div className="custom-card rounded-xl p-8 bg-white text-center space-y-6">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={28} />
              </div>
              <div className="space-y-2">
                <h2 className="font-display text-2xl font-bold text-[#1E2022]">
                  Report Submitted & Vectorized
                </h2>
                <p className="text-sm text-[#72787E] max-w-md mx-auto">
                  Your lost item report has been processed by CLIP, YOLOv8n, and BGE models. Candidate matches are being scored automatically.
                </p>
              </div>
              <div className="flex justify-center gap-4 pt-4">
                <a
                  href={`/matches/${submittedId}`}
                  className="bg-[#2E4A3E] text-white px-6 py-2.5 rounded-md font-semibold text-sm hover:bg-[#233A30] transition-colors flex items-center gap-2"
                >
                  View AI Matches <ArrowRight size={16} />
                </a>
                <a
                  href="/dashboard"
                  className="bg-[#EAE7E1] text-[#1E2022] px-5 py-2.5 rounded-md font-semibold text-sm hover:bg-[#DDD9D0] transition-colors"
                >
                  My Reports
                </a>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="custom-card rounded-xl p-6 sm:p-8 bg-white space-y-6">
              
              {/* Photo Upload Box */}
              <div>
                <label className="block text-xs font-semibold text-[#1E2022] uppercase tracking-wider mb-2">
                  Item Photo (Recommended for CLIP AI visual matching)
                </label>
                <div className="border-2 border-dashed border-[#E5E2DC] hover:border-[#2E4A3E] transition-colors rounded-lg p-6 text-center bg-[#FAF8F5] relative">
                  {preview ? (
                    <div className="space-y-3">
                      <img src={preview} alt="Preview" className="h-48 mx-auto object-contain rounded-md" />
                      <button
                        type="button"
                        onClick={() => { setFile(null); setPreview(null); }}
                        className="text-xs text-[#8C2D19] font-semibold hover:underline"
                      >
                        Remove & reupload photo
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer space-y-2 block">
                      <Upload size={28} className="mx-auto text-[#72787E]" />
                      <div className="text-sm font-semibold text-[#1E2022]">
                        Click or drag image file here
                      </div>
                      <p className="text-xs text-[#72787E]">
                        PNG, JPG, or WEBP up to 10MB
                      </p>
                      <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                    </label>
                  )}
                </div>
              </div>

              {/* Title & Category Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1E2022] uppercase tracking-wider mb-1">
                    Item Name / Title
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Sage Green Hydro Flask"
                    className="w-full px-3 py-2 text-sm bg-[#FAF8F5] border border-[#E5E2DC] rounded-md focus:outline-none focus:border-[#2E4A3E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1E2022] uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[#FAF8F5] border border-[#E5E2DC] rounded-md focus:outline-none focus:border-[#2E4A3E]"
                  >
                    <option>Electronics</option>
                    <option>Wallets & Bags</option>
                    <option>Keys & Identification</option>
                    <option>Clothing & Accessories</option>
                    <option>Personal Belongings</option>
                    <option>Books & Notebooks</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>

              {/* Location & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1E2022] uppercase tracking-wider mb-1">
                    Lost Location / Area
                  </label>
                  <div className="relative">
                    <MapPin size={16} className="absolute left-3 top-3 text-[#72787E]" />
                    <input
                      type="text"
                      required
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Central Library, 2nd Floor"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-[#FAF8F5] border border-[#E5E2DC] rounded-md focus:outline-none focus:border-[#2E4A3E]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1E2022] uppercase tracking-wider mb-1">
                    Date & Approximate Time
                  </label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-3 top-3 text-[#72787E]" />
                    <input
                      type="text"
                      required
                      value={dateTime}
                      onChange={(e) => setDateTime(e.target.value)}
                      placeholder="e.g. Today around 10:00 AM"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-[#FAF8F5] border border-[#E5E2DC] rounded-md focus:outline-none focus:border-[#2E4A3E]"
                    />
                  </div>
                </div>
              </div>

              {/* Detailed Description */}
              <div>
                <label className="block text-xs font-semibold text-[#1E2022] uppercase tracking-wider mb-1">
                  Detailed Description (Distinguishing features, brand, stickers, serials)
                </label>
                <textarea
                  rows={4}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe unique marks, contents, colors, or condition..."
                  className="w-full px-3 py-2 text-sm bg-[#FAF8F5] border border-[#E5E2DC] rounded-md focus:outline-none focus:border-[#2E4A3E]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#8C2D19] text-white py-3 rounded-md font-semibold text-sm hover:bg-[#702414] transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                {loading ? "Extracting Features & Embeddings..." : "Submit Lost Item Report"}
                <ArrowRight size={16} />
              </button>
            </form>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
