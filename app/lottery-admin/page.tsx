/* app/lottery-admin/page.tsx */
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import "./lottery-admin.css";

export default function LotteryAdminDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [stats, setStats] = useState({
    pendingDeposits: 0,
    pendingWithdrawals: 0,
    activeDraws: 0,
    totalTicketsSold: 0,
  });
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    setLoading(true);
    
    // ১. লটারির পেন্ডিং ডিপোজিট
    const { count: depCount } = await supabase
      .from("wallet_transactions")
      .select("*", { count: "exact", head: true })
      .eq("transaction_type", "deposit")
      .eq("destination_details", "LOTTERY_DEPOSIT")
      .eq("status", "pending");

    // ২. লটারির পেন্ডিং উইথড্র (Verification)
    const { count: witCount } = await supabase
      .from("withdrawal_verifications")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    // ৩. চলমান ড্র
    const { count: drawCount } = await supabase
      .from("lottery_draws")
      .select("*", { count: "exact", head: true })
      .eq("status", "upcoming");

    // ৪. মোট বিক্রিত টিকিট
    const { count: ticketCount } = await supabase
      .from("lottery_tickets")
      .select("*", { count: "exact", head: true });

    setStats({
      pendingDeposits: depCount || 0,
      pendingWithdrawals: witCount || 0,
      activeDraws: drawCount || 0,
      totalTicketsSold: ticketCount || 0,
    });
    setLoading(false);
  }, [supabase]);

  useEffect(() => { void loadStats(); }, [loadStats]);

  return (
    <div>
      <h1 className="la-title">Lottery Dashboard</h1>
      <p style={{ color: "#b1bad3", marginBottom: "24px" }}>Welcome to the Lottery Admin Panel. Here is an overview of your system.</p>

      {loading ? (
        <div className="la-loading"><i className="fa-solid fa-circle-notch fa-spin" /> Loading stats...</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
          
          {/* Card 1 */}
          <div onClick={() => router.push("/lottery-admin/deposits")} className="la-card" style={{ cursor: "pointer", textAlign: "center" }}>
            <i className="fa-solid fa-arrow-down" style={{ fontSize: "24px", color: "#ffd700", marginBottom: "10px" }}></i>
            <h3 style={{ margin: "0 0 8px", color: "#b1bad3", fontSize: "13px" }}>Pending Deposits</h3>
            <strong style={{ fontSize: "24px", color: "#fff" }}>{stats.pendingDeposits}</strong>
          </div>

          {/* Card 2 */}
          <div onClick={() => router.push("/lottery-admin/withdrawals")} className="la-card" style={{ cursor: "pointer", textAlign: "center" }}>
            <i className="fa-solid fa-arrow-up" style={{ fontSize: "24px", color: "#ff4d4d", marginBottom: "10px" }}></i>
            <h3 style={{ margin: "0 0 8px", color: "#b1bad3", fontSize: "13px" }}>Pending Withdrawals</h3>
            <strong style={{ fontSize: "24px", color: "#fff" }}>{stats.pendingWithdrawals}</strong>
          </div>

          {/* Card 3 */}
          <div onClick={() => router.push("/lottery-admin/draws")} className="la-card" style={{ cursor: "pointer", textAlign: "center" }}>
            <i className="fa-solid fa-ticket" style={{ fontSize: "24px", color: "#00e701", marginBottom: "10px" }}></i>
            <h3 style={{ margin: "0 0 8px", color: "#b1bad3", fontSize: "13px" }}>Active Draws</h3>
            <strong style={{ fontSize: "24px", color: "#fff" }}>{stats.activeDraws}</strong>
          </div>

          {/* Card 4 */}
          <div className="la-card" style={{ textAlign: "center" }}>
            <i className="fa-solid fa-chart-line" style={{ fontSize: "24px", color: "#9d4edd", marginBottom: "10px" }}></i>
            <h3 style={{ margin: "0 0 8px", color: "#b1bad3", fontSize: "13px" }}>Total Tickets Sold</h3>
            <strong style={{ fontSize: "24px", color: "#fff" }}>{stats.totalTicketsSold}</strong>
          </div>

        </div>
      )}
    </div>
  );
}
