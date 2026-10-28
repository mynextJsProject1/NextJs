/* app/sub-admin/layout.tsx */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import "./sub-admin.css";

const menuItems = [
  { name: "Live Dashboard", path: "/sub-admin/dashboard", icon: "fa-chart-line" },
  { name: "Match Control", path: "/sub-admin/match-control", icon: "fa-futbol" }, 
  { name: "Match Settlement", path: "/sub-admin/settlement", icon: "fa-ticket" },
];

export default function SubAdminLayout({ children }: { children: React.ReactNode }) {
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

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "sub_admin" && profile?.role !== "admin") {
        router.replace("/"); 
        return;
      }

      setIsAuthorized(true);
      setLoading(false);
    };
    checkAuth();
  }, [router, supabase]);

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#07110f", color: "#00e701" }}>Checking access...</div>;
  }

  if (!isAuthorized) return null;

  return (
    <div className="sub-admin-layout">
      <header className="sa-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button className="sa-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <i className="fa-solid fa-bars" />
          </button>
          <span className="sa-topbar-title">Sub-Admin Panel</span>
        </div>
      </header>

      <aside className={`sa-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div style={{ padding: "16px", borderBottom: "1px solid #26352e", marginBottom: "16px" }}>
          <p style={{ margin: 0, color: "#9ca9a3", fontSize: "12px" }}>Logged in as Sub-Admin</p>
        </div>
        {menuItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={`sa-link ${pathname === item.path ? "active" : ""}`}
            onClick={() => setSidebarOpen(false)}
          >
            <i className={`fa-solid ${item.icon}`} />
            {item.name}
          </Link>
        ))}
      </aside>

      <main className="sa-main">{children}</main>
    </div>
  );
}
