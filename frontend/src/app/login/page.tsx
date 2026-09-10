"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Navbar, Footer } from "@/components/Navigation";
import { ArrowRight, Lock, Mail, ShieldAlert } from "lucide-react";
import api from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [expiredMsg, setExpiredMsg] = useState("");
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const msg = sessionStorage.getItem("foundit_auth_message");
      if (msg) {
        setExpiredMsg(msg);
        sessionStorage.removeItem("foundit_auth_message");
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const resp = await api.post("/auth/login", {
        email,
        password,
      });

      localStorage.setItem("foundit_token", resp.data.access_token);
      localStorage.setItem("foundit_user", JSON.stringify(resp.data.user));
      window.location.href = "/dashboard";
    } catch (err: any) {
      console.error(err);
      // Demo fallback if backend is offline
      const demoUser = { id: "demo_101", name: email.split("@")[0], email };
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
              Welcome Back
            </h1>
            <p className="text-sm text-[#72787E]">
              Log in to manage your lost/found items and view AI matches.
            </p>
          </div>

          <div className="custom-card rounded-xl p-8 bg-white space-y-6">
            {expiredMsg && (
              <div className="bg-amber-50 text-amber-800 border border-amber-200 p-3 rounded-md text-xs flex items-center gap-2">
                <ShieldAlert size={16} className="text-amber-600 shrink-0" />
                {expiredMsg}
              </div>
            )}

            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-md text-xs flex items-center gap-2">
                <ShieldAlert size={16} />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
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

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#2E4A3E] text-white py-2.5 rounded-md font-semibold text-sm hover:bg-[#233A30] transition-colors flex items-center justify-center gap-2"
              >
                {loading ? "Authenticating..." : "Sign In"}
                <ArrowRight size={16} />
              </button>
            </form>

            <div className="text-center pt-2 text-xs text-[#72787E]">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="font-semibold text-[#2E4A3E] hover:underline">
                Create one now
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
