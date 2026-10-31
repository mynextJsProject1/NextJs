/* app/lottery-admin/layout.tsx */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import "./lottery-admin.css";

const menuItems = [
  { name: "Lottery Dashboard", path: "/lottery-admin", icon: "fa-chart-pie" },
  { name: "Deposit Requests", path: "/lottery-admin/deposits", icon: "fa-arrow-down" },
  { name: "Withdraw Requests", path: "/lottery-admin/withdrawals", icon: "fa-arrow-up" },
  { name: "Draw Management", path: "/lottery-admin/draws", icon: "fa-ticket" },
  
  // ✅ নতুন যোগ করা ৩টি মেনু আইটেম
  { name: "User Tickets", path: "/lottery-admin/submit-ticket", icon: "fa-headset" },
  { name: "KYC Verifications", path: "/lottery-admin/verifications-details", icon: "fa-id-card" },
  { name: "Push Notifications", path: "/lottery-admin/notification", icon: "fa-bell" },
];

export default function LotteryAdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login/");
        return;
      }
      // চেক করা হচ্ছে ইউজার অ্যাডমিন কি না
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (profile?.role !== "admin" && profile?.role !== "sub_admin") {
        router.replace("/"); 
        return;
      }
      setIsAuthorized(true);
      setLoading(false);
    };
    checkAuth();
  }, [router, supabase]);

  if (loading) return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#0f0a1a", color: "#ffd700" }}>Checking access...</div>;
  if (!isAuthorized) return null;

  return (
    <div className="lottery-admin-layout">
      <header className="la-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button className="la-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <i className="fa-solid fa-bars" />
          </button>
          <span className="la-topbar-title"><i className="fa-solid fa-trophy" style={{color: "#ffd700"}}></i> Lottery Admin</span>
        </div>
        <button onClick={() => router.push("/")} style={{ background: "transparent", border: "1px solid #ffd700", color: "#ffd700", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>
          Back to Casino
        </button>
      </header>

      <aside className={`la-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div style={{ padding: "16px", borderBottom: "1px solid #3a1f6b", marginBottom: "16px" }}>
          <p style={{ margin: 0, color: "#b1bad3", fontSize: "12px" }}>Lottery Management System</p>
        </div>
        {menuItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={`la-link ${pathname === item.path ? "active" : ""}`}
            onClick={() => setSidebarOpen(false)}
          >
            <i className={`fa-solid ${item.icon}`} />
            {item.name}
          </Link>
        ))}
      </aside>

      <main className="la-main">{children}</main>
    </div>
  );
}
