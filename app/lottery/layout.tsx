/* app/lottery/layout.tsx */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import "./layout.css";

export default function LotteryLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  
  const [balance, setBalance] = useState(0);
  const [winnings, setWinnings] = useState(0);

  const loadBalance = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from("profiles").select("balance, lottery_winnings").eq("id", user.id).single();
      if (data) {
        setBalance(Number(data.balance) || 0);
        setWinnings(Number(data.lottery_winnings) || 0);
      }
    }
  };

  useEffect(() => {
    void loadBalance();
    
    // Realtime আপডেটের জন্য (ব্যালেন্স বা টিকিট কেনার পর আপডেট হবে)
    const channel = supabase.channel("lottery-layout-profile")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, () => loadBalance())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  const navItems = [
    { name: "Home", path: "/lottery", icon: "fa-house" },
    { name: "Deposit", path: "/lottery/deposit", icon: "fa-wallet" },
    { name: "Withdraw", path: "/lottery/withdraw", icon: "fa-money-bill-transfer" },
    { name: "My Tickets", path: "/lottery/my-tickets", icon: "fa-ticket" },
    { name: "Profile", path: "/lottery/profile", icon: "fa-user" },
  ];

  return (
    <div className="lottery-app-layout">
      {/* Header */}
      <header className="lottery-header">
        <Link href="/lottery" className="lottery-logo">
          <i className="fa-solid fa-trophy"></i> GaziLottery
        </Link>
        
        <div className="lottery-header-right">
          <div className="lottery-wallet-pill" onClick={() => router.push('/lottery/deposit')}>
            <i className="fa-solid fa-coins"></i>
            <span>{balance.toFixed(2)}</span>
          </div>
          <div className="lottery-trophy-pill">
            <i className="fa-solid fa-gift" style={{ color: "#ffd700" }}></i>
            <span>{winnings.toFixed(2)}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="lottery-content">
        {children}
      </main>

      {/* Bottom Nav */}
      <nav className="lottery-bottom-nav">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link key={item.path} href={item.path} className={`lottery-nav-item ${isActive ? "active" : ""}`}>
              <i className={`fa-solid ${item.icon}`}></i>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
