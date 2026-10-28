/* app/sub-admin/page.tsx */
"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import "./sub-admin.css";

export default function SubAdminDashboardPage() {
  const [stats, setStats] = useState({
    pendingBets: 0,
    liveMatches: 0,
    totalUsers: 0,
  });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      // ১. পেন্ডিং বাজি কাউন্ট
      const { count: betsCount } = await supabase
        .from("user_bets")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      // ২. লাইভ ম্যাচ কাউন্ট
      const { count: matchesCount } = await supabase
        .from("live_matches")
        .select("*", { count: "exact", head: true })
        .eq("match_status", "live");

      // ৩. মোট ইউজার কাউন্ট
      const { count: usersCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "user");

      setStats({
        pendingBets: betsCount || 0,
        liveMatches: matchesCount || 0,
        totalUsers: usersCount || 0,
      });
    } catch (err) {
      console.error("Error loading stats:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <div>
      <h1 className="sa-title">Sub-Admin Dashboard</h1>
      
      {loading ? (
        <p style={{ color: "var(--sa-muted)" }}>Loading dashboard stats...</p>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
            
            <div style={{ background: "var(--sa-panel)", border: "1px solid var(--sa-border)", borderRadius: "12px", padding: "20px" }}>
              <h3 style={{ margin: "0 0 8px", color: "var(--sa-muted)", fontSize: "13px" }}>Pending Bets</h3>
              <strong style={{ fontSize: "28px", color: "#f58220" }}>{stats.pendingBets}</strong>
            </div>

            <div style={{ background: "var(--sa-panel)", border: "1px solid var(--sa-border)", borderRadius: "12px", padding: "20px" }}>
              <h3 style={{ margin: "0 0 8px", color: "var(--sa-muted)", fontSize: "13px" }}>Live Matches</h3>
              <strong style={{ fontSize: "28px", color: "var(--sa-green)" }}>{stats.liveMatches}</strong>
            </div>

            <div style={{ background: "var(--sa-panel)", border: "1px solid var(--sa-border)", borderRadius: "12px", padding: "20px" }}>
              <h3 style={{ margin: "0 0 8px", color: "var(--sa-muted)", fontSize: "13px" }}>Total Players</h3>
              <strong style={{ fontSize: "28px", color: "#fff" }}>{stats.totalUsers}</strong>
            </div>

          </div>

          <div style={{ background: "var(--sa-panel)", border: "1px solid var(--sa-border)", borderRadius: "12px", padding: "20px" }}>
            <h3 style={{ margin: "0 0 8px", color: "var(--sa-text)" }}>Welcome to Sub-Admin Panel</h3>
            <p style={{ margin: 0, color: "var(--sa-muted)", fontSize: "14px", lineHeight: "1.6" }}>
              From here, you can control match odds, lock/unlock betting, and settle user bets. 
              Use the sidebar to navigate to <strong>Match Control</strong> or <strong>Bet Settlement</strong>.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
