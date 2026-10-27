/* app/admin/layout.tsx */
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import "./admin.css";

const menuItems = [
  { name: "Dashboard", path: "/admin", icon: "fa-chart-pie" },
  { name: "Users Management", path: "/admin/users", icon: "fa-users" },
  { name: "Deposit Requests", path: "/admin/deposits", icon: "fa-arrow-down" },
  { name: "Withdrawal Requests", path: "/admin/withdrawals", icon: "fa-arrow-up" },
  { name: "Payment Methods", path: "/admin/payment-methods", icon: "fa-credit-card" },
  { name: "Bonus Settings", path: "/admin/bonus-settings", icon: "fa-gift" },
  { name: "Banner Management", path: "/admin/banners", icon: "fa-image" },
  { name: "Turnover Management", path: "/admin/turnover", icon: "fa-sync" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    // আপনার লগআউট লজিক এখানে বসাবেন
    router.push("/login");
  };

  return (
    <div className="admin-layout">
      {/* Topbar */}
      <header className="admin-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            className="admin-menu-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <i className="fa-solid fa-bars" />
          </button>
          <span className="admin-topbar-title">Admin Panel</span>
        </div>
        <div className="admin-topbar-right">
          <button className="admin-logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""}`}>
        {menuItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={`admin-sidebar-link ${
              pathname === item.path ? "active" : ""
            }`}
            onClick={() => setSidebarOpen(false)}
          >
            <i className={`fa-solid ${item.icon}`} />
            {item.name}
          </Link>
        ))}
      </aside>

      {/* Main Content */}
      <main className="admin-main">{children}</main>
    </div>
  );
}
