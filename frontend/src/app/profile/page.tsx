"use client";

import React, { useState, useEffect } from "react";
import { Navbar, Footer } from "@/components/Navigation";
import { User as UserIcon, Mail, Phone, Save, CheckCircle2, ShieldAlert } from "lucide-react";
import api from "@/lib/api";

export default function ProfilePage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredContact, setPreferredContact] = useState("email");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const resp = await api.get("/auth/me");
      setName(resp.data.name || "");
      setEmail(resp.data.email || "");
      setPhone(resp.data.phone || "");
      setPreferredContact(resp.data.preferred_contact || "email");
      // Keep localStorage in sync
      localStorage.setItem("foundit_user", JSON.stringify(resp.data));
    } catch (err: any) {
      console.error(err);
      // Fallback to localStorage if API fails or demo mode
      const savedUser = localStorage.getItem("foundit_user");
      if (savedUser) {
        try {
          const u = JSON.parse(savedUser);
          setName(u.name || "");
          setEmail(u.email || "");
          setPhone(u.phone || "");
          setPreferredContact(u.preferred_contact || "email");
        } catch (e) {}
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess("");
    setError("");

    try {
      const resp = await api.put("/auth/profile", {
        name,
        phone: phone.trim() || null,
        preferred_contact: preferredContact,
      });

      setSuccess("Profile updated successfully!");
      localStorage.setItem("foundit_user", JSON.stringify(resp.data));
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5]">
      <Navbar />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-12">
        <div className="space-y-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-[#1E2022]">
              Account & Contact Settings
            </h1>
            <p className="text-xs text-[#72787E] mt-1">
              Manage your contact details and how other users reach you after a mutual match confirmation.
            </p>
          </div>

          <div className="custom-card rounded-xl p-8 bg-white border border-[#E5E2DC] space-y-6">
            {success && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-lg text-xs flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-lg text-xs flex items-center gap-2">
                <ShieldAlert size={16} className="text-red-600 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {loading ? (
              <div className="py-8 text-center text-xs text-[#72787E]">
                Loading profile...
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-[#1E2022] uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon size={16} className="absolute left-3 top-3 text-[#72787E]" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-[#FAF8F5] border border-[#E5E2DC] rounded-md focus:outline-none focus:border-[#2E4A3E]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1E2022] uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-3 text-[#72787E]" />
                    <input
                      type="email"
                      disabled
                      value={email}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-[#F0ECE1] text-[#72787E] border border-[#E5E2DC] rounded-md cursor-not-allowed"
                    />
                  </div>
                  <p className="text-[11px] text-[#72787E] mt-1">
                    Email is associated with your account authentication and cannot be changed here.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1E2022] uppercase tracking-wider mb-1.5">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3 top-3 text-[#72787E]" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 019-2834"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-[#FAF8F5] border border-[#E5E2DC] rounded-md focus:outline-none focus:border-[#2E4A3E]"
                    />
                  </div>
                  <p className="text-[11px] text-[#72787E] mt-1">
                    Optional. Used for SMS or phone calls when preferred.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1E2022] uppercase tracking-wider mb-1.5">
                    Preferred Contact Method
                  </label>
                  <select
                    value={preferredContact}
                    onChange={(e) => setPreferredContact(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[#FAF8F5] border border-[#E5E2DC] rounded-md focus:outline-none focus:border-[#2E4A3E]"
                  >
                    <option value="email">Email</option>
                    <option value="phone">Phone / SMS</option>
                    <option value="both">Both Email & Phone</option>
                  </select>
                </div>

                <div className="pt-4 border-t border-[#E5E2DC] flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-[#2E4A3E] text-white px-5 py-2 rounded-md font-semibold text-sm hover:bg-[#233A30] transition-colors flex items-center gap-2"
                  >
                    <Save size={16} />
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
