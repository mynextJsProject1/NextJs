/* app/admin/page.tsx */
"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import "./admin.css";

type BigWithdrawalTxn = {
  id: string;
  user_id: string;
  amount: number;
  created_at: string;
  profiles: {
    full_name: string;
    mobile: string;
  } | null;
  total_deposit: number;
  total_withdraw: number;
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingDeposits: 0,
    pendingWithdrawals: 0,
    totalDepositAmount: 0,
    totalWithdrawAmount: 0,
    todayNewAccounts: 0,
    onlineUsers: 0,
  });
  
  const [bigWithdrawals, setBigWithdrawals] = useState<BigWithdrawalTxn[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New Accounts Modal State
  const [showNewAccounts, setShowNewAccounts] = useState(false);
  const [todayUsers, setTodayUsers] = useState<any[]>([]);

  const supabase = createClient();

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);

      // ১. মোট ইউজার
      const { count: userCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // ২. পেন্ডিং ডিপোজিট
      const { count: depCount } = await supabase
        .from("wallet_transactions")
        .select("*", { count: "exact", head: true })
        .eq("transaction_type", "deposit")
        .eq("status", "pending");

      // ৩. পেন্ডিং উইথড্র
      const { count: witCount } = await supabase
        .from("wallet_transactions")
        .select("*", { count: "exact", head: true })
        .eq("transaction_type", "withdrawal")
        .eq("status", "pending");

      // ৪. মোট ডিপোজিট ও উইথড্র (Approved)
      const { data: approvedData } = await supabase
        .from("wallet_transactions")
        .select("transaction_type, amount")
        .eq("status", "approved");

      let totalDep = 0;
      let totalWit = 0;
      approvedData?.forEach(txn => {
        if (txn.transaction_type === "deposit") totalDep += Number(txn.amount);
        if (txn.transaction_type === "withdrawal") totalWit += Number(txn.amount);
      });

      // ৫. আজকের নতুন ইউজার
      const today = new Date();
      today.setHours(0, 0, 0, 0); // আজকের শুরুর সময়
      const { count: newUsersCount, data: newUsersData } = await supabase
        .from("profiles")
        .select("id, full_name, mobile, created_at", { count: "exact" })
        .gte("created_at", today.toISOString());

      if (newUsersData) setTodayUsers(newUsersData);

      // ৬. Big Withdrawals (3000 - 25000)
      const { data: bigWitData, error: bigWitError } = await supabase
        .from("wallet_transactions")
        .select("id, user_id, amount, created_at")
        .eq("transaction_type", "withdrawal")
        .eq("status", "pending")
        .gte("amount", 3000)
        .lte("amount", 25000)
        .order("created_at", { ascending: false });

      if (!bigWitError && bigWitData) {
        // ইউজারের ডাটা এবং মোট ডিপোজিট/উইথড্র বের করা
        const userIds = [...new Set(bigWitData.map(t => t.user_id))];
        
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, full_name, mobile")
          .in("id", userIds);

        const profileMap: Record<string, any> = {};
        profileData?.forEach(p => { profileMap[p.id] = p; });

        const bigMerged: BigWithdrawalTxn[] = [];
        
        for (const txn of bigWitData) {
          // ইউজারের মোট ডিপোজিট
          const { data: depHistory } = await supabase
            .from("wallet_transactions")
            .select("amount")
            .eq("user_id", txn.user_id)
            .eq("transaction_type", "deposit")
            .eq("status", "approved");
            
          // ইউজারের মোট উইথড্র
          const { data: witHistory } = await supabase
            .from("wallet_transactions")
            .select("amount")
            .eq("user_id", txn.user_id)
            .eq("transaction_type", "withdrawal")
            .eq("status", "approved");

          const userTotalDep = depHistory?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
          const userTotalWit = witHistory?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;

          bigMerged.push({
            ...txn,
            profiles: profileMap[txn.user_id] || null,
            total_deposit: userTotalDep,
            total_withdraw: userTotalWit
          });
        }
        setBigWithdrawals(bigMerged);
      }

      setStats({
        totalUsers: userCount || 0,
        pendingDeposits: depCount || 0,
        pendingWithdrawals: witCount || 0,
        totalDepositAmount: totalDep,
        totalWithdrawAmount: totalWit,
        todayNewAccounts: newUsersCount || 0,
        onlineUsers: 0, // গেম যুক্ত হলে এখানে ডাটা আসবে
      });

      setLoading(false);
    };

    fetchStats();
  }, [supabase]);

  const profit = stats.totalDepositAmount - stats.totalWithdrawAmount;
  const isProfit = profit >= 0;

  return (
    <div>
      <h1 className="admin-page-title">Dashboard Overview</h1>

      {loading ? (
        <div className="admin-loading">Loading dashboard data...</div>
      ) : (
        <>
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <h3>Total Users</h3>
              <strong>{stats.totalUsers}</strong>
            </div>
            <div className="admin-stat-card">
              <h3>Pending Deposits</h3>
              <strong className="green">{stats.pendingDeposits}</strong>
            </div>
            <div className="admin-stat-card">
              <h3>Pending Withdrawals</h3>
              <strong>{stats.pendingWithdrawals}</strong>
            </div>
            <div className="admin-stat-card" onClick={() => setShowNewAccounts(true)} style={{ cursor: "pointer" }}>
              <h3>New Accounts (Today)</h3>
              <strong className="text-orange" style={{ color: "#f58220" }}>{stats.todayNewAccounts}</strong>
            </div>
          </div>

          {/* Financial & Online Stats */}
          <div className="admin-stats-grid" style={{ marginBottom: "24px" }}>
            <div className="admin-stat-card" style={{ gridColumn: "span 2" }}>
              <h3>Admin Profit / Loss</h3>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
                <div>
                  <span style={{ fontSize: "11px", color: "#9ca9a3" }}>Total Deposit</span>
                  <strong style={{ display: "block", fontSize: "16px", color: "#00e701" }}>৳ {stats.totalDepositAmount.toLocaleString()}</strong>
                </div>
                <div>
                  <span style={{ fontSize: "11px", color: "#9ca9a3" }}>Total Withdraw</span>
                  <strong style={{ display: "block", fontSize: "16px", color: "#ff4d4d" }}>৳ {stats.totalWithdrawAmount.toLocaleString()}</strong>
                </div>
                <div>
                  <span style={{ fontSize: "11px", color: "#9ca9a3" }}>Net</span>
                  <strong style={{ display: "block", fontSize: "18px", color: isProfit ? "#00e701" : "#ff4d4d" }}>
                    {isProfit ? "+" : "-"} ৳ {Math.abs(profit).toLocaleString()}
                  </strong>
                </div>
              </div>
            </div>
            
            <div className="admin-stat-card" style={{ gridColumn: "span 2" }}>
              <h3>Online Users</h3>
              <strong style={{ color: "#9ca9a3" }}>Coming Soon</strong>
              <p style={{ fontSize: "11px", color: "#9ca9a3", margin: "4px 0 0" }}>Live game integration required</p>
            </div>
          </div>

          {/* Big Withdrawals Live Section */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <h2 style={{ fontSize: "18px", color: "#f5f7f6", margin: 0 }}>Big Withdrawals</h2>
            <span className="live-badge">
              <span className="live-dot"></span> LIVE
            </span>
          </div>

          {bigWithdrawals.length === 0 ? (
            <div className="admin-empty" style={{ marginBottom: "24px" }}>No big pending withdrawals found.</div>
          ) : (
            <div className="admin-stats-grid" style={{ marginBottom: "24px" }}>
              {bigWithdrawals.map((txn) => (
                <div key={txn.id} className="admin-stat-card" style={{ border: "1px solid rgba(255, 77, 77, 0.3)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span style={{ fontSize: "12px", color: "#9ca9a3" }}>{new Date(txn.created_at).toLocaleTimeString()}</span>
                    <span style={{ fontSize: "12px", color: "#ff4d4d", fontWeight: 700 }}>Pending</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "12px", color: "#9ca9a3" }}>User:</span>
                    <strong style={{ fontSize: "12px" }}>{txn.profiles?.full_name || "Unknown"}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span style={{ fontSize: "12px", color: "#9ca9a3" }}>Withdraw Amount:</span>
                    <strong style={{ fontSize: "14px", color: "#f58220" }}>৳ {Number(txn.amount).toLocaleString()}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", borderTop: "1px dashed rgba(255,255,255,0.1)", paddingTop: "8px" }}>
                    <span style={{ fontSize: "11px", color: "#9ca9a3" }}>Total Deposit:</span>
                    <span style={{ fontSize: "11px", color: "#00e701" }}>৳ {txn.total_deposit.toLocaleString()}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "11px", color: "#9ca9a3" }}>Total Withdraw:</span>
                    <span style={{ fontSize: "11px", color: "#ff4d4d" }}>৳ {txn.total_withdraw.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* New Accounts Modal */}
      {showNewAccounts && (
        <div className="pm-modal-overlay">
          <div className="pm-modal">
            <div className="pm-modal-header">
              <h2>Today's New Accounts</h2>
              <button onClick={() => setShowNewAccounts(false)} className="pm-modal-close">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div style={{ maxHeight: "60vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
              {todayUsers.length === 0 ? (
                <p style={{ color: "#9ca9a3", textAlign: "center" }}>No accounts created today.</p>
              ) : (
                todayUsers.map((u) => (
                  <div key={u.id} style={{ background: "#07110f", padding: "10px", borderRadius: "6px", border: "1px solid #26352e" }}>
                    <p style={{ margin: "0 0 4px", fontWeight: 600, color: "#f5f7f6" }}>{u.full_name}</p>
                    <p style={{ margin: 0, fontSize: "12px", color: "#9ca9a3" }}>{u.mobile}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
