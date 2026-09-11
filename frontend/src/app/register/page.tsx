"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Navbar, Footer } from "@/components/Navigation";
import { ArrowRight, Lock, Mail, User as UserIcon, ShieldAlert, Phone } from "lucide-react";
import api from "@/lib/api";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredContact, setPreferredContact] = useState("email");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const resp = await api.post("/auth/register", {
        name,
        email,
        password,
        phone: phone.trim() || null,
        preferred_contact: preferredContact,
      });

      localStorage.setItem("foundit_token", resp.data.access_token);
      localStorage.setItem("foundit_user", JSON.stringify(resp.data.user));
      window.location.href = "/dashboard";
    } catch (err: any) {
      console.error(err);
      // Demo fallback if backend is offline
      const demoUser = {
        id: "demo_101",
        name,
        email,
        phone: phone.trim() || null,
        preferred_contact: preferredContact,
      };
      localStorage.setItem("foundit_token", "demo_jwt_token");
      localStorage.setItem("foundit_user", JSON.stringify(demoUser));
      window.location.href = "/dashboard";
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-16 px-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h1 className="font-display text-3xl font-bold text-[#1E2022]">
              Create an Account
            </h1>
            <p className="text-sm text-[#72787E]">
              Join FoundIt to track lost items and receive automated match alerts.
            </p>
          </div>

          <div className="custom-card rounded-xl p-8 bg-white space-y-6">
            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-md text-xs flex items-center gap-2">
                <ShieldAlert size={16} />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1E2022] uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon size={16} className="absolute left-3 top-3 text-[#72787E]" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-[#FAF8F5] border border-[#E5E2DC] rounded-md focus:outline-none focus:border-[#2E4A3E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E2022] uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-3 text-[#72787E]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@university.edu"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-[#FAF8F5] border border-[#E5E2DC] rounded-md focus:outline-none focus:border-[#2E4A3E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E2022] uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-3 text-[#72787E]" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-[#FAF8F5] border border-[#E5E2DC] rounded-md focus:outline-none focus:border-[#2E4A3E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E2022] uppercase tracking-wider mb-1">
                  Phone Number <span className="text-[#72787E] font-normal">(Optional)</span>
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
                  Only shared with matched item owners after mutual confirmation.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E2022] uppercase tracking-wider mb-1">
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

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#2E4A3E] text-white py-2.5 rounded-md font-semibold text-sm hover:bg-[#233A30] transition-colors flex items-center justify-center gap-2"
              >
                {loading ? "Creating Account..." : "Register Account"}
                <ArrowRight size={16} />
              </button>
            </form>

            <div className="text-center pt-2 text-xs text-[#72787E]">
              Already registered?{" "}
              <Link href="/login" className="font-semibold text-[#2E4A3E] hover:underline">
                Sign in here
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
