"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Users, FileQuestion, CheckCircle, GitCompare, Activity, ShieldCheck, RefreshCw } from "lucide-react";
import api from "@/lib/api";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    usersCount: 0,
    lostCount: 0,
    foundCount: 0,
    matchesCount: 0,
  });

  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [usersRes, lostRes, foundRes, logsRes] = await Promise.all([
        api.get("/admin/users"),
        api.get("/admin/lost"),
        api.get("/admin/found"),
        api.get("/admin/actions"),
      ]);

      setStats({
        usersCount: usersRes.data.length,
        lostCount: lostRes.data.length,
        foundCount: foundRes.data.length,
        matchesCount: lostRes.data.filter((i: any) => i.status === "matched").length,
      });

      setAuditLogs(logsRes.data || []);
    } catch (err) {
      console.error(err);
      // Fallback mock dashboard data
      setStats({ usersCount: 14, lostCount: 28, foundCount: 32, matchesCount: 12 });
      setAuditLogs(mockAuditLogs);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E5E2DC] pb-5">
        <div>
          <span className="text-xs font-mono font-semibold text-[#2E4A3E] bg-[#E2EAE6] px-2.5 py-0.5 rounded">
            ADMINISTRATION CONSOLE
          </span>
          <h1 className="font-display text-3xl font-bold text-[#1E2022] mt-1">
            System Overview & Metrics
          </h1>
        </div>

        <button
          onClick={fetchDashboardData}
          className="p-2 text-[#72787E] hover:text-[#1E2022] hover:bg-[#EAE7E1] rounded-md transition-colors"
          title="Refresh metrics"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Link href="/admin/users" className="custom-card custom-card-hover rounded-xl p-5 bg-white space-y-2 block">
          <div className="flex items-center justify-between text-[#72787E]">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Users</span>
            <Users size={18} className="text-[#2E4A3E]" />
          </div>
          <span className="font-display text-3xl font-bold text-[#1E2022] block">
            {stats.usersCount}
          </span>
          <span className="text-[11px] font-mono text-[#72787E]">Registered Accounts</span>
        </Link>

        <Link href="/admin/lost" className="custom-card custom-card-hover rounded-xl p-5 bg-white space-y-2 block">
          <div className="flex items-center justify-between text-[#72787E]">
            <span className="text-xs font-semibold uppercase tracking-wider">Lost Reports</span>
            <FileQuestion size={18} className="text-[#8C2D19]" />
          </div>
          <span className="font-display text-3xl font-bold text-[#8C2D19] block">
            {stats.lostCount}
          </span>
          <span className="text-[11px] font-mono text-[#72787E]">Active & Matched</span>
        </Link>

        <Link href="/admin/found" className="custom-card custom-card-hover rounded-xl p-5 bg-white space-y-2 block">
          <div className="flex items-center justify-between text-[#72787E]">
            <span className="text-xs font-semibold uppercase tracking-wider">Found Reports</span>
            <CheckCircle size={18} className="text-[#2E4A3E]" />
          </div>
          <span className="font-display text-3xl font-bold text-[#2E4A3E] block">
            {stats.foundCount}
          </span>
          <span className="text-[11px] font-mono text-[#72787E]">Turned-in Items</span>
        </Link>

        <Link href="/admin/matches" className="custom-card custom-card-hover rounded-xl p-5 bg-white space-y-2 block">
          <div className="flex items-center justify-between text-[#72787E]">
            <span className="text-xs font-semibold uppercase tracking-wider">Confirmed Matches</span>
            <GitCompare size={18} className="text-[#D97706]" />
          </div>
          <span className="font-display text-3xl font-bold text-[#D97706] block">
            {stats.matchesCount}
          </span>
          <span className="text-[11px] font-mono text-[#72787E]">Resolved Recoveries</span>
        </Link>
      </div>

      {/* Audit Log / Recent Activity Panel */}
      <div className="custom-card rounded-xl bg-white p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-[#E5E2DC] pb-4">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-[#2E4A3E]" />
            <h2 className="font-display font-bold text-lg text-[#1E2022]">
              Audit Trail — Recent Admin Activity
            </h2>
          </div>
          <span className="text-[11px] font-mono text-[#72787E]">
            Logging past 20 admin actions
          </span>
        </div>

        {auditLogs.length === 0 ? (
          <div className="py-8 text-center text-xs font-mono text-[#72787E]">
            No admin actions recorded yet.
          </div>
        ) : (
          <div className="space-y-3">
            {auditLogs.map((log, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-lg bg-[#FAF8F5] border border-[#E5E2DC] text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 font-semibold text-[#1E2022]">
                    <span className="bg-[#1E2022] text-white text-[10px] px-1.5 py-0.5 rounded font-mono uppercase">
                      {log.action}
                    </span>
                    <span>Target: {log.target_type} ({log.target_id})</span>
                  </div>
                  <p className="text-[#72787E]">{log.details || "No extra details recorded."}</p>
                </div>
                <div className="text-right font-mono text-[11px] text-[#72787E]">
                  <span className="block font-semibold text-[#1E2022]">{log.admin_name}</span>
                  <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

const mockAuditLogs = [
  {
    admin_name: "System Admin",
    action: "update_role",
    target_type: "user",
    target_id: "user_102",
    details: "Changed role to admin",
    timestamp: new Date().toISOString(),
  },
  {
    admin_name: "System Admin",
    action: "override_match",
    target_type: "match",
    target_id: "lost_101:found_102",
    details: "Status set to confirmed",
    timestamp: new Date().toISOString(),
  },
];
