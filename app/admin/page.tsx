/* app/admin/page.tsx */
"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingDeposits: 0,
    pendingWithdrawals: 0,
    totalTurnover: 0,
  });

  useEffect(() => {
    const supabase = createClient();

    const fetchStats = async () => {
      // মোট ইউজার
      const { count: userCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // পেন্ডিং ডিপোজিট
      const { count: depCount } = await supabase
        .from("wallet_transactions")
        .select("*", { count: "exact", head: true })
        .eq("transaction_type", "deposit")
        .eq("status", "pending");

      // পেন্ডিং উইথড্র
      const { count: witCount } = await supabase
        .from("wallet_transactions")
        .select("*", { count: "exact", head: true })
        .eq("transaction_type", "withdrawal")
        .eq("status", "pending");

      setStats({
        totalUsers: userCount || 0,
        pendingDeposits: depCount || 0,
        pendingWithdrawals: witCount || 0,
        totalTurnover: 0, // পরবর্তীতে যোগ করা যাবে
      });
    };

    fetchStats();
  }, []);

  return (
    <div>
      <h1 className="admin-page-title">Dashboard Overview</h1>

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
        <div className="admin-stat-card">
          <h3>Total Turnover</h3>
          <strong>{stats.totalTurnover} BDT</strong>
        </div>
      </div>

      <div className="admin-stat-card" style={{ marginTop: "24px" }}>
        <h3>Welcome to Admin Panel</h3>
        <p style={{ color: "var(--admin-muted)", fontSize: "14px" }}>
          Use the sidebar to navigate through different management sections.
        </p>
      </div>
    </div>
  );
}
